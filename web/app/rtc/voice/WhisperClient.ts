import {WhisperSession, WhisperSessionEvents, WhisperSessionState} from "tc-shared/voice/VoiceWhisper";
import {Registry} from "tc-shared/events";
import {VoicePlayer, VoicePlayerState} from "tc-shared/voice/VoicePlayer";
import {WhisperSessionInitializeData} from "tc-shared/connection/VoiceConnection";
import {RtpVoicePlayer} from "./RtpVoicePlayer";
import {RemoteRTPAudioTrack, TrackClientInfo} from "tc-backend/web/rtc/RemoteTrack";

export class RtpWhisperSession implements WhisperSession {
    readonly events: Registry<WhisperSessionEvents>;
    private readonly assignmentInfo: TrackClientInfo;

    private track: RemoteRTPAudioTrack;
    private globallyMuted: boolean;

    private sessionState: WhisperSessionState;
    private sessionBlocked: boolean;

    private sessionTimeout: number;
    private sessionTimeoutId: number;

    private lastWhisperTimestamp: number;
    private voicePlayer: RtpVoicePlayer;

    constructor(track: RemoteRTPAudioTrack, info: TrackClientInfo) {
        this.events = new Registry<WhisperSessionEvents>();
        this.track = track;
        this.assignmentInfo = info;
        this.sessionState = WhisperSessionState.INITIALIZING;

        this.globallyMuted = false;
    }

    getClientId(): number {
        return this.assignmentInfo.client_id;
    }

    getClientName(): string | undefined {
        return this.assignmentInfo.client_name;
    }

    getClientUniqueId(): string | undefined {
        return this.assignmentInfo.client_unique_id;
    }

    getLastWhisperTimestamp(): number {
        return this.lastWhisperTimestamp;
    }

    getSessionState(): WhisperSessionState {
        return this.sessionState;
    }

    getSessionTimeout(): number {
        return this.sessionTimeout;
    }

    getVoicePlayer(): VoicePlayer | undefined {
        return this.voicePlayer;
    }

    setSessionTimeout(timeout: number) {
        this.sessionTimeout = timeout;
        this.resetSessionTimeout();
    }

    isBlocked(): boolean {
        return this.sessionBlocked;
    }

    setBlocked(blocked: boolean) {
        this.sessionBlocked = blocked;
    }

    initializeFromData(data: WhisperSessionInitializeData) {
        this.assignmentInfo.client_name = data.clientName;
        this.assignmentInfo.client_unique_id = data.clientUniqueId;

        this.sessionBlocked = data.blocked;
        this.sessionTimeout = data.sessionTimeout;

        this.voicePlayer = new RtpVoicePlayer();
        this.voicePlayer.setRtpTrack(this.track);
        this.voicePlayer.setGloballyMuted(this.globallyMuted);
        this.voicePlayer.setVolume(data.volume);
        this.voicePlayer.events.on("notify_state_changed", event => {
            if(event.newState === VoicePlayerState.BUFFERING) {
                return;
            }

            this.resetSessionTimeout();
            if(event.newState === VoicePlayerState.PLAYING || event.newState === VoicePlayerState.STOPPING) {
                this.setSessionState(WhisperSessionState.PLAYING);
            } else {
                this.setSessionState(WhisperSessionState.PAUSED);
            }
        });
        this.setSessionState(WhisperSessionState.PAUSED);
    }

    initializeFailed() {
        this.setSessionState(WhisperSessionState.INITIALIZE_FAILED);

        /* if we're receiving nothing for more than 5 seconds we can try it again */
        this.sessionTimeout = 5000;
        this.resetSessionTimeout();
    }

    destroy() {
        clearTimeout(this.sessionTimeoutId);
        this.events.destroy();
        this.voicePlayer?.destroy();
        this.voicePlayer = undefined;
    }

    setSessionState(state: WhisperSessionState) {
        if(this.sessionState === state) {
            return;
        }

        const oldState = this.sessionState;
        this.sessionState = state;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: state });
    }

    private resetSessionTimeout() {
        clearTimeout(this.sessionTimeoutId);
        if(this.sessionState === WhisperSessionState.PLAYING) {
            /* no need to reschedule a session timeout if we're currently playing */
            return;
        } else if(this.sessionState === WhisperSessionState.INITIALIZING) {
            /* we're still initializing; a session timeout hasn't been set */
            return;
        }

        this.sessionTimeoutId = setTimeout(() => {
            this.events.fire("notify_timed_out");
        }, Math.max(this.sessionTimeout, 1000));
    }

    setRtpTrack(track: RemoteRTPAudioTrack | undefined) {
        if(track) {
            const info = track.getCurrentAssignment();
            if(!info) {
                throw tr("Target track missing an assignment");
            }

            if(info.client_id !== this.assignmentInfo.client_id) {
                throw tra("Target track does not belong to current whisper session owner (Owner: {}, Track owner: {})", this.assignmentInfo.client_id, info.client_name);
            }

            this.assignmentInfo.client_name = info.client_name;
            this.assignmentInfo.client_unique_id = info.client_unique_id;
        }

        this.track = track;
        this.voicePlayer?.setRtpTrack(track);
    }

    getRtpTrack() {
        return this.voicePlayer.getRtpTrack();
    }

    setGloballyMuted(muted: boolean) {
        this.globallyMuted = muted;
        this.voicePlayer?.setGloballyMuted(muted);
    }
}