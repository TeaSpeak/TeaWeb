declare namespace native {
    function client_version(): Promise<string>;
}
declare namespace forum {
    interface UserData {
        session_id: string;
        username: string;
        application_data: string;
        application_data_sign: string;
    }
}
declare namespace audio.player {
    interface Device {
        device_id: string;
        name: string;
    }
    function initialized(): boolean;
    function context(): AudioContext;
    function destination(): AudioNode;
    function on_ready(cb: () => any): void;
    function initialize(): boolean;
    function available_devices(): Promise<Device[]>;
    function set_device(device_id?: string): Promise<void>;
    function current_device(device_id?: string): Device;
}
declare function getUserMediaFunction(): (settings: any, success: any, fail: any) => void;
