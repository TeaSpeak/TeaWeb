import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler} from "../../../events";
import {LogCategory, logError} from "../../../log";
import {tr} from "../../../i18n/localize";
import {AbstractConversationUiEvents} from "./AbstractConversationDefinitions";
import {AbstractConversationController} from "./AbstractConversationController";
import {
    ChannelConversation,
    ChannelConversationEvents,
    ChannelConversationManager,
    ChannelConversationManagerEvents
} from "tc-shared/conversations/ChannelConversationManager";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";

export class ChannelConversationController extends AbstractConversationController<
    ChannelConversationUiEvents,
    ChannelConversationManager,
    ChannelConversationManagerEvents,
    ChannelConversation,
    ChannelConversationEvents
> {
    private connection: ConnectionHandler;
    private connectionListener: (() => void)[];

    constructor() {
        super();
        this.connectionListener = [];

        /*
        spawnExternalModal("conversation", this.uiEvents, {
            handlerId: this.connection.handlerId,
            noFirstMessageOverlay: false,
            messagesDeletable: true
        }).open().then(() => {
            console.error("Opened");
        });
        */

        this.uiEvents.registerHandler(this, true);
    }

    destroy() {
        this.connectionListener.forEach(callback => callback());
        this.connectionListener = [];

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
            /* FIXME: Update cross channel talk state! */
            this.setConversationManager(connection.getChannelConversations());
        } else {
            this.setConversationManager(undefined);
        }
    }

    @EventHandler<AbstractConversationUiEvents>("action_delete_message")
    private handleMessageDelete(event: AbstractConversationUiEvents["action_delete_message"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        if(!conversation) {
            logError(LogCategory.CLIENT, tr("Tried to delete a chat message from an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.deleteMessage(event.uniqueId);
    }

    protected registerConversationEvents(conversation: ChannelConversation) {
        super.registerConversationEvents(conversation);

        this.currentSelectedListener.push(conversation.events.on("notify_messages_deleted", event => {
            this.uiEvents.fire_react("notify_chat_message_delete", { messageIds: event.messages, chatId: conversation.getChatId() });
        }));

        this.currentSelectedListener.push(conversation.events.on("notify_conversation_mode_changed", () => {
            this.reportStateToUI(conversation);
        }));
    }
}