import {ReactComponentBase} from "tc-shared/ui/react-elements/ReactComponentBase";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "tc-shared/tree/ChannelTreeEntry";
import * as React from "react";
import {EventHandler, ReactEventHandler} from "tc-shared/events";

const viewStyle = require("./View.scss");

export interface UnreadMarkerProperties {
    entry: ChannelTreeEntry<any>;
}

@ReactEventHandler<UnreadMarker>(e => e.props.entry.events)
export class UnreadMarker extends ReactComponentBase<UnreadMarkerProperties, {}> {
    render() {
        if (!this.props.entry.isUnread())
            return null;
        return <div className={viewStyle.markerUnread}/>;
    }

    @EventHandler<ChannelTreeEntryEvents>("notify_unread_state_change")
    private handleUnreadStateChange() {
        this.forceUpdate();
    }
}

export class TreeEntry<Props, State> extends ReactComponentBase<Props, State> {
}