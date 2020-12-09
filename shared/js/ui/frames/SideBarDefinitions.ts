import {Registry} from "tc-shared/events";
import {PrivateConversationUIEvents} from "tc-shared/ui/frames/side/PrivateConversationDefinitions";
import {ConversationUIEvents} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {ClientInfoEvents} from "tc-shared/ui/frames/side/ClientInfoDefinitions";

/* TODO: Somehow outsource the event registries to IPC? */

export type SideBarType = "none" | "channel-chat" | "private-chat" | "client-info" | "music-manage";
export interface SideBarTypeData {
    "none": {},
    "channel-chat": {
        events: Registry<ConversationUIEvents>,
        handlerId: string
    },
    "private-chat": {
        events: Registry<PrivateConversationUIEvents>,
        handlerId: string
    },
    "client-info": {
        events: Registry<ClientInfoEvents>,
    },
    "music-manage": {

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
    notify_content_data: SideBarNotifyContentData<SideBarType>
}