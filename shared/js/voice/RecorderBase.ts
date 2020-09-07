import {IDevice} from "tc-shared/audio/recorder";
import {Registry} from "tc-shared/events";
import {Filter, FilterType, FilterTypeClass} from "tc-shared/voice/Filter";

export enum InputConsumerType {
    CALLBACK,
    NODE,
    NATIVE
}
export interface CallbackInputConsumer {
    type: InputConsumerType.CALLBACK;
    callbackAudio?: (buffer: AudioBuffer) => any;
    callbackBuffer?: (buffer: Float32Array, samples: number, channels: number) => any;
}

export interface NodeInputConsumer {
    type: InputConsumerType.NODE;
    callbackNode: (source_node: AudioNode) => any;
    callbackDisconnect: (source_node: AudioNode) => any;
}

export interface NativeInputConsumer {
    type: InputConsumerType.NATIVE;
}

export type InputConsumer = CallbackInputConsumer | NodeInputConsumer | NativeInputConsumer;


export enum InputState {
    /* Input recording has been paused */
    PAUSED,

    /*
     * Recording has been requested, and is currently initializing.
     * This state may persist, when the audio context hasn't been initialized yet
     */
    INITIALIZING,

    /* we're currently recording the input */
    RECORDING
}

export enum InputStartResult {
    EOK = "eok",
    EUNKNOWN = "eunknown",
    EDEVICEUNKNOWN = "edeviceunknown",
    EBUSY = "ebusy",
    ENOTALLOWED = "enotallowed",
    ENOTSUPPORTED = "enotsupported"
}

export interface InputEvents {
    notify_voice_start: {},
    notify_voice_end: {}
}

export enum FilterMode {
    /**
     * Apply all filters and act according to the output
     */
    Filter,

    /**
     * Bypass all filters and replay the audio
     */
    Bypass,

    /**
     * Block all communication
     */
    Block
}

export interface AbstractInput {
    readonly events: Registry<InputEvents>;

    currentState() : InputState;

    start() : Promise<InputStartResult>;
    stop() : Promise<void>;

    /*
     * Returns true if the input is currently filtered.
     * If the current state isn't recording, than it will return true.
     */
    isFiltered() : boolean;

    getFilterMode() : FilterMode;
    setFilterMode(mode: FilterMode);

    currentDeviceId() : string | undefined;

    /*
     * This method should not throw!
     * If the target device is unknown than it should return EDEVICEUNKNOWN on start.
     * After changing the device, the input state falls to InputState.PAUSED.
     */
    setDeviceId(device: string) : Promise<void>;

    currentConsumer() : InputConsumer | undefined;
    setConsumer(consumer: InputConsumer) : Promise<void>;

    supportsFilter(type: FilterType) : boolean;
    createFilter<T extends FilterType>(type: T, priority: number) : FilterTypeClass<T>;
    removeFilter(filter: Filter);
    /* resetFilter(); */

    getVolume() : number;
    setVolume(volume: number);
}

export interface LevelMeter {
    getDevice() : IDevice;

    setObserver(callback: (value: number) => any);

    destroy();
}