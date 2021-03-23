import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {
    ClientCountryInfo,
    ClientForumInfo,
    ClientGroupInfo,
    ClientInfoEvents,
    ClientInfoOnline,
    ClientStatusInfo,
    ClientVersionInfo,
    ClientVolumeInfo,
    OptionalClientInfoInfo
} from "tc-shared/ui/frames/side/ClientInfoDefinitions";
import {Registry} from "tc-shared/events";
import {ClientAvatar, getGlobalAvatarManagerFactory} from "tc-shared/file/Avatars";
import {AvatarRenderer} from "tc-shared/ui/react-elements/Avatar";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import {guid} from "tc-shared/crypto/uid";
import {useDependentState} from "tc-shared/ui/react-elements/Helper";
import {format_online_time} from "tc-shared/utils/TimeUtils";
import {ClientIcon} from "svg-sprites/client-icons";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {getIconManager} from "tc-shared/file/Icons";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {CountryCode} from "tc-shared/ui/react-elements/CountryCode";

const cssStyle = require("./ClientInfoRenderer.scss");

const EventsContext = React.createContext<Registry<ClientInfoEvents>>(undefined);
const ClientContext = React.createContext<OptionalClientInfoInfo>(undefined);

const Avatar = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);

    let avatar: "loading" | ClientAvatar;
    if(client.type === "none") {
        avatar = "loading";
    } else {
        avatar = getGlobalAvatarManagerFactory().getManager(client.handlerId).resolveClientAvatar({ id: client.clientId, clientUniqueId: client.clientUniqueId, database_id: client.clientDatabaseId });
    }

    return (
        <div className={cssStyle.containerAvatar + " " + (client.type === "self" ? cssStyle.editable : undefined)}>
            <div className={cssStyle.avatar}>
                <AvatarRenderer avatar={avatar} className={cssStyle.avatarImage + " " + (avatar === "loading" ? cssStyle.loading : "")} />
            </div>
            <div className={cssStyle.edit} onClick={() => events.fire("action_edit_avatar")}>
                <ClientIconRenderer icon={ClientIcon.AvatarUpload} className={cssStyle.icon} />
            </div>
        </div>
    )
});

const ClientName = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);

    const [ name, setName ] = useDependentState<string | null>(() => {
        if(client.type !== "none") {
            events.fire("query_client_name");
        }

        return null;
    }, [ client.contextHash ]);

    events.reactUse("notify_client_name", event => setName(event.name), undefined, []);

    return (
        <div className={cssStyle.clientName}>
            {name === null || client.type === "none" ?
                <div key={"loading"} className={cssStyle.htmltag}><Translatable>loading</Translatable> <LoadingDots /></div> :
                <ClientTag className={cssStyle.htmltag} clientName={name} clientUniqueId={client.clientUniqueId} handlerId={client.handlerId} key={"info-" + client.clientUniqueId + "-" + name} />
            }
        </div>
    );
});

const ClientDescription = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ description, setDescription ] = useDependentState<string | null | undefined>(() => {
        if(client.type !== "none") {
            events.fire("query_client_description");
        }

        return null;
    }, [ client.contextHash ]);

    events.reactUse("notify_client_description", event => {
        setDescription(event.description ? event.description : null);
    }, undefined, []);

    return (
        <div className={cssStyle.containerDescription}>
            {description === undefined || description === null ?
                null :
                <div key={"description"} className={cssStyle.description}>{description}</div>
            }
        </div>
    );
});

const InfoBlock = (props: { imageUrl?: string, clientIcon?: ClientIcon, children: [React.ReactElement, React.ReactElement], valueClass?: string }) => {
    return (
        <div className={cssStyle.containerProperty}>
            <div className={cssStyle.icon}>
                {props.imageUrl ? <img alt={""} src={props.imageUrl} /> : <ClientIconRenderer icon={props.clientIcon} />}
            </div>
            <div className={cssStyle.property}>
                <div className={cssStyle.title}>{props.children[0]}</div>
                <div className={cssStyle.value + " " + props.valueClass}>{props.children[1]}</div>
            </div>
        </div>
    )
};

const ClientOnlineSince = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ onlineInfo, setOnlineInfo ] = useDependentState<ClientInfoOnline>(() => {
        if(client.type !== "none") {
            events.fire("query_online");
        }

        return undefined;
    }, [ client.contextHash ]);
    const [ revision, setRevision ] = useState(0);

    events.reactUse("notify_online", event => setOnlineInfo(event.status), undefined, []);

    let onlineBody;
    if(client.type === "none" || !onlineInfo) {
        onlineBody = <React.Fragment key={"loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>;
    } else if(onlineInfo.joinTimestamp === 0) {
        onlineBody = <React.Fragment key={"invalid"}><Translatable>Join timestamp not logged</Translatable></React.Fragment>;
    } else if(onlineInfo.leaveTimestamp === 0) {
        const onlineTime = Date.now() / 1000 - onlineInfo.joinTimestamp;
        onlineBody = <React.Fragment key={"value-live"}>{format_online_time(onlineTime)}</React.Fragment>;
    } else {
        const onlineTime = onlineInfo.leaveTimestamp - onlineInfo.joinTimestamp;
        onlineBody = <React.Fragment key={"value-disconnected"}>{format_online_time(onlineTime)} (<Translatable>left view</Translatable>)</React.Fragment>;
    }

    useEffect(() => {
        if(!onlineInfo || onlineInfo.leaveTimestamp !== 0 || onlineInfo.joinTimestamp === 0) {
            return;
        }

        const timeout = setTimeout(() => setRevision(revision + 1), 900);
        return () => clearTimeout(timeout);
    });

    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoOnlineTime}>
            <Translatable>Online since</Translatable>
            {onlineBody}
        </InfoBlock>
    );
});

const ClientCountry = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ country, setCountry ] = useDependentState<ClientCountryInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_country");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_country", event => setCountry(event.country), undefined, []);

    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoCountry}>
            <Translatable>Country</Translatable>
            <CountryCode alphaCode={country?.flag} className={cssStyle.country} />
        </InfoBlock>
    );
});

const ClientVolume = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ volume, setVolume ] = useDependentState<ClientVolumeInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_volume");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_volume", event => setVolume(event.volume), undefined, []);

    if(client.type === "self" || client.type === "none") {
        return null;
    }

    let body;
    if(volume) {
        let text = (volume.volume * 100).toFixed(0) + "%";
        if(volume.muted) {
            text += " (" + tr("Muted") + ")";
        }
        body = <React.Fragment key={"value"}>{text}</React.Fragment>;
    } else {
        body = <React.Fragment key={"loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>;
    }

    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoVolume} key={"volume"}>
            <Translatable>Volume</Translatable>
            {body}
        </InfoBlock>
    );
});

const ClientForumAccount = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ forum, setForum ] = useDependentState<ClientForumInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_forum");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_forum", event => setForum(event.forum), undefined, []);

    if(!forum) {
        return null;
    }

    let text = forum.nickname;
    if((forum.flags & 0x01) > 0) {
        text += " (" + tr("Banned") + ")";
    }

    if((forum.flags & 0x02) > 0) {
        text += " (" + tr("Stuff") + ")";
    }

    if((forum.flags & 0x04) > 0) {
        text += " (" + tr("Premium") + ")";
    }


    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoForumAccount} valueClass={cssStyle.clientTeaforoAccount}>
            <Translatable>TeaSpeak Forum account</Translatable>
            <a href={"https://forum.teaspeak.de/index.php?members/" + forum.userId} target={"_blank"}>{text}</a>
        </InfoBlock>
    );
});

const ClientVersion = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ version, setVersion ] = useDependentState<ClientVersionInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_version");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_version", event => setVersion(event.version), undefined, []);

    let body;
    if(version) {
        let platform = version.platform;
        if(platform.indexOf("Win32") != 0 && (version.version.indexOf("Win64") != -1 || version.version.indexOf("WOW64") != -1)) {
            platform = platform.replace("Win32", "Win64");
        }

        body = <span title={version.version} key={"value"}>{version.version.split(" ")[0]} on {platform}</span>;
    } else {
        body = <React.Fragment key={"loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>;
    }

    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoVersion}>
            <Translatable>Version</Translatable>
            {body}
        </InfoBlock>
    );
});

const ClientStatusEntry = (props: { icon: ClientIcon, children: React.ReactElement }) => (
    <div className={cssStyle.statusEntry}>
        <ClientIconRenderer icon={props.icon} className={cssStyle.icon} />
        {props.children}
    </div>
);

const ClientStatus = React.memo(() => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ status, setStatus ] = useDependentState<ClientStatusInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_status");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_status", event => setStatus(event.status), undefined, []);

    let elements = [];
    if(status) {
        if(status.away) {
            let message = typeof status.away === "string" ? " (" + status.away + ")" : undefined;
            elements.push(<ClientStatusEntry key={"away"} icon={ClientIcon.Away}><><Translatable>Away</Translatable> {message}</></ClientStatusEntry>);
        }

        if(status.speakerDisabled) {
            elements.push(<ClientStatusEntry key={"hardwareoutputmuted"} icon={ClientIcon.HardwareOutputMuted}><Translatable>Speakers/Headphones disabled</Translatable></ClientStatusEntry>);
        }

        if(status.microphoneDisabled) {
            elements.push(<ClientStatusEntry key={"hardwareinputmuted"} icon={ClientIcon.HardwareInputMuted}><Translatable>Microphone disabled</Translatable></ClientStatusEntry>);
        }

        if(status.speakerMuted) {
            elements.push(<ClientStatusEntry key={"outputmuted"} icon={ClientIcon.OutputMuted}><Translatable>Speakers/Headphones Muted</Translatable></ClientStatusEntry>);
        }

        if(status.microphoneMuted) {
            elements.push(<ClientStatusEntry key={"inputmuted"} icon={ClientIcon.InputMuted}><Translatable>Microphone Muted</Translatable></ClientStatusEntry>);
        }
    }

    if(elements.length === 0) {
        return null;
    }

    return (
        <InfoBlock clientIcon={ClientIcon.ClientInfoStatus} key={"status"} valueClass={cssStyle.status}>
            <Translatable>Status</Translatable>
            <>{elements}</>
        </InfoBlock>
    );
});

const FullInfoButton = () => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ onlineInfo, setOnlineInfo ] = useDependentState<ClientInfoOnline>(() => {
        if(client.type !== "none") {
            events.fire("query_online");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_online", event => setOnlineInfo(event.status), undefined, []);

    if(!onlineInfo || onlineInfo.leaveTimestamp !== 0) {
        return null;
    }

    return (
        <div className={cssStyle.buttonMore} onClick={() => events.fire("action_show_full_info")} key={"button"}>
            <Translatable>Full Info</Translatable>
        </div>
    );
}

const GroupRenderer = (props: { group: ClientGroupInfo }) => {
    const icon = getIconManager().resolveIcon(props.group.groupIcon.iconId, props.group.groupIcon.serverUniqueId, props.group.groupIcon.handlerId);
    return (
        <div className={cssStyle.groupEntry} title={tra("Group {}", props.group.groupId)}>
            <RemoteIconRenderer icon={icon} className={cssStyle.icon} />
            {props.group.groupName}
        </div>
    )
};

const ChannelGroupRenderer = () => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ channelGroup, setChannelGroup ] = useDependentState<ClientGroupInfo>(() => {
        if(client.type !== "none") {
            events.fire("query_channel_group");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_channel_group", event => setChannelGroup(event.group), undefined, []);

    let body;
    if(channelGroup) {
        body = <GroupRenderer group={channelGroup} key={"group-" + channelGroup.groupId} />;
    } else {
        body = <React.Fragment key={"loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>;
    }

    return (
        <InfoBlock clientIcon={ClientIcon.PermissionServerGroups} valueClass={cssStyle.groups}>
            <Translatable>Channel group</Translatable>
            <>{body}</>
        </InfoBlock>
    );
};

const ServerGroupRenderer = () => {
    const events = useContext(EventsContext);
    const client = useContext(ClientContext);
    const [ serverGroups, setServerGroups ] = useDependentState<ClientGroupInfo[]>(() => {
        if(client.type !== "none") {
            events.fire("query_server_groups");
        }

        return undefined;
    }, [ client.contextHash ]);

    events.reactUse("notify_server_groups", event => setServerGroups(event.groups), undefined, []);

    let body;
    if(serverGroups) {
        body = serverGroups.map(group => <GroupRenderer group={group} key={"group-" + group.groupId} />);
    } else {
        body = <React.Fragment key={"loading"}><Translatable>loading</Translatable> <LoadingDots /></React.Fragment>;
    }

    return (
        <InfoBlock clientIcon={ClientIcon.PermissionChannel} valueClass={cssStyle.groups}>
            <Translatable>Server groups</Translatable>
            <>{body}</>
        </InfoBlock>
    );
};

const ConnectedClientInfoBlock = () => {
    const client = useContext(ClientContext);
    if(client.type === "query" || client.type === "none") {
        return null;
    }

    return (
        <React.Fragment key={"info"}>
            <ClientOnlineSince />
            <ClientCountry />
            <ClientForumAccount />
            <ClientVolume />
            <ClientVersion />
            <ClientStatus />
        </React.Fragment>
    );
}

const ClientInfoProvider = () => {
    const events = useContext(EventsContext);

    const [ client, setClient ] = useState<OptionalClientInfoInfo>(() => {
        events.fire("query_client");
        return { type: "none", contextHash: guid() };
    });
    events.reactUse("notify_client", event => {
        if(event.info) {
            setClient({
                contextHash: guid(),
                type: event.info.type,
                handlerId: event.info.handlerId,
                clientUniqueId: event.info.clientUniqueId,
                clientId: event.info.clientId,
                clientDatabaseId: event.info.clientDatabaseId
            });
        } else if(client.type !== "none") {
            setClient({ type: "none", contextHash: guid() });
        }
    });

    return (
        <ClientContext.Provider value={client} >
            <div className={cssStyle.container}>
                <div className={cssStyle.heading}>
                    <Avatar />
                    <ClientName />
                    <ClientDescription />
                </div>
                <div className={cssStyle.generalInfo}>
                    <div className={cssStyle.block + " " + cssStyle.blockLeft}>
                        <ConnectedClientInfoBlock />
                    </div>
                    <div className={cssStyle.block + " " + cssStyle.blockRight}>
                        <ChannelGroupRenderer />
                        <ServerGroupRenderer />
                    </div>
                </div>
                <FullInfoButton />
            </div>
        </ClientContext.Provider>
    );
}

export const ClientInfoRenderer = (props: { events: Registry<ClientInfoEvents> }) => (
    <EventsContext.Provider value={props.events}>
        <ClientInfoProvider />
    </EventsContext.Provider>
);