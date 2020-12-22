import {RemoteIconInfo} from "tc-shared/file/Icons";

export type ChannelEditablePermissions =
    "join" |
    "view" |
    "view-description" |
    "subscribe" |
    "modify" |
    "delete" |
    "browse" |
    "upload" |
    "download" |
    "rename" |
    "directory-create" |
    "file-delete";

export type ChannelEditablePermissionValue = {
    state: "editable" | "readonly" | "applying",
    value: number
} | {
    state: "loading" | "unsupported",
};

export type ChannelEditPermissionsState = {
    state: "editable" | "loading"
} | {
    state: "no-permissions",
    failedPermission: string
} | {
    state: "error",
    reason: string
};

export interface ChannelEditableProperty {
    "name": string,
    "phoneticName": string,

    "icon": {
        iconId: number,
        remoteIcon?: RemoteIconInfo
    },

    "type": {
        type: "default" | "permanent" | "semi-permanent" | "temporary",
        originallyDefault?: boolean
    },
    sideBar: "conversation" | "description" | "file-transfer" | "unknown" | "not-supported",
    "password": { state: "set", password?: string } | { state: "clear" },
    "sortingOrder": { previousChannelId: number, availableChannels: { channelName: string, channelId: number }[] | undefined },

    "topic": string,
    "description": string,

    "codec": { type: number, quality: number },
    "talkPower": number,
    "encryptedVoiceData": {
        encrypted: boolean,
        serverSetting?: "encrypted" | "unencrypted" | "individual"
    },

    "maxUsers": "unlimited" | number,
    "maxFamilyUsers": "unlimited" | "inherited" | number,

    "deleteDelay": number,
}

export interface ChannelPropertyPermission {
    name: boolean,
    icon: boolean,
    password: { editable: boolean, enforced: boolean },
    talkPower: boolean,
    sortingOrder: boolean,
    topic: boolean,
    description: boolean,
    channelType: {
        permanent: boolean,
        semiPermanent: boolean,
        temporary: boolean,
        default: boolean
    },
    sidebarMode: boolean,
    maxUsers: boolean,
    maxFamilyUsers: boolean,
    codec: {
        opusVoice: boolean,
        opusMusic: boolean
    },
    codecQuality: boolean,
    deleteDelay: {
        editable: boolean,
        maxDelay: number | -1,
    },
    encryptVoiceData: boolean
}

export interface ChannelPropertyStatus {
    name: boolean,
    password: boolean
}

export type ChannelEditPropertyEvent<T extends keyof ChannelEditableProperty> = {
    property: T,
    value: ChannelEditableProperty[T]
}


export type ChannelEditPermissionEvent<T extends keyof ChannelPropertyPermission> = {
    permission: T,
    value: ChannelPropertyPermission[T]
}

export interface ChannelEditEvents {
    action_cancel: {},
    action_apply: {},
    action_change_property: {
        property: keyof ChannelEditableProperty
        value: ChannelEditableProperty[keyof ChannelEditableProperty]
    },
    action_change_permission: {
        permission: ChannelEditablePermissions,
        value: number
    },
    action_icon_select: {},

    query_property: {
        property: keyof ChannelEditableProperty
    },
    query_property_permission: {
        permission: keyof ChannelPropertyPermission
    },
    query_permission: {
        permission: ChannelEditablePermissions
    },
    query_permissions: {},
    query_property_valid_state: {
        property: keyof ChannelEditableProperty,
    },

    notify_property: ChannelEditPropertyEvent<keyof ChannelEditableProperty>,
    notify_property_permission: ChannelEditPermissionEvent<keyof ChannelPropertyPermission>,
    notify_permission: {
        permission: ChannelEditablePermissions,
        value: ChannelEditablePermissionValue
    },
    notify_permissions: {
        state: ChannelEditPermissionsState
    },
    notify_property_validate_state: {
        property: keyof ChannelEditableProperty,
        valid: boolean
    }
}