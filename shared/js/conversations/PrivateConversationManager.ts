import {
    AbstractChat,
    AbstractConversationEvents,
    AbstractChatManager,
    AbstractChatManagerEvents
} from "tc-shared/conversations/AbstractConversion";
import {ClientEntry} from "tc-shared/tree/Client";
import {ChatEvent, ChatMessage, ConversationHistoryResponse} from "../ui/frames/side/AbstractConversationDefinitions";
import {ChannelTreeEvents} from "tc-shared/tree/ChannelTree";
import {queryConversationEvents, registerConversationEvent} from "tc-shared/conversations/PrivateConversationHistory";
import {LogCategory, logWarn} from "tc-shared/log";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";

export type OutOfViewClient = {
    nickname: string,
    clientId: number,
    uniqueId: string
}

let receivingEventUniqueIdIndex = 0;

export interface PrivateConversationEvents extends AbstractConversationEvents {
    notify_partner_typing: {},
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

export class PrivateConversation extends AbstractChat<PrivateConversationEvents> {
    public readonly clientUniqueId: string;

    private activeClientListener: (() => void)[] | undefined = undefined;
    private activeClient: ClientEntry | OutOfViewClient | undefined = undefined;
    private lastClientInfo: OutOfViewClient;
    private conversationOpen: boolean = false;

    constructor(manager: PrivateConversationManager, client: ClientEntry | OutOfViewClient) {
        super(manager.connection, client instanceof ClientEntry ? client.clientUid() : client.uniqueId);

        this.activeClient = client;
        if(client instanceof ClientEntry) {
            this.registerClientEvents(client);
            this.clientUniqueId = client.clientUid();
        } else {
            this.clientUniqueId = client.uniqueId;
        }
        this.updateClientInfo();
    }

    destroy() {
        super.destroy();
        this.unregisterClientEvents();
    }

    getActiveClient(): ClientEntry | OutOfViewClient | undefined { return this.activeClient; }

    currentClientId() {
        return this.lastClientInfo.clientId;
    }

    getLastClientInfo() : OutOfViewClient {
        return this.lastClientInfo;
    }

    /* A value of undefined means that the remote client has disconnected */
    setActiveClientEntry(client: ClientEntry | OutOfViewClient | undefined) {
        if(this.activeClient === client) {
            return;
        }

        if(this.activeClient instanceof ClientEntry) {
            this.activeClient.setUnread(false); /* clear the unread flag */

            if(client instanceof ClientEntry) {
                this.registerChatEvent({
                    type: "partner-instance-changed",
                    oldClient: this.activeClient.clientNickName(),
                    newClient: client.clientNickName(),
                    timestamp: Date.now(),
                    uniqueId: "pic-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
                }, false);
            }
        }

        this.unregisterClientEvents();
        this.activeClient = client;
        if(this.activeClient instanceof ClientEntry) {
            this.registerClientEvents(this.activeClient);
        }

        this.updateClientInfo();
    }

    hasUnreadMessages() : boolean {
        return this.unreadTimestamp !== undefined;
    }

    handleIncomingMessage(client: ClientEntry | OutOfViewClient, isOwnMessage: boolean, message: ChatMessage) {
        if(!isOwnMessage) {
            this.setActiveClientEntry(client);
        }

        this.conversationOpen = true;
        this.registerIncomingMessage(message, isOwnMessage, "m-" + this.clientUniqueId + "-" + message.timestamp + "-" + (++receivingEventUniqueIdIndex));
        /* FIXME: notify_unread_count_changed */
    }

    handleChatRemotelyClosed(clientId: number) {
        if(clientId !== this.lastClientInfo.clientId) {
            return;
        }

        this.registerChatEvent({
            type: "partner-action",
            action: "close",
            timestamp: Date.now(),
            uniqueId: "pa-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
        }, true);
    }

    handleClientEnteredView(client: ClientEntry, mode: "server-join" | "local-reconnect" | "appear") {
        if(mode === "local-reconnect") {
            this.registerChatEvent({
                type: "local-action",
                action: "reconnect",
                timestamp: Date.now(),
                uniqueId: "la-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
            }, false);
        } else if(this.lastClientInfo.clientId === 0 || mode === "server-join") {
            this.registerChatEvent({
                type: "partner-action",
                action: "reconnect",
                timestamp: Date.now(),
                uniqueId: "pa-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
            }, true);
        }
        this.setActiveClientEntry(client);
    }

    handleRemoteComposing(_clientId: number) {
        this.events.fire("notify_partner_typing", { });
    }

    sendMessage(text: string) {
        if(this.activeClient instanceof ClientEntry) {
            this.doSendMessage(text, 1, this.activeClient.clientId()).then(succeeded => succeeded && (this.conversationOpen = true));
        } else if(this.activeClient !== undefined && this.activeClient.clientId > 0) {
            this.doSendMessage(text, 1, this.activeClient.clientId).then(succeeded => succeeded && (this.conversationOpen = true));
        } else {
            this.registerChatEvent({
                type: "message-failed",
                uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                timestamp: Date.now(),
                error: "error",
                errorMessage: tr("target client is offline/invisible")
            }, false);
        }
    }

    sendChatClose() {
        if(!this.conversationOpen) {
            return;
        }

        this.conversationOpen = false;
        if(this.lastClientInfo.clientId > 0 && this.connection.connected) {
            this.connection.serverConnection.send_command("clientchatclosed", { clid: this.lastClientInfo.clientId }, { process_result: false }).catch(() => {
                /* nothing really to do here */
            });
        }
    }

    handleEventLeftView(event: ChannelTreeEvents["notify_client_leave_view"]) {
        if(event.client !== this.activeClient) {
            return;
        }

        if(event.isServerLeave) {
            this.setActiveClientEntry(undefined);
            this.registerChatEvent({
                type: "partner-action",
                action: "disconnect",
                timestamp: Date.now(),
                uniqueId: "pa-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
            }, true);
        } else {
            this.setActiveClientEntry({
                uniqueId: event.client.clientUid(),
                nickname: event.client.clientNickName(),
                clientId: event.client.clientId()
            } as OutOfViewClient)
        }
    }

    private registerClientEvents(client: ClientEntry) {
        this.activeClientListener = [];
        this.activeClientListener.push(client.events.on("notify_properties_updated", event => {
            if('client_nickname' in event.updated_properties) {
                this.updateClientInfo();
            }
        }));
    }

    private unregisterClientEvents() {
        if(this.activeClientListener === undefined) {
            return;
        }

        this.activeClientListener.forEach(e => e());
        this.activeClientListener = undefined;
    }

    private updateClientInfo() {
        let newInfo: OutOfViewClient;
        if(this.activeClient instanceof ClientEntry) {
            newInfo = {
                clientId: this.activeClient.clientId(),
                nickname: this.activeClient.clientNickName(),
                uniqueId: this.activeClient.clientUid()
            };
        } else {
            newInfo = Object.assign({}, this.activeClient);

            if(!newInfo.nickname)
                newInfo.nickname = this.lastClientInfo.nickname;

            if(!newInfo.uniqueId)
                newInfo.uniqueId = this.clientUniqueId;

            if(!newInfo.clientId || this.activeClient === undefined)
                newInfo.clientId = 0;
        }

        if(this.lastClientInfo) {
            if(newInfo.clientId !== this.lastClientInfo.clientId) {
                this.events.fire("notify_partner_changed", { chatId: this.clientUniqueId, clientId: newInfo.clientId, name: newInfo.nickname });
            } else if(newInfo.nickname !== this.lastClientInfo.nickname) {
                this.events.fire("notify_partner_name_changed", { chatId: this.clientUniqueId, name: newInfo.nickname });
            }
        }
        this.lastClientInfo = newInfo;
        this.sendMessageSendingEnabled(this.lastClientInfo.clientId !== 0);
    }

    setUnreadTimestamp(timestamp: number) {
        super.setUnreadTimestamp(timestamp);

        /* TODO: Move this somehow to the client itself? */
        if(this.activeClient instanceof ClientEntry) {
            this.activeClient.setUnread(this.isUnread());
        }
    }

    public canClientAccessChat(): boolean {
        return true;
    }

    handleLocalClientDisconnect(explicitDisconnect: boolean) {
        this.setActiveClientEntry(undefined);

        if(explicitDisconnect) {
            this.registerChatEvent({
                type: "local-action",
                uniqueId: "la-" + this.chatId + "-" + Date.now(),
                timestamp: Date.now(),
                action: "disconnect"
            }, false);
        }
    }

    queryCurrentMessages() {
        this.setCurrentMode("loading");

        queryConversationEvents(this.clientUniqueId, { limit: 50, begin: Date.now(), end: 0, direction: "backwards" }).then(result => {
            this.presentEvents = result.events.filter(e => e.type !== "message") as any;
            this.presentMessages = result.events.filter(e => e.type === "message");
            this.setHistory(!!result.hasMore);

            this.setCurrentMode("normal");
        });
    }

    public registerChatEvent(event: ChatEvent, triggerUnread: boolean) {
        super.registerChatEvent(event, triggerUnread);

        registerConversationEvent(this.clientUniqueId, event).catch(error => {
            logWarn(LogCategory.CHAT, tr("Failed to register private conversation chat event for %s: %o"), this.clientUniqueId, error);
        });
    }

    async queryHistory(criteria: { begin?: number; end?: number; limit?: number }): Promise<ConversationHistoryResponse> {
        const result = await queryConversationEvents(this.clientUniqueId, {
            limit: criteria.limit,
            direction: "backwards",
            begin: criteria.begin,
            end: criteria.end
        });

        return {
            status: "success",
            events: result.events,
            moreEvents: result.hasMore,
            nextAllowedQuery: 0
        }
    }
}

export interface PrivateConversationManagerEvents extends AbstractChatManagerEvents<PrivateConversation> { }

export class PrivateConversationManager extends AbstractChatManager<PrivateConversationManagerEvents, PrivateConversation, PrivateConversationEvents> {
    public readonly connection: ConnectionHandler;
    private channelTreeInitialized = false;

    constructor(connection: ConnectionHandler) {
        super(connection);
        this.connection = connection;

        this.listenerConnection.push(connection.events().on("notify_connection_state_changed", event => {
            if(ConnectionState.socketConnected(event.oldState) !== ConnectionState.socketConnected(event.newState)) {
                this.getConversations().forEach(conversation => {
                    conversation.handleLocalClientDisconnect(event.oldState === ConnectionState.CONNECTED);
                });

                this.channelTreeInitialized = false;
            }
        }));

        this.listenerConnection.push(connection.channelTree.events.on("notify_client_enter_view", event => {
            const conversation = this.findConversation(event.client);
            if(!conversation) return;

            conversation.handleClientEnteredView(event.client, this.channelTreeInitialized ? event.isServerJoin ? "server-join" : "appear" : "local-reconnect");
        }));

        this.listenerConnection.push(connection.channelTree.events.on("notify_channel_list_received", _event => {
            this.channelTreeInitialized = true;
        }));
    }

    destroy() {
        super.destroy();

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);
    }

    findConversation(client: ClientEntry | string) {
        const uniqueId = client instanceof ClientEntry ? client.clientUid() : client;
        return this.getConversations().find(e => e.clientUniqueId === uniqueId);
    }

    findOrCreateConversation(client: ClientEntry | OutOfViewClient) {
        let conversation = this.findConversation(client instanceof ClientEntry ? client : client.uniqueId);
        if(!conversation) {
            conversation = new PrivateConversation(this, client);
            this.registerConversation(conversation);
        }

        return conversation;
    }

    closeConversation(...conversations: PrivateConversation[]) {
        for(const conversation of conversations) {
            conversation.sendChatClose();
            this.unregisterConversation(conversation);
            conversation.destroy();
        }
    }
}