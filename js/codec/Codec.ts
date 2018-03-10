class BufferChunk {
    buffer: AudioBuffer;
    index: number;

    constructor(buffer: AudioBuffer) {
        this.buffer = buffer;
        this.index = 0;
    }

    copyRangeTo(target: AudioBuffer, maxLength: number, offset: number) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        for(let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
            target.getChannelData(channel).set(
                this.buffer.getChannelData(channel).subarray(this.index, this.index + copy),
                offset
            );
        }
        return copy;
    }
}

abstract class Codec {
    on_encoded_data: (Uint8Array) => void = ($) => {};

    protected _decodeResampler: AudioResampler;
    protected _encodeResampler: AudioResampler;
    protected _codecSampleRate: number;
    protected _chunks: BufferChunk[] = [];

    channelCount: number = 1;
    samplesPerUnit: number = 960;

    protected constructor(codecSampleRate: number){
        this._codecSampleRate = codecSampleRate;
        this._decodeResampler = new AudioResampler();
        this._encodeResampler = new AudioResampler(codecSampleRate);
    }

    abstract name() : string;
    abstract initialise();
    abstract deinitialise();

    protected abstract decode(data: Uint8Array) : Promise<AudioBuffer>;
    protected abstract encode(data: AudioBuffer) : Uint8Array | string;


    protected bufferedSamples(max: number = 0) : number {
        let value = 0;
        for(let i = 0; i < this._chunks.length && value < max; i++)
            value += this._chunks[i].buffer.length - this._chunks[i].index;
        return value;
    }

    async encodeSamples(pcm: AudioBuffer) {
        this._encodeResampler.resample(pcm).then(buffer => this.encodeSamples0(buffer))
            .catch(error => console.error("Could not resample PCM data for codec. Error:" + error));

    }

    private encodeSamples0(buffer: AudioBuffer) {
        this._chunks.push(new BufferChunk(buffer)); //TODO multi channel!

        while(this.bufferedSamples(this.samplesPerUnit) >= this.samplesPerUnit) {
            let buffer = AudioController.globalContext.createBuffer(this.channelCount, this.samplesPerUnit, this._codecSampleRate);
            let index = 0;
            while(index < this.samplesPerUnit) {
                let buf = this._chunks[0];
                let cpyBytes = buf.copyRangeTo(buffer, this.samplesPerUnit - index, index);
                index += cpyBytes;
                buf.index += cpyBytes;
                if(buf.index == buf.buffer.length)
                    this._chunks.pop_front();
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

class RawCodec extends Codec {
    converterRaw: any;
    converter: Uint8Array;
    bufferSize: number = 4096 * 4;

    constructor(codecSampleRate: number){
        super(codecSampleRate);
    }

    name(): string {
        return "raw";
    }

    initialise() {
        this.converterRaw = Module._malloc(this.bufferSize);
        this.converter = new Uint8Array(Module.HEAPU8.buffer, this.converterRaw, this.bufferSize);
    }

    deinitialise() { }

    protected decode(data: Uint8Array): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            this.converter.set(data);
            let buf = Module.HEAPF32.slice(this.converter.byteOffset / 4, (this.converter.byteOffset / 4) + data.length / 4);
            let audioBuf = AudioController.globalContext.createBuffer(1, data.length / 4, this._codecSampleRate);
            audioBuf.copyToChannel(buf, 0);
            resolve(audioBuf);
        });
    }

    protected encode(data: AudioBuffer): Uint8Array | string {
        return new Uint8Array(data.getChannelData(0));
    }

}

enum OpusType {
    VOIP = 2048,
    AUDIO = 2049,
    RESTRICTED_LOWDELAY = 2051
}

class OpusCodec extends Codec {
    private nativeHandle: any;
    private type: OpusType;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;

    private bufferSize = 4096 * 2;
    private encodeBufferRaw: any;
    private encodeBuffer: Float32Array;
    private decodeBufferRaw: any;
    private decodeBuffer: Uint8Array;

    constructor(channelCount: number, type: OpusType) {
        super(48000);
        super.channelCount = channelCount;
        this.type = type;
    }

    name(): string {
        return "Opus (Type: " + OpusCodec[this.type] + " Channels: " + this.channelCount + ")";
    }

    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", ["number", "number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]);
        /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "number", "number"]);

        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);

        this.encodeBufferRaw = Module._malloc(this.bufferSize);
        this.encodeBuffer = new Float32Array(Module.HEAPF32.buffer, this.encodeBufferRaw, this.bufferSize / 4);

        this.decodeBufferRaw = Module._malloc(this.bufferSize);
        this.decodeBuffer = new Uint8Array(Module.HEAPU8.buffer, this.decodeBufferRaw, this.bufferSize);
    }

    deinitialise() { } //TODO

    decode(data: Uint8Array): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            if (data.byteLength > this.decodeBuffer.byteLength) throw "Data to long!";
            this.decodeBuffer.set(data);
            //console.log("decode(" + data.length + ")");
            //console.log(data);
            let result = this.fn_decode(this.nativeHandle, this.decodeBuffer.byteOffset, data.byteLength, this.decodeBuffer.byteLength);
            if (result < 0) {
                reject("invalid result on decode (" + result + ")");
                return;
            }
            //console.log("decoded: " + result);
            let buf = Module.HEAPF32.slice(this.decodeBuffer.byteOffset / 4, (this.decodeBuffer.byteOffset / 4) + (result * this.channelCount));
            let audioBuf = AudioController.globalContext.createBuffer(this.channelCount, result, this._codecSampleRate);

            for (let offset = 0; offset < result; offset++) {
                for (let channel = 0; channel < this.channelCount; channel++)
                    audioBuf.getChannelData(channel)[offset] = buf[offset * this.channelCount + this.channelCount];
            }

            resolve(audioBuf);
        });
    }

    encode(data: AudioBuffer): Uint8Array | string {
        if (data.length * this.channelCount > this.encodeBuffer.length) throw "Data to long!";

        for (let offset = 0; offset < data.length; offset++) {
            for (let channel = 0; channel < this.channelCount; channel++)
                this.encodeBuffer[offset * this.channelCount + channel] = data.getChannelData(channel)[offset];
        }

        let result = this.fn_encode(this.nativeHandle, this.encodeBuffer.byteOffset, data.length, this.encodeBuffer.byteLength);
        if (result < 0) {
            return "invalid result on encode (" + result + ")";
        }
        let buf = Module.HEAP8.slice(this.encodeBuffer.byteOffset, this.encodeBuffer.byteOffset + result);
        return Uint8Array.from(buf);
    }
}