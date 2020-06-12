import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {ClientEntry} from "tc-shared/ui/client";
import * as hex from "tc-shared/crypto/hex";
import {image_type, ImageCache, ImageType, media_image_type} from "tc-shared/file/ImageCache";
import {FileManager} from "tc-shared/file/FileManager";
import {
    FileDownloadTransfer,
    FileTransferState,
    ResponseTransferTarget, TransferProvider,
    TransferTargetType
} from "tc-shared/file/Transfer";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {tra} from "tc-shared/i18n/localize";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {icon_cache_loader} from "tc-shared/file/Icons";

export class Avatar {
    client_avatar_id: string; /* the base64 uid thing from a-m */
    avatar_id: string; /* client_flag_avatar */
    url: string;
    type: ImageType;
}

export class AvatarManager {
    handle: FileManager;

    private static cache: ImageCache;
    private _cached_avatars: {[response_avatar_id:number]:Avatar} = {};
    private _loading_promises: {[response_avatar_id:number]:Promise<any>} = {};

    constructor(handle: FileManager) {
        this.handle = handle;

        if(!AvatarManager.cache)
            AvatarManager.cache = new ImageCache("avatars");
    }

    destroy() {
        this._cached_avatars = undefined;
        this._loading_promises = undefined;
    }

    private async _response_url(response: Response, type: ImageType) : Promise<string> {
        if(!response.headers.has('X-media-bytes'))
            throw "missing media bytes";

        const media = media_image_type(type);
        const blob = await response.blob();
        if(blob.type !== "image/" + media)
            return URL.createObjectURL(blob.slice(0, blob.size, "image/" + media));
        else
            return URL.createObjectURL(blob);
    }

    async resolved_cached?(client_avatar_id: string, avatar_version?: string) : Promise<Avatar> {
        let cachedAvatar: Avatar = this._cached_avatars[avatar_version];
        if(cachedAvatar) {
            if(typeof(avatar_version) !== "string" || cachedAvatar.avatar_id == avatar_version)
                return cachedAvatar;
            delete this._cached_avatars[avatar_version];
        }

        if(!AvatarManager.cache.setupped())
            await AvatarManager.cache.setup();

        const response = await AvatarManager.cache.resolve_cached('avatar_' + client_avatar_id); //TODO age!
        if(!response)
            return undefined;

        let response_avatar_version = response.headers.has("X-avatar-version") ? response.headers.get("X-avatar-version") : undefined;
        if(typeof(avatar_version) === "string" && response_avatar_version != avatar_version)
            return undefined;

        const type = image_type(response.headers.get('X-media-bytes'));
        return this._cached_avatars[client_avatar_id] = {
            client_avatar_id: client_avatar_id,
            avatar_id: avatar_version || response_avatar_version,
            url: await this._response_url(response, type),
            type: type
        };
    }

    create_avatar_download(client_avatar_id: string) : FileDownloadTransfer {
        log.debug(LogCategory.GENERAL, "Requesting download for avatar %s", client_avatar_id);

        return this.handle.initializeFileDownload({
            path: "",
            name: "/avatar_" + client_avatar_id,
            targetSupplier: async () => await TransferProvider.provider().createResponseTarget()
        });
    }

    private async _load_avatar(client_avatar_id: string, avatar_version: string) {
        try {
            let transfer = this.create_avatar_download(client_avatar_id);

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
                if(typeof error === "object" && 'error' in error && error.error === "initialize") {
                    const commandResult = error.commandResult;
                    if(commandResult instanceof CommandResult) {
                        if(commandResult.id === ErrorID.FILE_NOT_FOUND)
                            throw tr("Avatar could not be found");
                        else if(commandResult.id === ErrorID.PERMISSION_ERROR)
                            throw tr("No permissions to download avatar");
                        else
                            throw commandResult.message + (commandResult.extra_message ? " (" + commandResult.extra_message + ")" : "");
                    }
                }

                log.error(LogCategory.CLIENT, tr("Could not request download for avatar %s: %o"), client_avatar_id, error);
                if(error === transfer.currentError())
                    throw transfer.currentErrorMessage();
                throw typeof error === "string" ? error : tr("Avatar download failed");
            }

            /* could only be tested here, because before we don't know which target we have */
            if(transfer.target.type !== TransferTargetType.RESPONSE)
                throw "unsupported transfer target";

            const response = transfer.target as ResponseTransferTarget;
            if(!response.hasResponse())
                throw tr("Transfer has no response");

            const type = image_type(response.getResponse().headers.get('X-media-bytes'));
            const media = media_image_type(type);

            await AvatarManager.cache.put_cache('avatar_' + client_avatar_id, response.getResponse().clone(), "image/" + media, {
                "X-avatar-version": avatar_version
            });
            const url = await this._response_url(response.getResponse().clone(), type);

            return this._cached_avatars[client_avatar_id] = {
                client_avatar_id: client_avatar_id,
                avatar_id: avatar_version,
                url: url,
                type: type
            };
        } finally {
            this._loading_promises[client_avatar_id] = undefined;
        }
    }

    /* loads an avatar by the avatar id and optional with the avatar version */
    load_avatar(client_avatar_id: string, avatar_version: string) : Promise<Avatar> {
        return this._loading_promises[client_avatar_id] || (this._loading_promises[client_avatar_id] = this._load_avatar(client_avatar_id, avatar_version));
    }

    generate_client_tag(client: ClientEntry) : JQuery {
        return this.generate_tag(client.avatarId(), client.properties.client_flag_avatar);
    }

    update_cache(client_avatar_id: string, avatar_id: string) {
        const _cached: Avatar = this._cached_avatars[client_avatar_id];
        if(_cached) {
            if(_cached.avatar_id === avatar_id)
                return; /* cache is up2date */

            log.info(LogCategory.GENERAL, tr("Deleting cached avatar for client %s. Cached version: %s; New version: %s"), client_avatar_id, _cached.avatar_id, avatar_id);
            delete this._cached_avatars[client_avatar_id];
            AvatarManager.cache.delete("avatar_" + client_avatar_id).catch(error => {
                log.error(LogCategory.GENERAL, tr("Failed to delete cached avatar for client %o: %o"), client_avatar_id, error);
            });
        } else {
            this.resolved_cached(client_avatar_id).then(avatar => {
                if(avatar && avatar.avatar_id !== avatar_id) {
                    /* this time we ensured that its cached */
                    this.update_cache(client_avatar_id, avatar_id);
                }
            }).catch(error => {
                log.error(LogCategory.GENERAL, tr("Failed to delete cached avatar for client %o (cache lookup failed): %o"), client_avatar_id, error);
            });
        }
    }

    generate_tag(client_avatar_id: string, avatar_id?: string, options?: {
        callback_image?: (tag: JQuery<HTMLImageElement>) => any,
        callback_avatar?: (avatar: Avatar) => any
    }) : JQuery {
        options = options || {};

        let avatar_container = $.spawn("div");
        let avatar_image = $.spawn("img").attr("alt", tr("Client avatar"));

        let cached_avatar: Avatar = this._cached_avatars[client_avatar_id];
        if(avatar_id === "") {
            avatar_container.append(this.generate_default_image());
        } else if(cached_avatar && cached_avatar.avatar_id == avatar_id) {
            avatar_image.attr("src", cached_avatar.url);
            avatar_container.append(avatar_image);
            if(options.callback_image)
                options.callback_image(avatar_image);
            if(options.callback_avatar)
                options.callback_avatar(cached_avatar);
        } else {
            let loader_image = $.spawn("img");
            loader_image.attr("src", "img/loading_image.svg").css("width", "75%");
            avatar_container.append(loader_image);

            (async () => {
                let avatar: Avatar;
                try {
                    avatar = await this.resolved_cached(client_avatar_id, avatar_id);
                } catch(error) {
                    log.error(LogCategory.CLIENT, error);
                }

                if(!avatar)
                    avatar = await this.load_avatar(client_avatar_id, avatar_id);

                if(!avatar)
                    throw "failed to load avatar";

                if(options.callback_avatar)
                    options.callback_avatar(avatar);

                avatar_image.attr("src", avatar.url);
                avatar_image.css("opacity", 0);
                avatar_container.append(avatar_image);
                loader_image.animate({opacity: 0}, 50, () => {
                    loader_image.remove();
                    avatar_image.animate({opacity: 1}, 150, () => {
                        if(options.callback_image)
                            options.callback_image(avatar_image);
                    });
                });
            })().catch(reason => {
                log.error(LogCategory.CLIENT, tr("Could not load avatar for id %s. Reason: %s"), client_avatar_id, reason);
                //TODO Broken image
                loader_image.addClass("icon client-warning").attr("tag", tr("Could not load avatar ") + client_avatar_id);
            })
        }

        return avatar_container;
    }

    unique_id_2_avatar_id(unique_id: string) {
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

    private generate_default_image() : JQuery {
        return $.spawn("img").attr("src", "img/style/avatar.png").css({width: '100%', height: '100%'});
    }

    generate_chat_tag(client: { id?: number; database_id?: number; }, client_unique_id: string, callback_loaded?: (successfully: boolean, error?: any) => any) : JQuery {
        let client_handle;
        if(typeof(client.id) == "number")
            client_handle = this.handle.connectionHandler.channelTree.findClient(client.id);
        if(!client_handle && typeof(client.id) == "number") {
            client_handle = this.handle.connectionHandler.channelTree.find_client_by_dbid(client.database_id);
        }

        if(client_handle && client_handle.clientUid() !== client_unique_id)
            client_handle = undefined;

        const container = $.spawn("div").addClass("avatar");
        if(client_handle && !client_handle.properties.client_flag_avatar)
            return container.append(this.generate_default_image());


        const avatar_id = client_handle ? client_handle.avatarId() : this.unique_id_2_avatar_id(client_unique_id);
        if(avatar_id) {
            if(this._cached_avatars[avatar_id]) { /* Test if we're may able to load the client avatar sync without a loading screen */
                const cache: Avatar = this._cached_avatars[avatar_id];
                log.debug(LogCategory.GENERAL, tr("Using cached avatar. ID: %o | Version: %o (Cached: %o)"), avatar_id, client_handle ? client_handle.properties.client_flag_avatar : undefined, cache.avatar_id);
                if(!client_handle || client_handle.properties.client_flag_avatar == cache.avatar_id) {
                    const image = $.spawn("img").attr("src", cache.url).css({width: '100%', height: '100%'});
                    return container.append(image);
                }
            }

            const image_loading = $.spawn("img").attr("src", "img/loading_image.svg").css({width: '100%', height: '100%'});

            /* lets actually load the avatar */
            (async () => {
                let avatar: Avatar;
                let loaded_image = this.generate_default_image();

                log.debug(LogCategory.GENERAL, tr("Resolving avatar. ID: %o | Version: %o"), avatar_id, client_handle ? client_handle.properties.client_flag_avatar : undefined);
                try {
                    //TODO: Cache if avatar load failed and try again in some minutes/may just even consider using the default avatar 'till restart
                    try {
                        avatar = await this.resolved_cached(avatar_id, client_handle ? client_handle.properties.client_flag_avatar : undefined);
                    } catch(error) {
                        log.error(LogCategory.GENERAL, tr("Failed to use cached avatar: %o"), error);
                    }

                    if(!avatar)
                        avatar = await this.load_avatar(avatar_id, client_handle ? client_handle.properties.client_flag_avatar : undefined);

                    if(!avatar)
                        throw "no avatar present!";

                    loaded_image = $.spawn("img").attr("src", avatar.url).css({width: '100%', height: '100%'});
                } catch(error) {
                    throw error;
                } finally {
                    container.children().remove();
                    container.append(loaded_image);
                }
            })().then(() => callback_loaded && callback_loaded(true)).catch(error => {
                log.warn(LogCategory.CLIENT, tr("Failed to load chat avatar for client %s. Error: %o"), client_unique_id, error);
                callback_loaded && callback_loaded(false, error);
            });

            image_loading.appendTo(container);
        } else {
            this.generate_default_image().appendTo(container);
        }

        return container;
    }

    flush_cache() {
        this._cached_avatars = undefined;
        this._loading_promises = undefined;
    }
}
(window as any).flush_avatar_cache = async () => {
    server_connections.all_connections().forEach(e => {
        e.fileManager.avatars.flush_cache();
    });
};