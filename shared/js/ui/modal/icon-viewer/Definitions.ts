export type IconUploadProgress = {
    state: "pre-process" | "pending" | "initializing",
} | {
    state: "transferring",
    process: number
} | {
    state: "failed",
    message: string
};

export type RemoteIconStatus = {
    status: "uploading",
    process: IconUploadProgress,
} | {
    status: "live",
    iconId: number
} | {
    status: "unknown"
};

export type RemoteIconList = {
    status: "loading"
} | {
    status: "no-permission",
    failedPermission: string,
    refreshTimestamp: number,
} | {
    status: "loaded",
    icons: string[],
    refreshTimestamp: number,
} | {
    status: "error",
    message: string,
    refreshTimestamp: number,
};

export type SelectedIconTab = "remote" | "local";

export type IconDeleteError = {
    status: "no-permissions",
    failedPermission: string
} | {
    status: "error",
    message: string
} | {
    status: "not-found"
};

export interface ModalIconViewerVariables {
    readonly uploadingIconPayload: ArrayBuffer | undefined;
    readonly remoteIconList: RemoteIconList;
    readonly remoteIconInfo: RemoteIconStatus;
    selectedIconId: string;
    selectedTab: SelectedIconTab;
}

export interface ModalIconViewerEvents {
    /* Register a new icon for upload */
    action_initialize_upload: {
        uploadId: string
    },
    /* Register an upload fail */
    action_fail_upload: {
        uploadId: string,
        message: string
    },
    /* Actually upload the icon */
    action_upload: {
        uploadId: string,
        iconId: number,
        buffer: ArrayBuffer
    },

    action_clear_failed: {},
    action_refresh: {},
    action_delete: {
        iconId: string
    },
    action_select: {
        targetIcon: string | undefined
    }

    notify_delete_error: IconDeleteError,
}