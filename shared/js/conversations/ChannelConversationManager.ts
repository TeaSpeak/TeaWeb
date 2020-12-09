import {
    AbstractChat,
    AbstractConversationEvents,
    AbstractChatManager,
    AbstractChatManagerEvents,
    kMaxChatFrameMessageSize
} from "./AbstractConversion";
import {ChatMessage, ConversationHistoryResponse} from "../ui/frames/side/AbstractConversationDefinitions";
import {Settings} from "tc-shared/settings";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {traj} from "tc-shared/i18n/localize";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {LocalClientEntry} from "tc-shared/tree/Client";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {ChannelConversationMode} from "tc-shared/tree/Channel";

export interface ChannelConversationEvents extends AbstractConversationEvents {
    notify_messages_deleted: { messages: string[] },
    notify_messages_loaded: {}
}

const kSuccessQueryThrottle = 5 * 1000;
const kErrorQueryThrottle = 30 * 1000;
export class ChannelConversation extends AbstractChat<ChannelConversationEvents> {
    private readonly handle: ChannelConversationManager;
    public readonly conversationId: number;

    private conversationVolatile: boolean = false;
    private preventUnreadUpdate = false;

    private executingHistoryQueries = false;
    private pendingHistoryQueries: (() => Promise<any>)[] = [];
    public historyQueryResponse: ChatMessage[] = [];

    constructor(handle: ChannelConversationManager, id: number) {
        super(handle.connection, id.toString());
        this.handle = handle;
        this.conversationId = id;

        this.preventUnreadUpdate = true;
        const unreadTimestamp = handle.connection.settings.server(Settings.FN_CHANNEL_CHAT_READ(id), Date.now());
        this.setUnreadTimestamp(unreadTimestamp);
        this.preventUnreadUpdate = false;

        this.events.on(["notify_unread_state_changed", "notify_read_state_changed"], event => {
            this.handle.connection.channelTree.findChannel(this.conversationId)?.setUnread(this.isReadable() && this.isUnread());
        });
    }

    destroy() {
        super.destroy();
    }

    queryHistory(criteria: { begin?: number, end?: number, limit?: number }) : Promise<ConversationHistoryResponse> {
        return new Promise<ConversationHistoryResponse>(resolve => {
            this.pendingHistoryQueries.push(() => {
                this.historyQueryResponse = [];

                const requestObject = {
                    cid: this.conversationId
                } as any;

                if(typeof criteria.begin === "number") {
                    requestObject.timestamp_begin = criteria.begin;
                }

                if(typeof criteria.end === "number") {
                    requestObject.timestamp_end = criteria.end;
                }

                if(typeof criteria.limit === "number") {
                    requestObject.message_count = criteria.limit;
                }

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
                        logError(LogCategory.CHAT, tr("Failed to fetch conversation history. %o"), error);
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
        this.setCurrentMode("loading");

        this.queryHistory({ end: 1, limit: kMaxChatFrameMessageSize }).then(history => {
            this.conversationVolatile = false;
            this.failedPermission = undefined;
            this.errorMessage = undefined;
            this.setHistory(!!history.moreEvents);
            this.presentMessages = history.events?.map(e => Object.assign({ uniqueId: "m-" + this.conversationId + "-" + e.timestamp }, e)) || [];

            switch (history.status) {
                case "error":
                    this.setCurrentMode("normal");
                    this.registerChatEvent({
                        type: "query-failed",
                        timestamp: Date.now(),
                        uniqueId: "qf-" + this.conversationId + "-" + Date.now() + "-" + Math.random(),
                        message: history.errorMessage
                    }, false);
                    break;

                case "no-permission":
                    this.setCurrentMode("no-permissions");
                    this.failedPermission = history.failedPermission;
                    break;

                case "private":
                    this.setConversationMode(ChannelConversationMode.Private, true);
                    this.setCurrentMode("normal");
                    break;

                case "success":
                    this.setConversationMode(ChannelConversationMode.Public, true);
                    this.setCurrentMode("normal");
                    break;

                case "unsupported":
                    this.crossChannelChatSupported = false;
                    this.setConversationMode(ChannelConversationMode.Private, true);
                    this.setCurrentMode("normal");
                    break;
            }

            this.events.fire("notify_messages_loaded");
        });
    }

    /* TODO: Query this state and if changed notify state */
    public canClientAccessChat() {
        return this.conversationId === 0 || this.handle.connection.getClient().currentChannel()?.channelId === this.conversationId;
    }

    private executeHistoryQuery() {
        if(this.executingHistoryQueries || this.pendingHistoryQueries.length === 0)
            return;

        this.executingHistoryQueries = true;
        try {
            const promise = this.pendingHistoryQueries.pop_front()();
            promise
                .catch(error => logError(LogCategory.CLIENT, tr("Conversation history query task threw an error; this should never happen: %o"), error))
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
        if(isNaN(timestamp)) {
            return;
        }

        if(this.unreadTimestamp < timestamp) {
            this.registerChatEvent({
                type: "unread-trigger",
                timestamp: timestamp,
                uniqueId: "unread-trigger-" + Date.now() + " - " + timestamp
            }, true);
        }
    }

    public handleIncomingMessage(message: ChatMessage, isOwnMessage: boolean) {
        this.registerIncomingMessage(message, isOwnMessage, "m-" + this.conversationId + "-" + message.timestamp + "-" + Math.random());
    }

    public handleDeleteMessages(criteria: { begin: number, end: number, cldbid: number, limit: number }) {
        let limit = { current: criteria.limit };

        const deletedMessages = this.presentMessages.filter(message => {
            if(message.type !== "message") {
                return false;
            }

            if(message.message.sender_database_id !== criteria.cldbid) {
                return false;
            }

            if(criteria.end != 0 && message.timestamp > criteria.end) {
                return false;
            }

            if(criteria.begin != 0 && message.timestamp < criteria.begin) {
                return false;
            }

            /* if the limit is zero it means all messages */
            return --limit.current >= 0;
        });

        this.presentMessages = this.presentMessages.filter(message => deletedMessages.indexOf(message) === -1);
        this.events.fire("notify_messages_deleted", { messages: deletedMessages.map(message => message.uniqueId) });
        this.updateUnreadState();
    }

    public deleteMessage(messageUniqueId: string) {
        const message = this.presentMessages.find(e => e.uniqueId === messageUniqueId);
        if(!message) {
            logWarn(LogCategory.CHAT, tr("Tried to delete an unknown message (id: %s)"), messageUniqueId);
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
            logError(LogCategory.CHAT, tr("Failed to delete conversation message for conversation %d: %o"), this.conversationId, error);
            if(error instanceof CommandResult) {
                error = error.extra_message || error.message;
            }

            createErrorModal(tr("Failed to delete message"), traj("Failed to delete conversation message{:br:}Error: {}", error)).open();
        });
    }

    setUnreadTimestamp(timestamp: number) {
        super.setUnreadTimestamp(timestamp);

        if(this.preventUnreadUpdate) {
            return;
        }

        this.handle.connection.settings.changeServer(Settings.FN_CHANNEL_CHAT_READ(this.conversationId), timestamp);
    }

    public setConversationMode(mode: ChannelConversationMode, logChange: boolean) {
        super.setConversationMode(mode, logChange);
    }

    public localClientSwitchedChannel(type: "join" | "leave") {
        this.registerChatEvent({
            type: "local-user-switch",
            uniqueId: "us-" + this.conversationId + "-" + Date.now() + "-" + Math.random(),
            timestamp: Date.now(),
            mode: type
        }, false);

        /* TODO: Update can access state! */
    }

    sendMessage(text: string) {
        this.doSendMessage(text, this.conversationId ? 2 : 3, this.conversationId).then(() => {});
    }

    updateAccessState() {
        if(this.isPrivate()) {
            this.setReadable(this.connection.getClient().currentChannel()?.getChannelId() === this.conversationId);
        } else {
            this.setReadable(true);
        }
    }
}

export interface ChannelConversationManagerEvents extends AbstractChatManagerEvents<ChannelConversation> { }

export class ChannelConversationManager extends AbstractChatManager<ChannelConversationManagerEvents, ChannelConversation, ChannelConversationEvents> {
    readonly connection: ConnectionHandler;

    constructor(connection: ConnectionHandler) {
        super(connection);
        this.connection = connection;

        connection.events().one("notify_handler_initialized", () => this.listenerConnection.push(connection.channelTree.events.on("notify_client_moved", event => {
            if(event.client instanceof LocalClientEntry) {
                event.oldChannel && this.findOrCreateConversation(event.oldChannel.channelId).localClientSwitchedChannel("leave");
                this.findOrCreateConversation(event.newChannel.channelId).localClientSwitchedChannel("join");
            }
        })));

        this.listenerConnection.push(connection.events().on("notify_connection_state_changed", event => {
            if(ConnectionState.socketConnected(event.oldState) !== ConnectionState.socketConnected(event.newState)) {
                this.setSelectedConversation(undefined);
                this.getConversations().forEach(conversation => {
                    this.unregisterConversation(conversation);
                    conversation.destroy();
                });
            }
        }));

        this.listenerConnection.push(connection.channelTree.events.on("notify_channel_updated", event => {
            const conversation = this.findConversation(event.channel.channelId);
            if(!conversation) {
                return;
            }

            if("channel_conversation_mode" in event.updatedProperties) {
                conversation.setConversationMode(event.channel.properties.channel_conversation_mode, true);
                conversation.updateAccessState();
            }
        }));

        this.listenerConnection.push(connection.channelTree.events.on("notify_client_moved", event => {
            if(event.client instanceof LocalClientEntry) {
                const fromConversation = this.findConversation(event.oldChannel?.channelId);
                const targetConversation = this.findConversation(event.newChannel?.channelId);

                fromConversation?.updateAccessState();
                targetConversation?.updateAccessState();
            }
        }));

        this.listenerConnection.push(connection.channelTree.events.on("notify_client_enter_view", event => {
            if(event.client instanceof LocalClientEntry) {
                const targetConversation = this.findConversation(event.targetChannel.channelId);
                targetConversation?.updateAccessState();
            }
        }));

        /* TODO: Permission listener for text send power! */

        this.listenerConnection.push(connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationhistory", this.handleConversationHistory.bind(this)));
        this.listenerConnection.push(connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationindex", this.handleConversationIndex.bind(this)));
        this.listenerConnection.push(connection.serverConnection.command_handler_boss().register_explicit_handler("notifyconversationmessagedelete", this.handleConversationMessageDelete.bind(this)));

        this.listenerConnection.push(this.connection.channelTree.events.on("notify_channel_list_received", () => {
            this.queryUnreadFlags();
        }));

        this.listenerConnection.push(this.connection.channelTree.events.on("notify_channel_updated", () => {
            /* TODO private flag! */
        }));
    }

    destroy() {
        super.destroy();
    }

    findConversation(channelId: number) : ChannelConversation {
        return this.findConversationById(channelId?.toString());
    }

    findOrCreateConversation(channelId: number) {
        let conversation = this.findConversation(channelId);
        if(!conversation) {
            conversation = new ChannelConversation(this, channelId);
            const channel = this.connection.channelTree.findChannel(channelId);
            if(channel) {
                conversation.setConversationMode(channel.properties.channel_conversation_mode, false);
            }
            this.registerConversation(conversation);
        }

        return conversation;
    }

    destroyConversation(id: number) {
        const conversation = this.findConversation(id);
        if(!conversation) {
            return;
        }

        this.unregisterConversation(conversation);
        conversation.destroy();
    }

    queryUnreadFlags() {
        const commandData = this.connection.channelTree.channels.map(e => { return { cid: e.channelId, cpw: e.cached_password() }});
        this.connection.serverConnection.send_command("conversationfetch", commandData).catch(error => {
            logWarn(LogCategory.CHAT, tr("Failed to query conversation indexes: %o"), error);
        });
    }

    private handleConversationHistory(command: ServerCommand) {
        const conversation = this.findConversation(parseInt(command.arguments[0]["cid"]));
        if(!conversation) {
            logWarn(LogCategory.NETWORKING, tr("Received conversation history for an unknown conversation: %o"), command.arguments[0]["cid"]);
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
        if(!conversation) {
            return;
        }

        conversation.handleDeleteMessages({
            limit: parseInt(data["limit"]),
            begin: parseInt(data["timestamp_begin"]),
            end: parseInt(data["timestamp_end"]),
            cldbid: parseInt(data["cldbid"])
        })
    }
}