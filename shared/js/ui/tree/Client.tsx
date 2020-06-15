import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
import {
    ClientEntry as ClientEntryController,
    ClientEvents,
    ClientProperties,
    ClientType,
    LocalClientEntry, MusicClientEntry
} from "../client";
import {EventHandler, ReactEventHandler} from "tc-shared/events";
import {Group, GroupEvents} from "tc-shared/permission/GroupManager";
import {Settings, settings} from "tc-shared/settings";
import {TreeEntry, UnreadMarker} from "tc-shared/ui/tree/TreeEntry";
import {LocalIconRenderer} from "tc-shared/ui/react-elements/Icon";
import * as DOMPurify from "dompurify";

const clientStyle = require("./Client.scss");
const viewStyle = require("./View.scss");

interface ClientIconProperties {
    client: ClientEntryController;
}

@ReactEventHandler<ClientSpeakIcon>(e => e.props.client.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ClientSpeakIcon extends ReactComponentBase<ClientIconProperties, {}> {
    private static readonly IconUpdateKeys: (keyof ClientProperties)[] = [
        "client_away",
        "client_input_hardware",
        "client_output_hardware",
        "client_output_muted",
        "client_input_muted",
        "client_is_channel_commander",
        "client_talk_power"
    ];

    render() {
        let icon: string = "";
        let clicon: string = "";

        const client = this.props.client;
        const properties = client.properties;

        if(properties.client_type_exact == ClientType.CLIENT_QUERY) {
            icon = "client-server_query";
        } else {
            if (properties.client_away) {
                icon = "client-away";
            } else if (!client.get_audio_handle() && !(this instanceof LocalClientEntry)) {
                icon = "client-input_muted_local";
            } else if(!properties.client_output_hardware) {
                icon = "client-hardware_output_muted";
            } else if(properties.client_output_muted) {
                icon = "client-output_muted";
            } else if(!properties.client_input_hardware) {
                icon = "client-hardware_input_muted";
            } else if(properties.client_input_muted) {
                icon = "client-input_muted";
            } else {
                if(client.isSpeaking()) {
                    if(properties.client_is_channel_commander)
                        clicon = "client_cc_talk";
                    else
                        clicon = "client_talk";
                } else {
                    if(properties.client_is_channel_commander)
                        clicon = "client_cc_idle";
                    else
                        clicon = "client_idle";
                }
            }
        }

        if(clicon.length > 0)
            return <div className={"clicon " + clicon} />;
        else if(icon.length > 0)
            return <div className={"icon " + icon} />;
        else
            return null;
    }

    @EventHandler<ClientEvents>("notify_properties_updated")
    private handlePropertiesUpdated(event: ClientEvents["notify_properties_updated"]) {
        for(const key of ClientSpeakIcon.IconUpdateKeys)
            if(key in event.updated_properties) {
                this.forceUpdate();
                return;
            }
    }

    @EventHandler<ClientEvents>("notify_mute_state_change")
    private handleMuteStateChange() {
        this.forceUpdate();
    }

    @EventHandler<ClientEvents>("notify_speak_state_change")
    private handleSpeakStateChange() {
        this.forceUpdate();
    }
}

interface ClientServerGroupIconsProperties {
    client: ClientEntryController;
}

@ReactEventHandler<ClientServerGroupIcons>(e => e.props.client.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ClientServerGroupIcons extends ReactComponentBase<ClientServerGroupIconsProperties, {}> {
    private subscribed_groups: Group[] = [];
    private group_updated_callback;

    protected initialize() {
        this.group_updated_callback = (event: GroupEvents["notify_properties_updated"]) => {
            if(event.updated_properties.indexOf("sort-id") !== -1 || event.updated_properties.indexOf("icon") !== -1)
                this.forceUpdate();
        };
    }

    private unsubscribeGroupEvents() {
        this.subscribed_groups.forEach(e => e.events.off("notify_properties_updated", this.group_updated_callback));
        this.subscribed_groups = [];
    }

    componentWillUnmount(): void {
        this.unsubscribeGroupEvents();
    }

    render() {
        this.unsubscribeGroupEvents();

        const groups = this.props.client.assignedServerGroupIds()
                            .map(e => this.props.client.channelTree.client.groups.findServerGroup(e)).filter(e => !!e);
        if(groups.length === 0) return null;

        groups.forEach(e => {
            e.events.on("notify_properties_updated", this.group_updated_callback);
            this.subscribed_groups.push(e);
        });

        const group_icons = groups.filter(e => e?.properties.iconid)
                                  .sort((a, b) => a.properties.sortid - b.properties.sortid);
        if(group_icons.length === 0) return null;
        return [
            group_icons.map(e => {
                return <LocalIconRenderer key={"group-icon-" + e.id} icon={this.props.client.channelTree.client.fileManager.icons.load_icon(e.properties.iconid)} />;
            })
        ];
    }

    @EventHandler<ClientEvents>("notify_properties_updated")
    private handlePropertiesUpdated(event: ClientEvents["notify_properties_updated"]) {
        if(typeof event.updated_properties.client_servergroups)
            this.forceUpdate();
    }
}

interface ClientChannelGroupIconProperties {
    client: ClientEntryController;
}

@ReactEventHandler<ClientChannelGroupIcon>(e => e.props.client.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ClientChannelGroupIcon extends ReactComponentBase<ClientChannelGroupIconProperties, {}> {
    private subscribed_group: Group | undefined;
    private group_updated_callback;

    protected initialize() {
        this.group_updated_callback = (event: GroupEvents["notify_properties_updated"]) => {
            if(event.updated_properties.indexOf("sort-id") !== -1 || event.updated_properties.indexOf("icon") !== -1)
                this.forceUpdate();
        };
    }

    private unsubscribeGroupEvent() {
        this.subscribed_group?.events.off("notify_properties_updated", this.group_updated_callback);
    }

    componentWillUnmount(): void {
        this.unsubscribeGroupEvent();
    }

    render() {
        this.unsubscribeGroupEvent();

        const cgid = this.props.client.assignedChannelGroup();
        if(cgid === 0) return null;

        const channel_group = this.props.client.channelTree.client.groups.findChannelGroup(cgid);
        if(!channel_group) return null;

        channel_group.events.on("notify_properties_updated", this.group_updated_callback);
        this.subscribed_group = channel_group;

        if(channel_group.properties.iconid === 0) return null;
        return <LocalIconRenderer key={"cg-icon"} icon={this.props.client.channelTree.client.fileManager.icons.load_icon(channel_group.properties.iconid)} />;
    }

    @EventHandler<ClientEvents>("notify_properties_updated")
    private handlePropertiesUpdated(event: ClientEvents["notify_properties_updated"]) {
        if(typeof event.updated_properties.client_servergroups)
            this.forceUpdate();
    }
}

interface ClientIconsProperties {
    client: ClientEntryController;
}

@ReactEventHandler<ClientIcons>(e => e.props.client.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ClientIcons extends ReactComponentBase<ClientIconsProperties, {}> {
    render() {
        const icons = [];
        const talk_power = this.props.client.properties.client_talk_power;
        const needed_talk_power = this.props.client.currentChannel()?.properties.channel_needed_talk_power || 0;
        if(talk_power !== -1 && needed_talk_power !== 0 && needed_talk_power > talk_power)
            icons.push(<div key={"muted"} className={"icon icon_talk_power client-input_muted"} />);

        icons.push(<ClientServerGroupIcons key={"sg-icons"} client={this.props.client} />);
        icons.push(<ClientChannelGroupIcon key={"channel-icons"} client={this.props.client} />);
        if(this.props.client.properties.client_icon_id !== 0)
            icons.push(<LocalIconRenderer key={"client-icon"} icon={this.props.client.channelTree.client.fileManager.icons.load_icon(this.props.client.properties.client_icon_id)} />);

        return (
            <div className={clientStyle.containerIcons}>
                {icons}
            </div>
        )
    }

    @EventHandler<ClientEvents>("notify_properties_updated")
    private handlePropertiesUpdated(event: ClientEvents["notify_properties_updated"]) {
        if(typeof event.updated_properties.client_channel_group_id !== "undefined" || typeof event.updated_properties.client_talk_power !== "undefined" || typeof event.updated_properties.client_icon_id !== "undefined")
            this.forceUpdate();
    }
}

interface ClientNameProperties {
    client: ClientEntryController;
}

interface ClientNameState {
    group_prefix: string;
    group_suffix: string;

    away_message: string;
}

/* group prefix & suffix, away message */
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
@ReactEventHandler<ClientName>(e => e.props.client.events)
class ClientName extends ReactComponentBase<ClientNameProperties, ClientNameState> {
    /* FIXME: Update prefix/suffix if a server/channel group updates! */
    protected initialize() {
        this.state = {} as any;
        this.updateGroups(this.state);
        this.updateAwayMessage(this.state);
    }

    protected defaultState(): ClientNameState {
        return {
            group_prefix: "",
            away_message: "",
            group_suffix: ""
        }
    }

    render() {
        return <div className={this.classList(clientStyle.clientName, this.props.client instanceof LocalClientEntry && clientStyle.clientNameOwn)}>
            {this.state.group_prefix + this.props.client.clientNickName() + this.state.group_suffix + this.state.away_message}
        </div>
    }

    private updateGroups(state: ClientNameState) {
        let prefix_groups: string[] = [];
        let suffix_groups: string[] = [];
        for(const group_id of this.props.client.assignedServerGroupIds()) {
            const group = this.props.client.channelTree.client.groups.findServerGroup(group_id);
            if(!group) continue;

            if(group.properties.namemode == 1)
                prefix_groups.push(group.name);
            else if(group.properties.namemode == 2)
                suffix_groups.push(group.name);
        }

        const channel_group = this.props.client.channelTree.client.groups.findChannelGroup(this.props.client.assignedChannelGroup());
        if(channel_group) {
            if(channel_group.properties.namemode == 1)
                prefix_groups.push(channel_group.name);
            else if(channel_group.properties.namemode == 2)
                suffix_groups.splice(0, 0, channel_group.name);
        }

        state.group_prefix = suffix_groups.map(e => "[" + e + "]").join("");
        state.group_suffix = prefix_groups.map(e => "[" + e + "]").join("");
    }

    private updateAwayMessage(state: ClientNameState) {
        state.away_message = this.props.client.properties.client_away_message && " [" + this.props.client.properties.client_away_message + "]";
    }

    @EventHandler<ClientEvents>("notify_properties_updated")
    private handlePropertiesChanged(event: ClientEvents["notify_properties_updated"]) {
        const updatedState: ClientNameState = {} as any;
        if(typeof event.updated_properties.client_away !== "undefined" || typeof event.updated_properties.client_away_message !== "undefined") {
            this.updateAwayMessage(updatedState);
        }
        if(typeof event.updated_properties.client_servergroups !== "undefined" || typeof event.updated_properties.client_channel_group_id !== "undefined") {
            this.updateGroups(updatedState);
        }

        if(Object.keys(updatedState).length > 0)
            this.setState(updatedState);
        else if(typeof event.updated_properties.client_nickname !== "undefined") {
            this.forceUpdate();
        }
    }
}

interface ClientNameEditProps {
    editFinished: (new_name?: string) => void;
    initialName: string;
}

class ClientNameEdit extends ReactComponentBase<ClientNameEditProps, {}> {
    private readonly ref_div: React.RefObject<HTMLDivElement> = React.createRef();

    componentDidMount(): void {
        this.ref_div.current.focus();
    }

    render() {
        return <div
            className={this.classList(clientStyle.clientName, clientStyle.edit)}
            contentEditable={true}
            ref={this.ref_div}
            dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(this.props.initialName)}}
            onBlur={e => this.onBlur()}
            onKeyPress={e => this.onKeyPress(e)}
        />
    }

    private onBlur() {
        this.props.editFinished(this.ref_div.current.textContent);
    }

    private onKeyPress(event: React.KeyboardEvent) {
        if(event.key === "Enter") {
            event.preventDefault();
            this.onBlur();
        }
    }
}

export interface ClientEntryProperties {
    client: ClientEntryController;
    depth: number;
    offset: number;
}

export interface ClientEntryState {
    rename: boolean;
    renameInitialName?: string;
}

@ReactEventHandler<ClientEntry>(e => e.props.client.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ClientEntry extends TreeEntry<ClientEntryProperties, ClientEntryState> {
    shouldComponentUpdate(nextProps: Readonly<ClientEntryProperties>, nextState: Readonly<ClientEntryState>, nextContext: any): boolean {
        return nextState.rename !== this.state.rename ||
               nextProps.offset !== this.props.offset ||
               nextProps.client !== this.props.client ||
               nextProps.depth !== this.props.depth;
    }

    render() {
        return (
            <div className={this.classList(clientStyle.clientEntry, viewStyle.treeEntry, this.props.client.isSelected() && viewStyle.selected)}
                 style={{ paddingLeft: (this.props.depth * 16 + 2) + "px", top: this.props.offset }}
                 onDoubleClick={() => this.onDoubleClick()}
                 onMouseUp={e => this.onMouseUp(e)}
                 onContextMenu={e => this.onContextMenu(e)}
            >
                <UnreadMarker entry={this.props.client} />
                <ClientSpeakIcon client={this.props.client} />
                {this.state.rename ?
                    <ClientNameEdit key={"rename"} editFinished={name => this.onEditFinished(name)} initialName={this.state.renameInitialName || this.props.client.properties.client_nickname} /> :
                    [<ClientName key={"name"} client={this.props.client} />, <ClientIcons key={"icons"} client={this.props.client} />] }
            </div>
        )
    }

    private onDoubleClick() {
        const client = this.props.client;
        if(client.channelTree.selection.is_multi_select()) return;

        if(this.props.client instanceof LocalClientEntry) {
            this.props.client.openRename();
        } else if(this.props.client instanceof MusicClientEntry) {
            /* no action defined yet */
        } else {
            this.props.client.open_text_chat();
        }
    }

    private onEditFinished(new_name?: string) {
        if(!(this.props.client instanceof LocalClientEntry))
            throw "Only local clients could be renamed";

        if(new_name && new_name !== this.state.renameInitialName) {
            const client = this.props.client;
            client.renameSelf(new_name).then(result => {
                if(!result)
                    this.setState({ rename: true, renameInitialName: new_name }); //TODO: Keep last name?
            });
        }
        this.setState({ rename: false });
    }

    private onMouseUp(event: React.MouseEvent) {
        if(event.button !== 0) return; /* only left mouse clicks */
        const tree = this.props.client.channelTree;
        if(tree.isClientMoveActive()) return;

        tree.events.fire("action_select_entries", { entries: [this.props.client], mode: "auto" });
    }

    private onContextMenu(event: React.MouseEvent) {
        if(settings.static(Settings.KEY_DISABLE_CONTEXT_MENU))
            return;

        event.preventDefault();
        const client = this.props.client;
        if(client.channelTree.selection.is_multi_select() && client.isSelected()) return;

        client.channelTree.events.fire("action_select_entries", {
            entries: [ client ],
            mode: "exclusive"
        });
        client.showContextMenu(event.pageX, event.pageY);
    }

    @EventHandler<ClientEvents>("notify_select_state_change")
    private handleSelectChangeState() {
        this.forceUpdate();
    }
}