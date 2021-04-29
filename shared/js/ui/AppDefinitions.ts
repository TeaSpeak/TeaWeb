import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {ChannelVideoEvents} from "tc-shared/ui/frames/video/Definitions";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {ConnectionListUIEvents} from "tc-shared/ui/frames/connection-handler-list/Definitions";
import {SideBarEvents} from "tc-shared/ui/frames/SideBarDefinitions";
import {SideHeaderEvents} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {ServerEventLogUiEvents} from "tc-shared/ui/frames/log/Definitions";
import {HostBannerUiEvents} from "tc-shared/ui/frames/HostBannerDefinitions";

export interface AppUiVariables {
    readonly channelTree: {
        events: IpcRegistryDescription<ChannelTreeUIEvents> | undefined,
        handlerId: string
    },
    readonly channelVideo: {
        events: IpcRegistryDescription<ChannelVideoEvents>,
        handlerId: string
    },
    readonly controlBar: IpcRegistryDescription<ControlBarEvents>,
    readonly connectionList: IpcRegistryDescription<ConnectionListUIEvents>,
    readonly sidebar: IpcRegistryDescription<SideBarEvents>,
    readonly sidebarHeader: IpcRegistryDescription<SideHeaderEvents>,
    readonly log: IpcRegistryDescription<ServerEventLogUiEvents>,
    readonly hostBanner: IpcRegistryDescription<HostBannerUiEvents>,
}

export interface AppUiEvents {
    query_channel_tree: {},
    query_video: {},

    notify_channel_tree: {
        events: Registry<ChannelTreeUIEvents> | undefined,
        handlerId: string
    },
    notify_video: {
        events: Registry<ChannelVideoEvents> | undefined,
        handlerId: string
    }
}