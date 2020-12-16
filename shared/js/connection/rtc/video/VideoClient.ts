import {
    VideoBroadcastState,
    VideoBroadcastType,
    VideoClient,
    VideoClientEvents
} from "tc-shared/connection/VideoConnection";
import {Registry} from "tc-shared/events";
import {RemoteRTPTrackState, RemoteRTPVideoTrack} from "../RemoteTrack";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {RTCConnection} from "tc-shared/connection/rtc/Connection";

export class RtpVideoClient implements VideoClient {
    private readonly handle: RTCConnection;
    private readonly clientId: number;
    private readonly events: Registry<VideoClientEvents>;

    private readonly listenerTrackStateChanged: {[T in VideoBroadcastType]} = {
        screen: event => this.handleTrackStateChanged("screen", event.newState),
        camera: event => this.handleTrackStateChanged("camera", event.newState)
    };

    private currentTrack: {[T in VideoBroadcastType]: RemoteRTPVideoTrack} = {
        camera: undefined,
        screen: undefined
    };

    private trackStates: {[T in VideoBroadcastType]: VideoBroadcastState} = {
        camera: VideoBroadcastState.Stopped,
        screen: VideoBroadcastState.Stopped
    }

    private broadcastIds: {[T in VideoBroadcastType]: number | undefined} = {
        camera: undefined,
        screen: undefined
    };

    private joinedStates: {[T in VideoBroadcastType]: boolean} = {
        camera: false,
        screen: false
    }

    constructor(handle: RTCConnection, clientId: number) {
        this.handle = handle;
        this.clientId = clientId;
        this.events = new Registry<VideoClientEvents>();
    }

    getClientId(): number {
        return this.clientId;
    }

    getEvents(): Registry<VideoClientEvents> {
        return this.events;
    }

    getVideoStream(broadcastType: VideoBroadcastType): MediaStream {
        return this.currentTrack[broadcastType]?.getMediaStream();
    }

    getVideoState(broadcastType: VideoBroadcastType): VideoBroadcastState {
        return this.trackStates[broadcastType];
    }

    async joinBroadcast(broadcastType: VideoBroadcastType): Promise<void> {
        if(typeof this.broadcastIds[broadcastType] === "undefined") {
            throw tr("broadcast isn't available");
        }

        this.joinedStates[broadcastType] = true;
        this.setBroadcastState(broadcastType, VideoBroadcastState.Initializing);
        await this.handle.getConnection().send_command("broadcastvideojoin", {
            bid: this.broadcastIds[broadcastType],
            bt: broadcastType === "camera" ? 0 : 1
        }).then(() => {
            /* the broadcast state should switch automatically to running since we got an RTP stream now */
            if(this.trackStates[broadcastType] === VideoBroadcastState.Initializing) {
                throw tr("failed to receive stream");
            }
        }).catch(error => {
            this.joinedStates[broadcastType] = false;
            this.updateBroadcastState(broadcastType);
            logError(LogCategory.VIDEO, tr("Failed to join video broadcast: %o"), error);
            throw tr("failed to join broadcast");
        });
    }

    leaveBroadcast(broadcastType: VideoBroadcastType) {
        this.joinedStates[broadcastType] = false;
        this.setBroadcastState(broadcastType, typeof this.trackStates[broadcastType] === "number" ? VideoBroadcastState.Available : VideoBroadcastState.Stopped);

        const connection = this.handle.getConnection();
        if(!connection.connected()) {
            return;
        }

        if(typeof this.broadcastIds[broadcastType] === "undefined") {
            return;
        }

        this.handle.getConnection().send_command("broadcastvideoleave", {
            bid: this.broadcastIds[broadcastType],
            bt: broadcastType === "camera" ? 0 : 1
        }).catch(error => {
            logWarn(LogCategory.VIDEO, tr("Failed to leave video broadcast: %o"), error);
        });
    }

    destroy() {
        this.setRtpTrack("camera", undefined);
        this.setRtpTrack("screen", undefined);
    }

    getRtpTrack(type: VideoBroadcastType) : RemoteRTPVideoTrack | undefined {
        return this.currentTrack[type];
    }

    setRtpTrack(type: VideoBroadcastType, track: RemoteRTPVideoTrack | undefined) {
        if(this.currentTrack[type]) {
            this.currentTrack[type].getEvents().off("notify_state_changed", this.listenerTrackStateChanged[type]);
        }

        this.currentTrack[type] = track;
        if(this.currentTrack[type]) {
            this.currentTrack[type].getEvents().on("notify_state_changed", this.listenerTrackStateChanged[type]);
        }
        this.updateBroadcastState(type);
    }

    setBroadcastId(type: VideoBroadcastType, id: number | undefined) {
        if(this.broadcastIds[type] === id) {
            return;
        }

        this.broadcastIds[type] = id;
        if(typeof id === "undefined") {
            /* we've to join each video explicitly */
            this.joinedStates[type] = false;
        }
        this.updateBroadcastState(type);
    }

    private setBroadcastState(type: VideoBroadcastType, state: VideoBroadcastState) {
        if(this.trackStates[type] === state) {
            return;
        }

        const oldState = this.trackStates[type];
        this.trackStates[type] = state;
        this.events.fire("notify_broadcast_state_changed", { broadcastType: type, oldState: oldState, newState: state });
    }

    private handleTrackStateChanged(type: VideoBroadcastType, _newState: RemoteRTPTrackState) {
        this.updateBroadcastState(type);
    }

    private updateBroadcastState(type: VideoBroadcastType) {
        if(!this.broadcastIds[type]) {
            this.setBroadcastState(type, VideoBroadcastState.Stopped);
        } else if(!this.joinedStates[type]) {
            this.setBroadcastState(type, VideoBroadcastState.Available);
        } else {
            const rtpState = this.currentTrack[type]?.getState();
            switch (rtpState) {
                case undefined:
                    /* We're initializing the broadcast */
                    this.setBroadcastState(type, VideoBroadcastState.Initializing);
                    break;

                case RemoteRTPTrackState.Unbound:
                    logWarn(LogCategory.VIDEO, tr("Updated video broadcast state and the track state is 'Unbound' which should never happen."));
                    this.setBroadcastState(type, VideoBroadcastState.Stopped);
                    break;

                case RemoteRTPTrackState.Destroyed:
                    logWarn(LogCategory.VIDEO, tr("Updated video broadcast state and the track state is 'Destroyed' which should never happen."));
                    this.setBroadcastState(type, VideoBroadcastState.Stopped);
                    break;

                case RemoteRTPTrackState.Started:
                    this.setBroadcastState(type, VideoBroadcastState.Running);
                    break;

                case RemoteRTPTrackState.Bound:
                    this.setBroadcastState(type, VideoBroadcastState.Buffering);
                    break;
            }
        }
    }
}