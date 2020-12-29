export type MusicBotSongInfo = {
    type: "none"
} | {
    type: "loading",
    url: string
} | {
    type: "song",

    url: string,
    thumbnail: string,

    title: string,
    description: string
};

export type MusicBotPlayerState = "paused" | "playing";

export type MusicBotPlayerTimestamp = {
    base: number,
    playOffset: number,
    bufferOffset: number,
    total: number,
    seekable: boolean
};

export interface MusicBotUiEvents {
    action_player_action: {
        action: "play" | "pause" | "forward" | "rewind"
    },
    action_seek_to: {
        target: number
    },
    action_change_volume: {
        mode: "local" | "remote",
        volume: number
    }

    query_player_state: {},
    query_player_timestamp: {},
    query_song_info: {},
    query_volume: {
        mode: "local" | "remote",
    }

    notify_player_state: {
        state: MusicBotPlayerState
    },
    notify_player_timestamp: {
        timestamp: MusicBotPlayerTimestamp
    },
    notify_player_seek_timestamp: {
        offset: number | undefined,
        applySeek: boolean
    },
    notify_song_info: {
        info: MusicBotSongInfo
    },
    notify_volume: {
        mode: "local" | "remote",
        volume: number
    },
    notify_bot_changed: {}
}