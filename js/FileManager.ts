/// <reference path="client.ts" />

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

class DownloadFileTransfer {
    transferId: number;
    serverTransferId: number;
    transferKey: string;

    totalSize: number;
    currentSize: number = 0;

    remotePort: number;
    remoteHost: string;

    on_start: () => void = () => {};
    on_complete: () => void = () => {};
    on_fail: (reason: string) => void = (_) => {};
    on_data: (data: Uint8Array) => void = (_) => {};

    private _handle: FileManager;
    private _promiseCallback: (value: DownloadFileTransfer) => void;
    private _socket: WebSocket;
    private _active: boolean;
    private _succeed: boolean;
    private _parseActive: boolean;

    constructor(handle: FileManager, id: number) {
        this.transferId = id;
        this._handle = handle;
    }

    startTransfer() {
        if(!this.remoteHost || !this.remotePort || !this.transferKey || !this.totalSize) {
            this.on_fail("Missing data!");
            return;
        }

        console.debug("Create new file download to " + this.remoteHost + ":" + this.remotePort + " (Key: " + this.transferKey + ", Expect " + this.totalSize + " bytes)");
        this._active = true;
        this._socket = new WebSocket("wss://" + this.remoteHost + ":" + this.remotePort);
        this._socket.onopen = this.onOpen.bind(this);
        this._socket.onclose = this.onClose.bind(this);
        this._socket.onmessage = this.onMessage.bind(this);
        this._socket.onerror = this.onError.bind(this);
    }

    private onOpen() {
        if(!this._active) return;

        this._socket.send(this.transferKey);
        this.on_start();
    }

    private onMessage(data: MessageEvent) {
        if(!this._active) {
            console.error("Got data, but socket closed?");
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
        if(this.currentSize == this.totalSize) {
            this._succeed = true;
            this.on_complete();
            this.disconnect();
        }
    }

    private onError() {
        if(!this._active) return;
        this.on_fail("an error occurent");
        this.disconnect();
    }

    private onClose() {
        if(!this._active) return;

        if(!this._parseActive) this.on_fail("unexpected close (remote closed)");
        this.disconnect();
    }

    private disconnect(){
        this._active = false;
        //this._socket.close();
    }
}

class FileManager {
    handle: TSClient;
    icons: IconManager;
    avatars: AvatarManager;

    private listRequests: FileListRequest[] = [];
    private pendingDownloadTransfers: DownloadFileTransfer[] = [];
    private downloadCounter : number = 0;

    constructor(client: TSClient) {
        this.handle = client;
        this.icons = new IconManager(this);
        this.avatars = new AvatarManager(this);

        this.handle.serverConnection.commandHandler["notifyfilelist"] = this.notifyFileList.bind(this);
        this.handle.serverConnection.commandHandler["notifyfilelistfinished"] = this.notifyFileListFinished.bind(this);
        this.handle.serverConnection.commandHandler["notifystartdownload"] = this.notifyStartDownload.bind(this);
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

            _this.handle.serverConnection.sendCommand("ftgetfilelist", {"path": path, "cid": (channel ? channel.channelId : "0"), "cpw": (password ? password : "")}).then(() => {}).catch(reason => {
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
            console.error("Invalid file list entry. Path: " + json[0]["path"]);
            return;
        }
        for(let e of (json as Array<FileEntry>))
            entry.entries.push(e);
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
            console.error("Invalid file list entry finish. Path: " + json[0]["path"]);
            return;
        }
        entry.callback(entry.entries);
    }


    /******************************** File download ********************************/
    requestFileDownload(path: string, file: string, channel?: ChannelEntry, password?: string) : Promise<DownloadFileTransfer> {
        const _this = this;
        let transfer = new DownloadFileTransfer(this, this.downloadCounter++);
        this.pendingDownloadTransfers.push(transfer);
        return new Promise<DownloadFileTransfer>((resolve, reject) => {
            transfer["_promiseCallback"] = resolve;
            _this.handle.serverConnection.sendCommand("ftinitdownload", {
                "path": path,
                "name": file,
                "cid": (channel ? channel.channelId : "0"),
                "cpw": (password ? password : ""),
                "clientftfid": transfer.transferId
            }).catch(reason => {
                _this.pendingDownloadTransfers.remove(transfer);
                reject(reason);
            })
        });
    }

    private notifyStartDownload(json) {
        json = json[0];

        let transfer: DownloadFileTransfer;
        for(let e of this.pendingDownloadTransfers)
            if(e.transferId == json["clientftfid"]) {
                transfer = e;
                break;
            }

        transfer.serverTransferId = json["serverftfid"];
        transfer.transferKey = json["ftkey"];
        transfer.totalSize = json["size"];

        transfer.remotePort = json["port"];
        transfer.remoteHost = (json["ip"] ? json["ip"] : "").replace(/,/g, "");
        if(!transfer.remoteHost || transfer.remoteHost == '0.0.0.0' || transfer.remoteHost == '127.168.0.0')
            transfer.remoteHost = this.handle.serverConnection._remote_address.host;

        (transfer["_promiseCallback"] as (val: DownloadFileTransfer) => void)(transfer);
        this.pendingDownloadTransfers.remove(transfer);
    }
}

class Icon {
    id: number;
    name: string;
    base64: string;
}

class IconManager {
    handle: FileManager;
    private loading_icons: {promise: Promise<Icon>, id: number}[] = [];

    constructor(handle: FileManager) {
        this.handle = handle;
    }

    iconList() : Promise<FileEntry[]> {
        return this.handle.requestFileList("/icons");
    }

    downloadIcon(id: number) : Promise<DownloadFileTransfer> {
        return this.handle.requestFileDownload("", "/icon_" + id);
    }

    resolveCached?(id: number) : Icon {
        let icon = localStorage.getItem("icon_" + id);
        if(icon) {
            let i = JSON.parse(icon) as Icon;
            if(i.base64.length > 0) { //TODO timestamp?
                return i;
            }
        }
        return undefined;
    }

    private load_finished(id: number) {
        for(let entry of this.loading_icons)
            if(entry.id == id)
                this.loading_icons.remove(entry);
    }
    loadIcon(id: number) : Promise<Icon> {
        for(let entry of this.loading_icons)
            if(entry.id == id) return entry.promise;

        let promise = new Promise<Icon>((resolve, reject) => {
            let icon = this.resolveCached(id);
            if(icon){
                this.load_finished(id);
                resolve(icon);
                return;
            }

            this.downloadIcon(id).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    this.load_finished(id);
                    console.error("Could not download icon " + id + " -> " + reason);
                    chat.serverChat().appendError("Fail to download icon {0}. ({1})", id, JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => {};
                ft.on_data = (data: Uint8Array) => {
                    array = concatenate(Uint8Array, array, data);
                };
                ft.on_complete = () => {
                    let base64 = btoa(String.fromCharCode.apply(null, array));
                    let icon = new Icon();
                    icon.base64 = base64;
                    icon.id = id;
                    icon.name = "icon_" + id;

                    localStorage.setItem("icon_" + id, JSON.stringify(icon));
                    this.load_finished(id);
                    resolve(icon);
                };

                ft.startTransfer();
            }).catch(reason => {
                console.error("Error while downloading icon! (" + JSON.stringify(reason) + ")");
                chat.serverChat().appendError("Failed to request download for icon {0}. ({1})", id, JSON.stringify(reason));
                reject(reason);
            });
        });

        this.loading_icons.push({promise: promise, id: id});
        return promise;
    }

    //$("<img width=\"16\" height=\"16\" alt=\"tick\" src=\"data:image/png;base64," + value.base64 + "\">")
    generateTag(id: number) {
        if(id == 0)
            return $("<div class='icon_empty'></div>");
        else if(id < 1000)
            return $("<div class='icon client-group_" + id + "'></div>");

        let tag = $.spawn("div");
        tag.addClass("icon_empty");

        let img = $.spawn("img");
        img.attr("width", 16).attr("height", 16).attr("alt", "");

        let icon = this.resolveCached(id);
        if(icon) {
            img.attr("src", "data:image/png;base64," + icon.base64);
            tag.append(img);
        } else {
            img.attr("src", "file://null");

            let loader = $.spawn("div");
            loader.addClass("icon_loading");
            tag.append(loader);

            this.loadIcon(id).then(icon => {
                img.attr("src", "data:image/png;base64," + icon.base64);
                console.debug("Icon " + id + " loaded :)");

                img.css("opacity", 0);
                tag.append(img);
                loader.animate({opacity: 0}, 50, function () {
                    $(this).detach();
                    img.animate({opacity: 1}, 150);
                });
            }).catch(reason => {
                console.error("Could not load icon " + id + ". Reason: " + reason);
                loader.removeClass("icon_loading").addClass("icon client-warning").attr("tag", "Could not load icon " + id);
            });
        }

        return tag;
    }
}

class Avatar {
    clientUid: string;
    avatarId: string;
    base64?: string;
    url?: string;
    blob?: Blob;
}

class AvatarManager {
    handle: FileManager;
    private loading_avatars: {promise: Promise<Avatar>, name: string}[] = [];
    private loaded_urls: string[] = [];

    constructor(handle: FileManager) {
        this.handle = handle;
    }

    downloadAvatar(client: ClientEntry) : Promise<DownloadFileTransfer> {
        console.log("Downloading avatar %s", client.avatarId());
        return this.handle.requestFileDownload("", "/avatar_" + client.avatarId());
    }

    resolveCached?(client: ClientEntry) : Avatar {
        let avatar = localStorage.getItem("avatar_" + client.properties.client_unique_identifier);
        if(avatar) {
            let i = JSON.parse(avatar) as Avatar;
            //TODO timestamp?

            if(i.avatarId != client.properties.client_flag_avatar) return undefined;

            if(i.base64) {
                if(i.base64.length > 0)
                    return i;
                else i.base64 = undefined;
            }
            if(i.url) {
                for(let url of this.loaded_urls)
                    if(url == i.url) return i;
            }
        }
        return undefined;
    }

    private load_finished(name: string) {
        for(let entry of this.loading_avatars)
            if(entry.name == name)
                this.loading_avatars.remove(entry);
    }
    loadAvatar(client: ClientEntry) : Promise<Avatar> {
        let name = client.avatarId();
        for(let promise of this.loading_avatars)
            if(promise.name == name) return promise.promise;

        let promise = new Promise<Avatar>((resolve, reject) => {
            let avatar = this.resolveCached(client);
            if(avatar){
                this.load_finished(name);
                resolve(avatar);
                return;
            }

            this.downloadAvatar(client).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    this.load_finished(name);
                    console.error("Could not download avatar " + client.properties.client_flag_avatar + " -> " + reason);
                    chat.serverChat().appendError("Fail to download avatar for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => {};
                ft.on_data = (data: Uint8Array) => {
                    array = concatenate(Uint8Array, array, data);
                };
                ft.on_complete = () => {
                    let avatar = new Avatar();
                    if(array.length >= 1 * 1024 * 1024) {
                        let blob_image = new Blob([array]);
                        avatar.url = URL.createObjectURL(blob_image);
                        avatar.blob = blob_image;
                        this.loaded_urls.push(avatar.url);
                    } else {
                        avatar.base64 = btoa(String.fromCharCode.apply(null, array));
                    }
                    avatar.clientUid = client.clientUid();
                    avatar.avatarId = client.properties.client_flag_avatar;

                    localStorage.setItem("avatar_" + client.properties.client_unique_identifier, JSON.stringify(avatar));
                    this.load_finished(name);
                    resolve(avatar);
                };

                ft.startTransfer();
            }).catch(reason => {
                this.load_finished(name);
                console.error("Error while downloading avatar! (" + JSON.stringify(reason) + ")");
                chat.serverChat().appendError("Failed to request avatar download for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                reject(reason);
            });
        });

        this.loading_avatars.push({promise: promise, name: name});
        return promise;
    }

    generateTag(client: ClientEntry) {
        let tag = $.spawn("div");

        let img = $.spawn("img");
        img.attr("alt", "");

        let avatar = this.resolveCached(client);
        if(avatar) {
            if(avatar.url)
                img.attr("src", avatar.url);
            else
                img.attr("src", "data:image/png;base64," + avatar.base64);
            tag.append(img);
        } else {
            let loader = $.spawn("img");
            loader.attr("src", "img/loading_image.svg").css("width", "75%");
            tag.append(loader);

            this.loadAvatar(client).then(avatar => {
                if(avatar.url)
                    img.attr("src", avatar.url);
                else
                    img.attr("src", "data:image/png;base64," + avatar.base64);
                console.debug("Avatar " + client.clientNickName() + " loaded :)");

                img.css("opacity", 0);
                tag.append(img);
                loader.animate({opacity: 0}, 50, function () {
                    $(this).detach();
                    img.animate({opacity: 1}, 150);
                });
            }).catch(reason => {
                console.error("Could not load avatar for " + client.clientNickName() + ". Reason: " + reason);
                //TODO Broken image
                loader.addClass("icon client-warning").attr("tag", "Could not load avatar " + client.clientNickName());
            });
        }

        return tag;
    }
}