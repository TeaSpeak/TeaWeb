import {RemoteIconInfo} from "tc-shared/file/Icons";

export type SideHeaderState = SideHeaderStateNone | SideHeaderStateConversation | SideHeaderStateClient | SideHeaderStateMusicBot;
export type SideHeaderStateNone = {
    state: "none"
};

export type SideHeaderStateConversation = {
    state: "conversation",
    mode: "channel" | "private"
};

export type SideHeaderStateClient = {
    state: "client",
}

export type SideHeaderStateMusicBot = {
    state: "music-bot"
}

export type SideHeaderChannelState = {
    state: "not-connected"
} | {
    state: "connected",
    channelName: string,
    channelIcon: RemoteIconInfo,
    channelUserCount: number,
    channelMaxUser: number | -1
};

export type SideHeaderPingInfo = {
    native: number,
    javaScript: number | undefined
};

export type PrivateConversationInfo = {
    unread: number,
    open: number
};

export interface SideHeaderEvents {
    action_bot_manage: {},
    action_bot_add_song: {},
    action_switch_channel_chat: {},
    action_open_conversation: {},

    query_current_channel_state: { mode: "voice" | "text" },
    query_private_conversations: {},
    query_client_info_own_client: {},
    query_ping: {},

    notify_current_channel_state: {
        mode: "voice" | "text",
        state: SideHeaderChannelState
    },
    notify_ping: {
        ping: SideHeaderPingInfo | undefined
    },
    notify_private_conversations: {
        info: PrivateConversationInfo
    },
    notify_client_info_own_client: {
        isOwnClient: boolean
    }
}