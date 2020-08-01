import * as React from "react";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {EventHandler, Registry} from "tc-shared/events";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {Settings} from "tc-shared/settings";
import {tra, traj} from "tc-shared/i18n/localize";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {helpers} from "tc-shared/ui/frames/side/chat_helper";
import ReactDOM = require("react-dom");
import {
    ChatEvent,
    ChatEventMessage, ChatHistoryState,
    ChatMessage, ConversationHistoryResponse,
    ChatState,
    ConversationUIEvents
} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {ConversationPanel} from "tc-shared/ui/frames/side/ConversationUI";
import {preprocessChatMessageForSend} from "tc-shared/text/chat";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";

const kMaxChatFrameMessageSize = 50; /* max 100 messages, since the server does not support more than 100 messages queried at once */

export abstract class AbstractChat<Events extends ConversationUIEvents> {
    protected readonly connection: ConnectionHandler;
    protected readonly chatId: string;
    protected readonly events: Registry<Events>;
    protected presentMessages: ChatEvent[] = [];
    protected presentEvents: Exclude<ChatEvent, ChatEventMessage>[] = []; /* everything excluding chat messages */

    protected mode: ChatState = "unloaded";
    protected failedPermission: string;
    protected errorMessage: string;

    protected conversationPrivate: boolean = false;
    protected crossChannelChatSupported: boolean = true;

    protected unreadTimestamp: number | undefined = undefined;
    protected lastReadMessage: number = 0;

    protected historyErrorMessage: string;
    protected historyRetryTimestamp: number = 0;
    protected executingUIHistoryQuery = false;

    protected messageSendEnabled: boolean = true;

    protected hasHistory = false;

    protected constructor(connection: ConnectionHandler, chatId: string, events: Registry<Events>) {
        this.connection = connection;
        this.events = events;
        this.chatId = chatId;
    }

    public currentMode() : ChatState { return this.mode; };

    protected registerChatEvent(event: ChatEvent, triggerUnread: boolean) {
        if(event.type === "message") {
            let index = 0;
            while(index < this.presentMessages.length && this.presentMessages[index].timestamp <= event.timestamp)
                index++;

            this.presentMessages.splice(index, 0, event);

            const deleteMessageCount = Math.max(0, this.presentMessages.length - kMaxChatFrameMessageSize);
            this.presentMessages.splice(0, deleteMessageCount);
            if(deleteMessageCount > 0)
                this.hasHistory = true;
            index -= deleteMessageCount;

            if(event.isOwnMessage)
                this.setUnreadTimestamp(undefined);
            else if(!this.unreadTimestamp)
                this.setUnreadTimestamp(event.message.timestamp);

            /* let all other events run before */
            this.events.fire_async("notify_chat_event", {
                chatId: this.chatId,
                triggerUnread: triggerUnread,
                event: event
            });
        } else {
            this.presentEvents.push(event);
            this.presentEvents.sort((a, b) => a.timestamp - b.timestamp);
            /* TODO: Cutoff too old events! */

            this.events.fire("notify_chat_event", {
                chatId: this.chatId,
                triggerUnread: triggerUnread,
                event: event
            });
        }
    }

    protected registerIncomingMessage(message: ChatMessage, isOwnMessage: boolean, uniqueId: string) {
        this.registerChatEvent({
            type: "message",
            isOwnMessage: isOwnMessage,
            uniqueId: uniqueId,
            timestamp: message.timestamp,
            message: message
        }, !isOwnMessage);
    }

    public reportStateToUI() {
        let historyState: ChatHistoryState;
        if(Date.now() < this.historyRetryTimestamp && this.historyErrorMessage) {
            historyState = "error";
        } else if(this.executingUIHistoryQuery) {
            historyState = "loading";
        } else if(this.hasHistory) {
            historyState = "available";
        } else {
            historyState = "none";
        }

        switch (this.mode) {
            case "normal":
                if(this.conversationPrivate && !this.canClientAccessChat()) {
                    this.events.fire_async("notify_conversation_state", {
                        chatId: this.chatId,
                        state: "private",
                        crossChannelChatSupported: this.crossChannelChatSupported
                    });
                    return;
                }

                this.events.fire_async("notify_conversation_state", {
                    chatId: this.chatId,
                    state: "normal",

                    historyState: historyState,
                    historyErrorMessage: this.historyErrorMessage,
                    historyRetryTimestamp: this.historyRetryTimestamp,

                    chatFrameMaxMessageCount: kMaxChatFrameMessageSize,
                    unreadTimestamp: this.unreadTimestamp,

                    showUserSwitchEvents: this.conversationPrivate || !this.crossChannelChatSupported,
                    sendEnabled: this.messageSendEnabled,

                    events: [...this.presentEvents, ...this.presentMessages]
                });
                break;

            case "loading":
            case "unloaded":
                this.events.fire_async("notify_conversation_state", {
                    chatId: this.chatId,
                    state: "loading"
                });
                break;

            case "error":
                this.events.fire_async("notify_conversation_state", {
                    chatId: this.chatId,
                    state: "error",
                    errorMessage: this.errorMessage
                });
                break;

            case "no-permissions":
                this.events.fire_async("notify_conversation_state", {
                    chatId: this.chatId,
                    state: "no-permissions",
                    failedPermission: this.failedPermission
                });
                break;

        }
    }

    protected doSendMessage(message: string, targetMode: number, target: number) : Promise<boolean> {
        let msg = preprocessChatMessageForSend(message);
        return this.connection.serverConnection.send_command("sendtextmessage", {
            targetmode: targetMode,
            cid: target,
            target: target,
            msg: msg
        }, { process_result: false }).then(async () => true).catch(error => {
            if(error instanceof CommandResult) {
                if(error.id === ErrorID.PERMISSION_ERROR) {
                    this.registerChatEvent({
                        type: "message-failed",
                        uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                        timestamp: Date.now(),
                        error: "permission",
                        failedPermission: this.connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknown")
                    }, false);
                } else {
                    this.registerChatEvent({
                        type: "message-failed",
                        uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                        timestamp: Date.now(),
                        error: "error",
                        errorMessage: error.formattedMessage()
                    }, false);
                }
            } else if(typeof error === "string") {
                this.registerChatEvent({
                    type: "message-failed",
                    uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                    timestamp: Date.now(),
                    error: "error",
                    errorMessage: error
                }, false);
            } else {
                log.warn(LogCategory.CHAT, tr("Failed to send channel chat message to %s: %o"), this.chatId, error);
                this.registerChatEvent({
                    type: "message-failed",
                    uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                    timestamp: Date.now(),
                    error: "error",
                    errorMessage: tr("lookup the console")
                }, false);
            }
            return false;
        });
    }

    public isUnread() {
        return this.unreadTimestamp !== undefined;
    }

    public setUnreadTimestamp(timestamp: number | undefined) {
        if(timestamp === undefined)
            this.lastReadMessage = Date.now();

        if(this.unreadTimestamp === timestamp)
            return;

        this.unreadTimestamp = timestamp;
        this.events.fire_async("notify_unread_timestamp_changed", { chatId: this.chatId, timestamp: timestamp });
    }

    public jumpToPresent() {
        this.reportStateToUI();
    }

    public uiQueryHistory(timestamp: number, enforce?: boolean) {
        if(this.executingUIHistoryQuery && !enforce)
            return;

        this.executingUIHistoryQuery = true;
        this.queryHistory({ end: 1, begin: timestamp, limit: kMaxChatFrameMessageSize }).then(result => {
            this.executingUIHistoryQuery = false;
            this.historyErrorMessage = undefined;
            this.historyRetryTimestamp = result.nextAllowedQuery;

            switch (result.status) {
                case "success":
                    this.events.fire_async("notify_conversation_history", {
                        chatId: this.chatId,
                        state: "success",

                        hasMoreMessages: result.moreEvents,
                        retryTimestamp: this.historyRetryTimestamp,

                        events: result.events
                    });
                    break;

                case "private":
                    this.events.fire_async("notify_conversation_history", {
                        chatId: this.chatId,
                        state: "error",
                        errorMessage: this.historyErrorMessage = tr("chat is private"),
                        retryTimestamp: this.historyRetryTimestamp
                    });
                    break;

                case "no-permission":
                    this.events.fire_async("notify_conversation_history", {
                        chatId: this.chatId,
                        state: "error",
                        errorMessage: this.historyErrorMessage = tra("failed on {}", result.failedPermission || tr("unknown permission")),
                        retryTimestamp: this.historyRetryTimestamp
                    });
                    break;

                case "error":
                    this.events.fire_async("notify_conversation_history", {
                        chatId: this.chatId,
                        state: "error",
                        errorMessage: this.historyErrorMessage = result.errorMessage,
                        retryTimestamp: this.historyRetryTimestamp
                    });
                    break;
            }
        });
    }

    protected lastEvent() : ChatEvent | undefined {
        if(this.presentMessages.length === 0)
            return this.presentEvents.last();
        else if(this.presentEvents.length === 0 || this.presentMessages.last().timestamp > this.presentEvents.last().timestamp)
            return this.presentMessages.last();
        else
            return this.presentEvents.last();
    }

    protected sendMessageSendingEnabled(enabled: boolean) {
        if(this.messageSendEnabled === enabled)
            return;

        this.messageSendEnabled = enabled;
        this.events.fire("notify_send_enabled", { chatId: this.chatId, enabled: enabled });
    }

    protected abstract canClientAccessChat() : boolean;
    public abstract queryHistory(criteria: { begin?: number, end?: number, limit?: number }) : Promise<ConversationHistoryResponse>;
    public abstract queryCurrentMessages();
    public abstract sendMessage(text: string);
}

export abstract class AbstractChatManager<Events extends ConversationUIEvents> {
    protected readonly uiEvents: Registry<Events>;

    protected constructor() {
        this.uiEvents = new Registry<Events>();
    }

    handlePanelShow() {
        this.uiEvents.fire("notify_panel_show");
    }

    protected abstract findChat(id: string) : AbstractChat<Events>;

    @EventHandler<ConversationUIEvents>("query_conversation_state")
    protected handleQueryConversationState(event: ConversationUIEvents["query_conversation_state"]) {
        const conversation = this.findChat(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_async("notify_conversation_state", {
                state: "error",
                errorMessage: tr("Unknown conversation"),

                chatId: event.chatId
            });
            return;
        }

        if(conversation.currentMode() === "unloaded")
            conversation.queryCurrentMessages();
        else
            conversation.reportStateToUI();
    }

    @EventHandler<ConversationUIEvents>("query_conversation_history")
    protected handleQueryHistory(event: ConversationUIEvents["query_conversation_history"]) {
        const conversation = this.findChat(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_async("notify_conversation_history", {
                state: "error",
                errorMessage: tr("Unknown conversation"),
                retryTimestamp: Date.now() + 10 * 1000,

                chatId: event.chatId
            });

            log.error(LogCategory.CLIENT, tr("Tried to query history for an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.uiQueryHistory(event.timestamp);
    }

    @EventHandler<ConversationUIEvents>("action_clear_unread_flag")
    protected handleClearUnreadFlag(event: ConversationUIEvents["action_clear_unread_flag"]) {
        this.findChat(event.chatId)?.setUnreadTimestamp(undefined);
    }

    @EventHandler<ConversationUIEvents>("action_self_typing")
    protected handleActionSelfTyping(event: ConversationUIEvents["action_self_typing"]) {
        if(this.findChat(event.chatId)?.isUnread())
            this.uiEvents.fire("action_clear_unread_flag", { chatId: event.chatId });
    }

    @EventHandler<ConversationUIEvents>("action_send_message")
    protected handleSendMessage(event: ConversationUIEvents["action_send_message"]) {
        const conversation = this.findChat(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to send a chat message to an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.sendMessage(event.text);
    }

    @EventHandler<ConversationUIEvents>("action_jump_to_present")
    protected handleJumpToPresent(event: ConversationUIEvents["action_jump_to_present"]) {
        const conversation = this.findChat(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to jump to present for an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.jumpToPresent();
    }
}

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
                        if(error.id === ErrorID.CONVERSATION_MORE_DATA || error.id === ErrorID.EMPTY_RESULT) {
                            resolve({ status: "success", events: this.historyQueryResponse.map(e => {
                                    return {
                                        type: "message",
                                        message: e,
                                        timestamp: e.timestamp,
                                        uniqueId: "cm-" + this.conversationId + "-" + e.timestamp + "-" + Date.now(),
                                        isOwnMessage: false
                                    }
                                }), moreEvents: error.id === ErrorID.CONVERSATION_MORE_DATA, nextAllowedQuery: Date.now() + kSuccessQueryThrottle });
                            return;
                        } else if(error.id === ErrorID.PERMISSION_ERROR) {
                            resolve({
                                status: "no-permission",
                                failedPermission: this.handle.connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon"),
                                nextAllowedQuery: Date.now() + kErrorQueryThrottle
                            });
                            return;
                        } else if(error.id === ErrorID.CONVERSATION_IS_PRIVATE) {
                            resolve({
                                status: "private",
                                nextAllowedQuery: Date.now() + kErrorQueryThrottle
                            });
                            return;
                        } else if(error.id === ErrorID.COMMAND_NOT_FOUND) {
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