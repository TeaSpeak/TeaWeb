import {AbstractConversationUiEvents, ChatHistoryState} from "./AbstractConversationDefinitions";
import {EventHandler, Registry} from "tc-events";
import {LogCategory, logError} from "../../../log";
import {tr, tra} from "../../../i18n/localize";
import {
    AbstractChat,
    AbstractChatManager,
    AbstractChatManagerEvents,
    AbstractConversationEvents
} from "tc-shared/conversations/AbstractConversion";
import {ChannelConversation} from "tc-shared/conversations/ChannelConversationManager";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export const kMaxChatFrameMessageSize = 50; /* max 100 messages, since the server does not support more than 100 messages queried at once */

export type SelectedConversation<ConversationType> = ConversationType | undefined | "conversation-manager-selected";
export abstract class AbstractConversationController<
    Events extends AbstractConversationUiEvents,
    Manager extends AbstractChatManager<ManagerEvents, ConversationType, ConversationEvents>,
    ManagerEvents extends AbstractChatManagerEvents<ConversationType>,
    ConversationType extends AbstractChat<ConversationEvents>,
    ConversationEvents extends AbstractConversationEvents
> {
    protected readonly uiEvents: Registry<Events>;
    protected conversationManager: Manager | undefined;
    private listenerManager: (() => void)[];

    private selectedConversation: SelectedConversation<ConversationType>;
    private currentSelectedConversation: ConversationType;
    private currentSelectedListener: (() => void)[];

    protected constructor() {
        this.uiEvents = new Registry<Events>();
        this.currentSelectedListener = [];
        this.listenerManager = [];
        this.selectedConversation = "conversation-manager-selected";
    }

    destroy() {
        this.listenerManager.forEach(callback => callback());
        this.listenerManager.splice(0, this.listenerManager.length);

        this.uiEvents.fire("notify_destroy");
        this.uiEvents.destroy();
    }

    getUiEvents() : Registry<Events> {
        return this.uiEvents;
    }

    protected setConversationManager(manager: Manager | undefined) {
        if(this.conversationManager === manager) {
            return;
        }

        this.listenerManager.forEach(callback => callback());
        this.listenerManager = [];

        this.conversationManager = manager;
        this.selectedConversation = undefined;
        this.setCurrentlySelected(undefined);

        if(this.conversationManager) {
            this.registerConversationManagerEvents(this.conversationManager);
        }
    }

    protected setSelectedConversation(conversation: SelectedConversation<ConversationType>) {
        if(this.selectedConversation === conversation) {
            return;
        }

        /* TODO: Verify that that conversation matches our current handler? */
        this.selectedConversation = conversation;
        if(conversation === "conversation-manager-selected") {
            this.setCurrentlySelected(this.conversationManager?.getSelectedConversation());
        } else {
            this.setCurrentlySelected(conversation);
        }
    }

    protected registerConversationManagerEvents(manager: Manager) : (() => void)[] {
        this.listenerManager.push(manager.events.on("notify_selected_changed", event => {
            if(this.selectedConversation === "conversation-manager-selected") {
                this.setCurrentlySelected(event.newConversation);
            }
        }));

        this.listenerManager.push(manager.events.on("notify_cross_conversation_support_changed", () => {
            const currentConversation = this.getCurrentConversation();
            if(currentConversation) {
                this.reportStateToUI(currentConversation);
            }
        }));

        return this.listenerManager;
    }

    protected registerConversationEvents(conversation: ConversationType) : (() => void)[] {
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

        this.currentSelectedListener.push(conversation.events.on("notify_read_state_changed", () => {
            this.reportStateToUI(conversation);
        }));

        return this.currentSelectedListener;
    }

    private setCurrentlySelected(conversation: ConversationType | undefined) {
        if(this.currentSelectedConversation === conversation) {
            return;
        }

        this.currentSelectedListener.forEach(callback => callback());
        this.currentSelectedListener = [];

        this.currentSelectedConversation = conversation;
        this.uiEvents.fire_react("notify_selected_chat", { chatId: conversation ? conversation.getChatId() : "unselected" });

        if(conversation) {
            this.registerConversationEvents(conversation);
        }
    }

    protected reportStateToUI(conversation: AbstractChat<any>) {
        let historyState: ChatHistoryState;
        const localHistoryState = this.conversationManager.historyUiStates[conversation.getChatId()];
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
                if(conversation.isPrivate() && !conversation.isReadable()) {
                    this.uiEvents.fire_react("notify_conversation_state", {
                        chatId: conversation.getChatId(),
                        state: "private",
                        crossChannelChatSupported: this.conversationManager.hasCrossConversationSupport()
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

                    showUserSwitchEvents: conversation.isPrivate() || !this.conversationManager.hasCrossConversationSupport(),
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
        const localHistoryState = this.conversationManager.historyUiStates[conversation.getChatId()] || (this.conversationManager.historyUiStates[conversation.getChatId()] = {
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

    @EventHandler<AbstractConversationUiEvents>("query_conversation_state")
    protected handleQueryConversationState(event: AbstractConversationUiEvents["query_conversation_state"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
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

    @EventHandler<AbstractConversationUiEvents>("query_conversation_history")
    protected handleQueryHistory(event: AbstractConversationUiEvents["query_conversation_history"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        if(!conversation) {
            this.uiEvents.fire_react("notify_conversation_history", {
                state: "error",
                errorMessage: tr("Unknown conversation"),
                retryTimestamp: Date.now() + 10 * 1000,

                chatId: event.chatId
            });

            logError(LogCategory.CLIENT, tr("Tried to query history for an unknown conversation with id %s"), event.chatId);
            return;
        }

        this.uiQueryHistory(conversation, event.timestamp);
    }

    @EventHandler<AbstractConversationUiEvents>(["action_clear_unread_flag", "action_self_typing"])
    protected handleClearUnreadFlag(event: AbstractConversationUiEvents["action_clear_unread_flag" | "action_self_typing"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        conversation?.setUnreadTimestamp(Date.now());
    }

    @EventHandler<AbstractConversationUiEvents>("action_send_message")
    protected handleSendMessage(event: AbstractConversationUiEvents["action_send_message"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        if(!conversation) {
            logError(LogCategory.CLIENT, tr("Tried to send a chat message to an unknown conversation with id %s"), event.chatId);
            return;
        }

        conversation.sendMessage(event.text);
    }

    @EventHandler<AbstractConversationUiEvents>("action_jump_to_present")
    protected handleJumpToPresent(event: AbstractConversationUiEvents["action_jump_to_present"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        if(!conversation) {
            logError(LogCategory.CLIENT, tr("Tried to jump to present for an unknown conversation with id %s"), event.chatId);
            return;
        }

        this.reportStateToUI(conversation);
    }

    @EventHandler<AbstractConversationUiEvents>("query_selected_chat")
    private handleQuerySelectedChat() {
        this.uiEvents.fire_react("notify_selected_chat", { chatId: this.currentSelectedConversation ? this.currentSelectedConversation.getChatId() : "unselected"});
    }

    @EventHandler<AbstractConversationUiEvents>("action_select_chat")
    private handleActionSelectChat(event: AbstractConversationUiEvents["action_select_chat"]) {
        const conversation = this.conversationManager?.findConversationById(event.chatId);
        this.conversationManager.setSelectedConversation(conversation);
    }
}