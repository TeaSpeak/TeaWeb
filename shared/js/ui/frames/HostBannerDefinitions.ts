export type HostBannerInfoMode = "original" | "resize-ratio" | "resize";
export type HostBannerInfoSet = {
    mode: HostBannerInfoMode,
    linkUrl: string | undefined,

    imageUrl: string,
    updateInterval: number,
}
export type HostBannerInfo = {
    status: "none"
} | ({
    status: "set",
} & HostBannerInfoSet);

export interface HostBannerUiEvents {
    query_host_banner: {},
    notify_host_banner: {
        banner: HostBannerInfo
    }
}