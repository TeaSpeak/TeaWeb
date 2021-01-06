import {ClientIcon} from "svg-sprites/client-icons";
import {RemoteIconInfo} from "tc-shared/file/Icons";

export type CollapsedState = "collapsed" | "expended" | "unset";
export type ChannelNameAlignment = "left" | "right" | "center" | "repetitive" | "normal";

export type ChannelIcons = {
    default: boolean;
    passwordProtected: boolean;
    musicQuality: boolean;
    moderated: boolean;
    codecUnsupported: boolean;

    channelIcon: RemoteIconInfo;
}
export type ChannelEntryInfo = { name: string, nameStyle: ChannelNameAlignment, collapsedState: CollapsedState };
export type ChannelTreeEntry = { type: "channel" | "server" | "client" | "client-local", entryId: number, depth: number };

export type FullChannelTreeEntry = {
    entryId: number,
    depth: number,
} & ( { fullInfo: true, unread: boolean } & (
    {
        type: "channel",
        info: ChannelEntryInfo;
        icon: ClientIcon;
        icons: ChannelIcons;
    } | {
        type: "server",
        state: ServerState;
    } | {
        type: "client" | "client-local",
        name: ClientNameInfo;
        status: ClientIcon;
        icons: ClientIcons;

        talkStatus?: ClientTalkIconState;
        talkRequestMessage?: string;
    }
) | { fullInfo: false } & {
    type: "channel" | "server" | "client" | "client-local"
});

export type ClientNameInfo = { name: string, prefix: string[], suffix: string[], awayMessage: string };
export type ClientTalkIconState = "unset" | "prohibited" | "requested" | "granted";
export type ClientIcons = {
    serverGroupIcons: (RemoteIconInfo & { groupName: string, groupId: number })[],
    channelGroupIcon: (RemoteIconInfo & { groupName: string, groupId: number }) | undefined,
    clientIcon: RemoteIconInfo | undefined
};

export type ServerState = { state: "disconnected" } | { state: "connecting", targetAddress: string } | { state: "connected", name: string, icon: RemoteIconInfo };

export interface ChannelTreeUIEvents {
    /* actions */
    action_toggle_popout: { shown: boolean },
    action_show_context_menu: { treeEntryIds: number[], pageX: number, pageY: number },
    action_start_entry_move: { start: { x: number, y: number }, current: { x: number, y: number } },
    action_set_collapsed_state: { treeEntryId: number, state: "collapsed" | "expended" },
    action_select: { treeEntryId: number | 0 },
    action_channel_join: { treeEntryId: number },
    action_channel_open_file_browser: { treeEntryId: number },
    action_client_double_click: { treeEntryId: number },
    action_client_name_submit: { treeEntryId: number, name: string },
    action_move_clients: { targetTreeEntry: number, entries: ChannelTreeDragEntry[] },
    action_move_channels: { targetTreeEntry: number, mode: "before" | "after" | "child", entries: ChannelTreeDragEntry[] },

    /* queries */
    query_tree_entries: { fullInfo: boolean },
    query_popout_state: {},
    query_selected_entry: {},

    query_unread_state: { treeEntryId: number },

    query_channel_info: { treeEntryId: number },
    query_channel_icon: { treeEntryId: number },
    query_channel_icons: { treeEntryId: number },

    query_client_status: { treeEntryId: number },
    query_client_name: { treeEntryId: number },
    query_client_icons: { treeEntryId: number },
    query_client_talk_status: { treeEntryId: number },

    query_server_state: { treeEntryId: number },

    /* notifies */
    notify_tree_entries_full: { entries: FullChannelTreeEntry[] },
    notify_popout_state: { shown: boolean, showButton: boolean },
    notify_selected_entry: { treeEntryId: number | 0 },

    notify_channel_info: { treeEntryId: number, info: ChannelEntryInfo },
    notify_channel_icon: { treeEntryId: number, icon: ClientIcon },
    notify_channel_icons: { treeEntryId: number, icons: ChannelIcons },

    notify_client_status: { treeEntryId: number, status: ClientIcon },
    notify_client_name: { treeEntryId: number, info: ClientNameInfo },
    notify_client_icons: { treeEntryId: number, icons: ClientIcons },
    notify_client_talk_status: { treeEntryId: number, status: ClientTalkIconState, requestMessage?: string },
    notify_client_name_edit: { treeEntryId: number, initialValue: string | undefined },
    notify_client_name_edit_failed: { treeEntryId: number, reason: "scroll-to" }

    notify_server_state: { treeEntryId: number, state: ServerState },

    notify_unread_state: { treeEntryId: number, unread: boolean },

    notify_visibility_changed: { visible: boolean },
    notify_destroy: {}
}

export type ChannelTreeDragEntry = {
    type: "channel",
    uniqueTreeId: number,
} | {
    type: "channel",
    channelId: number
} | {
    type: "server"
} | {
    type: "client",

    uniqueTreeId: number,
} | {
    type: "client",

    clientUniqueId: string,
    clientId?: number,
    clientDatabaseId?: number
};

export type ChannelTreeDragData = {
    version: 1,
    handlerId: string,
    type: string,

    entries: ChannelTreeDragEntry[],
};