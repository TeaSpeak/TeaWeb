import * as React from "react";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {
    ConversationUIEvents,
    ChatMessage,
    ChatEvent
} from "tc-shared/ui/frames/side/ConversationManager";
import {ChatBox} from "tc-shared/ui/frames/side/ChatBox";
import {generate_client} from "tc-shared/ui/htmltags";
import {useEffect, useRef, useState} from "react";
import {bbcode_chat} from "tc-shared/ui/frames/chat";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {AvatarRenderer} from "tc-shared/ui/react-elements/Avatar";
import {format} from "tc-shared/ui/frames/side/chat_helper";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {XBBCodeRenderer} from "../../../../../vendor/xbbcode/src/react";

const cssStyle = require("./Conversations.scss");

const CMTextRenderer = (props: { text: string }) => {
    const refElement = useRef<HTMLSpanElement>();
    const elements: HTMLElement[] = [];
    bbcode_chat(props.text).forEach(e => elements.push(...e));

    useEffect(() => {
        if(elements.length === 0)
            return;

        refElement.current.replaceWith(...elements);
        return () => {
            /* just so react is happy again */
            elements[0].replaceWith(refElement.current);
            elements.forEach(e => e.remove());
        };
    });

    return <XBBCodeRenderer>{props.text}</XBBCodeRenderer>
};

const TimestampRenderer = (props: { timestamp: number }) => {
    const time = format.date.format_chat_time(new Date(props.timestamp));
    const [ revision, setRevision ] = useState(0);

    useEffect(() => {
        if(!time.next_update)
            return;

        const id = setTimeout(() => setRevision(revision + 1), time.next_update);
        return () => clearTimeout(id);
    });

    return <>{time.result}</>;
};

const ChatEventMessageRenderer = (props: { message: ChatMessage, callbackDelete?: () => void, events: Registry<ConversationUIEvents>, handler: ConnectionHandler }) => {
    let deleteButton;

    if(props.callbackDelete) {
        deleteButton = (
            <div className={cssStyle.delete} onClick={props.callbackDelete} >
                <img src="img/icon_conversation_message_delete.svg" alt="X" />
            </div>
        );
    }

    return (
        <div className={cssStyle.containerMessage}>
            <div className={cssStyle.avatar}>
                <div className={cssStyle.imageContainer}>
                    <AvatarRenderer avatar={props.handler.fileManager.avatars.resolveClientAvatar({ clientUniqueId: props.message.sender_unique_id, database_id: props.message.sender_database_id })} />
                </div>
            </div>
            <div className={cssStyle.message}>
                <div className={cssStyle.info}>
                    {deleteButton}
                    <a className={cssStyle.sender} dangerouslySetInnerHTML={{ __html: generate_client({
                        client_database_id: props.message.sender_database_id,
                        client_id: -1,
                        client_name: props.message.sender_name,
                        client_unique_id: props.message.sender_unique_id,
                        add_braces: false
                    })}} />
                    <a className={cssStyle.timestamp}><TimestampRenderer timestamp={props.message.timestamp} /></a>
                    <br /> { /* Only for copy purposes */ }
                </div>
                <div className={cssStyle.text}>
                    <CMTextRenderer text={props.message.message} />
                    <br style={{ content: " " }} /> { /* Only for copy purposes */ }
                </div>
            </div>
        </div>
    );
};

const TimestampEntry = (props: { timestamp: Date, refDiv: React.Ref<HTMLDivElement> }) => {
    const diff = format.date.date_format(props.timestamp, new Date());
    let formatted;
    let update: boolean;

    if(diff == format.date.ColloquialFormat.YESTERDAY) {
        formatted = <Translatable key={"yesterday"}>Yesterday</Translatable>;
        update = true;
    } else if(diff == format.date.ColloquialFormat.TODAY) {
        formatted = <Translatable key={"today"}>Today</Translatable>;
        update = true;
    } else if(diff == format.date.ColloquialFormat.GENERAL) {
        formatted = <>{format.date.format_date_general(props.timestamp, false)}</>;
        update = false;
    }

    const [ revision, setRevision ] = useState(0);

    useEffect(() => {
        if(!update)
            return;

        const nextHour = new Date();
        nextHour.setUTCMilliseconds(0);
        nextHour.setUTCMinutes(0);
        nextHour.setUTCHours(nextHour.getUTCHours() + 1);

        const id = setTimeout(() => {
            setRevision(revision + 1);
        }, nextHour.getTime() - Date.now() + 10);
        return () => clearTimeout(id);
    });

    return (
        <div className={cssStyle.containerTimestamp} ref={props.refDiv}>
            {formatted}
        </div>
    );
};

const UnreadEntry = (props: { refDiv: React.Ref<HTMLDivElement> }) => (
    <div key={"unread"} ref={props.refDiv} className={cssStyle.containerUnread}>
        <Translatable>Unread messages</Translatable>
    </div>
);

interface ConversationMessagesProperties {
    events: Registry<ConversationUIEvents>;
    handler: ConnectionHandler;
}

interface ConversationMessagesState {
    mode: "normal" | "loading" | "error" | "private" | "no-permission" | "not-supported" | "unselected";

    scrollOffset: number | "bottom";

    errorMessage?: string;
    failedPermission?: string;
}

@ReactEventHandler<ConversationMessages>(e => e.props.events)
class ConversationMessages extends React.Component<ConversationMessagesProperties, ConversationMessagesState> {
    private readonly refMessages = React.createRef<HTMLDivElement>();
    private readonly refUnread = React.createRef<HTMLDivElement>();
    private readonly refTimestamp = React.createRef<HTMLDivElement>();
    private readonly refScrollToNewMessages = React.createRef<HTMLDivElement>();

    private conversationId: number = -1;
    private chatEvents: ChatEvent[] = [];

    private viewElementIndex = 0;
    private viewEntries: React.ReactElement[] = [];

    private unreadTimestamp: undefined | number;
    private scrollIgnoreTimestamp: number = 0;

    private currentHistoryFrame = {
        begin: undefined,
        end: undefined
    };

    constructor(props) {
        super(props);

        this.state = {
            scrollOffset: "bottom",
            mode: "unselected",
        }
    }

    private scrollToBottom() {
        requestAnimationFrame(() => {
            if(this.state.scrollOffset !== "bottom")
                return;

            if(!this.refMessages.current)
                return;

            this.scrollIgnoreTimestamp = Date.now();
            this.refMessages.current.scrollTop = this.refMessages.current.scrollHeight;
        });
    }

    private scrollToNewMessage() {
        requestAnimationFrame(() => {
            if(!this.refUnread.current)
                return;

            this.scrollIgnoreTimestamp = Date.now();
            this.refMessages.current.scrollTop = this.refUnread.current.offsetTop - this.refTimestamp.current.clientHeight;
        });
    }

    private scrollToNewMessagesShown() {
        const newMessageOffset = this.refUnread.current?.offsetTop;
        return this.state.scrollOffset !== "bottom" && this.refMessages.current?.clientHeight + this.state.scrollOffset < newMessageOffset;
    }

    render() {
        let contents = [];

        switch (this.state.mode) {
            case "error":
                contents.push(<div key={"ol-error"} className={cssStyle.overlay}><a>{this.state.errorMessage ? this.state.errorMessage : tr("An unknown error happened.")}</a></div>);
                break;

            case "unselected":
                contents.push(<div key={"ol-unselected"} className={cssStyle.overlay}><a><Translatable>No conversation selected</Translatable></a></div>);
                break;

            case "loading":
                contents.push(<div key={"ol-loading"} className={cssStyle.overlay}><a><Translatable>Loading</Translatable> <LoadingDots maxDots={3}/></a></div>);
                break;

            case "private":
                contents.push(<div key={"ol-private"} className={cssStyle.overlay}><a>
                    <Translatable>This conversation is private.</Translatable><br />
                    <Translatable>Join the channel to participate.</Translatable></a>
                </div>);
                break;

            case "no-permission":
                contents.push(<div key={"ol-permission"} className={cssStyle.overlay}><a>
                    <Translatable>You don't have permissions to participate in this conversation!</Translatable><br />
                    <Translatable>{this.state.failedPermission}</Translatable></a>
                </div>);
                break;

            case "not-supported":
                contents.push(<div key={"ol-support"} className={cssStyle.overlay}><a>
                    <Translatable>The target server does not support the cross channel chat system.</Translatable><br />
                    <Translatable>Join the channel if you want to write.</Translatable></a>
                </div>);
                break;

            case "normal":
                if(this.viewEntries.length === 0) {
                    contents.push(<div key={"ol-empty"} className={cssStyle.overlay}><a>
                        <Translatable>There have been no messages yet.</Translatable><br />
                        <Translatable>Be the first who talks in here!</Translatable></a>
                    </div>);
                } else {
                    contents = this.viewEntries;
                }
                break;
        }

        return (
            <div className={cssStyle.containerMessages}>
                <div
                    className={cssStyle.messages} ref={this.refMessages}
                    onClick={() => this.state.mode === "normal" && this.props.events.fire("action_clear_unread_flag", { chatId: this.conversationId })}
                    onScroll={() => {
                        if(this.scrollIgnoreTimestamp > Date.now())
                            return;

                        const top = this.refMessages.current.scrollTop;
                        const total = this.refMessages.current.scrollHeight - this.refMessages.current.clientHeight;
                        const shouldFollow = top + 200 > total;

                        this.setState({ scrollOffset: shouldFollow ? "bottom" : top });
                    }}
                >
                    {contents}
                </div>
                <div
                    ref={this.refScrollToNewMessages}
                    className={cssStyle.containerScrollNewMessage + " " + (this.scrollToNewMessagesShown() ? cssStyle.shown : "")}
                    onClick={() => this.setState({ scrollOffset: "bottom" }, () => this.scrollToNewMessage())}
                >
                    <Translatable>Scroll to new messages</Translatable>
                </div>
            </div>
        );
    }

    componentDidMount(): void {
        this.scrollToBottom();
    }

    componentDidUpdate(prevProps: Readonly<ConversationMessagesProperties>, prevState: Readonly<ConversationMessagesState>, snapshot?: any): void {
        requestAnimationFrame(() => {
            this.refScrollToNewMessages.current.classList.toggle(cssStyle.shown, this.scrollToNewMessagesShown());
        });
    }

    /* builds the view from the messages */
    private buildView() {
        this.viewEntries = [];

        let timeMarker = new Date(0);
        let unreadSet = false, timestampRefSet = false;

        for(let event of this.chatEvents) {
            const mdate = new Date(event.timestamp);
            if(mdate.getFullYear() !== timeMarker.getFullYear() || mdate.getMonth() !== timeMarker.getMonth() || mdate.getDate() !== timeMarker.getDate()) {
                timeMarker = new Date(mdate.getFullYear(), mdate.getMonth(), mdate.getDate(), 1);
                this.viewEntries.push(<TimestampEntry key={"t" + this.viewElementIndex++} timestamp={timeMarker} refDiv={timestampRefSet ? undefined : this.refTimestamp} />);
                timestampRefSet = true;
            }

            if(event.timestamp >= this.unreadTimestamp && !unreadSet) {
                this.viewEntries.push(<UnreadEntry refDiv={this.refUnread} key={"u" + this.viewElementIndex++} />);
                unreadSet = true;
            }

            switch (event.type) {
                case "message":
                    this.viewEntries.push(<ChatEventMessageRenderer
                        key={event.uniqueId}
                        message={event.message}
                        events={this.props.events}
                        callbackDelete={() => this.props.events.fire("action_delete_message", { chatId: this.conversationId, uniqueId: event.uniqueId })}
                        handler={this.props.handler} />);
                    break;

                case "message-failed":
                    /* TODO! */
                    break;
            }
        }
    }

    @EventHandler<ConversationUIEvents>("notify_server_state")
    private handleNotifyServerState(event: ConversationUIEvents["notify_server_state"]) {
        if(event.state === "connected")
            return;

        this.setState({ mode: "unselected" });
    }

    @EventHandler<ConversationUIEvents>("action_select_conversation")
    private handleSelectConversation(event: ConversationUIEvents["action_select_conversation"]) {
        if(this.conversationId === event.chatId)
            return;

        this.conversationId = event.chatId;
        this.chatEvents = [];
        this.currentHistoryFrame = { begin: undefined, end: undefined };

        if(this.conversationId < 0) {
            this.setState({ mode: "unselected" });
        } else {
            this.props.events.fire("query_conversation_state", {
                chatId: this.conversationId
            });

            this.setState({ mode: "loading" });
        }
    }

    @EventHandler<ConversationUIEvents>("notify_conversation_state")
    private handleConversationStateUpdate(event: ConversationUIEvents["notify_conversation_state"]) {
        if(event.id !== this.conversationId)
            return;

        if(event.mode === "no-permissions") {
            this.setState({
                mode: "no-permission",
                failedPermission: event.failedPermission
            });
        } else if(event.mode === "loading") {
            this.setState({
                mode: "loading"
            });
        } else if(event.mode === "normal") {
            this.unreadTimestamp = event.unreadTimestamp;
            this.chatEvents = event.events;
            this.buildView();

            this.setState({
                mode: "normal",
                scrollOffset: "bottom"
            }, () => this.scrollToBottom());
        } else {
            this.setState({
                mode: "error",
                errorMessage: event.errorMessage || tr("Unknown error/Invalid state")
            });
        }
    }

    @EventHandler<ConversationUIEvents>("notify_chat_event")
    private handleMessageReceived(event: ConversationUIEvents["notify_chat_event"]) {
        if(event.conversation !== this.conversationId)
            return;

        this.chatEvents.push(event.event);
        if(typeof this.unreadTimestamp === "undefined" && event.triggerUnread)
            this.unreadTimestamp = event.event.timestamp;

        this.buildView();
        this.forceUpdate(() => this.scrollToBottom());
    }

    @EventHandler<ConversationUIEvents>("notify_chat_message_delete")
    private handleMessageDeleted(event: ConversationUIEvents["notify_chat_message_delete"]) {
        if(event.conversation !== this.conversationId)
            return;

        let limit = { current: event.criteria.limit };
        this.chatEvents = this.chatEvents.filter(mEvent => {
            if(mEvent.type !== "message")
                return;

            const message = mEvent.message;
            if(message.sender_database_id !== event.criteria.cldbid)
                return true;

            if(event.criteria.end != 0 && message.timestamp > event.criteria.end)
                return true;

            if(event.criteria.begin != 0 && message.timestamp < event.criteria.begin)
                return true;

            return --limit.current < 0;
        });

        this.buildView();
        this.forceUpdate(() => this.scrollToBottom());
    }

    @EventHandler<ConversationUIEvents>("action_clear_unread_flag")
    private handleMessageUnread(event: ConversationUIEvents["action_clear_unread_flag"]) {
        if (event.chatId !== this.conversationId || this.unreadTimestamp === undefined)
            return;

        this.unreadTimestamp = undefined;
        this.buildView();
        this.forceUpdate();
    };

    @EventHandler<ConversationUIEvents>("notify_panel_show")
    private handlePanelShow() {
        if(this.refUnread.current) {
            this.scrollToNewMessage();
        } else if(this.state.scrollOffset === "bottom") {
            this.scrollToBottom();
        } else {
            requestAnimationFrame(() => {
                if(this.state.scrollOffset === "bottom")
                    return;

                this.scrollIgnoreTimestamp = Date.now() + 250;
                this.refMessages.current.scrollTop = this.state.scrollOffset;
            });
        }
    }
}

export const ConversationPanel = (props: { events: Registry<ConversationUIEvents>, handler: ConnectionHandler }) => {
    const currentChat = useRef({ id: -1 });
    const chatEnabled = useRef(false);

    const refChatBox = useRef<ChatBox>();
    let connected = false;

    const updateChatBox = () => {
        refChatBox.current.setState({ enabled: connected && currentChat.current.id >= 0 && chatEnabled.current });
    };

    props.events.reactUse("notify_server_state", event => { connected = event.state === "connected"; updateChatBox(); });
    props.events.reactUse("action_select_conversation", event => {
        currentChat.current.id = event.chatId;
        updateChatBox();
    });
    props.events.reactUse("notify_conversation_state", event => {
        chatEnabled.current = event.mode === "normal" || event.mode === "private";
        updateChatBox();
    });

    useEffect(() => {
        return refChatBox.current.events.on("notify_typing", () => props.events.fire("action_clear_unread_flag", { chatId: currentChat.current.id }));
    });

    return <div className={cssStyle.panel}>
        <ConversationMessages events={props.events} handler={props.handler} />
        <ChatBox
            ref={refChatBox}
            onSubmit={text => props.events.fire("action_send_message", { chatId: currentChat.current.id, text: text }) }
        />
    </div>
};
