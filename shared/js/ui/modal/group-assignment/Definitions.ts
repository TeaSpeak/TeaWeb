import {RemoteIconInfo} from "tc-shared/file/Icons";

export type AvailableGroup = {
    groupId: number,
    saveDB: boolean,

    name: string,
    icon: RemoteIconInfo | undefined,

    addAble: boolean,
    removeAble: boolean,
}

export type ClientInfo = {
    status: "success",

    clientDatabaseId: number,
    clientUniqueId: string,
    clientName: string
} | {
    status: "error",
    message: string
};

export interface ModalClientGroupAssignmentVariables {
    readonly handlerId: string,
    readonly targetClient: ClientInfo,
    readonly availableGroups: {
        groups: AvailableGroup[],
        defaultGroup: number
    },
    readonly assignedGroupStatus: { status: "loaded", assignedGroups: number } | { status: "loading" } | { status: "error", message: string };
    groupAssigned: boolean,
}

export interface ModalClientGroupAssignmentEvents {
    action_close: {},
    action_remove_all: {},
    action_refresh: { slowMode: boolean },

    notify_toggle_result: {
        action: "add" | "remove",

        groupId: number,
        groupName: string,

        result: {
            status: "success"
        } | {
            status: "error",
            reason: string
        } | {
            status: "no-permissions",
            permission: string
        },
    }
}