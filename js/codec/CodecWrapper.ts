/// <reference path="BasicCodec.ts"/>

enum CodecWorkerType {
    WORKER_OPUS
}

class CodecWrapper extends BasicCodec {
    private _worker: Worker;
    private _workerListener: {token: string, resolve: (data: any) => void}[] = [];
    private _workerCallbackToken = "callback_token";
    private _workerTokeIndex: number = 0;
    type: CodecWorkerType;

    name(): string {
        return "Worker for " + CodecWorkerType[this.type] + " Channels " + this.channelCount;
    }

    initialise() {
        this.spawnWorker();
        this.sendWorkerMessage({
            command: "initialise",
            type: this.type,
            channelCount: this.channelCount
        });
    }

    deinitialise() {
        this.sendWorkerMessage({
            command: "deinitialise"
        });
    }

    decode(data: Uint8Array): Promise<AudioBuffer> {
        let token = this._workerTokeIndex++ + "_token";
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
                            for (let channel = 0; channel < this.channelCount; channel++)
                                for (let offset = 0; offset < audioBuf.length; offset++)
                                        audioBuf.getChannelData(channel)[offset] = array[channel * audioBuf.length + offset];
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
        let token = this._workerTokeIndex++ + "_token";
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
        //FIXME test if this is right!

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

    constructor(type: CodecWorkerType, channelCount: number) {
        super(48000);
        this.type = type;
        this.channelCount = channelCount;
    }

    private sendWorkerMessage(message: any, transfare?: any[]) {
        this._worker.postMessage(JSON.stringify(message), transfare);
    }

    private onWorkerMessage(message: any) {
        if(!message["token"]) {
            console.error("Invalid worker token!");
            return;
        }

        if(message["token"] == this._workerCallbackToken) {
            console.log("Callback data!");
            return;
        }

        for(let entry of this._workerListener) {
            if(entry.token == message["token"]) {
                entry.resolve(message);
                this._workerListener.remove(entry);
                return;
            }
        }

        console.error("Could not find worker token entry! (" + message["token"] + ")");
    }

    private spawnWorker() {
        this._worker = new Worker("js/codec/CompiledCodecWorker.js");
        this._worker.onmessage = event => this.onWorkerMessage(JSON.parse(event.data));
    }
}