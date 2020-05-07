import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {ChannelEntry} from "tc-shared/ui/channel";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";
import {IconManager} from "tc-shared/file/Icons";
import {AvatarManager} from "tc-shared/file/Avatars";

export class FileEntry {
    name: string;
    datetime: number;
    type: number;
    size: number;
}

export class FileListRequest {
    path: string;
    entries: FileEntry[];

    callback: (entries: FileEntry[]) => void;
}

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

export interface TransferProvider {
    spawn_download_transfer(key: DownloadKey) : DownloadTransfer;
    spawn_upload_transfer(key: UploadKey) : UploadTransfer;
}

let transfer_provider_: TransferProvider = new class implements TransferProvider {
    spawn_download_transfer(key: TransferKey): DownloadTransfer {
        return new RequestFileDownload(key);
    }

    spawn_upload_transfer(key: TransferKey): UploadTransfer {
        return new RequestFileUpload(key);
    }
};

export function transfer_provider() : TransferProvider {
    return transfer_provider_;
}

export function set_transfer_provider(provider: TransferProvider) {
    transfer_provider_ = provider;
}

export class RequestFileDownload implements DownloadTransfer {
    readonly transfer_key: DownloadKey;

    constructor(key: DownloadKey) {
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

    get_key(): DownloadKey {
        return this.transfer_key;
    }
}

export class RequestFileUpload implements UploadTransfer {
    readonly transfer_key: UploadKey;
    constructor(key: DownloadKey) {
        this.transfer_key = key;
    }

    get_key(): UploadKey {
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
            const buffer = data as BufferSource;
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

export class FileManager extends AbstractCommandHandler {
    handle: ConnectionHandler;
    icons: IconManager;
    avatars: AvatarManager;

    private listRequests: FileListRequest[] = [];
    private pending_download_requests: DownloadKey[] = [];
    private pending_upload_requests: UploadKey[] = [];

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

    handle_command(command: ServerCommand): boolean {
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
    download_file(path: string, file: string, channel?: ChannelEntry, password?: string) : Promise<DownloadKey> {
        const transfer_data: DownloadKey = {
            file_name: file,
            file_path: path,
            client_transfer_id: this.transfer_counter++
        } as any;

        this.pending_download_requests.push(transfer_data);
        return new Promise<DownloadKey>((resolve, reject) => {
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

    upload_file(options: UploadOptions) : Promise<UploadKey> {
        const transfer_data: UploadKey = {
            file_path: options.path,
            file_name: options.name,
            client_transfer_id: this.transfer_counter++,
            total_size: options.size
        } as any;

        this.pending_upload_requests.push(transfer_data);
        return new Promise<UploadKey>((resolve, reject) => {
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
        let transfer: DownloadKey;
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

        (transfer["_callback"] as (val: DownloadKey) => void)(transfer);
        this.pending_download_requests.remove(transfer);
    }

    private notifyStartUpload(json) {
        json = json[0];

        let transfer: UploadKey;
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

        (transfer["_callback"] as (val: UploadKey) => void)(transfer);
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