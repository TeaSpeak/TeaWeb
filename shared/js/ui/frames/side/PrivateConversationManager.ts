import {ClientEntry} from "tc-shared/ui/client";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {EventHandler, Registry} from "tc-shared/events";
import {
    PrivateConversationInfo,
    PrivateConversationUIEvents
} from "tc-shared/ui/frames/side/PrivateConversationDefinitions";
import * as ReactDOM from "react-dom";
import * as React from "react";
import {PrivateConversationsPanel} from "tc-shared/ui/frames/side/PrivateConversationUI";
import {
    ChatEvent,
    ChatMessage,
    ConversationHistoryResponse,
    ConversationUIEvents
} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {AbstractChat, AbstractChatManager} from "tc-shared/ui/frames/side/ConversationManager";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {queryConversationEvents, registerConversationEvent} from "tc-shared/ui/frames/side/PrivateConversationHistory";

export type OutOfViewClient = {
    nickname: string,
    clientId: number,
    uniqueId: string
}

let receivingEventUniqueIdIndex = 0;

export class PrivateConversation extends AbstractChat<PrivateConversationUIEvents> {
    public readonly clientUniqueId: string;

    private activeClientListener: (() => void)[] | undefined = undefined;
    private activeClient: ClientEntry | OutOfViewClient | undefined = undefined;
    private lastClientInfo: OutOfViewClient = undefined;
    private conversationOpen: boolean = false;

    constructor(manager: PrivateConversationManager, events: Registry<PrivateConversationUIEvents>, client: ClientEntry | OutOfViewClient) {
        super(manager.connection, client instanceof ClientEntry ? client.clientUid() : client.uniqueId, events);

        this.activeClient = client;
        if(client instanceof ClientEntry) {
            this.registerClientEvents(client);
            this.clientUniqueId = client.clientUid();
        } else {
            this.clientUniqueId = client.uniqueId;
        }
        this.updateClientInfo();

        this.events.on("notify_destroy", () => this.unregisterClientEvents());
    }

    destroy() {
        this.unregisterClientEvents();
    }

    getActiveClient(): ClientEntry | OutOfViewClient | undefined { return this.activeClient; }

    currentClientId() {
        return this.lastClientInfo.clientId;
    }

    /* A value of undefined means that the remote client has disconnected */
    setActiveClientEntry(client: ClientEntry | OutOfViewClient | undefined) {
        if(this.activeClient === client)
            return;

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
        if(this.activeClient instanceof ClientEntry)
            this.registerClientEvents(this.activeClient);

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
    }

    handleChatRemotelyClosed(clientId: number) {
        if(clientId !== this.lastClientInfo.clientId)
            return;

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

    handleRemoteComposing(clientId: number) {
        this.events.fire("notify_partner_typing", { chatId: this.chatId });
    }

    generateUIInfo() : PrivateConversationInfo {
        const lastMessage = this.presentEvents.last();
        return {
            nickname: this.lastClientInfo.nickname,
            uniqueId: this.lastClientInfo.uniqueId,
            clientId: this.lastClientInfo.clientId,
            chatId: this.clientUniqueId,

            lastMessage: lastMessage ? lastMessage.timestamp : 0,
            unreadMessages: this.unreadTimestamp !== undefined
        };
    }

    sendMessage(text: string) {
        if(this.activeClient instanceof ClientEntry)
            this.doSendMessage(text, 1, this.activeClient.clientId()).then(succeeded => succeeded && (this.conversationOpen = true));
        else if(this.activeClient !== undefined && this.activeClient.clientId > 0)
            this.doSendMessage(text, 1, this.activeClient.clientId).then(succeeded => succeeded && (this.conversationOpen = true));
        else {
            this.presentEvents.push({
                type: "message-failed",
                uniqueId: "msf-" + this.chatId + "-" + Date.now(),
                timestamp: Date.now(),
                error: "error",
                errorMessage: tr("target client is offline/invisible")
            });
            this.events.fire_async("notify_chat_event", {
                chatId: this.chatId,
                triggerUnread: false,
                event: this.presentEvents.last()
            });
        }
    }

    sendChatClose() {
        if(!this.conversationOpen)
            return;

        this.conversationOpen = false;
        if(this.lastClientInfo.clientId > 0 && this.connection.connected) {
            this.connection.serverConnection.send_command("clientchatclosed", { clid: this.lastClientInfo.clientId }, { process_result: false }).catch(() => {
                /* nothing really to do here */
            });
        }
    }

    private registerClientEvents(client: ClientEntry) {
        this.activeClientListener = [];
        this.activeClientListener.push(client.events.on("notify_left_view", event => {
            if(event.serverLeave) {
                this.setActiveClientEntry(undefined);
                this.registerChatEvent({
                    type: "partner-action",
                    action: "disconnect",
                    timestamp: Date.now(),
                    uniqueId: "pa-" + this.chatId + "-" + Date.now() + "-" + (++receivingEventUniqueIdIndex)
                }, true);
            } else {
                this.setActiveClientEntry({
                    uniqueId: client.clientUid(),
                    nickname: client.clientNickName(),
                    clientId: client.clientId()
                } as OutOfViewClient)
            }
        }));
        this.activeClientListener.push(client.events.on("notify_properties_updated", event => {
            if('client_nickname' in event.updated_properties)
                this.updateClientInfo();
        }));
    }

    private unregisterClientEvents() {
        if(this.activeClientListener === undefined)
            return;

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

    setUnreadTimestamp(timestamp: number | undefined) {
        super.setUnreadTimestamp(timestamp);

        /* TODO: Move this somehow to the client itself? */
        if(this.activeClient instanceof ClientEntry)
            this.activeClient.setUnread(timestamp !== undefined);

        /* TODO: Eliminate this cross reference? */
        this.connection.side_bar.info_frame().update_chat_counter();
    }

    protected canClientAccessChat(): boolean {
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
        this.mode = "loading";
        this.reportStateToUI();

        queryConversationEvents(this.clientUniqueId, { limit: 50, begin: Date.now(), end: 0, direction: "backwards" }).then(result => {
            this.presentEvents = result.events.filter(e => e.type !== "message") as any;
            this.presentMessages = result.events.filter(e => e.type === "message");
            this.hasHistory = result.hasMore;
            this.mode = "normal";

            this.reportStateToUI();
        });
    }

    protected registerChatEvent(event: ChatEvent, triggerUnread: boolean) {
        super.registerChatEvent(event, triggerUnread);

        registerConversationEvent(this.clientUniqueId, event).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to register private conversation chat event for %s: %o"), this.clientUniqueId, error);
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

export class PrivateConversationManager extends AbstractChatManager<PrivateConversationUIEvents> {
    public readonly htmlTag: HTMLDivElement;
    public readonly connection: ConnectionHandler;

    private activeConversation: PrivateConversation | undefined = undefined;
    private conversations: PrivateConversation[] = [];

    private channelTreeInitialized = false;

    constructor(connection: ConnectionHandler) {
        super();
        this.connection = connection;

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

        this.uiEvents.on("notify_destroy", connection.events().on("notify_connection_state_changed", event => {
            if(ConnectionState.socketConnected(event.old_state) !== ConnectionState.socketConnected(event.new_state)) {
                for(const chat of this.conversations) {
                    chat.handleLocalClientDisconnect(event.old_state === ConnectionState.CONNECTED);
                }

                this.channelTreeInitialized = false;
            }
        }));

        this.uiEvents.on("notify_destroy", connection.channelTree.events.on("notify_client_enter_view", event => {
            const conversation = this.findConversation(event.client);
            if(!conversation) return;

            conversation.handleClientEnteredView(event.client, this.channelTreeInitialized ? event.isServerJoin ? "server-join" : "appear" : "local-reconnect");
        }));

        this.uiEvents.on("notify_destroy", connection.channelTree.events.on("notify_channel_list_received", event => {
            this.channelTreeInitialized = true;
        }));
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.htmlTag);
        this.htmlTag.remove();

        this.uiEvents.unregister_handler(this);
        this.uiEvents.fire("notify_destroy");
        this.uiEvents.destroy();
    }

    findConversation(client: ClientEntry | string) {
        const uniqueId = client instanceof ClientEntry ? client.clientUid() : client;
        return this.conversations.find(e => e.clientUniqueId === uniqueId);
    }

    protected findChat(id: string): AbstractChat<PrivateConversationUIEvents> {
        return this.findConversation(id);
    }

    findOrCreateConversation(client: ClientEntry | OutOfViewClient) {
        let conversation = this.findConversation(client instanceof ClientEntry ? client : client.uniqueId);
        if(!conversation) {
            this.conversations.push(conversation = new PrivateConversation(this, this.uiEvents, client));
            this.reportConversationList();
        }

        return conversation;
    }

    setActiveConversation(conversation: PrivateConversation | undefined) {
        if(conversation === this.activeConversation)
            return;

        this.activeConversation = conversation;
        /* fire this after all other events have been processed, maybe reportConversationList has been called before */
        this.uiEvents.fire_async("notify_selected_chat", { chatId: this.activeConversation ? this.activeConversation.clientUniqueId : "unselected" });
    }

    @EventHandler<PrivateConversationUIEvents>("action_select_chat")
    private handleActionSelectChat(event: PrivateConversationUIEvents["action_select_chat"]) {
        this.setActiveConversation(this.findConversation(event.chatId));
    }

    getActiveConversation() {
        return this.activeConversation;
    }

    getConversations() {
        return this.conversations;
    }

    focusInput() {
        this.uiEvents.fire("action_focus_chat");
    }

    closeConversation(...conversations: PrivateConversation[]) {
        for(const conversation of conversations) {
            conversation.sendChatClose();
            this.conversations.remove(conversation);
            conversation.destroy();

            if(this.activeConversation === conversation)
                this.setActiveConversation(undefined);
        }
        this.reportConversationList();
    }

    private reportConversationList() {
        this.uiEvents.fire_async("notify_private_conversations", {
            conversations: this.conversations.map(conversation => conversation.generateUIInfo()),
            selected: this.activeConversation?.clientUniqueId || "unselected"
        });
    }

    @EventHandler<PrivateConversationUIEvents>("query_private_conversations")
    private handleQueryPrivateConversations() {
        this.reportConversationList();
    }

    @EventHandler<PrivateConversationUIEvents>("action_close_chat")
    private handleConversationClose(event: PrivateConversationUIEvents["action_close_chat"]) {
        const conversation = this.findConversation(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to close a not existing private conversation with id %s"), event.chatId);
            return;
        }

        this.closeConversation(conversation);
    }

    @EventHandler<PrivateConversationUIEvents>("notify_partner_typing")
    private handleNotifySelectChat(event: PrivateConversationUIEvents["notify_selected_chat"]) {
        /* TODO, set active chat? */
    }

    @EventHandler<ConversationUIEvents>("action_self_typing")
    protected handleActionSelfTyping1(event: ConversationUIEvents["action_self_typing"]) {
        if(!this.activeConversation)
            return;

        const clientId = this.activeConversation.currentClientId();
        if(!clientId)
            return;

        this.connection.serverConnection.send_command("clientchatcomposing", { clid: clientId }).catch(error => {
            log.warn(LogCategory.CHAT, tr("Failed to send chat composing to server for chat %d: %o"), clientId, error);
        });
    }
}