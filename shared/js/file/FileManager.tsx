import {LogCategory, logError, logWarn} from "tc-shared/log";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";
import {AvatarManager} from "tc-shared/file/LocalAvatars";
import {
    CancelReason,
    FileDownloadTransfer,
    FileTransfer,
    FileTransferDirection,
    FileTransferState,
    FileUploadTransfer,
    FinishedFileTransfer,
    InitializedTransferProperties,
    TransferProvider,
    TransferSourceSupplier,
    TransferTargetSupplier,
} from "tc-shared/file/Transfer";
import {Registry} from "tc-shared/events";
import {tr, tra} from "tc-shared/i18n/localize";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export enum FileType {
    DIRECTORY = 0,
    FILE = 1
}

export interface FileInfo {
    name: string;
    type: FileType;

    datetime: number;
    size: number;

    empty: boolean;
}

type PendingFileList = {
    path: string;
    channelId: number;

    currentFiles: FileInfo[];

    resultPromise: Promise<FileInfo[]>;
    callbackResolve: (files: FileInfo[]) => void;
    callbackReject: (error) => void;
}

type PendingFileInfo = {
    returnCode: string;

    finished: boolean;
    currentFiles: FileInfo[];
}

class FileCommandHandler extends AbstractCommandHandler {
    readonly manager: FileManager;
    readonly pendingFileLists: PendingFileList[] = [];
    readonly pendingFileInfos: PendingFileInfo[] = [];
    private fileInfoCodeIndex = 0;

    constructor(manager: FileManager) {
        super(manager.connectionHandler.serverConnection);
        this.manager = manager;

        this.connection.getCommandHandler().registerHandler(this);
    }

    destroy() {
        if(this.connection) {
            const hboss = this.connection.getCommandHandler();
            if(hboss) hboss.unregisterHandler(this);
        }
    }

    registerFileList(path: string, channelId: number, callbackExecute: (resolve, reject) => void) : Promise<FileInfo[]> {
        const knownQuery = this.pendingFileLists.find(e => e.path === path && e.channelId === channelId);
        if(knownQuery) return knownQuery.resultPromise;

        const query = {} as PendingFileList;

        query.path = path;
        query.channelId = channelId;
        query.currentFiles = [];

        this.pendingFileLists.push(query);

        query.resultPromise = new Promise<FileInfo[]>((resolve, reject) => {
            const cleanup = () => {
                this.pendingFileLists.remove(query);
            };

            query.callbackReject = error => { cleanup(); reject(error); };
            query.callbackResolve = result => { cleanup(); resolve(result); };
            callbackExecute(query.callbackResolve, query.callbackReject);
        });

        return query.resultPromise;
    }

    registerFileInfo() : string {
        const query = {} as PendingFileInfo;

        query.currentFiles = [];
        query.finished = false;
        query.returnCode = "finfo-" + ++this.fileInfoCodeIndex;

        this.pendingFileInfos.push(query);
        return query.returnCode;
    }

    finishFileInfo(returnCode: string) : FileInfo[] | "unknown-request" | "unfinished-request" {
        const qIndex = this.pendingFileInfos.findIndex(e => e.returnCode === returnCode);
        if(qIndex === -1) {
            return "unknown-request";
        }

        const [ query ] = this.pendingFileInfos.splice(qIndex, 1);
        if(!query.finished) {
            return "unfinished-request";
        }

        return query.currentFiles;
    }

    handle_command(command: ServerCommand): boolean {
        switch (command.command) {
            case "notifystartdownload":
                this.handleCommandNotifyStartDownload(command.arguments);
                return true;

            case "notifystartupload":
                this.handleCommandNotifyStartUpload(command.arguments);
                return true;

            case "notifyfilelist":
                this.handleNotifyFileList(command.arguments);
                return true;

            case "notifyfilelistfinished":
                this.handleNotifyFileListFinished(command.arguments);
                return true;

            case "notifyfileinfo":
                this.handleNotifyFileInfo(command.arguments);
                return true;

            case "notifyfiletransferstarted":
                this.handleNotifyTransferStarted(command.arguments);
                return true;

            case "notifyfileinfofinished":
                this.handleNotifyFileInfoFinished(command.arguments);
                return true;

            case "notifyfiletransferprogress":
                this.handleNotifyFileTransferProgress(command.arguments);
                return true;

            case "notifystatusfiletransfer":
                this.handleNotifyStatusFileTransfer(command.arguments);
                return true;

        }
        return false;
    }

    private handleCommandNotifyStartDownload(command: any[]) {
        const data = command[0];

        const transfer = this.manager.findTransfer(parseInt(data["clientftfid"]));
        if(!transfer) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file transfer start notification for unknown transfer (%s)"), data["clientftfid"]);
            return;
        }

        const properties = {
            fileSize: parseInt(data["size"]),
            seekOffset: parseInt(data["seekpos"]),

            protocol: parseInt(data["proto"]),

            addresses: (!data["ip"] ? "0.0.0.0" : data["ip"]).split(",").filter(e => !!e).map(e => {
                return {
                    serverAddress: e,
                    serverPort: parseInt(data["port"])
                };
            }),

            serverTransferId: parseInt(data["serverftfid"]),
            transferKey: data["ftkey"]
        };
        this.fixIPAddresses(properties);

        transfer.lastStateUpdate = Date.now();
        transfer.setProperties(properties);
    }

    private fixIPAddresses(properties: InitializedTransferProperties) {
        for(const address of properties.addresses) {
            if(address.serverAddress === '0.0.0.0') {
                const sconnection = this.manager.connectionHandler.serverConnection;
                address.serverAddress = (sconnection.connectionProxyAddress() || sconnection.remote_address()).host;
            }
        }

    }

    private handleCommandNotifyStartUpload(command: any[]) {
        const data = command[0];

        const transfer = this.manager.findTransfer(parseInt(data["clientftfid"])) as FileUploadTransfer;
        if(!transfer) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file transfer start notification for unknown transfer (%s)"), data["clientftfid"]);
            return;
        }

        const properties = {
            seekOffset: parseInt(data["seekpos"]),
            fileSize: transfer.fileSize,
            protocol: parseInt(data["proto"]),

            addresses: (!data["ip"] ? "0.0.0.0" : data["ip"]).split(",").filter(e => !!e).map(e => {
                return {
                    serverAddress: e,
                    serverPort: parseInt(data["port"])
                };
            }),

            serverTransferId: parseInt(data["serverftfid"]),
            transferKey: data["ftkey"]
        };
        this.fixIPAddresses(properties);

        transfer.lastStateUpdate = Date.now();
        transfer.setProperties(properties);
    }

    private handleNotifyTransferStarted(data) {
        data = data[0];

        const transfer = this.manager.findTransfer(parseInt(data["clientftfid"])) as FileUploadTransfer;
        if(!transfer) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file transfer start notification for unknown transfer (%s)"), data["clientftfid"]);
            return;
        }

        /* the server is some knowledge ahead of us (usually happens when we use fetch) */
        if(transfer.transferState() === FileTransferState.CONNECTING)
            transfer.setTransferState(FileTransferState.RUNNING);
    }


    private handleNotifyFileTransferProgress(data) {
        data = data[0];

        const transfer = this.manager.findTransfer(parseInt(data["clientftfid"])) as FileUploadTransfer;
        if(!transfer) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file transfer progress notification for unknown transfer (%s)"), data["clientftfid"]);
            return;
        }

        transfer.lastStateUpdate = Date.now();
        transfer.updateProgress({
            timestamp: Date.now(),

            file_bytes_transferred: parseInt(data["file_bytes_transferred"]),
            file_current_offset: parseInt(data["file_current_offset"]),
            file_start_offset: parseInt(data["file_start_offset"]),
            file_total_size: parseInt(data["file_total_size"]),
            network_bytes_received: parseInt(data["network_bytes_received"]),
            network_bytes_send: parseInt(data["network_bytes_send"]),

            network_current_speed: parseInt(data["network_current_speed"]),
            network_average_speed: parseInt(data["network_average_speed"])
        });
    }

    private handleNotifyStatusFileTransfer(data) {
        data = data[0];

        const transfer = this.manager.findTransfer(parseInt(data["clientftfid"])) as FileUploadTransfer;
        if(!transfer) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file transfer status notification for unknown transfer (%s)"), data["clientftfid"]);
            return;
        }

        transfer.lastStateUpdate = Date.now();
        const code = parseInt(data["status"]) as ErrorCode;
        if(code !== ErrorCode.FILE_TRANSFER_COMPLETE) {
            transfer.setFailed({
                error: "status",

                extraMessage: data["msg"],
                status: code
            }, data["msg"]);
        } else {
            /* We're not setting finished here. Even thou the server has finished the transfer, we might still have some work left.
            *  This only applies to downloads since when we're uploading and the server is happy everybody is happy
            **/
            if(transfer.direction === FileTransferDirection.UPLOAD)
                transfer.setTransferState(FileTransferState.FINISHED);
        }
    }

    private handleNotifyFileList(data: any[]) {
        const query = this.pendingFileLists.find(e => e.path === data[0]["path"] && (e.channelId === parseInt(data[0]["cid"]) || e.channelId === undefined && !data[0]["cid"]));
        if(!query) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file list for not request path: %s (channel %s)"), data[0]["path"], data[0]["cid"]);
            return;
        }

        for(const entry of data) {
            query.currentFiles.push({
                datetime: parseInt(entry["datetime"]),
                name: entry["name"],
                size: parseInt(entry["size"]),
                type: parseInt(entry["type"]),
                empty: entry["empty"] === "1"
            });
        }
    }

    private handleNotifyFileListFinished(data) {
        const query = this.pendingFileLists.find(e => e.path === data[0]["path"] && (e.channelId === parseInt(data[0]["cid"]) || e.channelId === undefined && !data[0]["cid"]));
        if(!query) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file list finish for not request path: %s (channel %s)"), data[0]["path"], data[0]["cid"]);
            return;
        }

        query.callbackResolve(query.currentFiles);
    }

    private handleNotifyFileInfo(data: any[]) {
        const query = this.pendingFileInfos.find(e => e.returnCode === data[0]["return_code"]);
        if(!query) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file info for unknown return code: %s"), data[0]["return_code"]);
            return;
        }
        if(query.finished) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file info for already finished return code: %s"), data[0]["return_code"]);
            return;
        }

        for(const entry of data) {
            query.currentFiles.push({
                datetime: parseInt(entry["datetime"]),
                name: entry["name"],
                size: parseInt(entry["size"]),
                type: parseInt(entry["type"]),
                empty: entry["empty"] === "1"
            });
        }
    }

    private handleNotifyFileInfoFinished(data) {
        const query = this.pendingFileInfos.find(e => e.returnCode === data[0]["return_code"]);
        if(!query) {
            logWarn(LogCategory.FILE_TRANSFER, tr("Received file info for unknown return code: %s"), data[0]["return_code"]);
            return;
        }

        query.finished = true;
    }
}

export type InitializeUploadOptions = {
    path: string;
    name: string;

    channel?: number;
    channelPassword?: string;

    source: TransferSourceSupplier;

    processCommandResult?: boolean
};

export type InitializeDownloadOptions = {
    path: string;
    name: string;

    channel?: number;
    channelPassword?: string;

    targetSupplier: TransferTargetSupplier;
};

export interface FileManagerEvents {
    notify_transfer_registered: {
        transfer: FileTransfer
    }
}

export class FileManager {
    private static readonly MAX_CONCURRENT_TRANSFERS = 6;

    readonly connectionHandler: ConnectionHandler;
    readonly avatars: AvatarManager;
    readonly events : Registry<FileManagerEvents>;
    readonly finishedTransfers: FinishedFileTransfer[] = [];

    private readonly commandHandler: FileCommandHandler;
    private readonly registeredTransfers_: ({ transfer: FileTransfer, executeCallback: () => Promise<void>, finishPromise: Promise<void> })[] = [];
    private clientTransferIdIndex = 0;
    private scheduledTransferUpdate;
    private transerUpdateIntervalId;

    constructor(connection) {
        this.connectionHandler = connection;
        this.commandHandler = new FileCommandHandler(this);

        this.events = new Registry<FileManagerEvents>();
        this.avatars = new AvatarManager(this);

        this.transerUpdateIntervalId = setInterval(() => this.scheduleTransferUpdate(), 1000);
    }

    destroy() {
        this.commandHandler.destroy();
        this.registeredTransfers_.forEach(e => e.transfer.requestCancel(CancelReason.SERVER_DISCONNECTED));
        /* all transfers should be unregistered now, or will be soonly */

        this.avatars.destroy();
        clearInterval(this.transerUpdateIntervalId);
    }

    requestFileList(path: string, channelId?: number, channelPassword?: string, processResult?: boolean) : Promise<FileInfo[]> {
        return this.commandHandler.registerFileList(path, channelId | 0, (resolve, reject) => {
            this.connectionHandler.serverConnection.send_command("ftgetfilelist", {
                path: path,
                cid: channelId || "0",
                cpw: channelPassword
            }, {
                process_result: typeof processResult !== "boolean" || processResult
            }).then(() => {
                reject(tr("Missing server file list response"));
            }).catch(error => {
                if(error instanceof CommandResult && error.id == ErrorCode.DATABASE_EMPTY_RESULT) {
                    resolve([]);
                    return;
                }
                reject(error);
            });
        });
    }

    requestFileInfo(files: { channelId?: number, channelPassword?: string, path: string }[]) : Promise<(FileInfo | CommandResult)[]> {
        if(files.length === 0) {
            return Promise.resolve([]);
        }

        const returnCode = this.commandHandler.registerFileInfo();
        const infos = files.map(e => {
            return {
                cid: e.channelId | 0,
                cpw: e.channelPassword,
                name: e.path
            };
        });
        infos[0]["return_code"] = returnCode;

        return this.connectionHandler.serverConnection.send_command("ftgetfileinfo", infos, { flagset: ["as-list"], process_result: false })
            .catch(error => Promise.resolve(error)).then(cmdResult => {
            const bulks = cmdResult.getBulks();
            if(bulks.length != files.length) {
                return Promise.reject(tr("response bulk miss match"));
            }

            const infos = this.commandHandler.finishFileInfo(returnCode);
            if(!Array.isArray(infos)) {
                if(infos === "unfinished-request") {
                    return Promise.reject(tr("the server failed to full fill the request"));
                } else {
                    return Promise.reject(tr("request gone away while parsing response"));
                }
            }

            let result: (FileInfo | CommandResult)[] = [];
            for(let index = 0; index < files.length; index++) {
                if(bulks[index].id === 0) {
                    const info = infos.pop_front();
                    if(!info) {
                        return Promise.reject(tr("Missing info for bulk ") + index);
                    }

                    result.push(info);
                } else {
                    result.push(bulks[index]);
                }
            }
            return result;
        });
    }

    async deleteFile(props: {
        name: string,
        path?: string;
        cid?: number;
        cpw?: string;
    }) : Promise<void> {
        if(!props.name)
            throw "invalid name!";

        await this.connectionHandler.serverConnection.send_command("ftdeletefile", {
            cid: props.cid || 0,
            cpw: props.cpw,
            path: props.path || "",
            name: props.name
        });
    }

    async deleteIcon(iconId: number) : Promise<void> {
        if(iconId <= 1000) {
            throw "invalid id!";
        }

        await this.deleteFile({
            name: '/icon_' + (iconId >>> 0)
        });
    }

    registeredTransfers() : FileTransfer[] {
        return this.registeredTransfers_.map(e => e.transfer);
    }

    findTransfer(id: number) : FileTransfer;
    findTransfer(channelId: number, path: string, name: string) : FileTransfer;

    findTransfer(channelIdOrId: number, path?: string, name?: string) : FileTransfer {
        if(typeof path !== "string")
            return this.registeredTransfers_.find(e => e.transfer.clientTransferId === channelIdOrId)?.transfer;
        else
            return this.registeredTransfers_.find(e =>
                e.transfer.properties.channel_id === channelIdOrId &&
                e.transfer.properties.name === name &&
                e.transfer.properties.path === path
            )?.transfer;
    }

    initializeFileDownload(options: InitializeDownloadOptions) : FileDownloadTransfer {
        const transfer = new FileDownloadTransfer(++this.clientTransferIdIndex, {
            channel_id: options.channel | 0,
            name: options.name,
            path: options.path
        }, options.targetSupplier);

        const initializeCallback = async () => {
            try {
                transfer.target = await transfer.targetSupplier(transfer);
                if(!transfer.target) {
                    throw tr("Failed to create transfer target");
                }

                transfer.lastStateUpdate = Date.now();
                await this.connectionHandler.serverConnection.send_command("ftinitdownload", {
                    "path": options.path,
                    "name": options.name,
                    "cid": options.channel ? options.channel : "0",
                    "cpw": options.channelPassword,
                    "clientftfid": transfer.clientTransferId,
                    "seekpos": 0,
                    "proto": 1
                }, { process_result: false });

                if(transfer.transferState() === FileTransferState.INITIALIZING) {
                    throw tr("missing transfer start notify");
                }
            } catch (error) {
                transfer.setFailed({
                    error: "initialize",
                    commandResult: error
                }, error instanceof CommandResult ? error.formattedMessage() : typeof error === "string" ? error : tr("Lookup the console"));
            }
        };

        this.registerTransfer(transfer, initializeCallback);
        return transfer;
    }

    initializeFileUpload(options: InitializeUploadOptions) : FileUploadTransfer {
        const transfer = new FileUploadTransfer( ++this.clientTransferIdIndex, {
            channel_id: options.channel | 0,
            name: options.name,
            path: options.path
        }, options.source);

        const initializeCallback = async () => {
            try {
                transfer.source = await transfer.sourceSupplier(transfer);
                if(!transfer.source) {
                    throw tr("Failed to create transfer source");
                }

                transfer.lastStateUpdate = Date.now();
                transfer.fileSize = await transfer.source.fileSize();
                await this.connectionHandler.serverConnection.send_command("ftinitupload", {
                    "path": options.path,
                    "name": options.name,
                    "cid": options.channel ? options.channel : "0",
                    "cpw": options.channelPassword,
                    "clientftfid": transfer.clientTransferId,
                    "size": transfer.fileSize,
                    "overwrite": true,
                    "resume": false,
                    "proto": 1
                }, { process_result: options.processCommandResult });

                if(transfer.transferState() === FileTransferState.INITIALIZING) {
                    throw tr("missing transfer start notify");
                }

            } catch (error) {
                transfer.setFailed({
                    error: "initialize",
                    commandResult: error
                }, error instanceof CommandResult ? error.formattedMessage() : typeof error === "string" ? error : tr("lookup the console"));
            }
        };

        this.registerTransfer(transfer, initializeCallback);
        return transfer;
    }

    private registerTransfer(transfer: FileTransfer, callbackInitialize: (transfer: FileTransfer) => Promise<void>) {
        transfer.lastStateUpdate = Date.now();
        this.registeredTransfers_.push({
            transfer: transfer,
            executeCallback: async () => {
                await callbackInitialize(transfer); /* noexcept */
                if(transfer.transferState() !== FileTransferState.CONNECTING) {
                    return;
                }
                
                try {
                    const provider = TransferProvider.provider();
                    if(!provider) {
                        transfer.setFailed({
                            error: "connection",
                            reason: "missing-provider"
                        }, tr("Missing transfer provider"));
                        return;
                    }

                    if(transfer instanceof FileDownloadTransfer) {
                        provider.executeFileDownload(transfer);
                    } else if(transfer instanceof FileUploadTransfer) {
                        provider.executeFileUpload(transfer);
                    } else {
                        throw tr("unknown transfer type");
                    }
                } catch (error) {
                    const message = typeof error === "string" ? error : error instanceof Error ? error.message : tr("Unknown error");
                    transfer.setFailed({
                        error: "connection",
                        reason: "provider-initialize-error",
                        extraMessage: message
                    }, message);
                }
            },
            finishPromise: new Promise(resolve => {
                const unregisterTransfer = () => {
                    transfer.events.off("notify_state_updated", stateListener);
                    transfer.events.off("notify_transfer_canceled", unregisterTransfer);

                    const index = this.registeredTransfers_.findIndex(e => e.transfer === transfer);
                    if(index === -1) {
                        logError(LogCategory.FILE_TRANSFER, tr("Missing file transfer in file transfer list!"));
                        return;
                    } else {
                        this.registeredTransfers_.splice(index, 1);
                        this.scheduleTransferUpdate();
                    }

                    /* register transfer for the finished/completed transfers */
                    const state = transfer.transferState();
                    if(state === FileTransferState.FINISHED || state === FileTransferState.ERRORED || state === FileTransferState.CANCELED) {
                        this.finishedTransfers.push({
                            state: state,

                            clientTransferId: transfer.clientTransferId,
                            direction: transfer.direction,
                            properties: transfer.properties,
                            timings: Object.assign({}, transfer.timings),

                            bytesTransferred: state === FileTransferState.FINISHED ? transfer.transferProperties().fileSize - transfer.transferProperties().seekOffset : 0,

                            transferError: transfer.currentError(),
                            transferErrorMessage: transfer.currentErrorMessage(),
                        });
                    } else {
                        logWarn(LogCategory.FILE_TRANSFER, tra("File transfer finished callback called with invalid transfer state ({0})", FileTransferState[state]));
                    }

                    /* destroy the transfer after all events have been fired */
                    setTimeout(() => transfer.destroy(), 250);
                };

                const stateListener = () => {
                    if(transfer.isFinished()) {
                        unregisterTransfer();
                        resolve();
                    }
                };

                transfer.events.on("notify_state_updated", stateListener);
                transfer.events.on("notify_transfer_canceled", unregisterTransfer);
                stateListener();
            })
        });

        this.events.fire("notify_transfer_registered", { transfer: transfer });
        this.scheduleTransferUpdate();
    }

    private scheduleTransferUpdate() {
        if(this.scheduledTransferUpdate) {
            return;
        }

        this.scheduledTransferUpdate = setTimeout(() => {
            this.scheduledTransferUpdate = undefined;
            this.updateRegisteredTransfers();
        }, 0);
    }

    private updateRegisteredTransfers() {
        /* drop timed out transfers */
        {
            const timeout = Date.now() - 10 * 1000;
            const timedOutTransfers = this.registeredTransfers_.filter(entry => {
                if(entry.transfer.lastStateUpdate >= timeout) {
                    return false;
                }

                switch (entry.transfer.transferState()) {
                    case FileTransferState.PENDING:
                        /* Transfer is locally pending because of some limits */
                        return false;

                    case FileTransferState.INITIALIZING:
                        if(entry instanceof FileDownloadTransfer) {
                            if(!entry.target) {
                                /* We're still prompting the user for a target file location. Lets apply a timeout of 1 min. */
                                if(entry.transfer.lastStateUpdate < Date.now() + 60 * 1000) {
                                    return false;
                                }
                            }
                        }
                        return true;

                    case FileTransferState.CONNECTING:
                    case FileTransferState.RUNNING:
                        /* These states can time out */
                        return true;

                    case FileTransferState.CANCELED:
                    case FileTransferState.ERRORED:
                    case FileTransferState.FINISHED:
                        /* Transfer finished, we can't have a timeout */
                        return false;

                    default:
                        /* Should never happen but just in case time it out */
                        return true;
                }
            });

            for(const entry of timedOutTransfers) {
                entry.transfer.setFailed({
                    error: "timeout"
                }, tr("Timed out"));
            }
        }

        /* check if we could start a new transfer */
        {
            let pendingTransfers = this.registeredTransfers_.filter(e => e.transfer.isPending());
            let runningTransfers = this.registeredTransfers_.filter(e => e.transfer.isRunning());
            while(runningTransfers.length < FileManager.MAX_CONCURRENT_TRANSFERS && pendingTransfers.length > 0) {
                const transfer = pendingTransfers.pop_front();
                runningTransfers.push(transfer);

                transfer.transfer.setTransferState(FileTransferState.INITIALIZING);
                setTimeout(transfer.executeCallback, 0);
            }

            if(runningTransfers.length !== 0) {
                /* start a new transfer as soon the old has been finished */
                Promise.race([ runningTransfers.map(e => e.finishPromise) ]).then(() => {
                    this.scheduleTransferUpdate();
                });
            }
        }
    }
}

