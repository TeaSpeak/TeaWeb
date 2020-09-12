import {ConnectionHandler} from "../ConnectionHandler";
import {Registry} from "../events";

export interface ClientGlobalControlEvents {
    /* open a basic window */
    action_open_window: {
        window:
            "settings" | /* use action_open_window_settings! */
            "bookmark-manage" |
            "query-manage" |
            "query-create" |
            "ban-list" |
            "permissions" |
            "token-list" |
            "token-use",
        connection?: ConnectionHandler
    },

    action_w2g: {
        following: number,
        handlerId: string
    } | {
        videoUrl: string,
        handlerId: string
    }

    /* some more specific window openings */
    action_open_window_connect: {
        newTab: boolean
    }

    action_open_window_settings: {
        defaultCategory?: string
    }
}

export const global_client_actions = new Registry<ClientGlobalControlEvents>();