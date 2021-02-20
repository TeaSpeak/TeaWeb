
export type IpcInviteInfoLoaded = {
    linkId: string,

    serverAddress: string,
    serverUniqueId: string,
    serverName: string,

    connectParameters: string,

    channelId?: number,
    channelName?: string,

    expireTimestamp: number | 0
};

export type IpcInviteInfo = (
    {
        status: "success",
    } & IpcInviteInfoLoaded
) | {
    status: "error",
    message: string
} | {
    status: "not-found" | "expired"
}