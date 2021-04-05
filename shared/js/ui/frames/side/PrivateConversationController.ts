import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler} from "../../../events";
import {
    PrivateConversationInfo,
    PrivateConversationUIEvents
} from "../../../ui/frames/side/PrivateConversationDefinitions";
import {AbstractConversationUiEvents} from "./AbstractConversationDefinitions";
import {LogCategory, logError, logWarn} from "../../../log";
import {AbstractConversationController} from "./AbstractConversationController";
import {tr} from "tc-shared/i18n/localize";
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
    private connection: ConnectionHandler;
    private connectionListener: (() => void)[];

    private listenerConversation: {[key: string]:(() => void)[]};

    constructor() {
        super();
        this.connectionListener = [];
        this.listenerConversation = {};

        this.uiEvents.registerHandler(this, true);
        this.uiEvents.enableDebug("private-conversations");
    }

    destroy() {
        /* listenerConversation will be cleaned up via the listenerManager callbacks */

        this.uiEvents.unregisterHandler(this);
        super.destroy();
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.connection === connection) {
            return;
        }

        this.connectionListener.forEach(callback => callback());
        this.connectionListener = [];

        this.connection = connection;
        if(connection) {
            this.setConversationManager(connection.getPrivateConversations());
        } else {
            this.setConversationManager(undefined);
        }
        this.reportConversationList();
    }

    protected registerConversationManagerEvents(manager: PrivateConversationManager) {
        super.registerConversationManagerEvents(manager);

        this.listenerManager.push(manager.events.on("notify_conversation_created", event => {
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
        this.listenerManager.push(manager.events.on("notify_conversation_destroyed", event => {
            this.listenerConversation[event.conversation.getChatId()]?.forEach(callback => callback());
            delete this.listenerConversation[event.conversation.getChatId()];

            this.reportConversationList();
        }));
        this.listenerManager.push(manager.events.on("notify_selected_changed", () => this.reportConversationList()));
        this.listenerManager.push(() => {
            Object.values(this.listenerConversation).forEach(callbacks => callbacks.forEach(callback => callback()));
            this.listenerConversation = {};
        });
    }

    focusInput() {
        this.uiEvents.fire_react("action_focus_chat");
    }

    private reportConversationList() {
        this.uiEvents.fire_react("notify_private_conversations", {
            conversations: this.conversationManager ? this.conversationManager.getConversations().map(generateConversationUiInfo) : [],
            selected: this.conversationManager?.getSelectedConversation()?.clientUniqueId || "unselected"
        });
    }

    @EventHandler<PrivateConversationUIEvents>("query_private_conversations")
    private handleQueryPrivateConversations() {
        this.reportConversationList();
    }

    @EventHandler<PrivateConversationUIEvents>("action_close_chat")
    private handleConversationClose(event: PrivateConversationUIEvents["action_close_chat"]) {
        const conversation = this.conversationManager?.findConversation(event.chatId);
        if(!conversation) {
            logError(LogCategory.CLIENT, tr("Tried to close a not existing private conversation with id %s"), event.chatId);
            return;
        }

        this.conversationManager.closeConversation(conversation);
    }

    @EventHandler<AbstractConversationUiEvents>("action_self_typing")
    protected handleActionSelfTyping1(_event: AbstractConversationUiEvents["action_self_typing"]) {
        const conversation = this.getCurrentConversation();
        if(!conversation) {
            return;
        }

        const clientId = conversation.currentClientId();
        if(!clientId) {
            return;
        }

        this.connection.serverConnection.send_command("clientchatcomposing", { clid: clientId }).catch(error => {
            logWarn(LogCategory.CHAT, tr("Failed to send chat composing to server for chat %d: %o"), clientId, error);
        });
    }
}