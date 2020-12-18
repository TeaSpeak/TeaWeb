export type ChannelDescriptionStatus = {
    status: "success",
    description: string,
    handlerId: string
} | {
    status: "error",
    reason: string
} | {
    status: "no-permissions",
    failedPermission: string
};

export interface ChannelDescriptionUiEvents {
    query_description: {},
    notify_description: {
        status: ChannelDescriptionStatus,
    }
}