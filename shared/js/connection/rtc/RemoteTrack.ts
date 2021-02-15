import {Registry} from "tc-shared/events";
import {LogCategory, logTrace, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {globalAudioContext, on_ready} from "tc-backend/audio/player";

export interface TrackClientInfo {
    media?: number,

    client_id: number,
    client_database_id: number,
    client_unique_id: string,
    client_name: string
}

export enum RemoteRTPTrackState {
    /** The track isn't bound to any client */
    Unbound,
    /** The track is bound to a client, but isn't replaying anything */
    Bound,
    /** The track is currently replaying something (inherits the Bound characteristics) */
    Started,
    /** The track has been destroyed */
    Destroyed
}

export interface RemoteRTPTrackEvents {
    notify_state_changed: { oldState: RemoteRTPTrackState, newState: RemoteRTPTrackState }
}


declare global {
    interface RTCRtpReceiver {
        /* Works currently only for Chrome */
        playoutDelayHint: number;
    }
}

export class RemoteRTPTrack {
    protected readonly events: Registry<RemoteRTPTrackEvents>;
    private readonly ssrc: number;
    private readonly transceiver: RTCRtpTransceiver;

    private currentState: RemoteRTPTrackState;
    protected currentAssignment: TrackClientInfo;

    constructor(ssrc: number, transceiver: RTCRtpTransceiver) {
        this.events = new Registry<RemoteRTPTrackEvents>();
        this.ssrc = ssrc;
        this.transceiver = transceiver;
        this.currentState = RemoteRTPTrackState.Unbound;

        transceiver.receiver.playoutDelayHint = 0.06;
    }

    protected destroy() {
        this.events.destroy();
    }

    getEvents() : Registry<RemoteRTPTrackEvents> {
        return this.events;
    }

    getState() : RemoteRTPTrackState {
        return this.currentState;
    }

    getSsrc() : number {
        return this.ssrc >>> 0;
    }

    getTrack() : MediaStreamTrack {
        return this.transceiver.receiver.track;
    }

    getTransceiver() : RTCRtpTransceiver {
        return this.transceiver;
    }

    getCurrentAssignment() : TrackClientInfo | undefined {
        return this.currentAssignment;
    }

    protected setState(state: RemoteRTPTrackState) {
        if(this.currentState === state) {
            return;
        } else if(this.currentState === RemoteRTPTrackState.Destroyed) {
            logWarn(LogCategory.WEBRTC, tr("Tried to change the track state for track %d from destroyed to %s."), this.getSsrc(), RemoteRTPTrackState[state]);
            return;
        }

        const oldState = this.currentState;
        this.currentState = state;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: state });
    }
}

export class RemoteRTPVideoTrack extends RemoteRTPTrack {
    protected mediaStream: MediaStream;

    constructor(ssrc: number, transceiver: RTCRtpTransceiver) {
        super(ssrc, transceiver);

        this.mediaStream = new MediaStream();
        this.mediaStream.addTrack(transceiver.receiver.track);

        const track = transceiver.receiver.track;
        track.onended = () => logTrace(LogCategory.VIDEO, "Track %d ended", ssrc);
        track.onmute = () => logTrace(LogCategory.VIDEO, "Track %d muted", ssrc);
        track.onunmute = () => logTrace(LogCategory.VIDEO, "Track %d unmuted", ssrc);
        track.onisolationchange = () => logTrace(LogCategory.VIDEO, "Track %d isolation changed", ssrc);
    }

    getMediaStream() : MediaStream {
        return this.mediaStream;
    }

    protected handleTrackEnded() {

    }
}

export class RemoteRTPAudioTrack extends RemoteRTPTrack {
    protected htmlAudioNode: HTMLAudioElement;
    protected mediaStream: MediaStream;

    protected audioNode: MediaStreamAudioSourceNode;
    protected gainNode: GainNode;

    protected shouldReplay: boolean;
    protected gain: number;

    constructor(ssrc: number, transceiver: RTCRtpTransceiver) {
        super(ssrc, transceiver);
        this.gain = 0;
        this.shouldReplay = false;

        this.mediaStream = new MediaStream();
        this.mediaStream.addTrack(transceiver.receiver.track);

        this.htmlAudioNode = document.createElement("audio");
        this.htmlAudioNode.srcObject = this.mediaStream;
        this.htmlAudioNode.autoplay = true;
        this.htmlAudioNode.muted = true;
        this.htmlAudioNode.msRealTime = true;

        /*
        {
            const track = transceiver.receiver.track;
            for(let key in track) {
                if(!key.startsWith("on")) {
                    continue;
                }

                track[key] = () => console.log("Track %d: %s", this.getSsrc(), key);
            }
        }
        */

        /*
        //TODO: ontimeupdate may gives us a hint whatever we're still replaying audio or not
        for(let key in this.htmlAudioNode) {
            if(!key.startsWith("on")) {
                continue;
            }

            this.htmlAudioNode[key] = () => console.log("AudioElement %d: %s", this.getSsrc(), key);
            this.htmlAudioNode.ontimeupdate = () => {
                console.log("AudioElement %d: Time update. Current time: %d", this.getSsrc(), this.htmlAudioNode.currentTime, this.htmlAudioNode.buffered)
            };
        }
        */

        on_ready(() => {
            if(!this.mediaStream) {
                /* we've already been destroyed */
                return;
            }

            const audioContext = globalAudioContext();
            this.audioNode = audioContext.createMediaStreamSource(this.mediaStream);
            this.gainNode = audioContext.createGain();
            this.updateGainNode();

            this.audioNode.connect(this.gainNode);
            this.gainNode.connect(audioContext.destination);
        });

        const track = transceiver.receiver.track;
        track.onended = () => this.handleTrackEnded();
        /* Audio tracks do not fire muted/unmuted events */
    }

    protected handleTrackEnded() {
        const track = this.getTransceiver().receiver.track;
        track.onended = undefined;

        this.htmlAudioNode?.remove();
        this.htmlAudioNode = undefined;

        this.mediaStream = undefined;
        this.setState(RemoteRTPTrackState.Destroyed);
    }

    getGain() : GainNode | undefined {
        return this.gainNode;
    }

    setGain(value: number) {
        this.gain = value;
        this.updateGainNode();
    }

    /**
     * Mutes this track until the next setGain(..) call or a new sequence begins (state update)
     */
    abortCurrentReplay() {
        if(this.gainNode) {
            this.gainNode.gain.value = 0;
        }
    }

    protected updateGainNode() {
        if(!this.gainNode) {
            return;
        }

        this.gainNode.gain.value = this.shouldReplay ? this.gain : 0;
        //console.error("Change gain for %d to %f (%o)", this.getSsrc(), this.gainNode.gain.value, this.shouldReplay);
    }
}