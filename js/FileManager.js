/// <reference path="client.ts" />
class FileEntry {
}
class FileListRequest {
}
class DownloadFileTransfer {
    constructor(handle, id) {
        this.currentSize = 0;
        this.on_start = () => { };
        this.on_complete = () => { };
        this.on_fail = (_) => { };
        this.on_data = (_) => { };
        this.transferId = id;
        this._handle = handle;
    }
    startTransfer() {
        if (!this.remoteHost || !this.remotePort || !this.transferKey || !this.totalSize) {
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
    onOpen() {
        if (!this._active)
            return;
        this._socket.send(this.transferKey);
        this.on_start();
    }
    onMessage(data) {
        if (!this._active) {
            console.error("Got data, but socket closed?");
            return;
        }
        this._parseActive = true;
        let fileReader = new FileReader();
        fileReader.onload = (event) => {
            this.onBinaryData(new Uint8Array(event.target.result));
            //if(this._socket.readyState != WebSocket.OPEN && !this._succeed) this.on_fail("unexpected close");
            this._parseActive = false;
        };
        fileReader.readAsArrayBuffer(data.data);
    }
    onBinaryData(data) {
        this.currentSize += data.length;
        this.on_data(data);
        if (this.currentSize == this.totalSize) {
            this._succeed = true;
            this.on_complete();
            this.disconnect();
        }
    }
    onError() {
        if (!this._active)
            return;
        this.on_fail("an error occurent");
        this.disconnect();
    }
    onClose() {
        if (!this._active)
            return;
        if (!this._parseActive)
            this.on_fail("unexpected close (remote closed)");
        this.disconnect();
    }
    disconnect() {
        this._active = false;
        //this._socket.close();
    }
}
class FileManager {
    constructor(client) {
        this.listRequests = [];
        this.pendingDownloadTransfers = [];
        this.downloadCounter = 0;
        this.handle = client;
        this.icons = new IconManager(this);
        this.avatars = new AvatarManager(this);
        this.handle.serverConnection.commandHandler["notifyfilelist"] = this.notifyFileList.bind(this);
        this.handle.serverConnection.commandHandler["notifyfilelistfinished"] = this.notifyFileListFinished.bind(this);
        this.handle.serverConnection.commandHandler["notifystartdownload"] = this.notifyStartDownload.bind(this);
    }
    /******************************** File list ********************************/
    //TODO multiple requests (same path)
    requestFileList(path, channel, password) {
        const _this = this;
        return new Promise((accept, reject) => {
            let req = new FileListRequest();
            req.path = path;
            req.entries = [];
            req.callback = accept;
            _this.listRequests.push(req);
            _this.handle.serverConnection.sendCommand("ftgetfilelist", { "path": path, "cid": (channel ? channel.channelId : "0"), "cpw": (password ? password : "") }).then(() => { }).catch(reason => {
                _this.listRequests.remove(req);
                if (reason instanceof CommandResult) {
                    if (reason.id == 0x0501) {
                        accept([]); //Empty result
                        return;
                    }
                }
                reject(reason);
            });
        });
    }
    notifyFileList(json) {
        let entry = undefined;
        for (let e of this.listRequests) {
            if (e.path == json[0]["path"]) {
                entry = e;
                break;
            }
        }
        if (!entry) {
            console.error("Invalid file list entry. Path: " + json[0]["path"]);
            return;
        }
        for (let e of json)
            entry.entries.push(e);
    }
    notifyFileListFinished(json) {
        let entry = undefined;
        for (let e of this.listRequests) {
            if (e.path == json[0]["path"]) {
                entry = e;
                this.listRequests.remove(e);
                break;
            }
        }
        if (!entry) {
            console.error("Invalid file list entry finish. Path: " + json[0]["path"]);
            return;
        }
        entry.callback(entry.entries);
    }
    /******************************** File download ********************************/
    requestFileDownload(path, file, channel, password) {
        const _this = this;
        let transfer = new DownloadFileTransfer(this, this.downloadCounter++);
        this.pendingDownloadTransfers.push(transfer);
        return new Promise((resolve, reject) => {
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
            });
        });
    }
    notifyStartDownload(json) {
        json = json[0];
        let transfer;
        for (let e of this.pendingDownloadTransfers)
            if (e.transferId == json["clientftfid"]) {
                transfer = e;
                break;
            }
        transfer.serverTransferId = json["serverftfid"];
        transfer.transferKey = json["ftkey"];
        transfer.totalSize = json["size"];
        transfer.remotePort = json["port"];
        transfer.remoteHost = json["ip"].replace(/,/g, "");
        if (transfer.remoteHost == '0.0.0.0' || transfer.remoteHost == '127.168.0.0')
            transfer.remoteHost = this.handle.serverConnection._remoteHost;
        transfer["_promiseCallback"](transfer);
        this.pendingDownloadTransfers.remove(transfer);
    }
}
class Icon {
}
class IconManager {
    constructor(handle) {
        this.handle = handle;
    }
    iconList() {
        return this.handle.requestFileList("/icons");
    }
    downloadIcon(id) {
        return this.handle.requestFileDownload("", "/icon_" + id);
    }
    resolveCached(id) {
        let icon = localStorage.getItem("icon_" + id);
        if (icon) {
            let i = JSON.parse(icon);
            if (i.base64.length > 0) {
                return i;
            }
        }
        return undefined;
    }
    loadIcon(id) {
        const _this = this;
        return new Promise((resolve, reject) => {
            let icon = this.resolveCached(id);
            if (icon) {
                resolve(icon);
                return;
            }
            _this.downloadIcon(id).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    console.error("Could not download icon " + id + " -> " + reason);
                    chat.serverChat().appendError("Fail to download icon {0}. ({1})", id, JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => { };
                ft.on_data = (data) => {
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
                chat.serverChat().appendError("Failed to request download for icon {0}. ({1})", id, JSON.stringify(reason));
                reject(reason);
            });
        });
    }
    //$("<img width=\"16\" height=\"16\" alt=\"tick\" src=\"data:image/png;base64," + value.base64 + "\">")
    generateTag(id) {
        if (id == 0)
            return $("<div class='icon_empty'></div>");
        else if (id < 1000)
            return $("<div class='icon client-group_" + id + "'></div>");
        let tag = $.spawn("div");
        tag.addClass("icon_empty");
        let img = $.spawn("img");
        img.attr("width", 16).attr("height", 16).attr("alt", "");
        let icon = this.resolveCached(id);
        if (icon) {
            img.attr("src", "data:image/png;base64," + icon.base64);
            tag.append(img);
        }
        else {
            img.attr("src", "file://null");
            let loader = $.spawn("div");
            loader.addClass("icon_loading");
            tag.append(loader);
            this.loadIcon(id).then(icon => {
                img.attr("src", "data:image/png;base64," + icon.base64);
                console.debug("Icon " + id + " loaded :)");
                img.css("opacity", 0);
                tag.append(img);
                loader.animate({ opacity: 0 }, 50, function () {
                    $(this).detach();
                    img.animate({ opacity: 1 }, 150);
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
}
class AvatarManager {
    constructor(handle) {
        this.handle = handle;
    }
    downloadAvatar(client) {
        return this.handle.requestFileDownload("", "/avatar_" + client.avatarId());
    }
    resolveCached(client) {
        let avatar = localStorage.getItem("avatar_" + client.properties.client_unique_identifier);
        if (avatar) {
            let i = JSON.parse(avatar);
            if (i.base64.length > 0 && i.avatarId == client.properties.client_flag_avatar) {
                return i;
            }
        }
        return undefined;
    }
    loadAvatar(client) {
        const _this = this;
        return new Promise((resolve, reject) => {
            let avatar = this.resolveCached(client);
            if (avatar) {
                resolve(avatar);
                return;
            }
            _this.downloadAvatar(client).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    console.error("Could not download avatar " + client.properties.client_flag_avatar + " -> " + reason);
                    chat.serverChat().appendError("Fail to download avatar for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => { };
                ft.on_data = (data) => {
                    array = concatenate(Uint8Array, array, data);
                };
                ft.on_complete = () => {
                    let base64 = btoa(String.fromCharCode.apply(null, array));
                    let avatar = new Avatar();
                    avatar.base64 = base64;
                    avatar.clientUid = client.clientUid();
                    avatar.avatarId = client.properties.client_flag_avatar;
                    localStorage.setItem("avatar_" + client.properties.client_unique_identifier, JSON.stringify(avatar));
                    resolve(avatar);
                };
                ft.startTransfer();
            }).catch(reason => {
                console.error("Error while downloading avatar! (" + JSON.stringify(reason) + ")");
                chat.serverChat().appendError("Failed to request avatar download for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                reject(reason);
            });
        });
    }
    generateTag(client) {
        let tag = $.spawn("div");
        let img = $.spawn("img");
        img.attr("alt", "");
        let avatar = this.resolveCached(client);
        if (avatar) {
            img.attr("src", "data:image/png;base64," + avatar.base64);
            tag.append(img);
        }
        else {
            img.attr("src", "file://null");
            let loader = $.spawn("div");
            loader.addClass("avatar_loading");
            tag.append(loader);
            this.loadAvatar(client).then(avatar => {
                img.attr("src", "data:image/png;base64," + avatar.base64);
                console.debug("Avatar " + client.clientNickName() + " loaded :)");
                img.css("opacity", 0);
                tag.append(img);
                loader.animate({ opacity: 0 }, 50, function () {
                    $(this).detach();
                    img.animate({ opacity: 1 }, 150);
                });
            }).catch(reason => {
                console.error("Could not load avatar for " + client.clientNickName() + ". Reason: " + reason);
                //TODO Broken image
                loader.removeClass("avatar_loading").addClass("icon client-warning").attr("tag", "Could not load avatar " + client.clientNickName());
            });
        }
        return tag;
    }
}
//# sourceMappingURL=FileManager.js.map