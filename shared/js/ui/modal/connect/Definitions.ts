import {kUnknownHistoryServerUniqueId} from "tc-shared/connectionlog/History";

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
    iconId: number,
    name: string,
    password: boolean,

}

export type ConnectServerAddress = {
    currentAddress: string,
    defaultAddress: string,
}

export type ConnectServerNickname = {
    currentNickname: string,
    defaultNickname: string,
}

export type ConnectProfiles = {
    profiles: ConnectProfileEntry[],
    selected: string
};

export interface ConnectProperties {
    address: ConnectServerAddress,
    nickname: ConnectServerNickname,
    password: string,
    profiles: ConnectProfiles,
    history: {
        history: ConnectHistoryEntry[],
        selected: number | -1,
        state: "shown" | "hidden"
    },
}

export interface PropertyValidState {
    address: boolean,
    nickname: boolean,
    password: boolean,
}

type ConnectProperty<T extends keyof ConnectProperties> = {
    property: T,
    value: ConnectProperties[T]
};

export interface ConnectUiEvents {
    action_manage_profiles: {},
    action_select_profile: { id: string },
    action_select_history: { id: number },
    action_connect: { newTab: boolean },
    action_toggle_history: { enabled: boolean }
    action_delete_history: {
        target: string,
        targetType: "address" | "server-unique-id"
    }

    query_property: {
        property: keyof ConnectProperties
    },

    notify_property: ConnectProperty<keyof ConnectProperties>

    query_history_entry: {
        serverUniqueId: string
    },
    query_history_connections: {
        target: string,
        targetType: "address" | "server-unique-id"
    }

    notify_history_entry: {
        serverUniqueId: string,
        info: ConnectHistoryServerInfo
    },
    notify_history_connections: {
        target: string,
        targetType: "address" | "server-unique-id",
        value: number
    }
}