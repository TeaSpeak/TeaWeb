import {
    VideoBroadcastState,
    VideoBroadcastType,
    VideoClient,
    VideoClientEvents
} from "tc-shared/connection/VideoConnection";
import {Registry} from "tc-shared/events";
import {RemoteRTPTrackState, RemoteRTPVideoTrack} from "tc-backend/web/rtc/RemoteTrack";
import {LogCategory, logWarn} from "tc-shared/log";

export class RtpVideoClient implements VideoClient {
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

    constructor(clientId: number) {
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
            this.handleTrackStateChanged(type, this.currentTrack[type].getState());
        }
    }

    private setBroadcastState(type: VideoBroadcastType, state: VideoBroadcastState) {
        if(this.trackStates[type] === state) {
            return;
        }

        const oldState = this.trackStates[type];
        this.trackStates[type] = state;
        this.events.fire("notify_broadcast_state_changed", { broadcastType: type, oldState: oldState, newState: state });
    }

    private handleTrackStateChanged(type: VideoBroadcastType, newState: RemoteRTPTrackState) {
        switch (newState) {
            case RemoteRTPTrackState.Bound:
            case RemoteRTPTrackState.Unbound:
                this.setBroadcastState(type, VideoBroadcastState.Stopped);
                break;

            case RemoteRTPTrackState.Started:
                this.setBroadcastState(type, VideoBroadcastState.Running);
                break;

            case RemoteRTPTrackState.Destroyed:
                logWarn(LogCategory.VIDEO, tr("Received new track state 'Destroyed' which should never happen."));
                this.setBroadcastState(type, VideoBroadcastState.Stopped);
                break;
        }
    }
}