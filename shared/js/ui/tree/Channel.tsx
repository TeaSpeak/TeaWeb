import {
    BatchUpdateAssignment,
    BatchUpdateType,
    ReactComponentBase
} from "tc-shared/ui/react-elements/ReactComponentBase";
import * as React from "react";
import {ChannelEntry as ChannelEntryController, ChannelEvents, ChannelProperties} from "../channel";
import {LocalIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {EventHandler, ReactEventHandler} from "tc-shared/events";
import {Settings, settings} from "tc-shared/settings";
import {TreeEntry, UnreadMarker} from "tc-shared/ui/tree/TreeEntry";
import {spawnFileTransferModal} from "tc-shared/ui/modal/transfer/ModalFileTransfer";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";

const channelStyle = require("./Channel.scss");
const viewStyle = require("./View.scss");

interface ChannelEntryIconsProperties {
    channel: ChannelEntryController;
}

interface ChannelEntryIconsState {
    icons_shown: boolean;

    is_default: boolean;
    is_password_protected: boolean;
    is_music_quality: boolean;
    is_moderated: boolean;
    is_codec_supported: boolean;

    custom_icon_id: number;
}

@ReactEventHandler<ChannelEntryIcons>(e => e.props.channel.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ChannelEntryIcons extends ReactComponentBase<ChannelEntryIconsProperties, ChannelEntryIconsState> {
    private readonly listenerVoiceStatusChange;
    private serverConnection: AbstractServerConnection;

    constructor(props) {
        super(props);

        this.listenerVoiceStatusChange = () => {
            let stateUpdate = {} as ChannelEntryIconsState;
            this.updateVoiceStatus(stateUpdate, this.props.channel.properties.channel_codec);
            this.setState(stateUpdate);
        }
    }

    componentDidMount() {
        const voiceConnection = this.serverConnection.getVoiceConnection();
        voiceConnection.events.on("notify_connection_status_changed", this.listenerVoiceStatusChange);
    }

    componentWillUnmount() {
        const voiceConnection = this.serverConnection.getVoiceConnection();
        voiceConnection.events.off("notify_connection_status_changed", this.listenerVoiceStatusChange);
    }

    protected defaultState(): ChannelEntryIconsState {
        this.serverConnection = this.props.channel.channelTree.client.serverConnection;

        const properties = this.props.channel.properties;
        const status = {
            icons_shown: this.props.channel.parsed_channel_name.alignment === "normal",
            custom_icon_id: properties.channel_icon_id,
            is_music_quality: properties.channel_codec === 3 || properties.channel_codec === 5,
            is_codec_supported: false,
            is_default: properties.channel_flag_default,
            is_password_protected: properties.channel_flag_password,
            is_moderated: properties.channel_needed_talk_power !== 0
        }
        this.updateVoiceStatus(status, this.props.channel.properties.channel_codec);

        return status;
    }

    render() {
        let icons = [];

        if(!this.state.icons_shown)
            return null;

        if(this.state.is_default)
            icons.push(<ClientIconRenderer key={"icon-default"} icon={ClientIcon.ChannelDefault} title={tr("Default channel")} />);

        if(this.state.is_password_protected)
            icons.push(<ClientIconRenderer key={"icon-protected"} icon={ClientIcon.Register} title={tr("The channel is password protected")} />);

        if(this.state.is_music_quality)
            icons.push(<ClientIconRenderer key={"icon-music"} icon={ClientIcon.Music} title={tr("Music quality")} />);

        if(this.state.is_moderated)
            icons.push(<ClientIconRenderer key={"icon-moderated"} icon={ClientIcon.Moderated} title={tr("Channel is moderated")} />);

        if(this.state.custom_icon_id)
            icons.push(<LocalIconRenderer  key={"icon-custom"} icon={this.props.channel.channelTree.client.fileManager.icons.load_icon(this.state.custom_icon_id)} title={tr("Client icon")} />);

        if(!this.state.is_codec_supported) {
            icons.push(<div key={"icon-unsupported"} className={channelStyle.icon_no_sound}>
                <div className={"icon_entry icon client-conflict-icon"} title={tr("You don't support the channel codec")} />
                <div className={channelStyle.background} />
            </div>);
        }
        
        return <span className={channelStyle.icons}>
            {icons}
        </span>
    }

    @EventHandler<ChannelEvents>("notify_properties_updated")
    private handlePropertiesUpdate(event: ChannelEvents["notify_properties_updated"]) {
        let updates = {} as ChannelEntryIconsState;
        if(typeof event.updated_properties.channel_icon_id !== "undefined")
            updates.custom_icon_id = event.updated_properties.channel_icon_id;

        if(typeof event.updated_properties.channel_codec !== "undefined" || typeof event.updated_properties.channel_codec_quality !== "undefined") {
            const codec = event.channel_properties.channel_codec;
            updates.is_music_quality = codec === 3 || codec === 5;
        }

        if(typeof event.updated_properties.channel_codec !== "undefined") {
            this.updateVoiceStatus(updates, event.channel_properties.channel_codec);
        }

        if(typeof event.updated_properties.channel_flag_default !== "undefined")
            updates.is_default = event.updated_properties.channel_flag_default;

        if(typeof event.updated_properties.channel_flag_password !== "undefined")
            updates.is_password_protected = event.updated_properties.channel_flag_password;

        if(typeof event.updated_properties.channel_needed_talk_power !== "undefined")
            updates.is_moderated = event.updated_properties.channel_needed_talk_power !== 0;

        if(typeof event.updated_properties.channel_name !== "undefined")
            updates.icons_shown = this.props.channel.parsed_channel_name.alignment === "normal";

        this.setState(updates);
    }

    private updateVoiceStatus(state: ChannelEntryIconsState, currentCodec: number) {
        const voiceConnection = this.serverConnection.getVoiceConnection();
        const voiceState = voiceConnection.getConnectionState();

        switch (voiceState) {
            case VoiceConnectionStatus.Connected:
                state.is_codec_supported = voiceConnection.decodingSupported(currentCodec);
                break;

            default:
                state.is_codec_supported = false;
        }
    }
}

interface ChannelEntryIconProperties {
    channel: ChannelEntryController;
}

@ReactEventHandler<ChannelEntryIcon>(e => e.props.channel.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ChannelEntryIcon extends ReactComponentBase<ChannelEntryIconProperties, {}> {
    private static readonly IconUpdateKeys: (keyof ChannelProperties)[] = [
        "channel_name",
        "channel_flag_password",

        "channel_maxclients",
        "channel_flag_maxclients_unlimited",

        "channel_maxfamilyclients",
        "channel_flag_maxfamilyclients_inherited",
        "channel_flag_maxfamilyclients_unlimited",
    ];

    render() {
        if(this.props.channel.formattedChannelName() !== this.props.channel.channelName())
            return null;

        const channel_properties = this.props.channel.properties;

        let type;
        if(channel_properties.channel_flag_password === true && !this.props.channel.cached_password())
            type = "yellow";
        else if(!channel_properties.channel_flag_maxclients_unlimited && this.props.channel.clients().length >= channel_properties.channel_maxclients)
            type = "red";
        else if(!channel_properties.channel_flag_maxfamilyclients_unlimited && channel_properties.channel_maxfamilyclients >= 0 && this.props.channel.clients(true).length >= channel_properties.channel_maxfamilyclients)
            type = "red";
        else
            type = "green";

        return <div className={"icon client-channel_" + type + (this.props.channel.flag_subscribed ? "_subscribed" : "") + " " + channelStyle.channelType} />;
    }

    @EventHandler<ChannelEvents>("notify_properties_updated")
    private handlePropertiesUpdate(event: ChannelEvents["notify_properties_updated"]) {
        for(const key of ChannelEntryIcon.IconUpdateKeys) {
            if(key in event.updated_properties) {
                this.forceUpdate();
                return;
            }
        }
    }

    /* A client change may cause the channel to show another flag */
    @EventHandler<ChannelEvents>("notify_clients_changed")
    private handleClientsUpdated() {
        this.forceUpdate();
    }

    @EventHandler<ChannelEvents>("notify_cached_password_updated")
    private handleCachedPasswordUpdate() {
        this.forceUpdate();
    }

    @EventHandler<ChannelEvents>("notify_subscribe_state_changed")
    private handleSubscribeModeChanges() {
        this.forceUpdate();
    }
}

interface ChannelEntryNameProperties {
    channel: ChannelEntryController;
}

@ReactEventHandler<ChannelEntryName>(e => e.props.channel.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
class ChannelEntryName extends ReactComponentBase<ChannelEntryNameProperties, {}> {

    render() {
        const name = this.props.channel.parsed_channel_name;
        let class_name: string;
        let text: string;
        if(name.repetitive) {
            class_name = "align-repetitive";
            text = name.text;
            if(text.length) {
                while(text.length < 8000)
                    text += text;
            }
        } else {
            text = name.text;
            class_name = "align-" + name.alignment;
        }

        return <div className={this.classList(channelStyle.containerChannelName, channelStyle[class_name])}>
            <a className={channelStyle.channelName}>{text}</a>
        </div>;
    }

    @EventHandler<ChannelEvents>("notify_properties_updated")
    private handlePropertiesUpdate(event: ChannelEvents["notify_properties_updated"]) {
        if(typeof event.updated_properties.channel_name !== "undefined")
            this.forceUpdate();
    }
}

export interface ChannelEntryViewProperties {
    channel: ChannelEntryController;
    depth: number;
    offset: number;
}


const ChannelCollapsedIndicator = (props: { collapsed: boolean, onToggle: () => void }) => {
    return <div className={channelStyle.containerArrow + (!props.collapsed ? " " + channelStyle.down : "")}><div className={"arrow " + (props.collapsed ? "right" : "down")} onClick={event => {
        event.preventDefault();
        props.onToggle();
    }} /></div>
};

@ReactEventHandler<ChannelEntryView>(e => e.props.channel.events)
@BatchUpdateAssignment(BatchUpdateType.CHANNEL_TREE)
export class ChannelEntryView extends TreeEntry<ChannelEntryViewProperties, {}> {
    shouldComponentUpdate(nextProps: Readonly<ChannelEntryViewProperties>, nextState: Readonly<{}>, nextContext: any): boolean {
        if(nextProps.offset !== this.props.offset)
            return true;
        if(nextProps.depth !== this.props.depth)
            return true;

        return nextProps.channel !== this.props.channel;
    }

    render() {
        const collapsed_indicator = this.props.channel.child_channel_head || this.props.channel.clients(false).length > 0;
        return <div className={this.classList(viewStyle.treeEntry, channelStyle.channelEntry, this.props.channel.isSelected() && viewStyle.selected)}
                    style={{ paddingLeft: this.props.depth * 16 + 2, top: this.props.offset }}
                    onMouseUp={e => this.onMouseUp(e)}
                    onDoubleClick={() => this.onDoubleClick()}
                    onContextMenu={e => this.onContextMenu(e)}
                    onMouseDown={e => this.onMouseDown(e)}
        >
            <UnreadMarker entry={this.props.channel} />
            {collapsed_indicator && <ChannelCollapsedIndicator key={"collapsed-indicator"} onToggle={() => this.onCollapsedToggle()} collapsed={this.props.channel.collapsed} />}
            <ChannelEntryIcon channel={this.props.channel} />
            <ChannelEntryName channel={this.props.channel} />
            <ChannelEntryIcons channel={this.props.channel} />
        </div>;
    }

    private onCollapsedToggle() {
        this.props.channel.collapsed = !this.props.channel.collapsed;
    }

    private onMouseUp(event: React.MouseEvent) {
        if(event.button !== 0) return; /* only left mouse clicks */

        const channel = this.props.channel;
        if(channel.channelTree.isClientMoveActive()) return;

        channel.channelTree.events.fire("action_select_entries", {
            entries: [ channel ],
            mode: "auto"
        });
    }

    private onDoubleClick() {
        const channel = this.props.channel;
        if(channel.channelTree.selection.is_multi_select()) return;

        channel.joinChannel();
    }

    private onMouseDown(event: React.MouseEvent) {
        if(event.buttons !== 4)
            return;

        spawnFileTransferModal(this.props.channel.getChannelId());
    }

    private onContextMenu(event: React.MouseEvent) {
        if(settings.static(Settings.KEY_DISABLE_CONTEXT_MENU))
            return;

        event.preventDefault();
        const channel = this.props.channel;
        if(channel.channelTree.selection.is_multi_select() && channel.isSelected())
            return;

        channel.channelTree.events.fire("action_select_entries", {
            entries: [ channel ],
            mode: "exclusive"
        });
        channel.showContextMenu(event.pageX, event.pageY);
    }

    @EventHandler<ChannelEvents>("notify_select_state_change")
    private handleSelectStateChange() {
        this.forceUpdate();
    }
}