import {Registry} from "tc-shared/events";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";
import {ChannelDescriptionUiEvents} from "tc-shared/ui/frames/side/ChannelDescriptionDefinitions";

export type ChannelBarMode = "conversation" | "description" | "file-transfer" | "none";

export interface ChannelBarModeData {
    "conversation": {
        events: Registry<ChannelConversationUiEvents>,
    },
    "description": {
        events: Registry<ChannelDescriptionUiEvents>
    },
    "file-transfer": {
        /* TODO! */
    },
    "none": {}
}

export type ChannelBarNotifyModeData<T extends keyof ChannelBarModeData> = {
    content: T,
    data: ChannelBarModeData[T]
}

export interface ChannelBarUiEvents {
    query_mode: {},
    query_channel_id: {},
    query_data: { mode: ChannelBarMode },

    notify_mode: { mode: ChannelBarMode },
    notify_channel_id: {
        channelId: number,
        handlerId: string
    },
    notify_data: ChannelBarNotifyModeData<ChannelBarMode>
}