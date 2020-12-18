import {SideHeaderEvents, SideHeaderState} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {Registry} from "tc-shared/events";
import {SideHeaderRenderer} from "tc-shared/ui/frames/side/HeaderRenderer";
import {SideBarEvents, SideBarType, SideBarTypeData} from "tc-shared/ui/frames/SideBarDefinitions";
import {useContext, useState} from "react";
import {ClientInfoRenderer} from "tc-shared/ui/frames/side/ClientInfoRenderer";
import {PrivateConversationsPanel} from "tc-shared/ui/frames/side/PrivateConversationRenderer";
import {ChannelBarRenderer} from "tc-shared/ui/frames/side/ChannelBarRenderer";
import {LogCategory, logWarn} from "tc-shared/log";
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

const SideBarFrame = (props: { type: SideBarType }) => {
    switch (props.type) {
        case "channel":
            return <ContentRendererChannel key={props.type} />;

        case "private-chat":
            return <ContentRendererPrivateConversation key={props.type} />;

        case "client-info":
            return <ContentRendererClientInfo key={props.type} />;

        case "music-manage":
            /* TODO! */

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
    eventsHeader: Registry<SideHeaderEvents>
}) => {
    const [ content, setContent ] = useState<SideBarType>(() => {
        props.events.fire("query_content");
        return "none";
    });
    props.events.reactUse("notify_content", event => setContent(event.content));

    return (
        <EventContent.Provider value={props.events}>
            <div className={cssStyle.container}>
                <SideBarHeader eventsHeader={props.eventsHeader} type={content} />
                <div className={cssStyle.frameContainer}>
                    <SideBarFrame type={content} />
                </div>
            </div>
        </EventContent.Provider>
    )
};