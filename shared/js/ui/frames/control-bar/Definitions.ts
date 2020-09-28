import {RemoteIconInfo} from "tc-shared/file/Icons";

export type ControlBarMode = "main" | "channel-popout";
export type ConnectionState = { currentlyConnected: boolean, generallyConnected: boolean, multisession: boolean };
export type Bookmark = { uniqueId: string, label: string, icon: RemoteIconInfo | undefined, children?: Bookmark[] };
export type AwayState = { locallyAway: boolean, globallyAway: "partial" | "full" | "none" };
export type MicrophoneState = "enabled" | "disabled" | "muted";
export type HostButtonInfo = { title?: string, target?: string, url: string };

export interface ControlBarEvents {
    action_connection_connect: { newTab: boolean },
    action_connection_disconnect: { generally: boolean },
    action_bookmark_connect: { bookmarkUniqueId: string, newTab: boolean },
    action_bookmark_manage: {},
    action_bookmark_add_current_server: {},
    action_toggle_away: { away: boolean, globally: boolean, promptMessage?: boolean },
    action_toggle_microphone: { enabled: boolean },
    action_toggle_speaker: { enabled: boolean },
    action_toggle_subscribe: { subscribe: boolean },
    action_toggle_query: { show: boolean },
    action_query_manage: {},

    query_mode: {},
    query_connection_state: {},
    query_bookmarks: {},
    query_away_state: {},
    query_microphone_state: {},
    query_speaker_state: {},
    query_subscribe_state: {},
    query_query_state: {},
    query_host_button: {},

    notify_mode: { mode: ControlBarMode }
    notify_connection_state: { state: ConnectionState },
    notify_bookmarks: { marks: Bookmark[] },
    notify_away_state: { state: AwayState },
    notify_microphone_state: { state: MicrophoneState },
    notify_speaker_state: { enabled: boolean },
    notify_subscribe_state: { subscribe: boolean },
    notify_query_state: { shown: boolean },
    notify_host_button: { button: HostButtonInfo | undefined },

    notify_destroy: {}
}