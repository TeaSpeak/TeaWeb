import {BasicCodec} from "./BasicCodec";
import {CodecType} from "./Codec";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";

interface ExecuteResult {
    result?: any;
    error?: string;

    success: boolean;

    timings: {
        upstream: number;
        downstream: number;
        handle: number;
    }
}

export class CodecWrapperWorker extends BasicCodec {
    private _worker: Worker;
    private _initialized: boolean = false;
    private _initialize_promise: Promise<Boolean>;

    private _token_index: number = 0;
    readonly type: CodecType;

    private pending_executes: {[key: string]: {
        timeout?: any;

        timestamp_send: number,

        resolve: (_: ExecuteResult) => void;
        reject: (_: any) => void;
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
            if(result.success) {
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
        this.execute("deinitialise", {});
        this._initialized = false;
        this._initialize_promise = undefined;
    }

    async decode(data: Uint8Array): Promise<AudioBuffer> {
        if(!this.initialized()) throw "codec not initialized/initialize failed";

        const result = await this.execute("decodeSamples", { data: data, length: data.length });
        if(result.timings.downstream > 5 || result.timings.upstream > 5 || result.timings.handle > 5)
            log.warn(LogCategory.VOICE, tr("Worker message stock time: {downstream: %dms, handle: %dms, upstream: %dms}"), result.timings.downstream, result.timings.handle, result.timings.upstream);

        if(!result.success) throw result.error || tr("unknown decode error");

        let array = new Float32Array(result.result.length);
        for(let index = 0; index < array.length; index++)
            array[index] = result.result.data[index];

        let audioBuf = this._audioContext.createBuffer(this.channelCount, array.length / this.channelCount, this._codecSampleRate);
        for (let channel = 0; channel < this.channelCount; channel++) {
            for (let offset = 0; offset < audioBuf.length; offset++) {
                audioBuf.getChannelData(channel)[offset] = array[channel + offset * this.channelCount];
            }
        }

        return audioBuf;
    }

    async encode(data: AudioBuffer) : Promise<Uint8Array> {
        if(!this.initialized()) throw "codec not initialized/initialize failed";

        let buffer = new Float32Array(this.channelCount * data.length);
        for (let offset = 0; offset < data.length; offset++) {
            for (let channel = 0; channel < this.channelCount; channel++)
                buffer[offset * this.channelCount + channel] = data.getChannelData(channel)[offset];
        }

        const result = await this.execute("encodeSamples", { data: buffer, length: buffer.length });
        if(result.timings.downstream > 5 || result.timings.upstream > 5)
            log.warn(LogCategory.VOICE, tr("Worker message stock time: {downstream: %dms, handle: %dms, upstream: %dms}"), result.timings.downstream, result.timings.handle, result.timings.upstream);
        if(!result.success) throw result.error || tr("unknown encode error");

        let array = new Uint8Array(result.result.length);
        for(let index = 0; index < array.length; index++)
            array[index] = result.result.data[index];
        return array;
    }

    reset() : boolean {
        //TODO: Await result!
        this.execute("reset", {});
        return true;
    }

    private handle_worker_message(message: any) {
        if(!message["token"]) {
            log.error(LogCategory.VOICE, tr("Invalid worker token!"));
            return;
        }

        if(message["token"] === "notify") {
            /* currently not really used */
             if(message["type"] == "chatmessage_server") {
                //FIXME?
                return;
            }
            log.debug(LogCategory.VOICE, tr("Costume callback! (%o)"), message);
            return;
        }

        const request = this.pending_executes[message["token"]];
        if(typeof request !== "object") {
            log.error(LogCategory.VOICE, tr("Received worker execute result for unknown token (%s)"), message["token"]);
            return;
        }
        delete this.pending_executes[message["token"]];

        const result: ExecuteResult = {
            success: message["success"],
            error: message["error"],
            result: message["result"],
            timings: {
                downstream: message["timestamp_received"] - request.timestamp_send,
                handle: message["timestamp_send"] - message["timestamp_received"],
                upstream: Date.now() - message["timestamp_send"]
            }
        };
        clearTimeout(request.timeout);
        request.resolve(result);
    }

    private handle_worker_error(error: any) {
        log.error(LogCategory.VOICE, tr("Received error from codec worker. Closing worker."));
        for(const token of Object.keys(this.pending_executes)) {
            this.pending_executes[token].reject(error);
            delete this.pending_executes[token];
        }

        this._worker = undefined;
    }

    private execute(command: string, data: any, timeout?: number) : Promise<ExecuteResult> {
        return new Promise<any>((resolve, reject) => {
            if(!this._worker) {
                reject(tr("worker does not exists"));
                return;
            }

            const token = this._token_index++ + "_token";

            const payload = {
                token: token,
                command: command,
                data: data,
            };

            this.pending_executes[token] = {
                timeout: typeof timeout === "number" ? setTimeout(() => reject(tr("timeout for command ") + command), timeout) : undefined,
                resolve: resolve,
                reject: reject,
                timestamp_send: Date.now()
            };

            this._worker.postMessage(payload);
        });
    }

    private async spawn_worker() : Promise<void> {
        this._worker = new Worker("tc-backend/web/workers/codec", { type: "module" });
        this._worker.onmessage = event => this.handle_worker_message(event.data);
        this._worker.onerror = event => this.handle_worker_error(event.error);

        const result = await this.execute("global-initialize", {}, 15000);
        if(!result.success) throw result.error;
    }
}