export interface ChatMessage {
    timestamp: number;
    message: string;

    sender_name: string;
    sender_unique_id: string;
    sender_database_id: number;
}

/* ---------- Chat events ---------- */
export type ChatEvent = { timestamp: number; uniqueId: string; } & (
    ChatEventUnreadTrigger |
    ChatEventMessage |
    ChatEventMessageSendFailed |
    ChatEventLocalUserSwitch |
    ChatEventQueryFailed |
    ChatEventPartnerInstanceChanged |
    ChatEventLocalAction |
    ChatEventPartnerAction |
    ChatEventModeChanged
);

export interface ChatEventUnreadTrigger {
    type: "unread-trigger";
}

export interface ChatEventMessageSendFailed {
    type: "message-failed";

    error: "permission" | "error";
    failedPermission?: string;
    errorMessage?: string;
}

export interface ChatEventMessage {
    type: "message";
    message: ChatMessage;
    isOwnMessage: boolean;
}

export interface ChatEventLocalUserSwitch {
    type: "local-user-switch";
    mode: "join" | "leave";
}

export interface ChatEventQueryFailed {
    type: "query-failed";
    message: string;
}

export interface ChatEventPartnerInstanceChanged {
    type: "partner-instance-changed";

    oldClient: string;
    newClient: string;
}

export interface ChatEventLocalAction {
    type: "local-action";
    action: "disconnect" | "reconnect";
}

export interface ChatEventPartnerAction {
    type: "partner-action";
    action: "disconnect" | "close" | "reconnect";
}

export interface ChatEventModeChanged {
    type: "mode-changed";
    newMode: "normal" | "private" | "none"
}

/* ---------- Chat States ---------- */
export type ChatState = "normal" | "loading" | "no-permissions" | "error" | "unloaded";
export type ChatHistoryState = "none" | "loading" | "available" | "error";

export interface ChatStateNormal {
    state: "normal",

    chatFrameMaxMessageCount: number;
    sendEnabled: boolean;

    unreadTimestamp: number | undefined,
    events: ChatEvent[],

    historyState: ChatHistoryState;
    historyErrorMessage: string,
    historyRetryTimestamp: number,

    showUserSwitchEvents: boolean
}

export interface ChatStateNoPermissions {
    state: "no-permissions",
    failedPermission: string;
}

export interface ChatStateError {
    state: "error";
    errorMessage: string;
}

export interface ChatStateLoading {
    state: "loading";
}

export interface ChatStatePrivate {
    state: "private";
    crossChannelChatSupported: boolean;
}

export type ChatStateData = ChatStateNormal | ChatStateNoPermissions | ChatStateError | ChatStateLoading | ChatStatePrivate;

export interface AbstractConversationUiEvents {
    action_select_chat: { chatId: "unselected" | string },
    action_clear_unread_flag: { chatId: string },
    action_self_typing: { chatId: string },
    action_delete_message: { chatId: string, uniqueId: string },
    action_send_message: { text: string, chatId: string },
    action_jump_to_present: { chatId: string },
    action_focus_chat: {},
    action_popout_chat: {},

    query_selected_chat: {},
    /* will cause a notify_selected_chat */

    query_conversation_state: { chatId: string }, /* will cause a notify_conversation_state */
    notify_conversation_state: { chatId: string } & ChatStateData,

    query_conversation_history: { chatId: string, timestamp: number },
    notify_conversation_history: {
        chatId: string;
        state: "success" | "error";

        errorMessage?: string;
        retryTimestamp?: number;

        events?: ChatEvent[];
        hasMoreMessages?: boolean;
    }

    notify_selected_chat: { chatId: "unselected" | string },
    notify_chat_event: {
        chatId: string,
        triggerUnread: boolean,
        event: ChatEvent
    },
    notify_chat_message_delete: {
        chatId: string,
        messageIds: string[]
    },
    notify_unread_timestamp_changed: {
        chatId: string,
        timestamp: number,
    }
    notify_private_state_changed: {
        chatId: string,
        private: boolean,
    }
    notify_send_enabled: {
        chatId: string,
        enabled: boolean
    }
    notify_partner_typing: { chatId: string },
    notify_destroy: {}
}

export interface ConversationHistoryResponse {
    status: "success" | "error" | "no-permission" | "private" | "unsupported";

    events?: ChatEvent[];
    moreEvents?: boolean;

    nextAllowedQuery?: number;

    errorMessage?: string;
    failedPermission?: string;
}