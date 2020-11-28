import {
    VoicePlayerEvents,
    VoicePlayerLatencySettings,
    VoicePlayerState
} from "tc-shared/voice/VoicePlayer";
import {Registry} from "tc-shared/events";
import {LogCategory, logWarn} from "tc-shared/log";
import {RemoteRTPAudioTrack, RemoteRTPTrackState} from "tc-shared/connection/rtc/RemoteTrack";

export interface RtpVoicePlayerEvents {
    notify_state_changed: { oldState: VoicePlayerState, newState: VoicePlayerState }
}

export class VoicePlayer implements VoicePlayer {
    readonly events: Registry<VoicePlayerEvents>;
    private readonly listenerTrackStateChanged;

    private globallyMuted: boolean;

    private volume: number;
    private currentState: VoicePlayerState;
    private currentRtpTrack: RemoteRTPAudioTrack;

    constructor() {
        this.listenerTrackStateChanged = event => this.handleTrackStateChanged(event.newState);
        this.events = new Registry<VoicePlayerEvents>();
        this.currentState = VoicePlayerState.STOPPED;
    }

    destroy() {
        this.events.destroy();
    }

    setGloballyMuted(muted: boolean) {
        if(this.globallyMuted === muted) { return; }

        this.globallyMuted = muted;
        this.updateVolume();
    }

    abortReplay() {
        this.currentRtpTrack?.abortCurrentReplay();
        this.setState(VoicePlayerState.STOPPED);
    }

    getState(): VoicePlayerState {
        return this.currentState;
    }

    protected setState(state: VoicePlayerState) {
        if(this.currentState === state) { return; }

        const oldState = this.currentState;
        this.currentState = state;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: state });
    }

    getVolume(): number {
        return this.volume;
    }

    setVolume(volume: number) {
        this.volume = volume;
        this.updateVolume();
    }

    setRtpTrack(track: RemoteRTPAudioTrack | undefined) {
        if(this.currentRtpTrack) {
            this.currentRtpTrack.setGain(0);
            this.currentRtpTrack.getEvents().off("notify_state_changed", this.listenerTrackStateChanged);
        }

        this.currentRtpTrack = track;
        if(this.currentRtpTrack) {
            this.currentRtpTrack.getEvents().on("notify_state_changed", this.listenerTrackStateChanged);
            this.updateVolume();
            this.handleTrackStateChanged(this.currentRtpTrack.getState());
        }
    }

    getRtpTrack() {
        return this.currentRtpTrack;
    }

    private handleTrackStateChanged(newState: RemoteRTPTrackState) {
        switch (newState) {
            case RemoteRTPTrackState.Bound:
            case RemoteRTPTrackState.Unbound:
                this.setState(VoicePlayerState.STOPPED);
                break;

            case RemoteRTPTrackState.Started:
                this.setState(VoicePlayerState.PLAYING);
                break;

            case RemoteRTPTrackState.Destroyed:
                logWarn(LogCategory.AUDIO, tr("Received new track state 'Destroyed' which should never happen."));
                this.setState(VoicePlayerState.STOPPED);
                break;
        }
    }

    private updateVolume() {
        this.currentRtpTrack?.setGain(this.globallyMuted ? 0 : this.volume);
    }

    flushBuffer() { /* not supported */ }

    getLatencySettings(): Readonly<VoicePlayerLatencySettings> {
        return { minBufferTime: 0, maxBufferTime: 0 };
    }
    resetLatencySettings() { }
    setLatencySettings(_settings: VoicePlayerLatencySettings) { }
}