import {ConversationUIEvents} from "../../../ui/frames/side/ConversationDefinitions";

export type PrivateConversationInfo = {
    nickname: string;
    uniqueId: string;
    clientId: number;

    chatId: string;

    lastMessage: number;
    unreadMessages: boolean;
};

export interface PrivateConversationUIEvents extends ConversationUIEvents {
    action_close_chat: { chatId: string },

    query_private_conversations: {},
    notify_private_conversations: {
        conversations: PrivateConversationInfo[],
        selected: string
    }

    notify_partner_changed: {
        chatId: string,
        clientId: number,
        name: string
    },
    notify_partner_name_changed: {
        chatId: string,
        name: string
    }
}