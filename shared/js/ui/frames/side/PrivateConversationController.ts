import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler} from "../../../events";
import {
    PrivateConversationInfo,
    PrivateConversationUIEvents
} from "../../../ui/frames/side/PrivateConversationDefinitions";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {PrivateConversationsPanel} from "./PrivateConversationRenderer";
import {
    ConversationUIEvents
} from "../../../ui/frames/side/ConversationDefinitions";
import * as log from "../../../log";
import {LogCategory} from "../../../log";
import {AbstractConversationController} from "./AbstractConversationController";
import { tr } from "tc-shared/i18n/localize";
import {
    PrivateConversation,
    PrivateConversationEvents,
    PrivateConversationManager,
    PrivateConversationManagerEvents
} from "tc-shared/conversations/PrivateConversationManager";

export type OutOfViewClient = {
    nickname: string,
    clientId: number,
    uniqueId: string
}

function generateConversationUiInfo(conversation: PrivateConversation) : PrivateConversationInfo {
    const lastMessage = conversation.getPresentMessages().last();
    const lastClientInfo = conversation.getLastClientInfo();
    return {
        nickname: lastClientInfo.nickname,
        uniqueId: lastClientInfo.uniqueId,
        clientId: lastClientInfo.clientId,
        chatId: conversation.clientUniqueId,

        lastMessage: lastMessage ? lastMessage.timestamp : 0,
        unreadMessages: conversation.isUnread()
    };
}

export class PrivateConversationController extends AbstractConversationController<
    PrivateConversationUIEvents,
    PrivateConversationManager,
    PrivateConversationManagerEvents,
    PrivateConversation,
    PrivateConversationEvents
> {
    public readonly htmlTag: HTMLDivElement;
    public readonly connection: ConnectionHandler;

    private listenerConversation: {[key: string]:(() => void)[]};

    constructor(connection: ConnectionHandler) {
        super(connection.getPrivateConversations());
        this.connection = connection;
        this.listenerConversation = {};

        this.htmlTag = document.createElement("div");
        this.htmlTag.style.display = "flex";
        this.htmlTag.style.flexDirection = "row";
        this.htmlTag.style.justifyContent = "stretch";
        this.htmlTag.style.height = "100%";

        this.uiEvents.register_handler(this, true);
        this.uiEvents.enableDebug("private-conversations");

        ReactDOM.render(React.createElement(PrivateConversationsPanel, { events: this.uiEvents, handler: this.connection }), this.htmlTag);

        this.uiEvents.on("notify_destroy", connection.events().on("notify_visibility_changed", event => {
            if(!event.visible)
                return;

            this.handlePanelShow();
        }));

        this.listenerManager.push(this.conversationManager.events.on("notify_conversation_created", event => {
            const conversation = event.conversation;
            const events = this.listenerConversation[conversation.getChatId()] = [];
            events.push(conversation.events.on("notify_partner_changed", event => {
                this.uiEvents.fire_react("notify_partner_changed", { chatId: conversation.getChatId(), clientId: event.clientId, name: event.name });
            }));
            events.push(conversation.events.on("notify_partner_name_changed", event => {
                this.uiEvents.fire_react("notify_partner_name_changed", { chatId: conversation.getChatId(), name: event.name });
            }));
            events.push(conversation.events.on("notify_partner_typing", () => {
                this.uiEvents.fire_react("notify_partner_typing", { chatId: conversation.getChatId() });
            }));
            events.push(conversation.events.on("notify_unread_state_changed", event => {
                this.uiEvents.fire_react("notify_unread_state_changed", { chatId: conversation.getChatId(), unread: event.unread });
            }));

            this.reportConversationList();
        }));
        this.listenerManager.push(this.conversationManager.events.on("notify_conversation_destroyed", event => {
            this.listenerConversation[event.conversation.getChatId()]?.forEach(callback => callback());
            delete this.listenerConversation[event.conversation.getChatId()];

            this.reportConversationList();
        }));
        this.listenerManager.push(this.conversationManager.events.on("notify_selected_changed", () => this.reportConversationList()));
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.htmlTag);
        this.htmlTag.remove();

        this.uiEvents.unregister_handler(this);
        super.destroy();
    }

    focusInput() {
        this.uiEvents.fire_react("action_focus_chat");
    }

    private reportConversationList() {
        this.uiEvents.fire_react("notify_private_conversations", {
            conversations: this.conversationManager.getConversations().map(generateConversationUiInfo),
            selected: this.conversationManager.getSelectedConversation()?.clientUniqueId || "unselected"
        });
    }

    @EventHandler<PrivateConversationUIEvents>("query_private_conversations")
    private handleQueryPrivateConversations() {
        this.reportConversationList();
    }

    @EventHandler<PrivateConversationUIEvents>("action_close_chat")
    private handleConversationClose(event: PrivateConversationUIEvents["action_close_chat"]) {
        const conversation = this.conversationManager.findConversation(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to close a not existing private conversation with id %s"), event.chatId);
            return;
        }

        this.conversationManager.closeConversation(conversation);
    }

    @EventHandler<PrivateConversationUIEvents>("notify_partner_typing")
    private handleNotifySelectChat(event: PrivateConversationUIEvents["notify_partner_typing"]) {
        /* TODO, set active chat? MH 9/12/20: What?? */
    }

    @EventHandler<ConversationUIEvents>("action_self_typing")
    protected handleActionSelfTyping1(_event: ConversationUIEvents["action_self_typing"]) {
        const conversation = this.getCurrentConversation();
        if(!conversation) {
            return;
        }

        const clientId = conversation.currentClientId();
        if(!clientId) {
            return;
        }

        this.connection.serverConnection.send_command("clientchatcomposing", { clid: clientId }).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to send chat composing to server for chat %d: %o"), clientId, error);
        });
    }
}