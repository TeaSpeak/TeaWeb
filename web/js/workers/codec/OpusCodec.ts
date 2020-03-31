import * as cworker from "./CodecWorker";
import {CodecType} from "tc-backend/web/codec/Codec";
import {CodecWorker} from "./CodecWorker";

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

    Module['locateFile'] = file => "../../wasm/" + file;
});

enum OpusType {
    VOIP = 2048,
    AUDIO = 2049,
    RESTRICTED_LOWDELAY = 2051
}

const OPUS_ERROR_CODES = [
    "One or more invalid/out of range arguments", //-1 (OPUS_BAD_ARG)
    "Not enough bytes allocated in the buffer", //-2 (OPUS_BUFFER_TOO_SMALL)
    "An internal error was detected", //-3 (OPUS_INTERNAL_ERROR)
    "The compressed data passed is corrupted", //-4 (OPUS_INVALID_PACKET)
    "Invalid/unsupported request number", //-5 (OPUS_UNIMPLEMENTED)
    "An encoder or decoder structure is invalid or already freed", //-6 (OPUS_INVALID_STATE)
    "Memory allocation has failed" //-7 (OPUS_ALLOC_FAIL)
];

class OpusWorker implements CodecWorker {
    private readonly channelCount: number;
    private readonly type: OpusType;
    private nativeHandle: any;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;
    private fn_reset: any;

    private buffer_size = 4096 * 2;
    private buffer: any;

    private encode_buffer: Float32Array;
    private decode_buffer: Uint8Array;

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
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["number", "number", "number", "number"]);
        this.fn_reset = Module.cwrap("codec_opus_reset", "number", ["number"]);

        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);

        this.buffer = Module._malloc(this.buffer_size);
        this.encode_buffer = new Float32Array(Module.HEAPF32.buffer, this.buffer, Math.floor(this.buffer_size / 4));
        this.decode_buffer = new Uint8Array(Module.HEAPU8.buffer, this.buffer, this.buffer_size);
        return undefined;
    }

    deinitialise() { } //TODO

    decode(data: Uint8Array): Float32Array | string {
        if (data.byteLength > this.decode_buffer.byteLength) return "supplied data exceeds internal buffer";
        this.decode_buffer.set(data);

        let result = this.fn_decode(this.nativeHandle, this.decode_buffer.byteOffset, data.byteLength, this.decode_buffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown decode error " + result;

        return Module.HEAPF32.slice(this.decode_buffer.byteOffset / 4, (this.decode_buffer.byteOffset / 4) + (result * this.channelCount));
    }

    encode(data: Float32Array): Uint8Array | string {
        this.encode_buffer.set(data);

        let result = this.fn_encode(this.nativeHandle, this.encode_buffer.byteOffset, data.length, this.encode_buffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown encode error " + result;

        return Module.HEAP8.slice(this.encode_buffer.byteOffset, this.encode_buffer.byteOffset + result);
    }

    reset() {
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