import * as React from "react";
import {ConversationPanel} from "tc-shared/ui/frames/side/Conversations";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {EventHandler, Registry} from "tc-shared/events";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {Settings} from "tc-shared/settings";
import ReactDOM = require("react-dom");
import {traj} from "tc-shared/i18n/localize";
import {createErrorModal} from "tc-shared/ui/elements/Modal";

export type ChatEvent = { timestamp: number; uniqueId: string; } & (ChatEventMessage | ChatEventMessageSendFailed);

export interface ChatMessage {
    timestamp: number;
    message: string;

    sender_name: string;
    sender_unique_id: string;
    sender_database_id: number;
}

export interface ChatEventMessage {
    type: "message";
    message: ChatMessage;
}

export interface ChatEventMessageSendFailed {
    type: "message-failed";

    error: "permission" | "error";
    failedPermission?: string;
    errorMessage?: string;
}

export interface ConversationUIEvents {
    action_select_conversation: { chatId: number },
    action_clear_unread_flag: { chatId: number },
    action_delete_message: { chatId: number, uniqueId: string },
    action_send_message: { text: string, chatId: number },

    query_conversation_state: { chatId: number }, /* will cause a notify_conversation_state */
    notify_conversation_state: {
        id: number,

        mode: "normal" | "no-permissions" | "error" | "loading" | "private",
        failedPermission?: string,
        errorMessage?: string;

        unreadTimestamp: number | undefined,
        events: ChatEvent[],

        haveOlderMessages: boolean,
        conversationPrivate: boolean
    },

    notify_panel_show: {},
    notify_local_client_channel: {
        channelId: number
    },
    notify_chat_event: {
        conversation: number,
        triggerUnread: boolean,
        event: ChatEvent
    },
    notify_chat_message_delete: {
        conversation: number,
        criteria: { begin: number, end: number, cldbid: number, limit: number }
    },
    notify_server_state: {
        state: "disconnected" | "connected",
        crossChannelChatSupport?: boolean
    },
    notify_unread_timestamp_changed: {
        conversation: number,
        timestamp: number | undefined
    }
    notify_channel_private_state_changed: {
        id: number,
        private: boolean
    }

    notify_destroy: {}
}

export interface ConversationHistoryResponse {
    status: "success" | "error" | "no-permission" | "private";

    messages?: ChatMessage[];
    moreMessages?: boolean;

    errorMessage?: string;
    failedPermission?: string;
}

export type ConversationMode = "normal" | "loading" | "no-permissions" | "error" | "unloaded";
export class Conversation {
    private readonly handle: ConversationManager;
    private readonly events: Registry<ConversationUIEvents>;
    public readonly conversationId: number;

    private mode: ConversationMode = "unloaded";
    private failedPermission: string;
    private errorMessage: string;

    public presentMessages: ({ uniqueId: string } & ChatMessage)[] = [];
    public presentEvents: Exclude<ChatEvent, ChatEventMessage>[] = []; /* everything excluding chat messages */

    private unreadTimestamp: number | undefined = undefined;
    private lastReadMessage: number = 0;

    private conversationPrivate: boolean = false;
    private conversationVolatile: boolean = false;

    private queryingHistory = false;
    private pendingHistoryQueries: (() => Promise<any>)[] = [];
    public historyQueryResponse: ChatMessage[] = [];

    constructor(handle: ConversationManager, events: Registry<ConversationUIEvents>, id: number) {
        this.handle = handle;
        this.conversationId = id;
        this.events = events;

        this.lastReadMessage = handle.connection.settings.server(Settings.FN_CHANNEL_CHAT_READ(id), Date.now());
    }

    destroy() { }

    currentMode() : ConversationMode { return this.mode; }

    queryHistory(criteria: { begin?: number, end?: number, limit?: number }) : Promise<ConversationHistoryResponse> {
        return new Promise<ConversationHistoryResponse>(resolve => {
            this.pendingHistoryQueries.push(() => {
                this.historyQueryResponse = [];

                return this.handle.connection.serverConnection.send_command("conversationhistory", {
                    cid: this.conversationId,
                    timestamp_begin: criteria.begin,
                    message_count: criteria.limit,
                    timestamp_end: criteria.end
                }, { flagset: [ "merge" ], process_result: false }).then(() => {
                    resolve({ status: "success", messages: this.historyQueryResponse, moreMessages: false });
                }).catch(error => {
                    let errorMessage;
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorID.CONVERSATION_MORE_DATA || error.id === ErrorID.EMPTY_RESULT) {
                            resolve({ status: "success", messages: this.historyQueryResponse, moreMessages: error.id === ErrorID.CONVERSATION_MORE_DATA });
                            return;
                        } else if(error.id === ErrorID.PERMISSION_ERROR) {
                            resolve({
                                status: "no-permission",
                                failedPermission: this.handle.connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon")
                            });
                            return;
                        } else if(error.id === ErrorID.CONVERSATION_IS_PRIVATE) {
                            resolve({
                                status: "private"
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
                        errorMessage: errorMessage
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
        this.queryHistory({ end: 1, limit: 50 }).then(history => {
            this.conversationPrivate = false;
            this.conversationVolatile = false;
            this.failedPermission = undefined;
            this.errorMessage = undefined;
            this.presentMessages = history.messages?.map(e => Object.assign({ uniqueId: "m-" + e.timestamp }, e)) || [];

            switch (history.status) {
                case "error":
                    this.mode = "error";
                    this.errorMessage = history.errorMessage;
                    break;

                case "no-permission":
                    this.mode = "no-permissions";
                    this.failedPermission = history.failedPermission;
                    break;

                case "private":
                    this.mode = "normal";
                    break;

                case "success":
                    this.mode = "normal";
                    break;
            }

            /* only update the UI if needed */
            if(this.handle.selectedConversation() === this.conversationId)
                this.reportStateToUI();
        });
    }

    private executeHistoryQuery() {
        if(this.queryingHistory)
            return;

        this.queryingHistory = true;
        try {
            const promise = this.pendingHistoryQueries.pop_front()();
            promise
                .catch(error => log.error(LogCategory.CLIENT, tr("Conversation history query task threw an error; this should never happen: %o"), error))
                .then(() => this.executeHistoryQuery());
        } catch (e) {
            this.queryingHistory = false;
            throw e;
        }
    }

    public updateIndexFromServer(info: any) {
        if('error_id' in info) {
            /* FIXME: Parse error, may be flag private or similar */
            return;
        }

        const timestamp = parseInt(info["timestamp"]);
        if(isNaN(timestamp))
            return;

        if(timestamp > this.lastReadMessage) {
            this.setUnreadTimestamp(this.lastReadMessage);

            /* TODO: Move the whole last read part to the channel entry itself? */
            this.handle.connection.channelTree.findChannel(this.conversationId)?.setUnread(true);
        }
    }

    public handleIncomingMessage(message: ChatMessage, triggerUnread: boolean) {
        let index = 0;
        while(index < this.presentMessages.length && this.presentMessages[index].timestamp <= message.timestamp)
            index++;

        console.log("Insert at: %d", index);
        this.presentMessages.splice(index, 0, Object.assign({ uniqueId: "m-" + message.timestamp }, message));
        if(triggerUnread && !this.unreadTimestamp)
            this.unreadTimestamp = message.timestamp;

        const uMessage = this.presentMessages[index];
        this.events.fire("notify_chat_event", {
            conversation: this.conversationId,
            triggerUnread: triggerUnread,
            event: {
                type: "message",
                timestamp: message.timestamp,
                message: message,
                uniqueId: uMessage.uniqueId
            }
        });
    }

    public handleDeleteMessages(criteria: { begin: number, end: number, cldbid: number, limit: number }) {
        let limit = { current: criteria.limit };

        this.presentMessages = this.presentMessages.filter(message => {
            if(message.sender_database_id !== criteria.cldbid)
                return true;

            if(criteria.end != 0 && message.timestamp > criteria.end)
                return true;

            if(criteria.begin != 0 && message.timestamp < criteria.begin)
                return true;

            return --limit.current < 0;
        });

        this.events.fire("notify_chat_message_delete", { conversation: this.conversationId, criteria: criteria });
    }

    public sendMessage(message: string) {
        this.handle.connection.serverConnection.send_command("sendtextmessage", {
            targetmode: this.conversationId == 0 ? 3 : 2,
            cid: this.conversationId,
            msg: message
        }, { process_result: false }).catch(error => {
            this.presentEvents.push({
                type: "message-failed",
                uniqueId: "msf-" + Date.now(),
                timestamp: Date.now(),
                error: "error",
                errorMessage: tr("Unknown error TODO!") /* TODO! */
            });

            this.events.fire_async("notify_chat_event", {
                conversation: this.conversationId,
                triggerUnread: false,
                event: this.presentEvents.last()
            });
        });
    }

    public deleteMessage(messageUniqueId: string) {
        const message = this.presentMessages.find(e => e.uniqueId === messageUniqueId);
        if(!message) {
            log.warn(LogCategory.CHAT, tr("Tried to delete an unknown message (id: %s)"), messageUniqueId);
            return;
        }

        this.handle.connection.serverConnection.send_command("conversationmessagedelete", {
            cid: this.conversationId,
            timestamp_begin: message.timestamp - 1,
            timestamp_end: message.timestamp + 1,
            limit: 1,
            cldbid: message.sender_database_id
        }, { process_result: false }).catch(error => {
            log.error(LogCategory.CHAT, tr("Failed to delete conversation message for conversation %d: %o"), this.conversationId, error);
            if(error instanceof CommandResult)
                error = error.extra_message || error.message;

            createErrorModal(tr("Failed to delete message"), traj("Failed to delete conversation message{:br:}Error: {}", error)).open();
        });
    }

    public reportStateToUI() {
        this.events.fire_async("notify_conversation_state", {
            id: this.conversationId,
            mode: this.mode === "unloaded" ? "loading" : this.mode,
            unreadTimestamp: this.unreadTimestamp,
            haveOlderMessages: false,
            failedPermission: this.failedPermission,
            conversationPrivate: this.conversationPrivate,

            events: [...this.presentEvents, ...this.presentMessages.map(e => {
                return {
                    timestamp: e.timestamp,
                    uniqueId: "m-" + e.timestamp,
                    type: "message",
                    message: e
                } as ChatEvent;
            })]
        });
    }

    public setUnreadTimestamp(timestamp: number | undefined) {
        if(this.unreadTimestamp === timestamp)
            return;

        this.unreadTimestamp = timestamp;
        this.handle.connection.settings.changeServer(Settings.FN_CHANNEL_CHAT_READ(this.conversationId), typeof timestamp === "number" ? timestamp : Date.now());
        this.events.fire_async("notify_unread_timestamp_changed", { conversation: this.conversationId, timestamp: timestamp });
    }
}

export class ConversationManager {
    readonly connection: ConnectionHandler;
    readonly htmlTag: HTMLDivElement;

    private readonly uiEvents: Registry<ConversationUIEvents>;

    private conversations: {[key: number]: Conversation} = {};
    private selectedConversation_: number;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.uiEvents = new Registry<ConversationUIEvents>();

        this.htmlTag = document.createElement("div");
        this.htmlTag.style.display = "flex";
        this.htmlTag.style.flexDirection = "column";
        this.htmlTag.style.justifyContent = "stretch";
        this.htmlTag.style.height = "100%";

        ReactDOM.render(React.createElement(ConversationPanel, { events: this.uiEvents, handler: this.connection }), this.htmlTag);

        this.uiEvents.on("action_select_conversation", event => this.selectedConversation_ = event.chatId);
        this.uiEvents.on("notify_destroy", connection.events().on("notify_connection_state_changed", event => {
            if(ConnectionState.socketConnected(event.old_state) !== ConnectionState.socketConnected(event.new_state)) {
                this.conversations = {};
                this.setSelectedConversation(-1);
            }
            this.uiEvents.fire("notify_server_state", { crossChannelChatSupport: false, state: connection.connected ? "connected" : "disconnected" });
        }));

        this.uiEvents.register_handler(this);
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
        this.uiEvents.unregister_handler(this);
        this.uiEvents.fire("notify_destroy");
        this.uiEvents.destroy();
    }

    selectedConversation() {
        return this.selectedConversation_;
    }

    setSelectedConversation(id: number) {
        this.findOrCreateConversation(id);

        this.uiEvents.fire("action_select_conversation", { chatId: id });
    }

    findConversation(id: number) : Conversation {
        for(const conversation of Object.values(this.conversations))
            if(conversation.conversationId === id)
                return conversation;
        return undefined;
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

        if(id === this.selectedConversation_) {
            this.uiEvents.fire("action_select_conversation", { chatId: -1 });
            this.selectedConversation_ = -1;
        }
    }

    queryUnreadFlags() {
        /* FIXME: Test for old TeaSpeak servers which don't support this */
        const commandData = this.connection.channelTree.channels.map(e => { return { cid: e.channelId, cpw: e.cached_password() }});
        this.connection.serverConnection.send_command("conversationfetch", commandData).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to query conversation indexes: %o"), error);
        });
    }

    handlePanelShow() {
        this.uiEvents.fire("notify_panel_show");
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

    @EventHandler<ConversationUIEvents>("query_conversation_state")
    private handleQueryConversationState(event: ConversationUIEvents["query_conversation_state"]) {
        const conversation = this.findConversation(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_async("notify_conversation_state", {
                mode: "error",
                errorMessage: tr("Unknown conversation"),

                id: event.chatId,

                events: [],
                conversationPrivate: false,
                haveOlderMessages: false,
                unreadTimestamp: undefined
            });
            return;
        }

        if(conversation.currentMode() === "unloaded")
            conversation.queryCurrentMessages();
        else
            conversation.reportStateToUI();
    }

    @EventHandler<ConversationUIEvents>("action_clear_unread_flag")
    private handleClearUnreadFlag(event: ConversationUIEvents["action_clear_unread_flag"]) {
        this.connection.channelTree.findChannel(event.chatId)?.setUnread(false);
        this.findConversation(event.chatId)?.setUnreadTimestamp(undefined);
    }

    @EventHandler<ConversationUIEvents>("action_send_message")
    private handleSendMessage(event: ConversationUIEvents["action_send_message"]) {
        const conversation = this.findConversation(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to send a chat message to an unknown conversation with id %d"), event.chatId);
            return;
        }

        conversation.sendMessage(event.text);
    }

    @EventHandler<ConversationUIEvents>("action_delete_message")
    private handleMessageDelete(event: ConversationUIEvents["action_delete_message"]) {
        const conversation = this.findConversation(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to delete a chat message from an unknown conversation with id %d"), event.chatId);
            return;
        }

        conversation.deleteMessage(event.uniqueId);
    }
}