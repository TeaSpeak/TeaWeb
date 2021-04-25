export type ChannelDescriptionResult = {
    status: "success",
    description: string,

    /* The handler id is required for BBCode renderers */
    handlerId: string
} | {
    status: "empty"
} | {
    status: "no-permissions",
    failedPermission: string
} | {
    status: "error",
    message: string
};