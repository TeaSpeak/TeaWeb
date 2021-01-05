import * as React from "react";
import {Registry} from "tc-shared/events";
import {
    SideHeaderEvents,
    SideHeaderState,
    SideHeaderChannelState,
    SideHeaderPingInfo, PrivateConversationInfo, SideHeaderServerInfo
} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {useContext, useState} from "react";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {getIconManager} from "tc-shared/file/Icons";

const StateContext = React.createContext<SideHeaderState>(undefined);
const EventsContext = React.createContext<Registry<SideHeaderEvents>>(undefined);


const cssStyle = require("./HeaderRenderer.scss");

const Block = (props: { children: [React.ReactElement, React.ReactElement], target: "left" | "right" }) => (
    <div className={cssStyle.block + " " + cssStyle[props.target]}>
        <div className={cssStyle.title}>{props.children[0]}</div>
        {props.children[1]}
    </div>
)

const ChannelStateRenderer = (props: { info: SideHeaderChannelState }) => {
    if(props.info.state === "not-connected") {
        return <div className={cssStyle.value} key={"not-connected"}><Translatable>Not connected</Translatable></div>;
    } else {
        let limit;
        if(props.info.channelMaxUser === -1) {
            limit = <Translatable key={"unlimited"}>Unlimited</Translatable>
        } else {
            limit = props.info.channelMaxUser;
        }

        let icon;
        if(props.info.channelIcon.iconId !== 0) {
            const remoteIcon = getIconManager().resolveIcon(props.info.channelIcon.iconId, props.info.channelIcon.serverUniqueId, props.info.channelIcon.handlerId);
            icon = <RemoteIconRenderer icon={remoteIcon} className={cssStyle.icon} key={"icon-" + props.info.channelIcon.iconId} />;
        }

        return (
            <React.Fragment key={"connected"}>
                <div className={cssStyle.value}>{icon}{props.info.channelName}</div>
                <div className={cssStyle.smallValue}>{props.info.channelUserCount} / {limit}</div>
            </React.Fragment>
        );
    }
}

const BlockChannelState = (props: { mode: "voice" | "text" }) => {
    const events = useContext(EventsContext);
    const [ info, setInfo ] = useState<SideHeaderChannelState>(() => {
        events.fire("query_current_channel_state", { mode: props.mode });
        return { state: "not-connected" };
    });

    events.reactUse("notify_current_channel_state", event => event.mode === props.mode && setInfo(event.state));

    let title;
    if(props.mode === "voice") {
        title = <Translatable key={"voice"}>You're talking in Channel</Translatable>;
    } else {
        title = <Translatable key={"text"}>You're chatting in Channel</Translatable>;
    }

    return (
        <Block target={"left"}>
            {title}
            <ChannelStateRenderer info={info} />
        </Block>
    );
}

const ServerInfoRenderer = React.memo((props: { info: SideHeaderServerInfo | undefined }) => {
    if(!props.info) {
        return <div className={cssStyle.value} key={"not-connected"}><Translatable>Not connected</Translatable></div>;
    }

    let icon;
    if(props.info.icon.iconId !== 0) {
        const remoteIcon = getIconManager().resolveIcon(props.info.icon.iconId, props.info.icon.serverUniqueId, props.info.icon.handlerId);
        icon = <RemoteIconRenderer icon={remoteIcon} className={cssStyle.icon} key={"icon-" + props.info.icon.iconId} />;
    }

    return (
        <div className={cssStyle.value} key={"connected"}>{icon}{props.info.name}</div>
    );
});

const BlockServerState = () => {
    const events = useContext(EventsContext);
    const [ info, setInfo ] = useState<SideHeaderServerInfo | undefined>(() => {
        events.fire("query_server_info");
        return undefined;
    });

    events.reactUse("notify_server_info", event => setInfo(event.info));
    return (
        <Block target={"left"}>
            <Translatable>You're chatting on Server</Translatable>
            <ServerInfoRenderer info={info} />
        </Block>
    );
}

const BlockPing = () => {
    const events = useContext(EventsContext);
    const [ pingInfo, setPingInfo ] = useState<SideHeaderPingInfo>(() => {
        events.fire("query_ping");
        return undefined;
    });

    events.reactUse("notify_ping", event => setPingInfo(event.ping));

    let value, title;
    if(!pingInfo) {
        value = (
            <div className={cssStyle.value} key={"not-connected"} title={tr("You're not connected to any server")}>
                <Translatable>Not connected</Translatable>
            </div>
        );
    } else {
        let pingClass;
        if(pingInfo.native <= 30) {
            pingClass = cssStyle.veryGood;
        } else if(pingInfo.native <= 50) {
            pingClass = cssStyle.good;
        } else if(pingInfo.native <= 90) {
            pingClass = cssStyle.medium;
        } else if(pingInfo.native <= 200) {
            pingClass = cssStyle.poor;
        } else {
            pingClass = cssStyle.veryPoor;
        }

        if(pingInfo.javaScript === undefined) {
            title = tra("Ping: {}ms", pingInfo.native.toFixed(3));
        } else {
            title = tra("Native: {}ms\nJavascript: {}ms", pingInfo.native.toFixed(3), pingInfo.javaScript.toFixed(3));
        }
        value = <div className={cssStyle.value + " " + cssStyle.ping + " " + pingClass} key={"ping"} title={title}>{pingInfo.native.toFixed(0)}ms</div>;
    }

    return (
        <Block target={"right"}>
            <Translatable>Your Ping</Translatable>
            {value}
        </Block>
    );
};

const BlockPrivateChats = (props: { asButton: boolean }) => {
    const events = useContext(EventsContext);
    const [ info, setInfo ] = useState<PrivateConversationInfo>(() => {
        events.fire("query_private_conversations");
        return { unread: 0, open: 0 };
    });

    events.reactUse("notify_private_conversations", event => setInfo(event.info));

    let body;
    if(info.open === 0) {
        body = <Translatable key={"no-conversations"}>No conversations</Translatable>;
    } else if(info.open === 1) {
        body = <Translatable key={"1-conversations"}>One conversation</Translatable>;
    } else {
        body = <VariadicTranslatable text={"{} conversations"} key={"n-conversations"}>{info.open}</VariadicTranslatable>;
    }

    let title;
    if(info.unread === 0) {
        title = <Translatable key={"zero"}>Private Chats</Translatable>;
    } else {
        title = (
            <React.Fragment key={"unread"}>
                <Translatable>Private Chats</Translatable>
                <div className={cssStyle.containerIndicator}>
                    {info.unread}
                </div>
            </React.Fragment>
        )
    }

    return (
        <Block target={"right"}>
            {title}
            <div className={cssStyle.value + " " + (props.asButton ? cssStyle.button : "")} onClick={() => props.asButton && events.fire("action_open_conversation")}>
                {body}
            </div>
        </Block>
    );
}

const BlockButtonSwitchToChannelChat = () => {
    const events = useContext(EventsContext);
    return (
        <Block target={"left"}>
            <>&nbsp;</>
            <div className={cssStyle.value + " " + cssStyle.button} onClick={() => events.fire("action_switch_channel_chat")}>
                <Translatable>Switch to channel chat</Translatable>
            </div>
        </Block>
    )
}

const BlockButtonOpenConversation = () => {
    const events = useContext(EventsContext);
    return (
        <Block target={"right"}>
            <>&nbsp;</>
            <div className={cssStyle.value + " " + cssStyle.button} onClick={() => events.fire("action_open_conversation")}>
                <Translatable>Open conversation</Translatable>
            </div>
        </Block>
    )
}

const BlockButtonBotManage = () => {
    const events = useContext(EventsContext);
    return (
        <Block target={"left"}>
            <>&nbsp;</>
            <div className={cssStyle.value + " " + cssStyle.button} onClick={() => events.fire("action_bot_manage")}>
                <Translatable>Manage bot</Translatable>
            </div>
        </Block>
    )
}

const BlockButtonBotSongAdd = () => {
    const events = useContext(EventsContext);
    return (
        <Block target={"right"}>
            <>&nbsp;</>
            <div className={cssStyle.value + " " + cssStyle.button + " " + cssStyle.botAddSong} onClick={() => events.fire("action_bot_add_song")}>
                <Translatable>Add song</Translatable>
            </div>
        </Block>
    )
}


const BlockTopLeft = () => <BlockChannelState mode={"voice"} />;
const BlockTopRight = () => <BlockPing />;

const BlockBottomLeft = () => {
    const state = useContext(StateContext);

    switch (state.state) {
        case "conversation":
            if(state.mode === "private") {
                return <BlockButtonSwitchToChannelChat key={"switch-channel-chat"} />;
            } else if(state.mode === "server") {
                return <BlockServerState key={"server"} />
            } else {
                return <BlockChannelState mode={"text"} key={"text-state"} />;
            }

        case "music-bot":
            return <BlockButtonBotManage key={"button-manage-bot"} />;

        case "none":
        case "client":
        default:
            return null;
    }
}

const BlockBottomRight = () => {
    const events = useContext(EventsContext);
    const state = useContext(StateContext);

    const [ ownClient, setOwnClient ] = useState(() => {
        events.fire("query_client_info_own_client");
        return false;
    });

    events.reactUse("notify_client_info_own_client", event => setOwnClient(event.isOwnClient));

    switch (state.state) {
        case "client":
            if(ownClient) {
                return null;
            } else {
                return <BlockButtonOpenConversation key={"button-open-conversation"} />;
            }

        case "conversation":
            return <BlockPrivateChats key={"conversation"} asButton={state.mode !== "private"} />;

        case "music-bot":
            return <BlockButtonBotSongAdd key={"button-add-song"} />;

        case "none":
        default:
            return null;
    }
}

export const SideHeaderRenderer = React.memo((props: { events: Registry<SideHeaderEvents>, state: SideHeaderState }) => {
    return (
        <EventsContext.Provider value={props.events}>
            <StateContext.Provider value={props.state}>
                <div className={cssStyle.container}>
                    <div className={cssStyle.lane}>
                        <BlockTopLeft />
                        <BlockTopRight />
                    </div>
                    <div className={cssStyle.lane + " " + (props.state.state === "music-bot" ? cssStyle.musicBotInfo : "")}>
                        <BlockBottomLeft />
                        <BlockBottomRight />
                    </div>
                </div>
            </StateContext.Provider>
        </EventsContext.Provider>
    );
})