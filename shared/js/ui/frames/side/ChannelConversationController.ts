import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler} from "tc-events";
import {LogCategory, logError} from "../../../log";
import {tr} from "../../../i18n/localize";
import {AbstractConversationUiEvents} from "./AbstractConversationDefinitions";
import {AbstractConversationController, SelectedConversation} from "./AbstractConversationController";
import {
    ChannelConversation,
    ChannelConversationEvents,
    ChannelConversationManager,
    ChannelConversationManagerEvents
} from "tc-shared/conversations/ChannelConversationManager";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";
import {spawnModalChannelChat} from "tc-shared/ui/modal/channel-chat/Controller";

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

        this.uiEvents.registerHandler(this, true);
        this.uiEvents.on("action_popout_chat", () => {
            const conversation = this.getCurrentConversation();
            if(!conversation) {
                return;
            }

            spawnModalChannelChat(this.connection, conversation);
        });
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
            this.setSelectedConversation("conversation-manager-selected");
        } else {
            this.setConversationManager(undefined);
        }
    }

    setSelectedConversation(conversation: SelectedConversation<ChannelConversation>) {
        super.setSelectedConversation(conversation);
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

    protected registerConversationEvents(conversation: ChannelConversation): (() => void)[] {
        const events = super.registerConversationEvents(conversation);

        events.push(conversation.events.on("notify_messages_deleted", event => {
            this.uiEvents.fire_react("notify_chat_message_delete", { messageIds: event.messages, chatId: conversation.getChatId() });
        }));

        events.push(conversation.events.on("notify_conversation_mode_changed", () => {
            this.reportStateToUI(conversation);
        }));

        return events;
    }
}