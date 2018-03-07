var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BufferChunk {
    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
    copyRangeTo(target, maxLength, offset) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
            target.getChannelData(channel).set(this.buffer.getChannelData(channel).subarray(this.index, this.index + copy), offset);
        }
        return copy;
    }
}
class Codec {
    constructor(codecSampleRate) {
        this.on_encoded_data = ($) => { };
        this._chunks = [];
        this.channelCount = 1;
        this.samplesPerUnit = 960;
        this._codecSampleRate = codecSampleRate;
        this._decodeResampler = new AudioResampler();
        this._encodeResampler = new AudioResampler(codecSampleRate);
    }
    bufferedSamples(max = 0) {
        let value = 0;
        for (let i = 0; i < this._chunks.length && value < max; i++)
            value += this._chunks[i].buffer.length - this._chunks[i].index;
        return value;
    }
    encodeSamples(pcm) {
        return __awaiter(this, void 0, void 0, function* () {
            this._encodeResampler.resample(pcm).then(buffer => this.encodeSamples0(buffer))
                .catch(error => console.error("Could not resample PCM data for codec. Error:" + error));
        });
    }
    encodeSamples0(buffer) {
        this._chunks.push(new BufferChunk(buffer)); //TODO multi channel!
        while (this.bufferedSamples(this.samplesPerUnit) >= this.samplesPerUnit) {
            let buffer = AudioController.globalContext.createBuffer(this.channelCount, this.samplesPerUnit, this._codecSampleRate);
            let index = 0;
            while (index < this.samplesPerUnit) {
                let buf = this._chunks[0];
                let cpyBytes = buf.copyRangeTo(buffer, this.samplesPerUnit - index, index);
                index += cpyBytes;
                buf.index += cpyBytes;
                if (buf.index == buf.buffer.length)
                    this._chunks.pop_front();
            }
            let result = this.encode(buffer);
            if (result instanceof Uint8Array)
                this.on_encoded_data(result);
            else
                console.error("[Codec][" + this.name() + "] Could not encode buffer. Result: " + result);
        }
        return true;
    }
    decodeSamples(data) {
        return this.decode(data).then(buffer => this._decodeResampler.resample(buffer));
    }
}
class RawCodec extends Codec {
    constructor(codecSampleRate) {
        super(codecSampleRate);
        this.bufferSize = 4096 * 4;
    }
    name() {
        return "raw";
    }
    initialise() {
        this.converterRaw = Module._malloc(this.bufferSize);
        this.converter = new Uint8Array(Module.HEAPU8.buffer, this.converterRaw, this.bufferSize);
    }
    deinitialise() { }
    decode(data) {
        return new Promise((resolve, reject) => {
            this.converter.set(data);
            let buf = Module.HEAPF32.slice(this.converter.byteOffset / 4, (this.converter.byteOffset / 4) + data.length / 4);
            let audioBuf = AudioController.globalContext.createBuffer(1, data.length / 4, this._codecSampleRate);
            audioBuf.copyToChannel(buf, 0);
            resolve(audioBuf);
        });
    }
    encode(data) {
        return new Uint8Array(data.getChannelData(0));
    }
}
var OpusType;
(function (OpusType) {
    OpusType[OpusType["VOIP"] = 2048] = "VOIP";
    OpusType[OpusType["AUDIO"] = 2049] = "AUDIO";
    OpusType[OpusType["RESTRICTED_LOWDELAY"] = 2051] = "RESTRICTED_LOWDELAY";
})(OpusType || (OpusType = {}));
class OpusCodec extends Codec {
    constructor(channelCount, type) {
        super(48000);
        this.bufferSize = 4096 * 2;
        super.channelCount = channelCount;
        this.type = type;
    }
    name() {
        return "Opus (Type: " + OpusCodec[this.type] + " Channels: " + this.channelCount + ")";
    }
    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", ["number", "number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]); /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "number", "number"]);
        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);
        this.encodeBufferRaw = Module._malloc(this.bufferSize);
        this.encodeBuffer = new Float32Array(Module.HEAPF32.buffer, this.encodeBufferRaw, this.bufferSize / 4);
        this.decodeBufferRaw = Module._malloc(this.bufferSize);
        this.decodeBuffer = new Uint8Array(Module.HEAPU8.buffer, this.decodeBufferRaw, this.bufferSize);
    }
    deinitialise() { } //TODO
    decode(data) {
        return new Promise((resolve, reject) => {
            if (data.byteLength > this.decodeBuffer.byteLength)
                throw "Data to long!";
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
    encode(data) {
        if (data.length * this.channelCount > this.encodeBuffer.length)
            throw "Data to long!";
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
//# sourceMappingURL=Codec.js.map