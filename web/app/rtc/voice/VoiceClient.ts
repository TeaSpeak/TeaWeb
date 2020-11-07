import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {VoicePlayerEvents, VoicePlayerLatencySettings, VoicePlayerState} from "tc-shared/voice/VoicePlayer";
import {Registry} from "tc-shared/events";
import {LogCategory, logWarn} from "tc-shared/log";
import {RemoteRTPAudioTrack, RemoteRTPTrackState} from "tc-backend/web/rtc/RemoteTrack";

export class RtpVoiceClient implements VoiceClient {
    readonly events: Registry<VoicePlayerEvents>;
    private readonly listenerTrackStateChanged;
    private readonly clientId: number;

    private volume: number;
    private currentState: VoicePlayerState;
    private currentRtpTrack: RemoteRTPAudioTrack;

    constructor(clientId: number) {
        this.clientId = clientId;
        this.listenerTrackStateChanged = event => this.handleTrackStateChanged(event.newState);
        this.events = new Registry<VoicePlayerEvents>();
        this.currentState = VoicePlayerState.STOPPED;
    }

    destroy() {
        this.events.destroy();
    }

    getClientId(): number {
        return this.clientId;
    }

    abortReplay() {
        this.currentRtpTrack?.abortCurrentReplay();
        this.setState(VoicePlayerState.STOPPED);
    }

    flushBuffer() { /* not possible */ }

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
        this.currentRtpTrack?.setGain(volume);
    }

    getLatencySettings(): Readonly<VoicePlayerLatencySettings> {
        return { minBufferTime: 0, maxBufferTime: 0 };
    }
    resetLatencySettings() { }
    setLatencySettings(settings: VoicePlayerLatencySettings) { }

    setRtpTrack(track: RemoteRTPAudioTrack | undefined) {
        if(this.currentRtpTrack) {
            this.currentRtpTrack.setGain(0);
            this.currentRtpTrack.getEvents().off("notify_state_changed", this.listenerTrackStateChanged);
        }
        this.currentRtpTrack = track;
        if(this.currentRtpTrack) {
            this.currentRtpTrack.setGain(this.volume);
            this.currentRtpTrack.getEvents().on("notify_state_changed", this.listenerTrackStateChanged);
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
}