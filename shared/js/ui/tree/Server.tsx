import {BatchUpdateAssignment, BatchUpdateType} from "tc-shared/ui/react-elements/ReactComponentBase";
import {ServerEntry as ServerEntryController, ServerEvents} from "../../tree/Server";
import * as React from "react";
import {LocalIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {EventHandler, ReactEventHandler} from "tc-shared/events";
import {Settings, settings} from "tc-shared/settings";
import {TreeEntry, UnreadMarker} from "tc-shared/ui/tree/TreeEntry";
import {ConnectionEvents, ConnectionState} from "tc-shared/ConnectionHandler";

const serverStyle = require("./Server.scss");
const viewStyle = require("./View.scss");


export interface ServerEntryProperties {
    server: ServerEntryController;
    offset: number;
}

export interface ServerEntryState {
    connection_state: "connected" | "connecting" | "disconnected";
}

@ReactEventHandler<ServerEntry>(e => e.props.server.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ServerEntry extends TreeEntry<ServerEntryProperties, ServerEntryState> {
    private handle_connection_state_change;

    protected defaultState(): ServerEntryState {
        return {connection_state: this.props.server ? ServerEntry.connectionState2String(this.props.server.channelTree.client.connection_state) : "disconnected"};
    }

    private static connectionState2String(state: ConnectionState) {
        switch (state) {
            case ConnectionState.AUTHENTICATING:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                return "connecting";

            case ConnectionState.CONNECTED:
                return "connected";

            case ConnectionState.DISCONNECTING:
            case ConnectionState.UNCONNECTED:
                return "disconnected";
        }
    }

    protected initialize() {
        this.handle_connection_state_change = (event: ConnectionEvents["notify_connection_state_changed"]) => this.setState({
            connection_state: ServerEntry.connectionState2String(event.new_state)
        });
    }

    shouldComponentUpdate(nextProps: Readonly<ServerEntryProperties>, nextState: Readonly<ServerEntryState>, nextContext: any): boolean {
        return this.state.connection_state !== nextState.connection_state ||
            this.props.offset !== nextProps.offset ||
            this.props.server !== nextProps.server;
    }

    componentDidMount(): void {
        this.props.server.channelTree.client.events().on("notify_connection_state_changed", this.handle_connection_state_change);
    }

    componentWillUnmount(): void {
        this.props.server.channelTree.client.events().off("notify_connection_state_changed", this.handle_connection_state_change);
    }

    render() {
        let name = this.props.server.properties.virtualserver_name;
        if (this.state.connection_state === "disconnected")
            name = tr("Not connected to any server");
        else if (this.state.connection_state === "connecting")
            name = tr("Connecting to ") + this.props.server.remote_address.host + (this.props.server.remote_address.port !== 9987 ? ":" + this.props.server.remote_address.host : "");

        return <div
            className={this.classList(serverStyle.serverEntry, viewStyle.treeEntry, this.props.server.isSelected() && viewStyle.selected)}
            style={{top: this.props.offset}}
            onMouseUp={e => this.onMouseUp(e)}
            onContextMenu={e => this.onContextMenu(e)}
        >
            <UnreadMarker entry={this.props.server}/>
            <div className={"icon client-server_green " + serverStyle.server_type}/>
            <div className={this.classList(serverStyle.name)}>{name}</div>
            <LocalIconRenderer
                icon={this.props.server.channelTree.client.fileManager?.icons.load_icon(this.props.server.properties.virtualserver_icon_id)}/>
        </div>
    }

    private onMouseUp(event: React.MouseEvent) {
        if (event.button !== 0) return; /* only left mouse clicks */
        if (this.props.server.channelTree.isClientMoveActive()) return;

        this.props.server.channelTree.events.fire("action_select_entries", {
            entries: [this.props.server],
            mode: "auto"
        });
    }

    private onContextMenu(event: React.MouseEvent) {
        if (settings.static(Settings.KEY_DISABLE_CONTEXT_MENU))
            return;

        event.preventDefault();
        const server = this.props.server;
        if (server.channelTree.selection.is_multi_select() && server.isSelected())
            return;

        server.channelTree.events.fire("action_select_entries", {
            entries: [server],
            mode: "exclusive"
        });
        server.spawnContextMenu(event.pageX, event.pageY);
    }

    @EventHandler<ServerEvents>("notify_properties_updated")
    private handlePropertiesUpdated(event: ServerEvents["notify_properties_updated"]) {
        if (typeof event.updated_properties.virtualserver_name !== "undefined" || typeof event.updated_properties.virtualserver_icon_id !== "undefined") {
            this.forceUpdate();
        }
    }

    @EventHandler<ServerEvents>("notify_select_state_change")
    private handleServerSelectStateChange() {
        this.forceUpdate();
    }
}