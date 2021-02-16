import {Registry} from "../events";
import {CommandResult} from "../connection/ServerConnectionDeclaration";
import {tr} from "../i18n/localize";
import {ErrorCode} from "../connection/ErrorCode";

/* Transfer source types */
export enum TransferSourceType {
    BROWSER_FILE,
    BUFFER,
    TEXT
}

export abstract class TransferSource {
    readonly type: TransferSourceType;

    protected constructor(type: TransferSourceType) {
        this.type = type;
    }

    abstract fileSize() : Promise<number>;
}


export abstract class BrowserFileTransferSource extends TransferSource {
    protected constructor() {
        super(TransferSourceType.BROWSER_FILE);
    }

    abstract getFile() : File;
}

export abstract class BufferTransferSource extends TransferSource {
    protected constructor() {
        super(TransferSourceType.BUFFER);
    }

    abstract getBuffer() : ArrayBuffer;
}

export abstract class TextTransferSource extends TransferSource {
    protected constructor() {
        super(TransferSourceType.TEXT);
    }

    abstract getText() : string;
}
export type TransferSourceSupplier = (transfer: FileUploadTransfer) => Promise<TransferSource>;

/* Transfer target types */
export enum TransferTargetType {
    RESPONSE,
    DOWNLOAD,
    FILE
}

export abstract class TransferTarget {
    readonly type: TransferTargetType;

    protected constructor(type: TransferTargetType) {
        this.type = type;
    }
}

export abstract class DownloadTransferTarget extends TransferTarget {
    protected constructor() {
        super(TransferTargetType.DOWNLOAD);
    }
}

export abstract class ResponseTransferTarget extends TransferTarget {
    protected constructor() {
        super(TransferTargetType.RESPONSE);
    }

    abstract hasResponse() : boolean;
    abstract getResponse() : Response;
}

export abstract class FileTransferTarget extends TransferTarget {
    protected constructor() {
        super(TransferTargetType.FILE);
    }

    abstract getFilePath() : string;

    abstract hasFileName() : boolean;
    abstract getFileName() : string;
}

export type TransferTargetSupplier = (transfer: FileDownloadTransfer) => Promise<TransferTarget>;

export enum FileTransferState {
    PENDING, /* bending because other transfers already going on */
    INITIALIZING,
    CONNECTING,
    RUNNING,

    FINISHED,
    ERRORED,
    CANCELED
}

export enum CancelReason {
    USER_ACTION,
    SERVER_DISCONNECTED
}

export enum FileTransferDirection {
    UPLOAD,
    DOWNLOAD
}

export interface FileTransferEvents {
    "notify_state_updated": { oldState: FileTransferState, newState: FileTransferState },
    "notify_progress": { progress: TransferProgress },
    "notify_transfer_canceled": {}
}

export interface TransferProperties {
    channel_id: number | 0;
    path: string;
    name: string;
}

export interface InitializedTransferProperties {
    serverTransferId: number;
    transferKey: string;

    addresses: {
        serverAddress: string;
        serverPort: number;
    }[];

    protocol: number; /* should be constant 1 */

    seekOffset: number;
    fileSize?: number;
}


export interface TransferInitializeError {
    error: "initialize";

    commandResult: string | CommandResult;
}

export interface TransferConnectError {
    error: "connection";

    reason: "missing-provider" | "provider-initialize-error" | "handle-initialize-error" | "network-error";
    extraMessage?: string;
}

export interface TransferIOError {
    error: "io";

    reason: "unsupported-target" | "failed-to-initialize-target" | "buffer-transfer-failed";
    extraMessage?: string;
}

export interface TransferErrorStatus {
    error: "status";

    status: ErrorCode;
    extraMessage: string;
}

export interface TransferErrorTimeout {
    error: "timeout";
}

export type TransferErrorType = TransferInitializeError | TransferConnectError | TransferIOError | TransferErrorStatus | TransferErrorTimeout;

export interface TransferProgress {
    timestamp: number;

    file_bytes_transferred: number;
    file_current_offset: number;
    file_start_offset: number;
    file_total_size: number;
    network_bytes_received: number;
    network_bytes_send: number;


    network_current_speed: number;
    network_average_speed: number;
}

export interface TransferTimings {
    timestampScheduled: number;
    timestampExecuted: number;
    timestampTransferBegin: number;
    timestampEnd: number;
}

export interface FinishedFileTransfer {
    readonly clientTransferId: number;
    readonly timings: TransferTimings;

    readonly properties: TransferProperties;
    readonly direction: FileTransferDirection;

    readonly state: FileTransferState.CANCELED | FileTransferState.FINISHED | FileTransferState.ERRORED;

    /* only set if state is ERRORED */
    readonly transferError?: TransferErrorType;
    readonly transferErrorMessage?: string;

    readonly bytesTransferred: number;
}

export class FileTransfer {
    readonly events: Registry<FileTransferEvents>;
    readonly clientTransferId: number;
    readonly direction: FileTransferDirection;
    readonly properties: TransferProperties;
    readonly timings: TransferTimings;

    lastStateUpdate: number;
    private cancelReason: CancelReason;
    private transferProperties_: InitializedTransferProperties;
    private transferError_: TransferErrorType;
    private transferErrorMessage_: string;
    private transferState_: FileTransferState;
    private progress_: TransferProgress;

    protected constructor(direction, clientTransferId, properties) {
        this.direction = direction;
        this.clientTransferId = clientTransferId;
        this.properties = properties;
        this.timings = {
            timestampExecuted: 0,
            timestampTransferBegin: 0,
            timestampEnd: 0,
            timestampScheduled: Date.now()
        };
        this.setTransferState(FileTransferState.PENDING);

        this.events = new Registry<FileTransferEvents>();
    }

    destroy() {
        if(!this.isFinished()) {
            this.setTransferState(FileTransferState.CANCELED);
        }

        this.events.destroy();
    }

    isRunning() {
        return this.transferState_ === FileTransferState.CONNECTING || this.transferState_ === FileTransferState.RUNNING || this.transferState_ === FileTransferState.INITIALIZING;
    }

    isPending() {
        return this.transferState_ === FileTransferState.PENDING;
    }

    isFinished() {
        return this.transferState_ === FileTransferState.FINISHED || this.transferState_ === FileTransferState.ERRORED || this.transferState_ === FileTransferState.CANCELED;
    }

    transferState() {
        return this.transferState_;
    }

    transferProperties() : InitializedTransferProperties | undefined {
        return this.transferProperties_;
    }

    currentError() : TransferErrorType | undefined {
        return this.transferError_;
    }

    currentErrorMessage() : string | undefined {
        return this.transferErrorMessage_;
    }

    lastProgressInfo() : TransferProgress | undefined {
        return this.progress_;
    }

    setFailed(error: TransferErrorType, asMessage: string) {
        if(this.isFinished())
            throw tr("invalid transfer state");

        if(typeof asMessage !== "string")
            debugger;

        this.transferErrorMessage_ = asMessage;
        this.transferError_ = error;
        this.setTransferState(FileTransferState.ERRORED);
    }

    setProperties(properties: InitializedTransferProperties) {
        if(this.transferState() !== FileTransferState.INITIALIZING)
            throw tr("invalid transfer state");

        this.transferProperties_ = properties;
        this.setTransferState(FileTransferState.CONNECTING);
    }

    requestCancel(reason: CancelReason) {
        if(this.isFinished()) {
            throw tr("invalid transfer state");
        }

        this.cancelReason = reason;
        this.events.fire("notify_transfer_canceled");
        this.setTransferState(FileTransferState.CANCELED);
    }

    setTransferState(newState: FileTransferState) {
        if(this.transferState_ === newState) {
            return;
        }

        const newIsFinishedState = newState === FileTransferState.CANCELED || newState === FileTransferState.ERRORED || newState === FileTransferState.FINISHED;
        try {
            switch (this.transferState_) {
                case undefined:
                    if(newState !== FileTransferState.PENDING)
                        throw void 0;
                    this.timings.timestampScheduled = Date.now();
                    break;
                case FileTransferState.PENDING:
                    if(newState !== FileTransferState.INITIALIZING && !newIsFinishedState)
                        throw void 0;
                    break;
                case FileTransferState.INITIALIZING:
                    if(newState !== FileTransferState.CONNECTING && !newIsFinishedState)
                        throw void 0;
                    break;
                case FileTransferState.CONNECTING:
                    if(newState !== FileTransferState.RUNNING && !newIsFinishedState)
                        throw void 0;
                    break;
                case FileTransferState.RUNNING:
                    if(!newIsFinishedState)
                        throw void 0;
                    break;
                case FileTransferState.FINISHED:
                case FileTransferState.CANCELED:
                case FileTransferState.ERRORED:
                    if(this.isFinished()) {
                        throw void 0;
                    }
                    this.timings.timestampEnd = Date.now();
                    break;
            }

            switch (newState) {
                case FileTransferState.INITIALIZING:
                    this.timings.timestampExecuted = Date.now();
                    break;

                case FileTransferState.RUNNING:
                    this.timings.timestampTransferBegin = Date.now();
                    break;

                case FileTransferState.FINISHED:
                case FileTransferState.CANCELED:
                case FileTransferState.ERRORED:
                    this.timings.timestampEnd = Date.now();
                    break;
            }
        } catch (e) {
            throw "invalid transfer state transform from " + this.transferState_ + " to " + newState;
        }

        const oldState = this.transferState_;
        this.transferState_ = newState;
        this.events?.fire("notify_state_updated", { oldState: oldState, newState: newState });
    }

    updateProgress(progress: TransferProgress) {
        this.progress_ = progress;
        this.events.fire("notify_progress", { progress: progress });
    }

    awaitFinished() : Promise<void> {
        return new Promise(resolve => {
            if(this.isFinished()) {
                resolve();
                return;
            }

            const listenerStatus = () => {
                if(this.isFinished()) {
                    this.events.off("notify_state_updated", listenerStatus);
                    resolve();
                }
            };
            this.events.on("notify_state_updated", listenerStatus);
        });
    }
}

export class FileDownloadTransfer extends FileTransfer {
    public readonly targetSupplier: TransferTargetSupplier;
    public target: TransferTarget;

    constructor(clientTransferId, properties: TransferProperties, targetSupplier) {
        super(FileTransferDirection.DOWNLOAD, clientTransferId, properties);
        this.targetSupplier = targetSupplier;
    }
}

export class FileUploadTransfer extends FileTransfer {
    public readonly sourceSupplier: TransferSourceSupplier;
    public source: TransferSource;
    public fileSize: number;

    constructor(clientTransferId, properties: TransferProperties, sourceSupplier) {
        super(FileTransferDirection.UPLOAD, clientTransferId, properties);
        this.sourceSupplier = sourceSupplier;
    }
}

export abstract class TransferProvider {
    private static instance_;
    public static provider() : TransferProvider { return this.instance_; }
    public static setProvider(provider: TransferProvider) {
        this.instance_ = provider;
    }

    abstract executeFileDownload(transfer: FileDownloadTransfer);
    abstract executeFileUpload(transfer: FileUploadTransfer);

    abstract targetSupported(type: TransferTargetType);
    abstract sourceSupported(type: TransferSourceType);

    async createResponseTarget() : Promise<ResponseTransferTarget> { throw tr("response target isn't supported"); }
    async createDownloadTarget(filename?: string) : Promise<DownloadTransferTarget> { throw tr("download target isn't supported"); }
    async createFileTarget(path?: string, filename?: string) : Promise<FileTransferTarget> { throw tr("file target isn't supported"); }

    async createBufferSource(buffer: ArrayBuffer) : Promise<BufferTransferSource> { throw tr("buffer source isn't supported"); }
    async createTextSource(text: string) : Promise<TextTransferSource> { throw tr("text source isn't supported"); };
    async createBrowserFileSource(file: File) : Promise<BrowserFileTransferSource> { throw tr("browser file source isn't supported"); }
}