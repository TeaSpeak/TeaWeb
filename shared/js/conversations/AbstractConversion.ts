import {
    ChatEvent,
    ChatEventMessage,
    ChatMessage,
    ChatState,
    ConversationHistoryResponse
} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {Registry} from "tc-shared/events";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {preprocessChatMessageForSend} from "tc-shared/text/chat";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {LogCategory, logWarn} from "tc-shared/log";
import {ChannelConversationMode} from "tc-shared/tree/Channel";
import {guid} from "tc-shared/crypto/uid";

export const kMaxChatFrameMessageSize = 50; /* max 100 messages, since the server does not support more than 100 messages queried at once */

export interface AbstractChatEvents {
    notify_chat_event: {
        triggerUnread: boolean,
        event: ChatEvent
    },
    notify_unread_timestamp_changed: {
        timestamp: number
    },
    notify_unread_state_changed: {
        unread: boolean
    },
    notify_send_toggle: {
        enabled: boolean
    },
    notify_state_changed: {
        oldSTate: ChatState,
        newState: ChatState
    },
    notify_history_state_changed: {
        hasHistory: boolean
    },
    notify_conversation_mode_changed: {
        newMode: ChannelConversationMode
    },
    notify_read_state_changed: {
        readable: boolean
    }
}

export abstract class AbstractChat<Events extends AbstractChatEvents> {
    readonly events: Registry<Events>;

    protected readonly connection: ConnectionHandler;
    protected readonly chatId: string;

    protected presentMessages: ChatEvent[] = [];
    protected presentEvents: Exclude<ChatEvent, ChatEventMessage>[] = []; /* everything excluding chat messages */

    private mode: ChatState = "unloaded";
    protected failedPermission: string;
    protected errorMessage: string;

    private conversationMode: ChannelConversationMode;
    protected crossChannelChatSupported: boolean = true;

    protected unreadTimestamp: number;
    protected unreadState: boolean = false;

    protected messageSendEnabled: boolean = true;
    private conversationReadable = true;

    private history = false;

    protected constructor(connection: ConnectionHandler, chatId: string) {
        this.events = new Registry<Events>();
        this.connection = connection;
        this.chatId = chatId;
        this.unreadTimestamp = Date.now();
        this.conversationMode = ChannelConversationMode.Public;
    }

    destroy() {
        this.events.destroy();
    }

    public getCurrentMode() : ChatState { return this.mode; };

    protected setCurrentMode(mode: ChatState) {
        if(this.mode === mode) {
            return;
        }

        const oldState = this.mode;
        this.mode = mode;
        this.events.fire("notify_state_changed", { oldSTate: oldState, newState: mode });
    }

    public registerChatEvent(event: ChatEvent, triggerUnread: boolean) {
        if(event.type === "message") {
            let index = 0;
            while(index < this.presentMessages.length && this.presentMessages[index].timestamp <= event.timestamp) {
                index++;
            }

            this.presentMessages.splice(index, 0, event);

            const deleteMessageCount = Math.max(0, this.presentMessages.length - kMaxChatFrameMessageSize);
            this.presentMessages.splice(0, deleteMessageCount);
            if(deleteMessageCount > 0) {
                this.setHistory(true);
            }
            index -= deleteMessageCount;

            if(event.isOwnMessage) {
                this.setUnreadTimestamp(Date.now());
            } else if(!this.isUnread() && triggerUnread) {
                this.setUnreadTimestamp(event.message.timestamp - 1);
            } else if(!this.isUnread()) {
                /* mark the last message as read */
                this.setUnreadTimestamp(event.message.timestamp);
            }

            this.events.fire("notify_chat_event", {
                triggerUnread: triggerUnread,
                event: event
            });
        } else {
            this.presentEvents.push(event);
            this.presentEvents.sort((a, b) => a.timestamp - b.timestamp);
            /* TODO: Cutoff too old events! */

            if(!this.isUnread() && triggerUnread) {
                this.setUnreadTimestamp(event.timestamp - 1);
            } else if(!this.isUnread()) {
                /* mark the last message as read */
                this.setUnreadTimestamp(event.timestamp);
            }

            this.events.fire("notify_chat_event", {
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

    protected doSendMessage(message: string, targetMode: number, target: number) : Promise<boolean> {
        let msg = preprocessChatMessageForSend(message);
        return this.connection.serverConnection.send_command("sendtextmessage", {
            targetmode: targetMode,
            cid: target,
            target: target,
            msg: msg
        }, { process_result: false }).then(async () => true).catch(error => {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
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
                logWarn(LogCategory.CHAT, tr("Failed to send channel chat message to %s: %o"), this.chatId, error);
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

    public getChatId() : string {
        return this.chatId;
    }

    public isUnread() : boolean {
        return this.unreadState;
    }

    public getConversationMode() : ChannelConversationMode {
        return this.conversationMode;
    }

    public isPrivate() : boolean {
        return this.conversationMode === ChannelConversationMode.Private;
    }

    protected setConversationMode(mode: ChannelConversationMode, logChange: boolean) {
        if(this.conversationMode === mode) {
            return;
        }

        if(logChange) {
            this.registerChatEvent({
                type: "mode-changed",
                uniqueId: guid() + "-mode-change",
                timestamp: Date.now(),
                newMode: mode === ChannelConversationMode.Public ? "normal" : mode === ChannelConversationMode.Private ? "private" : "none"
            }, true);
        }

        this.conversationMode = mode;
        this.events.fire("notify_conversation_mode_changed", { newMode: mode });
    }

    public isReadable() {
        return this.conversationReadable;
    }

    protected setReadable(flag: boolean) {
        if(this.conversationReadable === flag) {
            return;
        }

        this.conversationReadable = flag;
        this.events.fire("notify_read_state_changed", { readable: flag });
    }

    public isSendEnabled() : boolean {
        return this.messageSendEnabled;
    }

    public getUnreadTimestamp() : number | undefined {
        return this.unreadTimestamp;
    }

    public getPresentMessages() : ChatEvent[] {
        return this.presentMessages;
    }

    public getPresentEvents() : ChatEvent[] {
        return this.presentEvents;
    }

    public getErrorMessage() : string | undefined {
        return this.errorMessage;
    }

    public getFailedPermission() : string | undefined {
        return this.failedPermission;
    }

    public setUnreadTimestamp(timestamp: number) {
        if(this.unreadTimestamp !== timestamp) {
            this.unreadTimestamp = timestamp;
            this.events.fire("notify_unread_timestamp_changed", { timestamp: timestamp });
        }

        /* do update the unread state anyways since setUnreadTimestamp will be called when new messages arrive */
        this.updateUnreadState();
    }

    protected updateUnreadState() {
        const newState = this.unreadTimestamp < this.lastEvent()?.timestamp;
        if(this.unreadState !== newState) {
            this.unreadState = newState;
            this.events.fire("notify_unread_state_changed", { unread: newState });
        }
    }

    public hasHistory() : boolean {
        return this.history;
    }

    protected setHistory(hasHistory: boolean) {
        if(this.history === hasHistory) {
            return;
        }

        this.history = hasHistory;
        this.events.fire("notify_history_state_changed", { hasHistory: hasHistory });
    }

    protected lastEvent() : ChatEvent | undefined {
        if(this.presentMessages.length === 0) {
            return this.presentEvents.last();
        } else if(this.presentEvents.length === 0 || this.presentMessages.last().timestamp > this.presentEvents.last().timestamp) {
            return this.presentMessages.last();
        } else {
            return this.presentEvents.last();
        }
    }

    protected sendMessageSendingEnabled(enabled: boolean) {
        if(this.messageSendEnabled === enabled) {
            return;
        }

        this.messageSendEnabled = enabled;
        this.events.fire("notify_send_toggle", { enabled: enabled });
    }

    public abstract queryHistory(criteria: { begin?: number, end?: number, limit?: number }) : Promise<ConversationHistoryResponse>;
    public abstract queryCurrentMessages();
    public abstract sendMessage(text: string);
}

export interface AbstractChatManagerEvents<ConversationType> {
    notify_selected_changed: {
        oldConversation: ConversationType,
        newConversation: ConversationType
    },
    notify_conversation_destroyed: {
        conversation: ConversationType
    },
    notify_conversation_created: {
        conversation: ConversationType
    },
    notify_unread_count_changed: {
        unreadConversations: number
    }
}

export abstract class AbstractChatManager<ManagerEvents extends AbstractChatManagerEvents<ConversationType>, ConversationType extends AbstractChat<ConversationEvents>, ConversationEvents extends AbstractChatEvents> {
    readonly events: Registry<ManagerEvents>;
    readonly connection: ConnectionHandler;
    protected readonly listenerConnection: (() => void)[];
    private readonly listenerUnreadTimestamp: () => void;

    private conversations: {[key: string]: ConversationType} = {};
    private selectedConversation: ConversationType;

    private currentUnreadCount: number;

    protected constructor(connection: ConnectionHandler) {
        this.events = new Registry<ManagerEvents>();
        this.listenerConnection = [];
        this.currentUnreadCount = 0;

        this.listenerUnreadTimestamp = () => {
            let count = this.getConversations().filter(conversation => conversation.isUnread()).length;
            if(count === this.currentUnreadCount) { return; }

            this.currentUnreadCount = count;
            this.events.fire("notify_unread_count_changed", { unreadConversations: count });
        }
    }

    destroy() {
        this.events.destroy();

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);
    }

    getConversations() : ConversationType[] {
        return Object.values(this.conversations);
    }

    getUnreadCount() : number {
        return this.currentUnreadCount;
    }

    getSelectedConversation() : ConversationType {
        return this.selectedConversation;
    }

    setSelectedConversation(conversation: ConversationType | undefined) {
        if(this.selectedConversation === conversation) {
            return;
        }

        const oldConversation = this.selectedConversation;
        this.selectedConversation = conversation;

        this.events.fire("notify_selected_changed", {
            oldConversation: oldConversation,
            newConversation: conversation
        });
    }

    findConversationById(id: string) : ConversationType {
        return this.conversations[id];
    }

    protected registerConversation(conversation: ConversationType) {
        conversation.events.on("notify_unread_state_changed", this.listenerUnreadTimestamp);
        this.conversations[conversation.getChatId()] = conversation;
        this.events.fire("notify_conversation_created", { conversation: conversation });
        this.listenerUnreadTimestamp();
    }

    protected unregisterConversation(conversation: ConversationType) {
        conversation = this.conversations[conversation.getChatId()];
        if(!conversation) { return; }

        if(conversation === this.selectedConversation) {
            this.setSelectedConversation(undefined);
        }

        conversation.events.off("notify_unread_state_changed", this.listenerUnreadTimestamp);
        delete this.conversations[conversation.getChatId()];
        this.events.fire("notify_conversation_destroyed", { conversation: conversation });

        this.listenerUnreadTimestamp();
    }
}