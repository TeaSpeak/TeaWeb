import {
    BrowserFileTransferSource,
    BufferTransferSource,
    DownloadTransferTarget,
    FileDownloadTransfer,
    FileTransfer,
    FileTransferState,
    FileUploadTransfer,
    ResponseTransferTarget,
    TextTransferSource,
    TransferProvider,
    TransferSourceType,
    TransferTargetType
} from "tc-shared/file/Transfer";
import * as log from "tc-shared/log";
import {LogCategory, logError} from "tc-shared/log";
import { tr } from "tc-shared/i18n/localize";

TransferProvider.setProvider(new class extends TransferProvider {
    executeFileUpload(transfer: FileUploadTransfer) {
        try {
            if(!transfer.source) throw tr("transfer source is undefined");

            let response: Promise<void>;
            transfer.setTransferState(FileTransferState.CONNECTING);
            if(transfer.source instanceof BrowserFileTransferSourceImpl) {
                response = formDataUpload(transfer, transfer.source.getFile());
            } else if(transfer.source instanceof BufferTransferSourceImpl) {
                response = formDataUpload(transfer, transfer.source.getBuffer());
            } else if(transfer.source instanceof TextTransferSourceImpl) {
                response = formDataUpload(transfer, transfer.source.getArrayBuffer());
            } else {
                transfer.setFailed({
                    error: "io",
                    reason: "unsupported-target"
                }, tr("invalid source type"));
                return;
            }

            /* let the server notify us when the transfer has been finished */
            response.catch(error => {
                if(typeof error !== "string")
                    logError(LogCategory.FILE_TRANSFER, tr("Failed to upload object via HTTPS connection: %o"), error);

                transfer.setFailed({
                    error: "connection",
                    reason: "network-error",
                    extraMessage: typeof error === "string" ? error : tr("Lookup the console")
                }, typeof error === "string" ? error : tr("Lookup the console"));
            });
        } catch (error) {
            if(typeof error !== "string")
                logError(LogCategory.FILE_TRANSFER, tr("Failed to initialize transfer source: %o"), error);

            transfer.setFailed({
                error: "io",
                reason: "failed-to-initialize-target",
                extraMessage: typeof error === "string" ? error : tr("Lookup the console")
            }, typeof error === "string" ? error : tr("Lookup the console"));
        }
    }

    executeFileDownload(transfer: FileDownloadTransfer) {
        try {
            if(!transfer.target) throw tr("transfer target is undefined");

            let response: Promise<void>;
            transfer.setTransferState(FileTransferState.CONNECTING);
            if(transfer.target instanceof ResponseTransferTargetImpl) {
                response = responseFileDownload(transfer, transfer.target);
            } else if(transfer.target instanceof DownloadTransferTargetImpl) {
                response = downloadFileDownload(transfer, transfer.target);
            } else {
                transfer.setFailed({
                    error: "io",
                    reason: "unsupported-target"
                }, tr("invalid transfer target type"));
                return;
            }

            response.then(() => {
                if(!transfer.isFinished()) {
                    /* we still need to stream the body */
                    transfer.setTransferState(FileTransferState.RUNNING);
                }
            }).catch(error => {
                if(typeof error !== "string")
                    logError(LogCategory.FILE_TRANSFER, tr("Failed to download file to response object: %o"), error);

                transfer.setFailed({
                    error: "connection",
                    reason: "network-error",
                    extraMessage: typeof error === "string" ? error : tr("Lookup the console")
                }, typeof error === "string" ? error : tr("Lookup the console"));
            });
        } catch (error) {
            if(typeof error !== "string")
                logError(LogCategory.FILE_TRANSFER, tr("Failed to initialize transfer target: %o"), error);

            transfer.setFailed({
                error: "io",
                reason: "failed-to-initialize-target",
                extraMessage: typeof error === "string" ? error : tr("Lookup the console")
            }, typeof error === "string" ? error : tr("Lookup the console"));
        }
    }

    targetSupported(type: TransferTargetType) {
        switch (type) {
            case TransferTargetType.DOWNLOAD:
            case TransferTargetType.RESPONSE:
                return true;

            default:
                return false;
        }
    }

    async createDownloadTarget(filename: string) {
        return new DownloadTransferTargetImpl(filename);
    }

    async createResponseTarget() {
        return new ResponseTransferTargetImpl();
    }

    sourceSupported(type: TransferSourceType) {
        switch (type) {
            case TransferSourceType.BROWSER_FILE:
            case TransferSourceType.BUFFER:
            case TransferSourceType.TEXT:
                return true;

            default:
                return false;
        }
    }

    async createBufferSource(buffer: ArrayBuffer): Promise<BufferTransferSource> {
        return new BufferTransferSourceImpl(buffer);
    }

    async createBrowserFileSource(file: File): Promise<BrowserFileTransferSource> {
        return new BrowserFileTransferSourceImpl(file);
    }

    async createTextSource(text: string): Promise<TextTransferSource> {
        return new TextTransferSourceImpl(text);
    }
});

function generateTransferURL(transfer: FileTransfer, fileName?: string) {
    const properties = transfer.transferProperties();
    const url = "https://" + properties.addresses[0].serverAddress + ":" + properties.addresses[0].serverPort + "/";
    const parameters = {
        "transfer-key": properties.transferKey
    };
    if(typeof fileName !== "undefined")
        parameters["file-name"] = fileName;
    const query = "?" + Object.keys(parameters).map(e => e + "=" + encodeURIComponent(parameters[e])).join("&");
    return url + query;
}

async function performHTTPSTransfer(transfer: FileTransfer, body: FormData | undefined) : Promise<Response> {
    try {
        const response = await fetch(generateTransferURL(transfer), {
            method: typeof body === "number" ? "GET" : "POST",
            cache: "no-cache",
            mode: "cors",
            body: body,
            headers: {
                /* for legacy TeaSpeak servers (prior to 1.4.15) */
                'transfer-key': transfer.transferProperties().transferKey,
                'download-name': transfer.properties.name,
                /* end legacy */

                "Access-Control-Allow-Headers": "*",
                "Access-Control-Expose-Headers": "*"
            }
        });

        if(!response.ok) {
            throw (response.type == 'opaque' || response.type == 'opaqueredirect' ? "invalid cross origin flag! May target isn't a TeaSpeak server?" : response.statusText || "response is not ok");
        }

        /* the transfer may not running anymore, because of a finished signal from the server (especially on file upload!) */
        if(transfer.isRunning()) {
            response.clone().blob().then(() => {
                if(transfer.isRunning())
                    transfer.setTransferState(FileTransferState.FINISHED);
            }).catch(error => {
                if(typeof error !== "string")
                    logError(LogCategory.FILE_TRANSFER, tr("Failed to transfer data throw a HTTPS request: %o"), error);
                transfer.setFailed({
                    error: "io",
                    reason: "buffer-transfer-failed",
                    extraMessage: typeof error === "string" ? error : tr("lookup the console")
                }, typeof error === "string" ? error : tr("lookup the console"));
            });
        }

        return response;
    } catch (error) {
        if(error instanceof Error && error.message === "Failed to fetch")
            throw "HTTPS download failed";
        throw error;
    }
}

async function responseFileDownload(transfer: FileDownloadTransfer, target: ResponseTransferTargetImpl) {
    target.setResponse(await performHTTPSTransfer(transfer, undefined));
}

async function downloadFileDownload(transfer: FileDownloadTransfer, target: DownloadTransferTargetImpl) {
    const url = generateTransferURL(transfer);
    target.startDownloadURL(url);
}

export class ResponseTransferTargetImpl extends ResponseTransferTarget {
    private response: Response;

    constructor() {
        super();
    }

    hasResponse() {
        return typeof this.response !== "undefined";
    }

    getResponse() {
        return this.response;
    }

    setResponse(response: Response) {
        this.response = response;
    }
}

class DownloadTransferTargetImpl extends DownloadTransferTarget {
    readonly fileName: string | undefined;

    constructor(fileName: string | undefined) {
        super();
        this.fileName = fileName;
    }

    startDownloadURL(url: string) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.target = "_blank";
        if(this.fileName)
            a.download = this.fileName;
        document.body.appendChild(a);

        a.click();
        a.remove();
    }
}

class BrowserFileTransferSourceImpl extends BrowserFileTransferSource {
    private readonly file: File;

    constructor(file: File) {
        super();
        this.file = file;
    }

    getFile(): File {
        return this.file;
    }

    async fileSize(): Promise<number> {
        return this.file.size;
    }
}

class BufferTransferSourceImpl extends BufferTransferSource {
    private readonly buffer: ArrayBuffer;

    constructor(buffer: ArrayBuffer) {
        super();
        this.buffer = buffer;
    }

    getBuffer(): ArrayBuffer {
        return this.buffer;
    }

    async fileSize(): Promise<number> {
        return this.buffer.byteLength;
    }
}

class TextTransferSourceImpl extends TextTransferSource {
    private readonly text: string;
    private buffer: ArrayBuffer;

    constructor(text: string) {
        super();
        this.text = text;
    }

    getText(): string {
        return this.text;
    }


    async fileSize(): Promise<number> {
        return this.getArrayBuffer().byteLength;
    }

    getArrayBuffer() : ArrayBuffer {
        if(this.buffer) return this.buffer;

        const encoder = new TextEncoder();
        this.buffer = encoder.encode(this.text);
        return this.buffer;
    }
}

async function formDataUpload(transfer: FileUploadTransfer, data: File | ArrayBuffer | string) {
    const formData = new FormData();

    if(data instanceof File) {
        formData.append("file", data);
    } else if(typeof(data) === "string") {
        formData.append("file", new Blob([data], { type: "application/octet-stream" }));
    } else {
        const buffer = data as BufferSource;
        formData.append("file", new Blob([buffer], { type: "application/octet-stream" }));
    }

    await performHTTPSTransfer(transfer, formData);
}