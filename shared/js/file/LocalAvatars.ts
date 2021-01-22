import {LogCategory, logDebug, logError, logInfo, logWarn} from "../log";
import * as ipc from "../ipc/BrowserIPC";
import {ChannelMessage} from "../ipc/BrowserIPC";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {responseImageType, ImageCache, imageType2MediaType} from "../file/ImageCache";
import {FileManager} from "../file/FileManager";
import {
    FileDownloadTransfer,
    FileTransferState,
    ResponseTransferTarget,
    TransferProvider,
    TransferTargetType
} from "../file/Transfer";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {ClientEntry} from "../tree/Client";
import {tr} from "../i18n/localize";
import {
    AbstractAvatarManager,
    AbstractAvatarManagerFactory,
    AvatarState,
    AvatarStateData,
    ClientAvatar,
    kIPCAvatarChannel,
    setGlobalAvatarManagerFactory,
    uniqueId2AvatarId
} from "../file/Avatars";
import {IPCChannel} from "../ipc/BrowserIPC";
import {ConnectionHandler} from "../ConnectionHandler";
import {ErrorCode} from "../connection/ErrorCode";
import {server_connections} from "tc-shared/ConnectionManager";
import {EventDispatchType} from "tc-shared/events";

/* FIXME: Retry avatar download after some time! */

class LocalClientAvatar extends ClientAvatar {
    protected destroyStateData(state: AvatarState, data: AvatarStateData[AvatarState]) {
        if(state === "loaded") {
            const tdata = data as AvatarStateData["loaded"];
            URL.revokeObjectURL(tdata.url);
        }
    }
}

let localAvatarCache: ImageCache;
export class AvatarManager extends AbstractAvatarManager {
    readonly handle: FileManager;
    private cachedAvatars: {[avatarId: string]: LocalClientAvatar} = {};

    constructor(handle: FileManager) {
        super();
        this.handle = handle;
    }

    destroy() {
        Object.values(this.cachedAvatars).forEach(e => e.destroy());
        this.cachedAvatars = {};
    }

    create_avatar_download(client_avatar_id: string) : FileDownloadTransfer {
        logDebug(LogCategory.GENERAL, "Requesting download for avatar %s", client_avatar_id);

        return this.handle.initializeFileDownload({
            path: "",
            name: "/avatar_" + client_avatar_id,
            targetSupplier: async () => await TransferProvider.provider().createResponseTarget()
        });
    }

    private async executeAvatarLoad0(avatar: LocalClientAvatar) {
        if(avatar.getAvatarHash() === "") {
            avatar.setUnset();
            return;
        }

        let initialAvatarHash = avatar.getAvatarHash();
        let avatarResponse: Response;

        /* try to lookup our cache for the avatar */
        cache_lookup: {
            const response = await localAvatarCache.resolveCached('avatar_' + avatar.clientAvatarId); //TODO age!
            if(!response) {
                break cache_lookup;
            }

            let cachedAvatarHash = response.headers.has("X-avatar-version") ? response.headers.get("X-avatar-version") : undefined;
            if(avatar.getAvatarHash() !== "unknown") {
                if(cachedAvatarHash === undefined) {
                    logDebug(LogCategory.FILE_TRANSFER, tr("Invalidating cached avatar for %s (Version miss match. Cached: unset, Current: %s)"), avatar.clientAvatarId, avatar.getAvatarHash());
                    await localAvatarCache.delete('avatar_' + avatar.clientAvatarId);
                    break cache_lookup;
                } else if(cachedAvatarHash !== avatar.getAvatarHash()) {
                    logDebug(LogCategory.FILE_TRANSFER, tr("Invalidating cached avatar for %s (Version miss match. Cached: %s, Current: %s)"), avatar.clientAvatarId, cachedAvatarHash, avatar.getAvatarHash());
                    await localAvatarCache.delete('avatar_' + avatar.clientAvatarId);
                    break cache_lookup;
                }
            } else if(cachedAvatarHash) {
                avatar.events.fire("avatar_changed", { newAvatarHash: cachedAvatarHash });
                initialAvatarHash = cachedAvatarHash;
            }

            avatarResponse = response;
        }

        /* load the avatar from the server */
        if(!avatarResponse) {
            let transfer = this.create_avatar_download(avatar.clientAvatarId);

            try {
                await transfer.awaitFinished();

                if(transfer.transferState() === FileTransferState.CANCELED) {
                    throw tr("download canceled");
                } else if(transfer.transferState() === FileTransferState.ERRORED) {
                    throw transfer.currentError();
                } else if(transfer.transferState() !== FileTransferState.FINISHED) {
                    throw tr("unknown transfer finished state");
                }
            } catch(error) {
                if(typeof error === "object" && 'error' in error && error.error === "initialize") {
                    const commandResult = error.commandResult;
                    if(commandResult instanceof CommandResult) {
                        if(commandResult.id === ErrorCode.FILE_NOT_FOUND) {
                            if(avatar.getAvatarHash() !== initialAvatarHash) {
                                logDebug(LogCategory.GENERAL, tr("Ignoring avatar not found since the avatar itself got updated. Out version: %s, current version: %s"), initialAvatarHash, avatar.getAvatarHash());
                                return;
                            }

                            avatar.setUnset();
                            return;
                        } else if(commandResult.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                            throw tr("No permissions to download the avatar");
                        } else {
                            throw commandResult.message + (commandResult.extra_message ? " (" + commandResult.extra_message + ")" : "");
                        }
                    }
                }

                logError(LogCategory.CLIENT, tr("Could not request download for avatar %s: %o"), avatar.clientAvatarId, error);
                if(error === transfer.currentError())
                    throw transfer.currentErrorMessage();

                throw typeof error === "string" ? error : tr("Avatar download failed");
            }

            /* could only be tested here, because before we don't know which target we have */
            if(transfer.target.type !== TransferTargetType.RESPONSE)
                throw "unsupported transfer target";

            const transferResponse = transfer.target as ResponseTransferTarget;
            if(!transferResponse.hasResponse()) {
                throw tr("Avatar transfer has no response");
            }

            const headers = transferResponse.getResponse().headers;
            if(!headers.has("X-media-bytes")) {
                throw tr("Avatar response missing media bytes");
            }

            const type = responseImageType(headers.get('X-media-bytes'));
            const media = imageType2MediaType(type);

            if(avatar.getAvatarHash() !== initialAvatarHash) {
                logDebug(LogCategory.GENERAL, tr("Ignoring avatar not found since the avatar itself got updated. Out version: %s, current version: %s"), initialAvatarHash, avatar.getAvatarHash());
                return;
            }

            await localAvatarCache.putCache('avatar_' + avatar.clientAvatarId, transferResponse.getResponse().clone(), "image/" + media, {
                "X-avatar-version": avatar.getAvatarHash()
            });

            avatarResponse = transferResponse.getResponse();
        }

        if(!avatarResponse) {
            throw tr("Missing avatar response");
        }

        /* get an url from the response */
        {
            if(!avatarResponse.headers.has('X-media-bytes'))
                throw "missing media bytes";

            const type = responseImageType(avatarResponse.headers.get('X-media-bytes'));
            const media = imageType2MediaType(type);

            const blob = await avatarResponse.blob();

            /* ensure we're still up to date */
            if(avatar.getAvatarHash() !== initialAvatarHash) {
                logDebug(LogCategory.GENERAL, tr("Ignoring avatar not found since the avatar itself got updated. Out version: %s, current version: %s"), initialAvatarHash, avatar.getAvatarHash());
                return;
            }

            if(blob.type !== "image/" + media) {
                avatar.setLoaded({ url: URL.createObjectURL(blob.slice(0, blob.size, "image/" + media)) });
            } else {
                avatar.setLoaded({ url: URL.createObjectURL(blob) });
            }
        }
    }

    private executeAvatarLoad(avatar: LocalClientAvatar) {
        const avatarHash = avatar.getAvatarHash();

        avatar.setLoading();
        avatar.loadingTimestamp = Date.now();
        this.executeAvatarLoad0(avatar).catch(error => {
            if(avatar.getAvatarHash() !== avatarHash) {
                logDebug(LogCategory.GENERAL, tr("Ignoring avatar not found since the avatar itself got updated. Out version: %s, current version: %s"), avatarHash, avatar.getAvatarHash());
                return;
            }

            if(typeof error === "string") {
                avatar.setErrored({ message: error });
            } else if(error instanceof Error) {
                avatar.setErrored({ message: error.message });
            } else {
                logError(LogCategory.FILE_TRANSFER, tr("Failed to load avatar %s (hash: %s): %o"), avatar.clientAvatarId, avatarHash, error);
                avatar.setErrored({ message: tr("lookup the console") });
            }
        });
    }

    async updateCache(clientAvatarId: string, clientAvatarHash: string) {
        const cached = this.cachedAvatars[clientAvatarId];
        if(cached) {
            if(cached.getAvatarHash() === clientAvatarHash)
                return;

            logInfo(LogCategory.GENERAL, tr("Deleting cached avatar for client %s. Cached version: %s; New version: %s"), cached.getAvatarHash(), clientAvatarHash);
        }

        const response = await localAvatarCache.resolveCached('avatar_' + clientAvatarId);
        if(response) {
            let cachedAvatarHash = response.headers.has("X-avatar-version") ? response.headers.get("X-avatar-version") : undefined;
            if(cachedAvatarHash !== clientAvatarHash) {
                await localAvatarCache.delete("avatar_" + clientAvatarId).catch(error => {
                    logWarn(LogCategory.FILE_TRANSFER, tr("Failed to delete avatar %s: %o"), clientAvatarId, error);
                });
            }
        }

        if(cached) {
            cached.events.fire("avatar_changed", { newAvatarHash: clientAvatarHash });
            this.executeAvatarLoad(cached);
        }
    }

    resolveAvatar(clientAvatarId: string, avatarHash?: string, cacheOnly?: boolean) : ClientAvatar {
        let avatar = this.cachedAvatars[clientAvatarId];
        if(!avatar) {
            if(cacheOnly)
                return undefined;

            avatar = new LocalClientAvatar(clientAvatarId);
            this.cachedAvatars[clientAvatarId] = avatar;
        } else if(typeof avatarHash !== "string" || avatar.getAvatarHash() === avatarHash) {
            return avatar;
        }

        avatar.events.fire("avatar_changed", { newAvatarHash: typeof avatarHash === "string" ? avatarHash : "unknown" });
        this.executeAvatarLoad(avatar);

        return avatar;
    }

    resolveClientAvatar(client: { id?: number, database_id?: number, clientUniqueId: string }) {
        let clientHandle: ClientEntry;
        if(typeof client.id === "number") {
            clientHandle = this.handle.connectionHandler.channelTree.findClient(client.id);
            if(clientHandle?.properties.client_unique_identifier !== client.clientUniqueId)
                clientHandle = undefined;
        }

        if(!clientHandle && typeof client.database_id === "number") {
            clientHandle = this.handle.connectionHandler.channelTree.find_client_by_dbid(client.database_id);
            if(clientHandle?.properties.client_unique_identifier !== client.clientUniqueId)
                clientHandle = undefined;
        }

        return this.resolveAvatar(uniqueId2AvatarId(client.clientUniqueId), clientHandle?.properties.client_flag_avatar);
    }

    private static generate_default_image() : JQuery {
        return $.spawn("img").attr("src", "img/style/avatar.png").css({width: '100%', height: '100%'});
    }

    generate_chat_tag(client: { id?: number; database_id?: number; }, client_unique_id: string, callback_loaded?: (successfully: boolean, error?: any) => any) : JQuery {
        let client_handle;
        if(typeof(client.id) == "number") {
            client_handle = this.handle.connectionHandler.channelTree.findClient(client.id);
        }

        if(!client_handle && typeof(client.id) == "number") {
            client_handle = this.handle.connectionHandler.channelTree.find_client_by_dbid(client.database_id);
        }

        if(client_handle && client_handle.clientUid() !== client_unique_id) {
            client_handle = undefined;
        }

        const container = $.spawn("div").addClass("avatar");
        if(client_handle && !client_handle.properties.client_flag_avatar)
            return container.append(AvatarManager.generate_default_image());


        const clientAvatarId = client_handle ? client_handle.avatarId() : uniqueId2AvatarId(client_unique_id);
        if(clientAvatarId) {
            const avatar = this.resolveAvatar(clientAvatarId, client_handle?.properties.client_flag_avatar);


            const updateJQueryTag = () => {
                const image = $.spawn("img").attr("src", avatar.getAvatarUrl()).css({width: '100%', height: '100%'});
                container.append(image);
            };

            if(avatar.getState() !== "loading") {
                /* Test if we're may able to load the client avatar sync without a loading screen */
                updateJQueryTag();
                return container;
            }

            const image_loading = $.spawn("img").attr("src", "img/loading_image.svg").css({width: '100%', height: '100%'});

            /* lets actually load the avatar */
            avatar.awaitLoaded().then(updateJQueryTag);
            image_loading.appendTo(container);
        } else {
            AvatarManager.generate_default_image().appendTo(container);
        }

        return container;
    }

    flush_cache() {
        this.destroy();
    }
}
(window as any).flush_avatar_cache = async () => {
    server_connections.getAllConnectionHandlers().forEach(e => {
        e.fileManager.avatars.flush_cache();
    });
};

/* FIXME: unsubscribe if the other client isn't alive any anymore */
class LocalAvatarManagerFactory extends AbstractAvatarManagerFactory {
    private ipcChannel: IPCChannel;

    private subscribedAvatars: {[key: string]: { avatar: ClientAvatar, remoteAvatarId: string, unregisterCallback: () => void }[]} = {};

    constructor() {
        super();

        this.ipcChannel = ipc.getIpcInstance().createChannel(undefined, kIPCAvatarChannel);
        this.ipcChannel.messageHandler = this.handleIpcMessage.bind(this);

        server_connections.events().on("notify_handler_created", event => this.handleHandlerCreated(event.handler));
        server_connections.events().on("notify_handler_deleted", event => this.handleHandlerDestroyed(event.handler));
    }

    getManager(handlerId: string): AbstractAvatarManager {
        return server_connections.findConnection(handlerId)?.fileManager.avatars;
    }

    hasManager(handlerId: string): boolean {
        return this.getManager(handlerId) !== undefined;
    }

    private handleHandlerCreated(handler: ConnectionHandler) {
        this.ipcChannel.sendMessage("notify-handler-created", { handler: handler.handlerId });
    }

    private handleHandlerDestroyed(handler: ConnectionHandler) {
        this.ipcChannel.sendMessage("notify-handler-destroyed", { handler: handler.handlerId });
        const subscriptions = this.subscribedAvatars[handler.handlerId] || [];
        delete this.subscribedAvatars[handler.handlerId];

        subscriptions.forEach(e => e.unregisterCallback());
    }

    private handleIpcMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast)
            return;

        if(message.type === "query-handlers") {
            this.ipcChannel.sendMessage("notify-handlers", {
                handlers: server_connections.getAllConnectionHandlers().map(e => e.handlerId)
            }, remoteId);
            return;
        } else if(message.type === "load-avatar") {
            const sendResponse = properties => {
                this.ipcChannel.sendMessage("load-avatar-result", {
                    avatarId: message.data.avatarId,
                    handlerId: message.data.handlerId,
                    ...properties
                }, remoteId);
            };

            const avatarId = message.data.avatarId;
            const handlerId = message.data.handlerId;
            const manager = this.getManager(handlerId);
            if(!manager) {
                sendResponse({ success: false, message: tr("Invalid handler") });
                return;
            }

            let avatar: ClientAvatar;
            if(message.data.keyType === "client") {
                avatar = manager.resolveClientAvatar({
                    id: message.data.clientId,
                    clientUniqueId: message.data.clientUniqueId,
                    database_id: message.data.clientDatabaseId
                });
            } else {
                avatar = manager.resolveAvatar(message.data.clientAvatarId, message.data.avatarVersion);
            }

            const subscribedAvatars = this.subscribedAvatars[handlerId] || (this.subscribedAvatars[handlerId] = []);
            const oldSubscribedAvatarIndex = subscribedAvatars.findIndex(e => e.remoteAvatarId === avatarId);
            if(oldSubscribedAvatarIndex !== -1) {
                const [ subscription ] = subscribedAvatars.splice(oldSubscribedAvatarIndex, 1);
                subscription.unregisterCallback();
            }
            subscribedAvatars.push({
                avatar: avatar,
                remoteAvatarId: avatarId,
                unregisterCallback: avatar.events.registerConsumer({
                    handleEvent(mode: EventDispatchType, type: string, payload: any) {
                        this.ipcChannel.sendMessage("avatar-event", { handlerId: handlerId, avatarId: avatarId, type, payload }, remoteId);
                    }
                })
            });

            sendResponse({ success: true, state: avatar.getState(), stateData: avatar.getStateData(), hash: avatar.getAvatarHash() });
        }
    }
}

loader.register_task(Stage.LOADED, {
    name: "Avatar init",
    function: async () => {
        localAvatarCache = await ImageCache.load("avatars");
        setGlobalAvatarManagerFactory(new LocalAvatarManagerFactory());
    },
    priority: 5
});