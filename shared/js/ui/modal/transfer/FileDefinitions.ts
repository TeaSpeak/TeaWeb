import {FileType} from "tc-shared/file/FileManager";
import {ChannelEntry} from "tc-shared/tree/Channel";

export const channelPathPrefix = tr("Channel") + " ";
export const iconPathPrefix = tr("Icons");
export const avatarsPathPrefix = tr("Avatars");
export const FileTransferUrlMediaType = "application/x-teaspeak-ft-urls";

export type TransferStatus = "pending" | "transferring" | "finished" | "errored" | "none";
export type FileMode = "password" | "empty" | "create" | "creating" | "normal" | "uploading";

export type ListedFileInfo = {
    path: string;
    name: string;
    type: FileType;

    datetime: number;
    size: number;

    virtual: boolean;
    mode: FileMode;

    transfer?: {
        id: number;
        direction: "upload" | "download";
        status: TransferStatus;
        percent: number;
    } | undefined
};

export type PathInfo = {
    channelId: number;
    channel: ChannelEntry;

    path: string;
    type: "icon" | "avatar" | "channel" | "root";
}

export interface FileBrowserEvents {
    action_navigate_to: {
        path: string
    },
    action_delete_file: {
        files: {
            path: string,
            name: string
        }[] | "selection";
        mode: "force" | "ask";
    },
    action_delete_file_result: {
        results: {
            path: string,
            name: string,
            status: "success" | "timeout" | "error";
            error?: string;
        }[],
    },

    action_start_create_directory: {
        defaultName: string
    },
    action_create_directory: {
        path: string,
        name: string
    },
    action_create_directory_result: {
        path: string,
        name: string,
        status: "success" | "timeout" | "error";

        error?: string;
    },

    action_rename_file: {
        oldPath: string,
        oldName: string,

        newPath: string;
        newName: string
    },
    action_rename_file_result: {
        oldPath: string,
        oldName: string,
        status: "success" | "timeout" | "error" | "no-changes";

        newPath?: string,
        newName?: string,
        error?: string;
    },

    action_start_rename: {
        path: string;
        name: string;
    },

    action_select_files: {
        files: {
            name: string,
            type: FileType
        }[]
        mode: "exclusive" | "toggle"
    },
    action_selection_context_menu: {
        pageX: number,
        pageY: number
    },

    action_start_download: {
        files: {
            path: string,
            name: string
        }[]
    },
    action_start_upload: {
        path: string;
        mode: "files" | "browse";

        files?: File[];
    },

    query_files: { path: string },
    query_files_result: {
        path: string,
        status: "success" | "timeout" | "error" | "no-permissions" | "invalid-password",

        error?: string,
        files?: ListedFileInfo[]
    },
    query_current_path: {},

    notify_current_path: {
        path: string,
        status: "success" | "timeout" | "error";
        error?: string;
    },

    notify_transfer_start: {
        path: string;
        name: string;

        id: number;
        mode: "upload" | "download";
    },

    notify_transfer_status: {
        id: number;
        status: TransferStatus;
        fileSize?: number;
    },
    notify_transfer_progress: {
        id: number;
        progress: number;
        fileSize: number;
        status: TransferStatus
    }
    notify_drag_ended: {},
    /* Attention: Only use in sync mode! */
    notify_drag_started: {
        event: DragEvent
    }

    notify_destroy: {},
}
