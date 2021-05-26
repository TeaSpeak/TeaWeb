import {RemoteIconInfo} from "tc-shared/file/Icons";

export type ClientInfoType = "query" | "voice" | "self";

export type ClientInfoInfo = {
    type: ClientInfoType,
    handlerId: string,

    /* might be zero if the client has been disconnected */
    clientId: number | 0,
    clientUniqueId: string,
    clientDatabaseId: number
}

export type OptionalClientInfoInfo = { contextHash: string } & (ClientInfoInfo | { type: "none" });

export type ClientStatusInfo = {
    microphoneMuted: boolean,
    microphoneDisabled: boolean,

    speakerMuted: boolean,
    speakerDisabled: boolean,

    away: boolean | string
}

export type ClientForumInfo = {
    userId: number,
    nickname: string,
    flags: number
}

export type ClientInfoOnline = {
    joinTimestamp: number,
    leaveTimestamp: number | 0
}

export type ClientGroupInfo = {
    groupId: number,
    groupIcon: RemoteIconInfo,
    groupName: string,
    groupSortOrder: number
}

export type ClientCountryInfo = {
    flag: string,
    name: string
}

export type ClientVolumeInfo = {
    volume: number,
    muted: boolean
}

export type ClientVersionInfo = {
    platform: string,
    version: string
}

export type InheritedChannelInfo = {
    channelId: number,
    channelName: string
}

export interface ClientInfoEvents {
    action_show_full_info: {},
    action_edit_avatar: {},

    query_client: {},
    query_channel_group: {},
    query_server_groups: {},
    query_client_name: {},
    query_client_description: {},
    query_status: {},
    query_online: {},
    query_country: {},
    query_volume: {},
    query_version: {},
    query_forum: {},

    notify_client_name: { name: string },
    notify_client_description: { description: string }
    notify_channel_group: {
        group: ClientGroupInfo | undefined,
        inheritedChannel: InheritedChannelInfo | undefined
    },
    notify_server_groups: { groups: ClientGroupInfo[] },
    notify_status: { status: ClientStatusInfo },
    notify_online: { status: ClientInfoOnline },
    notify_country: { country: ClientCountryInfo },
    notify_volume: { volume: ClientVolumeInfo },
    notify_version: { version: ClientVersionInfo },
    notify_forum: { forum: ClientForumInfo },

    notify_client: {
        info: ClientInfoInfo | undefined
    }
}