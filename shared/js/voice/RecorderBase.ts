import {InputDevice} from "../audio/Recorder";
import {Registry} from "../events";
import {Filter, FilterType, FilterTypeClass} from "../voice/Filter";

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
     */
    INITIALIZING,

    /* we're currently recording the input. */
    RECORDING
}

export enum InputStartError {
    EUNKNOWN = "eunknown",
    EDEVICEUNKNOWN = "edeviceunknown",
    EBUSY = "ebusy",
    ENOTALLOWED = "enotallowed",
    ESYSTEMDENIED = "esystemdenied",
    ENOTSUPPORTED = "enotsupported",
    ESYSTEMUNINITIALIZED = "esystemuninitialized"
}

export interface InputEvents {
    notify_state_changed: {
        oldState: InputState,
        newState: InputState
    },

    notify_voice_start: {},
    notify_voice_end: {},

    notify_filter_mode_changed: { oldMode: FilterMode, newMode: FilterMode },
    notify_device_changed: { oldDeviceId: string, newDeviceId: string },
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
    destroy();

    start() : Promise<InputStartError | true>;
    stop() : Promise<void>;

    /*
     * Returns true if the input is currently filtered.
     * If the current state isn't recording, than it will return true.
     */
    isFiltered() : boolean;

    getFilterMode() : FilterMode;
    setFilterMode(mode: FilterMode);

    currentDeviceId() : string | undefined;

    /**
     * This method should not throw!
     * If the target device is unknown, it should return `InputStartError.EDEVICEUNKNOWN` on start.
     * If the device is different than the current device the recorder stops.
     *
     * When the device has been changed the event `notify_device_changed` will be fired.
     */
    setDeviceId(device: string) : Promise<void>;

    currentConsumer() : InputConsumer | undefined;
    setConsumer(consumer: InputConsumer) : Promise<void>;

    supportsFilter(type: FilterType) : boolean;
    createFilter<T extends FilterType>(type: T, priority: number) : FilterTypeClass<T>;
    removeFilter(filter: Filter);

    getVolume() : number;
    setVolume(volume: number);
}

export interface LevelMeter {
    getDevice() : InputDevice;

    setObserver(callback: (value: number) => any);

    destroy();
}