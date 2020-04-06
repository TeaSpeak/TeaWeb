import * as React from "react";
import {Button} from "./button";
import {DropdownEntry} from "tc-shared/ui/frames/control-bar/dropdown";
import {Translatable} from "tc-shared/ui/elements/i18n";
import {ReactComponentBase} from "tc-shared/ui/elements/ReactComponentBase";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
const cssStyle = require("./index.scss");
const cssButtonStyle = require("./button.scss");

export interface ControlBarProperties {
    multiSession: boolean;
}

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
                    <DropdownEntry key={"connect-server"} icon={"client-connect"} text={<Translatable message={"Connect to a server"} />} />
                );
            } else {
                subentries.push(
                    <DropdownEntry key={"disconnect-current"} icon={"client-disconnect"} text={<Translatable message={"Disconnect from current server"} />} />
                );
            }
            subentries.push(
                <DropdownEntry key={"connect-new-tab"} icon={"client-connect"} text={<Translatable message={"Connect to a server in another tab"} />} />
            );
        }

        if(!this.state.connected) {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-connect"} tooltip={tr("Connect to a server")}>
                    {subentries}
                </Button>
            );
        } else {
            return (
                <Button colorTheme={"default"} autoSwitch={false} iconNormal={"client-disconnect"} tooltip={tr("Disconnect from server")}>
                    {subentries}
                </Button>
            );
        }
    }

    @EventHandler<ControlBarEvents>("set_connect_state")
    private handleStateUpdate(state: ConnectionState) {
        this.updateState(state);
    }
}

class BookmarkButton extends ReactComponentBase<{ event_registry: Registry<ControlBarEvents> }, {}> {
    protected default_state() {
        return {};
    }

    render() {
        //TODO: <DropdownEntry icon={"client-bookmark_remove"} text={<Translatable message={"Remove current server to bookmarks"} />} />
        return (
            <Button dropdownButtonExtraClass={cssButtonStyle.buttonBookmarks} autoSwitch={false} iconNormal={"client-bookmark_manager"}>
                <DropdownEntry icon={"client-bookmark_manager"} text={<Translatable message={"Manage bookmarks"} />} />
                <DropdownEntry icon={"client-bookmark_add"} text={<Translatable message={"Add current server to bookmarks"} />} />
                <hr />
                <DropdownEntry text={<Translatable message={"Bookmark X"} />} />
                <DropdownEntry text={<Translatable message={"Bookmark Y"} />} />
            </Button>
        )
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
            dropdowns.push(<DropdownEntry key={"cgo"} icon={"client-present"} text={<Translatable message={"Go online"} />} />);
            dropdowns.push(<DropdownEntry key={"sam"} icon={"client-away"} text={<Translatable message={"Set away message on this server"} />} />);
        } else {
            dropdowns.push(<DropdownEntry key={"sas"} icon={"client-away"} text={<Translatable message={"Set away on this server"} />} />);
        }

        dropdowns.push(<hr key={"-hr"} />);
        if(!this.state.awayAll) {
            dropdowns.push(<DropdownEntry key={"saa"} icon={"client-away"} text={<Translatable message={"Set away on all servers"} />} />);
        }
        if(this.state.awayAnywhere) {
            dropdowns.push(<DropdownEntry key={"goa"} icon={"client-present"} text={<Translatable message={"Go online for all servers"} />} />);
            dropdowns.push(<DropdownEntry key={"sama"} icon={"client-present"} text={<Translatable message={"Set away message for all servers"} />} />);
        } else {
            dropdowns.push(<DropdownEntry key={"goas"} icon={"client-away"} text={<Translatable message={"Go away for all servers"} />} />);
        }

        /* switchable because we're switching it manually */
        return (
            <Button autoSwitch={false} iconNormal={this.state.away ? "client-present" : "client-away"}>
                {dropdowns}
            </Button>
        );
    }

    @EventHandler<ControlBarEvents>("set_away_state")
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
        return <Button switched={this.state.subscribeEnabled} autoSwitch={false} iconNormal={"client-unsubscribe_from_all_channels"} iconSwitched={"client-subscribe_to_all_channels"} onToggle={this.onToggle.bind(this)} />;
    }

    private onToggle() {
        this.updateState({
            subscribeEnabled: !this.state.subscribeEnabled
        });
    }

    @EventHandler<ControlBarEvents>("set_subscribe_state")
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
            return <Button autoSwitch={false} iconNormal={"client-activate_microphone"} tooltip={tr("Enable your microphone on this server")} />;
        if(this.state.muted)
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Unmute microphone")} />;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-input_muted"} tooltip={tr("Mute microphone")} />;
    }

    @EventHandler<ControlBarEvents>("set_microphone_state")
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
            return <Button switched={true} colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Unmute headphones")} />;
        return <Button colorTheme={"red"} autoSwitch={false} iconNormal={"client-output_muted"} tooltip={tr("Mute headphones")} />;
    }

    @EventHandler<ControlBarEvents>("set_speaker_state")
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
            toggle = <DropdownEntry icon={""} text={<Translatable message={"Hide server queries"} />}/>;
        else
            toggle = <DropdownEntry icon={"client-toggle_server_query_clients"} text={<Translatable message={"Show server queries"} />}/>;
        return (
            <Button autoSwitch={false} iconNormal={"client-server_query"}>
                {toggle}
                <DropdownEntry icon={"client-server_query"} text={<Translatable message={"Manage server queries"} />}/>
            </Button>
        )
    }

    @EventHandler<ControlBarEvents>("set_query_state")
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
                href={this.state.target_url || this.state.url}>
                <img alt={tr("Hostbutton")} src={this.state.url} />
            </a>
        );
    }

    @EventHandler<ControlBarEvents>("set_host_button")
    private handleStateUpdate(state: HostButtonState) {
        this.updateState(state);
    }
}

@ReactEventHandler<ControlBar>(obj => obj.event_registry)
export class ControlBar extends React.Component<ControlBarProperties, {}> {
    private readonly event_registry: Registry<ControlBarEvents>;
    private connection: ConnectionHandler;

    constructor(props) {
        super(props);

        this.event_registry = new Registry<ControlBarEvents>();
    }

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
        this.event_registry.fire("update_all_states");
    }

    @EventHandler<ControlBarEvents>(["update_all_states", "update_state"])
    private updateStateHostButton(event) {
    }
}

export interface ControlBarEvents {
    set_host_button: HostButtonState;
    set_subscribe_state: ChannelSubscribeState;
    set_connect_state: ConnectionState;
    set_away_state: AwayState;
    set_microphone_state: MicrophoneState;
    set_speaker_state: SpeakerState;
    set_query_state: QueryState;

    update_state: {
        states: "host-button" | "subscribe-mode" | "connect-state" | "away" | "microphone" | "speaker" | "query"
    }

    update_all_states: {},

    set_connection_handler: {
        handler?: ConnectionHandler
    }
}