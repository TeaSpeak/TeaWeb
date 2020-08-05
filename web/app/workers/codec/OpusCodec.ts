import * as cworker from "./CodecWorker";
import {CodecType} from "tc-backend/web/codec/Codec";
import {CodecWorker} from "./CodecWorker";

const WASM_ERROR_MESSAGES = [
    'no native wasm support detected'
];

interface OpusModuleType extends EmscriptenModule {
    cwrap: typeof cwrap;
}

let OpusModule = {} as OpusModuleType;
const runtimeInitializedPromise = new Promise((resolve, reject) => {
    const cleanup = () => {
        OpusModule['onRuntimeInitialized'] = undefined;
        OpusModule['onAbort'] = undefined;
    };

    OpusModule['onRuntimeInitialized'] = () => {
        cleanup();
        resolve();
    };

    OpusModule['onAbort'] = error => {
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

OpusModule['print'] = function() {
    const message = arguments[0] as string;
    if(message.startsWith("CompileError: WebAssembly.instantiate(): ")) {
        /* Compile errors also get printed to error stream so no need to log them here */
        return;
    }
    console.log(...arguments);
};

OpusModule['printErr'] = function() {
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

self.addEventListener("unhandledrejection", event => {
    let message;
    if(event.reason instanceof Error) {
        if(event.reason.name !== "RuntimeError")
            return;
        else
            message = event.reason.message;
    } else if(typeof event.reason === "string") {
        message = event.reason;
    } else {
        return;
    }

    if(message.startsWith("abort(CompileError: WebAssembly.instantiate():")) {
        /*
            We already handled that error via the Module['printErr'] callback.
         */
        event.preventDefault();
        return;
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
    private static readonly kProcessBufferSize = 4096 * 2;

    private readonly channelCount: number;
    private readonly type: OpusType;
    private nativeHandle: any;

    private fn_newHandle: any;
    private fn_decode: any;
    private fn_encode: any;
    private fn_reset: any;

    private nativeBufferPtr: number;
    private processBuffer: Uint8Array;

    constructor(channelCount: number, type: OpusType) {
        this.channelCount = channelCount;
        this.type = type;
    }

    name(): string {
        return "Opus (Type: " + OpusWorker[this.type] + " Channels: " + this.channelCount + ")";
    }

    initialise?() : string {
        this.fn_newHandle = OpusModule.cwrap("codec_opus_createNativeHandle", "number", ["number", "number"]);
        this.fn_decode = OpusModule.cwrap("codec_opus_decode", "number", ["number", "number", "number", "number"]);
        this.fn_encode = OpusModule.cwrap("codec_opus_encode", "number", ["number", "number", "number", "number"]);
        this.fn_reset = OpusModule.cwrap("codec_opus_reset", "number", ["number"]);

        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);

        this.nativeBufferPtr = OpusModule._malloc(OpusWorker.kProcessBufferSize);
        this.processBuffer = new Uint8Array(OpusModule.HEAPU8.buffer, this.nativeBufferPtr, OpusWorker.kProcessBufferSize);
        return undefined;
    }

    deinitialise() { } //TODO

    decode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array): number | string {
        if (buffer.byteLength > this.processBuffer.byteLength)
            return "supplied data exceeds internal buffer";

        this.processBuffer.set(buffer);

        let result = this.fn_decode(this.nativeHandle, this.processBuffer.byteOffset, buffer.byteLength, this.processBuffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown decode error " + result;

        const resultByteLength = result * this.channelCount * 4;
        const resultBuffer = responseBuffer(resultByteLength);
        resultBuffer.set(this.processBuffer.subarray(0, resultByteLength), 0);
        return resultByteLength;
    }

    encode(buffer: Uint8Array, responseBuffer: (length: number) => Uint8Array): number | string {
        if (buffer.byteLength > this.processBuffer.byteLength)
            return "supplied data exceeds internal buffer";

        this.processBuffer.set(buffer);

        let result = this.fn_encode(this.nativeHandle, this.processBuffer.byteOffset, buffer.byteLength, this.processBuffer.byteLength);
        if (result < 0) return OPUS_ERROR_CODES[-result] || "unknown encode error " + result;

        const resultBuffer = responseBuffer(result);
        resultBuffer.set(this.processBuffer.subarray(0, result), 0);
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
        /* could be directly required since it's just a file reference */
        const [ moduleCreator, wasmFile ] = await Promise.all([
            import("tc-backend/web/assembly/TeaWeb-Worker-Codec-Opus.js"),

            // @ts-ignore
            import("tc-backend/web/assembly/TeaWeb-Worker-Codec-Opus.wasm")
        ]);

        const module = moduleCreator(Object.assign(OpusModule, {
            locateFile(file: string) {
                return file.endsWith(".wasm") ? wasmFile.default : file;
            }
        }));

        if(module !== OpusModule)
            throw "invalid opus module object";
    } catch (e) {
        OpusModule['onAbort']("Failed to load native scripts");
    }

    await runtimeInitializedPromise;
    return true;
});