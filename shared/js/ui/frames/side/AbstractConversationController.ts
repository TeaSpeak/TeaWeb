import {
    ChatHistoryState,
    ConversationUIEvents
} from "../../../ui/frames/side/ConversationDefinitions";
import {EventHandler, Registry} from "../../../events";
import * as log from "../../../log";
import {LogCategory} from "../../../log";
import {tra, tr} from "../../../i18n/localize";
import {
    AbstractChat,
    AbstractChatEvents,
    AbstractChatManager,
    AbstractChatManagerEvents
} from "tc-shared/conversations/AbstractConversion";

export const kMaxChatFrameMessageSize = 50; /* max 100 messages, since the server does not support more than 100 messages queried at once */

export abstract class AbstractConversationController<
    Events extends ConversationUIEvents,
    Manager extends AbstractChatManager<ManagerEvents, ConversationType, ConversationEvents>,
    ManagerEvents extends AbstractChatManagerEvents<ConversationType>,
    ConversationType extends AbstractChat<ConversationEvents>,
    ConversationEvents extends AbstractChatEvents
> {
    protected readonly uiEvents: Registry<Events>;
    protected readonly conversationManager: Manager;
    protected readonly listenerManager: (() => void)[];

    private historyUiStates: {[id: string]: {
            executingUIHistoryQuery: boolean,
            historyErrorMessage: string | undefined,
            historyRetryTimestamp: number
    }} = {};

    protected currentSelectedConversation: ConversationType;
    protected currentSelectedListener: (() => void)[];

    protected constructor(conversationManager: Manager) {
        this.uiEvents = new Registry<Events>();
        this.currentSelectedListener = [];
        this.conversationManager = conversationManager;

        this.listenerManager = [];

        this.listenerManager.push(this.conversationManager.events.on("notify_selected_changed", event => {
            this.currentSelectedListener.forEach(callback => callback());
            this.currentSelectedListener = [];

            this.currentSelectedConversation = event.newConversation;
            this.uiEvents.fire_react("notify_selected_chat", { chatId: event.newConversation ? event.newConversation.getChatId() : "unselected" });

            const conversation = event.newConversation;
            if(conversation) {
                this.registerConversationEvents(conversation);
            }
        }));

        this.listenerManager.push(this.conversationManager.events.on("notify_conversation_destroyed", event => {
            delete this.historyUiStates[event.conversation.getChatId()];
        }));
    }

    destroy() {
        this.listenerManager.forEach(callback => callback());
        this.listenerManager.splice(0, this.listenerManager.length);

        this.uiEvents.fire("notify_destroy");
        this.uiEvents.destroy();
    }

    protected registerConversationEvents(conversation: ConversationType) {
        this.currentSelectedListener.push(conversation.events.on("notify_unread_timestamp_changed", event =>
            this.uiEvents.fire_react("notify_unread_timestamp_changed", { chatId: conversation.getChatId(), timestamp: event.timestamp })));

        this.currentSelectedListener.push(conversation.events.on("notify_send_toggle", event =>
            this.uiEvents.fire_react("notify_send_enabled", { chatId: conversation.getChatId(), enabled: event.enabled })));

        this.currentSelectedListener.push(conversation.events.on("notify_chat_event", event => {
            this.uiEvents.fire_react("notify_chat_event", { chatId: conversation.getChatId(), event: event.event, triggerUnread: event.triggerUnread });
        }));

        this.currentSelectedListener.push(conversation.events.on("notify_state_changed", () => {
            this.reportStateToUI(conversation);
        }));

        this.currentSelectedListener.push(conversation.events.on("notify_history_state_changed", () => {
            this.reportStateToUI(conversation);
        }));
    }

    handlePanelShow() {
        this.uiEvents.fire_react("notify_panel_show");
    }

    protected reportStateToUI(conversation: AbstractChat<any>) {
        const crossChannelChatSupported = true; /* FIXME: Determine this form the server! */

        let historyState: ChatHistoryState;
        const localHistoryState = this.historyUiStates[conversation.getChatId()];
        if(!localHistoryState) {
            historyState = conversation.hasHistory() ? "available" : "none";
        } else {
            if(Date.now() < localHistoryState.historyRetryTimestamp && localHistoryState.historyErrorMessage) {
                historyState = "error";
            } else if(localHistoryState.executingUIHistoryQuery) {
                historyState = "loading";
            } else if(conversation.hasHistory()) {
                historyState = "available";
            } else {
                historyState = "none";
            }
        }

        switch (conversation.getCurrentMode()) {
            case "normal":
                if(conversation.isPrivate() && !conversation.canClientAccessChat()) {
                    this.uiEvents.fire_react("notify_conversation_state", {
                        chatId: conversation.getChatId(),
                        state: "private",
                        crossChannelChatSupported: crossChannelChatSupported
                    });
                    return;
                }

                this.uiEvents.fire_react("notify_conversation_state", {
                    chatId: conversation.getChatId(),
                    state: "normal",

                    historyState: historyState,
                    historyErrorMessage: localHistoryState?.historyErrorMessage,
                    historyRetryTimestamp: localHistoryState ? localHistoryState.historyRetryTimestamp : 0,

                    chatFrameMaxMessageCount: kMaxChatFrameMessageSize,
                    unreadTimestamp: conversation.getUnreadTimestamp(),

                    showUserSwitchEvents: conversation.isPrivate() || !crossChannelChatSupported,
                    sendEnabled: conversation.isSendEnabled(),

                    events: [...conversation.getPresentEvents(), ...conversation.getPresentMessages()]
                });
                break;

            case "loading":
            case "unloaded":
                this.uiEvents.fire_react("notify_conversation_state", {
                    chatId: conversation.getChatId(),
                    state: "loading"
                });
                break;

            case "error":
                this.uiEvents.fire_react("notify_conversation_state", {
                    chatId: conversation.getChatId(),
                    state: "error",
                    errorMessage: conversation.getErrorMessage()
                });
                break;

            case "no-permissions":
                this.uiEvents.fire_react("notify_conversation_state", {
                    chatId: conversation.getChatId(),
                    state: "no-permissions",
                    failedPermission: conversation.getFailedPermission()
                });
                break;

        }
    }
    public uiQueryHistory(conversation: AbstractChat<any>, timestamp: number, enforce?: boolean) {
        const localHistoryState = this.historyUiStates[conversation.getChatId()] || (this.historyUiStates[conversation.getChatId()] = {
            executingUIHistoryQuery: false,
            historyErrorMessage: undefined,
            historyRetryTimestamp: 0
        });

        if(localHistoryState.executingUIHistoryQuery && !enforce) {
            return;
        }

        localHistoryState.executingUIHistoryQuery = true;
        conversation.queryHistory({ end: 1, begin: timestamp, limit: kMaxChatFrameMessageSize }).then(result => {
            localHistoryState.executingUIHistoryQuery = false;
            localHistoryState.historyErrorMessage = undefined;
            localHistoryState.historyRetryTimestamp = result.nextAllowedQuery;

            switch (result.status) {
                case "success":
                    this.uiEvents.fire_react("notify_conversation_history", {
                        chatId: conversation.getChatId(),
                        state: "success",

                        hasMoreMessages: result.moreEvents,
                        retryTimestamp: localHistoryState.historyRetryTimestamp,

                        events: result.events
                    });
                    break;

                case "private":
                    this.uiEvents.fire_react("notify_conversation_history", {
                        chatId: conversation.getChatId(),
                        state: "error",
                        errorMessage: localHistoryState.historyErrorMessage = tr("chat is private"),
                        retryTimestamp: localHistoryState.historyRetryTimestamp
                    });
                    break;

                case "no-permission":
                    this.uiEvents.fire_react("notify_conversation_history", {
                        chatId: conversation.getChatId(),
                        state: "error",
                        errorMessage: localHistoryState.historyErrorMessage = tra("failed on {}", result.failedPermission || tr("unknown permission")),
                        retryTimestamp: localHistoryState.historyRetryTimestamp
                    });
                    break;

                case "error":
                    this.uiEvents.fire_react("notify_conversation_history", {
                        chatId: conversation.getChatId(),
                        state: "error",
                        errorMessage: localHistoryState.historyErrorMessage = result.errorMessage,
                        retryTimestamp: localHistoryState.historyRetryTimestamp
                    });
                    break;
            }
        });
    }

    protected getCurrentConversation() : ConversationType | undefined {
        return this.currentSelectedConversation;
    }

    @EventHandler<ConversationUIEvents>("query_conversation_state")
    protected handleQueryConversationState(event: ConversationUIEvents["query_conversation_state"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_react("notify_conversation_state", {
                state: "error",
                errorMessage: tr("Unknown conversation"),

                chatId: event.chatId
            });
            return;
        }

        if(conversation.getCurrentMode() === "unloaded") {
            /* will switch the state to "loading" and already reports the state to the ui */
            conversation.queryCurrentMessages();
        } else {
            this.reportStateToUI(conversation);
        }
    }

    @EventHandler<ConversationUIEvents>("query_conversation_history")
    protected handleQueryHistory(event: ConversationUIEvents["query_conversation_history"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_react("notify_conversation_history", {
                state: "error",
                errorMessage: tr("Unknown conversation"),
                retryTimestamp: Date.now() + 10 * 1000,

                chatId: event.chatId
            });

            log.error(LogCategory.CLIENT, tr("Tried to query history for an unknown conversation with id %s"), event.chatId);
            return;
        }

        this.uiQueryHistory(conversation, event.timestamp);
    }

    @EventHandler<ConversationUIEvents>(["action_clear_unread_flag", "action_self_typing"])
    protected handleClearUnreadFlag(event: ConversationUIEvents["action_clear_unread_flag" | "action_self_typing"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        conversation?.setUnreadTimestamp(Date.now());
    }

    @EventHandler<ConversationUIEvents>("action_send_message")
    protected handleSendMessage(event: ConversationUIEvents["action_send_message"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to send a chat message to an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.sendMessage(event.text);
    }

    @EventHandler<ConversationUIEvents>("action_jump_to_present")
    protected handleJumpToPresent(event: ConversationUIEvents["action_jump_to_present"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        if(!conversation) {
            log.error(LogCategory.CLIENT, tr("Tried to jump to present for an unknown conversation with id %s"), event.chatId);
            return;
        }

        this.reportStateToUI(conversation);
    }

    @EventHandler<ConversationUIEvents>("query_selected_chat")
    private handleQuerySelectedChat() {
        this.uiEvents.fire_react("notify_selected_chat", { chatId: this.currentSelectedConversation ? this.currentSelectedConversation.getChatId() : "unselected"})
    }

    @EventHandler<ConversationUIEvents>("action_select_chat")
    private handleActionSelectChat(event: ConversationUIEvents["action_select_chat"]) {
        const conversation = this.conversationManager.findConversationById(event.chatId);
        this.conversationManager.setSelectedConversation(conversation);
    }
}