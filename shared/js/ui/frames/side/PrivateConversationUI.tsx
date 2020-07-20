import * as React from "react";
import {Registry} from "tc-shared/events";
import {
    PrivateConversationInfo,
    PrivateConversationUIEvents
} from "tc-shared/ui/frames/side/PrivateConversationDefinitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ContextDivider} from "tc-shared/ui/react-elements/ContextDivider";
import {ConversationPanel} from "tc-shared/ui/frames/side/ConversationUI";
import {useEffect, useState} from "react";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {AvatarRenderer} from "tc-shared/ui/react-elements/Avatar";
import {TimestampRenderer} from "tc-shared/ui/react-elements/TimestampRenderer";
import {Translatable} from "tc-shared/ui/react-elements/i18n";

const cssStyle = require("./PrivateConversationUI.scss");
const kTypingTimeout = 5000;

const ConversationEntryInfo = React.memo((props: { events: Registry<PrivateConversationUIEvents>, chatId: string, initialNickname: string, lastMessage: number }) => {
    const [ nickname, setNickname ] = useState(props.initialNickname);
    const [ lastMessage, setLastMessage ] = useState(props.lastMessage);
    const [ typingTimestamp, setTypingTimestamp ] = useState(0);

    props.events.reactUse("notify_partner_name_changed", event => {
        if(event.chatId !== props.chatId)
            return;

        setNickname(event.name);
    });

    props.events.reactUse("notify_partner_changed", event => {
        if(event.chatId !== props.chatId)
            return;

        setNickname(event.name);
    });

    props.events.reactUse("notify_chat_event", event => {
        if(event.chatId !== props.chatId)
            return;

        if(event.event.type === "message") {
            if(event.event.timestamp > lastMessage)
                setLastMessage(event.event.timestamp);

            if(!event.event.isOwnMessage)
                setTypingTimestamp(0);
        } else if(event.event.type === "partner-action" || event.event.type === "local-action") {
            setTypingTimestamp(0);
        }
    });

    props.events.reactUse("notify_conversation_state", event => {
        if(event.chatId !== props.chatId || event.state !== "normal")
            return;

        let lastStatedMessage = event.events
                                .filter(e => e.type === "message")
                                .sort((a, b) => a.timestamp - b.timestamp)
                                .last()?.timestamp;
        if(typeof lastStatedMessage === "number" && (typeof lastMessage === "undefined" || lastStatedMessage > lastMessage))
            setLastMessage(lastStatedMessage);
    });

    props.events.reactUse("notify_partner_typing", event => {
        if(event.chatId !== props.chatId)
            return;

        setTypingTimestamp(Date.now());
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

    let lastMessageContent;
    if(isTyping) {
        lastMessageContent = <React.Fragment key={"typing"}><Translatable>Typing</Translatable> <LoadingDots /></React.Fragment>;
    } else if(lastMessage === 0) {
        lastMessageContent = <Translatable key={"no-message"}>No messages</Translatable>;
    } else {
        lastMessageContent = <TimestampRenderer key={"last-message"} timestamp={lastMessage} />;
    }

    return (
        <div className={cssStyle.info}>
            <a className={cssStyle.name}>{nickname}</a>
            <a className={cssStyle.timestamp}>
                {lastMessageContent}
            </a>
        </div>
    );
});
const ConversationEntryUnreadMarker = React.memo((props: { events: Registry<PrivateConversationUIEvents>, chatId: string, initialUnread: boolean }) => {
    const [ unread, setUnread ] = useState(props.initialUnread);

    props.events.reactUse("notify_unread_timestamp_changed", event => {
        if(event.chatId !== props.chatId)
            return;

        setUnread(event.timestamp !== undefined);
    });

    props.events.reactUse("notify_chat_event", event => {
        if(event.chatId !== props.chatId || !event.triggerUnread)
            return;

        setUnread(true);
    });

    if(!unread)
        return null;

    return <div key={"unread-marker"} className={cssStyle.unread} />;
});

const ConversationEntry = React.memo((props: { events: Registry<PrivateConversationUIEvents>, info: PrivateConversationInfo, selected: boolean, connection: ConnectionHandler }) => {
    const [ clientId, setClientId ] = useState(props.info.clientId);

    props.events.reactUse("notify_partner_changed", event => {
        if(event.chatId !== props.info.chatId)
            return;

        props.info.clientId = event.clientId;
        setClientId(event.clientId);
    });

    return (
        <div
            className={cssStyle.conversationEntry + " " + (props.selected ? cssStyle.selected : "")}
            onClick={() => props.events.fire("action_select_chat", { chatId: props.info.chatId })}
        >
            <div className={cssStyle.containerAvatar}>
                <AvatarRenderer className={cssStyle.avatar} avatar={props.connection.fileManager.avatars.resolveClientAvatar({ id: clientId, database_id: 0, clientUniqueId: props.info.uniqueId })} />
                <ConversationEntryUnreadMarker chatId={props.info.chatId} events={props.events} initialUnread={props.info.unreadMessages} />
            </div>
            <ConversationEntryInfo events={props.events} chatId={props.info.chatId} initialNickname={props.info.nickname} lastMessage={props.info.lastMessage} />
            <div className={cssStyle.close} onClick={() => {
                props.events.fire("action_close_chat", { chatId: props.info.chatId });
            }} />
        </div>
    );
});

const OpenConversationsPanel = React.memo((props: { events: Registry<PrivateConversationUIEvents>, connection: ConnectionHandler }) => {
    const [ conversations, setConversations ] = useState<PrivateConversationInfo[] | "loading">(() => {
        props.events.fire("query_private_conversations");
        return "loading";
    });

    const [ selected, setSelected ] = useState("unselected");

    props.events.reactUse("notify_private_conversations", event => {
        setConversations(event.conversations);
        setSelected(event.selected);
    });

    props.events.reactUse("notify_selected_chat", event => {
        setSelected(event.chatId);
    });

    let content;
    if(conversations === "loading") {
        content = (
            <div key={"loading"} className={cssStyle.loading}>
                <div>loading <LoadingDots /></div>
            </div>
        );
    } else if(conversations.length === 0) {
        content = (
            <div key={"no-chats"} className={cssStyle.loading}>
                <div>You&nbsp;dont&nbsp;have any&nbsp;chats&nbsp;yet!</div>
            </div>
        );
    } else {
        content = conversations.map(e => <ConversationEntry
            key={"c-" + e.chatId}
            events={props.events}
            info={e}
            selected={e.chatId === selected}
            connection={props.connection}
        />)
    }

    return (
        <div className={cssStyle.conversationList}>
            {content}
        </div>
    );
});


export const PrivateConversationsPanel = (props: { events: Registry<PrivateConversationUIEvents>, handler: ConnectionHandler }) => (
    <ContextDivider id={"seperator-conversation-list-messages"} direction={"horizontal"} defaultValue={25} separatorClassName={cssStyle.divider}>
        <OpenConversationsPanel events={props.events} connection={props.handler} />
        <ConversationPanel events={props.events as any} handlerId={props.handler.handlerId} noFirstMessageOverlay={true} messagesDeletable={false} />
    </ContextDivider>
);