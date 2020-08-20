import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";

export interface ClientGlobalControlEvents {
    /* open a basic window */
    action_open_window: {
        window:
            "bookmark-manage" |
            "query-manage" |
            "query-create" |
            "ban-list" |
            "permissions" |
            "token-list" |
            "token-use" |
            "settings",
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
        new_tab: boolean
    }
}

export const global_client_actions = new Registry<ClientGlobalControlEvents>();