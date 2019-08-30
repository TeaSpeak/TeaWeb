/// <reference path="BasicCodec.ts"/>

class CodecWrapperWorker extends BasicCodec {
    private _worker: Worker;
    private _workerListener: {token: string, resolve: (data: any) => void}[] = [];
    private _workerCallbackToken = "callback_token";
    private _workerTokeIndex: number = 0;
    type: CodecType;

    private _initialized: boolean = false;
    private _workerCallbackResolve: () => any;
    private _workerCallbackReject: ($: any) => any;

    private _initializePromise: Promise<Boolean>;
    name(): string {
        return "Worker for " + CodecType[this.type] + " Channels " + this.channelCount;
    }

    initialise() : Promise<Boolean> {
        if(this._initializePromise) return this._initializePromise;
        return this._initializePromise = this.spawnWorker().then(() => new Promise<Boolean>((resolve, reject) => {
            const token = this.generateToken();
            this.sendWorkerMessage({
                command: "initialise",
                type: this.type,
                channelCount: this.channelCount,
                token: token
            });

            this._workerListener.push({
                token: token,
                resolve: data => {
                    this._initialized = data["success"] == true;
                    if(data["success"] == true)
                        resolve();
                    else
                        reject(data.message);
                }
            })
        }));
    }

    initialized() : boolean {
        return this._initialized;
    }

    deinitialise() {
        this.sendWorkerMessage({
            command: "deinitialise"
        });
    }

    decode(data: Uint8Array): Promise<AudioBuffer> {
        let token = this.generateToken();
        let result = new Promise<AudioBuffer>((resolve, reject) => {
            this._workerListener.push(
                {
                    token: token,
                    resolve: (data) => {
                        if(data.success) {
                            let array = new Float32Array(data.dataLength);
                            for(let index = 0; index < array.length; index++)
                                array[index] = data.data[index];

                            let audioBuf = this._audioContext.createBuffer(this.channelCount, array.length / this.channelCount, this._codecSampleRate);
                            for (let channel = 0; channel < this.channelCount; channel++) {
                                for (let offset = 0; offset < audioBuf.length; offset++) {
                                    audioBuf.getChannelData(channel)[offset] = array[channel + offset * this.channelCount];
                                }
                            }
                            resolve(audioBuf);
                        } else {
                            reject(data.message);
                        }
                    }
                }
            );
        });
        this.sendWorkerMessage({
            command: "decodeSamples",
            token: token,
            data: data,
            dataLength: data.length
        });
        return result;
    }

    encode(data: AudioBuffer) : Promise<Uint8Array> {
        let token = this.generateToken();
        let result = new Promise<Uint8Array>((resolve, reject) => {
            this._workerListener.push(
                {
                    token: token,
                    resolve: (data) => {
                        if(data.success) {
                            let array = new Uint8Array(data.dataLength);
                            for(let index = 0; index < array.length; index++)
                                array[index] = data.data[index];
                            resolve(array);
                        } else {
                            reject(data.message);
                        }
                    }
                }
            );
        });

        let buffer = new Float32Array(this.channelCount * data.length);
        for (let offset = 0; offset < data.length; offset++) {
            for (let channel = 0; channel < this.channelCount; channel++)
                buffer[offset * this.channelCount + channel] = data.getChannelData(channel)[offset];
        }

        this.sendWorkerMessage({
            command: "encodeSamples",
            token: token,
            data: buffer,
            dataLength: buffer.length
        });
        return result;
    }

    reset() : boolean {
        this.sendWorkerMessage({
            command: "reset"
        });
        return true;
    }

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

    private generateToken() {
        return this._workerTokeIndex++ + "_token";
    }

    private sendWorkerMessage(message: any, transfare?: any[]) {
        message["timestamp"] = Date.now();
        this._worker.postMessage(message, transfare as any);
    }

    private onWorkerMessage(message: any) {
        if(!message["token"]) {
            log.error(LogCategory.VOICE, tr("Invalid worker token!"));
            return;
        }

        if(message["token"] == this._workerCallbackToken) {
            if(message["type"] == "loaded") {
                log.info(LogCategory.VOICE, tr("[Codec] Got worker init response: Success: %o Message: %o"), message["success"], message["message"]);
                if(message["success"]) {
                    if(this._workerCallbackResolve)
                        this._workerCallbackResolve();
                } else {
                    if(this._workerCallbackReject)
                        this._workerCallbackReject(message["message"]);
                }
                this._workerCallbackReject = undefined;
                this._workerCallbackResolve = undefined;
                return;
            } else if(message["type"] == "chatmessage_server") {
                //FIXME?
                return;
            }
            log.debug(LogCategory.VOICE, tr("Costume callback! (%o)"), message);
            return;
        }

        /* lets warn on general packets. Control packets are allowed to "stuck" a bit longer */
        if(Date.now() - message["timestamp"] > 5)
            log.warn(LogCategory.VOICE, tr("Worker message stock time: %d"), Date.now() - message["timestamp"]);

        for(let entry of this._workerListener) {
            if(entry.token == message["token"]) {
                entry.resolve(message);
                this._workerListener.remove(entry);
                return;
            }
        }

        log.error(LogCategory.VOICE, tr("Could not find worker token entry! (%o)"), message["token"]);
    }

    private spawnWorker() : Promise<Boolean> {
        return new Promise<Boolean>((resolve, reject) => {
            this._workerCallbackReject = reject;
            this._workerCallbackResolve = resolve;

            this._worker = new Worker(settings.static("worker_directory", "js/workers/") + "WorkerCodec.js");
            this._worker.onmessage = event => this.onWorkerMessage(event.data);
            this._worker.onerror = (error: ErrorEvent) => reject("Failed to load worker (" + error.message + ")"); //TODO tr
        });
    }
}