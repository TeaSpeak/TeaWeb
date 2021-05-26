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
import {useRegistry} from "tc-shared/ui/react-elements/Helper";

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
    const events = useRegistry(contentData?.events);

    if(!contentData || !events) { return null; }

    return (
        <ChannelBarRenderer
            key={"channel"}
            events={events}
        />
    );
};

const ContentRendererServer = () => {
    const contentData = useContentData("server");
    const events = useRegistry(contentData?.chatEvents);

    if(!contentData || !events) { return null; }

    return (
        <ConversationPanel
            key={"server"}
            events={events}
            handlerId={contentData.handlerId}
            messagesDeletable={true}
            noFirstMessageOverlay={false}
            popoutable={true}
        />
    );
};

const ContentRendererPrivateConversation = () => {
    const contentData = useContentData("private-chat");
    const events = useRegistry(contentData?.events);

    if(!contentData || !events) { return null; }

    return (
        <PrivateConversationsPanel
            events={events}
            handlerId={contentData.handlerId}
        />
    );
};

const ContentRendererClientInfo = () => {
    const contentData = useContentData("client-info");
    const events = useRegistry(contentData?.events);
    if(!contentData || !events) { return null; }

    return (
        <ClientInfoRenderer
            events={events}
        />
    );
};

const ContentRendererMusicManage = () => {
    const contentData = useContentData("music-manage");
    const botEvents = useRegistry(contentData?.botEvents);
    const playlistEvents = useRegistry(contentData?.playlistEvents);
    if(!contentData || !botEvents || !playlistEvents) { return null; }

    return (
        <MusicBotRenderer
            botEvents={botEvents}
            playlistEvents={playlistEvents}
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