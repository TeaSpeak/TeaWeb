import * as React from "react";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {ChatBox} from "tc-shared/ui/frames/side/ChatBox";
import {Ref, useEffect, useRef, useState} from "react";
import {AvatarRenderer} from "tc-shared/ui/react-elements/Avatar";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Countdown} from "tc-shared/ui/react-elements/Countdown";
import {
    ChatEvent,
    ChatEventLocalAction,
    ChatEventLocalUserSwitch,
    ChatEventMessageSendFailed,
    ChatEventPartnerInstanceChanged,
    ChatEventQueryFailed,
    ChatEventPartnerAction,
    ChatHistoryState,
    ChatMessage,
    ConversationUIEvents
} from "tc-shared/ui/frames/side/ConversationDefinitions";
import {TimestampRenderer} from "tc-shared/ui/react-elements/TimestampRenderer";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {getGlobalAvatarManagerFactory} from "tc-shared/file/Avatars";
import {ColloquialFormat, date_format, format_date_general, formatDayTime} from "tc-shared/utils/DateUtils";

const cssStyle = require("./ConversationUI.scss");

const CMTextRenderer = React.memo((props: { text: string }) => <BBCodeRenderer settings={{ convertSingleUrls: true }} message={props.text} />);

const ChatEventMessageRenderer = React.memo((props: {
    message: ChatMessage,
    callbackDelete?: () => void,
    events: Registry<ConversationUIEvents>,
    handlerId: string,

    refHTMLElement?: Ref<HTMLDivElement>
}) => {
    let deleteButton;

    if(props.callbackDelete) {
        deleteButton = (
            <div className={cssStyle.delete} onClick={props.callbackDelete} >
                <img src="img/icon_conversation_message_delete.svg" alt={""} />
            </div>
        );
    }

    const avatar = getGlobalAvatarManagerFactory().getManager(props.handlerId)?.resolveClientAvatar({ clientUniqueId: props.message.sender_unique_id, database_id: props.message.sender_database_id });
    return (
        <div className={cssStyle.containerMessage} ref={props.refHTMLElement}>
            <div className={cssStyle.avatar}>
                <AvatarRenderer
                    className={cssStyle.imageContainer}
                    alt={""}
                    avatar={avatar} />
            </div>
            <div className={cssStyle.message}>
                <div className={cssStyle.info}>
                    {deleteButton}
                    {/*
                        <a className={cssStyle.sender} dangerouslySetInnerHTML={{ __html: generate_client({
                            client_database_id: props.message.sender_database_id,
                            client_id: -1,
                            client_name: props.message.sender_name,
                            client_unique_id: props.message.sender_unique_id,
                            add_braces: false
                        })}} />
                    */}
                    <a className={cssStyle.sender}>
                        <div className={"htmltag-client"}>{props.message.sender_name}</div>
                    </a>
                    <span> </span> { /* Only for copy purposes */}
                    <a className={cssStyle.timestamp}>
                        <TimestampRenderer timestamp={props.message.timestamp} />
                    </a>
                    <br /> { /* Only for copy purposes */ }
                </div>
                <div className={cssStyle.text}>
                    <CMTextRenderer text={props.message.message} />
                </div>
                <br style={{ content: " ", display: "none" }} /> { /* Only for copy purposes */ }
            </div>
        </div>
    );
});


const TimestampEntry = (props: { timestamp: Date, refDiv: React.Ref<HTMLDivElement> }) => {
    const diff = date_format(props.timestamp, new Date());
    let formatted;
    let update: boolean;

    if(diff == ColloquialFormat.YESTERDAY) {
        formatted = <Translatable key={"yesterday"}>Yesterday</Translatable>;
        update = true;
    } else if(diff == ColloquialFormat.TODAY) {
        formatted = <Translatable key={"today"}>Today</Translatable>;
        update = true;
    } else if(diff == ColloquialFormat.GENERAL) {
        formatted = <>{format_date_general(props.timestamp, false)}</>;
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
    <div ref={props.refDiv} className={cssStyle.containerUnread}>
        <Translatable>Unread messages</Translatable>
    </div>
);

const LoadOderMessages = (props: { events: Registry<ConversationUIEvents>, chatId: string, state: ChatHistoryState | "error", errorMessage?: string, retryTimestamp?: number, timestamp: number | undefined }) => {
    if(props.state === "none")
        return null;

    let innerMessage, onClick;
    if(props.state === "loading") {
        innerMessage = <><Translatable>loading older messages</Translatable> <LoadingDots /></>;
    } else if(props.state === "available") {
        const shouldThrottle = Date.now() < props.retryTimestamp;

        const [ revision, setRevision ] = useState(0);
        useEffect(() => {
            if(!shouldThrottle)
                return;

            const timeout = setTimeout(() => setRevision(revision + 1), props.retryTimestamp - Date.now());
            return () => clearTimeout(timeout);
        });

        if(shouldThrottle) {
            innerMessage = <React.Fragment key={"throttle"}>
                <Translatable>please wait</Translatable>&nbsp;
                <Countdown timestamp={props.retryTimestamp} finished={tr("1 second")} />
            </React.Fragment>;
        } else {
            onClick = props.state === "available" && props.timestamp ? () => props.events.fire("query_conversation_history", { chatId: props.chatId, timestamp: props.timestamp }) : undefined;
            innerMessage = <Translatable key={"can-load"}>Load older messages</Translatable>;
        }
    } else {
        innerMessage = (
            <>
                <Translatable>History query failed</Translatable> ({props.errorMessage})<br/>
                <Translatable>Try again in</Translatable> <Countdown timestamp={props.retryTimestamp} finished={tr("1 second")} />
            </>
        );
    }

    return (
        <div className={cssStyle.containerLoadMessages}>
            <div className={cssStyle.inner} onClick={onClick}>
                {innerMessage}
            </div>
        </div>
    )
};

const JumpToPresent = (props: { events: Registry<ConversationUIEvents>, chatId: string }) => (
    <div
        className={cssStyle.containerLoadMessages + " " + cssStyle.present}
        onClick={() => props.events.fire("action_jump_to_present", { chatId: props.chatId })}
    >
        <div className={cssStyle.inner}>
            <Translatable>Jump to present</Translatable>
        </div>
    </div>
);

const ChatEventLocalUserSwitchRenderer = (props: { event: ChatEventLocalUserSwitch, timestamp: number, refHTMLElement: Ref<HTMLDivElement> }) => {
    return (
        <div className={cssStyle.containerSwitch} ref={props.refHTMLElement}>
            <a>
                {props.event.mode === "join" ? <Translatable>You joined at</Translatable> : <Translatable>You left at</Translatable>}
                &nbsp;
                {formatDayTime(new Date(props.timestamp))}
            </a>
            <div />
        </div>
    )
};

const ChatEventQueryFailedRenderer = (props: { event: ChatEventQueryFailed, refHTMLElement: Ref<HTMLDivElement> }) => {
    return (
        <div className={cssStyle.containerQueryFailed} ref={props.refHTMLElement}>
            <Translatable>failed to query history</Translatable>
            &nbsp;
            ({props.event.message})
        </div>
    )
};

const ChatEventMessageFailedRenderer = (props: { event: ChatEventMessageSendFailed, refHTMLElement: Ref<HTMLDivElement> }) => {
    if(props.event.error === "permission")
        return (
            <div className={cssStyle.containerMessageSendFailed} ref={props.refHTMLElement}>
                <Translatable>message send failed due to permission</Translatable>
                {" " + props.event.failedPermission}
            </div>
        );
    return (
        <div className={cssStyle.containerMessageSendFailed} ref={props.refHTMLElement}>
            <Translatable>failed to send message:</Translatable>
            &nbsp;
            {props.event.errorMessage || tr("Unknown error")}
        </div>
    )
};

const ChatEventPartnerInstanceChangedRenderer = (props: { event: ChatEventPartnerInstanceChanged, refHTMLElement: Ref<HTMLDivElement> }) => {
    return (
        <div className={cssStyle.containerPartnerInstanceChanged} ref={props.refHTMLElement}>
            <Translatable>You're&nbsp;now&nbsp;chatting&nbsp;with</Translatable>
            &nbsp;
            <a>{props.event.newClient}</a>
        </div>
    )
};

const ChatEventLocalActionRenderer = (props: { event: ChatEventLocalAction, refHTMLElement: Ref<HTMLDivElement> }) => {
    switch (props.event.action) {
        case "disconnect":
            return (
                <div className={cssStyle.containerLocalAction + " " + cssStyle.actionDisconnect} ref={props.refHTMLElement}>
                    <Translatable>You've disconnected from the server</Translatable>
                </div>
            );

        case "reconnect":
            return (
                <div className={cssStyle.containerLocalAction + " " + cssStyle.actionReconnect} ref={props.refHTMLElement}>
                    <Translatable>Chat reconnected</Translatable>
                </div>
            );
    }
};

const ChatEventPartnerActionRenderer = (props: { event: ChatEventPartnerAction, refHTMLElement: Ref<HTMLDivElement> }) => {
    switch (props.event.action) {
        case "close":
            return (
                <div className={cssStyle.containerPartnerAction + " " + cssStyle.actionClose} ref={props.refHTMLElement}>
                    <Translatable>Your chat partner has closed the conversation</Translatable>
                </div>
            );

        case "disconnect":
            return (
                <div className={cssStyle.containerPartnerAction + " " + cssStyle.actionDisconnect} ref={props.refHTMLElement}>
                    <Translatable>Your chat partner has disconnected</Translatable>
                </div>
            );

        case "reconnect":
            return (
                <div className={cssStyle.containerPartnerAction + " " + cssStyle.actionReconnect} ref={props.refHTMLElement}>
                    <Translatable>Your chat partner has reconnected</Translatable>
                </div>
            );
    }
    return null;
};

const PartnerTypingIndicator = (props: { events: Registry<ConversationUIEvents>, chatId: string, timeout?: number }) => {
    const kTypingTimeout = props.timeout || 5000;


    const [ typingTimestamp, setTypingTimestamp ] = useState(0);
    props.events.reactUse("notify_partner_typing", event => {
        if(event.chatId !== props.chatId)
            return;

        setTypingTimestamp(Date.now());
    });

    props.events.reactUse("notify_chat_event", event => {
        if(event.chatId !== props.chatId)
            return;

        if(event.event.type === "message") {
            if(!event.event.isOwnMessage)
                setTypingTimestamp(0);
        } else if(event.event.type === "partner-action" || event.event.type === "local-action") {
            setTypingTimestamp(0);
        }
    });

    const isTyping = Date.now() - kTypingTimeout < typingTimestamp;

    useEffect(() => {
        if(!isTyping)
            return;

        const timeout = setTimeout(() => {
            setTypingTimestamp(0);
        }, kTypingTimeout);
        return () => clearTimeout(timeout);
    });

    return (
        <div className={cssStyle.containerPartnerTyping + (isTyping ? "" : " " + cssStyle.hidden)}>
            <Translatable>Partner is typing</Translatable> <LoadingDots enabled={isTyping} />
        </div>
    )
};

interface ConversationMessagesProperties {
    events: Registry<ConversationUIEvents>;
    handlerId: string;

    noFirstMessageOverlay?: boolean
    messagesDeletable?: boolean;
}

interface ConversationMessagesState {
    mode: "normal" | "loading" | "error" | "private" | "no-permission" | "not-supported" | "unselected";

    errorMessage?: string;
    failedPermission?: string;

    historyState: ChatHistoryState | "error";
    historyErrorMessage?: string;
    historyRetryTimestamp?: number;

    isBrowsingHistory: boolean;
}

@ReactEventHandler<ConversationMessages>(e => e.props.events)
class ConversationMessages extends React.PureComponent<ConversationMessagesProperties, ConversationMessagesState> {
    private readonly refMessages = React.createRef<HTMLDivElement>();
    private readonly refUnread = React.createRef<HTMLDivElement>();
    private readonly refTimestamp = React.createRef<HTMLDivElement>();
    private readonly refScrollToNewMessages = React.createRef<HTMLDivElement>();
    private readonly refScrollElement = React.createRef<HTMLDivElement>();
    private readonly refFirstChatEvent = React.createRef<HTMLDivElement>();

    private scrollElementPreviousOffset = 0;
    private scrollOffset: number | "bottom" | "element";

    private currentChatId: "unselected" | string = "unselected";
    private chatEvents: ChatEvent[] = [];
    private showSwitchEvents: boolean = false;

    private scrollEventUniqueId: string;
    private viewElementIndex = 0;
    private viewEntries: React.ReactElement[] = [];

    private unreadTimestamp: undefined | number;

    private chatFrameMaxMessageCount: number;
    private chatFrameMaxHistoryMessageCount: number;
    private historyRetryTimer: number;

    private ignoreNextScroll: boolean = false;
    private scrollHistoryAutoLoadThrottle: number = 0;

    constructor(props) {
        super(props);

        this.state = {
            mode: "unselected",

            historyState: "available",
            isBrowsingHistory: false,

            historyRetryTimestamp: 0
        }
    }

    private scrollToBottom() {
        this.ignoreNextScroll = true;
        requestAnimationFrame(() => {
            this.ignoreNextScroll = false;
            if(this.scrollOffset !== "bottom")
                return;

            if(!this.refMessages.current)
                return;

            this.refMessages.current.scrollTop = this.refMessages.current.scrollHeight;
        });
    }

    private scrollToNewMessage() {
        this.ignoreNextScroll = true;
        requestAnimationFrame(() => {
            this.ignoreNextScroll = false;
            if(!this.refUnread.current)
                return;

            this.refMessages.current.scrollTop = this.refUnread.current.offsetTop - this.refTimestamp.current.clientHeight;
        });
    }

    private fixScroll() {
        if(this.scrollOffset === "element") {
            this.ignoreNextScroll = true;
            requestAnimationFrame(() => {
                this.ignoreNextScroll = false;

                if(!this.refMessages.current)
                    return;

                let scrollTop;
                if(this.refScrollElement.current) {
                    /* scroll to the element */
                    scrollTop = this.refScrollElement.current.offsetTop - this.scrollElementPreviousOffset;
                } else {
                    /* just scroll to the bottom */
                    scrollTop = this.refMessages.current.scrollHeight;
                }
                this.refMessages.current.scrollTop = scrollTop;
                this.scrollOffset = scrollTop;
                this.scrollEventUniqueId = undefined;
            });
        } else if(this.scrollOffset !== "bottom") {
            this.ignoreNextScroll = true;
            requestAnimationFrame(() => {
                if(this.scrollOffset === "bottom")
                    return;
                this.ignoreNextScroll = false;

                this.refMessages.current.scrollTop = this.scrollOffset as any;
            });
        } else if(this.refUnread.current) {
            this.scrollToNewMessage();
        } else {
            this.scrollToBottom();
        }
    }

    private scrollToNewMessagesShown() {
        const newMessageOffset = this.refUnread.current?.offsetTop;
        return typeof this.scrollOffset === "number" && this.refMessages.current?.clientHeight + this.scrollOffset < newMessageOffset;
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
                    >{this.state.failedPermission}</a>
                </div>);
                break;

            case "not-supported":
                contents.push(<div key={"ol-support"} className={cssStyle.overlay}><a>
                    <Translatable>The target server does not support cross channel chat.</Translatable><br />
                    <Translatable>Join the channel if you want to write.</Translatable></a>
                </div>);
                break;

            case "normal":
                if(this.viewEntries.length === 0 && !this.props.noFirstMessageOverlay) {
                    contents.push(<div key={"ol-empty"} className={cssStyle.overlay}><a>
                        <Translatable>There have been no messages yet.</Translatable><br />
                        <Translatable>Be the first who talks in here!</Translatable></a>
                    </div>);
                } else {
                    contents = this.viewEntries;
                }
                break;
        }

        const firstMessageTimestamp = this.chatEvents[0]?.timestamp;
        return (
            <div className={cssStyle.containerMessages}>
                <div
                    className={cssStyle.messages} ref={this.refMessages}
                    onClick={() => this.state.mode === "normal" && this.props.events.fire("action_clear_unread_flag", { chatId: this.currentChatId })}
                    onScroll={() => {
                        if(this.ignoreNextScroll)
                            return;

                        const top = this.refMessages.current.scrollTop;
                        const total = this.refMessages.current.scrollHeight - this.refMessages.current.clientHeight;
                        const shouldFollow = top + 200 > total;

                        if(firstMessageTimestamp && top <= 20 && this.state.historyState === "available" && Math.max(this.scrollHistoryAutoLoadThrottle, this.state.historyRetryTimestamp) < Date.now()) {
                            /* only load history when we're in an upwards scroll move */
                            if(this.scrollOffset === "bottom" || this.scrollOffset > top) {
                                this.scrollHistoryAutoLoadThrottle = Date.now() + 500; /* don't spam events */
                                this.props.events.fire_async("query_conversation_history", { chatId: this.currentChatId, timestamp: firstMessageTimestamp });
                            }
                        }

                        this.scrollOffset = shouldFollow ? "bottom" : top;
                    }}
                >
                    <LoadOderMessages
                        events={this.props.events}
                        chatId={this.currentChatId}
                        state={this.state.historyState}
                        timestamp={firstMessageTimestamp}
                        retryTimestamp={this.state.historyRetryTimestamp}
                        errorMessage={this.state.historyErrorMessage}
                    />
                    {contents}
                    {this.state.isBrowsingHistory ? <div key={"jump-present-placeholder"} className={cssStyle.jumpToPresentPlaceholder} /> : undefined}
                </div>
                <div
                    ref={this.refScrollToNewMessages}
                    className={cssStyle.containerScrollNewMessage + " " + (this.scrollToNewMessagesShown() ? cssStyle.shown : "")}
                    onClick={() => { this.scrollOffset = "bottom"; this.scrollToNewMessage(); }}
                >
                    <Translatable>Scroll to new messages</Translatable>
                </div>
                {this.state.isBrowsingHistory ?
                    <JumpToPresent
                        key={"jump-to-present"}
                        events={this.props.events}
                        chatId={this.currentChatId} /> :
                    undefined
                }
                <PartnerTypingIndicator events={this.props.events} chatId={this.currentChatId} />
            </div>
        );
    }

    componentDidMount(): void {
        this.props.events.fire("query_selected_chat");
        this.scrollToBottom();
    }

    componentDidUpdate(prevProps: Readonly<ConversationMessagesProperties>, prevState: Readonly<ConversationMessagesState>, snapshot?: any): void {
        requestAnimationFrame(() => {
            this.refScrollToNewMessages.current?.classList.toggle(cssStyle.shown, this.scrollToNewMessagesShown());
        });
    }

    componentWillUnmount(): void {
        clearTimeout(this.historyRetryTimer);
        this.historyRetryTimer = undefined;
    }

    private sortEvents() {
        this.chatEvents.sort((a, b) => a.timestamp - b.timestamp);
    }

    /* builds the view from the messages */
    private buildView() {
        this.viewEntries = [];

        let timeMarker = new Date(0);
        let unreadSet = false, timestampRefSet = false;

        let firstEvent = true;
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

            let reference = this.scrollEventUniqueId === event.uniqueId ? this.refScrollElement : firstEvent ? this.refFirstChatEvent : undefined;
            firstEvent = false;

            switch (event.type) {
                case "message":
                    this.viewEntries.push(<ChatEventMessageRenderer
                        key={event.uniqueId}
                        message={event.message}
                        events={this.props.events}
                        callbackDelete={this.props.messagesDeletable ? () => this.props.events.fire("action_delete_message", { chatId: this.currentChatId, uniqueId: event.uniqueId }) : undefined}
                        handlerId={this.props.handlerId}
                        refHTMLElement={reference}
                    />);
                    break;

                case "message-failed":
                    this.viewEntries.push(<ChatEventMessageFailedRenderer
                        key={event.uniqueId}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;

                case "local-user-switch":
                    this.viewEntries.push(<ChatEventLocalUserSwitchRenderer
                        key={event.uniqueId}
                        timestamp={event.timestamp}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;

                case "query-failed":
                    this.viewEntries.push(<ChatEventQueryFailedRenderer
                        key={event.uniqueId}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;

                case "partner-instance-changed":
                    this.viewEntries.push(<ChatEventPartnerInstanceChangedRenderer
                        key={event.uniqueId}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;

                case "local-action":
                    this.viewEntries.push(<ChatEventLocalActionRenderer
                        key={event.uniqueId}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;

                case "partner-action":
                    this.viewEntries.push(<ChatEventPartnerActionRenderer
                        key={event.uniqueId}
                        event={event}
                        refHTMLElement={reference}
                    />);
                    break;
            }
        }
    }

    @EventHandler<ConversationUIEvents>("notify_selected_chat")
    private handleNotifySelectedChat(event: ConversationUIEvents["notify_selected_chat"]) {
        if(this.currentChatId === event.chatId)
            return;

        this.currentChatId = event.chatId;
        this.chatEvents = [];

        if(this.currentChatId === "unselected") {
            this.setState({ mode: "unselected" });
        } else {
            this.props.events.fire("query_conversation_state", {
                chatId: this.currentChatId
            });

            this.setState({ mode: "loading" });
        }
    }

    @EventHandler<ConversationUIEvents>("notify_conversation_state")
    private handleConversationStateUpdate(event: ConversationUIEvents["notify_conversation_state"]) {
        if(event.chatId !== this.currentChatId)
            return;

        if(event.state === "no-permissions") {
            this.chatEvents = [];
            this.buildView();
            this.setState({
                mode: "no-permission",
                failedPermission: event.failedPermission
            });
        } else if(event.state === "loading") {
            this.chatEvents = [];
            this.buildView();
            this.setState({
                mode: "loading"
            });
        } else if(event.state === "normal") {
            this.chatFrameMaxMessageCount = event.chatFrameMaxMessageCount;
            this.chatFrameMaxHistoryMessageCount = event.chatFrameMaxMessageCount * 2;
            this.showSwitchEvents = event.showUserSwitchEvents;

            this.unreadTimestamp = event.unreadTimestamp;
            this.chatEvents = event.events.slice(0).filter(e => e.type !== "local-user-switch" || event.showUserSwitchEvents);
            this.sortEvents();
            this.buildView();

            this.scrollOffset = "bottom";
            this.setState({
                mode: "normal",
                isBrowsingHistory: false,

                historyState: event.historyState,
                historyErrorMessage: event.historyErrorMessage,
                historyRetryTimestamp: event.historyRetryTimestamp
            }, () => this.scrollToBottom());
        } else if(event.state === "private") {
            this.chatEvents = [];
            this.buildView();
            this.setState({
                mode: event.crossChannelChatSupported ? "private" : "not-supported"
            });
        } else {
            this.chatEvents = [];
            this.buildView();
            this.setState({
                mode: "error",
                errorMessage: 'errorMessage' in event ? event.errorMessage : tr("Unknown error/Invalid state")
            });
        }
    }

    @EventHandler<ConversationUIEvents>("notify_chat_event")
    private handleChatEvent(event: ConversationUIEvents["notify_chat_event"]) {
        if(event.chatId !== this.currentChatId || this.state.isBrowsingHistory)
            return;

        if(event.event.type === "local-user-switch" && !this.showSwitchEvents)
            return;

        this.chatEvents.push(event.event);
        this.sortEvents();
        if(typeof this.unreadTimestamp === "undefined" && event.triggerUnread)
            this.unreadTimestamp = event.event.timestamp;

        const spliceCount = Math.max(0, this.chatEvents.length - this.chatFrameMaxMessageCount);
        this.chatEvents.splice(0, spliceCount);
        if(spliceCount > 0 && this.state.historyState === "none")
            this.setState({ historyState: "available" });

        this.buildView();
        this.forceUpdate(() => this.scrollToBottom());
    }

    @EventHandler<ConversationUIEvents>("notify_chat_message_delete")
    private handleMessageDeleted(event: ConversationUIEvents["notify_chat_message_delete"]) {
        if(event.chatId !== this.currentChatId)
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
        if (event.chatId !== this.currentChatId || this.unreadTimestamp === undefined)
            return;

        this.unreadTimestamp = undefined;
        this.buildView();
        this.forceUpdate();
    };

    @EventHandler<ConversationUIEvents>("notify_panel_show")
    private handlePanelShow() {
        this.fixScroll();
    }

    @EventHandler<ConversationUIEvents>("query_conversation_history")
    private handleQueryConversationHistory(event: ConversationUIEvents["query_conversation_history"]) {
        if (event.chatId !== this.currentChatId)
            return;

        this.setState({
            historyState: "loading"
        });
    }

    @EventHandler<ConversationUIEvents>("notify_conversation_history")
    private handleNotifyConversationHistory(event: ConversationUIEvents["notify_conversation_history"]) {
        if (event.chatId !== this.currentChatId)
            return;


        clearTimeout(this.historyRetryTimer);
        if(event.state === "error") {
            this.setState({
                historyState: "error",
                historyErrorMessage: event.errorMessage,
                historyRetryTimestamp: event.retryTimestamp
            });

            this.historyRetryTimer = setTimeout(() => {
                this.setState({
                    historyState: "available"
                });
                this.historyRetryTimer = undefined;
            }, event.retryTimestamp - Date.now()) as any;
        } else {
            this.scrollElementPreviousOffset = this.refFirstChatEvent.current ? this.refFirstChatEvent.current.offsetTop - this.refFirstChatEvent.current.parentElement.scrollTop : 0;
            this.scrollEventUniqueId = this.chatEvents[0].uniqueId;

            this.chatEvents.push(...event.events);
            this.sortEvents();

            const spliceCount = Math.max(0, this.chatEvents.length - this.chatFrameMaxHistoryMessageCount);
            this.chatEvents.splice(this.chatFrameMaxHistoryMessageCount, spliceCount);

            this.buildView();
            this.setState({
                isBrowsingHistory: true,
                historyState: event.hasMoreMessages ? "available" : "none",
                historyRetryTimestamp: event.retryTimestamp
            }, () => {
                this.scrollOffset = "element";
                this.fixScroll();
            });
        }
    }
}

export const ConversationPanel = React.memo((props: { events: Registry<ConversationUIEvents>, handlerId: string, messagesDeletable: boolean, noFirstMessageOverlay: boolean }) => {
    const currentChat = useRef({ id: "unselected" });
    const chatEnabled = useRef(false);

    const refChatBox = useRef<ChatBox>();

    const updateChatBox = () => {
        refChatBox.current.setState({ enabled: currentChat.current.id !== "unselected" && chatEnabled.current });
    };

    props.events.reactUse("notify_selected_chat", event => {
        currentChat.current.id = event.chatId;
        updateChatBox();
    });
    props.events.reactUse("notify_conversation_state", event => {
        chatEnabled.current = event.state === "normal" && event.sendEnabled;
        updateChatBox();
    });
    props.events.reactUse("notify_send_enabled", event => {
        if(event.chatId !== currentChat.current.id)
            return;

        chatEnabled.current = event.enabled;
        updateChatBox();
    });
    props.events.reactUse("action_focus_chat", () => refChatBox.current?.events.fire("action_request_focus"));

    useEffect(() => {
        return refChatBox.current.events.on("notify_typing", () => props.events.fire("action_self_typing", { chatId: currentChat.current.id }));
    });

    return <div className={cssStyle.panel}>
        <ConversationMessages events={props.events} handlerId={props.handlerId} messagesDeletable={props.messagesDeletable} noFirstMessageOverlay={props.noFirstMessageOverlay} />
        <ChatBox
            ref={refChatBox}
            onSubmit={text => props.events.fire("action_send_message", { chatId: currentChat.current.id, text: text }) }
        />
    </div>
});
