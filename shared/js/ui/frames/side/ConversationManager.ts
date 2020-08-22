import * as React from "react";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {EventHandler, Registry} from "tc-shared/events";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {Settings} from "tc-shared/settings";
import {traj} from "tc-shared/i18n/localize";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import ReactDOM = require("react-dom");
import {
    ChatMessage, ConversationHistoryResponse,
    ConversationUIEvents
} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {ConversationPanel} from "tc-shared/ui/frames/side/ConversationUI";
import {AbstractChat, AbstractChatManager, kMaxChatFrameMessageSize} from "./AbstractConversion";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

const kSuccessQueryThrottle = 5 * 1000;
const kErrorQueryThrottle = 30 * 1000;
export class Conversation extends AbstractChat<ConversationUIEvents> {
    private readonly handle: ConversationManager;
    public readonly conversationId: number;

    private conversationVolatile: boolean = false;

    private executingHistoryQueries = false;
    private pendingHistoryQueries: (() => Promise<any>)[] = [];
    public historyQueryResponse: ChatMessage[] = [];

    constructor(handle: ConversationManager, events: Registry<ConversationUIEvents>, id: number) {
        super(handle.connection, id.toString(), events);
        this.handle = handle;
        this.conversationId = id;

        this.lastReadMessage = handle.connection.settings.server(Settings.FN_CHANNEL_CHAT_READ(id), Date.now());
    }

    destroy() { }

    queryHistory(criteria: { begin?: number, end?: number, limit?: number }) : Promise<ConversationHistoryResponse> {
        return new Promise<ConversationHistoryResponse>(resolve => {
            this.pendingHistoryQueries.push(() => {
                this.historyQueryResponse = [];

                const requestObject = {
                    cid: this.conversationId
                } as any;

                if(typeof criteria.begin === "number")
                    requestObject.timestamp_begin = criteria.begin;

                if(typeof criteria.end === "number")
                    requestObject.timestamp_end = criteria.end;

                if(typeof criteria.limit === "number")
                    requestObject.message_count = criteria.limit;

                return this.handle.connection.serverConnection.send_command("conversationhistory", requestObject, { flagset: [ "merge" ], process_result: false }).then(() => {
                    resolve({ status: "success", events: this.historyQueryResponse.map(e => {
                        return {
                            type: "message",
                            message: e,
                            timestamp: e.timestamp,
                            uniqueId: "cm-" + this.conversationId + "-" + e.timestamp + "-" + Date.now(),
                            isOwnMessage: false
                        }
                    }), moreEvents: false, nextAllowedQuery: Date.now() + kSuccessQueryThrottle });
                }).catch(error => {
                    let errorMessage;
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.CONVERSATION_MORE_DATA || error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                            resolve({ status: "success", events: this.historyQueryResponse.map(e => {
                                    return {
                                        type: "message",
                                        message: e,
                                        timestamp: e.timestamp,
                                        uniqueId: "cm-" + this.conversationId + "-" + e.timestamp + "-" + Date.now(),
                                        isOwnMessage: false
                                    }
                                }), moreEvents: error.id === ErrorCode.CONVERSATION_MORE_DATA, nextAllowedQuery: Date.now() + kSuccessQueryThrottle });
                            return;
                        } else if(error.id === ErrorCode.PERMISSION_ERROR) {
                            resolve({
                                status: "no-permission",
                                failedPermission: this.handle.connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon"),
                                nextAllowedQuery: Date.now() + kErrorQueryThrottle
                            });
                            return;
                        } else if(error.id === ErrorCode.CONVERSATION_IS_PRIVATE) {
                            resolve({
                                status: "private",
                                nextAllowedQuery: Date.now() + kErrorQueryThrottle
                            });
                            return;
                        } else if(error.id === ErrorCode.COMMAND_NOT_FOUND) {
                            resolve({
                                status: "unsupported",
                                nextAllowedQuery: Date.now() + kErrorQueryThrottle
                            });
                            return;
                        } else {
                            errorMessage = error.formattedMessage();
                        }
                    } else {
                        log.error(LogCategory.CHAT, tr("Failed to fetch conversation history. %o"), error);
                        errorMessage = tr("lookup the console");
                    }
                    resolve({
                        status: "error",
                        errorMessage: errorMessage,
                        nextAllowedQuery: Date.now() + 5 * 1000
                    });
                });
            });

            this.executeHistoryQuery();
        });
    }

    queryCurrentMessages() {
        this.presentMessages = [];
        this.mode = "loading";

        this.reportStateToUI();
        this.queryHistory({ end: 1, limit: kMaxChatFrameMessageSize }).then(history => {
            this.conversationPrivate = false;
            this.conversationVolatile = false;
            this.failedPermission = undefined;
            this.errorMessage = undefined;
            this.hasHistory = !!history.moreEvents;
            this.presentMessages = history.events?.map(e => Object.assign({ uniqueId: "m-" + this.conversationId + "-" + e.timestamp }, e)) || [];

            switch (history.status) {
                case "error":
                    this.mode = "normal";
                    this.presentEvents.push({
                        type: "query-failed",
                        timestamp: Date.now(),
                        uniqueId: "qf-" + this.conversationId + "-" + Date.now() + "-" + Math.random(),
                        message: history.errorMessage
                    });
                    break;

                case "no-permission":
                    this.mode = "no-permissions";
                    this.failedPermission = history.failedPermission;
                    break;

                case "private":
                    this.conversationPrivate = true;
                    this.mode = "normal";
                    break;

                case "success":
                    this.mode = "normal";
                    break;

                case "unsupported":
                    this.crossChannelChatSupported = false;
                    this.conversationPrivate = true;
                    this.mode = "normal";
                    break;
            }

            /* only update the UI if needed */
            if(this.handle.selectedConversation() === this.conversationId)
                this.reportStateToUI();
        });
    }

    protected canClientAccessChat() {
        return this.conversationId === 0 || this.handle.connection.getClient().currentChannel()?.channelId === this.conversationId;
    }

    private executeHistoryQuery() {
        if(this.executingHistoryQueries || this.pendingHistoryQueries.length === 0)
            return;

        this.executingHistoryQueries = true;
        try {
            const promise = this.pendingHistoryQueries.pop_front()();
            promise
                .catch(error => log.error(LogCategory.CLIENT, tr("Conversation history query task threw an error; this should never happen: %o"), error))
                .then(() => { this.executingHistoryQueries = false; this.executeHistoryQuery(); });
        } catch (e) {
            this.executingHistoryQueries = false;
            throw e;
        }
    }

    public updateIndexFromServer(info: any) {
        if('error_id' in info) {
            /* TODO: Parse error, may be flag private or similar */
            return;
        }

        const timestamp = parseInt(info["timestamp"]);
        if(isNaN(timestamp))
            return;

        if(timestamp > this.lastReadMessage)
            this.setUnreadTimestamp(this.lastReadMessage);
    }

    public handleIncomingMessage(message: ChatMessage, isOwnMessage: boolean) {
        this.registerIncomingMessage(message, isOwnMessage, "m-" + this.conversationId + "-" + message.timestamp + "-" + Math.random());
    }

    public handleDeleteMessages(criteria: { begin: number, end: number, cldbid: number, limit: number }) {
        let limit = { current: criteria.limit };

        this.presentMessages = this.presentMessages.filter(message => {
            if(message.type !== "message")
                return;

            if(message.message.sender_database_id !== criteria.cldbid)
                return true;

            if(criteria.end != 0 && message.timestamp > criteria.end)
                return true;

            if(criteria.begin != 0 && message.timestamp < criteria.begin)
                return true;

            return --limit.current < 0;
        });

        this.events.fire("notify_chat_message_delete", { chatId: this.conversationId.toString(), criteria: criteria });
    }

    public deleteMessage(messageUniqueId: string) {
        const message = this.presentMessages.find(e => e.uniqueId === messageUniqueId);
        if(!message) {
            log.warn(LogCategory.CHAT, tr("Tried to delete an unknown message (id: %s)"), messageUniqueId);
            return;
        }

        if(message.type !== "message")
            return;

        this.handle.connection.serverConnection.send_command("conversationmessagedelete", {
            cid: this.conversationId,
            timestamp_begin: message.timestamp - 1,
            timestamp_end: message.timestamp + 1,
            limit: 1,
            cldbid: message.message.sender_database_id
        }, { process_result: false }).catch(error => {
            log.error(LogCategory.CHAT, tr("Failed to delete conversation message for conversation %d: %o"), this.conversationId, error);
            if(error instanceof CommandResult)
                error = error.extra_message || error.message;

            createErrorModal(tr("Failed to delete message"), traj("Failed to delete conversation message{:br:}Error: {}", error)).open();
        });
    }

    setUnreadTimestamp(timestamp: number | undefined) {
        super.setUnreadTimestamp(timestamp);

        /* we've to update the last read timestamp regardless of if we're having actual unread stuff */
        this.handle.connection.settings.changeServer(Settings.FN_CHANNEL_CHAT_READ(this.conversationId), typeof timestamp === "number" ? timestamp : Date.now());
        this.handle.connection.channelTree.findChannel(this.conversationId)?.setUnread(timestamp !== undefined);
    }

    public localClientSwitchedChannel(type: "join" | "leave") {
        this.presentEvents.push({
            type: "local-user-switch",
            uniqueId: "us-" + this.conversationId + "-" + Date.now() + "-" + Math.random(),
            timestamp: Date.now(),
            mode: type
        });

        if(this.conversationId === this.handle.selectedConversation())
            this.reportStateToUI();
    }

    sendMessage(text: string) {
        this.doSendMessage(text, this.conversationId ? 2 : 3, this.conversationId);
    }
}

export class ConversationManager extends AbstractChatManager<ConversationUIEvents> {
    readonly connection: ConnectionHandler;
    readonly htmlTag: HTMLDivElement;

    private conversations: {[key: number]: Conversation} = {};
    private selectedConversation_: number;

    constructor(connection: ConnectionHandler) {
        super();
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

        this.uiEvents.on("action_select_chat", event => this.selectedConversation_ = parseInt(event.chatId));
        this.uiEvents.on("notify_destroy", connection.events().on("notify_connection_state_changed", event => {
            if(ConnectionState.socketConnected(event.old_state) !== ConnectionState.socketConnected(event.new_state)) {
                this.conversations = {};
                this.setSelectedConversation(-1);
            }
        }));
        this.uiEvents.on("notify_destroy", connection.events().on("notify_visibility_changed", event => {
            if(!event.visible)
                return;

            this.handlePanelShow();
        }));

        connection.events().one("notify_handler_initialized", () => this.uiEvents.on("notify_destroy", connection.getClient().events.on("notify_client_moved", event => {
            this.findOrCreateConversation(event.oldChannel.channelId).localClientSwitchedChannel("leave");
            this.findOrCreateConversation(event.newChannel.channelId).localClientSwitchedChannel("join");
        })));

        this.uiEvents.register_handler(this, true);
        this.uiEvents.on("notify_destroy", connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationhistory", this.handleConversationHistory.bind(this)));
        this.uiEvents.on("notify_destroy", connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationindex", this.handleConversationIndex.bind(this)));
        this.uiEvents.on("notify_destroy", connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationmessagedelete", this.handleConversationMessageDelete.bind(this)));

        this.uiEvents.on("notify_destroy", this.connection.channelTree.events.on("notify_channel_list_received", () => {
            this.queryUnreadFlags();
        }));

        this.uiEvents.on("notify_destroy", this.connection.channelTree.events.on("notify_channel_updated", event => {
            /* TODO private flag! */
        }));
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.htmlTag);
        this.htmlTag.remove();

        this.uiEvents.unregister_handler(this);
        this.uiEvents.fire("notify_destroy");
        this.uiEvents.destroy();
    }

    selectedConversation() {
        return this.selectedConversation_;
    }

    setSelectedConversation(id: number) {
        if(id >= 0)
            this.findOrCreateConversation(id);

        this.uiEvents.fire("notify_selected_chat", { chatId: id.toString() });
    }

    @EventHandler<ConversationUIEvents>("action_select_chat")
    private handleActionSelectChat(event: ConversationUIEvents["action_select_chat"]) {
        this.setSelectedConversation(parseInt(event.chatId));
    }

    findConversation(id: number) : Conversation {
        for(const conversation of Object.values(this.conversations))
            if(conversation.conversationId === id)
                return conversation;
        return undefined;
    }

    protected findChat(id: string): AbstractChat<ConversationUIEvents> {
        return this.findConversation(parseInt(id));
    }

    findOrCreateConversation(id: number) {
        let conversation = this.findConversation(id);
        if(!conversation) {
            conversation = new Conversation(this, this.uiEvents, id);
            this.conversations[id] = conversation;
        }

        return conversation;
    }

    destroyConversation(id: number) {
        delete this.conversations[id];

        if(id === this.selectedConversation_)
            this.uiEvents.fire("action_select_chat", { chatId: "unselected" });
    }

    queryUnreadFlags() {
        /* FIXME: Test for old TeaSpeak servers which don't support this */
        return;

        const commandData = this.connection.channelTree.channels.map(e => { return { cid: e.channelId, cpw: e.cached_password() }});
        this.connection.serverConnection.send_command("conversationfetch", commandData).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to query conversation indexes: %o"), error);
        });
    }

    private handleConversationHistory(command: ServerCommand) {
        const conversation = this.findConversation(parseInt(command.arguments[0]["cid"]));
        if(!conversation) {
            log.warn(LogCategory.NETWORKING, tr("Received conversation history for an unknown conversation: %o"), command.arguments[0]["cid"]);
            return;
        }

        for(const entry of command.arguments) {
            conversation.historyQueryResponse.push({
                timestamp: parseInt(entry["timestamp"]),

                sender_database_id: parseInt(entry["sender_database_id"]),
                sender_unique_id: entry["sender_unique_id"],
                sender_name: entry["sender_name"],

                message: entry["msg"]
            });
        }
    }

    private handleConversationIndex(command: ServerCommand) {
        for(const entry of command.arguments) {
            const conversation = this.findOrCreateConversation(parseInt(entry["cid"]));
            conversation.updateIndexFromServer(entry);
        }
    }

    private handleConversationMessageDelete(command: ServerCommand) {
        const data = command.arguments[0];
        const conversation = this.findConversation(parseInt(data["cid"]));
        if(!conversation)
            return;

        conversation.handleDeleteMessages({
            limit: parseInt(data["limit"]),
            begin: parseInt(data["timestamp_begin"]),
            end: parseInt(data["timestamp_end"]),
            cldbid: parseInt(data["cldbid"])
        })
    }

    @EventHandler<ConversationUIEvents>("action_delete_message")
    private handleMessageDelete(event: ConversationUIEvents["action_delete_message"]) {
        const conversation = this.findConversation(parseInt(event.chatId));
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to delete a chat message from an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.deleteMessage(event.uniqueId);
    }

    @EventHandler<ConversationUIEvents>("query_selected_chat")
    private handleQuerySelectedChat(event: ConversationUIEvents["query_selected_chat"]) {
        this.uiEvents.fire_async("notify_selected_chat", { chatId: isNaN(this.selectedConversation_) ? "unselected" : this.selectedConversation_ + ""})
    }

    @EventHandler<ConversationUIEvents>("notify_selected_chat")
    private handleNotifySelectedChat(event: ConversationUIEvents["notify_selected_chat"]) {
        this.selectedConversation_ = parseInt(event.chatId);
    }

    @EventHandler<ConversationUIEvents>("action_clear_unread_flag")
    protected handleClearUnreadFlag1(event: ConversationUIEvents["action_clear_unread_flag"]) {
        this.connection.channelTree.findChannel(parseInt(event.chatId))?.setUnread(false);
    }
}