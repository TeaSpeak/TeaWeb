import * as React from "react";
import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler} from "../../../events";
import * as log from "../../../log";
import {LogCategory} from "../../../log";
import {tr} from "../../../i18n/localize";
import ReactDOM = require("react-dom");
import {
    ConversationUIEvents
} from "../../../ui/frames/side/ConversationDefinitions";
import {ConversationPanel} from "./AbstractConversationRenderer";
import {AbstractConversationController} from "./AbstractConversationController";
import {
    ChannelConversation, ChannelConversationEvents,
    ChannelConversationManager,
    ChannelConversationManagerEvents
} from "tc-shared/conversations/ChannelConversationManager";

export class ChannelConversationController extends AbstractConversationController<
    ConversationUIEvents,
    ChannelConversationManager,
    ChannelConversationManagerEvents,
    ChannelConversation,
    ChannelConversationEvents
> {
    readonly connection: ConnectionHandler;
    readonly htmlTag: HTMLDivElement;

    constructor(connection: ConnectionHandler) {
        super(connection.getChannelConversations() as any);
        this.connection = connection;

        this.htmlTag = document.createElement("div");
        this.htmlTag.style.display = "flex";
        this.htmlTag.style.flexDirection = "column";
        this.htmlTag.style.justifyContent = "stretch";
        this.htmlTag.style.height = "100%";

        ReactDOM.render(React.createElement(ConversationPanel, {
            events: this.uiEvents,
            handlerId: this.connection.handlerId,
            noFirstMessageOverlay: false,
            messagesDeletable: true
        }), this.htmlTag);
        /*
        spawnExternalModal("conversation", this.uiEvents, {
            handlerId: this.connection.handlerId,
            noFirstMessageOverlay: false,
            messagesDeletable: true
        }).open().then(() => {
            console.error("Opened");
        });
        */

        this.uiEvents.on("notify_destroy", connection.events().on("notify_visibility_changed", event => {
            if(!event.visible) {
                return;
            }

            this.handlePanelShow();
        }));

        this.uiEvents.register_handler(this, true);
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.htmlTag);
        this.htmlTag.remove();

        this.uiEvents.unregister_handler(this);
        super.destroy();
    }

    @EventHandler<ConversationUIEvents>("action_delete_message")
    private handleMessageDelete(event: ConversationUIEvents["action_delete_message"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to delete a chat message from an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.deleteMessage(event.uniqueId);
    }

    protected registerConversationEvents(conversation: ChannelConversation) {
        super.registerConversationEvents(conversation);
        this.currentSelectedListener.push(conversation.events.on("notify_messages_deleted", event => {
            this.uiEvents.fire_react("notify_chat_message_delete", { messageIds: event.messages, chatId: conversation.getChatId() });
        }));
    }
}