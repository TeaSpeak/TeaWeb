import {SideHeaderEvents, SideHeaderState} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {Registry} from "tc-shared/events";
import {SideHeaderRenderer} from "tc-shared/ui/frames/side/HeaderRenderer";
import {SideBarEvents, SideBarType, SideBarTypeData} from "tc-shared/ui/frames/SideBarDefinitions";
import {useContext, useState} from "react";
import {ClientInfoRenderer} from "tc-shared/ui/frames/side/ClientInfoRenderer";
import {PrivateConversationsPanel} from "tc-shared/ui/frames/side/PrivateConversationRenderer";
import {ChannelBarRenderer} from "tc-shared/ui/frames/side/ChannelBarRenderer";
import {LogCategory, logWarn} from "tc-shared/log";
import {ErrorBoundary} from "tc-shared/ui/react-elements/ErrorBoundary";
import {MusicBotRenderer} from "tc-shared/ui/frames/side/MusicBotRenderer";
import {ConversationPanel} from "tc-shared/ui/frames/side/AbstractConversationRenderer";
import React = require("react");

const cssStyle = require("./SideBarRenderer.scss");

const EventContent = React.createContext<Registry<SideBarEvents>>(undefined);

function useContentData<T extends SideBarType>(type: T) : SideBarTypeData[T] {
    const events = useContext(EventContent);
    const [ contentData, setContentData ] = useState(() => {
        events.fire("query_content_data", { content: type });
        return undefined;
    });
    events.reactUse("notify_content_data", event => event.content === type && setContentData(event.data));

    return contentData;
}

const ContentRendererChannel = () => {
    const contentData = useContentData("channel");
    if(!contentData) { return null; }

    return (
        <ChannelBarRenderer
            key={"channel"}
            events={contentData.events}
        />
    );
};

const ContentRendererServer = () => {
    const contentData = useContentData("server");
    if(!contentData) { return null; }

    return (
        <ConversationPanel
            key={"server"}
            events={contentData.chatEvents}
            handlerId={contentData.handlerId}
            messagesDeletable={true}
            noFirstMessageOverlay={false}
        />
    );
};

const ContentRendererPrivateConversation = () => {
    const contentData = useContentData("private-chat");
    if(!contentData) { return null; }

    return (
        <PrivateConversationsPanel
            events={contentData.events}
            handlerId={contentData.handlerId}
        />
    );
};

const ContentRendererClientInfo = () => {
    const contentData = useContentData("client-info");
    if(!contentData) { return null; }

    return (
        <ClientInfoRenderer
            events={contentData.events}
        />
    );
};

const ContentRendererMusicManage = () => {
    const contentData = useContentData("music-manage");
    if(!contentData) { return null; }

    return (
        <MusicBotRenderer
            botEvents={contentData.botEvents}
            playlistEvents={contentData.playlistEvents}
        />
    );
};

const SideBarFrame = (props: { type: SideBarType }) => {
    switch (props.type) {
        case "server":
            return (
                <ErrorBoundary key={props.type}>
                    <ContentRendererServer />
                </ErrorBoundary>
            )
        case "channel":
            return (
                <ErrorBoundary key={props.type}>
                    <ContentRendererChannel />
                </ErrorBoundary>
            );

        case "private-chat":
            return (
                <ErrorBoundary key={props.type}>
                    <ContentRendererPrivateConversation />
                </ErrorBoundary>
            );

        case "client-info":
            return (
                <ErrorBoundary key={props.type}>
                    <ContentRendererClientInfo />
                </ErrorBoundary>
            );

        case "music-manage":
            return (
                <ErrorBoundary key={props.type}>
                    <ContentRendererMusicManage />
                </ErrorBoundary>
            )

        case "none":
        default:
            return null;
    }
}

const SideBarHeader = (props: { type: SideBarType, eventsHeader: Registry<SideHeaderEvents> }) => {
    let headerState: SideHeaderState;
    switch (props.type) {
        case "none":
            headerState = { state: "none" };
            break;

        case "server":
            headerState = { state: "conversation", mode: "server" };
            break;

        case "channel":
            headerState = { state: "conversation", mode: "channel" };
            break;

        case "private-chat":
            headerState = { state: "conversation", mode: "private" };
            break;

        case "client-info":
            headerState = { state: "client" };
            break;

        case "music-manage":
            headerState = { state: "music-bot" };
            break;

        default:
            logWarn(LogCategory.GENERAL, tr("Side bar header with invalid type: %s"), props.type);
            headerState = { state: "none" };
            break;
    }

    return <SideHeaderRenderer state={headerState} events={props.eventsHeader} />;
}

export const SideBarRenderer = (props: {
    events: Registry<SideBarEvents>,
    eventsHeader: Registry<SideHeaderEvents>,
    className?: string
}) => {
    const [ content, setContent ] = useState<SideBarType>(() => {
        props.events.fire("query_content");
        return "none";
    });
    props.events.reactUse("notify_content", event => setContent(event.content));

    return (
        <EventContent.Provider value={props.events}>
            <div className={cssStyle.container + " " + props.className}>
                <ErrorBoundary>
                    <SideBarHeader eventsHeader={props.eventsHeader} type={content} />
                </ErrorBoundary>
                <div className={cssStyle.frameContainer}>
                    <SideBarFrame type={content} />
                </div>
            </div>
        </EventContent.Provider>
    )
};