import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import * as React from "react";
import {FileType} from "tc-shared/file/FileManager";
import {Registry} from "tc-shared/events";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {FileBrowser, NavigationBar} from "tc-shared/ui/modal/transfer/FileBrowser";
import {TransferInfo, TransferInfoEvents} from "tc-shared/ui/modal/transfer/TransferInfo";
import {initializeRemoteFileBrowserController} from "tc-shared/ui/modal/transfer/RemoteFileBrowserController";
import {ChannelEntry} from "tc-shared/ui/channel";
import {initializeTransferInfoController} from "tc-shared/ui/modal/transfer/TransferInfoController";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";

const cssStyle = require("./ModalFileTransfer.scss");
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
    query_files: { path: string },
    query_files_result: {
        path: string,
        status: "success" | "timeout" | "error" | "no-permissions" | "invalid-password",

        error?: string,
        files?: ListedFileInfo[]
    },

    action_navigate_to: {
        path: string
    },
    action_navigate_to_result: {
        path: string,
        status: "success" | "timeout" | "error";
        error?: string;
        pathInfo?: PathInfo
    }

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


    notify_modal_closed: {},
    notify_drag_ended: {},

    /* Attention: Only use in sync mode! */
    notify_drag_started: {
        event: DragEvent
    }
}


class FileTransferModal extends InternalModal {
    readonly remoteBrowseEvents = new Registry<FileBrowserEvents>();
    readonly transferInfoEvents = new Registry<TransferInfoEvents>();

    private readonly defaultChannelId;

    constructor(defaultChannelId: number) {
        super();

        this.defaultChannelId = defaultChannelId;

        this.remoteBrowseEvents.enableDebug("remote-file-browser");
        this.transferInfoEvents.enableDebug("transfer-info");

        initializeRemoteFileBrowserController(server_connections.active_connection(), this.remoteBrowseEvents);
        initializeTransferInfoController(server_connections.active_connection(), this.transferInfoEvents);
    }

    protected onInitialize() {
        const path = this.defaultChannelId ? "/" + channelPathPrefix + this.defaultChannelId + "/" : "/";
        this.remoteBrowseEvents.fire("action_navigate_to", {path: path});
    }

    protected onDestroy() {
        this.remoteBrowseEvents.fire("notify_modal_closed");
        this.transferInfoEvents.fire("notify_modal_closed");
    }

    title() {
        return <Translatable>File Browser</Translatable>;
    }

    renderBody() {
        const path = this.defaultChannelId ? "/" + channelPathPrefix + this.defaultChannelId + "/" : "/";
        return <div className={cssStyle.container}>
            <NavigationBar events={this.remoteBrowseEvents} currentPath={path}/>
            <FileBrowser events={this.remoteBrowseEvents} currentPath={path}/>
            <TransferInfo events={this.transferInfoEvents}/>
        </div>
    }
}

export function spawnFileTransferModal(channel: number) {
    const modal = spawnReactModal(FileTransferModal, channel);
    modal.show();
}