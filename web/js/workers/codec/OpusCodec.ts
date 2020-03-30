import * as cworker from "./CodecWorker";
import {CodecType} from "tc-backend/web/codec/Codec";
import {CodecWorker} from "./CodecWorker";

const prefix = "OpusWorker";

declare global {
    interface Window {
        __init_em_module: ((Module: any) => void)[];
    }
}
self.__init_em_module = self.__init_em_module || [];

const WASM_ERROR_MESSAGES = [
    'no native wasm support detected'
];

let Module;
self.__init_em_module.push(m => Module = m);
const runtime_initialize_promise = new Promise((resolve, reject) => {
    self.__init_em_module.push(Module => {
        const cleanup = () => {
            Module['onRuntimeInitialized'] = undefined;
            Module['onAbort'] = undefined;
        };

        Module['onRuntimeInitialized'] = () => {
            cleanup();
            resolve();
        };

        Module['onAbort'] = error => {
            cleanup();

            let message;
            if(error instanceof DOMException)
                message = "DOMException (" + error.name + "): " + error.code + " => " + error.message;
            else {
                abort_message = error;
                message = error;
                if(error.indexOf("no binaryen method succeeded") != -1) {
                    for(const error of WASM_ERROR_MESSAGES) {
                        if(last_error_message.indexOf(error) != -1) {
                            message = "no native wasm support detected, but its required";
                            break;
                        }
                    }
                }
            }

            reject(message);
        }
    });
});

let abort_message: string = undefined;
let last_error_message: string;
self.__init_em_module.push(Module => {
    Module['print'] = function() {
        if(arguments.length == 1 && arguments[0] == abort_message)
            return; /* we don't need to reprint the abort message! */

        console.log("Print: ", ...arguments);
    };

    Module['printErr'] = function() {
        if(arguments.length == 1 && arguments[0] == abort_message)
            return; /* we don't need to reprint the abort message! */

        last_error_message = arguments[0];
        for(const suppress of WASM_ERROR_MESSAGES)
            if((arguments[0] as string).indexOf(suppress) != -1)
                return;

        console.error("Error: ",...arguments);
    };

    Module['locateFile'] = file => "../../wasm/" + file;
});

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
    private fn_error_message: any;

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
        this.fn_error_message = Module.cwrap("opus_error_message", "string", ["number"]);

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
        let result = this.fn_decode(this.nativeHandle, this.decodeBuffer.byteOffset, data.byteLength, this.decodeBuffer.byteLength);
        if (result < 0) return this.fn_error_message(result);
        return Module.HEAPF32.slice(this.decodeBuffer.byteOffset / 4, (this.decodeBuffer.byteOffset / 4) + (result * this.channelCount));
    }

    encode(data: Float32Array): Uint8Array | string {
        this.encodeBuffer.set(data);

        let result = this.fn_encode(this.nativeHandle, this.encodeBuffer.byteOffset, data.length, this.encodeBuffer.byteLength);
        if (result < 0) return this.fn_error_message(result);
        let buf = Module.HEAP8.slice(this.encodeBuffer.byteOffset, this.encodeBuffer.byteOffset + result);
        return Uint8Array.from(buf);
    }

    reset() {
        console.log(prefix + " Reseting opus codec!");
        this.fn_reset(this.nativeHandle);
    }
}
cworker.register_codec(CodecType.OPUS_MUSIC, async () => new OpusWorker(2, OpusType.AUDIO));
cworker.register_codec(CodecType.OPUS_VOICE, async () => new OpusWorker(1, OpusType.VOIP));

cworker.set_initialize_callback(async () => {
    try {
        require("tc-generated/codec/opus");
    } catch (e) {
        if(Module) {
            if(typeof(Module['onAbort']) === "function") {
                Module['onAbort']("Failed to load native scripts");
            } /* else the error had been already handled because its a WASM error */
        } else {
            throw e;
        }
    }
    if(!Module)
        throw "Missing module handle";

    await runtime_initialize_promise;
    return true;
});