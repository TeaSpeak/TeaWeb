declare namespace audio {
    export namespace player {
        export function initialize() : boolean;
        export function initialized() : boolean;

        export function context() : AudioContext;
        export function get_master_volume() : number;
        export function set_master_volume(volume: number);

        export function destination() : AudioNode;

        export function on_ready(cb: () => any);

        export function available_devices() : Promise<Device[]>;
        export function set_device(device_id: string) : Promise<void>;

        export function current_device() : Device;

        export function initializeFromGesture();
    }

    export namespace recorder {
        export function devices() : InputDevice[];

        export function device_refresh_available() : boolean;
        export function refresh_devices() : Promise<void>;

        export function create_input() : AbstractInput;
        export function create_levelmeter(device: InputDevice) : Promise<LevelMeter>;
    }
}