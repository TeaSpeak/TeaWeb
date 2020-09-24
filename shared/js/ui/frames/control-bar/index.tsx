import * as React from "react";
import {Button} from "./button";
import {DropdownEntry} from "tc-shared/ui/frames/control-bar/dropdown";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {
    ConnectionEvents,
    ConnectionHandler,
    ConnectionStateUpdateType
} from "tc-shared/ConnectionHandler";
import {Event, EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {Settings, settings} from "tc-shared/settings";
import {
    add_server_to_bookmarks,
    Bookmark,
    bookmarks,
    BookmarkType,
    boorkmak_connect,
    DirectoryBookmark,
    find_bookmark
} from "tc-shared/bookmarks";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {createInputModal} from "tc-shared/ui/elements/Modal";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {icon_cache_loader} from "tc-shared/file/Icons";
import {ConnectionManagerEvents, server_connections} from "tc-shared/ConnectionManager";

const cssStyle = require("./index.scss");
const cssButtonStyle = require("./button.scss");

export interface ConnectionState {
    connected: boolean;
    connectedAnywhere: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class ConnectButton extends ReactComponentBase<{ multiSession: boolean; event_registry: Registry<InternalControlBarEvents> }, ConnectionState> {
    protected defaultState(): ConnectionState {
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
                    <DropdownEntry key={"connect-server"} icon={"client-connect"} text={<Translatable>Connect to a server</Translatable>}
                                   onClick={ () => global_client_actions.fire("action_open_window_connect", {newTab: false }) } />
                );
            } else {
                subentries.push(
                    <DropdownEntry key={"disconnect-current-a"} icon={"client-disconnect"} text={<Translatable>Disconnect from current server</Translatable>}
                                   onClick={ () => this.props.event_registry.fire("action_disconnect", { globally: false }) }/>
                );
            }
            if(this.state.connectedAnywhere) {
                subentries.push(
                    <DropdownEntry key={"disconnect-current-b"} icon={"client-disconnect"} text={<Translatable>Disconnect from all servers</Translatable>}
                                   onClick={ () => this.props.event_registry.fire("action_disconnect", { globally: true }) }/>
                );
            }
            subentries.push(
                <DropdownEntry key={"connect-new-tab"} icon={"client-connect"} text={<Translatable>Connect to a server in another tab</Translatable>}
                               onClick={ () => global_client_actions.fire("action_open_window_connect", { newTab: true }) } />
            );
        }

        if(!this.state.connected) {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-connect"} tooltip={tr("Connect to a server")}
                        onToggle={ () => global_client_actions.fire("action_open_window_connect", { newTab: false }) }>
                    {subentries}
                </Button>
            );
        } else {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-disconnect"} tooltip={tr("Disconnect from server")}
                        onToggle={ () => this.props.event_registry.fire("action_disconnect", { globally: false }) }>
                    {subentries}
                </Button>
            );
        }
    }

    @EventHandler<InternalControlBarEvents>("update_connect_state")
    private handleStateUpdate(state: ConnectionState) {
        this.setState(state);
    }
}

@ReactEventHandler(obj => obj.props.event_registry)
class BookmarkButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, {}> {
    private button_ref: React.RefObject<Button>;

    protected initialize() {
        this.button_ref = React.createRef();
    }

    protected defaultState() {
        return {};
    }

    render() {
        const marks = bookmarks().content.map(e => e.type === BookmarkType.DIRECTORY ? this.renderDirectory(e) : this.renderBookmark(e));
        if(marks.length)
            marks.splice(0, 0, <hr key={"hr"} />);
        return (
            <Button ref={this.button_ref} dropdownButtonExtraClass={cssButtonStyle.buttonBookmarks} autoSwitch={false} iconNormal={"client-bookmark_manager"}>
                <DropdownEntry icon={"client-bookmark_manager"} text={<Translatable>Manage bookmarks</Translatable>}
                               onClick={() => this.props.event_registry.fire("action_open_window", { window: "bookmark-manage" })} />
                <DropdownEntry icon={"client-bookmark_add"} text={<Translatable>Add current server to bookmarks</Translatable>}
                                onClick={() => this.props.event_registry.fire("action_add_current_server_to_bookmarks")} />
                {marks}
            </Button>
        )
    }

    private renderBookmark(bookmark: Bookmark) {
        return (
            <DropdownEntry key={bookmark.unique_id}
                           icon={icon_cache_loader.load_icon(bookmark.last_icon_id, bookmark.last_icon_server_id)}
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

        this.button_ref.current?.setState({ dropdownForceShow: true });
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
            this.button_ref.current?.setState({ dropdownForceShow: false });
        }));
    }

    @EventHandler<InternalControlBarEvents>("update_bookmarks")
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
class AwayButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, AwayState> {
    protected defaultState(): AwayState {
        return {
            away: false,
            awayAnywhere: false,
            awayAll: false
        };
    }

    render() {
        let dropdowns = [];
        if(this.state.away) {
            dropdowns.push(<DropdownEntry key={"cgo"} icon={"client-present"} text={<Translatable>Go online</Translatable>}
                                onClick={() => this.props.event_registry.fire("action_disable_away", { globally: false })} />);
        } else {
            dropdowns.push(<DropdownEntry key={"sas"} icon={"client-away"} text={<Translatable>Set away on this server</Translatable>}
                                          onClick={() => this.props.event_registry.fire("action_set_away", { globally: false, prompt_reason: false })} />);
        }
        dropdowns.push(<DropdownEntry key={"sam"} icon={"client-away"} text={<Translatable>Set away message on this server</Translatable>}
                                      onClick={() => this.props.event_registry.fire("action_set_away", { globally: false, prompt_reason: true })} />);

        dropdowns.push(<hr key={"-hr"} />);
        if(this.state.awayAnywhere) {
            dropdowns.push(<DropdownEntry key={"goa"} icon={"client-present"} text={<Translatable>Go online for all servers</Translatable>}
                                          onClick={() => this.props.event_registry.fire("action_disable_away", { globally: true })} />);
        }
        if(!this.state.awayAll) {
            dropdowns.push(<DropdownEntry key={"saa"} icon={"client-away"} text={<Translatable>Set away on all servers</Translatable>}
                                          onClick={() => this.props.event_registry.fire("action_set_away", { globally: true, prompt_reason: false })} />);
        }
        dropdowns.push(<DropdownEntry key={"sama"} icon={"client-away"} text={<Translatable>Set away message for all servers</Translatable>}
                                      onClick={() => this.props.event_registry.fire("action_set_away", { globally: true, prompt_reason: true })} />);

        /* switchable because we're switching it manually */
        return (
            <Button autoSwitch={false} switched={this.state.away} iconNormal={this.state.away ? "client-present" : "client-away"} onToggle={this.handleButtonToggled.bind(this)}>
                {dropdowns}
            </Button>
        );
    }

    private handleButtonToggled(state: boolean) {
        if(state)
            this.props.event_registry.fire("action_set_away", { globally: false, prompt_reason: false });
        else
            this.props.event_registry.fire("action_disable_away");
    }

    @EventHandler<InternalControlBarEvents>("update_away_state")
    private handleStateUpdate(state: AwayState) {
        this.setState(state);
    }
}

export interface ChannelSubscribeState {
    subscribeEnabled: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class ChannelSubscribeButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, ChannelSubscribeState> {
    protected defaultState(): ChannelSubscribeState {
        return { subscribeEnabled: false };
    }

    render() {
        return <Button switched={this.state.subscribeEnabled} autoSwitch={false} iconNormal={"client-unsubscribe_from_all_channels"} iconSwitched={"client-subscribe_to_all_channels"}
                    onToggle={flag => this.props.event_registry.fire("action_set_subscribe", { subscribe: flag })}/>;
    }

    @EventHandler<InternalControlBarEvents>("update_subscribe_state")
    private handleStateUpdate(state: ChannelSubscribeState) {
        this.setState(state);
    }
}

export interface MicrophoneState {
    enabled: boolean;
    muted: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class MicrophoneButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, MicrophoneState> {
    protected defaultState(): MicrophoneState {
        return {
            enabled: false,
            muted: false
        };
    }

    render() {
        if(!this.state.enabled)
            return <Button autoSwitch={false} iconNormal={"client-activate_microphone"} tooltip={tr("Enable your microphone on this server")}
                           onToggle={() => this.props.event_registry.fire("action_enable_microphone")} />;
        if(this.state.muted)
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Unmute microphone")}
                           onToggle={() => this.props.event_registry.fire("action_enable_microphone")} />;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Mute microphone")}
                       onToggle={() => this.props.event_registry.fire("action_disable_microphone")} />;
    }

    @EventHandler<InternalControlBarEvents>("update_microphone_state")
    private handleStateUpdate(state: MicrophoneState) {
        this.setState(state);
    }
}

export interface SpeakerState {
    muted: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class SpeakerButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, SpeakerState> {
    protected defaultState(): SpeakerState {
        return {
            muted: false
        };
    }

    render() {
        if(this.state.muted)
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Unmute headphones")}
                           onToggle={() => this.props.event_registry.fire("action_enable_speaker")}/>;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Mute headphones")}
                       onToggle={() => this.props.event_registry.fire("action_disable_speaker")}/>;
    }

    @EventHandler<InternalControlBarEvents>("update_speaker_state")
    private handleStateUpdate(state: SpeakerState) {
        this.setState(state);
    }
}

export interface QueryState {
    queryShown: boolean;
}

@ReactEventHandler(obj => obj.props.event_registry)
class QueryButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, QueryState> {
    protected defaultState() {
        return {
            queryShown: false
        };
    }

    render() {
        let toggle;
        if(this.state.queryShown)
            toggle = <DropdownEntry key={"query-show"} icon={"client-toggle_server_query_clients"} text={<Translatable>Hide server queries</Translatable>}
                                    onClick={() => this.props.event_registry.fire("action_toggle_query", { shown: false })}/>;
        else
            toggle = <DropdownEntry key={"query-hide"} icon={"client-toggle_server_query_clients"} text={<Translatable>Show server queries</Translatable>}
                                    onClick={() => this.props.event_registry.fire("action_toggle_query", { shown: true })}/>;
        return (
            <Button switched={this.state.queryShown} autoSwitch={false} iconNormal={"client-server_query"}
                    onToggle={flag => this.props.event_registry.fire("action_toggle_query", { shown: flag })}>
                {toggle}
                <DropdownEntry icon={"client-server_query"} text={<Translatable>Manage server queries</Translatable>}
                                onClick={() => this.props.event_registry.fire("action_open_window", { window: "query-manage" })}/>
            </Button>
        )
    }

    @EventHandler<InternalControlBarEvents>("update_query_state")
    private handleStateUpdate(state: QueryState) {
        this.setState(state);
    }
}

export interface HostButtonState {
    url?: string;
    title?: string;
    target_url?: string;
}

@ReactEventHandler(obj => obj.props.event_registry)
class HostButton extends ReactComponentBase<{ event_registry: Registry<InternalControlBarEvents> }, HostButtonState> {
    protected defaultState() {
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

    @EventHandler<InternalControlBarEvents>("update_host_button")
    private handleStateUpdate(state: HostButtonState) {
        this.setState(state);
    }
}

export interface ControlBarProperties {
    multiSession: boolean;
}

@ReactEventHandler<ControlBar>(obj => obj.event_registry)
export class ControlBar extends React.Component<ControlBarProperties, {}> {
    private readonly event_registry: Registry<InternalControlBarEvents>;
    private connection: ConnectionHandler;
    private connection_handler_callbacks = {
        notify_state_updated: this.handleConnectionHandlerStateChange.bind(this),
        notify_connection_state_changed: this.handleConnectionHandlerConnectionStateChange.bind(this)
    };
    private connection_manager_callbacks = {
        active_handler_changed: this.handleActiveConnectionHandlerChanged.bind(this)
    };

    constructor(props) {
        super(props);

        this.event_registry = new Registry<InternalControlBarEvents>();
        this.event_registry.enableDebug("control-bar");
        initialize(this.event_registry);
    }

    events() : Registry<InternalControlBarEvents> { return this.event_registry; }

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

    private handleActiveConnectionHandlerChanged(event: ConnectionManagerEvents["notify_active_handler_changed"]) {
        if(event.oldHandler)
            this.unregisterConnectionHandlerEvents(event.oldHandler);

        this.connection = event.newHandler;
        if(event.newHandler)
            this.registerConnectionHandlerEvents(event.newHandler);

        this.event_registry.fire("set_connection_handler", { handler: this.connection });
        this.event_registry.fire("update_state_all");
    }

    private unregisterConnectionHandlerEvents(target: ConnectionHandler) {
        const events = target.events();
        events.off("notify_state_updated", this.connection_handler_callbacks.notify_state_updated);
        events.off("notify_connection_state_changed", this.connection_handler_callbacks.notify_connection_state_changed);
        //FIXME: Add the host button here!
    }

    private registerConnectionHandlerEvents(target: ConnectionHandler) {
        const events = target.events();
        events.on("notify_state_updated", this.connection_handler_callbacks.notify_state_updated);
        events.on("notify_connection_state_changed", this.connection_handler_callbacks.notify_connection_state_changed);
    }

    componentDidMount(): void {
        server_connections.events().on("notify_active_handler_changed", this.connection_manager_callbacks.active_handler_changed);
        this.event_registry.fire("set_connection_handler", { handler: server_connections.active_connection() });
    }

    componentWillUnmount(): void {
        server_connections.events().off("notify_active_handler_changed", this.connection_manager_callbacks.active_handler_changed);
    }

    /* Active server connection handler events */
    private handleConnectionHandlerStateChange(event: ConnectionEvents["notify_state_updated"]) {
        const type_mapping: {[T in ConnectionStateUpdateType]:ControlStateUpdateType[]} = {
            "microphone": ["microphone"],
            "speaker": ["speaker"],
            "away": ["away"],
            "subscribe": ["subscribe-mode"],
            "query": ["query"]
        };
        for(const type of type_mapping[event.state] || [])
            this.event_registry.fire("update_state", { state: type });
    }

    private handleConnectionHandlerConnectionStateChange(/* event: ConnectionEvents["notify_connection_state_changed"] */) {
        this.event_registry.fire("update_state", { state: "connect-state" });
    }

    /* own update & state gathering events */
    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateHostButton(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "host-button" && event.as<"update_state">().state !== "connect-state")
                return;

        const server_props = this.connection?.channelTree.server?.properties;
        if(!this.connection?.connected || !server_props || !server_props.virtualserver_hostbutton_gfx_url) {
            this.event_registry.fire("update_host_button", {
                url: undefined,
                target_url: undefined,
                title: undefined
            });
            return;
        }

        this.event_registry.fire("update_host_button", {
            url: server_props.virtualserver_hostbutton_gfx_url,
            target_url: server_props.virtualserver_hostbutton_url,
            title: server_props.virtualserver_hostbutton_tooltip
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateSubscribe(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "subscribe-mode")
                return;

        this.event_registry.fire("update_subscribe_state", {
            subscribeEnabled: !!this.connection?.isSubscribeToAllChannels()
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateConnect(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "connect-state")
                return;

        this.event_registry.fire("update_connect_state", {
            connectedAnywhere: server_connections.all_connections().findIndex(e => e.connected) !== -1,
            connected: !!this.connection?.connected
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateAway(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "away")
                return;

        const connections = server_connections.all_connections();
        const away_connections = server_connections.all_connections().filter(e => e.isAway());

        const away_status = !!this.connection?.isAway();
        this.event_registry.fire("update_away_state", {
            awayAnywhere: away_connections.length > 0,
            away: away_status,
            awayAll: connections.length === away_connections.length
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateMicrophone(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "microphone")
                return;

        this.event_registry.fire("update_microphone_state", {
            enabled: !this.connection?.isMicrophoneDisabled(),
            muted: !!this.connection?.isMicrophoneMuted()
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateSpeaker(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "speaker")
                return;

        this.event_registry.fire("update_speaker_state", {
            muted: !!this.connection?.isSpeakerMuted()
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateQuery(event: Event<InternalControlBarEvents>) {
        if(event.type === "update_state")
            if(event.as<"update_state">().state !== "query")
                return;

        this.event_registry.fire("update_query_state", {
            queryShown: !!this.connection?.areQueriesShown()
        });
    }

    @EventHandler<InternalControlBarEvents>(["update_state_all", "update_state"])
    private updateStateBookmarks(event: Event<InternalControlBarEvents>) {
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

export type ControlStateUpdateType = "host-button" | "bookmarks" | "subscribe-mode" | "connect-state" | "away" | "microphone" | "speaker" | "query";
export interface ControlBarEvents {
    update_state: {
        state: "host-button" | "bookmarks" | "subscribe-mode" | "connect-state" | "away" | "microphone" | "speaker" | "query"
    },

    server_updated: {
        handler: ConnectionHandler,
        category: "audio" | "settings-initialized" | "connection-state" | "away-status" | "hostbanner"
    }
}

export interface InternalControlBarEvents extends ControlBarEvents {
    /* update the UI */
    update_host_button: HostButtonState;
    update_subscribe_state: ChannelSubscribeState;
    update_connect_state: ConnectionState;
    update_away_state: AwayState;
    update_microphone_state: MicrophoneState;
    update_speaker_state: SpeakerState;
    update_query_state: QueryState;
    update_bookmarks: {},
    update_state_all: { },


    /* UI-Actions */
    action_set_subscribe: { subscribe: boolean },
    action_disconnect: { globally: boolean },

    action_enable_microphone: {}, /* enable/unmute microphone */
    action_disable_microphone: {},

    action_enable_speaker: {},
    action_disable_speaker: {},

    action_disable_away: {
        globally: boolean
    },
    action_set_away: {
        globally: boolean;
        prompt_reason: boolean;
    },

    action_toggle_query: {
        shown: boolean
    },

    action_open_window: {
        window: "bookmark-manage" | "query-manage"
    },

    action_add_current_server_to_bookmarks: {},

    /* manly used for the action handler */
    set_connection_handler: {
        handler?: ConnectionHandler
    }
}


function initialize(event_registry: Registry<InternalControlBarEvents>) {
    let current_connection_handler: ConnectionHandler;

    event_registry.on("set_connection_handler", event => current_connection_handler = event.handler);

    event_registry.on("action_disconnect", event => {
        (event.globally ? server_connections.all_connections() : [server_connections.active_connection()]).filter(e => !!e).forEach(connection => {
            connection.disconnectFromServer();
        });
    });

    event_registry.on("action_set_away", event => {
        const set_away = message => {
            const value = typeof message === "string" ? message : true;
            (event.globally ? server_connections.all_connections() : [server_connections.active_connection()]).filter(e => !!e).forEach(connection => {
                connection.setAway(value);
            });
            settings.changeGlobal(Settings.KEY_CLIENT_STATE_AWAY, true);
            settings.changeGlobal(Settings.KEY_CLIENT_AWAY_MESSAGE, typeof value === "boolean" ? "" : value);
        };

        if(event.prompt_reason) {
            createInputModal(tr("Set away message"), tr("Please enter your away message"), () => true, message => {
                if(typeof(message) === "string")
                    set_away(message);
            }).open();
        } else {
            set_away(undefined);
        }
    });

    event_registry.on("action_disable_away", event => {
        for(const connection of event.globally ? server_connections.all_connections() : [server_connections.active_connection()]) {
            if(!connection) continue;

            connection.setAway(false);
        }

        settings.changeGlobal(Settings.KEY_CLIENT_STATE_AWAY, false);
    });


    event_registry.on(["action_enable_microphone", "action_disable_microphone"], event => {
        const state = event.type === "action_enable_microphone";
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_MICROPHONE_MUTED,  !state);

        if(current_connection_handler) {
            current_connection_handler.setMicrophoneMuted(!state);
            current_connection_handler.acquireInputHardware().then(() => {});
        }
    });

    event_registry.on(["action_enable_speaker", "action_disable_speaker"], event => {
        const state = event.type === "action_enable_speaker";
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_SPEAKER_MUTED, !state);

        current_connection_handler?.setSpeakerMuted(!state);
    });

    event_registry.on("action_set_subscribe", event => {
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS, event.subscribe);

        current_connection_handler?.setSubscribeToAllChannels(event.subscribe);
    });

    event_registry.on("action_toggle_query", event => {
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_QUERY_SHOWN, event.shown);

        current_connection_handler?.setQueriesShown(event.shown);
    });

    event_registry.on("action_add_current_server_to_bookmarks", () => add_server_to_bookmarks(current_connection_handler));

    event_registry.on("action_open_window", event => {
        switch (event.window) {
            case "bookmark-manage":
                global_client_actions.fire("action_open_window", { window: "bookmark-manage", connection: current_connection_handler });
                return;

            case "query-manage":
                global_client_actions.fire("action_open_window", { window: "query-manage", connection: current_connection_handler });
                return;
        }
    })
}