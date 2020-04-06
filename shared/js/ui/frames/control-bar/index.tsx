import * as React from "react";
import {Button} from "./button";
import {DropdownEntry} from "tc-shared/ui/frames/control-bar/dropdown";
import {Translatable} from "tc-shared/ui/elements/i18n";
import {ReactComponentBase} from "tc-shared/ui/elements/ReactComponentBase";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Event, EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {Settings, settings} from "tc-shared/settings";
import {
    Bookmark,
    bookmarks,
    BookmarkType,
    boorkmak_connect,
    DirectoryBookmark,
    find_bookmark
} from "tc-shared/bookmarks";
import {IconManager} from "tc-shared/FileManager";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {client_control_events} from "tc-shared/main";
const register_actions = require("./actions");

const cssStyle = require("./index.scss");
const cssButtonStyle = require("./button.scss");

export interface ConnectionState {
    connected: boolean;
    connectedAnywhere: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class ConnectButton extends ReactComponentBase<{ multiSession: boolean; event_registry: Registry<ControlBarEvents> }, ConnectionState> {
    protected default_state(): ConnectionState {
        return {
            connected: false,
            connectedAnywhere: false
        }
    }

    render() {
        let subentries = [];
        if(this.props.multiSession) {
            if(!this.state.connected) {
                subentries.push(
                    <DropdownEntry key={"connect-server"} icon={"client-connect"} text={<Translatable message={"Connect to a server"} />}
                                   onClick={ () => client_control_events.fire("action_open_connect", { new_tab: false }) } />
                );
            } else {
                subentries.push(
                    <DropdownEntry key={"disconnect-current"} icon={"client-disconnect"} text={<Translatable message={"Disconnect from current server"} />}
                                   onClick={ () => client_control_events.fire("action_disconnect", { globally: false }) }/>
                );
            }
            if(this.state.connectedAnywhere) {
                subentries.push(
                    <DropdownEntry key={"disconnect-current"} icon={"client-disconnect"} text={<Translatable message={"Disconnect from all servers"} />}
                                   onClick={ () => client_control_events.fire("action_disconnect", { globally: true }) }/>
                );
            }
            subentries.push(
                <DropdownEntry key={"connect-new-tab"} icon={"client-connect"} text={<Translatable message={"Connect to a server in another tab"} />}
                               onClick={ () => client_control_events.fire("action_open_connect", { new_tab: true }) } />
            );
        }

        if(!this.state.connected) {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-connect"} tooltip={tr("Connect to a server")}
                        onToggle={ () => client_control_events.fire("action_open_connect", { new_tab: false }) }>
                    {subentries}
                </Button>
            );
        } else {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-disconnect"} tooltip={tr("Disconnect from server")}
                        onToggle={ () => client_control_events.fire("action_disconnect", { globally: false }) }>
                    {subentries}
                </Button>
            );
        }
    }

    @EventHandler<ControlBarEvents>("update_connect_state")
    private handleStateUpdate(state: ConnectionState) {
        this.updateState(state);
    }
}

@ReactEventHandler(obj => obj.props.event_registry)
class BookmarkButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, {}> {
    private button_ref: React.RefObject<Button>;

    protected initialize() {
        this.button_ref = React.createRef();
    }

    protected default_state() {
        return {};
    }

    render() {
        const marks = bookmarks().content.map(e => e.type === BookmarkType.DIRECTORY ? this.renderDirectory(e) : this.renderBookmark(e));
        if(marks.length)
            marks.splice(0, 0, <hr key={"hr"} />);
        return (
            <Button ref={this.button_ref} dropdownButtonExtraClass={cssButtonStyle.buttonBookmarks} autoSwitch={false} iconNormal={"client-bookmark_manager"}>
                <DropdownEntry icon={"client-bookmark_manager"} text={<Translatable message={"Manage bookmarks"} />}
                               onClick={() => client_control_events.fire("action_open_window", { window: "bookmark-manage" })} />
                <DropdownEntry icon={"client-bookmark_add"} text={<Translatable message={"Add current server to bookmarks"} />} />
                {marks}
            </Button>
        )
    }

    private renderBookmark(bookmark: Bookmark) {
        return (
            <DropdownEntry key={bookmark.unique_id}
                           icon={IconManager.generate_tag(IconManager.load_cached_icon(bookmark.last_icon_id || 0), {animate: false})}
                           text={bookmark.display_name}
                           onClick={BookmarkButton.onBookmarkClick.bind(undefined, bookmark.unique_id)}
                           onContextMenu={this.onBookmarkContextMenu.bind(this, bookmark.unique_id)}/>
        );
    }

    private renderDirectory(directory: DirectoryBookmark) {
        return (
            <DropdownEntry key={directory.unique_id} text={directory.display_name} >
                {directory.content.map(e => e.type === BookmarkType.DIRECTORY ? this.renderDirectory(e) : this.renderBookmark(e))}
            </DropdownEntry>
        )
    }

    private static onBookmarkClick(bookmark_id: string) {
        const bookmark = find_bookmark(bookmark_id) as Bookmark;
        if(!bookmark) return;

        boorkmak_connect(bookmark, false);
    }

    private onBookmarkContextMenu(bookmark_id: string, event: MouseEvent) {
        event.preventDefault();

        const bookmark = find_bookmark(bookmark_id) as Bookmark;
        if(!bookmark) return;

        this.button_ref.current?.updateState({ dropdownForceShow: true });
        contextmenu.spawn_context_menu(event.pageX,  event.pageY, {
            type: contextmenu.MenuEntryType.ENTRY,
            name: tr("Connect"),
            icon_class: 'client-connect',
            callback: () => boorkmak_connect(bookmark, false)
        }, {
            type: contextmenu.MenuEntryType.ENTRY,
            name: tr("Connect in a new tab"),
            icon_class: 'client-connect',
            callback: () => boorkmak_connect(bookmark, true),
            visible: !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION)
        }, contextmenu.Entry.CLOSE(() => {
            this.button_ref.current?.updateState({ dropdownForceShow: false });
        }));
    }

    @EventHandler<ControlBarEvents>("update_bookmarks")
    private handleStateUpdate() {
        this.forceUpdate();
    }
}

export interface AwayState {
    away: boolean;
    awayAnywhere: boolean;
    awayAll: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class AwayButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, AwayState> {
    protected default_state(): AwayState {
        return {
            away: false,
            awayAnywhere: false,
            awayAll: false
        };
    }

    render() {
        let dropdowns = [];
        if(this.state.away) {
            dropdowns.push(<DropdownEntry key={"cgo"} icon={"client-present"} text={<Translatable message={"Go online"} />}
                                onClick={() => client_control_events.fire("action_disable_away", { globally: false })} />);
        } else {
            dropdowns.push(<DropdownEntry key={"sas"} icon={"client-away"} text={<Translatable message={"Set away on this server"} />}
                                          onClick={() => client_control_events.fire("action_set_away", { globally: false, prompt_reason: false })} />);
        }
        dropdowns.push(<DropdownEntry key={"sam"} icon={"client-away"} text={<Translatable message={"Set away message on this server"} />}
                                      onClick={() => client_control_events.fire("action_set_away", { globally: false, prompt_reason: true })} />);

        dropdowns.push(<hr key={"-hr"} />);
        if(this.state.awayAnywhere) {
            dropdowns.push(<DropdownEntry key={"goa"} icon={"client-present"} text={<Translatable message={"Go online for all servers"} />}
                                          onClick={() => client_control_events.fire("action_disable_away", { globally: true })} />);
        }
        if(!this.state.awayAll) {
            dropdowns.push(<DropdownEntry key={"saa"} icon={"client-away"} text={<Translatable message={"Set away on all servers"} />}
                                          onClick={() => client_control_events.fire("action_set_away", { globally: true, prompt_reason: false })} />);
        }
        dropdowns.push(<DropdownEntry key={"sama"} icon={"client-away"} text={<Translatable message={"Set away message for all servers"} />}
                                      onClick={() => client_control_events.fire("action_set_away", { globally: true, prompt_reason: true })} />);

        /* switchable because we're switching it manually */
        return (
            <Button autoSwitch={false} iconNormal={this.state.away ? "client-present" : "client-away"}>
                {dropdowns}
            </Button>
        );
    }

    @EventHandler<ControlBarEvents>("update_away_state")
    private handleStateUpdate(state: AwayState) {
        this.updateState(state);
    }
}

export interface ChannelSubscribeState {
    subscribeEnabled: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class ChannelSubscribeButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, ChannelSubscribeState> {
    protected default_state(): ChannelSubscribeState {
        return { subscribeEnabled: false };
    }

    render() {
        return <Button switched={this.state.subscribeEnabled} autoSwitch={false} iconNormal={"client-unsubscribe_from_all_channels"} iconSwitched={"client-subscribe_to_all_channels"}
                    onToggle={flag => client_control_events.fire("action_set_channel_subscribe_mode", { subscribe: flag })}/>;
    }

    @EventHandler<ControlBarEvents>("update_subscribe_state")
    private handleStateUpdate(state: ChannelSubscribeState) {
        this.updateState(state);
    }
}

export interface MicrophoneState {
    enabled: boolean;
    muted: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class MicrophoneButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, MicrophoneState> {
    protected default_state(): MicrophoneState {
        return {
            enabled: false,
            muted: false
        };
    }

    render() {
        if(!this.state.enabled)
            return <Button autoSwitch={false} iconNormal={"client-activate_microphone"} tooltip={tr("Enable your microphone on this server")}
                           onToggle={() => client_control_events.fire("action_toggle_microphone", { state: true })} />;
        if(this.state.muted)
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Unmute microphone")}
                           onToggle={() => client_control_events.fire("action_toggle_microphone", { state: true })} />;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Mute microphone")}
                       onToggle={() => client_control_events.fire("action_toggle_microphone", { state: false })} />;
    }

    @EventHandler<ControlBarEvents>("update_microphone_state")
    private handleStateUpdate(state: MicrophoneState) {
        this.updateState(state);
    }
}

export interface SpeakerState {
    muted: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class SpeakerButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, SpeakerState> {
    protected default_state(): SpeakerState {
        return {
            muted: false
        };
    }

    render() {
        if(this.state.muted)
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Unmute headphones")}
                           onToggle={() => client_control_events.fire("action_toggle_speaker", { state: true })}/>;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Mute headphones")}
                       onToggle={() => client_control_events.fire("action_toggle_speaker", { state: false })}/>;
    }

    @EventHandler<ControlBarEvents>("update_speaker_state")
    private handleStateUpdate(state: SpeakerState) {
        this.updateState(state);
    }
}

export interface QueryState {
    queryShown: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class QueryButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, QueryState> {
    protected default_state() {
        return {
            queryShown: false
        };
    }

    render() {
        let toggle;
        if(this.state.queryShown)
            toggle = <DropdownEntry icon={""} text={<Translatable message={"Hide server queries"} />}
                                    onClick={() => client_control_events.fire("action_toggle_query", { shown: false })}/>;
        else
            toggle = <DropdownEntry icon={"client-toggle_server_query_clients"} text={<Translatable message={"Show server queries"} />}
                                    onClick={() => client_control_events.fire("action_toggle_query", { shown: true })}/>;
        return (
            <Button switched={this.state.queryShown} autoSwitch={false} iconNormal={"client-server_query"}
                    onToggle={flag => client_control_events.fire("action_toggle_query", { shown: flag })}>
                {toggle}
                <DropdownEntry icon={"client-server_query"} text={<Translatable message={"Manage server queries"} />}
                                onClick={() => client_control_events.fire("action_open_window", { window: "query-manage" })}/>
            </Button>
        )
    }

    @EventHandler<ControlBarEvents>("update_query_state")
    private handleStateUpdate(state: QueryState) {
        this.updateState(state);
    }
}

export interface HostButtonState {
    url?: string;
    title?: string;
    target_url?: string;
}

@ReactEventHandler(obj => obj.props.event_registry)
class HostButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, HostButtonState> {
    protected default_state() {
        return {
            url: undefined,
            target_url: undefined
        };
    }

    render() {
        if(!this.state.url)
            return null;

        return (
            <a
                className={this.classList(cssButtonStyle.button, cssButtonStyle.buttonHostbutton)}
                title={this.state.title || tr("Hostbutton")}
                href={this.state.target_url || this.state.url}
                target={"_blank"} /* just to ensure */
                onClick={this.onClick.bind(this)}>
                <img alt={tr("Hostbutton")} src={this.state.url} />
            </a>
        );
    }

    private onClick(event: MouseEvent) {
        window.open(this.state.target_url || this.state.url, '_blank');
        event.preventDefault();
    }

    @EventHandler<ControlBarEvents>("update_host_button")
    private handleStateUpdate(state: HostButtonState) {
        this.updateState(state);
    }
}

export interface ControlBarProperties {
    multiSession: boolean;
}

@ReactEventHandler<ControlBar>(obj => obj.event_registry)
export class ControlBar extends React.Component<ControlBarProperties, {}> {
    private readonly event_registry: Registry<ControlBarEvents>;
    private connection: ConnectionHandler;

    constructor(props) {
        super(props);

        this.event_registry = new Registry<ControlBarEvents>();
        this.event_registry.enable_debug("control-bar");
        register_actions(this.event_registry);

    }

    componentDidMount(): void {

    }

    /*
    initialize_connection_handler_state(handler?: ConnectionHandler) {
        handler.client_status.output_muted = this._button_speakers === "muted";
        handler.client_status.input_muted = this._button_microphone === "muted";

        handler.client_status.channel_subscribe_all = this._button_subscribe_all;
        handler.client_status.queries_visible = this._button_query_visible;
    }
     */

    events() : Registry<ControlBarEvents> { return this.event_registry; }

    render() {
        return (
            <div className={cssStyle.controlBar}>
                <ConnectButton event_registry={this.event_registry} multiSession={this.props.multiSession} />
                <BookmarkButton event_registry={this.event_registry} />
                <div className={cssStyle.divider} />
                <AwayButton event_registry={this.event_registry} />
                <MicrophoneButton event_registry={this.event_registry} />
                <SpeakerButton event_registry={this.event_registry} />
                <div className={cssStyle.divider} />
                <ChannelSubscribeButton event_registry={this.event_registry} />
                <QueryButton event_registry={this.event_registry} />
                <div className={cssStyle.spacer} />
                <HostButton event_registry={this.event_registry} />
            </div>
        )
    }

    @EventHandler<ControlBarEvents>("set_connection_handler")
    private handleSetConnectionHandler(event: ControlBarEvents["set_connection_handler"]) {
        if(this.connection == event.handler) return;

        this.connection = event.handler;
        this.event_registry.fire("update_state_all");
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateHostButton(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")4
            if(event.as<"update_state">().state !== "host-button")
                return;

        const sprops = this.connection?.channelTree.server?.properties;
        if(!sprops || !sprops.virtualserver_hostbutton_gfx_url) {
            this.event_registry.fire("update_host_button", {
                url: undefined,
                target_url: undefined,
                title: undefined
            });
            return;
        }

        this.event_registry.fire("update_host_button", {
            url: sprops.virtualserver_hostbutton_gfx_url,
            target_url: sprops.virtualserver_hostbutton_url,
            title: sprops.virtualserver_hostbutton_tooltip
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateSubscribe(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "subscribe-mode")
                return;

        this.event_registry.fire("update_subscribe_state", {
            subscribeEnabled: !!this.connection?.client_status.channel_subscribe_all
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateConnect(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "connect-state")
                return;

        this.event_registry.fire("update_connect_state", {
            connectedAnywhere: server_connections.server_connection_handlers().findIndex(e => e.connected) !== -1,
            connected: !!this.connection?.connected
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateAway(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "away")
                return;

        const connections = server_connections.server_connection_handlers();
        const away_connections = server_connections.server_connection_handlers().filter(e => e.client_status.away);

        const away_status = this.connection?.client_status.away;
        this.event_registry.fire("update_away_state", {
            awayAnywhere: away_connections.length > 0,
            away: typeof away_status === "string" ? true : !!away_status,
            awayAll: connections.length === away_connections.length
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateMicrophone(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "microphone")
                return;

        this.event_registry.fire("update_microphone_state", {
            enabled: !!this.connection?.client_status.input_hardware,
            muted: this.connection?.client_status.input_muted
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateSpeaker(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "speaker")
                return;

        this.event_registry.fire("update_speaker_state", {
            muted: this.connection?.client_status.output_muted
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateQuery(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "query")
                return;

        this.event_registry.fire("update_query_state", {
            queryShown: !!this.connection?.client_status.queries_visible
        });
    }

    @EventHandler<ControlBarEvents>(["update_state_all", "update_state"])
    private updateStateBookmarks(event: Event<ControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "bookmarks")
                return;

        this.event_registry.fire("update_bookmarks");
    }
}

let react_reference_: React.RefObject<ControlBar>;
export function react_reference() { return react_reference_ || (react_reference_ = React.createRef()); }
export function control_bar_instance() : ControlBar | undefined {
    return react_reference_?.current;
}

export interface ControlBarEvents {
    /* update the UI */
    update_host_button: HostButtonState;
    update_subscribe_state: ChannelSubscribeState;
    update_connect_state: ConnectionState;
    update_away_state: AwayState;
    update_microphone_state: MicrophoneState;
    update_speaker_state: SpeakerState;
    update_query_state: QueryState;
    update_bookmarks: {},
    update_state: {
        state: "host-button" | "bookmarks" | "subscribe-mode" | "connect-state" | "away" | "microphone" | "speaker" | "query"
    },
    update_state_all: { },

    /* trigger actions */
    set_connection_handler: {
        handler?: ConnectionHandler
    },

    server_updated: {
        handler: ConnectionHandler,
        category: "audio" | "settings-initialized" | "connection-state" | "away-status" | "hostbanner"
    }

    //settings-initialized: Update query and channel flags
}