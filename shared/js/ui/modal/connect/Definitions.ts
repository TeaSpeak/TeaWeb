import {kUnknownHistoryServerUniqueId} from "tc-shared/connectionlog/History";
import {RemoteIconInfo} from "tc-shared/file/Icons";

export type ConnectProfileEntry = {
    id: string,
    name: string,
    valid: boolean
}

export type ConnectHistoryEntry = {
    id: number,
    targetAddress: string,
    uniqueServerId: string | typeof kUnknownHistoryServerUniqueId,
}

export type ConnectHistoryServerInfo = {
    icon: RemoteIconInfo,
    name: string,
    password: boolean,
    country: string,

    clients: number | -1,
    maxClients: number | -1
}

export interface ConnectUiVariables {
    "server_address": {
        currentAddress: string,
        defaultAddress?: string,
    },
    readonly "server_address_valid": boolean,

    "nickname": {
        currentNickname: string | undefined,
        defaultNickname?: string,
    },
    readonly "nickname_valid": boolean,

    "password": {
        password: string,
        hashed: boolean
    } | undefined,

    "profiles": {
        profiles?: ConnectProfileEntry[],
        selected: string
    },
    readonly "profile_valid": boolean,

    "historyShown": boolean,
    readonly "history": {
        history: ConnectHistoryEntry[],
        selected: number | -1,
    },

    readonly "history_entry": ConnectHistoryServerInfo,
    readonly "history_connections": number
}

export interface ConnectUiEvents {
    action_manage_profiles: {},
    action_select_history: { id: number },
    action_connect: { newTab: boolean },
    action_delete_history: {
        target: string,
        targetType: "address" | "server-unique-id"
    },
}