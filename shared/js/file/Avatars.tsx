import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as hex from "tc-shared/crypto/hex";
import {image_type, ImageCache, media_image_type} from "tc-shared/file/ImageCache";
import {FileManager} from "tc-shared/file/FileManager";
import {
    FileDownloadTransfer,
    FileTransferState,
    ResponseTransferTarget,
    TransferProvider,
    TransferTargetType
} from "tc-shared/file/Transfer";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {Registry} from "tc-shared/events";
import {ClientEntry} from "tc-shared/ui/client";

/* FIXME: Retry avatar download after some time! */

const DefaultAvatarImage = "img/style/avatar.png";

export type AvatarState = "unset" | "loading" | "errored" | "loaded";

interface AvatarEvents {
    avatar_changed: {},
    avatar_state_changed: { oldState: AvatarState, newState: AvatarState }
}

export class ClientAvatar {
    readonly events: Registry<AvatarEvents>;
    readonly clientAvatarId: string; /* the base64 unique id thing from a-m */

    currentAvatarHash: string | "unknown"; /* the client avatars flag */
    state: AvatarState = "loading";

    /* only set when state is unset, loaded or errored */
    avatarUrl?: string;
    loadError?: string;

    loadingTimestamp: number = 0;

    constructor(client_avatar_id: string) {
        this.clientAvatarId = client_avatar_id;
        this.events = new Registry<AvatarEvents>();
    }

    setState(state: AvatarState) {
        if(state === this.state)
            return;

        const oldState = this.state;
        this.state = state;
        this.events.fire("avatar_state_changed", { newState: state, oldState: oldState });
    }

    async awaitLoaded() {
        if(this.state !== "loading")
            return;

        await new Promise(resolve => this.events.on("avatar_state_changed", event => event.newState !== "loading" && resolve()));
    }

    destroyUrl() {
        URL.revokeObjectURL(this.avatarUrl);
        this.avatarUrl = DefaultAvatarImage;
    }
}

export class AvatarManager {
    handle: FileManager;

    private static cache: ImageCache;


    private cachedAvatars: {[avatarId: string]: ClientAvatar} = {};
    constructor(handle: FileManager) {
        this.handle = handle;

        if(!AvatarManager.cache)
            AvatarManager.cache = new ImageCache("avatars");
    }

    destroy() {
        Object.values(this.cachedAvatars).forEach(e => e.destroyUrl());
        this.cachedAvatars = {};
    }

    create_avatar_download(client_avatar_id: string) : FileDownloadTransfer {
        log.debug(LogCategory.GENERAL, "Requesting download for avatar %s", client_avatar_id);

        return this.handle.initializeFileDownload({
            path: "",
            name: "/avatar_" + client_avatar_id,
            targetSupplier: async () => await TransferProvider.provider().createResponseTarget()
        });
    }

    private async executeAvatarLoad0(avatar: ClientAvatar) {
        if(avatar.currentAvatarHash === "") {
            avatar.destroyUrl();
            avatar.setState("unset");
            return;
        }

        const initialAvatarHash = avatar.currentAvatarHash;
        let avatarResponse: Response;

        /* try to lookup our cache for the avatar */
        cache_lookup: {
            if(!AvatarManager.cache.setupped()) {
                await AvatarManager.cache.setup();
            }

            const response = await AvatarManager.cache.resolve_cached('avatar_' + avatar.clientAvatarId); //TODO age!
            if(!response) {
                break cache_lookup;
            }

            let cachedAvatarHash = response.headers.has("X-avatar-version") ? response.headers.get("X-avatar-version") : undefined;
            if(avatar.currentAvatarHash !== "unknown") {
                if(cachedAvatarHash === undefined) {
                    log.debug(LogCategory.FILE_TRANSFER, tr("Invalidating cached avatar for %s (Version miss match. Cached: unset, Current: %s)"), avatar.clientAvatarId, avatar.currentAvatarHash);
                    await AvatarManager.cache.delete('avatar_' + avatar.clientAvatarId);
                    break cache_lookup;
                } else if(cachedAvatarHash !== avatar.currentAvatarHash) {
                    log.debug(LogCategory.FILE_TRANSFER, tr("Invalidating cached avatar for %s (Version miss match. Cached: %s, Current: %s)"), avatar.clientAvatarId, cachedAvatarHash, avatar.currentAvatarHash);
                    await AvatarManager.cache.delete('avatar_' + avatar.clientAvatarId);
                    break cache_lookup;
                }
            } else if(cachedAvatarHash) {
                avatar.currentAvatarHash = cachedAvatarHash;
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
                        if(commandResult.id === ErrorID.FILE_NOT_FOUND) {
                            if(avatar.currentAvatarHash !== initialAvatarHash)
                                return;

                            avatar.destroyUrl();
                            avatar.setState("unset");
                            return;
                        } else if(commandResult.id === ErrorID.PERMISSION_ERROR) {
                            throw tr("No permissions to download the avatar");
                        } else {
                            throw commandResult.message + (commandResult.extra_message ? " (" + commandResult.extra_message + ")" : "");
                        }
                    }
                }

                log.error(LogCategory.CLIENT, tr("Could not request download for avatar %s: %o"), avatar.clientAvatarId, error);
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

            const type = image_type(headers.get('X-media-bytes'));
            const media = media_image_type(type);

            if(avatar.currentAvatarHash !== initialAvatarHash)
                return;

            await AvatarManager.cache.put_cache('avatar_' + avatar.clientAvatarId, transferResponse.getResponse().clone(), "image/" + media, {
                "X-avatar-version": avatar.currentAvatarHash
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

            const type = image_type(avatarResponse.headers.get('X-media-bytes'));
            const media = media_image_type(type);

            const blob = await avatarResponse.blob();

            /* ensure we're still up to date */
            if(avatar.currentAvatarHash !== initialAvatarHash)
                return;

            avatar.destroyUrl();
            if(blob.type !== "image/" + media) {
                avatar.avatarUrl = URL.createObjectURL(blob.slice(0, blob.size, "image/" + media));
            } else {
                avatar.avatarUrl = URL.createObjectURL(blob);
            }

            avatar.setState("loaded");
        }
    }

    private executeAvatarLoad(avatar: ClientAvatar) {
        const avatar_hash = avatar.currentAvatarHash;

        avatar.setState("loading");
        avatar.loadingTimestamp = Date.now();
        this.executeAvatarLoad0(avatar).catch(error => {
            if(avatar.currentAvatarHash !== avatar_hash)
                return;

            if(typeof error === "string") {
                avatar.loadError = error;
            } else if(error instanceof Error) {
                avatar.loadError = error.message;
            } else {
                log.error(LogCategory.FILE_TRANSFER, tr("Failed to load avatar %s (hash: %s): %o"), avatar.clientAvatarId, avatar_hash, error);
                avatar.loadError = tr("lookup the console");
            }

            avatar.destroyUrl(); /* if there were any image previously */
            avatar.setState("errored");
        });
    }

    update_cache(clientAvatarId: string, clientAvatarHash: string) {
        AvatarManager.cache.setup().then(async () => {
            const cached = this.cachedAvatars[clientAvatarId];
            if(cached) {
                if(cached.currentAvatarHash === clientAvatarHash)
                    return;

                log.info(LogCategory.GENERAL, tr("Deleting cached avatar for client %s. Cached version: %s; New version: %s"), cached.currentAvatarHash, clientAvatarHash);
            }

            const response = await AvatarManager.cache.resolve_cached('avatar_' + clientAvatarId);
            if(response) {
                let cachedAvatarHash = response.headers.has("X-avatar-version") ? response.headers.get("X-avatar-version") : undefined;
                if(cachedAvatarHash !== clientAvatarHash) {
                    await AvatarManager.cache.delete("avatar_" + clientAvatarId).catch(error => {
                        log.warn(LogCategory.FILE_TRANSFER, tr("Failed to delete avatar %s: %o"), clientAvatarId, error);
                    });
                }
            }

            if(cached) {
                cached.currentAvatarHash = clientAvatarHash;
                cached.events.fire("avatar_changed");
                this.executeAvatarLoad(cached);
            }
        });
    }

    resolveAvatar(clientAvatarId: string, avatarHash?: string, cacheOnly?: boolean) {
        let avatar = this.cachedAvatars[clientAvatarId];
        if(!avatar) {
            if(cacheOnly)
                return undefined;

            avatar = new ClientAvatar(clientAvatarId);
            this.cachedAvatars[clientAvatarId] = avatar;
        } else if(typeof avatarHash !== "string" || avatar.currentAvatarHash === avatarHash) {
            return avatar;
        }

        avatar.currentAvatarHash = typeof avatarHash === "string" ? avatarHash : "unknown";
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

    private generate_default_image() : JQuery {
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
            return container.append(this.generate_default_image());


        const clientAvatarId = client_handle ? client_handle.avatarId() : uniqueId2AvatarId(client_unique_id);
        if(clientAvatarId) {
            const avatar = this.resolveAvatar(clientAvatarId, client_handle?.properties.client_flag_avatar);


            const updateJQueryTag = () => {
                const image = $.spawn("img").attr("src", avatar.avatarUrl).css({width: '100%', height: '100%'});
                container.append(image);
            };

            if(avatar.state !== "loading") {
                /* Test if we're may able to load the client avatar sync without a loading screen */
                updateJQueryTag();
                return container;
            }

            const image_loading = $.spawn("img").attr("src", "img/loading_image.svg").css({width: '100%', height: '100%'});

            /* lets actually load the avatar */
            avatar.awaitLoaded().then(updateJQueryTag);
            image_loading.appendTo(container);
        } else {
            this.generate_default_image().appendTo(container);
        }

        return container;
    }

    flush_cache() {
        this.destroy();
    }
}
(window as any).flush_avatar_cache = async () => {
    server_connections.all_connections().forEach(e => {
        e.fileManager.avatars.flush_cache();
    });
};

export function uniqueId2AvatarId(unique_id: string) {
    function str2ab(str) {
        let buf = new ArrayBuffer(str.length); // 2 bytes for each char
        let bufView = new Uint8Array(buf);
        for (let i=0, strLen = str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    try {
        let raw = atob(unique_id);
        let input = hex.encode(str2ab(raw));

        let result: string = "";
        for(let index = 0; index < input.length; index++) {
            let c = input.charAt(index);
            let offset: number = 0;
            if(c >= '0' && c <= '9')
                offset = c.charCodeAt(0) - '0'.charCodeAt(0);
            else if(c >= 'A' && c <= 'F')
                offset = c.charCodeAt(0) - 'A'.charCodeAt(0) + 0x0A;
            else if(c >= 'a' && c <= 'f')
                offset = c.charCodeAt(0) - 'a'.charCodeAt(0) + 0x0A;
            result += String.fromCharCode('a'.charCodeAt(0) + offset);
        }
        return result;
    } catch (e) { //invalid base 64 (like music bot etc)
        return undefined;
    }
}