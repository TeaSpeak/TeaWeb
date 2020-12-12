import {ConnectionHandler} from "../ConnectionHandler";
import {Registry} from "../events";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

export type PermissionEditorTab = "groups-server" | "groups-channel" | "channel" | "client" | "client-channel";
export interface ClientGlobalControlEvents {
    /* open a basic window */
    action_open_window: {
        window:
            "settings" | /* use action_open_window_settings! */
            "about" |
            "settings-registry" |
            "css-variable-editor" |
            "bookmark-manage" |
            "query-manage" |
            "query-create" |
            "ban-list" |
            "permissions" |
            "token-list" |
            "token-use" |
            "server-echo-test",
        connection?: ConnectionHandler
    },

    action_w2g: {
        following: number,
        handlerId: string
    } | {
        videoUrl: string,
        handlerId: string
    },
    /* Start/open a new video broadcast */
    action_toggle_video_broadcasting: {
        connection: ConnectionHandler,
        broadcastType: VideoBroadcastType,
        enabled: boolean,
        quickSelect?: boolean,
        defaultDevice?: string
    },
    /* Open the broadcast edit window */
    action_edit_video_broadcasting: {
        connection: ConnectionHandler,
        broadcastType: VideoBroadcastType,
    },

    /* some more specific window openings */
    action_open_window_connect: {
        newTab: boolean
    },

    action_open_window_settings: {
        defaultCategory?: string
    },

    action_open_window_permissions: {
        connection?: ConnectionHandler,
        defaultTab: PermissionEditorTab
    }
}

export const global_client_actions = new Registry<ClientGlobalControlEvents>();