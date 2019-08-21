/// <reference path="CodecWorker.ts" />

const WASM_ERROR_MESSAGES = [
    'no native wasm support detected'
];

this["Module"] = this["Module"] || ({} as any); /* its required to cast {} to any!*/

let initialized = false;
Module['onRuntimeInitialized'] = function() {
    initialized = true;
    console.log(prefix + "Initialized!");

    sendMessage({
        token: workerCallbackToken,
        type: "loaded",
        success: true
    })
};

let abort_message: string = undefined;
let last_error_message: string;

Module['print'] = function() {
    if(arguments.length == 1 && arguments[0] == abort_message)
        return; /* we don't need to reprint the abort message! */
    console.log(...arguments);
};

Module['printErr'] = function() {
    if(arguments.length == 1 && arguments[0] == abort_message)
        return; /* we don't need to reprint the abort message! */

    last_error_message = arguments[0];
    for(const suppress of WASM_ERROR_MESSAGES)
        if((arguments[0] as string).indexOf(suppress) != -1)
            return;

    console.error(...arguments);
};

Module['onAbort'] = (message: string | DOMException) => {
    /* no native wasm support detected */
    Module['onAbort'] = undefined;

    if(message instanceof DOMException)
        message = "DOMException (" + message.name + "): " + message.code + " => " + message.message;
    else {
        abort_message = message;
        if(message.indexOf("no binaryen method succeeded") != -1)
            for(const error of WASM_ERROR_MESSAGES)
                if(last_error_message.indexOf(error) != -1) {
                    message = "no native wasm support detected, but its required";
                    break;
                }
    }

    sendMessage({
        token: workerCallbackToken,
        type: "loaded",
        success: false,
        message: message
    });
};

try {
    console.log("Node init!");
    Module['locateFile'] = file => "../../wasm/" + file;
    importScripts("../../wasm/TeaWeb-Worker-Codec-Opus.js");
} catch (e) {
    if(typeof(Module['onAbort']) === "function") {
        console.log(e);
        Module['onAbort']("Failed to load native scripts");
    } /* else the error had been already handled because its a WASM error */
}

enum OpusType {
    VOIP = 2048,
    AUDIO = 2049,
    RESTRICTED_LOWDELAY = 2051
}

class OpusWorker implements CodecWorker {
    private channelCount: number;
    private nativeHandle: any;
    private type: OpusType;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;
    private fn_reset: any;

    private bufferSize = 4096 * 2;
    private encodeBufferRaw: any;
    private encodeBuffer: Float32Array;
    private decodeBufferRaw: any;
    private decodeBuffer: Uint8Array;

    constructor(channelCount: number, type: OpusType) {
        this.channelCount = channelCount;
        this.type = type;
    }

    name(): string {
        return "Opus (Type: " + OpusWorker[this.type] + " Channels: " + this.channelCount + ")";
    }

    initialise?() : string {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "number", ["number", "number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["number", "number", "number", "number"]);
        /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["number", "number", "number", "number"]);
        this.fn_reset = Module.cwrap("codec_opus_reset", "number", ["number"]);

        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);

        this.encodeBufferRaw = Module._malloc(this.bufferSize);
        this.encodeBuffer = new Float32Array(Module.HEAPF32.buffer, this.encodeBufferRaw, this.bufferSize / 4);

        this.decodeBufferRaw = Module._malloc(this.bufferSize);
        this.decodeBuffer = new Uint8Array(Module.HEAPU8.buffer, this.decodeBufferRaw, this.bufferSize);
        return undefined;
    }

    deinitialise() { } //TODO

    decode(data: Uint8Array): Float32Array | string {
        if (data.byteLength > this.decodeBuffer.byteLength) return "Data to long!";
        this.decodeBuffer.set(data);
        //console.log("decode(" + data.length + ")");
        //console.log(data);
        let result = this.fn_decode(this.nativeHandle, this.decodeBuffer.byteOffset, data.byteLength, this.decodeBuffer.byteLength);
        if (result < 0) {
            return "invalid result on decode (" + result + ")";
        }
        return Module.HEAPF32.slice(this.decodeBuffer.byteOffset / 4, (this.decodeBuffer.byteOffset / 4) + (result * this.channelCount));
    }

    encode(data: Float32Array): Uint8Array | string {
        this.encodeBuffer.set(data);

        let result = this.fn_encode(this.nativeHandle, this.encodeBuffer.byteOffset, data.length, this.encodeBuffer.byteLength);
        if (result < 0) {
            return "invalid result on encode (" + result + ")";
        }
        let buf = Module.HEAP8.slice(this.encodeBuffer.byteOffset, this.encodeBuffer.byteOffset + result);
        return Uint8Array.from(buf);
    }

    reset() {
        console.log(prefix + " Reseting opus codec!");
        this.fn_reset(this.nativeHandle);
    }
}