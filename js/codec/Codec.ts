abstract class Codec {
    constructor(){}

    abstract name() : string;
    abstract initialise();
    abstract deinitialise();


    abstract decode(data: Uint8Array) : Float32Array | string;
    abstract encode(data: Float32Array) : Uint8Array;
}

class OpusCodec extends Codec {
    private nativeHandle: any;
    private channelCount: number = 1;

    private fn_newHandle: any;
    private fn_decode: any;

    constructor() {
        super();
    }

    name(): string {
        return "Opus";
    }

    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", []);
        this.fn_decode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "length"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]); /* codec_opus_decode(handle, buffer, length, maxlength) */

        this.nativeHandle = this.fn_newHandle();
    }

    deinitialise() {

    }

    decode(data: Uint8Array): Float32Array | string {
        let maxBytes = 4096;
        let buffer = Module._malloc(maxBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
        heapBytes.set(data);
        let result = this.fn_decode(this.nativeHandle, heapBytes.byteOffset, data.byteLength, maxBytes);
        if(result < 0) {
            Module._free(buffer);
            return "invalid result (" + result + ")";
        }
        let buf = Module.HEAPF32.slice(heapBytes.byteOffset / 4, (heapBytes.byteOffset / 4) + (result * 4 * this.channelCount));
        Module._free(buffer);
        return buf;
    }

    convertBlock(incomingData, length: number) { // incoming data is a UInt8Array
        var i, l = length;
        var outputData = new Float32Array(length);
        for (i = 0; i < l; i++) {
            outputData[i] = (incomingData[i] - 128) / 128.0;
        }
        return outputData;
    }

    encode(data: Float32Array): Uint8Array {
        return undefined;
    }

    private _arrayToHeap(typedArray: any){
        let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
        let ptr = Module._malloc(numBytes);
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
        heapBytes.set(new Uint8Array(typedArray.buffer));
        return heapBytes;
    }
}