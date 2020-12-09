import {SideHeaderEvents, SideHeaderState} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {Registry} from "tc-shared/events";
import React = require("react");
import {SideHeaderRenderer} from "tc-shared/ui/frames/side/HeaderRenderer";
import {ConversationPanel} from "tc-shared/ui/frames/side/AbstractConversationRenderer";
import {SideBarEvents, SideBarType, SideBarTypeData} from "tc-shared/ui/frames/SideBarDefinitions";
import {useContext, useState} from "react";
import {ClientInfoRenderer} from "tc-shared/ui/frames/side/ClientInfoRenderer";
import {PrivateConversationsPanel} from "tc-shared/ui/frames/side/PrivateConversationRenderer";

const cssStyle = require("./SideBar.scss");

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

const ContentRendererChannelConversation = () => {
    const contentData = useContentData("channel-chat");
    if(!contentData) { return null; }

    return (
        <ConversationPanel
            key={"channel-chat"}
            events={contentData.events}
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

const SideBarFrame = (props: { type: SideBarType }) => {
    switch (props.type) {
        case "channel-chat":
            return <ContentRendererChannelConversation key={props.type} />;

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

        case "channel-chat":
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
    }

    return <SideHeaderRenderer state={headerState} events={props.eventsHeader} />;
}

export const SideBarRenderer = (props: {
    handlerId: string,
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