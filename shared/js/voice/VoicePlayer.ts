import {Registry} from "tc-shared/events";

export enum VoicePlayerState {
    INITIALIZING,

    PREBUFFERING,
    PLAYING,
    BUFFERING,
    STOPPING,
    STOPPED
}

export interface VoicePlayerEvents {
    notify_state_changed: { oldState: VoicePlayerState, newState: VoicePlayerState }
}

export interface VoicePlayerLatencySettings {
    /* time in milliseconds */
    minBufferTime: number;

    /* time in milliseconds */
    maxBufferTime: number;
}

export interface VoicePlayer {
    readonly events: Registry<VoicePlayerEvents>;

    /**
     * @returns Returns the current voice player state.
     *          Subscribe to the "notify_state_changed" event to receive player changes.
     */
    getState() : VoicePlayerState;

    /**
     * @returns The volume multiplier in a range from [0, 1]
     */
    getVolume() : number;

    /**
     * @param volume The volume multiplier in a range from [0, 1]
     */
    setVolume(volume: number);

    /**
     * Abort the replaying of the currently pending buffers.
     * If new buffers are arriving a new replay will be started.
     */
    abortReplay();

    /**
     * Flush the current buffer.
     * This will most likely set the player into the buffering mode.
     */
    flushBuffer();

    /**
     * Get the currently used latency settings
     */
    getLatencySettings() : Readonly<VoicePlayerLatencySettings>;

    /**
     * @param settings The new latency settings to be used
     */
    setLatencySettings(settings: VoicePlayerLatencySettings);

    /**
     * Reset the latency settings to the default
     */
    resetLatencySettings();
}