export type TargetBookmarkInfo = {
    type: "success",

    handlerId: string,
    serverName: string,
    serverUniqueId: string,

    currentChannelId: number,
    currentChannelName: string,
} | {
    type: "not-connected" | "loading"
};

export interface ModalBookmarksAddServerVariables {
    readonly serverInfo: TargetBookmarkInfo,

    bookmarkName: string,
    bookmarkNameValid: boolean,

    saveCurrentChannel: boolean,
}

export interface ModalBookmarksAddServerEvents {
    action_add_bookmark: {},
    action_cancel: {},

    notify_bookmark_added: {}
}