export interface ChannelEditableProperty {
    "name": string,
    "sortingOrder": { previousChannelId: number, availableChannels: { channelName: string, channelId: number }[] | undefined },
    /*
    "phoneticName": string,
    "talkPower": number,
    "password": { state: "set", password?: string } | { state: "clear" },
    "topic": string,
    "description": string,
    "type": "default" | "permanent" | "semi-permanent" | "temporary",
    "maxUsers": "unlimited" | number,
    "maxFamilyUsers": "unlimited" | "inherited" | number,
    "codec": { type: number, quality: number },
    "deleteDelay": number,
    "encryptedVoiceData": number
    */
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
        semipermanent: boolean,
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
        maxDelay: number,
    },
    encryptVoiceData: boolean
}

export interface ChannelPropertyStatus {
    name: boolean,
    password: boolean
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

    notify_property: {
        property: keyof ChannelEditableProperty
        value: ChannelEditableProperty[keyof ChannelEditableProperty]
    },
    notify_property_permission: {
        permission: keyof ChannelPropertyPermission
        value: ChannelPropertyPermission[keyof ChannelPropertyPermission]
    }
}