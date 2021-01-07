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
import {makeVideoAutoplay} from "tc-shared/ui/frames/video/Definitions";

export class RtpVideoClient implements VideoClient {
    private readonly handle: RTCConnection;
    private readonly clientId: number;
    private readonly events: Registry<VideoClientEvents>;

    private readonly listenerTrackStateChanged: {[T in VideoBroadcastType]} = {
        screen: event => this.handleTrackStateChanged("screen", event.newState),
        camera: event => this.handleTrackStateChanged("camera", event.newState)
    };

    private dismissedStates: {[T in VideoBroadcastType]: boolean} = {
        screen: false,
        camera: false
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

    private pipElement: HTMLVideoElement | undefined;
    private pipBroadcastType: VideoBroadcastType | undefined;

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
        this.setBroadcastDismissed(broadcastType,false);
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
        this.stopPip();
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
        this.events.fire("notify_broadcast_stream_changed", { broadcastType: type });
        if(type === this.pipBroadcastType && this.pipElement) {
            if(track) {
                this.pipElement.srcObject = track.getMediaStream();
            } else {
                this.stopPip();
            }
        }
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

    private setBroadcastDismissed(broadcastType: VideoBroadcastType, dismissed: boolean) {
        if(this.dismissedStates[broadcastType] === dismissed) {
            return;
        }

        this.dismissedStates[broadcastType] = dismissed;
        this.events.fire("notify_dismissed_state_changed", { broadcastType: broadcastType, dismissed: dismissed });
    }

    dismissBroadcast(broadcastType: VideoBroadcastType) {
        this.setBroadcastDismissed(broadcastType, true);
    }

    isBroadcastDismissed(broadcastType: VideoBroadcastType): boolean {
        return this.dismissedStates[broadcastType];
    }

    async showPip(broadcastType: VideoBroadcastType): Promise<void> {
        if(this.trackStates[broadcastType] !== VideoBroadcastState.Running && this.trackStates[broadcastType] !== VideoBroadcastState.Buffering) {
            throw tr("Target broadcast isn't running");
        }

        if(this.pipBroadcastType === broadcastType) {
            return;
        }

        this.pipBroadcastType = broadcastType;

        if(!("requestPictureInPicture" in HTMLVideoElement.prototype)) {
            throw tr("Picture in picture isn't supported");
        }

        const stream = this.getVideoStream(broadcastType);
        if(!stream) {
            throw tr("Missing video stream");
        }

        const element = document.createElement("video");
        element.srcObject = stream;
        element.muted = true;
        element.style.position = "absolute";
        element.style.top = "-1000000px";

        this.pipElement?.remove();
        this.pipElement = element;
        this.pipBroadcastType = broadcastType;

        try {
            document.body.appendChild(element);

            try {
                await new Promise((resolve, reject) => {
                    element.onloadedmetadata = resolve;
                    element.onerror = reject;
                });
            } catch (error) {
                throw tr("Failed to load video meta data");
            } finally {
                element.onloadedmetadata = undefined;
                element.onerror = undefined;
            }

            try {
                await (element as any).requestPictureInPicture();
            } catch(error) {
                throw error;
            }

            const cancelAutoplay = makeVideoAutoplay(element);
            element.addEventListener('leavepictureinpicture', () => {
                cancelAutoplay();
                element.remove();
                if(this.pipElement === element) {
                    this.pipElement = undefined;
                    this.pipBroadcastType = undefined;
                }
            });
        } catch(error) {
            element.remove();
            if(this.pipElement === element) {
                this.pipElement = undefined;
                this.pipBroadcastType = undefined;
            }
            throw error;
        }
    }

    private stopPip() {
        if((document as any).pictureInPictureElement === this.pipElement && "exitPictureInPicture" in document) {
            (document as any).exitPictureInPicture();
        }

        this.pipElement?.remove();
        this.pipElement = undefined;
        this.pipBroadcastType = undefined;
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