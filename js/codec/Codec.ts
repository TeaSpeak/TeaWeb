abstract class Codec {
    constructor(){}

    abstract name() : string;
    abstract initialise();
    abstract deinitialise();


    abstract decode(data: Uint8Array) : Float32Array | string;
    abstract encode(data: Float32Array) : Uint8Array | string;
}

class OpusCodec extends Codec {
    private nativeHandle: any;
    private channelCount: number = 1;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;

    constructor() {
        super();
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
            return "invalid result on decode (" + result + ")";
        }
        let buf = Module.HEAPF32.slice(heapBytes.byteOffset / 4, (heapBytes.byteOffset / 4) + (result * 4 * this.channelCount));
        Module._free(buffer);
        return buf;
    }

    encode(data: Float32Array): Uint8Array | string {
        this.encoderBufferLength = this.encoderSamplesPerChannel * this.config.numberOfChannels;
        this.encoderBufferPointer = this._malloc( this.encoderBufferLength * 4 ); // 4 bytes per sample
        this.encoderBuffer = this.HEAPF32.subarray( this.encoderBufferPointer >> 2, (this.encoderBufferPointer >> 2) + this.encoderBufferLength );

        this.encoderOutputMaxLength = 4000;
        this.encoderOutputPointer = this._malloc( this.encoderOutputMaxLength );
        this.encoderOutputBuffer = this.HEAPU8.subarray( this.encoderOutputPointer, this.encoderOutputPointer + this.encoderOutputMaxLength );

        Module.HEAP8.subarray(2, 3, 4);
        let maxBytes = 4096 * 1 + 4;
        let buffer = Module._malloc(maxBytes);
        console.log("X");
        let heapBytes = new Uint8Array(Module.HEAPU8.buffer, buffer, maxBytes);
        //heapBytes.set(data);
        let result = this.fn_encode(this.nativeHandle, heapBytes.byteOffset, 960, maxBytes);
        if(result < 0) {
            Module._free(buffer);
            return "invalid result on encode (" + result + ")";
        }
        console.log("Bytes: " + result);
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