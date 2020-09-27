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
    action_show_context_menu: { treeEntryId: number, pageX: number, pageY: number },
    action_start_entry_move: { start: { x: number, y: number }, current: { x: number, y: number } },
    action_set_collapsed_state: { treeEntryId: number, state: "collapsed" | "expended" },
    action_select: {
        entryIds: number[],
        mode: "auto" | "exclusive" | "append" | "remove",
        ignoreClientMove: boolean
    },
    action_channel_join: { treeEntryId: number, ignoreMultiSelect: boolean },
    action_channel_open_file_browser: { treeEntryId: number },
    action_client_double_click: { treeEntryId: number },
    action_client_name_submit: { treeEntryId: number, name: string },
    action_move_entries: { treeEntryId: number /* zero if move failed */ }

    /* queries */
    query_tree_entries: {},
    query_unread_state: { treeEntryId: number },
    query_select_state: { treeEntryId: number },

    query_channel_info: { treeEntryId: number },
    query_channel_icon: { treeEntryId: number },
    query_channel_icons: { treeEntryId: number },

    query_client_status: { treeEntryId: number },
    query_client_name: { treeEntryId: number },
    query_client_icons: { treeEntryId: number },
    query_client_talk_status: { treeEntryId: number },

    query_server_state: { treeEntryId: number },

    /* notifies */
    notify_tree_entries: { entries: ChannelTreeEntry[] },

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
    notify_select_state: { treeEntryId: number, selected: boolean },

    notify_entry_move: { entries: string, begin: { x: number, y: number }, current: { x: number, y: number } },

    notify_visibility_changed: { visible: boolean },
    notify_destroy: {}
}