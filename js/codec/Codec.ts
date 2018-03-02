class SampleBuffer {
    buffer: Float32Array;
    index: number;

    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
}

abstract class Codec {
    on_encoded_data: (Uint8Array) => void = ($) => {};

    protected _decodeResampler: Resampler;
    protected _encodeResampler: Resampler;
    protected _codecSampleRate: number;
    protected _sampleBuffer: SampleBuffer[] = [];

    samplesPerUnit: number = 960;

    protected constructor(codecSampleRate: number){
        this._codecSampleRate = codecSampleRate;
        this._decodeResampler = new Resampler();
        this._encodeResampler = new Resampler(codecSampleRate);
    }

    abstract name() : string;
    abstract initialise();
    abstract deinitialise();

    protected abstract decode(data: Uint8Array) : Promise<AudioBuffer>;
    protected abstract encode(data: Float32Array) : Uint8Array | string;


    protected bufferedSamples(max: number = 0) : number {
        let value = 0;
        for(let i = 0; i < this._sampleBuffer.length && value < max; i++)
            value += this._sampleBuffer[i].buffer.length - this._sampleBuffer[i].index;
        console.log(value + " / " + max);
        return value;
    }

    encodeSamples(pcm: AudioBuffer) {
        this._encodeResampler.resample(pcm).then(buffer => this.encodeSamples0(buffer))
            .catch(error => console.error("Could not resample PCM data for codec. Error:" + error));
    }

    private encodeSamples0(buffer: AudioBuffer) {
        console.log(buffer);
        this._sampleBuffer.push(new SampleBuffer(buffer.getChannelData(0))); //TODO multi channel!

        while(this.bufferedSamples(this.samplesPerUnit) >= this.samplesPerUnit) {
            let buffer = new Float32Array(this.samplesPerUnit);
            let index = 0;
            while(index < this.samplesPerUnit) {
                let buf = this._sampleBuffer[0];
                let len = Math.min(buf.buffer.length - buf.index, this.samplesPerUnit - index);
                buffer.set(buf.buffer.subarray(buf.index, buf.index + len));
                index += len;
                buf.index += len;
                console.log(buf.index + " - " + buf.buffer.length);
                if(buf.index == buf.buffer.length)
                    this._sampleBuffer.pop_front();
            }

            let result = this.encode(buffer);
            if(result instanceof Uint8Array) this.on_encoded_data(result);
            else console.error("[Codec][" + this.name() + "] Could not encode buffer. Result: " + result);
        }
        return true;
    }

    decodeSamples(data: Uint8Array) : Promise<AudioBuffer> {
        return this.decode(data).then(buffer => this._decodeResampler.resample(buffer));
    }
}

class OpusCodec extends Codec {
    private nativeHandle: any;
    private channelCount: number = 1;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;

    constructor() {
        super(48000);
    }

    name(): string {
        return "Opus";
    }

    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", ["number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]); /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "number", "number"]);

        this.nativeHandle = this.fn_newHandle(1);
    }

    deinitialise() {  } //TODO

    decode(data: Uint8Array): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            let maxBytes = 4096;
            let buffer = Module._malloc(maxBytes);
            let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
            heapBytes.set(data);
            let result = this.fn_decode(this.nativeHandle, heapBytes.byteOffset, data.byteLength, maxBytes);
            if(result < 0) {
                Module._free(buffer);
                reject("invalid result on decode (" + result + ")");
                return;
            }
            let buf = Module.HEAPF32.slice(heapBytes.byteOffset / 4, (heapBytes.byteOffset / 4) + (result * this.channelCount));
            Module._free(buffer);

            let audioBuf = AudioController.globalContext.createBuffer(this.channelCount, result, this._codecSampleRate);
            audioBuf.copyToChannel(buf, 0);
            resolve(audioBuf);
        });
    }

    encode(data: Float32Array): Uint8Array | string {
        let maxBytes = data.byteLength;
        let buffer = Module._malloc(maxBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
        heapBytes.set(new Uint8Array(data.buffer));
        let result = this.fn_encode(this.nativeHandle, heapBytes.byteOffset, data.length, maxBytes);
        if(result < 0) {
            Module._free(buffer);
            return "invalid result on encode (" + result + ")";
        }
        let buf = Module.HEAP8.slice(heapBytes.byteOffset, heapBytes.byteOffset + result);
        Module._free(buffer);
        return Uint8Array.from(buf);
    }

    private _arrayToHeap(typedArray: any){
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = Module._malloc(numBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    }
}