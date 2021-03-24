export type CurrentAvatarState = {
    status: "unset" | "loading"
} | {
    status: "available" | "exceeds-max-size",

    fileName: string,
    fileSize: number,
    fileHashMD5: string,

    resourceUrl: string | undefined,

    serverHasAvatar: boolean
} | {
    status: "server",
    resourceUrl: string
};

export interface ModalAvatarUploadVariables {
    readonly maxAvatarSize: number,
    readonly currentAvatar: CurrentAvatarState
}

export interface ModalAvatarUploadEvents {
    action_open_select: {},

    action_file_cache_loading: {},
    action_file_cache_loading_finished: { success: boolean },

    action_avatar_upload: { closeWindow: boolean },
    action_avatar_delete: { closeWindow: boolean }

    notify_avatar_load_error: { error: string }
}