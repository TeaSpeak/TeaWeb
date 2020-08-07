interface PlayerStatusPlaying {
    status: "playing";

    timestampPlay: number;
    timestampBuffer: number;
}

interface PlayerStatusBuffering {
    status: "buffering";
}

interface PlayerStatusStopped {
    status: "stopped";
}

interface PlayerStatusPaused {
    status: "paused";
}

export type PlayerStatus = PlayerStatusPlaying | PlayerStatusBuffering | PlayerStatusStopped | PlayerStatusPaused;

export interface VideoViewerEvents {
    "action_toggle_side_bar": { shown: boolean },
    "action_follow": { watcherId: string | undefined },

    /* will trigger notify_watcher_info */
    "query_watcher_info": {
        watcherId: string
    },

    /* will trigger notify_watcher_status */
    "query_watcher_status": {
        watcherId: string
    },

    "query_followers": {
        watcherId: string
    },

    "query_watchers": {},
    "query_video": {},

    "notify_show": {},
    "notify_destroy": {},

    "notify_watcher_list": {
        watcherIds: string[],

        followingWatcher: string | undefined
    },

    "notify_watcher_status": {
        watcherId: string,
        status: PlayerStatus
    }

    "notify_watcher_info": {
        watcherId: string,

        clientId: number,
        clientUniqueId: string,
        clientName: string,

        isOwnClient: boolean
    }

    "notify_follower_list": {
        watcherId: string,
        followerIds: string[]
    },

    "notify_follower_added": {
        watcherId: string,
        followerId: string
    },

    "notify_follower_removed": {
        watcherId: string,
        followerId: string
    },

    "notify_following": {
        watcherId: string | undefined
    },

    "notify_following_status": {
        status: PlayerStatus
    }

    "notify_local_status": {
        status: PlayerStatus
    },

    "notify_video": { url: string }
}