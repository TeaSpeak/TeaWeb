import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-events";
import {ModalAvatarUploadEvents, ModalAvatarUploadVariables} from "tc-shared/ui/modal/avatar-upload/Definitions";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {server_connections} from "tc-shared/ConnectionManager";
import PermissionType from "tc-shared/permission/PermissionType";
import {getOwnAvatarStorage, LocalAvatarInfo} from "tc-shared/file/OwnAvatarStorage";
import {LogCategory, logError, logInfo, logWarn} from "tc-shared/log";
import {Mutex} from "tc-shared/Mutex";
import {tr, traj} from "tc-shared/i18n/localize";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {FileTransferState, TransferProvider} from "tc-shared/file/Transfer";

class Controller {
    readonly connection: ConnectionHandler;
    readonly serverUniqueId: string;
    readonly events: Registry<ModalAvatarUploadEvents>;
    readonly variables: IpcUiVariableProvider<ModalAvatarUploadVariables>;

    private registeredListener: (() => void)[];

    private rendererUploading = false;
    private controllerLoading = false;
    private serverAvatarLoading = false;

    private avatarInfo: LocalAvatarInfo | undefined;

    /* TODO: Update the UI so the client can't upload multiple avatars at the same time (maybe even server wide?)  */
    private serverAvatarMutex: Mutex<void>;
    private serverAvatarUrl: string;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.serverUniqueId = connection.getCurrentServerUniqueId();
        this.registeredListener = [];
        this.serverAvatarMutex = new Mutex<void>(void 0);

        this.events = new Registry<ModalAvatarUploadEvents>();
        this.variables = new IpcUiVariableProvider<ModalAvatarUploadVariables>();

        this.variables.setVariableProvider("maxAvatarSize", () => {
            const permission = this.connection.permissions.neededPermission(PermissionType.I_CLIENT_MAX_AVATAR_FILESIZE);
            return permission.valueOr(-1);
        });

        this.variables.setVariableProvider("currentAvatar", () => {
            if(this.rendererUploading || this.controllerLoading || this.serverAvatarLoading) {
                return { status: "loading" };
            }

            if(this.avatarInfo) {
                const maxSize = this.variables.getVariableSync("maxAvatarSize");
                return {
                    status: maxSize >= 0 && maxSize < this.avatarInfo.fileSize ? "exceeds-max-size" : "available",

                    fileHashMD5: this.avatarInfo.fileHashMD5,
                    fileName: this.avatarInfo.fileName,
                    fileSize: this.avatarInfo.fileSize,

                    resourceUrl: this.avatarInfo.resourceUrl,

                    serverHasAvatar: this.serverAvatarUrl !== undefined
                };
            } else if(this.serverAvatarUrl) {
                return { status: "server", resourceUrl: this.serverAvatarUrl };
            } else {
                return { status: "unset" };
            }
        });

        this.registeredListener.push(this.connection.permissions.register_needed_permission(PermissionType.I_CLIENT_MAX_AVATAR_FILESIZE, () => {
            this.variables.sendVariable("maxAvatarSize");
            this.variables.sendVariable("currentAvatar");
        }));

        this.events.on("action_file_cache_loading", () => {
            this.rendererUploading = true;
            this.variables.sendVariable("currentAvatar");
        });

        this.events.on("action_file_cache_loading_finished", event => {
            this.rendererUploading = false;
            if(!event.success) {
                /* Failed to update local avatar. Send the last one. */
                this.variables.sendVariable("currentAvatar");
                return;
            }

            this.loadLocalAvatar();
        });

        this.loadServerAvatar();
    }

    destroy() {
        this.registeredListener.forEach(callback => callback());
        this.registeredListener = [];

        this.events.destroy();
        this.variables.destroy();

        this.setAvatarInfo(undefined);

        this.serverAvatarMutex.execute(async () => {
            /* Cleanup the cache so the next upload will be fresh */
            await getOwnAvatarStorage().removeAvatar(this.serverUniqueId, "uploading");
        }).then(undefined);
    }

    private loadLocalAvatar() {
        if(this.controllerLoading) {
            return;
        }

        this.loadLocalAvatar0().catch(error => {
            logError(LogCategory.GENERAL, tr("Failed to load local cached avatar: %o"), error);
            this.events.fire("notify_avatar_load_error", { error: tr("Failed to load local cached avatar") });
        }).then(() => {
            this.controllerLoading = false;
            this.variables.sendVariable("currentAvatar");
        });
    }

    private async loadLocalAvatar0() {
        const result = await getOwnAvatarStorage().loadAvatar(this.serverUniqueId, "uploading", true);
        let info: LocalAvatarInfo;
        switch (result.status) {
            case "success":
                info = result.result;
                break;

            case "error":
                this.events.fire("notify_avatar_load_error", {error: result.reason});
                return;

            case "cache-unavailable":
                this.events.fire("notify_avatar_load_error", {error: tr("Avatar cache unavailable")});
                return;

            case "empty-result":
                this.setAvatarInfo(undefined);
                return;

            default:
                throw tr("invalid state");
        }

        this.setAvatarInfo(info);
    }

    private loadServerAvatar() {
        if(this.serverAvatarLoading) {
            return;
        }

        this.serverAvatarUrl = undefined;
        this.loadServerAvatar0().catch(error => {
            logError(LogCategory.GENERAL, tr("Failed to load server avatar: %o"), error);
        }).then(() => {
            this.serverAvatarLoading = false;
            this.variables.sendVariable("currentAvatar");
        })
    }

    private async loadServerAvatar0() {
        const ownClientAvatar = this.connection.fileManager.avatars.resolveAvatar(this.connection.getClient().avatarId());
        await ownClientAvatar.awaitLoaded(5000);
        if(ownClientAvatar.getState() !== "loaded") {
            return;
        }

        this.serverAvatarUrl = ownClientAvatar.getTypedStateData("loaded").url;
    }

    /**
     * Note: This will not trigger the "currentAvatar" variable resend!
     * @param newInfo
     * @private
     */
    private setAvatarInfo(newInfo: LocalAvatarInfo) {
        if(this.avatarInfo?.resourceUrl) {
            URL.revokeObjectURL(this.avatarInfo.resourceUrl);
        }

        this.avatarInfo = newInfo;
    }

    resetAvatar() {
        this.serverAvatarMutex.execute(async () => {
            this.setAvatarInfo(undefined);
            await getOwnAvatarStorage().removeAvatar(this.serverUniqueId, "uploading");

            const serverConnection = this.connection.serverConnection;
            if(!serverConnection.connected()) {
                return;
            }

            try {
                await serverConnection.send_command('ftdeletefile', {
                    name: "/avatar_", /* delete own avatar */
                    path: "",
                    cid: 0
                });

                createInfoModal(tr("Avatar deleted"), tr("Avatar successfully deleted")).open();
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to reset avatar flag: %o"), error);

                let message;
                if(error instanceof CommandResult) {
                    message = formatMessage(tr("Failed to delete avatar.{:br:}Error: {0}"), error.formattedMessage());
                }

                if(!message) {
                    message = formatMessage(tr("Failed to delete avatar.{:br:}Lookup the console for more details"));
                }

                createErrorModal(tr("Failed to delete avatar"), message).open();
                return;
            }

            this.loadServerAvatar();
        });
    }

    uploadAvatar() {
        /* copy the avatar info */
        const avatarInfo = this.avatarInfo;
        this.serverAvatarMutex.execute(async() => {
            const serverConnection = this.connection.serverConnection;
            if(!serverConnection.connected()) {
                return;
            }

            if(!avatarInfo) {
                return;
            }

            try {
                logInfo(LogCategory.CLIENT, tr("Uploading new avatar"));
                const loadResult = await getOwnAvatarStorage().loadAvatarImage(this.serverUniqueId, "uploading");
                if (loadResult.status !== "success") {
                    logError(LogCategory.GENERAL, tr("Failed to load cached avatar image: %o"), loadResult);
                    throw tr("failed to load avatar image");
                }

                const transfer = this.connection.fileManager.initializeFileUpload({
                    name: "/avatar",
                    path: "",

                    channel: 0,
                    channelPassword: undefined,

                    source: async () => await TransferProvider.provider().createBufferSource(loadResult.result)
                });

                await transfer.awaitFinished();

                if (transfer.transferState() !== FileTransferState.FINISHED) {
                    if (transfer.transferState() === FileTransferState.ERRORED) {
                        logWarn(LogCategory.FILE_TRANSFER, tr("Failed to upload clients avatar: %o"), transfer.currentError());
                        createErrorModal(tr("Failed to upload avatar"), traj("Failed to upload avatar:{:br:}{0}", transfer.currentErrorMessage())).open();
                        return;
                    } else if (transfer.transferState() === FileTransferState.CANCELED) {
                        createErrorModal(tr("Failed to upload avatar"), tr("Your avatar upload has been canceled.")).open();
                        return;
                    } else {
                        createErrorModal(tr("Failed to upload avatar"), tr("Avatar upload finished with an unknown finished state.")).open();
                        return;
                    }
                }
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to upload avatar: %o"), error);
                createErrorModal(tr("Failed to upload avatar"), tr("Avatar upload failed. Lookup the console for more details.")).open();
                return;
            }

            try {
                await this.connection.serverConnection.send_command('clientupdate', {
                    client_flag_avatar: avatarInfo.fileHashMD5
                });
            } catch(error) {
                logError(LogCategory.GENERAL, tr("Failed to update avatar flag: %o"), error);

                let message;
                if(error instanceof CommandResult) {
                    message = formatMessage(tr("Failed to update avatar flag.{:br:}Error: {0}"), error.formattedMessage());
                }

                if(!message) {
                    message = formatMessage(tr("Failed to update avatar flag.{:br:}Lookup the console for more details"));
                }

                createErrorModal(tr("Failed to set avatar"), message).open();
                return;
            }

            createInfoModal(tr("Avatar successfully uploaded"), tr("Your avatar has been uploaded successfully!")).open();
            this.loadServerAvatar();
        });
    }
}

export function spawnAvatarUpload(connection: ConnectionHandler) {
    const controller = new Controller(connection);

    const modal = spawnModal("modal-avatar-upload", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription(),
        connection.getCurrentServerUniqueId()
    ], {
        popoutable: true
    });

    controller.events.on("action_avatar_upload", event => {
        controller.uploadAvatar();
        if(event.closeWindow) {
            modal.destroy();
        }
    });

    controller.events.on("action_avatar_delete", event => {
        controller.resetAvatar();
        if(event.closeWindow) {
            modal.destroy();
        }
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    modal.getEvents().on("destroy", connection.events().on("notify_connection_state_changed", event => {
        if(event.newState !== ConnectionState.CONNECTED) {
            modal.destroy();
        }
    }));

    modal.show().then(undefined);

    /* Trying to prompt the user */
    controller.events.fire("action_open_select");
}

(window as any).test = () => spawnAvatarUpload(server_connections.getActiveConnectionHandler());
setTimeout(() => (window as any).test(), 1500);