import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ImageCache, ImageType, imageType2MediaType, responseImageType} from "tc-shared/file/ImageCache";
import {AbstractIconManager, kIPCIconChannel, RemoteIcon, RemoteIconState, setIconManager} from "tc-shared/file/Icons";
import * as log from "tc-shared/log";
import {LogCategory, logDebug, logError, logWarn} from "tc-shared/log";
import {server_connections} from "tc-shared/ConnectionManager";
import {ConnectionEvents, ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {FileTransferState, ResponseTransferTarget, TransferProvider, TransferTargetType} from "tc-shared/file/Transfer";
import {tr} from "tc-shared/i18n/localize";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {ChannelMessage, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import * as ipc from "tc-shared/ipc/BrowserIPC";

/* TODO: Retry icon download after some time */
/* TODO: Download icon when we're connected to the server were we want the icon from and update the icon */

async function responseToImageUrl(response: Response) : Promise<string> {
    if(!response.headers.has('X-media-bytes')) {
        throw "missing media bytes";
    }

    const type = responseImageType(response.headers.get('X-media-bytes'));
    if(type === ImageType.UNKNOWN) {
        throw "unknown image type";
    }

    const media = imageType2MediaType(type);
    const blob = await response.blob();
    if(blob.type !== "image/" + media) {
        return URL.createObjectURL(blob.slice(0, blob.size, "image/" + media));
    } else {
        return URL.createObjectURL(blob)
    }
}

class LocalRemoteIcon extends RemoteIcon {
    constructor(serverUniqueId: string, iconId: number) {
        super(serverUniqueId, iconId);
    }

    destroy() {
        super.destroy();
        if(this.imageUrl && "revokeObjectURL" in URL) {
            URL.revokeObjectURL(this.imageUrl);
        }
    }

    public setImageUrl(url: string) {
        super.setImageUrl(url);
    }

    public setErrorMessage(message: string) {
        super.setErrorMessage(message);
    }

    public setState(state: RemoteIconState) {
        super.setState(state);
    }
}

export let localIconCache: ImageCache;
class IconManager extends AbstractIconManager {
    private cachedIcons: {[key: string]: LocalRemoteIcon} = {};
    private connectionStateChangeListener: {[key: string]: (handlerId: string, event: ConnectionEvents["notify_connection_state_changed"]) => void} = {};
    private ipcChannel: IPCChannel;

    constructor() {
        super();

        this.ipcChannel = ipc.getIpcInstance().createChannel(undefined, kIPCIconChannel);
        this.ipcChannel.messageHandler = this.handleIpcMessage.bind(this);

        server_connections.events().on("notify_handler_created", event => {
            this.connectionStateChangeListener[event.handlerId] = this.handleHandlerStateChange.bind(this, event.handlerId);
            event.handler.events().on("notify_connection_state_changed", this.connectionStateChangeListener[event.handlerId] as any);
        });

        server_connections.events().on("notify_handler_deleted", event => {
             if(this.connectionStateChangeListener[event.handlerId]) {
                 event.handler.events().off("notify_connection_state_changed", this.connectionStateChangeListener[event.handlerId] as any);
                 delete this.connectionStateChangeListener[event.handlerId];
             }
        });
    }

    destroy() {
        Object.values(this.cachedIcons).forEach(icon => icon.destroy());
        this.cachedIcons = {};

        /* TODO: Unregister server handler events */
    }

    private handleHandlerStateChange(handlerId: string, event: ConnectionEvents["notify_connection_state_changed"]) {
        const connection = server_connections.findConnection(handlerId);
        if(!connection) {
            logWarn(LogCategory.CLIENT, tr("Received handler state changed event for invalid handler id %s"), handlerId);
            return;
        }

        if(event.newState !== ConnectionState.CONNECTED) {
            return;
        }

        /* update all empty icons */
        Object.values(this.cachedIcons).forEach((icon: LocalRemoteIcon) => {
            if(icon.serverUniqueId !== connection.getCurrentServerUniqueId()) {
                return;
            }

            if(icon.getState() === "empty") {
                this.wrapIconDownload(icon, connection, IconManager.iconUniqueKey(icon.iconId, icon.serverUniqueId)).then(() => {});
            }
        });
    }

    private handleIconStateChanged(icon: RemoteIcon) {
        this.sendIconStateChange(icon);
    }

    private sendIconStateChange(icon: RemoteIcon, remoteId?: string) {
        let data = {} as any;

        data.iconUniqueId = IconManager.iconUniqueKey(icon.iconId, icon.serverUniqueId);
        data.status = icon.getState();

        switch (icon.getState()) {
            case "loaded":
                data.url = icon.hasImageUrl() ? icon.getImageUrl() : undefined;
                break;

            case "error":
                data.errorMessage = icon.getErrorMessage();
                break;
        }

        this.ipcChannel.sendMessage("notify-icon-status", data, remoteId);
    }


    private handleIpcMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast) { return; }
        if(message.type === "initialize") {
            this.ipcChannel.sendMessage("initialized", {}, remoteId);
            return;
        } else if(message.type === "icon-resolve") {
            this.sendIconStateChange(this.resolveIcon(message.data.iconId, message.data.serverUniqueId, message.data.handlerId), remoteId);
        }
    }

    resolveIcon(iconId: number, serverUniqueId: string, handlerIdHint: string): RemoteIcon {
        serverUniqueId = serverUniqueId || "";

        /* just to ensure */
        iconId = iconId >>> 0;

        const iconUniqueId = IconManager.iconUniqueKey(iconId, serverUniqueId);
        if(this.cachedIcons[iconUniqueId]) {
            return this.cachedIcons[iconUniqueId];
        }

        let icon = new LocalRemoteIcon(serverUniqueId, iconId);
        this.cachedIcons[iconUniqueId] = icon;

        icon.events.on("notify_state_changed", () => this.handleIconStateChanged(icon));

        if(iconId >= 0 && iconId <= 1000) {
            icon.setState("loaded");
        } else {
            this.loadIcon(icon, iconUniqueId, handlerIdHint).catch(error => {
                if(typeof error !== "string") {
                    logError(LogCategory.FILE_TRANSFER, tr("Failed to load icon %d (%s): %o"), iconId, serverUniqueId, error);
                    icon.setErrorMessage(tr("load error, lookup the console"));
                } else{
                    icon.setErrorMessage(error);
                    icon.setState("error");
                }
            });
        }

        return icon;
    }

    private async loadIcon(icon: LocalRemoteIcon, iconUniqueId: string, handlerIdHint: string) {
        /* try to load the icon from the local cache */
        const localCache = await localIconCache.resolveCached(iconUniqueId);
        if(localCache) {
            try {
                const url = await responseToImageUrl(localCache);
                icon.setImageUrl(url);
                icon.setState("loaded");
                logDebug(LogCategory.FILE_TRANSFER, tr("Loaded icon %d (%s) from local cache."), icon.iconId, icon.serverUniqueId);
                return;
            } catch (error) {
                logWarn(LogCategory.FILE_TRANSFER, tr("Failed to decode locally cached icon %d (%s): %o. Invalidating cache."), icon.iconId, icon.serverUniqueId, error);
                try {
                    await localIconCache.delete(iconUniqueId);
                } catch (error) {
                    logWarn(LogCategory.FILE_TRANSFER, tr("Failed to delete invalid key from icon cache (%s): %o"), iconUniqueId, error);
                }
            }
        }

        /* try to fetch the icon from the server, if we're connected */
        let handler = server_connections.findConnection(handlerIdHint);
        if(handler) {
            if(!handler.connected) {
                logWarn(LogCategory.FILE_TRANSFER, tr("Received handler id hint for icon download, but handler %s is not connected. Trying others."), handlerIdHint);
                handler = undefined;
            } else if(handler.channelTree.server.properties.virtualserver_unique_identifier !== icon.serverUniqueId) {
                logWarn(LogCategory.FILE_TRANSFER,
                    tr("Received handler id hint for icon download, but handler %s is not connected to the expected server (%s <=> %s). Trying others."),
                    handlerIdHint, handler.channelTree.server.properties.virtualserver_unique_identifier, icon.serverUniqueId);
                handler = undefined;
            } else {
                logDebug(LogCategory.FILE_TRANSFER, tr("Icon %s (%s) not found locally but the suggested handler is connected to the server. Downloading icon."), icon.iconId, icon.serverUniqueId);
            }

            /* we don't want any "handler not found" warning */
            handlerIdHint = undefined;
        }

        if(!handler) {
            if(handlerIdHint) {
                logWarn(LogCategory.FILE_TRANSFER, tr("Received handler id hint for icon download, but handler %s does not exists. Trying others."), handlerIdHint);
            }

            const connections = server_connections.all_connections()
                .filter(handler => handler.connected)
                .filter(handler => handler.channelTree.server.properties.virtualserver_unique_identifier === icon.serverUniqueId);

            if(connections.length === 0) {
                logDebug(LogCategory.FILE_TRANSFER, tr("Icon %s (%s) not found locally and we're currently not connected to the target server. Returning an empty result."), icon.iconId, icon.serverUniqueId);
                icon.setState("empty");
                return;
            }

            logDebug(LogCategory.FILE_TRANSFER, tr("Icon %s (%s) not found locally but we're connected to the server, using first available connection (%s). Downloading icon."), icon.iconId, icon.serverUniqueId, connections[0].handlerId);
            handler = connections[0];
        }

        await this.wrapIconDownload(icon, handler, iconUniqueId);
    }

    private async wrapIconDownload(icon: LocalRemoteIcon, handler: ConnectionHandler, iconUniqueId: string) {
        try {
            await this.downloadIcon(icon, handler, iconUniqueId);
        } catch (error) {
            if(typeof error !== "string") {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to download icon %d (%s) from %s: %o"), icon.iconId, icon.serverUniqueId, handler.handlerId, error);
                error = tr("download failed, lookup the console");
            }

            icon.setErrorMessage(error);
            icon.setState("error");
            return;
        }

        if(icon.getState() === "loading") {
            icon.setErrorMessage(tr("unexpected loading state"));
            icon.setState("error");
        }
    }

    private async downloadIcon(icon: LocalRemoteIcon, handler: ConnectionHandler, iconUniqueId: string) {
        const transfer = handler.fileManager.initializeFileDownload({
            path: "",
            name: "/icon_" + icon.iconId,
            targetSupplier: async () => await TransferProvider.provider().createResponseTarget()
        });

        try {
            await transfer.awaitFinished();

            if(transfer.transferState() === FileTransferState.CANCELED) {
                throw tr("download canceled");
            } else if(transfer.transferState() === FileTransferState.ERRORED) {
                throw transfer.currentError();
            } else if(transfer.transferState() === FileTransferState.FINISHED) {

            } else {
                throw tr("Unknown transfer finished state");
            }
        } catch(error) {
            if(error instanceof CommandResult) {
                if(error.id === ErrorCode.FILE_NOT_FOUND) {
                    throw tr("Icon could not be found");
                } else if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                    throw tr("No permissions to download icon");
                } else {
                    throw error.extra_message || error.message;
                }
            }
            log.error(LogCategory.FILE_TRANSFER, tr("Could not request download for icon %d: %o"), icon.iconId, error);
            if(error === transfer.currentError()) {
                throw transfer.currentErrorMessage();
            }

            throw typeof error === "string" ? error : tr("Failed to initialize icon download");
        }

        /* could only be tested here, because before we don't know which target we have */
        if(transfer.target.type !== TransferTargetType.RESPONSE) {
            throw "unsupported transfer target";
        }

        const response = transfer.target as ResponseTransferTarget;
        if(!response.hasResponse()) {
            throw tr("Transfer has no response");
        }

        try {
            const url = await responseToImageUrl(response.getResponse().clone());
            icon.setImageUrl(url);
            icon.setState("loaded");
        } catch (error) {
            if(typeof error !== "string") {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to convert downloaded icon %d (%s) into an url: %o"), icon.iconId, icon.serverUniqueId, error);
                error = tr("download failed, lookup the console");
            }

            icon.setErrorMessage(error);
            icon.setState("error");
            return;
        }

        try {
            const resp = response.getResponse();
            if(!resp.headers.has('X-media-bytes')) {
                throw "missing media bytes";
            }

            const type = responseImageType(resp.headers.get('X-media-bytes'));
            if(type === ImageType.UNKNOWN) {
                throw "unknown image type";
            }

            const media = imageType2MediaType(type);
            await localIconCache.putCache(iconUniqueId, response.getResponse(), "image/" + media);
        } catch (error) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Failed to save icon %s (%s) into local icon cache: %o"), icon.iconId, icon.serverUniqueId, error);
        }
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "icon init",
    priority: 60,
    function: async () => {
        localIconCache = await ImageCache.load("icons");
        setIconManager(new IconManager());
    }
});

//TODO!
/*
window.addEventListener("beforeunload", () => {
    icon_cache_loader.clear_memory_cache();
});

(window as any).flush_icon_cache = async () => {
    icon_cache_loader.clear_memory_cache();
    await icon_cache_loader.clear_cache();

    server_connections.all_connections().forEach(e => {
        e.fileManager.icons.flush_cache();
    });
};
 */