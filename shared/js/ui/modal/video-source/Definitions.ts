export type DeviceListResult = {
    status: "success",
    devices: { id: string, displayName: string }[],
    selectedDeviceId: string | undefined,
    fallbackSelectedDeviceName: string | undefined
} | {
    status: "error",
    reason: "no-permissions" | "request-permissions" | "custom"
};

export type VideoPreviewStatus = {
    status: "preview",
    stream: MediaStream /* Attention: This makes this window non popoutable! */
} | {
    status: "error",
    reason: "no-permissions" | "request-permissions" | "custom",
    message?: string
} | {
    status: "none";
};

export type VideoSourceState = {
    type: "none"
} | {
    type: "selected",
    deviceId: string,
    name: string,
} | {
    type: "errored",
    error: string
};

export type SettingFrameRate = {
    min: number,
    max: number,
    original: number,
};

export interface ModalVideoSourceEvents {
    action_cancel: {},
    action_start: {},
    action_request_permissions: {},
    action_select_source: { id: string | undefined },
    action_setting_dimension: { width: number, height: number },
    action_setting_framerate: { frameRate: number },

    query_source: {},
    query_device_list: {},
    query_video_preview: {},
    query_start_button: {},
    query_setting_dimension: {},
    query_setting_framerate: {},

    notify_source: { state: VideoSourceState }
    notify_device_list: { status: DeviceListResult },
    notify_video_preview: { status: VideoPreviewStatus },
    notify_start_button: { enabled: boolean },
    notify_setting_dimension: {
        setting: {
            minWidth: number,
            currentWidth: number,
            originalWidth: number,
            maxWidth: number,

            minHeight: number,
            currentHeight: number,
            originalHeight: number,
            maxHeight: number
        } | undefined
    },
    notify_settings_framerate: {
        frameRate: SettingFrameRate | undefined
    }

    notify_destroy: {}
}
