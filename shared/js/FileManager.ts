/// <reference path="client.ts" />
/// <reference path="connection/ConnectionBase.ts" />

/*
FIXME:  Dont use item storage with base64! Use the larger cache API and drop IE support!
        https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage#Browser_compatibility
*/

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
    export interface DownloadKey {
        client_transfer_id: number;
        server_transfer_id: number;

        key: string;
        total_size: number;

        file_path: string;
        file_name: string;

        peer: {
            hosts: string[],
            port: number;
        };
    }
}

class StreamedFileDownload {
    readonly transfer_key: transfer.DownloadKey;
    currentSize: number = 0;

    on_start: () => void = () => {};
    on_complete: () => void = () => {};
    on_fail: (reason: string) => void = (_) => {};
    on_data: (data: Uint8Array) => void = (_) => {};

    private _handle: FileManager;
    private _promiseCallback: (value: StreamedFileDownload) => void;
    private _socket: WebSocket;
    private _active: boolean;
    private _succeed: boolean;
    private _parseActive: boolean;

    constructor(key: transfer.DownloadKey) {
        this.transfer_key = key;
    }

    start() {
        if(!this.transfer_key) {
            this.on_fail("Missing data!");
            return;
        }

        console.debug(tr("Create new file download to %s:%s (Key: %s, Expect %d bytes)"), this.transfer_key.peer.hosts[0], this.transfer_key.peer.port, this.transfer_key.key, this.transfer_key.total_size);
        this._active = true;
        this._socket = new WebSocket("wss://" + this.transfer_key.peer.hosts[0] + ":" + this.transfer_key.peer.port);
        this._socket.onopen = this.onOpen.bind(this);
        this._socket.onclose = this.onClose.bind(this);
        this._socket.onmessage = this.onMessage.bind(this);
        this._socket.onerror = this.onError.bind(this);
    }

    private onOpen() {
        if(!this._active) return;

        this._socket.send(this.transfer_key.key);
        this.on_start();
    }

    private onMessage(data: MessageEvent) {
        if(!this._active) {
            console.error(tr("Got data, but socket closed?"));
            return;
        }
        this._parseActive = true;

        let fileReader = new FileReader();
        fileReader.onload = (event: any) => {
            this.onBinaryData(new Uint8Array(event.target.result));
            //if(this._socket.readyState != WebSocket.OPEN && !this._succeed) this.on_fail("unexpected close");
            this._parseActive = false;
        };
        fileReader.readAsArrayBuffer(data.data);
    }

    private onBinaryData(data: Uint8Array) {
        this.currentSize += data.length;
        this.on_data(data);
        if(this.currentSize == this.transfer_key.total_size) {
            this._succeed = true;
            this.on_complete();
            this.disconnect();
        }
    }

    private onError() {
        if(!this._active) return;
        this.on_fail(tr("an error occurent"));
        this.disconnect();
    }

    private onClose() {
        if(!this._active) return;

        if(!this._parseActive) this.on_fail(tr("unexpected close (remote closed)"));
        this.disconnect();
    }

    private disconnect(){
        this._active = false;
        //this._socket.close();
    }
}
class RequestFileDownload {
    readonly transfer_key: transfer.DownloadKey;

    constructor(key: transfer.DownloadKey) {
        this.transfer_key = key;
    }

    async request_file() : Promise<Response> {
        return await this.try_fetch("https://" + this.transfer_key.peer.hosts[0] + ":" + this.transfer_key.peer.port);
    }

    /*
			response.setHeader("Access-Control-Allow-Methods", {"GET, POST"});
			response.setHeader("Access-Control-Allow-Origin", {"*"});
			response.setHeader("Access-Control-Allow-Headers", {"*"});
			response.setHeader("Access-Control-Max-Age", {"86400"});
			response.setHeader("Access-Control-Expose-Headers", {"X-media-bytes"});
     */
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
        if(!response.ok)
            throw (response.type == 'opaque' || response.type == 'opaqueredirect' ? "invalid cross origin flag! May target isn't a TeaSpeak server?" : response.statusText || "response is not ok");
        return response;
    }
}

class FileManager extends connection.AbstractCommandHandler {
    handle: TSClient;
    icons: IconManager;
    avatars: AvatarManager;

    private listRequests: FileListRequest[] = [];
    private pendingDownloadTransfers: transfer.DownloadKey[] = [];
    private downloadCounter : number = 0;

    constructor(client: TSClient) {
        super(client.serverConnection);

        this.handle = client;
        this.icons = new IconManager(this);
        this.avatars = new AvatarManager(this);

        this.connection.command_handler_boss().register_handler(this);
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
            console.error(tr("Invalid file list entry. Path: %s"), json[0]["path"]);
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
            console.error(tr("Invalid file list entry finish. Path: "), json[0]["path"]);
            return;
        }
        entry.callback(entry.entries);
    }


    /******************************** File download ********************************/
    download_file(path: string, file: string, channel?: ChannelEntry, password?: string) : Promise<transfer.DownloadKey> {
        const _this = this;

        const transfer_data: transfer.DownloadKey = {
            file_name: file,
            file_path: file,
            client_transfer_id: this.downloadCounter++
        } as any;

        this.pendingDownloadTransfers.push(transfer_data);
        return new Promise<transfer.DownloadKey>((resolve, reject) => {
            transfer_data["_promiseCallback"] = resolve;
            _this.handle.serverConnection.send_command("ftinitdownload", {
                "path": path,
                "name": file,
                "cid": (channel ? channel.channelId : "0"),
                "cpw": (password ? password : ""),
                "clientftfid": transfer_data.client_transfer_id
            }).catch(reason => {
                _this.pendingDownloadTransfers.remove(transfer_data);
                reject(reason);
            })
        });
    }

    private notifyStartDownload(json) {
        json = json[0];

        let transfer: transfer.DownloadKey;
        for(let e of this.pendingDownloadTransfers)
            if(e.client_transfer_id == json["clientftfid"]) {
                transfer = e;
                break;
            }

        transfer.server_transfer_id = json["serverftfid"];
        transfer.key = json["ftkey"];
        transfer.total_size = json["size"];

        transfer.peer = {
            hosts: (json["ip"] || "").split(","),
            port: json["port"]
        };

        if(transfer.peer.hosts.length == 0)
            transfer.peer.hosts.push("0.0.0.0");

        if(transfer.peer.hosts[0].length == 0 || transfer.peer.hosts[0] == '0.0.0.0')
            transfer.peer.hosts[0] = this.handle.serverConnection._remote_address.host;

        (transfer["_promiseCallback"] as (val: transfer.DownloadKey) => void)(transfer);
        this.pendingDownloadTransfers.remove(transfer);
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

function image_type(base64: string) {
    const bin = atob(base64);
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

        const request = new Request("cache_request_" + key);
        const cached_response = await this._cache_category.match(request);
        if(!cached_response)
            return undefined;

        /* FIXME: Max age */
        return cached_response;
    }

    async put_cache(key: string, value: Response, type?: string, headers?: {[key: string]:string}) {
        const request = new Request("cache_request_" + key);

        const new_headers = new Headers();
        for(const key of value.headers.keys())
            new_headers.set(key, value.headers.get(key));
        if(type)
            new_headers.set("Content-type", type);
        for(const key of Object.keys(headers || {}))
            new_headers.set(key, headers[key]);

        await this._cache_category.put(request, new Response(value.body, {
            headers: new_headers
        }));
    }
}

class IconManager {
    handle: FileManager;
    private cache: CacheManager;
    private _id_urls: {[id:number]:string} = {};
    private _loading_promises: {[id:number]:Promise<Icon>} = {};

    constructor(handle: FileManager) {
        this.handle = handle;
        this.cache = new CacheManager("icons");
    }

    iconList() : Promise<FileEntry[]> {
        return this.handle.requestFileList("/icons");
    }

    create_icon_download(id: number) : Promise<transfer.DownloadKey> {
        return this.handle.download_file("", "/icon_" + id);
    }

    private async _response_url(response: Response) {
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

        if(!this.cache.setupped())
            await this.cache.setup();

        const response = await this.cache.resolve_cached('icon_' + id); //TODO age!
        if(response)
            return {
                id: id,
                url: (this._id_urls[id] = await this._response_url(response))
            };
        return undefined;
    }

    private async _load_icon(id: number) : Promise<Icon> {
        try {
            let download_key: transfer.DownloadKey;
            try {
                download_key = await this.create_icon_download(id);
            } catch(error) {
                console.error(tr("Could not request download for icon %d: %o"), id, error);
                throw "Failed to request icon";
            }

            const downloader = new RequestFileDownload(download_key);
            let response: Response;
            try {
                response = await downloader.request_file();
            } catch(error) {
                console.error(tr("Could not download icon %d: %o"), id, error);
                throw "failed to download icon";
            }

            const type = image_type(response.headers.get('X-media-bytes'));
            const media = media_image_type(type);

            await this.cache.put_cache('icon_' + id, response.clone(), "image/" + media);
            const url = (this._id_urls[id] = await this._response_url(response.clone()));

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

    loadIcon(id: number) : Promise<Icon> {
        return this._loading_promises[id] || (this._loading_promises[id] = this._load_icon(id));
    }

    generateTag(id: number, options?: {
        animate?: boolean
    }) : JQuery<HTMLDivElement> {
        options = options || {};

        if(id == 0)
            return $.spawn("div").addClass("icon_empty");
        else if(id < 1000)
            return $.spawn("div").addClass("icon client-group_" + id);


        const icon_container = $.spawn("div").addClass("icon-container icon_empty");
        const icon_image = $.spawn("img").attr("width", 16).attr("height", 16).attr("alt", "");

        if(this._id_urls[id]) {
            icon_image.attr("src", this._id_urls[id]).appendTo(icon_container);
            icon_container.removeClass("icon_empty");
        } else {
            const icon_load_image = $.spawn("div").addClass("icon_loading");
            icon_load_image.appendTo(icon_container);

            (async () => {
                let icon: Icon;
                try {
                    icon = await this.resolved_cached(id);
                } catch(error) {
                    console.error(error);
                }

                if(!icon)
                    icon = await this.loadIcon(id);

                if(!icon)
                    throw "failed to download icon";

                icon_image.attr("src", icon.url);
                icon_container.append(icon_image).removeClass("icon_empty");

                if(typeof(options.animate) !== "boolean" || options.animate) {
                    icon_image.css("opacity", 0);

                    icon_load_image.animate({opacity: 0}, 50, function () {
                        icon_load_image.detach();
                        icon_image.animate({opacity: 1}, 150);
                    });
                } else {
                    icon_load_image.detach();
                }
            })().catch(reason => {
                console.error(tr("Could not load icon %o. Reason: %s"), id, reason);
                icon_load_image.removeClass("icon_loading").addClass("icon client-warning").attr("tag", "Could not load icon " + id);
            });
        }

        return icon_container;
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

    private cache: CacheManager;
    private _cached_avatars: {[response_avatar_id:number]:Avatar} = {};
    private _loading_promises: {[response_avatar_id:number]:Promise<Icon>} = {};

    constructor(handle: FileManager) {
        this.handle = handle;

        this.cache = new CacheManager("avatars");
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

    async resolved_cached?(client_avatar_id: string, avatar_id?: string) : Promise<Avatar> {
        let avatar: Avatar = this._cached_avatars[avatar_id];
        if(avatar) {
            if(typeof(avatar_id) !== "string" || avatar.avatar_id == avatar_id)
                return avatar;
            this._cached_avatars[avatar_id] = (avatar = undefined);
        }

        if(!this.cache.setupped())
            await this.cache.setup();

        const response = await this.cache.resolve_cached('avatar_' + client_avatar_id); //TODO age!
        if(!response)
            return undefined;

        let response_avatar_id = response.headers.has("X-avatar-id") ? response.headers.get("X-avatar-id") : undefined;
        if(typeof(avatar_id) === "string" && response_avatar_id != avatar_id)
            return undefined;

        const type = image_type(response.headers.get('X-media-bytes'));
        return this._cached_avatars[client_avatar_id] = {
            client_avatar_id: client_avatar_id,
            avatar_id: avatar_id || response_avatar_id,
            url: await this._response_url(response, type),
            type: type
        };
    }

    create_avatar_download(client_avatar_id: string) : Promise<transfer.DownloadKey> {
        console.log(tr("Downloading avatar %s"), client_avatar_id);
        return this.handle.download_file("", "/avatar_" + client_avatar_id);
    }

    private async _load_avatar(client_avatar_id: string, avatar_id: string) {
        let download_key: transfer.DownloadKey;
        try {
            download_key = await this.create_avatar_download(client_avatar_id);
        } catch(error) {
            console.error(tr("Could not request download for avatar %s: %o"), client_avatar_id, error);
            throw "Failed to request icon";
        }

        const downloader = new RequestFileDownload(download_key);
        let response: Response;
        try {
            response = await downloader.request_file();
        } catch(error) {
            console.error(tr("Could not download avatar %s: %o"), client_avatar_id, error);
            throw "failed to download avatar";
        }

        const type = image_type(response.headers.get('X-media-bytes'));
        const media = media_image_type(type);

        await this.cache.put_cache('avatar_' + client_avatar_id, response.clone(), "image/" + media, {
            "X-avatar-id": avatar_id
        });
        const url = await this._response_url(response.clone(), type);

        this._loading_promises[client_avatar_id] = undefined;
        return this._cached_avatars[client_avatar_id] = {
            client_avatar_id: client_avatar_id,
            avatar_id: avatar_id,
            url: url,
            type: type
        };
    }

    loadAvatar(client_avatar_id: string, avatar_id: string) : Promise<Avatar> {
        return this._loading_promises[client_avatar_id] || (this._loading_promises[client_avatar_id] = this._load_avatar(client_avatar_id, avatar_id));
    }

    generate_client_tag(client: ClientEntry) : JQuery {
        return this.generate_tag(client.avatarId(), client.properties.client_flag_avatar);
    }

    generate_tag(client_avatar_id: string, avatar_id?: string, options?: {
        callback_image?: (tag: JQuery<HTMLImageElement>) => any,
        callback_avatar?: (avatar: Avatar) => any
    }) : JQuery {
        options = options || {};

        let avatar_container = $.spawn("div");
        let avatar_image = $.spawn("img").attr("alt", tr("Client avatar"));

        let cached_avatar: Avatar = this._cached_avatars[client_avatar_id];
        if(cached_avatar && cached_avatar.avatar_id == avatar_id) {
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
                    console.error(error);
                }

                if(!avatar)
                    avatar = await this.loadAvatar(client_avatar_id, avatar_id)

                if(!avatar)
                    throw "failed to load avatar";

                if(options.callback_avatar)
                    options.callback_avatar(avatar);

                avatar_image.attr("src", avatar.url);
                avatar_image.css("opacity", 0);
                avatar_container.append(avatar_image);
                loader_image.animate({opacity: 0}, 50, () => {
                    loader_image.detach();
                    avatar_image.animate({opacity: 1}, 150, () => {
                        if(options.callback_image)
                            options.callback_image(avatar_image);
                    });
                });
            })().catch(reason => {
                console.error(tr("Could not load avatar for id %s. Reason: %s"), client_avatar_id, reason);
                //TODO Broken image
                loader_image.addClass("icon client-warning").attr("tag", tr("Could not load avatar ") + client_avatar_id);
            })
        }

        return avatar_container;
    }
}