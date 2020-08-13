import {IDevice} from "tc-shared/audio/recorder";
import {Registry} from "tc-shared/events";
import {Filter, FilterType, FilterTypeClass} from "tc-shared/voice/Filter";

export enum InputConsumerType {
    CALLBACK,
    NODE,
    NATIVE
}

export interface InputConsumer {
    type: InputConsumerType;
}

export interface CallbackInputConsumer extends InputConsumer {
    callback_audio?: (buffer: AudioBuffer) => any;
    callback_buffer?: (buffer: Float32Array, samples: number, channels: number) => any;
}

export interface NodeInputConsumer extends InputConsumer {
    callback_node: (source_node: AudioNode) => any;
    callback_disconnect: (source_node: AudioNode) => any;
}


export enum InputState {
    PAUSED,
    INITIALIZING,
    RECORDING,
    DRY
}

export enum InputStartResult {
    EOK = "eok",
    EUNKNOWN = "eunknown",
    EBUSY = "ebusy",
    ENOTALLOWED = "enotallowed",
    ENOTSUPPORTED = "enotsupported"
}

export interface InputEvents {
    notify_voice_start: {},
    notify_voice_end: {}
}

export interface AbstractInput {
    readonly events: Registry<InputEvents>;

    currentState() : InputState;

    start() : Promise<InputStartResult>;
    stop() : Promise<void>;

    currentDevice() : IDevice | undefined;
    setDevice(device: IDevice | undefined) : Promise<void>;

    currentConsumer() : InputConsumer | undefined;
    setConsumer(consumer: InputConsumer) : Promise<void>;

    supportsFilter(type: FilterType) : boolean;
    createFilter<T extends FilterType>(type: T, priority: number) : FilterTypeClass<T>;

    removeFilter(filter: Filter);
    resetFilter();

    getVolume() : number;
    setVolume(volume: number);
}

export interface LevelMeter {
    device() : IDevice;

    set_observer(callback: (value: number) => any);

    destroy();
}