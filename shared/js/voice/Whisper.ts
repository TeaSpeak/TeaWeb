import {Registry} from "tc-shared/events";

export interface WhisperSessionEvents {
    notify_state_changed: { oldState: WhisperSessionState, newState: WhisperSessionState }
}

export enum WhisperSessionState {
    /* the sesston is getting initialized, not all variables may be set */
    INITIALIZING,

    /* there is currently no whispering */
    PAUSED,

    /* we're currently buffering */
    BUFFERING,

    /* we're replaying some whisper */
    PLAYING,

    /* we're currently receiving a whisper, but it has been blocked */
    BLOCKED
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

    isBlocked() : boolean;
    setBlocked(flag: boolean);

    getSessionTimeout() : number;
    setSessionTimeout() : number;

    getLastWhisperTimestamp() : number;

    setVolume(volume: number);
    getVolume() : number;
}