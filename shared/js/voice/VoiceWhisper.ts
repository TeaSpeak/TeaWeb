import {Registry} from "../events";
import {VoicePlayer} from "../voice/VoicePlayer";

export interface WhisperTargetChannelClients {
    target: "channel-clients",

    channels: number[],
    clients: number[]
}

export interface WhisperTargetGroups {
    target: "groups",
    /* TODO! */
}

export interface WhisperTargetEcho {
    target: "echo",
}

export type WhisperTarget = WhisperTargetGroups | WhisperTargetChannelClients | WhisperTargetEcho;

export interface WhisperSessionEvents {
    notify_state_changed: { oldState: WhisperSessionState, newState: WhisperSessionState },
    notify_blocked_state_changed: { oldState: boolean, newState: boolean },
    notify_timed_out: {}
}

export enum WhisperSessionState {
    /* the session is getting initialized, not all variables may be set */
    INITIALIZING,

    /* there is currently no whispering */
    PAUSED,

    /* we're replaying some whisper */
    PLAYING,

    /* Something in the initialize process went wrong. */
    INITIALIZE_FAILED
}

export const kUnknownWhisperClientUniqueId = "unknown";

export interface WhisperSession {
    readonly events: Registry<WhisperSessionEvents>;

    /* get information about the whisperer */
    getClientId() : number;

    /* only ensured to be valid if session has been initialized */
    getClientName() : string | undefined;

    /* only ensured to be valid if session has been initialized */
    getClientUniqueId() : string | undefined;

    getSessionState() : WhisperSessionState;

    isBlocked() : boolean;
    setBlocked(blocked: boolean);

    getSessionTimeout() : number;
    setSessionTimeout(timeout: number);

    getLastWhisperTimestamp() : number;

    /**
     * This is only valid if the session has been initialized successfully,
     * and it hasn't been blocked
     *
     * @returns Returns the voice player
     */
    getVoicePlayer() : VoicePlayer | undefined;
}