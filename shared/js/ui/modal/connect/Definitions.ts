import {kUnknownHistoryServerUniqueId} from "tc-shared/connectionlog/History";
import { RemoteIconInfo} from "tc-shared/file/Icons";

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

export interface ConnectProperties {
    address: {
        currentAddress: string,
        defaultAddress: string,
    },
    nickname: {
        currentNickname: string | undefined,
        defaultNickname: string | undefined,
    },
    password: {
        password: string,
        hashed: boolean
    } | undefined,
    profiles: {
        profiles: ConnectProfileEntry[],
        selected: string
    },
    historyShown: boolean,
    history: {
        history: ConnectHistoryEntry[],
        selected: number | -1,
    },
}

export interface PropertyValidState {
    address: boolean,
    nickname: boolean,
    password: boolean,
    profile: boolean
}

type IAccess<I, T extends keyof I> = {
    property: T,
    value: I[T]
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
    },
    action_set_nickname: { nickname: string, validate: boolean, updateUi: boolean },
    action_set_address: { address: string, validate: boolean, updateUi: boolean },
    action_set_password: { password: string, hashed: boolean, updateUi: boolean },

    query_property: {
        property: keyof ConnectProperties
    },
    query_property_valid: {
        property: keyof PropertyValidState
    },

    notify_property: IAccess<ConnectProperties, keyof ConnectProperties>,
    notify_property_valid: IAccess<PropertyValidState, keyof PropertyValidState>,

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