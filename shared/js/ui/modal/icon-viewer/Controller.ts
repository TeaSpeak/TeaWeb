import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-events";
import {
    IconUploadProgress,
    ModalIconViewerEvents,
    ModalIconViewerVariables,
    RemoteIconList,
    SelectedIconTab
} from "tc-shared/ui/modal/icon-viewer/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import PermissionType from "tc-shared/permission/PermissionType";
import {FileTransferState, TransferProvider} from "tc-shared/file/Transfer";

type IconUpload = {
    state: "initializing"
} | {
    state: "uploading",
    iconId: number,
    buffer: ArrayBuffer,
    progress: IconUploadProgress
};

const kUploadingIconPrefix = "uploading-";
const kRemoteIconPrefix = "remote-";

class Controller {
    readonly connection: ConnectionHandler;
    readonly events: Registry<ModalIconViewerEvents>;
    readonly variables: IpcUiVariableProvider<ModalIconViewerVariables>;

    private connectionListener: (() => void)[];
    private remoteIconList: RemoteIconList;
    private selectedIconId: string;
    private selectedTab: SelectedIconTab;

    private runningUploads: { [key: string]: IconUpload };

    constructor(connection: ConnectionHandler) {
        this.connection = connection;

        this.events = new Registry<ModalIconViewerEvents>();
        this.variables = new IpcUiVariableProvider<ModalIconViewerVariables>();

        this.selectedTab = "remote";
        this.selectedIconId = undefined;
        this.remoteIconList = { status: "loading" };
        this.runningUploads = {};

        this.variables.setVariableProvider("remoteIconList", () => this.remoteIconList);
        this.variables.setVariableProvider("remoteIconInfo", (iconId: string) => {
            if(iconId.startsWith(kRemoteIconPrefix)) {
                return { status: "live", iconId: parseInt(iconId.substring(7)) >>> 0 };
            } else if(iconId.startsWith(kUploadingIconPrefix)) {
                const uploadId = iconId.substring(kUploadingIconPrefix.length);
                const upload = this.runningUploads[uploadId];
                if(!upload) {
                    return { status: "unknown" };
                }

                switch (upload.state) {
                    case "initializing":
                        return { status: "uploading", process: { state: "pre-process" }};

                    case "uploading":
                        return { status: "uploading", process: upload.progress };

                    default:
                        return { status: "uploading", process: { state: "failed", message: tr("unknown state") } };
                }
            }

            return { status: "unknown" };
        });
        this.variables.setVariableProvider("uploadingIconPayload", (iconId: string) => {
            if(!iconId.startsWith(kUploadingIconPrefix)) {
                return undefined;
            }

            const uploadId = iconId.substring(kUploadingIconPrefix.length);
            const upload = this.runningUploads[uploadId];
            if(!upload || upload.state !== "uploading") {
                return undefined;
            }

            return upload.buffer;
        });
        this.variables.setVariableProvider("selectedIconId", () => this.selectedIconId);
        this.variables.setVariableEditor("selectedIconId", newValue => this.setSelectedIcon(newValue, false));

        this.variables.setVariableProvider("selectedTab", () => this.selectedTab);
        this.variables.setVariableEditor("selectedTab", newValue => this.setSelectedTab(newValue, false));

        this.events.on("action_refresh", () => this.updateRemoteIconList());
        this.events.on("action_delete", event => {
            if(!event.iconId.startsWith(kRemoteIconPrefix)) {
                this.events.fire("notify_delete_error", { status: "not-found" });
                return;
            }

            const iconId = parseInt(event.iconId.substring(7)) >>> 0;
            this.connection.fileManager.deleteIcon(iconId).then(() => {
                if(this.remoteIconList.status !== "loaded") {
                    return;
                }

                this.remoteIconList.icons.remove(event.iconId);
                this.variables.sendVariable("remoteIconList");
            }).catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                        this.events.fire("notify_delete_error", { status: "no-permissions", failedPermission: this.connection.permissions.getFailedPermission(error) });
                    } else {
                        this.events.fire("notify_delete_error", { status: "error", message: error.formattedMessage() });
                    }
                } else if(typeof error === "string") {
                    this.events.fire("notify_delete_error", { status: "error", message: error });
                } else {
                    logError(LogCategory.NETWORKING, tr("Failed to delete icon {}: {}"), iconId, error)
                    this.events.fire("notify_delete_error", { status: "error", message: tr("lookup the console") });
                }
            });
        });
        this.events.on("action_initialize_upload", event => {
            this.runningUploads[event.uploadId] = { state: "initializing" };
            this.variables.sendVariable("remoteIconInfo", kUploadingIconPrefix + event.uploadId);

            if(this.remoteIconList.status === "loaded") {
                /* Register icon in the current list (use toggle to only add it once) */
                this.remoteIconList.icons.toggle(kUploadingIconPrefix + event.uploadId, true);
            }
            this.variables.sendVariable("remoteIconList");
        });
        this.events.on("action_fail_upload", event => {
            this.runningUploads[event.uploadId] = { state: "uploading", progress: { state: "failed", message: event.message }, iconId: 0, buffer: undefined };
            this.variables.sendVariable("remoteIconInfo", kUploadingIconPrefix + event.uploadId);
        });
        this.events.on("action_clear_failed", () => {
            let transferChanged = false;
            for(const key of Object.keys(this.runningUploads)) {
                const upload = this.runningUploads[key];
                if(upload.state !== "uploading") {
                    continue;
                }

                if(upload.progress.state !== "failed") {
                    continue;
                }

                delete this.runningUploads[key];
                if(this.remoteIconList.status === "loaded") {
                    this.remoteIconList.icons.remove(kUploadingIconPrefix + key);
                    transferChanged = true;
                }
            }

            if(transferChanged) {
                this.variables.sendVariable("remoteIconList");
            }
        });
        this.events.on("action_upload", event => {
            /* Remove all old uploads with the same icon id or remove this upload since it's a duplicate */
            {
                let transferChanged = false;
                for(const key of Object.keys(this.runningUploads)) {
                    const upload = this.runningUploads[key];
                    if(upload.state !== "uploading") {
                        continue;
                    }

                    if(upload.iconId !== event.iconId) {
                        continue;
                    }

                    if(upload.progress.state === "failed") {
                        delete this.runningUploads[key];
                        if(this.remoteIconList.status === "loaded") {
                            this.remoteIconList.icons.remove(kUploadingIconPrefix + key);
                            transferChanged = true;
                        }
                    } else {
                        /* We already have a transfer for this icon */
                        delete this.runningUploads[event.uploadId];
                        if(this.remoteIconList.status === "loaded") {
                            this.remoteIconList.icons.remove(kUploadingIconPrefix + event.uploadId);
                        }
                        this.variables.sendVariable("remoteIconList");
                        return;
                    }
                }

                if(transferChanged) {
                    this.variables.sendVariable("remoteIconList");
                }
            }

            const uploadId = event.uploadId;
            const iconInfo = this.runningUploads[uploadId] = {
                state: "uploading",
                buffer: event.buffer,
                iconId: event.iconId,
                progress: { state: "pending" } as IconUploadProgress
            };
            this.variables.sendVariable("uploadingIconPayload", kUploadingIconPrefix + uploadId);

            const transfer = this.connection.fileManager.initializeFileUpload({
                path: "",
                name: "/icon_" + iconInfo.iconId,
                source: () => TransferProvider.provider().createBufferSource(iconInfo.buffer),
                processCommandResult: false
            });

            const sendUpdateIconInfo = () => {
                if(this.runningUploads[uploadId] !== iconInfo) {
                    return;
                }

                this.variables.sendVariable("remoteIconInfo", kUploadingIconPrefix + uploadId);
            }

            const transferListener = [];
            transferListener.push(transfer.events.on("notify_progress", event => {
                if(iconInfo.progress.state !== "transferring") {
                    /* We're not transferring so we don't need any updates */
                    return;
                }

                iconInfo.progress.process = event.progress.file_current_offset / event.progress.file_total_size;
                sendUpdateIconInfo();
            }));
            transferListener.push(transfer.events.on("notify_state_updated", event => {
                switch (event.newState) {
                    case FileTransferState.CANCELED:
                        iconInfo.progress = { state: "failed", message: tr("Transfer canceled") };
                        break;

                    case FileTransferState.ERRORED:
                        iconInfo.progress = { state: "failed", message: transfer.currentErrorMessage() || tr("Transfer error") };
                        break;

                    case FileTransferState.PENDING:
                        iconInfo.progress = { state: "pending" };
                        break;

                    case FileTransferState.RUNNING:
                        iconInfo.progress = { state: "transferring", process: 0 };
                        break;

                    case FileTransferState.FINISHED:
                        /* TODO: Place icon in local icon cache to avoid redownload */
                        iconInfo.progress = { state: "transferring", process: 1 };
                        delete this.runningUploads[uploadId];
                        if(this.remoteIconList.status === "loaded") {
                            const remoteIconName = kRemoteIconPrefix + iconInfo.iconId;
                            const uploadIndex = this.remoteIconList.icons.indexOf(kUploadingIconPrefix + uploadId);
                            const icons = this.remoteIconList.icons;
                            if(uploadIndex === -1) {
                                /* Just add the new icon if not already done so */
                                icons.toggle(remoteIconName, true);
                            } else if(icons.indexOf(remoteIconName) === -1) {
                                /* Replace the uploading icon with a remote icon */
                                icons.splice(uploadIndex, 1, remoteIconName);
                            } else {
                                /* Just delete the upload icon. Nothing to change */
                                icons.splice(uploadIndex, 1);
                            }
                        }

                        /* Clear up the array buffer cache */
                        this.variables.sendVariable("uploadingIconPayload", uploadId);
                        this.variables.sendVariable("remoteIconList");
                        break;

                    case FileTransferState.INITIALIZING:
                    case FileTransferState.CONNECTING:
                        iconInfo.progress = { state: "initializing" };
                }

                sendUpdateIconInfo();
                if(transfer.isFinished()) {
                    transferListener.forEach(callback => callback());
                }
            }));

            sendUpdateIconInfo();
        });

        this.connectionListener = [];
        this.connectionListener.push(this.connection.permissions.register_needed_permission(PermissionType.B_ICON_MANAGE, () => this.updateRemoteIconList()));

        this.events.fire("action_refresh");
    }

    setSelectedTab(tab: SelectedIconTab, updateVariable: boolean) {
        if(this.selectedTab === tab) {
            return;
        }

        this.selectedTab = tab;
        if(updateVariable) {
            this.variables.sendVariable("selectedTab");
        }
    }

    setSelectedIcon(iconId: string, updateVariable: boolean) {
        if(this.selectedIconId === iconId) {
            return;
        }

        this.selectedIconId = iconId;
        if(updateVariable) {
            this.variables.sendVariable("selectedIconId");
        }
    }

    @CallOnce
    destroy() {
        this.connectionListener?.forEach(callback => callback());
        this.connectionListener = undefined;

        this.events.destroy();
        this.variables.destroy();
    }

    private async updateRemoteIconList() {
        this.remoteIconList = { status: "loading" };
        this.variables.sendVariable("remoteIconList");

        try {
            const iconIds = [];
            for(const icon of await this.connection.fileManager.requestFileList("/icons", undefined, undefined, false)) {
                if(!icon.name?.startsWith("icon_")) {
                    logWarn(LogCategory.NETWORKING, tr("Icon list returned invalid file %s."), icon.name);
                    continue;
                }

                const iconId = parseInt(icon.name.substring(5));
                if(isNaN(iconId)) {
                    logWarn(LogCategory.NETWORKING, tr("Remote icon list contains invalid icon file: %s"), icon.name);
                    continue;
                }

                iconIds.push(iconId >>> 0);
            }

            this.remoteIconList = {
                status: "loaded",
                icons: [
                    ...iconIds.map(iconId => kRemoteIconPrefix + iconId),
                    ...Object.keys(this.runningUploads).map(uploadId => kUploadingIconPrefix + uploadId)
                ],
                refreshTimestamp: Date.now() + 5 * 1000
            };
        } catch (error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                    this.remoteIconList = { status: "loaded", icons: [], refreshTimestamp: Date.now() + 5 * 1000 };
                } else if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    this.remoteIconList = { status: "no-permission", failedPermission: this.connection.permissions.getFailedPermission(error), refreshTimestamp: Date.now() + 5 * 1000 };
                } else {
                    this.remoteIconList = { status: "error", message: error.formattedMessage(), refreshTimestamp: Date.now() + 5 * 1000 };
                }
            } else if(typeof error === "string") {
                this.remoteIconList = { status: "error", message: error, refreshTimestamp: Date.now() + 5 * 1000 };
            } else {
                logError(LogCategory.NETWORKING, tr("Failed to query remote icon list: %o"), error);
                this.remoteIconList = { status: "error", message: tr("lookup the console"), refreshTimestamp: Date.now() + 5 * 1000 };
            }
        } finally {
            this.variables.sendVariable("remoteIconList");
        }
    }
}

export type IconSelectCallback = (iconId: number | 0) => void;
export function spawnIconManage(connection: ConnectionHandler, preselectedIconId: number | 0, callbackSelect: undefined | IconSelectCallback) {
    const controller = new Controller(connection);
    if(preselectedIconId === 0) {
        /* No icon selected */
        controller.setSelectedTab("remote", true);
    } else if(preselectedIconId < 1000) {
        controller.setSelectedTab("local", true);
        controller.setSelectedIcon(preselectedIconId.toString(), true);
    } else {
        controller.setSelectedTab("remote", true);
        controller.setSelectedIcon(kRemoteIconPrefix + preselectedIconId, true);
    }

    if(callbackSelect) {
        controller.events.on("action_select", event => {
            if(!event.targetIcon) {
                callbackSelect(0);
            } else if(event.targetIcon.startsWith(kUploadingIconPrefix)) {
                const iconId = parseInt(event.targetIcon.substring(kUploadingIconPrefix.length)) >>> 0;
                if(isNaN(iconId)) {
                    return;
                }

                callbackSelect(iconId);
            } else if(event.targetIcon.startsWith(kRemoteIconPrefix)) {
                const iconId = parseInt(event.targetIcon.substring(kRemoteIconPrefix.length)) >>> 0;
                if(isNaN(iconId)) {
                    return;
                }

                callbackSelect(iconId);
            } else {
                const iconId = parseInt(event.targetIcon) >>> 0;
                if(isNaN(iconId)) {
                    return;
                }

                callbackSelect(iconId);
            }

            modal.destroy();
        });
    }

    const modal = spawnModal("modal-icon-viewer", [
        connection.handlerId,
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription(),
        !!callbackSelect
    ], {
        popoutable: true,
        noOpener: true
    });

    modal.getEvents().on("destroy", () => controller.destroy());

    ignorePromise(modal.show());
}