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
            else if(error instanceof Error) {
                message = error.message;
            } else {
                message = error;
            }

            reject(message);
        }
    });
});

self.__init_em_module.push(Module => {
    Module['print'] = function() {
        const message = arguments[0] as string;
        if(message.startsWith("CompileError: WebAssembly.instantiate(): ")) {
            /* Compile errors also get printed to error stream so no need to log them here */
            return;
        }
        console.log(...arguments);
    };

    Module['printErr'] = function() {
        const message = arguments[0] as string;
        if(message.startsWith("wasm streaming compile failed: ")) {
            const error_message = message.substr(31);
            if(error_message.startsWith("TypeError: Failed to execute 'compile' on 'WebAssembly': ")) {
                console.warn("Failed to compile opus native code: %s", error_message.substr(57));
            } else {
                console.warn("Failed to prepare opus native code asynchronously: %s", error_message);
            }
            return;
        } else if(message === "falling back to ArrayBuffer instantiation") {
            /*
                We suppress this message, because it comes directly after "wasm streaming compile failed:".
                So if we want to print multiple lines we just have to edit the lines above.
             */
            return;
        } else if(message.startsWith("failed to asynchronously prepare wasm:")) {
            /*
                Will be handled via abort
             */
            return;
        } else if(message.startsWith("CompileError: WebAssembly.instantiate():")) {
            /*
                Will be handled via abort already
             */
            return;
        }

        for(const suppress of WASM_ERROR_MESSAGES)
            if((arguments[0] as string).indexOf(suppress) != -1)
                return;

        console.error(...arguments);
    };

    Module['locateFile'] = file => "../../wasm/" + file;
});

self.addEventListener("unhandledrejection", event => {
    if(event.reason instanceof Error) {
        if(event.reason.name === "RuntimeError" && event.reason.message.startsWith("abort(CompileError: WebAssembly.instantiate():")) {
            /*
                We already handled that error via the Module['printErr'] callback.
             */
            event.preventDefault();
            return;
        }
    }
});

enum OpusType {
    VOIP = 2048,
    AUDIO = 2049,
    RESTRICTED_LOWDELAY = 2051
}

const OPUS_ERROR_CODES = [
    "One or more invalid/out of range arguments", //-1 (OPUS_BAD_ARG)
    "Not enough bytes allocated in the target buffer", //-2 (OPUS_BUFFER_TOO_SMALL)
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

    decode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array): number | string {
        if (buffer.byteLength > this.decode_buffer.byteLength)
            return "supplied data exceeds internal buffer";

        this.decode_buffer.set(buffer);

        let result = this.fn_decode(this.nativeHandle, this.decode_buffer.byteOffset, buffer.byteLength, this.decode_buffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown decode error " + result;

        const resultByteLength = result * this.channelCount * 4;
        const resultBuffer = responseBuffer(resultByteLength);
        resultBuffer.set(this.decode_buffer.subarray(0, resultByteLength), 0);
        return resultByteLength;
    }

    encode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array): number | string {
        if (buffer.byteLength > this.decode_buffer.byteLength)
            return "supplied data exceeds internal buffer";

        this.encode_buffer.set(buffer);

        let result = this.fn_encode(this.nativeHandle, this.encode_buffer.byteOffset, buffer.byteLength, this.encode_buffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown encode error " + result;

        const resultBuffer = responseBuffer(result);
        resultBuffer.set(Module.HEAP8.subarray(this.encode_buffer.byteOffset, this.encode_buffer.byteOffset + result));
        return result;
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