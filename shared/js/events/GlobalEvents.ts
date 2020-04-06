import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export interface ClientGlobalControlEvents {
    action_set_channel_subscribe_mode: {
        subscribe: boolean
    },
    action_disconnect: {
        globally: boolean
    },
    action_open_connect: {
        new_tab: boolean
    },

    action_toggle_microphone: {
        state: boolean
    },

    action_toggle_speaker: {
        state: boolean
    },

    action_disable_away: {
        globally: boolean
    },
    action_set_away: {
        globally: boolean;
        prompt_reason: boolean;
    },

    action_toggle_query: {
        shown: boolean
    },

    action_open_window: {
        window: "bookmark-manage" | "query-manage" | "query-create" | "ban-list" | "permissions" | "token-list" | "token-use" | "settings",
        connection?: ConnectionHandler
    },

    action_add_current_server_to_bookmarks: {},
    action_set_active_connection_handler: {
        handler?: ConnectionHandler
    },


    //TODO
    notify_microphone_state_changed: {
        state: boolean
    }
}