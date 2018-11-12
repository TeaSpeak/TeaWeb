/// <reference path="BasicCodec.ts"/>

class CodecWrapperRaw extends BasicCodec {
    converterRaw: any;
    converter: Uint8Array;
    bufferSize: number = 4096 * 4;

    constructor(codecSampleRate: number){
        super(codecSampleRate);
    }

    name(): string {
        return "raw";
    }

    initialise() : Promise<Boolean> {
        this.converterRaw = Module._malloc(this.bufferSize);
        this.converter = new Uint8Array(Module.HEAPU8.buffer, this.converterRaw, this.bufferSize);
        return new Promise<Boolean>(resolve => resolve());
    }

    initialized(): boolean {
        return true;
    }

    deinitialise() { }

    protected decode(data: Uint8Array): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            this.converter.set(data);
            let buf = Module.HEAPF32.slice(this.converter.byteOffset / 4, (this.converter.byteOffset / 4) + data.length / 4);
            let audioBuf = this._audioContext.createBuffer(1, data.length / 4, this._codecSampleRate);
            audioBuf.copyToChannel(buf, 0);
            resolve(audioBuf);
        });
    }

    protected encode(data: AudioBuffer): Promise<Uint8Array> {
        return new Promise<Uint8Array>(resolve => resolve(new Uint8Array(data.getChannelData(0))));
    }

    reset() : boolean { return true; }

    processLatency(): number {
        return 0;
    }
}