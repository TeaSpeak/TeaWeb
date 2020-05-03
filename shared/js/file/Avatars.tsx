import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {ClientEntry} from "tc-shared/ui/client";
import * as hex from "tc-shared/crypto/hex";
import {
    DownloadKey,
    FileManager, transfer_provider
} from "tc-shared/file/FileManager";
import {image_type, ImageCache, ImageType, media_image_type} from "tc-shared/file/ImageCache";

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
        let avatar: Avatar = this._cached_avatars[avatar_version];
        if(avatar) {
            if(typeof(avatar_version) !== "string" || avatar.avatar_id == avatar_version)
                return avatar;
            avatar = undefined;
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

    create_avatar_download(client_avatar_id: string) : Promise<DownloadKey> {
        log.debug(LogCategory.GENERAL, "Requesting download for avatar %s", client_avatar_id);
        return this.handle.download_file("", "/avatar_" + client_avatar_id);
    }

    private async _load_avatar(client_avatar_id: string, avatar_version: string) {
        try {
            let download_key: DownloadKey;
            try {
                download_key = await this.create_avatar_download(client_avatar_id);
            } catch(error) {
                log.error(LogCategory.GENERAL, tr("Could not request download for avatar %s: %o"), client_avatar_id, error);
                throw "failed to request avatar download";
            }

            const downloader = transfer_provider().spawn_download_transfer(download_key);
            let response: Response;
            try {
                response = await downloader.request_file();
            } catch(error) {
                log.error(LogCategory.GENERAL, tr("Could not download avatar %s: %o"), client_avatar_id, error);
                throw "failed to download avatar";
            }

            const type = image_type(response.headers.get('X-media-bytes'));
            const media = media_image_type(type);

            await AvatarManager.cache.put_cache('avatar_' + client_avatar_id, response.clone(), "image/" + media, {
                "X-avatar-version": avatar_version
            });
            const url = await this._response_url(response.clone(), type);

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
            client_handle = this.handle.handle.channelTree.findClient(client.id);
        if(!client_handle && typeof(client.id) == "number") {
            client_handle = this.handle.handle.channelTree.find_client_by_dbid(client.database_id);
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
}