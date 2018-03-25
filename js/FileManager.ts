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
            if(this._socket.readyState !== WebSocket.OPEN && !this._succeed) this.on_fail("unexpected close");
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

        if(!this._parseActive) this.on_fail("unexpected close");
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

    private listRequests: FileListRequest[] = [];
    private pendingDownloadTransfers: DownloadFileTransfer[] = [];
    private downloadCounter : number = 0;

    constructor(client: TSClient) {
        this.handle = client;
        this.icons = new IconManager(this);

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
        transfer.remoteHost = json["ip"].replace(/,/g, "");
        if(transfer.remoteHost == '0.0.0.0' || transfer.remoteHost == '127.168.0.0')
            transfer.remoteHost = this.handle.serverConnection._remoteHost;

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

    loadIcon(id: number) : Promise<Icon> {
        const _this = this;
        return new Promise<Icon>((resolve, reject) => {
            let icon = this.resolveCached(id);
            if(icon){
                resolve(icon);
                return;
            }

            _this.downloadIcon(id).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    console.error("Could not download icon " + id + " -> " + reason);
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
                    resolve(icon);
                };

                ft.startTransfer();
            }).catch(reason => {
                console.error("Error while downloading icon! (" + JSON.stringify(reason) + ")");
                reject(reason);
            });
        });
    }

    //$("<img width=\"16\" height=\"16\" alt=\"tick\" src=\"data:image/png;base64," + value.base64 + "\">")
    generateTag(id: number) {
        if(id == 0)
            return $("<div class='icon_empty'></div>");
        else if(id < 1000)
            return $("<div class='icon client-group_" + id + "'></div>");

        let tag = $("<div></div>");
        tag.addClass("icon_empty");

        let img = $.spawn("img");
        img.attr("width", 16).attr("height", 16).attr("alt", "");

        let icon = this.resolveCached(id);
        if(icon) {
            img.attr("src", "data:image/png;base64," + icon.base64);
            tag.append(img);
        } else {
            img.attr("src", "file://null");

            let loader = $("<div></div>");
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
            });
        }

        return tag;
    }
}