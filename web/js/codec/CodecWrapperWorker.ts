import {BasicCodec} from "./BasicCodec";
import {CodecType} from "./Codec";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {
    CWCommand,
    CWCommandResponseType,
    CWMessage, CWMessageCommand,
    CWMessageErrorResponse,
    CWMessageResponse
} from "tc-backend/web/codec/CodecWorkerMessages";

type MessageTimings = {
    upstream: number;
    downstream: number;
    handle: number;
};

interface ExecuteResultBase {
    success: boolean;

    timings: MessageTimings
}

interface SuccessExecuteResult<T> extends ExecuteResultBase {
    success: true;
    result: T;
}

interface ErrorExecuteResult extends ExecuteResultBase {
    success: false;
    error: string;
}
type ExecuteResult<T = any> = SuccessExecuteResult<T> | ErrorExecuteResult;

const cachedBufferSize = 1024 * 8;
let cachedBuffers: ArrayBuffer[] = [];
function nextCachedBuffer() : ArrayBuffer {
    if(cachedBuffers.length === 0) {
        return new ArrayBuffer(cachedBufferSize);
    }
    return cachedBuffers.pop();
}

function freeCachedBuffer(buffer: ArrayBuffer) {
    if(cachedBuffers.length > 32)
        return;
    else if(buffer.byteLength < cachedBufferSize)
        return;
    cachedBuffers.push(buffer);
}

export class CodecWrapperWorker extends BasicCodec {
    private _worker: Worker;
    private _initialized: boolean = false;
    private _initialize_promise: Promise<Boolean>;

    private _token_index: number = 0;
    readonly type: CodecType;

    private pending_executes: {[key: string]: {
        timeout?: any;

        timestampSend: number,
        resolve: (_: ExecuteResult) => void;
    }} = {};

    constructor(type: CodecType) {
        super(48000);
        this.type = type;
        switch (type) {
            case CodecType.OPUS_MUSIC:
                this.channelCount = 2;
                break;
            case CodecType.OPUS_VOICE:
                this.channelCount = 1;
                break;
            default:
                throw "invalid codec type!";
        }
    }

    name(): string {
        return "Worker for " + CodecType[this.type] + " Channels " + this.channelCount;
    }

    async initialise() : Promise<Boolean> {
        if(this._initialized) return;
        if(this._initialize_promise)
            return await this._initialize_promise;

        this._initialize_promise = this.spawn_worker().then(() => this.execute("initialise", {
            type: this.type,
            channelCount: this.channelCount,
        })).then(result => {
            if(result.success === true) {
                this._initialized = true;
                return Promise.resolve(true);
            }

            log.error(LogCategory.VOICE, tr("Failed to initialize codec %s: %s"), CodecType[this.type], result.error);
            return Promise.reject(result.error);
        });

        await this._initialize_promise;
    }

    initialized() : boolean {
        return this._initialized;
    }

    deinitialise() {
        this.execute("finalize", {});
        this._initialized = false;
        this._initialize_promise = undefined;
    }

    async decode(data: Uint8Array): Promise<AudioBuffer> {
        if(!this.initialized()) throw "codec not initialized/initialize failed";

        const cachedBuffer = nextCachedBuffer();
        new Uint8Array(cachedBuffer).set(data);

        const result = await this.execute("decode-payload", {
            byteLength: data.byteLength,
            buffer: cachedBuffer,
            byteOffset: 0,
            maxByteLength: cachedBuffer.byteLength
        }, 5000, [ cachedBuffer ]);
        if(result.timings.downstream > 5 || result.timings.upstream > 5 || result.timings.handle > 5)
            log.warn(LogCategory.VOICE, tr("Worker message stock time: {downstream: %dms, handle: %dms, upstream: %dms}"), result.timings.downstream, result.timings.handle, result.timings.upstream);

        if(result.success === false)
            throw result.error;

        const chunkLength = result.result.byteLength / this.channelCount;
        const audioBuffer = this._audioContext.createBuffer(this.channelCount, chunkLength / 4, this._codecSampleRate);

        for(let channel = 0; channel < this.channelCount; channel++) {
            const buffer = new Float32Array(result.result.buffer, result.result.byteOffset + chunkLength * channel, chunkLength / 4);
            audioBuffer.copyToChannel(buffer, channel, 0);
        }

        freeCachedBuffer(result.result.buffer);
        return audioBuffer;
    }

    async encode(data: AudioBuffer) : Promise<Uint8Array> {
        if(!this.initialized()) throw "codec not initialized/initialize failed";

        const buffer = nextCachedBuffer();
        const f32Buffer = new Float32Array(buffer);
        for(let channel = 0; channel < this.channelCount; channel++)
            data.copyFromChannel(f32Buffer, channel, data.length * channel);

        const result = await this.execute("encode-payload", { byteLength: data.length * this.channelCount * 4, buffer: buffer, byteOffset: 0, maxByteLength: buffer.byteLength });

        if(result.timings.downstream > 5 || result.timings.upstream > 5)
            log.warn(LogCategory.VOICE, tr("Worker message stock time: {downstream: %dms, handle: %dms, upstream: %dms}"), result.timings.downstream, result.timings.handle, result.timings.upstream);

        if(result.success === false)
            throw result.error;

        const encodedResult = new Uint8Array(result.result.buffer, result.result.byteOffset, result.result.byteLength).slice(0);
        freeCachedBuffer(result.result.buffer);
        return encodedResult;
    }

    reset() : boolean {
        //TODO: Await result!
        this.execute("reset", {});
        return true;
    }

    private handleWorkerMessage(message: CWMessage) {
        if(message.type === "notify") {
            log.warn(LogCategory.VOICE, tr("Received unknown notify from worker."));
            return;
        } else if(message.type === "error") {
            const request = this.pending_executes[message.token];
            if(typeof request !== "object") {
                log.warn(LogCategory.VOICE, tr("Received worker execute error for unknown token (%s)"), message.token);
                return;
            }
            delete this.pending_executes[message.token];
            clearTimeout(request.timeout);

            const eresponse = message as CWMessageErrorResponse;
            request.resolve({
                success: false,
                timings: {
                    downstream: eresponse.timestampReceived - request.timestampSend,
                    handle: eresponse.timestampSend - eresponse.timestampReceived,
                    upstream: Date.now() - eresponse.timestampSend
                },
                error: eresponse.error
            });
        } else if(message.type === "success") {
            const request = this.pending_executes[message.token];
            if(typeof request !== "object") {
                log.warn(LogCategory.VOICE, tr("Received worker execute result for unknown token (%s)"), message.token);
                return;
            }
            delete this.pending_executes[message.token];
            clearTimeout(request.timeout);

            const response = message as CWMessageResponse;
            request.resolve({
                success: true,
                timings: {
                    downstream: response.timestampReceived - request.timestampSend,
                    handle: response.timestampSend - response.timestampReceived,
                    upstream: Date.now() - response.timestampSend
                },
                result: response.response
            });
        } else if(message.type === "command") {
            log.warn(LogCategory.VOICE, tr("Received command %s from voice worker. This should never happen!"), (message as CWMessageCommand).command);
            return;
        } else {
            log.warn(LogCategory.VOICE, tr("Received unknown message of type %s from voice worker. This should never happen!"), (message as any).type);
            return;
        }
    }

    private handleWorkerError() {
        log.debug(LogCategory.VOICE, tr("Received error from codec worker. Closing worker."));
        for(const token of Object.keys(this.pending_executes)) {
            this.pending_executes[token].resolve({
                success: false,
                error: tr("worker terminated with an error"),
                timings: { downstream: 0, handle: 0, upstream: 0}
            });
            delete this.pending_executes[token];
        }

        this._worker = undefined;
    }

    private execute<T extends keyof CWCommand>(command: T, data: CWCommand[T], timeout?: number, transfer?: Transferable[]) : Promise<ExecuteResult<CWCommandResponseType<T>>> {
        return new Promise<ExecuteResult>(resolve => {
            if(!this._worker) {
                resolve({
                    success: false,
                    error: tr("worker does not exists"),
                    timings: {
                        downstream: 0,
                        handle: 0,
                        upstream: 0
                    }
                });
                return;
            }

            const token = this._token_index++ + "_token";

            this.pending_executes[token] = {
                timeout: typeof timeout === "number" ? setTimeout(() => {
                    delete this.pending_executes[token];
                    resolve({
                        success: false,
                        error: tr("command timed out"),
                        timings: { upstream: 0, handle: 0, downstream: 0 }
                    })
                }, timeout) : undefined,
                resolve: resolve,
                timestampSend: Date.now()
            };

            this._worker.postMessage({
                command: command,
                type: "command",

                payload: data,
                token: token
            } as CWMessageCommand, transfer);
        });
    }

    private async spawn_worker() : Promise<void> {
        this._worker = new Worker("tc-backend/web/workers/codec", { type: "module" });
        this._worker.onmessage = event => this.handleWorkerMessage(event.data);
        this._worker.onerror = () => this.handleWorkerError();

        const result = await this.execute("global-initialize", {}, 15000);
        if(result.success === false)
            throw result.error;
    }
}