export interface ChannelEditableProperty {
    "name": string,
    "phoneticName": string,

    "type": "default" | "permanent" | "semi-permanent" | "temporary",
    "password": { state: "set", password?: string } | { state: "clear" },
    "sortingOrder": { previousChannelId: number, availableChannels: { channelName: string, channelId: number }[] | undefined },

    "topic": string,
    "description": string,

    "codec": { type: number, quality: number },
    "talkPower": number,
    "encryptedVoiceData": number

    "maxUsers": "unlimited" | number,
    "maxFamilyUsers": "unlimited" | "inherited" | number,

    "deleteDelay": number,
}

export interface ChannelPropertyPermission {
    name: boolean,
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
    maxUsers: boolean,
    maxFamilyUsers: boolean,
    codec: {
        opusVoice: boolean,
        opusMusic: boolean
    },
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
    change_property: {
        property: keyof ChannelEditableProperty
        value: ChannelEditableProperty[keyof ChannelEditableProperty]
    },

    query_property: {
        property: keyof ChannelEditableProperty
    },
    query_property_permission: {
        permission: keyof ChannelPropertyPermission
    }

    notify_property: ChannelEditPropertyEvent<keyof ChannelEditableProperty>,
    notify_property_permission: ChannelEditPermissionEvent<keyof ChannelPropertyPermission>
}