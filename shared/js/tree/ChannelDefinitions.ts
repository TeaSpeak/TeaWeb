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

/**
 * The invoker info the server sends with all notifies if required
 */
export type InvokerInfo = {
    invokerName: string,
    invokerUniqueId: string,
    invokerId: number,
};