import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {PrivateConversationUIEvents} from "tc-shared/ui/frames/side/PrivateConversationDefinitions";
import {ClientInfoEvents} from "tc-shared/ui/frames/side/ClientInfoDefinitions";
import {SideHeaderEvents} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {ChannelBarUiEvents} from "tc-shared/ui/frames/side/ChannelBarDefinitions";
import {MusicBotUiEvents} from "tc-shared/ui/frames/side/MusicBotDefinitions";
import {MusicPlaylistUiEvents} from "tc-shared/ui/frames/side/MusicPlaylistDefinitions";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";

export type SideBarType = "none" | "server" | "channel" | "private-chat" | "client-info" | "music-manage";
export interface SideBarTypeData {
    "none": {},
    "channel": {
        events: IpcRegistryDescription<ChannelBarUiEvents>
    },
    "private-chat": {
        events: IpcRegistryDescription<PrivateConversationUIEvents>,
        handlerId: string
    },
    "client-info": {
        events: IpcRegistryDescription<ClientInfoEvents>,
    },
    "music-manage": {
        botEvents: IpcRegistryDescription<MusicBotUiEvents>,
        playlistEvents: IpcRegistryDescription<MusicPlaylistUiEvents>
    },
    "server": {
        handlerId: string,
        chatEvents: IpcRegistryDescription<ChannelConversationUiEvents>
    }
}

export type SideBarNotifyContentData<T extends SideBarType> = {
    content: T,
    data: SideBarTypeData[T]
}

export interface SideBarEvents {
    query_content: {},
    query_content_data: { content: SideBarType },

    notify_content: { content: SideBarType },
    notify_content_data: SideBarNotifyContentData<SideBarType>,
}