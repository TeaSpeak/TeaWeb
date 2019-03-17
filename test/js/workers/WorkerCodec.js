const prefix = "[CodecWorker] ";
const workerCallbackToken = "callback_token";
let codecInstance;
onmessage = function (e) {
    let data = e.data;
    let res = {};
    res.token = data.token;
    res.success = false;
    //console.log(prefix + " Got from main: %o", data);
    switch (data.command) {
        case "initialise":
            let error;
            console.log(prefix + "Got initialize for type " + CodecType[data.type]);
            switch (data.type) {
                case CodecType.OPUS_MUSIC:
                    codecInstance = new OpusWorker(2, OpusType.AUDIO);
                    break;
                case CodecType.OPUS_VOICE:
                    codecInstance = new OpusWorker(1, OpusType.VOIP);
                    break;
                default:
                    error = "Could not find worker type!";
                    console.error("Could not resolve opus type!");
                    break;
            }
            error = error || codecInstance.initialise();
            if (error)
                res["message"] = error;
            else
                res["success"] = true;
            break;
        case "encodeSamples":
            let encodeArray = new Float32Array(data.dataLength);
            for (let index = 0; index < encodeArray.length; index++)
                encodeArray[index] = data.data[index];
            let encodeResult = codecInstance.encode(encodeArray);
            if (typeof encodeResult === "string") {
                res.message = encodeResult;
            }
            else {
                res.success = true;
                res.data = encodeResult;
                res.dataLength = encodeResult.length;
            }
            break;
        case "decodeSamples":
            let decodeArray = new Uint8Array(data.dataLength);
            for (let index = 0; index < decodeArray.length; index++)
                decodeArray[index] = data.data[index];
            let decodeResult = codecInstance.decode(decodeArray);
            if (typeof decodeResult === "string") {
                res.message = decodeResult;
            }
            else {
                res.success = true;
                res.data = decodeResult;
                res.dataLength = decodeResult.length;
            }
            break;
        case "reset":
            codecInstance.reset();
            break;
        default:
            console.error(prefix + "Unknown type " + data.command);
    }
    if (res.token && res.token.length > 0)
        sendMessage(res, e.origin);
};
function printMessageToServerTab(message) {
    /*
    sendMessage({
        token: workerCallbackToken,
        type: "chatmessage_server",
        message: message
    });
    */
}
function sendMessage(message, origin) {
    message["timestamp"] = Date.now();
    postMessage(message);
}
/// <reference path="CodecWorker.ts" />
const WASM_ERROR_MESSAGES = [
    'no native wasm support detected'
];
this["Module"] = this["Module"] || {};
let initialized = false;
Module['onRuntimeInitialized'] = function () {
    initialized = true;
    console.log(prefix + "Initialized!");
    sendMessage({
        token: workerCallbackToken,
        type: "loaded",
        success: true
    });
};
let abort_message = undefined;
let last_error_message;
Module['print'] = function () {
    if (arguments.length == 1 && arguments[0] == abort_message)
        return; /* we don't need to reprint the abort message! */
    console.log(...arguments);
};
Module['printErr'] = function () {
    if (arguments.length == 1 && arguments[0] == abort_message)
        return; /* we don't need to reprint the abort message! */
    last_error_message = arguments[0];
    for (const suppress of WASM_ERROR_MESSAGES)
        if (arguments[0].indexOf(suppress) != -1)
            return;
    console.error(...arguments);
};
Module['onAbort'] = (message) => {
    /* no native wasm support detected */
    Module['onAbort'] = undefined;
    if (message instanceof DOMException)
        message = "DOMException (" + message.name + "): " + message.code + " => " + message.message;
    else {
        abort_message = message;
        if (message.indexOf("no binaryen method succeeded") != -1)
            for (const error of WASM_ERROR_MESSAGES)
                if (last_error_message.indexOf(error) != -1) {
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
}
catch (e) {
    if (typeof (Module['onAbort']) === "function") {
        console.log(e);
        Module['onAbort']("Failed to load native scripts");
    } /* else the error had been already handled because its a WASM error */
}
var OpusType;
(function (OpusType) {
    OpusType[OpusType["VOIP"] = 2048] = "VOIP";
    OpusType[OpusType["AUDIO"] = 2049] = "AUDIO";
    OpusType[OpusType["RESTRICTED_LOWDELAY"] = 2051] = "RESTRICTED_LOWDELAY";
})(OpusType || (OpusType = {}));
class OpusWorker {
    constructor(channelCount, type) {
        this.bufferSize = 4096 * 2;
        this.channelCount = channelCount;
        this.type = type;
    }
    name() {
        return "Opus (Type: " + OpusWorker[this.type] + " Channels: " + this.channelCount + ")";
    }
    initialise() {
        this.fn_newHandle = Module.cwrap("codec_opus_createNativeHandle", "pointer", ["number", "number"]);
        this.fn_decode = Module.cwrap("codec_opus_decode", "number", ["pointer", "pointer", "number", "number"]);
        /* codec_opus_decode(handle, buffer, length, maxlength) */
        this.fn_encode = Module.cwrap("codec_opus_encode", "number", ["pointer", "pointer", "number", "number"]);
        this.fn_reset = Module.cwrap("codec_opus_reset", "number", ["pointer"]);
        this.nativeHandle = this.fn_newHandle(this.channelCount, this.type);
        this.encodeBufferRaw = Module._malloc(this.bufferSize);
        this.encodeBuffer = new Float32Array(Module.HEAPF32.buffer, this.encodeBufferRaw, this.bufferSize / 4);
        this.decodeBufferRaw = Module._malloc(this.bufferSize);
        this.decodeBuffer = new Uint8Array(Module.HEAPU8.buffer, this.decodeBufferRaw, this.bufferSize);
        return undefined;
    }
    deinitialise() { } //TODO
    decode(data) {
        if (data.byteLength > this.decodeBuffer.byteLength)
            return "Data to long!";
        this.decodeBuffer.set(data);
        //console.log("decode(" + data.length + ")");
        //console.log(data);
        let result = this.fn_decode(this.nativeHandle, this.decodeBuffer.byteOffset, data.byteLength, this.decodeBuffer.byteLength);
        if (result < 0) {
            return "invalid result on decode (" + result + ")";
        }
        return Module.HEAPF32.slice(this.decodeBuffer.byteOffset / 4, (this.decodeBuffer.byteOffset / 4) + (result * this.channelCount));
    }
    encode(data) {
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
var CodecType;
(function (CodecType) {
    CodecType[CodecType["OPUS_VOICE"] = 0] = "OPUS_VOICE";
    CodecType[CodecType["OPUS_MUSIC"] = 1] = "OPUS_MUSIC";
    CodecType[CodecType["SPEEX_NARROWBAND"] = 2] = "SPEEX_NARROWBAND";
    CodecType[CodecType["SPEEX_WIDEBAND"] = 3] = "SPEEX_WIDEBAND";
    CodecType[CodecType["SPEEX_ULTRA_WIDEBAND"] = 4] = "SPEEX_ULTRA_WIDEBAND";
    CodecType[CodecType["CELT_MONO"] = 5] = "CELT_MONO";
})(CodecType || (CodecType = {}));
class BufferChunk {
    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
    copyRangeTo(target, maxLength, offset) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        //TODO may warning if channel counts are not queal?
        for (let channel = 0; channel < Math.min(target.numberOfChannels, this.buffer.numberOfChannels); channel++) {
            target.getChannelData(channel).set(this.buffer.getChannelData(channel).subarray(this.index, this.index + copy), offset);
        }
        return copy;
    }
}
class CodecClientCache {
    constructor() {
        this._chunks = [];
    }
    bufferedSamples(max = 0) {
        let value = 0;
        for (let i = 0; i < this._chunks.length && value < max; i++)
            value += this._chunks[i].buffer.length - this._chunks[i].index;
        return value;
    }
}
//# sourceMappingURL=WorkerCodec.js.map