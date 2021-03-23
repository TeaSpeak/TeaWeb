export interface EditorGroupedPermissions {
    groupId: string,
    groupName: string,
    permissions: {
        id: number,
        name: string;
        description: string;
    }[],
    children: EditorGroupedPermissions[]
}

export type PermissionEditorMode = "unset" | "no-permissions" | "normal";
export interface PermissionEditorEvents {
    action_set_mode: { mode: PermissionEditorMode, failedPermission?: string }
    action_toggle_client_button: { visible: boolean },
    action_toggle_client_list: { visible: boolean },

    action_set_filter: { filter?: string }
    action_set_assigned_only: { value: boolean }

    action_set_default_value: { value: number },

    action_open_icon_select: { iconId?: number }
    action_set_senseless_permissions: { permissions: string[] }

    action_remove_permissions: {
        permissions: {
            name: string;
            mode: "value" | "grant";
        }[]
    }
    action_remove_permissions_result: {
        permissions: {
            name: string;
            mode: "value" | "grant";
            success: boolean;
        }[]
    }

    action_set_permissions: {
        permissions: {
            name: string;

            mode: "value" | "grant";

            value?: number;
            flagNegate?: boolean;
            flagSkip?: boolean;
        }[]
    }
    action_set_permissions_result: {
        permissions: {
            name: string;

            mode: "value" | "grant";

            newValue?: number; /* undefined if it didnt worked */
            flagNegate?: boolean;
            flagSkip?: boolean;
        }[]
    }

    action_toggle_group: {
        groupId: string | null; /* if null, all groups are affected */
        collapsed: boolean;
    }

    action_start_permission_edit: {
        target: "value" | "grant";
        permission: string;
        defaultValue: number;
    },

    action_add_permission_group: {
        groupId: string,
        mode: "value" | "grant";
    },
    action_remove_permission_group: {
        groupId: string
        mode: "value" | "grant";
    }

    query_permission_list: {},
    query_permission_list_result: {
        hideSenselessPermissions: boolean;
        permissions: EditorGroupedPermissions[]
    },

    query_permission_values: {},
    query_permission_values_result: {
        status: "error" | "success"; /* no perms will cause a action_set_mode event with no permissions */

        error?: string;
        permissions?: {
            name: string;
            value?: number;
            flagNegate?: boolean;
            flagSkip?: boolean;
            granted?: number;
        }[]
    }
}