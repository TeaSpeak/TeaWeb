import {
    ChatEvent,
    ChatEventMessage, ChatHistoryState, ChatMessage,
    ChatState, ConversationHistoryResponse,
    ConversationUIEvents
} from "../../../ui/frames/side/ConversationDefinitions";
import {ConnectionHandler} from "../../../ConnectionHandler";
import {EventHandler, Registry} from "../../../events";
import {preprocessChatMessageForSend} from "../../../text/chat";
import {CommandResult} from "../../../connection/ServerConnectionDeclaration";
import * as log from "../../../log";
import {LogCategory} from "../../../log";
import {tra} from "../../../i18n/localize";
import {ErrorCode} from "../../../connection/ErrorCode";

export const kMaxChatFrameMessageSize = 50; /* max 100 messages, since the server does not support more than 100 messages queried at once */

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