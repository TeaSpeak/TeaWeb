export type MusicPlaylistStatus = {
    status: "loading" | "unselected" | "unloaded"
} | {
    status: "error",
    reason: string
} | {
    status: "loaded",

    serverUniqueId: string,
    playlistId: number,

    songs: number[],
    activeSong: number
} | {
    status: "no-permissions",
    failedPermission: string
};

export type MusicPlaylistEntryInfo = {
    type: "loading",
    url: string | undefined
} | {
    type: "song",

    url: string,

    title: string,
    description: string,

    length: number,
    thumbnailImage: string
}

export interface MusicPlaylistUiEvents {
    action_load_playlist: { forced: boolean },
    action_entry_delete: { entryId: number },
    action_reorder_song: { entryId: number, targetEntryId: number, mode: "before" | "after" },
    action_add_song: { url: string, mode: "before" | "after" | "last", targetEntryId?: number },
    action_select_entry: { entryId: number },

    query_playlist_status: {},
    query_entry_status: { entryId: number }

    notify_playlist_status: {
        status: MusicPlaylistStatus
    },
    notify_entry_status: {
        entryId: number,
        status: MusicPlaylistEntryInfo
    },
}