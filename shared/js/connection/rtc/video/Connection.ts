import {
    VideoBroadcastState,
    VideoBroadcastStatistics,
    VideoBroadcastType,
    VideoClient,
    VideoConnection,
    VideoConnectionEvent,
    VideoConnectionStatus
} from "tc-shared/connection/VideoConnection";
import {Registry} from "tc-shared/events";
import {VideoSource} from "tc-shared/video/VideoSource";
import {RTCConnection, RTCConnectionEvents, RTPConnectionState} from "../Connection";
import {LogCategory, logDebug, logError, logWarn} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {RtpVideoClient} from "./VideoClient";
import {tr} from "tc-shared/i18n/localize";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import {ConnectionStatistics} from "tc-shared/connection/ConnectionBase";

type VideoBroadcast = {
    readonly source: VideoSource;
    state: VideoBroadcastState,
    failedReason: string | undefined,
    active: boolean
}

export class RtpVideoConnection implements VideoConnection {
    private readonly rtcConnection: RTCConnection;
    private readonly events: Registry<VideoConnectionEvent>;
    private readonly listener: (() => void)[];
    private connectionState: VideoConnectionStatus;

    private broadcasts: {[T in VideoBroadcastType]: VideoBroadcast} = {
        camera: undefined,
        screen: undefined
    };
    private registeredClients: {[key: number]: RtpVideoClient} = {};

    constructor(rtcConnection: RTCConnection) {
        this.rtcConnection = rtcConnection;
        this.events = new Registry<VideoConnectionEvent>();
        this.setConnectionState(VideoConnectionStatus.Disconnected);

        this.listener = [];

        /* We only have to listen for move events since if the client is leaving the broadcast will be terminated anyways */
        this.listener.push(this.rtcConnection.getConnection().command_handler_boss().register_explicit_handler("notifyclientmoved", event => {
            const localClient = this.rtcConnection.getConnection().client.getClient();
            for(const data of event.arguments) {
                const clientId = parseInt(data["clid"]);
                if(clientId === localClient.clientId()) {
                    Object.values(this.registeredClients).forEach(client => {
                        client.setBroadcastId("screen", undefined);
                        client.setBroadcastId("camera", undefined);
                    });

                    if(settings.static_global(Settings.KEY_STOP_VIDEO_ON_SWITCH)) {
                        this.stopBroadcasting("camera", true);
                        this.stopBroadcasting("screen", true);
                    } else {
                        /* The server stops broadcasting by default, we've to reenable it */
                        this.restartBroadcast("screen");
                        this.restartBroadcast("camera");
                    }
                } else if(parseInt("scid") === localClient.currentChannel().channelId) {
                    const broadcast = this.registeredClients[clientId];
                    broadcast?.setBroadcastId("screen", undefined);
                    broadcast?.setBroadcastId("camera", undefined);
                }
            }
        }));

        this.listener.push(this.rtcConnection.getConnection().command_handler_boss().register_explicit_handler("notifybroadcastvideo", event => {
            const assignedClients: { clientId: number, broadcastType: VideoBroadcastType }[] = [];
            for(const data of event.arguments) {
                if(!("bid" in data)) {
                    continue;
                }

                const broadcastId = parseInt(data["bid"]);
                const broadcastType = parseInt(data["bt"]);
                const sourceClientId = parseInt(data["sclid"]);

                if(!this.registeredClients[sourceClientId]) {
                    logWarn(LogCategory.VIDEO, tr("Received video broadcast info about a not registered client (%d)"), sourceClientId);
                    /* TODO: Cache the value! */
                    continue;
                }

                let videoBroadcastType: VideoBroadcastType;
                switch(broadcastType) {
                    case 0x00:
                        videoBroadcastType = "camera";
                        break;

                    case 0x01:
                        videoBroadcastType = "screen";
                        break;

                    default:
                        logWarn(LogCategory.VIDEO, tr("Received video broadcast info with an invalid video broadcast type: %d."), broadcastType);
                        continue;
                }

                this.registeredClients[sourceClientId].setBroadcastId(videoBroadcastType, broadcastId);
                assignedClients.push({ broadcastType: videoBroadcastType, clientId: sourceClientId });
            }

            const broadcastTypes: VideoBroadcastType[] = ["screen", "camera"];
            Object.values(this.registeredClients).forEach(client => {
                for(const type of broadcastTypes) {
                    if(assignedClients.findIndex(assignment => assignment.broadcastType === type && assignment.clientId === client.getClientId()) !== -1) {
                        continue;
                    }

                    client.setBroadcastId(type, undefined);
                }
            });
        }));

        this.listener.push(this.rtcConnection.getConnection().events.on("notify_connection_state_changed", event => {
            if(event.newState !== ConnectionState.CONNECTED) {
                this.stopBroadcasting("camera");
                this.stopBroadcasting("screen");
            }
        }));

        this.listener.push(this.rtcConnection.getEvents().on("notify_state_changed", event => this.handleRtcConnectionStateChanged(event)));

        this.listener.push(this.rtcConnection.getEvents().on("notify_video_assignment_changed", event => {
            if(event.info) {
                switch (event.info.media) {
                    case 2:
                        this.handleVideoAssignmentChanged("camera", event);
                        break;

                    case 3:
                        this.handleVideoAssignmentChanged("screen", event);
                        break;

                    default:
                        logWarn(LogCategory.WEBRTC, tr("Received video track %o assignment for invalid media: %o"), event.track.getSsrc(), event.info);
                        return;
                }
            } else {
                /* track has been removed */
                this.handleVideoAssignmentChanged("screen", event);
                this.handleVideoAssignmentChanged("camera", event);
            }
        }));
    }

    private setConnectionState(state: VideoConnectionStatus) {
        if(this.connectionState === state) { return; }
        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_status_changed", { oldState: oldState, newState: state });
    }

    private restartBroadcast(type: VideoBroadcastType) {
        if(!this.broadcasts[type]?.active) { return; }
        const broadcast = this.broadcasts[type];

        if(broadcast.state !== VideoBroadcastState.Initializing) {
            const oldState = broadcast.state;
            broadcast.state = VideoBroadcastState.Initializing;
            this.events.fire("notify_local_broadcast_state_changed", { oldState: oldState, newState: VideoBroadcastState.Initializing, broadcastType: type });
        }

        this.rtcConnection.startTrackBroadcast(type === "camera" ? "video" : "video-screen").then(() => {
            if(!broadcast.active) { return; }

            const oldState = broadcast.state;
            broadcast.state = VideoBroadcastState.Running;
            this.events.fire("notify_local_broadcast_state_changed", { oldState: oldState, newState: VideoBroadcastState.Initializing, broadcastType: type });
            logDebug(LogCategory.VIDEO, tr("Successfully restarted video broadcast of type %s"), type);
        }).catch(error => {
            if(!broadcast.active) { return; }
            logWarn(LogCategory.VIDEO, tr("Failed to restart video broadcast %s: %o"), type, error);
            this.stopBroadcasting(type, true);
        });
    }

    destroy() {
        this.listener.forEach(callback => callback());
        this.listener.splice(0, this.listener.length);

        this.events.destroy();
    }

    getEvents(): Registry<VideoConnectionEvent> {
        return this.events;
    }

    getStatus(): VideoConnectionStatus {
        return this.connectionState;
    }

    getRetryTimestamp(): number | 0 {
        return this.rtcConnection.getRetryTimestamp();
    }

    getFailedMessage(): string {
        return this.rtcConnection.getFailReason();
    }

    getBroadcastingState(type: VideoBroadcastType): VideoBroadcastState {
        return this.broadcasts[type] ? this.broadcasts[type].state : VideoBroadcastState.Stopped;
    }

    async getBroadcastStatistics(type: VideoBroadcastType): Promise<VideoBroadcastStatistics | undefined> {
        /* TODO! */
        return undefined;
    }

    getBroadcastingSource(type: VideoBroadcastType): VideoSource | undefined {
        return this.broadcasts[type]?.source;
    }

    isBroadcasting(type: VideoBroadcastType) {
        return typeof this.broadcasts[type] !== "undefined";
    }

    async startBroadcasting(type: VideoBroadcastType, source: VideoSource) : Promise<void> {
        if(this.broadcasts[type]) {
            this.stopBroadcasting(type);
        }

        const videoTracks = source.getStream().getVideoTracks();
        if(videoTracks.length === 0) {
            throw tr("missing video stream track");
        }

        const broadcast = this.broadcasts[type] = {
            source: source.ref(),
            state: VideoBroadcastState.Initializing as VideoBroadcastState,
            failedReason: undefined,
            active: true
        };
        this.events.fire("notify_local_broadcast_state_changed", { oldState: VideoBroadcastState.Stopped, newState: VideoBroadcastState.Initializing, broadcastType: type });

        try {
            await this.rtcConnection.setTrackSource(type === "camera" ? "video" : "video-screen", videoTracks[0]);
        } catch (error) {
            this.stopBroadcasting(type);
            logError(LogCategory.WEBRTC, tr("Failed to setup video track for broadcast %s: %o"), type, error);
            throw tr("failed to initialize video track");
        }

        if(!broadcast.active) {
            return;
        }

        try {
            await this.rtcConnection.startTrackBroadcast(type === "camera" ? "video" : "video-screen");
        } catch (error) {
            this.stopBroadcasting(type);
            throw error;
        }

        if(!broadcast.active) {
            return;
        }

        broadcast.state = VideoBroadcastState.Running;
        this.events.fire("notify_local_broadcast_state_changed", { oldState: VideoBroadcastState.Initializing, newState: VideoBroadcastState.Running, broadcastType: type });
    }

    stopBroadcasting(type: VideoBroadcastType, skipRtcStop?: boolean) {
        const broadcast = this.broadcasts[type];
        if(!broadcast) {
            return;
        }

        if(!skipRtcStop) {
            this.rtcConnection.stopTrackBroadcast(type === "camera" ? "video" : "video-screen");
        }

        this.rtcConnection.setTrackSource(type === "camera" ? "video" : "video-screen", null).then(undefined);
        const oldState = this.broadcasts[type].state;
        this.broadcasts[type].active = false;
        this.broadcasts[type] = undefined;
        broadcast.source.deref();

        this.events.fire("notify_local_broadcast_state_changed", { oldState: oldState, newState: VideoBroadcastState.Stopped, broadcastType: type });
    }

    registerVideoClient(clientId: number) {
        if(typeof this.registeredClients[clientId] !== "undefined") {
            debugger;
            throw tr("a video client with this id has already been registered");
        }

        return this.registeredClients[clientId] = new RtpVideoClient(this.rtcConnection, clientId);
    }

    registeredVideoClients(): VideoClient[] {
        return Object.values(this.registeredClients);
    }

    unregisterVideoClient(client: VideoClient) {
        const clientId = client.getClientId();
        if(this.registeredClients[clientId] !== client) {
            debugger;
            return;
        }

        this.registeredClients[clientId].destroy();
        delete this.registeredClients[clientId];
    }

    private handleRtcConnectionStateChanged(event: RTCConnectionEvents["notify_state_changed"]) {
        switch (event.newState) {
            case RTPConnectionState.CONNECTED:
                this.setConnectionState(VideoConnectionStatus.Connected);
                break;

            case RTPConnectionState.CONNECTING:
                this.setConnectionState(VideoConnectionStatus.Connecting);
                break;

            case RTPConnectionState.DISCONNECTED:
                this.setConnectionState(VideoConnectionStatus.Disconnected);
                break;

            case RTPConnectionState.FAILED:
                this.setConnectionState(VideoConnectionStatus.Failed);
                break;

            case RTPConnectionState.NOT_SUPPORTED:
                this.setConnectionState(VideoConnectionStatus.Unsupported);
                break;
        }
    }

    private handleVideoAssignmentChanged(type: VideoBroadcastType, event: RTCConnectionEvents["notify_video_assignment_changed"]) {
        const oldClient = Object.values(this.registeredClients).find(client => client.getRtpTrack(type) === event.track);
        if(oldClient) {
            oldClient.setRtpTrack(type, undefined);
        }

        if(event.info) {
            const newClient = this.registeredClients[event.info.client_id];
            if(newClient) {
                newClient.setRtpTrack(type, event.track);
            } else {
                logWarn(LogCategory.VIDEO, tr("Received video track assignment for unknown video client (%o)."), event.info);
            }
        }
    }

    async getConnectionStats(): Promise<ConnectionStatistics> {
        const stats = await this.rtcConnection.getConnectionStatistics();

        return {
            bytesReceived: stats.videoBytesReceived,
            bytesSend: stats.videoBytesSent
        };
    }
}