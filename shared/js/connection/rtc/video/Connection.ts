import {
    BroadcastConstraints,
    LocalVideoBroadcast,
    LocalVideoBroadcastEvents,
    LocalVideoBroadcastState,
    VideoBroadcastStatistics,
    VideoBroadcastType,
    VideoClient,
    VideoConnection,
    VideoConnectionEvent,
    VideoConnectionStatus
} from "tc-shared/connection/VideoConnection";
import {Registry} from "tc-shared/events";
import {VideoSource} from "tc-shared/video/VideoSource";
import {RTCBroadcastableTrackType, RTCConnection, RTCConnectionEvents, RTPConnectionState} from "../Connection";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {RtpVideoClient} from "./VideoClient";
import {tr} from "tc-shared/i18n/localize";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import {ConnectionStatistics} from "tc-shared/connection/ConnectionBase";
import * as _ from "lodash";

class LocalRtpVideoBroadcast implements LocalVideoBroadcast {
    private readonly handle: RtpVideoConnection;
    private readonly type: VideoBroadcastType;
    private readonly events: Registry<LocalVideoBroadcastEvents>;

    private state: LocalVideoBroadcastState;
    private currentSource: VideoSource;
    private currentConstrints: BroadcastConstraints;
    private broadcastStartId: number;

    private localStartPromise: Promise<void>;

    constructor(handle: RtpVideoConnection, type: VideoBroadcastType) {
        this.handle = handle;
        this.type = type;
        this.broadcastStartId = 0;

        this.events = new Registry<LocalVideoBroadcastEvents>();
        this.state = { state: "stopped" };
    }

    destroy() {
        this.events.destroy();
    }

    getEvents(): Registry<LocalVideoBroadcastEvents> {
        return this.events;
    }

    getSource(): VideoSource | undefined {
        return this.currentSource;
    }

    getState(): LocalVideoBroadcastState {
        return this.state;
    }

    private setState(newState: LocalVideoBroadcastState) {
        if(_.isEqual(this.state, newState)) {
            return;
        }

        const oldState = this.state;
        this.state = newState;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: newState });
    }

    getStatistics(): Promise<VideoBroadcastStatistics | undefined> {
        return Promise.resolve(undefined);
    }

    async changeSource(source: VideoSource, constraints: BroadcastConstraints): Promise<void> {
        let sourceRef = source.ref();
        try {
            if(this.currentSource !== source) {
                console.error("Source changed");
                const videoTracks = source.getStream().getVideoTracks();
                if(videoTracks.length === 0) {
                    throw tr("missing video stream track");
                }

                while(this.localStartPromise) {
                    await this.localStartPromise;
                }

                if(this.state.state !== "broadcasting") {
                    throw tr("not broadcasting anything");
                }

                /* Apply the constraints to the current source */
                await this.doApplyConstraints(constraints, source);

                const startId = ++this.broadcastStartId;
                let rtcBroadcastType: RTCBroadcastableTrackType = this.type === "camera" ? "video" : "video-screen";
                try {
                    await this.handle.getRTCConnection().setTrackSource(rtcBroadcastType, videoTracks[0]);
                } catch (error) {
                    if(this.broadcastStartId !== startId) {
                        /* broadcast start has been canceled */
                        return;
                    }

                    logError(LogCategory.WEBRTC, tr("Failed to change video track for broadcast %s: %o"), this.type, error);
                    throw tr("failed to change video track");
                }

                this.setCurrentSource(sourceRef);
            } else if(!_.isEqual(this.currentConstrints, constraints)) {
                console.error("Constraints changed");
                await this.applyConstraints(constraints);
            }
        } finally {
            sourceRef.deref();
        }
    }

    private setCurrentSource(source: VideoSource | undefined) {
        if(this.currentSource) {
            this.currentSource.deref();
            this.currentConstrints = undefined;
        }
        this.currentSource = source?.ref();
    }

    async startBroadcasting(source: VideoSource, constraints: BroadcastConstraints): Promise<void> {
        const sourceRef = source.ref();
        while(this.localStartPromise) {
            await this.localStartPromise;
        }

        const promise = this.doStartBroadcast(source, constraints);
        this.localStartPromise = promise.catch(() => {});
        this.localStartPromise.then(() => this.localStartPromise = undefined);
        try {
            await promise;
        } finally {
            sourceRef.deref();
        }
    }

    private async doStartBroadcast(source: VideoSource, constraints: BroadcastConstraints) {
        const videoTracks = source.getStream().getVideoTracks();
        if(videoTracks.length === 0) {
            throw tr("missing video stream track");
        }
        const startId = ++this.broadcastStartId;

        this.setCurrentSource(source);
        this.setState({ state: "initializing" });

        if(this.broadcastStartId !== startId) {
            /* broadcast start has been canceled */
            return;
        }

        try {
            await this.applyConstraints(constraints);
        } catch (error) {
            if(this.broadcastStartId !== startId) {
                /* broadcast start has been canceled */
                return;
            }

            logError(LogCategory.WEBRTC, tr("Failed to apply video constraints for broadcast %s: %o"), this.type, error);
            this.stopBroadcasting(true, { state: "failed", reason: tr("Failed to apply video constraints") });
            throw tr("Failed to apply video constraints");
        }
        if(this.broadcastStartId !== startId) {
            /* broadcast start has been canceled */
            return;
        }

        let rtcBroadcastType: RTCBroadcastableTrackType = this.type === "camera" ? "video" : "video-screen";

        try {
            await this.handle.getRTCConnection().setTrackSource(rtcBroadcastType, videoTracks[0]);
        } catch (error) {
            if(this.broadcastStartId !== startId) {
                /* broadcast start has been canceled */
                return;
            }

            this.stopBroadcasting(true, { state: "failed", reason: tr("Failed to set track source") });
            logError(LogCategory.WEBRTC, tr("Failed to setup video track for broadcast %s: %o"), this.type, error);
            throw tr("failed to initialize video track");
        }

        if(this.broadcastStartId !== startId) {
            /* broadcast start has been canceled */
            return;
        }

        try {
            await this.handle.getRTCConnection().startTrackBroadcast(rtcBroadcastType);
        } catch (error) {
            if(this.broadcastStartId !== startId) {
                /* broadcast start has been canceled */
                return;
            }

            this.stopBroadcasting(true, { state: "failed", reason: error });
            throw error;
        }

        if(this.broadcastStartId !== startId) {
            /* broadcast start has been canceled */
            return;
        }

        this.setState({ state: "broadcasting" });
    }

    async applyConstraints(constraints: BroadcastConstraints): Promise<void> {
        await this.doApplyConstraints(constraints, this.currentSource);
    }

    private async doApplyConstraints(constraints: BroadcastConstraints, source: VideoSource): Promise<void> {
        const capabilities = source.getCapabilities();
        const videoConstraints: MediaTrackConstraints = {};

        if(constraints.dynamicQuality && capabilities) {
            videoConstraints.width = {
                min: capabilities.minWidth,
                max: constraints.width,
                ideal: constraints.width
            };

            videoConstraints.height = {
                min: capabilities.minHeight,
                max: constraints.height,
                ideal: constraints.height
            };
        } else {
            videoConstraints.width = constraints.width;
            videoConstraints.height = constraints.height;
        }

        if(constraints.dynamicFrameRate && capabilities) {
            videoConstraints.frameRate = {
                min: capabilities.minFrameRate,
                max: constraints.maxFrameRate,
                ideal: constraints.maxFrameRate
            };
        } else {
            videoConstraints.frameRate = constraints.maxFrameRate;
        }

        await source.getStream().getVideoTracks()[0]?.applyConstraints(constraints);
        this.currentConstrints = constraints;

        /* TODO: Bandwidth update? */
    }

    stopBroadcasting(skipRtcStop?: boolean, stopState?: LocalVideoBroadcastState) {
        if(this.state.state === "stopped" && (!stopState || _.isEqual(stopState, this.state))) {
            return;
        }

        this.broadcastStartId++;

        (async () => {
            while(this.localStartPromise) {
                await this.localStartPromise;
            }

            let rtcBroadcastType: RTCBroadcastableTrackType = this.type === "camera" ? "video" : "video-screen";
            if(!skipRtcStop && !(this.state.state === "failed" || this.state.state === "stopped")) {
                this.handle.getRTCConnection().stopTrackBroadcast(rtcBroadcastType);
            }

            this.setCurrentSource(undefined);

            try {
                await this.handle.getRTCConnection().setTrackSource(rtcBroadcastType, null);
            } catch (error) {
                logWarn(LogCategory.VIDEO, tr("Failed to change the RTC video track to null: %o"), error);
            }
            this.setState(stopState || { state: "stopped" });
        })();
    }

    /**
     * Restart the broadcast after a channel switch.
     */
    restartBroadcast() {
        (async () => {
            while(this.localStartPromise) {
                await this.localStartPromise;
            }

            if(this.state.state !== "broadcasting") {
                return;
            }

            this.setState({ state: "initializing" });
            let rtcBroadcastType: RTCBroadcastableTrackType = this.type === "camera" ? "video" : "video-screen";
            const startId = ++this.broadcastStartId;

            try {
                await this.handle.getRTCConnection().startTrackBroadcast(rtcBroadcastType);
            } catch (error) {
                if(this.broadcastStartId !== startId) {
                    /* broadcast start has been canceled */
                    return;
                }

                this.stopBroadcasting(true, { state: "failed", reason: error });
                throw error;
            }
        })();
    }

    getConstraints(): BroadcastConstraints | undefined {
        return this.currentConstrints;
    }
}

export class RtpVideoConnection implements VideoConnection {
    private readonly rtcConnection: RTCConnection;
    private readonly events: Registry<VideoConnectionEvent>;
    private readonly listener: (() => void)[];
    private connectionState: VideoConnectionStatus;

    private broadcasts: {[T in VideoBroadcastType]: LocalRtpVideoBroadcast} = {
        camera: new LocalRtpVideoBroadcast(this, "camera"),
        screen: new LocalRtpVideoBroadcast(this, "screen")
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
                        Object.values(this.broadcasts).forEach(broadcast => broadcast.stopBroadcasting());
                    } else {
                        /* The server stops broadcasting by default, we've to reenable it */
                        Object.values(this.broadcasts).forEach(broadcast => broadcast.restartBroadcast());
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
                Object.values(this.broadcasts).forEach(broadcast => broadcast.stopBroadcasting(true));
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

    destroy() {
        this.listener.forEach(callback => callback());
        this.listener.splice(0, this.listener.length);

        this.events.destroy();
    }

    getRTCConnection() : RTCConnection {
        return this.rtcConnection;
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

    getLocalBroadcast(channel: VideoBroadcastType): LocalVideoBroadcast {
        return this.broadcasts[channel];
    }
}