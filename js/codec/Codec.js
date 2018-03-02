class SampleBuffer {
    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
}
class Codec {
    constructor() {
        this.on_encoded_data = ($) => { };
        this._sampleBuffer = [];
        this.sampleRate = 120;
    }
    bufferedSamples(max = 0) {
        let value = 0;
        for (let i = 0; i < this._sampleBuffer.length && value < max; i++)
            value += this._sampleBuffer[i].buffer.length - this._sampleBuffer[i].index;
        console.log(value + " / " + max);
        return value;
    }
    encodeSamples(array) {
        console.log("encode");
        this._sampleBuffer.push(new SampleBuffer(array));
        while (this.bufferedSamples(this.sampleRate) >= this.sampleRate) {
            let buffer = new Float32Array(this.sampleRate);
            let index = 0;
            while (index < this.sampleRate) {
                let buf = this._sampleBuffer[0];
                let len = Math.min(buf.buffer.length - buf.index, this.sampleRate - index);
                buffer.set(buf.buffer.subarray(buf.index, buf.index + len));
                index += len;
                buf.index += len;
                console.log(buf.index + " - " + buf.buffer.length);
                if (buf.index == buf.buffer.length)
                    this._sampleBuffer.pop_front();
            }
            let result = this.encode(buffer);
            if (result instanceof Uint8Array)
                this.on_encoded_data(result);
            else
                return result;
        }
        return true;
    }
}
class OpusCodec extends Codec {
    constructor() {
        super();
        this.channelCount = 1;
    }
    name() {
        return "Opus";
    }
    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", ["number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]); /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "number", "number"]);
        this.nativeHandle = this.fn_newHandle(1);
    }
    deinitialise() {
    }
    decode(data) {
        let maxBytes = 4096;
        let buffer = Module._malloc(maxBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
        heapBytes.set(data);
        let result = this.fn_decode(this.nativeHandle, heapBytes.byteOffset, data.byteLength, maxBytes);
        if (result < 0) {
            Module._free(buffer);
            return "invalid result on decode (" + result + ")";
        }
        let buf = Module.HEAPF32.slice(heapBytes.byteOffset / 4, (heapBytes.byteOffset / 4) + (result * this.channelCount));
        Module._free(buffer);
        return buf;
    }
    encode(data) {
        let maxBytes = data.byteLength;
        let buffer = Module._malloc(maxBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
        heapBytes.set(new Uint8Array(data.buffer));
        let result = this.fn_encode(this.nativeHandle, heapBytes.byteOffset, data.length, maxBytes);
        if (result < 0) {
            Module._free(buffer);
            return "invalid result on encode (" + result + ")";
        }
        let buf = Module.HEAP8.slice(heapBytes.byteOffset, heapBytes.byteOffset + result);
        Module._free(buffer);
        return Uint8Array.from(buf);
    }
    _arrayToHeap(typedArray) {
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = Module._malloc(numBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    }
}
//# sourceMappingURL=Codec.js.map