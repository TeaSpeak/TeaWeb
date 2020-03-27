import * as React from "react";
import {ChannelEntry} from "../../channel-tree/channel";

const cssChannel = require("./channel.scss");
const cssTree = require("./tree.scss");

class ChannelIcon extends React.Component<{ channel: ChannelEntry }, {}> {
    channel_icon_classes() {
        const class_list = [];
        const channel = this.props.channel;

        if(channel.formattedChannelName() !== channel.channelName())
            return "channel-spacer";

        let icon_color;
        if(channel.properties.channel_flag_password && !channel.cached_password())
            icon_color = "yellow";
        else if(channel.properties.channel_flag_maxclients_unlimited && channel.clients().length >= channel.properties.channel_maxclients)
            icon_color = "red";
        else if(channel.properties.channel_flag_maxfamilyclients_unlimited && channel.clients(true).length >= channel.properties.channel_maxfamilyclients)
            icon_color = "red";
        else
            icon_color = "green";


        return "channel-normal client-channel_" + icon_color + (channel.flag_subscribed ? "_subscribed" : "");
    }

    render() {
        return <div className={this.channel_icon_classes()} />;
    }
}

class ChannelIcons extends React.Component<{channel: ChannelEntry}, {}> {
    render_icon(target: HTMLDivElement) {
        const props = this.props.channel.properties;
        if(!props.channel_icon_id) return;

        const tag = this.props.channel.channelTree.client.fileManager.icons.generateTag(props.channel_icon_id);
        tag.appendTo($(target));
    }

    render() {
        const icons = [];

        const props = this.props.channel.properties;
        if(props.channel_flag_default) {
            icons.push(<div className={"show-channel-normal-only icon_entry icon_default icon client-channel_default"} title={tr("Default channel")} />);
        }
        if(props.channel_flag_password) {
            icons.push(<div className={"show-channel-normal-only icon_entry icon_password icon client-register"} title={tr("The channel is password protected")} />);
        }
        if(props.channel_codec_quality > 4) {
            icons.push(<div className={"show-channel-normal-only icon_entry icon_moderated icon client-moderated"} title={tr("Music quality")} />);
        }
        if(props.channel_needed_talk_power > 0) {
            icons.push(<div className={"show-channel-normal-only icon_entry icon_moderated icon client-moderated"} title={tr("Channel is moderated")} />);
        }
        if(props.channel_icon_id != 0) {
            icons.push(<div className={"show-channel-normal-only icon_entry channel_icon"} title={tr("Channel icon")} ref={e => this.render_icon(e) }/>)
        }
        if(!audio.codec.supported(props.channel_codec)) {
            icons.push(<div className={cssChannel.icon_no_sound}>
                <div className={cssChannel.background} />
                <div className={"icon_entry icon client-conflict-icon"} title={tr("You don't support the channel codec")} />
            </div>)
        }

        return (<div className={cssChannel.icons}>{icons}</div>);
    }
}

class ChannelLine extends React.Component<{ channel: ChannelEntry }, {}> {

    render() {
        let depth = 1;
        let parent = this.props.channel;
        while((parent = parent.parent))
            depth++;

        //TODO: On handle spacer alignments in channel name!
        return (
            <div className={cssChannel.containerChannel}>
                <div className={cssTree.markerTextUnread} />
                <div className={cssTree.depthFiller} style={{ width: depth + "em" }} />
                <ChannelIcon channel={this.props.channel} />
                <div className={cssChannel.containerChannelName}>
                    <a className={cssChannel.channelName}>{this.props.channel.formattedChannelName()}</a>
                </div>
                <ChannelIcons channel={this.props.channel} />
            </div>
        );
    }
}

class ChannelClientsView extends React.Component<{}, {}> {
}

class SubChannelView extends React.Component<{ channels: ChannelEntry[] }, {}> {

    render() {
        return this.props.channels.map(e => <ChannelLine channel={e} />);
    }
}

export class Channel extends React.Component<{ channel: ChannelEntry }, {}> {
    children: ChannelEntry[];

    channel_entry() : ChannelEntry { return this.props.channel; }

    render() {
        return (
            <div className={[cssTree.entry, cssChannel.channelContainer].join(" ")}>
                <ChannelLine channel={this.props.channel} />
                <ChannelClientsView />
                <SubChannelView channels={[]} />
            </div>
        );
    }
}