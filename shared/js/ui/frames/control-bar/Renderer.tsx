import {Registry} from "tc-shared/events";
import {
    AwayState,
    Bookmark,
    ConnectionState,
    ControlBarEvents,
    ControlBarMode,
    HostButtonInfo, MicrophoneDeviceInfo,
    MicrophoneState,
    VideoDeviceInfo,
    VideoState
} from "tc-shared/ui/frames/control-bar/Definitions";
import * as React from "react";
import {useContext, useRef, useState} from "react";
import {DropdownEntry} from "tc-shared/ui/frames/control-bar/DropDown";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/frames/control-bar/Button";
import {spawnContextMenu} from "tc-shared/ui/ContextMenu";
import {ClientIcon} from "svg-sprites/client-icons";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";
import {Settings, settings} from "tc-shared/settings";

const cssStyle = require("./Renderer.scss");
const cssButtonStyle = require("./Button.scss");

const Events = React.createContext<Registry<ControlBarEvents>>(undefined);
const ModeContext = React.createContext<ControlBarMode>(undefined);

const ConnectButton = () => {
    const events = useContext(Events);

    const [ state, setState ] = useState<ConnectionState>(() => {
        events.fire("query_connection_state");
        return undefined;
    });

    events.reactUse("notify_connection_state", event => setState(event.state));

    let subentries = [];
    if(state?.multisession) {
        if(!state.currentlyConnected) {
            subentries.push(
                <DropdownEntry key={"connect-server"} icon={"client-connect"} text={<Translatable>Connect to a server</Translatable>}
                               onClick={() => events.fire("action_connection_connect", { newTab: false })} />
            );
        } else {
            subentries.push(
                <DropdownEntry key={"disconnect-current-a"} icon={"client-disconnect"} text={<Translatable>Disconnect from current server</Translatable>}
                               onClick={() => events.fire("action_connection_disconnect", { generally: false })} />
            );
        }
        if(state.generallyConnected) {
            subentries.push(
                <DropdownEntry key={"disconnect-current-b"} icon={"client-disconnect"} text={<Translatable>Disconnect from all servers</Translatable>}
                               onClick={() => events.fire("action_connection_disconnect", { generally: true })}/>
            );
        }
        subentries.push(
            <DropdownEntry key={"connect-new-tab"} icon={"client-connect"} text={<Translatable>Connect to a server in another tab</Translatable>}
                           onClick={() => events.fire("action_connection_connect", { newTab: true })} />
        );
    }

    if(state?.currentlyConnected) {
        return (
            <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-disconnect"} tooltip={tr("Disconnect from server")}
                    onToggle={() => events.fire("action_connection_disconnect", { generally: false })} key={"connected"}>
                {subentries}
            </Button>
        );
    } else {
        return (
            <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-connect"} tooltip={tr("Connect to a server")}
                    onToggle={() => events.fire("action_connection_connect", { newTab: false })} key={"disconnected"}>
                {subentries}
            </Button>
        );
    }
};

const BookmarkRenderer = (props: { bookmark: Bookmark, refButton: React.RefObject<Button> }) => {
    const events = useContext(Events);

    if(typeof props.bookmark.children !== "undefined") {
        return (
            <DropdownEntry key={props.bookmark.uniqueId} text={props.bookmark.label} >
                {props.bookmark.children.map(entry => <BookmarkRenderer bookmark={entry} key={entry.uniqueId} refButton={props.refButton} />)}
            </DropdownEntry>
        );
    } else {
        return (
            <DropdownEntry key={props.bookmark.uniqueId}
                           icon={props.bookmark.icon}
                           text={props.bookmark.label}
                           onClick={() => events.fire("action_bookmark_connect", { bookmarkUniqueId: props.bookmark.uniqueId, newTab: false })}
                           onAuxClick={event => event.button === 1 && events.fire("action_bookmark_connect", { bookmarkUniqueId: props.bookmark.uniqueId, newTab: true })}
                           onContextMenu={event => {
                               event.preventDefault();

                               props.refButton.current?.setState({ dropdownForceShow: true });
                               spawnContextMenu({ pageY: event.pageY, pageX: event.pageX }, [
                                   {
                                       type: "normal",
                                       icon: ClientIcon.Connect,
                                       label: tr("Connect"),
                                       click: () => events.fire("action_bookmark_connect", { bookmarkUniqueId: props.bookmark.uniqueId, newTab: false })
                                   },
                                   {
                                       type: "normal",
                                       icon: ClientIcon.Connect,
                                       label: tr("Connect in a new tab"),
                                       click: () => events.fire("action_bookmark_connect", { bookmarkUniqueId: props.bookmark.uniqueId, newTab: true })
                                   }
                               ], () => props.refButton.current?.setState({ dropdownForceShow: false }));
                           }}
            />
        );
    }
};

const BookmarkButton = () => {
    const events = useContext(Events);
    const mode = useContext(ModeContext);

    const refButton = useRef<Button>();

    const [ bookmarks, setBookmarks ] = useState<Bookmark[]>(() => {
        events.fire("query_bookmarks");
        return [];
    });

    events.reactUse("notify_bookmarks", event => setBookmarks(event.marks.slice()));

    let entries = [];

    if(mode === "main") {
        entries.push(
            <DropdownEntry icon={"client-bookmark_manager"} text={<Translatable>Manage bookmarks</Translatable>}
                           onClick={() => events.fire("action_bookmark_manage")} key={"manage"} />
        );

        entries.push(
            <DropdownEntry icon={"client-bookmark_add"} text={<Translatable>Add current server to bookmarks</Translatable>}
                           onClick={() => events.fire("action_bookmark_add_current_server")} key={"add"} />
        );
    }

    if(bookmarks.length > 0) {
        if(entries.length > 0) {
            entries.push(<hr key={"hr"} />);
        }

        entries.push(...bookmarks.map(mark => <BookmarkRenderer key={mark.uniqueId} bookmark={mark} refButton={refButton} />));
    }

    return (
        <Button ref={refButton} className={cssButtonStyle.buttonBookmarks + " "  + cssStyle.hideSmallPopout} autoSwitch={false} iconNormal={"client-bookmark_manager"}>
            {entries}
        </Button>
    )
};

const AwayButton = () => {
    const events = useContext(Events);

    const [ state, setState ] = useState<AwayState>(() => {
        events.fire("query_away_state");
        return undefined;
    });

    events.on("notify_away_state", event => setState(event.state));

    let dropdowns = [];
    if(state?.locallyAway) {
        dropdowns.push(<DropdownEntry key={"cgo"} icon={ClientIcon.Present} text={<Translatable>Go online</Translatable>}
                                      onClick={() => events.fire("action_toggle_away", { away: false, globally: false })} />);
    } else {
        dropdowns.push(<DropdownEntry key={"sas"} icon={ClientIcon.Away} text={<Translatable>Set away on this server</Translatable>}
                                      onClick={() => events.fire("action_toggle_away", { away: true, globally: false })} />);
    }
    dropdowns.push(<DropdownEntry key={"sam"} icon={ClientIcon.Away} text={<Translatable>Set away message on this server</Translatable>}
                                  onClick={() => events.fire("action_toggle_away", { away: true, globally: false, promptMessage: true })} />);

    dropdowns.push(<hr key={"-hr"} />);
    if(state?.globallyAway !== "none") {
        dropdowns.push(<DropdownEntry key={"goa"} icon={ClientIcon.Present} text={<Translatable>Go online for all servers</Translatable>}
                                      onClick={() => events.fire("action_toggle_away", { away: false, globally: true })} />);
    }
    if(state?.globallyAway !== "full") {
        dropdowns.push(<DropdownEntry key={"saa"} icon={ClientIcon.Away} text={<Translatable>Set away on all servers</Translatable>}
                                      onClick={() => events.fire("action_toggle_away", { away: true, globally: true })} />);
    }
    dropdowns.push(<DropdownEntry key={"sama"} icon={ClientIcon.Away} text={<Translatable>Set away message for all servers</Translatable>}
                                  onClick={() => events.fire("action_toggle_away", { away: true, globally: true, promptMessage: true })} />);

    return (
        <Button
            autoSwitch={false}
            switched={!!state?.locallyAway}
            iconNormal={ClientIcon.Away}
            iconSwitched={ClientIcon.Present}
            onToggle={target => events.fire("action_toggle_away", { away: target, globally: false })}
        >
            {dropdowns}
        </Button>
    );
};

const VideoDeviceList = React.memo(() => {
    const events = useContext(Events);
    const [ devices, setDevices ] = useState<VideoDeviceInfo[]>(() => {
        events.fire("query_camera_list");
        return [];
    });
    events.reactUse("notify_camera_list", event => setDevices(event.devices));

    if(devices.length === 0) {
        return null;
    }

    return (
        <>
            <hr key={"hr"} />
            {devices.map(device => (
                <DropdownEntry
                    text={device.name || tr("Unknown device name")}
                    key={device.id}
                    onClick={() => events.fire("action_toggle_video", {enable: true, broadcastType: "camera", deviceId: device.id, quickStart: true})}
                />
            ))}
        </>
    );
});

const VideoButton = (props: { type: VideoBroadcastType }) => {
    const events = useContext(Events);

    const [ state, setState ] = useState<VideoState>(() => {
        events.fire("query_video_state", { broadcastType: props.type });
        return "unsupported";
    });

    events.on("notify_video_state", event => event.broadcastType === props.type && setState(event.state));

    let icon: ClientIcon = props.type === "camera" ? ClientIcon.VideoMuted : ClientIcon.ShareScreen;
    switch (state) {
        case "unsupported": {
            let tooltip = props.type === "camera" ? tr("Video broadcasting not supported") : tr("Screen sharing not supported");
            let modalTitle = props.type === "camera" ? tr("Video broadcasting unsupported") : tr("Screen sharing unsupported");
            let modalBody = props.type === "camera" ? tr("Video broadcasting isn't supported by the target server.") : tr("Screen sharing isn't supported by the target server.");
            let dropdownText = props.type === "camera" ? tr("Start video broadcasting") : tr("Start screen sharing");
            return (
                <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={icon} tooltip={tooltip}
                        key={"unsupported"}
                        onToggle={() => createErrorModal(modalTitle, modalBody).open()}
                >
                    <DropdownEntry text={dropdownText} onClick={() => createErrorModal(modalTitle, modalBody).open()} />
                </Button>
            );
        }

        case "unavailable": {
            let tooltip = props.type === "camera" ? tr("Video broadcasting not available") : tr("Screen sharing not available");
            let modalTitle = props.type === "camera" ? tr("Video broadcasting unavailable") : tr("Screen sharing unavailable");
            let modalBody = props.type === "camera" ? tr("Video broadcasting isn't available right now.") : tr("Screen sharing isn't available right now.");
            let dropdownText = props.type === "camera" ? tr("Start video broadcasting") : tr("Start screen sharing");
            return (
                <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={icon} tooltip={tooltip}
                        key={"unavailable"}
                        onToggle={() => createErrorModal(modalTitle, modalBody).open()} >
                    <DropdownEntry text={dropdownText} onClick={() => createErrorModal(modalTitle, modalBody).open()} />
                </Button>
            );
        }

        case "disconnected":
        case "disabled": {
            let tooltip = props.type === "camera" ? tr("Start video broadcasting") : tr("Start screen sharing");
            let dropdownText = props.type === "camera" ? tr("Start video broadcasting") : tr("Start screen sharing");
            return (
                <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={icon}
                        onToggle={() => events.fire("action_toggle_video", {enable: true, broadcastType: props.type, quickStart: settings.getValue(Settings.KEY_VIDEO_QUICK_SETUP)})}
                        tooltip={tooltip} key={"enable"}>
                    <DropdownEntry icon={icon} text={dropdownText} onClick={() => events.fire("action_toggle_video", {enable: true, broadcastType: props.type})} />
                    {props.type === "camera" ? <VideoDeviceList key={"list"} /> : null}
                </Button>
            );
        }

        case "enabled": {
            let tooltip = props.type === "camera" ? tr("Stop video broadcasting") : tr("Stop screen sharing");
            let dropdownTextManage = props.type === "camera" ? tr("Configure/change video broadcasting") : tr("Configure/change screen sharing");
            let dropdownTextStop = props.type === "camera" ? tr("Stop video broadcasting") : tr("Stop screen sharing");
            return (
                <Button switched={false} colorTheme={"red"} autoSwitch={false} iconNormal={icon}
                            onToggle={() => events.fire("action_toggle_video", {enable: false, broadcastType: props.type})}
                            tooltip={tooltip} key={"disable"}>
                    <DropdownEntry icon={icon} text={dropdownTextManage} onClick={() => events.fire("action_manage_video", { broadcastType: props.type })} />
                    <DropdownEntry icon={icon} text={dropdownTextStop} onClick={() => events.fire("action_toggle_video", {enable: false, broadcastType: props.type})} />
                    {props.type === "camera" ? <VideoDeviceList key={"list"} /> : null}
                </Button>
            );
        }
    }
}

const MicrophoneButton = () => {
    const events = useContext(Events);

    const [ state, setState ] = useState<MicrophoneState>(() => {
        events.fire("query_microphone_state");
        return undefined;
    });

    events.on("notify_microphone_state", event => setState(event.state));

    if(state === "muted") {
        return (
            <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={ClientIcon.InputMuted} tooltip={tr("Unmute microphone")}
                    onToggle={() => events.fire("action_toggle_microphone", { enabled: true })} key={"muted"}>
                <DropdownEntry
                    icon={ClientIcon.InputMuted}
                    text={<Translatable>Unmute microphone</Translatable>}
                    onClick={() => events.fire("action_toggle_microphone", { enabled: true })}
                />
                <DropdownEntry
                    icon={ClientIcon.Settings}
                    text={<Translatable>Open microphone settings</Translatable>}
                    onClick={() => events.fire("action_open_microphone_settings", {})}
                />
                <MicrophoneDeviceList />
            </Button>
        );
    } else if(state === "enabled") {
        return (
            <Button colorTheme={"red"} autoSwitch={false} iconNormal={ClientIcon.InputMuted} tooltip={tr("Mute microphone")}
                    onToggle={() => events.fire("action_toggle_microphone", { enabled: false })} key={"enabled"}>
                <DropdownEntry
                    icon={ClientIcon.InputMuted}
                    text={<Translatable>Mute microphone</Translatable>}
                    onClick={() => events.fire("action_toggle_microphone", { enabled: false })}
                />
                <DropdownEntry
                    icon={ClientIcon.Settings}
                    text={<Translatable>Open microphone settings</Translatable>}
                    onClick={() => events.fire("action_open_microphone_settings", {})}
                />
                <MicrophoneDeviceList />
            </Button>
        );
    } else {
        return (
            <Button autoSwitch={false} iconNormal={ClientIcon.ActivateMicrophone} tooltip={tr("Enable your microphone on this server")}
                    onToggle={() => events.fire("action_toggle_microphone", { enabled: true })} key={"disabled"}>
                <DropdownEntry
                    icon={ClientIcon.ActivateMicrophone}
                    text={<Translatable>Enable your microphone</Translatable>}
                    onClick={() => events.fire("action_toggle_microphone", { enabled: true })}
                />
                <DropdownEntry
                    icon={ClientIcon.Settings}
                    text={<Translatable>Open microphone settings</Translatable>}
                    onClick={() => events.fire("action_open_microphone_settings", {})}
                />
                <MicrophoneDeviceList />
            </Button>
        );
    }
}

/* This should be above all driver weights */
const kDriverWeightSelected = 1000;
const kDriverWeights = {
    "MME": 100,
    "Windows DirectSound": 80,
    "Windows WASAPI": 50
};

const MicrophoneDeviceList = React.memo(() => {
    const events = useContext(Events);
    const [ deviceList, setDeviceList ] = useState<MicrophoneDeviceInfo[]>(() => {
        events.fire("query_microphone_list");
        return [];
    });
    events.reactUse("notify_microphone_list", event => setDeviceList(event.devices));

    if(deviceList.length <= 1) {
        /* we don't need a select here */
        return null;
    }

    const devices: {[key: string]: { weight: number, device: MicrophoneDeviceInfo }} = {};
    for(const entry of deviceList) {
        const weight = entry.selected ? kDriverWeightSelected : (kDriverWeights[entry.driver] | 0);
        if(typeof devices[entry.name] !== "undefined" && devices[entry.name].weight >= weight) {
            continue;
        }

        devices[entry.name] = {
            weight,
            device: entry
        }
    }

    return (
        <>
            <hr key={"hr"} />
            {Object.values(devices).map(({ device }) => (
                <DropdownEntry
                    text={device.name || tr("Unknown device name")}
                    key={"m-" + device.id}
                    icon={device.selected ? ClientIcon.Apply : undefined}
                    onClick={() => events.fire("action_toggle_microphone", { enabled: true, targetDeviceId: device.id })}
                />
            ))}
        </>
    );
});

const SpeakerButton = () => {
    const events = useContext(Events);

    const [ enabled, setEnabled ] = useState<boolean>(() => {
        events.fire("query_speaker_state");
        return true;
    });

    events.on("notify_speaker_state", event => setEnabled(event.enabled));

    if(enabled) {
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={ClientIcon.OutputMuted} tooltip={tr("Mute headphones")}
                       onToggle={() => events.fire("action_toggle_speaker", { enabled: false })} key={"enabled"} />;
    } else {
        return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={ClientIcon.OutputMuted} tooltip={tr("Unmute headphones")}
                       onToggle={() => events.fire("action_toggle_speaker", { enabled: true })} key={"disabled"} />;
    }
}

const SubscribeButton = () => {
    const events = useContext(Events);

    const [ subscribe, setSubscribe ] = useState<boolean>(() => {
        events.fire("query_subscribe_state");
        return true;
    });

    events.on("notify_subscribe_state", event => setSubscribe(event.subscribe));

    return <Button switched={subscribe}
                   autoSwitch={false}
                   iconNormal={ClientIcon.UnsubscribeFromAllChannels}
                   iconSwitched={ClientIcon.SubscribeToAllChannels}
                   className={cssStyle.hideSmallPopout}
                   onToggle={flag => events.fire("action_toggle_subscribe", { subscribe: flag })}
    />;
}

const QueryButton = () => {
    const events = useContext(Events);
    const mode = useContext(ModeContext);

    const [ shown, setShown ] = useState<boolean>(() => {
        events.fire("query_query_state");
        return true;
    });

    events.on("notify_query_state", event => setShown(event.shown));

    if(mode === "channel-popout") {
        return (
            <Button switched={shown}
                    autoSwitch={false}
                    iconNormal={ClientIcon.ServerQuery}
                    className={cssStyle.hideSmallPopout}
                    onToggle={flag => events.fire("action_toggle_query", { show: flag })}
                    key={"mode-channel-popout"}
            />
        );
    } else {
        let toggle;
        if(shown) {
            toggle = <DropdownEntry key={"query-show"} icon={ClientIcon.ToggleServerQueryClients} text={<Translatable>Hide server queries</Translatable>}
                                    onClick={() => events.fire("action_toggle_query", { show: false })} />;
        } else {
            toggle = <DropdownEntry key={"query-hide"} icon={ClientIcon.ToggleServerQueryClients} text={<Translatable>Show server queries</Translatable>}
                                    onClick={() => events.fire("action_toggle_query", { show: true })}/>;
        }

        return (
            <Button switched={shown}
                    autoSwitch={false}
                    iconNormal={ClientIcon.ServerQuery}
                    className={cssStyle.hideSmallPopout}
                    onToggle={flag => events.fire("action_toggle_query", { show: flag })}
                    key={"mode-full"}
            >
                {toggle}
                <DropdownEntry icon={ClientIcon.ServerQuery} text={<Translatable>Manage server queries</Translatable>}
                               onClick={() => events.fire("action_query_manage")} key={"manage-entries"} />
            </Button>
        );
    }
};

const HostButton = () => {
    const events = useContext(Events);

    const [ hostButton, setHostButton ] = useState<HostButtonInfo>(() => {
        events.fire("query_host_button");
        return undefined;
    });

    events.reactUse("notify_host_button", event => setHostButton(event.button));

    if(!hostButton) {
        return null;
    } else {
        return (
            <a
                className={cssButtonStyle.button + " " + cssButtonStyle.buttonHostbutton + " " + cssStyle.hideSmallPopout}
                title={hostButton.title || tr("Hostbutton")}
                onClick={event => {
                    window.open(hostButton.target || hostButton.url, '_blank');
                    event.preventDefault();
                }}
            >
                <img alt={tr("Hostbutton")} src={hostButton.url} />
            </a>
        );
    }
};

export const ControlBar2 = (props: { events: Registry<ControlBarEvents>, className?: string }) => {
    const [ mode, setMode ] = useState<ControlBarMode>(() => {
        props.events.fire("query_mode");
        return undefined;
    });

    props.events.reactUse("notify_mode", event => setMode(event.mode));

    const items = [];

    if(mode !== "channel-popout") {
        items.push(<ConnectButton key={"connect"} />);
        items.push(<BookmarkButton key={"bookmarks"} />);
        items.push(<div className={cssStyle.divider + " "  + cssStyle.hideSmallPopout} key={"divider-1"} />);
    }
    items.push(<VideoButton key={"video"} type={"camera"} />);
    items.push(<VideoButton key={"screen"} type={"screen"} />);
    items.push(<MicrophoneButton key={"microphone"} />);
    items.push(<SpeakerButton key={"speaker"} />);
    items.push(<div className={cssStyle.divider + " "  + cssStyle.hideSmallPopout} key={"divider-2"} />);
    items.push(<AwayButton key={"away"} />);
    items.push(<SubscribeButton key={"subscribe"} />);
    items.push(<QueryButton key={"query"} />);
    items.push(<div className={cssStyle.spacer} key={"spacer"} />);
    items.push(<HostButton key={"hostbutton"} />);

    return (
        <Events.Provider value={props.events}>
            <ModeContext.Provider value={mode}>
                <div className={cssStyle.controlBar + " " + cssStyle["mode-" + mode] + " " + props.className}>
                    {items}
                </div>
            </ModeContext.Provider>
        </Events.Provider>
    )
};