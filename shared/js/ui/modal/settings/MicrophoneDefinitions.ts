import {DeviceListState} from "tc-shared/audio/Recorder";

export type MicrophoneSetting =
    "volume"
    | "vad-type"
    | "ppt-key"
    | "ppt-release-delay"
    | "ppt-release-delay-active"
    | "threshold-threshold"
    | "rnnoise";

export type MicrophoneDevice = {
    id: string,
    name: string,
    driver: string,
    default: boolean
};

export type SelectedMicrophone = { type: "default" } | { type: "none" } | { type: "device", deviceId: string };
export type MicrophoneDevices = {
    status: "error",
    error: string
} | {
    status: "audio-not-initialized"
} | {
    status: "no-permissions",
    shouldAsk: boolean
} | {
    status: "success",
    devices: MicrophoneDevice[]
    selectedDevice: SelectedMicrophone;
};

export type InputDeviceLevel = {
    status: "success",
    level: number
} | {
    status: "uninitialized"
} | {
    status: "error",
    message: string
}

export interface MicrophoneSettingsEvents {
    "query_devices": { refresh_list: boolean },
    "query_help": {},
    "query_setting": {
        setting: MicrophoneSetting
    },
    "query_input_level": {}

    "action_help_click": {},
    "action_request_permissions": {},
    "action_set_selected_device": { target: SelectedMicrophone },
    "action_set_selected_device_result": {
        status: "error",
        reason: string
    },
    "action_open_processor_properties": {},

    "action_set_setting": {
        setting: MicrophoneSetting;
        value: any;
    },

    notify_setting: {
        setting: MicrophoneSetting;
        value: any;
    }

    notify_devices: MicrophoneDevices,
    notify_device_selected: { device: SelectedMicrophone },

    notify_device_level: {
        level: {
            [key: string]: {
                deviceId: string,
                status: "success" | "error",

                level?: number,
                error?: string
            }
        },

        status: Exclude<DeviceListState, "error">
    },
    notify_input_level: {
        level: InputDeviceLevel
    },

    notify_highlight: {
        field: "hs-0" | "hs-1" | "hs-2" | undefined
    }

    notify_destroy: {}
}