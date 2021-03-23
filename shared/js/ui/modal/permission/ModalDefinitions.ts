export type PermissionEditorTab = "groups-server" | "groups-channel" | "channel" | "client" | "client-channel";

export type PermissionEditorSubject =
    "groups-server"
    | "groups-channel"
    | "channel"
    | "client"
    | "client-channel"
    | "none";

export type GroupProperties = {
    id: number,
    type: "query" | "template" | "normal";

    name: string,
    iconId: number,

    sortId: number;
    saveDB: boolean;

    needed_modify_power: number;
    needed_member_add: number;
    needed_member_remove: number;
};
export type GroupUpdateEntry = {
    property: "name" | "icon" | "sort" | "save";
    value: any
};
export type ChannelInfo = {
    id: number;
    iconId: number;

    name: string;
    depth: number;
}

export interface PermissionModalEvents {
    action_activate_tab: {
        tab: PermissionEditorTab,

        activeGroupId?: number;
        activeChannelId?: number;
        activeClientDatabaseId?: number;
    },

    action_select_group: {
        target: "server" | "channel",
        id: number
    },

    action_select_channel: {
        target: "channel" | "client-channel";
        id: number
    },

    action_select_client: {
        target: "client" | "client-channel";
        id: number | string | undefined;
    }

    action_set_permission_editor_subject: {
        mode: PermissionEditorSubject | undefined;

        groupId?: number;
        channelId?: number;
        clientDatabaseId?: number;
    }

    action_create_group: { target: "server" | "channel", sourceGroup?: number },

    action_rename_group: { target: "server" | "channel", id: number | "selected", newName: string },
    action_rename_group_result: {
        target: "server" | "channel";
        id: number;

        status: "success" | "error";
        error?: string;
    }

    action_delete_group: { target: "server" | "channel", id: number | "selected", mode: "ask" | "force" },
    action_delete_group_result: {
        target: "server" | "channel";
        id: number;

        status: "success" | "error";
        error?: string;
    },

    action_group_copy_permissions: { target: "server" | "channel", sourceGroup: number },

    action_server_group_add_client: {
        id: number;
        client: number | string; /* string would be the unique id */
    },
    action_server_group_add_client_result: {
        id: number;
        client: number | string;

        status: "success" | "error" | "no-permissions";
        error?: string;
    }

    action_server_group_remove_client: {
        id: number;
        client: number;
    },
    action_server_group_remove_client_result: {
        id: number;
        client: number;

        status: "success" | "error" | "no-permissions";
        error?: string;
    }

    query_groups: {
        target: "server" | "channel",
    },
    query_group_clients: {
        id: number
    },
    query_channels: {},
    query_client_permissions: {},
    query_client_info: {
        client: number | string; /* client database id or unique id */
    },


    notify_channels: {
        channels: ChannelInfo[]
    },
    notify_client_info: {
        client: number | string;
        state: "success" | "error" | "no-such-client" | "no-permission";

        error?: string;
        info?: { name: string, uniqueId: string, databaseId: number },
        failedPermission?: string;
    },
    notify_group_updated: {
        target: "server" | "channel";
        id: number;

        properties: GroupUpdateEntry[];
    },
    notify_groups_created: {
        target: "server" | "channel";
        groups: GroupProperties[]
    },
    notify_groups_deleted: {
        target: "server" | "channel";
        groups: number[]
    },
    notify_group_clients: {
        id: number,
        status: "success" | "error" | "no-permissions",
        error?: string;
        clients?: {
            name: string;
            databaseId: number;
            uniqueId: string;
        }[]
    },
    notify_groups_reset: {},
    notify_groups: {
        target: "server" | "channel",
        groups: GroupProperties[]
    },

    notify_client_permissions: {
        permissionModifyPower: number;

        serverGroupCreate: boolean,
        channelGroupCreate: boolean,

        serverGroupModifyPower: number,
        channelGroupModifyPower: number,

        modifyQueryGroups: boolean,
        modifyTemplateGroups: boolean

        serverGroupMemberAddPower: number,
        serverGroupMemberRemovePower: number,

        serverGroupPermissionList: boolean,
        channelGroupPermissionList: boolean,
        channelPermissionList: boolean,
        clientPermissionList: boolean,
        clientChannelPermissionList: boolean
    },

    notify_client_list_toggled: { visible: boolean },
    notify_channel_updated: { id: number, property: "name" | "icon", value: any },

    notify_initial_rendered: {},
    notify_destroy: {}
}