namespace audio {
    export namespace recorder {
        export interface InputDevice {
            unique_id: string;
            name: string;
            default_input: boolean;

            supported: boolean;

            sample_rate: number;
            channels: number;
        }

        export declare function devices() : InputDevice[];

        export declare function device_refresh_available() : boolean;
        export declare function refresh_devices() : Promise<void>;

        export declare function create_input() : AbstractInput;

        export enum InputConsumerType {
            CALLBACK,
            NODE,
            NATIVE
        }

        export interface InputConsumer {
            type: InputConsumerType;
        }

        export interface CallbackInputConsumer extends InputConsumer {
            type: InputConsumerType.CALLBACK;

            callback_audio?: (buffer: AudioBuffer) => any;
            callback_buffer?: (buffer: Float32Array, samples: number, channels: number) => any;
        }

        export interface NodeInputConsumer extends InputConsumer {
            type: InputConsumerType.NODE;

            callback_node: (source_node: AudioNode) => any;
            callback_disconnect: (source_node: AudioNode) => any;
        }


        export namespace filter {
            export enum Type {
                THRESHOLD,
                VOICE_LEVEL,
                STATE
            }

            export interface Filter {
                type: Type;

                is_enabled() : boolean;
            }

            export interface MarginedFilter {
                get_margin_frames() : number;
                set_margin_frames(value: number);
            }

            export interface ThresholdFilter extends Filter, MarginedFilter {
                type: Type.THRESHOLD;

                get_threshold() : number;
                set_threshold(value: number) : Promise<void>;

                callback_level?: (value: number) => any;
            }

            export interface VoiceLevelFilter extends Filter, MarginedFilter {
                type: Type.VOICE_LEVEL;

                get_level() : number;
            }

            export interface StateFilter extends Filter {
                type: Type.STATE;

                set_state(state: boolean) : Promise<void>;
                is_active() : boolean; /* if true the the filter allows data to pass */
            }
        }

        export enum InputState {
            PAUSED,
            INITIALIZING,
            RECORDING,
            DRY
        }

        export abstract class AbstractInput {
            abstract current_state() : InputState;

            abstract start() : Promise<void>;
            abstract stop() : Promise<void>;

            abstract current_device() : InputDevice | undefined;
            abstract set_device(device: InputDevice | undefined) : Promise<void>;

            abstract current_consumer() : InputConsumer | undefined;
            abstract set_consumer(consumer: InputConsumer) : Promise<void>;

            callback_state_change: () => any;
            callback_begin: () => any;
            callback_end: () => any;

            abstract get_filter(type: filter.Type) : filter.Filter | undefined;

            abstract clear_filter();
            abstract disable_filter(type: filter.Type);
            abstract enable_filter(type: filter.Type);

        }
    }
}