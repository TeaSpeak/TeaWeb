import * as React from "react";
import {ChannelNameAlignment} from "tc-shared/ui/tree/Definitions";
import {ClientIcon} from "svg-sprites/client-icons";
import {IconRenderer, RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {getIconManager} from "tc-shared/file/Icons";
import {Settings, settings} from "tc-shared/settings";
import {RDPChannel} from "tc-shared/ui/tree/RendererDataProvider";
import {UnreadMarkerRenderer} from "tc-shared/ui/tree/RendererTreeEntry";

const channelStyle = require("./Channel.scss");
const viewStyle = require("./View.scss");

export class ChannelIconClass extends React.Component<{ channel: RDPChannel }, {}> {
    render() {
        return <IconRenderer icon={this.props.channel.icon} className={channelStyle.channelType} />
    }
}

export class ChannelIconsRenderer extends React.Component<{ channel: RDPChannel }, {}> {
    render() {
        const iconInfo = this.props.channel.icons;

        const icons = [];
        if (iconInfo?.default) {
            icons.push(<ClientIconRenderer key={"icon-default"} icon={ClientIcon.ChannelDefault}
                                           title={tr("Default channel")}/>);
        }

        if (iconInfo?.passwordProtected) {
            icons.push(<ClientIconRenderer key={"icon-protected"} icon={ClientIcon.Register}
                                           title={tr("The channel is password protected")}/>);
        }

        if (iconInfo?.musicQuality) {
            icons.push(<ClientIconRenderer key={"icon-music"} icon={ClientIcon.Music} title={tr("Music quality")}/>);
        }

        if (iconInfo?.moderated) {
            icons.push(<ClientIconRenderer key={"icon-moderated"} icon={ClientIcon.Moderated}
                                           title={tr("Channel is moderated")}/>);
        }

        if (iconInfo && iconInfo.channelIcon.iconId !== 0) {
            icons.push(
                <RemoteIconRenderer icon={getIconManager().resolveIcon(iconInfo.channelIcon.iconId, iconInfo.channelIcon.serverUniqueId, this.props.channel.getHandlerId())}
                                    title={tr("Channel icon")}
                                    key={"icon-channel"}
                />
            );
        }

        if (iconInfo?.codecUnsupported) {
            icons.push(
                <div key={"icon-unsupported"} className={channelStyle.icon_no_sound}>
                    <div className={"icon_entry icon client-conflict-icon"}
                         title={tr("You don't support the channel codec")}/>
                    <div className={channelStyle.background}/>
                </div>
            );
        }

        return (
            <span className={channelStyle.icons}>
                {icons}
            </span>
        );
    }
}

const ChannelName = React.memo((props: { channelName: string | undefined, alignment: ChannelNameAlignment }) => {
    let name: string;
    if(typeof props.channelName === "string") {
        name = props.channelName;
        if(props.alignment === "repetitive") {
            if (name.length) {
                while (name.length < 8000) {
                    name += name;
                }
            }
        }
    } else {
        name = "";
    }

    return (
        <div className={channelStyle.containerChannelName + " " + channelStyle["align-" + props.alignment]}>
            <a className={channelStyle.channelName}>{name}</a>
        </div>
    );
});

const ChannelCollapsedIndicator = (props: { collapsed: boolean, onToggle: () => void }) => {
    return <div className={channelStyle.containerArrow + (!props.collapsed ? " " + channelStyle.down : "")}>
        <div className={viewStyle.arrow + " " + (props.collapsed ? viewStyle.right : viewStyle.down)} onClick={event => {
            event.preventDefault();
            props.onToggle();
        }}/>
    </div>
};

export class RendererChannel extends React.Component<{ channel: RDPChannel }, {}> {
    render() {
        const channel = this.props.channel;
        const info = this.props.channel.info;
        const events = this.props.channel.getEvents();
        const entryId = this.props.channel.entryId;

        let channelIcon, channelIcons, collapsedIndicator;
        if(!info || info.nameStyle === "normal") {
            channelIcon = <ChannelIconClass channel={this.props.channel} key={"channel-icon"} ref={this.props.channel.refIcon} />;
            channelIcons = <ChannelIconsRenderer channel={this.props.channel} key={"channel-icons"} ref={this.props.channel.refIcons} />;
        }
        if(info && info.collapsedState !== "unset") {
            collapsedIndicator = (
                <ChannelCollapsedIndicator key={"collapsed-indicator"}
                                           onToggle={() => events.fire("action_set_collapsed_state", {
                                               state: info.collapsedState === "expended" ? "collapsed" : "expended",
                                               treeEntryId: entryId
                                           })}
                                           collapsed={info.collapsedState === "collapsed"}
                />
            );
        }

        let dragClass;
        if(channel.dragHint !== "none") {
            dragClass = channelStyle["drag-" + channel.dragHint];
        }

        return (
            <div
                ref={this.props.channel.refChannelContainer}
                className={viewStyle.treeEntry + " " + channelStyle.channelEntry + " " + (channel.selected ? viewStyle.selected : "") + " " + dragClass}
                style={{ top: channel.offsetTop }}
                onMouseUp={event => {
                    if (event.button !== 0) {
                        return; /* only left mouse clicks */
                    }

                    this.props.channel.select("auto");
                }}
                onDoubleClick={() => events.fire("action_channel_join", { treeEntryId: entryId })}
                onContextMenu={event => {
                    if (settings.static(Settings.KEY_DISABLE_CONTEXT_MENU)) {
                        return;
                    }

                    event.preventDefault();
                    this.props.channel.handleUiContextMenu(event.pageX, event.pageY);
                }}
                onMouseDown={event => {
                    if (event.buttons !== 4) {
                        return;
                    }

                    event.preventDefault();
                    events.fire("action_channel_open_file_browser", { treeEntryId: entryId });
                }}
                draggable={true}
                onDragStart={event => this.props.channel.handleUiDragStart(event.nativeEvent)}
                onDragOver={event => this.props.channel.handleUiDragOver(event.nativeEvent)}
                onDrop={event => this.props.channel.handleUiDrop(event.nativeEvent)}
            >
                <div className={viewStyle.leftPadding + " " + channelStyle.leftPadding} style={{ paddingLeft: channel.offsetLeft + "em" }} />
                <UnreadMarkerRenderer entry={this.props.channel} ref={this.props.channel.refUnread} />
                {collapsedIndicator}
                {channelIcon}
                <ChannelName channelName={info?.name} alignment={info?.nameStyle} />
                {channelIcons}
            </div>
        );
    }
}