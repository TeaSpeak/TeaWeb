export type ChannelDescriptionResult = {
    status: "success",
    description: string,
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