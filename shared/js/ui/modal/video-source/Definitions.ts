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
}

export interface ModalVideoSourceEvents {
    action_cancel: {},
    action_start: {},
    action_request_permissions: {},
    action_select_source: { id: string },

    query_device_list: {},
    query_video_preview: {},
    query_start_button: {},

    notify_device_list: { status: DeviceListResult },
    notify_video_preview: { status: VideoPreviewStatus },
    notify_start_button: { enabled: boolean },

    notify_destroy: {}
}
