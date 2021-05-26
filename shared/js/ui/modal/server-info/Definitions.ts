import {HostBannerInfo} from "tc-shared/ui/frames/HostBannerDefinitions";
import {ServerConnectionInfoResult} from "tc-shared/tree/ServerDefinitions";

export interface ModalServerInfoVariables {
    readonly name: string,
    readonly region: string,
    readonly slots: { max: number, used: number, reserved: number, queries: number },
    readonly firstRun: number,
    readonly uptime: number,

    readonly ipAddress: string,
    readonly version: string,
    readonly platform: string,
    readonly connectionInfo: ServerConnectionInfoResult | { status: "loading" },

    readonly uniqueId: string,
    readonly channelCount: number,
    readonly voiceDataEncryption: "global-on" | "global-off" | "channel-individual" | "unknown",
    readonly securityLevel: number,
    readonly complainsUntilBan: number,

    readonly hostBanner: HostBannerInfo,

    readonly refreshAllowed: number,
}

export interface ModalServerInfoEvents {
    action_show_bandwidth: {},
    action_refresh: {},
    action_close: {},
}