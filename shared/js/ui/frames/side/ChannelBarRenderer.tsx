import {Registry} from "tc-shared/events";
import {ChannelBarMode, ChannelBarModeData, ChannelBarUiEvents} from "tc-shared/ui/frames/side/ChannelBarDefinitions";
import {useContext, useState} from "react";
import * as React from "react";
import {ConversationPanel} from "tc-shared/ui/frames/side/AbstractConversationRenderer";
import {useDependentState} from "tc-shared/ui/react-elements/Helper";
import {ChannelDescriptionRenderer} from "tc-shared/ui/frames/side/ChannelDescriptionRenderer";

const EventContext = React.createContext<Registry<ChannelBarUiEvents>>(undefined);
const ChannelContext = React.createContext<{ channelId: number, handlerId: string }>(undefined);

function useModeData<T extends ChannelBarMode>(type: T, dependencies: any[]) : ChannelBarModeData[T] {
    const events = useContext(EventContext);
    const [ contentData, setContentData ] = useDependentState(() => {
        events.fire("query_data", { mode: type });
        return undefined;
    }, dependencies);
    events.reactUse("notify_data", event => event.content === type && setContentData(event.data));

    return contentData;
}

const ModeRenderer = () => {
    const events = useContext(EventContext);
    const channelContext = useContext(ChannelContext);
    const [ mode, setMode ] = useDependentState<ChannelBarMode>(() => {
        events.fire("query_mode");
        return "none";
    }, [ channelContext.channelId, channelContext.handlerId ]);
    events.reactUse("notify_mode", event => setMode(event.mode));

    switch (mode) {
        case "conversation":
            return <ModeRendererConversation key={"conversation"} />;

        case "description":
            return <ModeRendererDescription key={"description"} />;

        case "file-transfer":
            /* TODO! */
            return null;

        case "none":
        default:
            return null;
    }
};

const ModeRendererConversation = React.memo(() => {
    const channelContext = useContext(ChannelContext);
    const data = useModeData("conversation", [ channelContext ]);
    if(!data) { return null; }

    return (
        <ConversationPanel
            key={"conversation"}
            events={data.events}
            handlerId={channelContext.handlerId}
            messagesDeletable={true}
            noFirstMessageOverlay={false}
        />
    );
});

const ModeRendererDescription = React.memo(() => {
    const channelContext = useContext(ChannelContext);
    const data = useModeData("description", [ channelContext ]);
    if(!data) { return null; }

    return (
        <ChannelDescriptionRenderer events={data.events} />
    );
});

export const ChannelBarRenderer = (props: { events: Registry<ChannelBarUiEvents> }) => {
    const [ channelContext, setChannelContext ] = useState<{ channelId: number, handlerId: string }>(() => {
        props.events.fire("query_channel_id");
        return { channelId: -1, handlerId: "unbound" };
    });
    props.events.reactUse("notify_channel_id", event => setChannelContext({ handlerId: event.handlerId, channelId: event.channelId }));

    return (
        <EventContext.Provider value={props.events}>
            <ChannelContext.Provider value={channelContext}>
                <ModeRenderer />
            </ChannelContext.Provider>
        </EventContext.Provider>
    );
}