import {ConnectionHandler} from "../../../ConnectionHandler";
import {Registry} from "tc-events";
import {FileType} from "../../../file/FileManager";
import {CommandResult} from "../../../connection/ServerConnectionDeclaration";
import PermissionType from "../../../permission/PermissionType";
import {LogCategory, logError, logTrace} from "../../../log";
import {Entry, MenuEntry, MenuEntryType, spawn_context_menu} from "../../../ui/elements/ContextMenu";
import * as ppt from "tc-backend/ppt";
import {SpecialKey} from "../../../PPTListener";
import {spawnYesNo} from "../../../ui/modal/ModalYesNo";
import {tr, tra, traj} from "../../../i18n/localize";
import {
    FileTransfer,
    FileTransferState,
    FileUploadTransfer,
    TransferProvider,
    TransferTargetType
} from "../../../file/Transfer";
import {createErrorModal} from "../../../ui/elements/Modal";
import {ErrorCode} from "../../../connection/ErrorCode";
import {
    avatarsPathPrefix,
    channelPathPrefix,
    FileBrowserEvents,
    iconPathPrefix,
    ListedFileInfo,
    PathInfo
} from "tc-shared/ui/modal/transfer/FileDefinitions";

function parsePath(path: string, connection: ConnectionHandler): PathInfo {
    if (path === "/" || !path) {
        return {
            channel: undefined,
            channelId: 0,
            path: "/",
            type: "root"
        };
    } else if (path.startsWith("/" + channelPathPrefix)) {
        const pathParts = path.split("/");

        const channelId = parseInt(pathParts[1].substr(channelPathPrefix.length));
        if (isNaN(channelId)) {
            throw tr("Invalid channel id (ID is NaN)");
        }

        const channel = connection.channelTree.findChannel(channelId);
        if (!channel) {
            throw tr("Invalid channel id");
        }

        return {
            type: "channel",
            path: "/" + pathParts.slice(2).join("/"),
            channelId: channelId,
            channel: channel
        };
    } else if (path == "/" + iconPathPrefix + "/") {
        return {
            type: "icon",
            path: "/icons/",
            channelId: 0,
            channel: undefined
        };
    } else if (path == "/" + avatarsPathPrefix + "/") {
        return {
            type: "avatar",
            path: "/",
            channelId: 0,
            channel: undefined
        };
    } else {
        throw tr("Unknown path");
    }
}

export function initializeRemoteFileBrowserController(connection: ConnectionHandler, events: Registry<FileBrowserEvents>) {
    events.on("action_navigate_to", event => {
        try {
            const info = parsePath(event.path, connection);

            events.fire_react("notify_current_path", {
                path: event.path || "/",
                status: "success",
                pathInfo: info
            });
        } catch (error) {
            events.fire_react("notify_current_path", {
                path: event.path,
                status: "error",
                error: error
            });
        }
    });

    events.on("query_files", event => {
        let path: PathInfo;
        try {
            path = parsePath(event.path, connection);
        } catch (error) {
            events.fire_react("query_files_result", {
                path: event.path,
                status: "error",
                error: error
            });
            return;
        }
        logTrace(LogCategory.FILE_TRANSFER, tr("Requesting a file list for %o"), path);

        let request: Promise<ListedFileInfo[]>;
        if (path.type === "root") {
            request = (async () => {
                const result: ListedFileInfo[] = [];

                result.push({
                    type: FileType.DIRECTORY,
                    name: iconPathPrefix,
                    size: 0,
                    datetime: 0,
                    mode: "normal",
                    virtual: true,
                    path: "/"
                });

                result.push({
                    type: FileType.DIRECTORY,
                    name: avatarsPathPrefix,
                    size: 0,
                    datetime: 0,
                    mode: "normal",
                    virtual: true,
                    path: "/"
                });

                const requestArray = connection.channelTree.channels.map(e => {
                    return {
                        request: {
                            path: "/",
                            channelId: e.channelId
                        },
                        name: channelPathPrefix + e.getChannelId(),
                        channel: e
                    }
                });
                const channelInfos = await connection.fileManager.requestFileInfo(requestArray.map(e => e.request));
                for (let index = 0; index < requestArray.length; index++) {
                    const response = channelInfos[index];

                    if (response instanceof CommandResult) {
                        /* some kind of error occurred (maybe password set, or non existing) */
                        result.push({
                            type: FileType.DIRECTORY,
                            name: requestArray[index].name,
                            size: 0,
                            datetime: 0,
                            mode: requestArray[index].channel.properties.channel_flag_password ? "password" : "empty",
                            virtual: true,
                            path: "/"
                        });
                    } else {
                        result.push({
                            type: FileType.DIRECTORY,
                            name: requestArray[index].name,
                            size: 0,
                            datetime: 0,
                            mode: response.empty ? "empty" : "normal",
                            virtual: true,
                            path: "/"
                        });
                    }
                }

                return result;
            })();
        } else if (path.type === "channel") {
            request = (async () => {
                const hash = path.channel.properties.channel_flag_password ? await path.channel.requestChannelPassword(PermissionType.B_FT_IGNORE_PASSWORD) : undefined;
                return connection.fileManager.requestFileList(path.path, path.channelId, hash?.hash).then(result => result.map(e => {
                    const transfer = connection.fileManager.findTransfer(path.channelId, path.path, e.name);
                    return {
                        datetime: e.datetime,
                        name: e.name,
                        size: e.size,
                        type: e.type,
                        path: event.path,
                        mode: e.empty ? "empty" : "normal",
                        virtual: false,
                        transfer: !transfer ? undefined : {
                            id: transfer.clientTransferId,
                            percent: transfer.isRunning() && transfer.lastProgressInfo() ? transfer.lastProgressInfo().file_current_offset / transfer.lastProgressInfo().file_total_size : 0,
                            status: transfer.isPending() ? "pending" : transfer.isRunning() ? "transferring" : "finished"
                        }
                    } as ListedFileInfo;
                })).catch(async error => {
                    /* patch for the case that the channel directory hasn't been created yet */
                    if (error instanceof CommandResult) {
                        if (error.id === ErrorCode.FILE_NOT_FOUND && path.path === "/") {
                            return [];
                        } else if (error.id === 781) { //Invalid password
                            path.channel.invalidateCachedPassword();
                        }
                    }
                    throw error;
                });
            })();
        } else if (path.type === "icon" || path.type === "avatar") {
            request = connection.fileManager.requestFileList(path.path, 0).then(result => result.map(e => {
                return {
                    datetime: e.datetime,
                    name: e.name,
                    size: e.size,
                    type: e.type,
                    mode: e.empty ? "empty" : "normal",
                    path: event.path
                } as ListedFileInfo;
            }));
        } else {
            events.fire_react("query_files_result", {
                path: event.path,
                status: "error",
                error: tr("Unknown parsed path type")
            });
            return;
        }

        request.then(files => {
            events.fire_react("query_files_result", {
                path: event.path,
                status: "success",
                files: files.map(e => {
                    e.datetime *= 1000;
                    return e;
                })
            });
        }).catch(error => {
            let message;
            if (error instanceof CommandResult) {
                if (error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    const permission = connection.permissions.resolveInfo(error.json["failed_permid"] as number);
                    events.fire_react("query_files_result", {
                        path: event.path,
                        status: "no-permissions",
                        error: permission ? permission.name : "unknown"
                    });
                    return;
                } else if (error.id === 781) { //Invalid password
                    events.fire_react("query_files_result", {
                        path: event.path,
                        status: "invalid-password"
                    });
                    return;
                }

                message = error.message + (error.extra_message ? " (" + error.extra_message + ")" : "");
            } else if (typeof error === "string") {
                message = error;
            } else {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to query channel directory files: %o"), error);
                message = tr("lookup the console");
            }

            events.fire_react("query_files_result", {
                path: event.path,
                status: "error",
                error: message
            });
        });
    });

    events.on("action_rename_file", event => {
        if (event.newPath === event.oldPath && event.newName === event.oldName) {
            events.fire_react("action_rename_file_result", {
                oldPath: event.oldPath,
                oldName: event.oldName,

                newPath: event.newPath,
                newName: event.newName,

                status: "no-changes"
            });
            return;
        }

        let sourcePath: PathInfo, targetPath: PathInfo;
        try {
            sourcePath = parsePath(event.oldPath, connection);
            if (sourcePath.type !== "channel") {
                throw tr("Icon/avatars could not be renamed");
            }
        } catch (error) {
            events.fire_react("action_rename_file_result", {
                oldPath: event.oldPath,
                oldName: event.oldName,
                status: "error",
                error: tr("Invalid source path") + " (" + error + ")"
            });
            return;
        }
        try {
            targetPath = parsePath(event.newPath, connection);
            if (sourcePath.type !== "channel") {
                throw tr("Target path isn't a channel");
            }
        } catch (error) {
            events.fire_react("action_rename_file_result", {
                oldPath: event.oldPath,
                oldName: event.oldName,
                status: "error",
                error: tr("Invalid target path") + " (" + error + ")"
            });
            return;
        }

        (async () => {
            const sourcePassword = sourcePath.channel.properties.channel_flag_password ? await sourcePath.channel.requestChannelPassword(PermissionType.B_FT_IGNORE_PASSWORD) : undefined;
            const targetPassword = targetPath.channel.properties.channel_flag_password ? await targetPath.channel.requestChannelPassword(PermissionType.B_FT_IGNORE_PASSWORD) : undefined;
            return await connection.serverConnection.send_command("ftrenamefile", {
                cid: sourcePath.channelId,
                cpw: sourcePassword,
                tcid: targetPath.channelId,
                tcpw: targetPassword,
                oldname: sourcePath.path + event.oldName,
                newname: targetPath.path + event.newName
            })
        })().then(result => {
            if (result.id !== 0)
                throw result;

            events.fire("action_rename_file_result", {
                oldPath: event.oldPath,
                oldName: event.oldName,
                status: "success",

                newName: event.newName,
                newPath: event.newPath
            });
        }).catch(error => {
            let message;
            if (error instanceof CommandResult) {
                if (error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    const permission = connection.permissions.resolveInfo(error.json["failed_permid"] as number);
                    events.fire_react("action_rename_file_result", {
                        oldPath: event.oldPath,
                        oldName: event.oldName,
                        status: "error",
                        error: tr("Failed on permission ") + (permission ? permission.name : "unknown")
                    });
                    return;
                } else if (error.id === 781) { //Invalid password
                    events.fire_react("action_rename_file_result", {
                        oldPath: event.oldPath,
                        oldName: event.oldName,
                        status: "error",
                        error: tr("Invalid channel password")
                    });
                    return;
                }

                message = error.message + (error.extra_message ? " (" + error.extra_message + ")" : "");
            } else if (typeof error === "string") {
                message = error;
            } else {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to rename/move files: %o"), error);
                message = tr("lookup the console");
            }
            events.fire_react("action_rename_file_result", {
                oldPath: event.oldPath,
                oldName: event.oldName,
                status: "error",
                error: message
            });
        });
    });

    /* currently selected files */
    let currentPath = "/";
    let currentPathInfo: PathInfo;
    let selection: { name: string, type: FileType }[] = [];
    events.on("notify_current_path", result => {
        if (result.status !== "success") {
            return;
        }

        currentPathInfo = result.pathInfo;
        currentPath = result.path;
        selection = [];
    });

    events.on("query_current_path", () => events.fire_react("notify_current_path", {
        status: "success",
        path: currentPath,
        pathInfo: currentPathInfo
    }));

    events.on("action_rename_file_result", result => {
        if (result.status !== "success")
            return;
        if (result.oldPath !== currentPath)
            return;

        const index = selection.map(e => e.name).findIndex(e => e === result.oldName);
        if (index !== -1)
            selection[index].name = result.newName;
    });

    events.on("action_select_files", event => {
        if (event.mode === "exclusive") {
            selection = event.files.slice(0);
        } else if (event.mode === "toggle") {
            event.files.forEach(e => {
                const index = selection.map(e => e.name).findIndex(b => b === e.name);
                if (index === -1)
                    selection.push(e);
                else
                    selection.splice(index);
            });
        }
    });

    /* the selection handler */
    events.on("action_selection_context_menu", event => {
        const entries = [] as MenuEntry[];

        if (currentPathInfo.type === "root") {
            entries.push({
                type: MenuEntryType.ENTRY,
                name: tr("Refresh file list"),
                icon_class: "client-file_refresh"
            });
        } else {
            const forceDelete = ppt.key_pressed(SpecialKey.SHIFT);
            if (selection.length === 0) {
                entries.push({
                    type: MenuEntryType.ENTRY,
                    name: tr("Upload"),
                    icon_class: "client-upload",
                    callback: () => events.fire("action_start_upload", {mode: "browse", path: currentPath})
                });
            } else if (selection.length === 1) {
                const file = selection[0];
                if (file.type === FileType.FILE) {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        name: tr("Download"),
                        icon_class: "client-download",
                        callback: () => events.fire("action_start_download", {
                            files: [{
                                name: file.name,
                                path: currentPath
                            }]
                        })
                    });
                }
                if (currentPathInfo.type === "channel") {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        name: tr("Rename"),
                        icon_class: "client-change_nickname",
                        callback: () => events.fire("action_start_rename", {name: file.name, path: currentPath})
                    });
                }
                entries.push({
                    type: MenuEntryType.ENTRY,
                    name: forceDelete ? tr("Force delete file") : tr("Delete file"),
                    icon_class: "client-delete",
                    callback: () => events.fire("action_delete_file", {
                        mode: forceDelete ? "force" : "ask",
                        files: "selection"
                    })
                });
                entries.push(Entry.HR());
            } else if (selection.length > 1) {
                if (selection.findIndex(e => e.type === FileType.DIRECTORY) === -1) {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        name: tr("Download"),
                        icon_class: "client-download",
                        callback: () => events.fire("action_start_download", {
                            files: selection.map(file => {
                                return {name: file.name, path: currentPath}
                            })
                        })
                    });
                }
                entries.push({
                    type: MenuEntryType.ENTRY,
                    name: forceDelete ? tr("Force delete files") : tr("Delete files"),
                    icon_class: "client-delete",
                    callback: () => events.fire("action_delete_file", {
                        mode: forceDelete ? "force" : "ask",
                        files: "selection"
                    })
                });
            }
            entries.push({
                type: MenuEntryType.ENTRY,
                name: tr("Refresh file list"),
                icon_class: "client-file_refresh",
                callback: () => events.fire("action_navigate_to", {path: currentPath})
            });
            entries.push(Entry.HR());
            entries.push({
                type: MenuEntryType.ENTRY,
                name: tr("Create folder"),
                icon_class: "client-add_folder",
                callback: () => events.fire("action_start_create_directory", {defaultName: tr("New folder")})
            });
        }
        spawn_context_menu(event.pageX, event.pageY, ...entries);
    });

    events.on("action_delete_file", event => {
        const files = event.files === "selection" ? selection.map(e => {
            return {path: currentPath, name: e.name}
        }) : event.files;

        if (event.mode === "ask") {
            spawnYesNo(tr("Are you sure?"), tra("Do you really want to delete {0} {1}?", files.length, files.length === 1 ? tr("files") : tr("files")), result => {
                if (result)
                    events.fire("action_delete_file", {
                        files: files,
                        mode: "force"
                    });
            });
            return;
        }

        try {
            const fileInfos = files.map(e => {
                return {info: parsePath(e.path, connection), path: e.path, name: e.name}
            });

            connection.serverConnection.send_command("ftdeletefile", fileInfos.map(e => {
                return {
                    path: e.info.path,
                    cid: e.info.channelId,
                    cpw: e.info.channel?.getCachedPasswordHash(),
                    name: e.name
                }
            })).then(async result => {
                throw result;
            }).catch(result => {
                let message;
                if (result instanceof CommandResult) {
                    if (result.bulks.length !== fileInfos.length) {
                        events.fire_react("action_delete_file_result", {
                            results: fileInfos.map((e) => {
                                return {
                                    error: result.bulks.length === 1 ? (result.message + (result.extra_message ? " (" + result.extra_message + ")" : "")) : tr("Response contained invalid bulk length"),
                                    path: e.path,
                                    name: e.name,
                                    status: "error"
                                };
                            })
                        });
                        return;
                    }

                    let results = [];
                    result.getBulks().forEach((e, index) => {
                        if (e.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                            const permission = connection.permissions.resolveInfo(e.json["failed_permid"] as number);
                            results.push({
                                path: fileInfos[index].path,
                                name: fileInfos[index].name,
                                status: "error",
                                error: tr("Failed on permission ") + (permission ? permission.name : "unknown")
                            });
                            return;
                        } else if (e.id === 781) { //Invalid password
                            results.push({
                                path: fileInfos[index].path,
                                name: fileInfos[index].name,
                                status: "error",
                                error: tr("Invalid channel password")
                            });
                            return;
                        } else if (e.id !== 0) {
                            results.push({
                                path: fileInfos[index].path,
                                name: fileInfos[index].name,
                                status: "error",
                                error: e.message + (e.extra_message ? " (" + e.extra_message + ")" : "")
                            });
                            return;
                        }

                        results.push({
                            path: fileInfos[index].path,
                            name: fileInfos[index].name,
                            status: "success"
                        });
                        return;
                    });

                    events.fire_react("action_delete_file_result", {
                        results: results
                    });
                    return;
                } else if (typeof result === "string") {
                    message = result;
                } else {
                    logError(LogCategory.FILE_TRANSFER, tr("Failed to create directory: %o"), result);
                    message = tr("lookup the console");
                }

                events.fire_react("action_delete_file_result", {
                    results: files.map((e) => {
                        return {
                            error: message,
                            path: e.path,
                            name: e.name,
                            status: "error"
                        };
                    })
                });
            });
        } catch (error) {
            events.fire_react("action_delete_file_result", {
                results: files.map((e) => {
                    return {
                        error: tr("Failed to parse path for one or more entries ") + " (" + error + ")",
                        path: e.path,
                        name: e.name,
                        status: "error"
                    };
                })
            });
        }
    });

    events.on("action_create_directory", event => {
        let path: PathInfo;
        try {
            path = parsePath(event.path, connection);
            if (path.type !== "channel")
                throw tr("Directories could only created for channels");
        } catch (error) {
            events.fire_react("action_create_directory_result", {
                name: event.name,
                path: event.path,
                status: "error",
                error: tr("Invalid path") + " (" + error + ")"
            });
            return;
        }

        //ftcreatedir cid=4 cpw dirname=\/TestDir return_code=1:17
        connection.serverConnection.send_command("ftcreatedir", {
            cid: path.channelId,
            cpw: path.channel.getCachedPasswordHash(),
            dirname: path.path + event.name
        }).then(() => {
            events.fire("action_create_directory_result", {path: event.path, name: event.name, status: "success"});
        }).catch(error => {
            let message;
            if (error instanceof CommandResult) {
                if (error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    const permission = connection.permissions.resolveInfo(error.json["failed_permid"] as number);
                    events.fire_react("action_create_directory_result", {
                        name: event.name,
                        path: event.path,
                        status: "error",
                        error: tr("Failed on permission ") + (permission ? permission.name : "unknown")
                    });
                    return;
                } else if (error.id === 781) { //Invalid password
                    events.fire_react("action_create_directory_result", {
                        name: event.name,
                        path: event.path,
                        status: "error",
                        error: tr("Invalid channel password")
                    });
                    return;
                }

                message = error.message + (error.extra_message ? " (" + error.extra_message + ")" : "");
            } else if (typeof error === "string") {
                message = error;
            } else {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to create directory: %o"), error);
                message = tr("lookup the console");
            }
            events.fire_react("action_create_directory_result", {
                name: event.name,
                path: event.path,
                status: "error",
                error: message
            });
        });
    });

    events.on("action_start_download", event => {
        event.files.forEach(file => {
            try {
                let targetSupplier;
                if (__build.target === "client" && TransferProvider.provider().targetSupported(TransferTargetType.FILE)) {
                    const target = TransferProvider.provider().createFileTarget(undefined, file.name);
                    targetSupplier = async () => target;
                } else if (TransferProvider.provider().targetSupported(TransferTargetType.DOWNLOAD)) {
                    targetSupplier = async () => await TransferProvider.provider().createDownloadTarget();
                } else {
                    createErrorModal(tr("Failed to create transfer target"), tr("Failed to create transfer target.\nAll targets are unsupported")).open();
                    return;
                }

                const fileName = file.name;
                const info = parsePath(file.path, connection);
                const transfer = connection.fileManager.initializeFileDownload({
                    channel: info.channelId,
                    path: info.type === "channel" ? info.path : "",
                    name: info.type === "channel" ? file.name : "/" + file.name,
                    channelPassword: info.channel?.getCachedPasswordHash(),
                    targetSupplier: targetSupplier
                });
                transfer.awaitFinished().then(() => {
                    if (transfer.transferState() === FileTransferState.ERRORED) {
                        createErrorModal(tr("Failed to download file"), traj("Failed to download {0}:{:br:}{1}", fileName, transfer.currentErrorMessage())).open();
                    }
                });
            } catch (error) {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to parse path for file download: %s"), error);
            }
        });
    });

    events.on("action_start_upload", event => {
        if (event.mode === "browse") {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;

            document.body.appendChild(input);
            input.onchange = () => {
                if ((input.files?.length | 0) === 0)
                    return;

                events.fire("action_start_upload", {mode: "files", path: event.path, files: [...input.files]});
            };
            input.onblur = () => input.remove();
            setTimeout(() => {
                input.focus({preventScroll: true});
                input.click();
            });
            return;
        } else if (event.mode === "files") {
            const pathInfo = parsePath(event.path, connection);
            if (pathInfo.type !== "channel") {
                createErrorModal(tr("Failed to upload file(s)"), tra("Failed to upload files:{:br:}File uplaod is only supported in channel directories")).open();
                return;
            }
            for (const file of event.files) {
                const fileName = file.name;
                const transfer = connection.fileManager.initializeFileUpload({
                    channel: pathInfo.channelId,
                    channelPassword: pathInfo.channel?.getCachedPasswordHash(),
                    name: file.name,
                    path: pathInfo.path,
                    source: async () => TransferProvider.provider().createBrowserFileSource(file)
                });
                transfer.awaitFinished().then(() => {
                    if (transfer.transferState() === FileTransferState.ERRORED) {
                        createErrorModal(tr("Failed to upload file"), tra("Failed to upload {0}:{:br:}{1}", fileName, transfer.currentErrorMessage())).open();
                    }
                });
            }
        }
    });

    /* transfer status listener */
    {
        const listenToTransfer = (transfer: FileTransfer) => {
            /* We've currently only support for channel files */
            if (transfer.properties.channel_id === 0)
                return;

            const progressListener = event => events.fire("notify_transfer_progress", {
                id: transfer.clientTransferId,
                progress: event.progress.file_current_offset / event.progress.file_total_size,
                status: "transferring",
                fileSize: event.progress.file_current_offset
            });

            transfer.events.on("notify_progress", progressListener);
            transfer.events.on("notify_state_updated", () => {
                switch (transfer.transferState()) {
                    case FileTransferState.INITIALIZING:
                    case FileTransferState.PENDING:
                    case FileTransferState.CONNECTING:
                        events.fire("notify_transfer_status", {id: transfer.clientTransferId, status: "pending"});
                        break;

                    case FileTransferState.RUNNING:
                        events.fire("notify_transfer_status", {id: transfer.clientTransferId, status: "transferring"});
                        break;

                    case FileTransferState.FINISHED:
                    case FileTransferState.CANCELED:
                        events.fire("notify_transfer_status", {
                            id: transfer.clientTransferId,
                            status: "finished",
                            fileSize: transfer.transferProperties().fileSize
                        });
                        break;

                    case FileTransferState.ERRORED:
                        events.fire("notify_transfer_status", {id: transfer.clientTransferId, status: "errored"});
                        break;
                }

                if (transfer.isFinished()) {
                    unregisterEvents();
                    return;
                }
            });
            events.fire("notify_transfer_start", {
                id: transfer.clientTransferId,
                name: transfer.properties.name,
                path: "/" + channelPathPrefix + transfer.properties.channel_id + transfer.properties.path,
                mode: transfer instanceof FileUploadTransfer ? "upload" : "download"
            });

            const closeListener = () => unregisterEvents();
            events.on("notify_destroy", closeListener);

            const unregisterEvents = () => {
                events.off("notify_destroy", closeListener);
                transfer.events.off("notify_progress", progressListener);
            };
        };


        const registeredListener = event => listenToTransfer(event.transfer);
        connection.fileManager.events.on("notify_transfer_registered", registeredListener);
        events.on("notify_destroy", () => connection.fileManager.events.off("notify_transfer_registered", registeredListener));

        connection.fileManager.registeredTransfers().forEach(transfer => listenToTransfer(transfer));
    }
}