/// <reference path="connection/CommandHandler.ts" />
/// <reference path="connection/ConnectionBase.ts" />

class FileEntry {
    name: string;
    datetime: number;
    type: number;
    size: number;
}

class FileListRequest {
    path: string;
    entries: FileEntry[];

    callback: (entries: FileEntry[]) => void;
}

namespace transfer {
    export interface TransferKey {
        client_transfer_id: number;
        server_transfer_id: number;

        key: string;

        file_path: string;
        file_name: string;

        peer: {
            hosts: string[],
            port: number;
        };

        total_size: number;
    }

    export interface UploadOptions {
        name: string;
        path: string;

        channel?: ChannelEntry;
        channel_password?: string;

        size: number;
        overwrite: boolean;
    }

    export interface DownloadTransfer {
        get_key() : DownloadKey;

        request_file() : Promise<Response>;
    }
    
    export interface UploadTransfer {
        get_key(): UploadKey;

        put_data(data: BlobPart | File) : Promise<void>;
    }

    export type DownloadKey = TransferKey;
    export type UploadKey = TransferKey;

    export function spawn_download_transfer(key: DownloadKey) : DownloadTransfer {
        return new RequestFileDownload(key);
    }
    export function spawn_upload_transfer(key: UploadKey) : UploadTransfer {
        return new RequestFileUpload(key);
    }
}

class RequestFileDownload implements transfer.DownloadTransfer {
    readonly transfer_key: transfer.DownloadKey;

    constructor(key: transfer.DownloadKey) {
        this.transfer_key = key;
    }

    async request_file() : Promise<Response> {
        return await this.try_fetch("https://" + this.transfer_key.peer.hosts[0] + ":" + this.transfer_key.peer.port);
    }

    private async try_fetch(url: string) : Promise<Response> {
        const response = await fetch(url, {
            method: 'GET',
            cache: "no-cache",
            mode: 'cors',
            headers: {
                'transfer-key': this.transfer_key.key,
                'download-name': this.transfer_key.file_name,
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Expose-Headers': '*'
            }
        });
        if(!response.ok) {
            debugger;
            throw (response.type == 'opaque' || response.type == 'opaqueredirect' ? "invalid cross origin flag! May target isn't a TeaSpeak server?" : response.statusText || "response is not ok");
        }
        return response;
    }

    get_key(): transfer.DownloadKey {
        return this.transfer_key;
    }
}

class RequestFileUpload implements transfer.UploadTransfer {
    readonly transfer_key: transfer.UploadKey;
    constructor(key: transfer.DownloadKey) {
        this.transfer_key = key;
    }

    get_key(): transfer.UploadKey {
        return this.transfer_key;
    }

    async put_data(data: BlobPart | File) : Promise<void> {
        const form_data = new FormData();

        if(data instanceof File) {
            if(data.size != this.transfer_key.total_size)
                throw "invalid size";

            form_data.append("file", data);
        } else if(typeof(data) === "string") {
            if(data.length != this.transfer_key.total_size)
                throw "invalid size";
            form_data.append("file", new Blob([data], { type: "application/octet-stream" }));
        } else {
            const buffer = <BufferSource>data;
            if(buffer.byteLength != this.transfer_key.total_size)
                throw "invalid size";

            form_data.append("file", new Blob([buffer], { type: "application/octet-stream" }));
        }

        await this.try_put(form_data, "https://" + this.transfer_key.peer.hosts[0] + ":" + this.transfer_key.peer.port);
    }

    private async try_put(data: FormData, url: string) : Promise<void> {
        const response = await fetch(url, {
            method: 'POST',
            cache: "no-cache",
            mode: 'cors',
            body: data,
            headers: {
                'transfer-key': this.transfer_key.key,
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Expose-Headers': '*'
            }
        });
        if(!response.ok)
            throw (response.type == 'opaque' || response.type == 'opaqueredirect' ? "invalid cross origin flag! May target isn't a TeaSpeak server?" : response.statusText || "response is not ok");
    }
}

class FileManager extends connection.AbstractCommandHandler {
    handle: ConnectionHandler;
    icons: IconManager;
    avatars: AvatarManager;

    private listRequests: FileListRequest[] = [];
    private pending_download_requests: transfer.DownloadKey[] = [];
    private pending_upload_requests: transfer.UploadKey[] = [];

    private transfer_counter : number = 1;

    constructor(client: ConnectionHandler) {
        super(client.serverConnection);

        this.handle = client;
        this.icons = new IconManager(this);
        this.avatars = new AvatarManager(this);

        this.connection.command_handler_boss().register_handler(this);
    }

    destroy() {
        if(this.connection) {
            const hboss = this.connection.command_handler_boss();
            if(hboss)
                hboss.unregister_handler(this);
        }

        this.listRequests = undefined;
        this.pending_download_requests = undefined;
        this.pending_upload_requests = undefined;

        this.icons && this.icons.destroy();
        this.icons = undefined;

        this.avatars && this.avatars.destroy();
        this.avatars = undefined;
    }

    handle_command(command: connection.ServerCommand): boolean {
        switch (command.command) {
            case "notifyfilelist":
                this.notifyFileList(command.arguments);
                return true;
            case "notifyfilelistfinished":
                this.notifyFileListFinished(command.arguments);
                return true;
            case "notifystartdownload":
                this.notifyStartDownload(command.arguments);
                return true;
            case "notifystartupload":
                this.notifyStartUpload(command.arguments);
                return true;
        }
        return false;
    }


    /******************************** File list ********************************/
    //TODO multiple requests (same path)
    requestFileList(path: string, channel?: ChannelEntry, password?: string) : Promise<FileEntry[]> {
        const _this = this;
        return new Promise((accept, reject) => {
            let req = new FileListRequest();
            req.path = path;
            req.entries = [];
            req.callback = accept;
            _this.listRequests.push(req);

            _this.handle.serverConnection.send_command("ftgetfilelist", {"path": path, "cid": (channel ? channel.channelId : "0"), "cpw": (password ? password : "")}).then(() => {}).catch(reason => {
                _this.listRequests.remove(req);
                if(reason instanceof CommandResult) {
                    if(reason.id == 0x0501) {
                        accept([]); //Empty result
                        return;
                    }
                }
                reject(reason);
            });
        });
    }

    private notifyFileList(json) {
        let entry : FileListRequest = undefined;

        for(let e of this.listRequests) {
            if(e.path == json[0]["path"]){
                entry = e;
                break;
            }
        }

        if(!entry) {
            log.error(LogCategory.CLIENT, tr("Invalid file list entry. Path: %s"), json[0]["path"]);
            return;
        }
        for(let e of (json as Array<FileEntry>)) {
            e.datetime = parseInt(e.datetime + "");
            e.size = parseInt(e.size + "");
            e.type = parseInt(e.type + "");
            entry.entries.push(e);
        }
    }

    private notifyFileListFinished(json) {
        let entry : FileListRequest = undefined;

        for(let e of this.listRequests) {
            if(e.path == json[0]["path"]){
                entry = e;
                this.listRequests.remove(e);
                break;
            }
        }

        if(!entry) {
            log.error(LogCategory.CLIENT, tr("Invalid file list entry finish. Path: "), json[0]["path"]);
            return;
        }
        entry.callback(entry.entries);
    }


    /******************************** File download/upload ********************************/
    download_file(path: string, file: string, channel?: ChannelEntry, password?: string) : Promise<transfer.DownloadKey> {
        const transfer_data: transfer.DownloadKey = {
            file_name: file,
            file_path: path,
            client_transfer_id: this.transfer_counter++
        } as any;

        this.pending_download_requests.push(transfer_data);
        return new Promise<transfer.DownloadKey>((resolve, reject) => {
            transfer_data["_callback"] = resolve;
            this.handle.serverConnection.send_command("ftinitdownload", {
                "path": path,
                "name": file,
                "cid": (channel ? channel.channelId : "0"),
                "cpw": (password ? password : ""),
                "clientftfid": transfer_data.client_transfer_id,
                "seekpos": 0,
                "proto": 1
            }, {process_result: false}).catch(reason => {
                this.pending_download_requests.remove(transfer_data);
                reject(reason);
            })
        });
    }

    upload_file(options: transfer.UploadOptions) : Promise<transfer.UploadKey> {
        const transfer_data: transfer.UploadKey = {
            file_path: options.path,
            file_name: options.name,
            client_transfer_id: this.transfer_counter++,
            total_size: options.size
        } as any;

        this.pending_upload_requests.push(transfer_data);
        return new Promise<transfer.UploadKey>((resolve, reject) => {
            transfer_data["_callback"] = resolve;
            this.handle.serverConnection.send_command("ftinitupload", {
                "path": options.path,
                "name": options.name,
                "cid": (options.channel ? options.channel.channelId : "0"),
                "cpw": options.channel_password || "",
                "clientftfid": transfer_data.client_transfer_id,
                "size": options.size,
                "overwrite": options.overwrite,
                "resume": false,
                "proto": 1
            }).catch(reason => {
                this.pending_upload_requests.remove(transfer_data);
                reject(reason);
            })
        });
    }

    private notifyStartDownload(json) {
        json = json[0];

        let clientftfid = parseInt(json["clientftfid"]);
        let transfer: transfer.DownloadKey;
        for(let e of this.pending_download_requests)
            if(e.client_transfer_id == clientftfid) {
                transfer = e;
                break;
            }

        transfer.server_transfer_id = parseInt(json["serverftfid"]);
        transfer.key = json["ftkey"];
        transfer.total_size = json["size"];

        transfer.peer = {
            hosts: (json["ip"] || "").split(","),
            port: parseInt(json["port"])
        };

        if(transfer.peer.hosts.length == 0)
            transfer.peer.hosts.push("0.0.0.0");

        if(transfer.peer.hosts[0].length == 0 || transfer.peer.hosts[0] == '0.0.0.0')
            transfer.peer.hosts[0] = this.handle.serverConnection.remote_address().host;

        (transfer["_callback"] as (val: transfer.DownloadKey) => void)(transfer);
        this.pending_download_requests.remove(transfer);
    }

    private notifyStartUpload(json) {
        json = json[0];

        let transfer: transfer.UploadKey;
        let clientftfid = parseInt(json["clientftfid"]);
        for(let e of this.pending_upload_requests)
            if(e.client_transfer_id == clientftfid) {
                transfer = e;
                break;
            }

        transfer.server_transfer_id = parseInt(json["serverftfid"]);
        transfer.key = json["ftkey"];

        transfer.peer = {
            hosts: (json["ip"] || "").split(","),
            port: parseInt(json["port"])
        };

        if(transfer.peer.hosts.length == 0)
            transfer.peer.hosts.push("0.0.0.0");

        if(transfer.peer.hosts[0].length == 0 || transfer.peer.hosts[0] == '0.0.0.0')
            transfer.peer.hosts[0] = this.handle.serverConnection.remote_address().host;

        (transfer["_callback"] as (val: transfer.UploadKey) => void)(transfer);
        this.pending_upload_requests.remove(transfer);
    }

    /** File management **/
    async delete_file(props: {
        name: string,
        path?: string;
        cid?: number;
        cpw?: string;
    }) : Promise<void> {
        if(!props.name)
            throw "invalid name!";

        try {
            await this.handle.serverConnection.send_command("ftdeletefile", {
                cid: props.cid || 0,
                cpw: props.cpw,
                path: props.path || "",
                name: props.name
            })
        } catch(error) {
            throw error;
        }
    }
}

class Icon {
    id: number;
    url: string;
}

enum ImageType {
    UNKNOWN,
    BITMAP,
    PNG,
    GIF,
    SVG,
    JPEG
}

function media_image_type(type: ImageType, file?: boolean) {
    switch (type) {
        case ImageType.BITMAP:
            return "bmp";
        case ImageType.GIF:
            return "gif";
        case ImageType.SVG:
            return file ? "svg" : "svg+xml";
        case ImageType.JPEG:
            return "jpeg";
        case ImageType.UNKNOWN:
        case ImageType.PNG:
        default:
            return "png";
    }
}

function image_type(encoded_data: string | ArrayBuffer, base64_encoded?: boolean) {
    const ab2str10 = () => {
        const buf = new Uint8Array(encoded_data as ArrayBuffer);
        if(buf.byteLength < 10)
            return "";

        let result = "";
        for(let index = 0; index < 10; index++)
            result += String.fromCharCode(buf[index]);
        return result;
    };

    const bin = typeof(encoded_data) === "string" ? ((typeof(base64_encoded) === "undefined" || base64_encoded) ? atob(encoded_data) : encoded_data) : ab2str10();
    if(bin.length < 10) return ImageType.UNKNOWN;

    if(bin[0] == String.fromCharCode(66) && bin[1] == String.fromCharCode(77)) {
        return ImageType.BITMAP;
    } else if(bin.substr(0, 8) == "\x89\x50\x4e\x47\x0d\x0a\x1a\x0a") {
        return ImageType.PNG;
    } else if(bin.substr(0, 4) == "\x47\x49\x46\x38" && (bin[4] == '\x37' || bin[4] == '\x39') && bin[5] == '\x61') {
        return ImageType.GIF;
    } else if(bin[0] == '\x3c') {
        return ImageType.SVG;
    } else if(bin[0] == '\xFF' && bin[1] == '\xd8') {
        return ImageType.JPEG;
    }

    return ImageType.UNKNOWN;
}

class CacheManager {
    readonly cache_name: string;

    private _cache_category: Cache;

    constructor(name: string) {
        this.cache_name = name;
    }

    setupped() : boolean { return !!this._cache_category; }

    async reset() {
        if(!window.caches)
            return;

        try {
            await caches.delete(this.cache_name);
        } catch(error) {
            throw "Failed to delete cache: " + error;
        }
        try {
            await this.setup();
        } catch(error) {
            throw "Failed to reinitialize cache!";
        }
    }

    async setup() {
        if(!window.caches)
            throw "Missing caches!";

        this._cache_category = await caches.open(this.cache_name);
    }

    async cleanup(max_age: number) {
        /* FIXME: TODO */
    }

    async resolve_cached(key: string, max_age?: number) : Promise<Response | undefined> {
        max_age = typeof(max_age) === "number" ? max_age : -1;

        const cached_response = await this._cache_category.match("https://_local_cache/cache_request_" + key);
        if(!cached_response)
            return undefined;

        /* FIXME: Max age */
        return cached_response;
    }

    async put_cache(key: string, value: Response, type?: string, headers?: {[key: string]:string}) {
        const new_headers = new Headers();
        for(const key of value.headers.keys())
            new_headers.set(key, value.headers.get(key));
        if(type)
            new_headers.set("Content-type", type);
        for(const key of Object.keys(headers || {}))
            new_headers.set(key, headers[key]);

        await this._cache_category.put("https://_local_cache/cache_request_" + key, new Response(value.body, {
            headers: new_headers
        }));
    }

    async delete(key: string) {
        const flag = await this._cache_category.delete("https://_local_cache/cache_request_" + key, {
            ignoreVary: true,
            ignoreMethod: true,
            ignoreSearch: true
        });
        if(!flag) {
            console.warn(tr("Failed to delete key %s from cache!"), flag);
        }
    }
}

class IconManager {
    private static cache: CacheManager = new CacheManager("icons");

    handle: FileManager;
    private _id_urls: {[id:number]:string} = {};
    private _loading_promises: {[id:number]:Promise<Icon>} = {};

    constructor(handle: FileManager) {
        this.handle = handle;
    }

    destroy() {
        if(URL.revokeObjectURL) {
            for(const id of Object.keys(this._id_urls))
                URL.revokeObjectURL(this._id_urls[id]);
        }
        this._id_urls = undefined;
        this._loading_promises = undefined;
    }

    async clear_cache() {
        await IconManager.cache.reset();
        if(URL.revokeObjectURL) {
            for(const id of Object.keys(this._id_urls))
                URL.revokeObjectURL(this._id_urls[id]);
        }
        this._id_urls = {};
        this._loading_promises = {};
    }

    async delete_icon(id: number) : Promise<void> {
        if(id <= 1000)
            throw "invalid id!";

        await this.handle.delete_file({
            name: '/icon_' + id
        });
    }

    iconList() : Promise<FileEntry[]> {
        return this.handle.requestFileList("/icons");
    }

    create_icon_download(id: number) : Promise<transfer.DownloadKey> {
        return this.handle.download_file("", "/icon_" + id);
    }

    private static async _response_url(response: Response) {
        if(!response.headers.has('X-media-bytes'))
            throw "missing media bytes";

        const type = image_type(response.headers.get('X-media-bytes'));
        const media = media_image_type(type);

        const blob = await response.blob();
        if(blob.type !== "image/" + media)
            return URL.createObjectURL(blob.slice(0, blob.size, "image/" + media));
        else
            return URL.createObjectURL(blob)
    }

    async resolved_cached?(id: number) : Promise<Icon> {
        if(this._id_urls[id])
            return {
                id: id,
                url: this._id_urls[id]
            };

        if(!IconManager.cache.setupped())
            await IconManager.cache.setup();

        const response = await IconManager.cache.resolve_cached('icon_' + id); //TODO age!
        if(response) {
            const url = await IconManager._response_url(response);
            if(this._id_urls[id])
                URL.revokeObjectURL(this._id_urls[id]);
            return {
                id: id,
                url: url
            };
        }
        return undefined;
    }

    private static _static_id_url: {[icon: number]:string} = {};
    private static _static_cached_promise: {[icon: number]:Promise<Icon>} = {};
    static load_cached_icon(id: number, ignore_age?: boolean) : Promise<Icon> | Icon {
        if(this._static_id_url[id]) {
            return {
                id: id,
                url: this._static_id_url[id]
            };
        }

        if(this._static_cached_promise[id])
            return this._static_cached_promise[id];

        return (this._static_cached_promise[id] = (async () => {
            if(!this.cache.setupped())
                await this.cache.setup();

            const response = await this.cache.resolve_cached('icon_' + id); //TODO age!
            if(response) {
                const url = await this._response_url(response);
                if(this._static_id_url[id])
                    URL.revokeObjectURL(this._static_id_url[id]);
                this._static_id_url[id] = url;

                return {
                    id: id,
                    url: url
                };
            }
        })());
    }

    private async _load_icon(id: number) : Promise<Icon> {
        try {
            let download_key: transfer.DownloadKey;
            try {
                download_key = await this.create_icon_download(id);
            } catch(error) {
                log.error(LogCategory.CLIENT, tr("Could not request download for icon %d: %o"), id, error);
                throw "Failed to request icon";
            }

            const downloader = transfer.spawn_download_transfer(download_key);
            let response: Response;
            try {
                response = await downloader.request_file();
            } catch(error) {
                log.error(LogCategory.CLIENT, tr("Could not download icon %d: %o"), id, error);
                throw "failed to download icon";
            }

            const type = image_type(response.headers.get('X-media-bytes'));
            const media = media_image_type(type);

            await IconManager.cache.put_cache('icon_' + id, response.clone(), "image/" + media);
            const url = await IconManager._response_url(response.clone());
            if(this._id_urls[id])
                URL.revokeObjectURL(this._id_urls[id]);
            this._id_urls[id] = url;

            this._loading_promises[id] = undefined;
            return {
                id: id,
                url: url
            };
        } catch(error) {
            setTimeout(() => {
                this._loading_promises[id] = undefined;
            }, 1000 * 60); /* try again in 60 seconds */
            throw error;
        }
    }

    download_icon(id: number) : Promise<Icon> {
        return this._loading_promises[id] || (this._loading_promises[id] = this._load_icon(id));
    }

    async resolve_icon(id: number) : Promise<Icon> {
        id = id >>> 0;
        try {
            const result = await this.resolved_cached(id);
            if(result)
                return result;
            throw "";
        } catch(error) { }

        try {
            const result =  await this.download_icon(id);
            if(result)
                return result;
            throw "load result is empty";
        } catch(error) {
            log.error(LogCategory.CLIENT, tr("Icon download failed of icon %d: %o"), id, error);
        }

        throw "icon not found";
    }

    static generate_tag(icon: Promise<Icon> | Icon | undefined, options?: {
        animate?: boolean
    }) : JQuery<HTMLDivElement> {
        options = options || {};

        let icon_container = $.spawn("div").addClass("icon-container icon_empty");
        let icon_load_image = $.spawn("div").addClass("icon_loading");

        const icon_image = $.spawn("img").attr("width", 16).attr("height", 16).attr("alt", "");
        const _apply = (icon) => {
            let id = icon ? (icon.id >>> 0) : 0;
            if (!icon || id == 0) {
                icon_load_image.remove();
                icon_load_image = undefined;
                return;
            } else if (id < 1000) {
                icon_load_image.remove();
                icon_load_image = undefined;

                icon_container.removeClass("icon_empty").addClass("icon_em client-group_" + id);
                return;
            }

            icon_image.attr("src", icon.url);
            icon_container.append(icon_image).removeClass("icon_empty");

            if (typeof (options.animate) !== "boolean" || options.animate) {
                icon_image.css("opacity", 0);

                icon_load_image.animate({opacity: 0}, 50, function () {
                    icon_load_image.remove();
                    icon_image.animate({opacity: 1}, 150);
                });
            } else {
                icon_load_image.remove();
                icon_load_image = undefined;
            }
        };
        if(icon instanceof Promise) {
            icon.then(_apply).catch(error => {
                log.error(LogCategory.CLIENT, tr("Could not load icon. Reason: %s"), error);
                icon_load_image.removeClass("icon_loading").addClass("icon client-warning").attr("tag", "Could not load icon");
            });
        } else {
            _apply(icon as Icon);
        }

        if(icon_load_image)
            icon_load_image.appendTo(icon_container);
        return icon_container;
    }

    generateTag(id: number, options?: {
        animate?: boolean
    }) : JQuery<HTMLDivElement> {
        options = options || {};

        id = id >>> 0;
        if(id == 0 || !id)
            return IconManager.generate_tag({id: id, url: ""}, options);
        else if(id < 1000)
            return IconManager.generate_tag({id: id, url: ""}, options);


        if(this._id_urls[id]) {
            return IconManager.generate_tag({id: id, url: this._id_urls[id]}, options);
        } else {
            return IconManager.generate_tag(this.resolve_icon(id), options);
        }
    }
}

class Avatar {
    client_avatar_id: string; /* the base64 uid thing from a-m */
    avatar_id: string; /* client_flag_avatar */
    url: string;
    type: ImageType;
}

class AvatarManager {
    handle: FileManager;

    private static cache: CacheManager;
    private _cached_avatars: {[response_avatar_id:number]:Avatar} = {};
    private _loading_promises: {[response_avatar_id:number]:Promise<Icon>} = {};

    constructor(handle: FileManager) {
        this.handle = handle;

        if(!AvatarManager.cache)
            AvatarManager.cache = new CacheManager("avatars");
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

    create_avatar_download(client_avatar_id: string) : Promise<transfer.DownloadKey> {
        log.debug(LogCategory.GENERAL, "Requesting download for avatar %s", client_avatar_id);
        return this.handle.download_file("", "/avatar_" + client_avatar_id);
    }

    private async _load_avatar(client_avatar_id: string, avatar_version: string) {
        try {
            let download_key: transfer.DownloadKey;
            try {
                download_key = await this.create_avatar_download(client_avatar_id);
            } catch(error) {
                log.error(LogCategory.GENERAL, tr("Could not request download for avatar %s: %o"), client_avatar_id, error);
                throw "failed to request avatar download";
            }

            const downloader = transfer.spawn_download_transfer(download_key);
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