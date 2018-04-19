const prefix = "[CodecWorker] ";
const workerCallbackToken = "callback_token";
var CodecWorkerType;
(function (CodecWorkerType) {
    CodecWorkerType[CodecWorkerType["WORKER_OPUS"] = 0] = "WORKER_OPUS";
})(CodecWorkerType || (CodecWorkerType = {}));
let codecInstance;
onmessage = function (e) {
    let data = JSON.parse(e.data);
    let res = {};
    res.token = data.token;
    res.success = false;
    //console.log(prefix + " Got from main: %o", data);
    switch (data.command) {
        case "initialise":
            console.log(prefix + "Got initialize for type " + CodecWorkerType[data.type]);
            switch (data.type) {
                case CodecWorkerType.WORKER_OPUS:
                    codecInstance = new OpusWorker(data.channelCount, data.channelCount == 1 ? OpusType.VOIP : OpusType.AUDIO);
                    break;
                default:
                    res.message = "Could not find worker type!";
                    console.error("Could not resolve opus type!");
                    return;
            }
            let error = codecInstance.initialise();
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
function sendMessage(message, origin) {
    //console.log(prefix + " Send to main: %o", message);
    postMessage(JSON.stringify(message));
}
/// <reference path="CodecWorker.ts" />
this["Module"] = typeof this["Module"] !== "undefined" ? this["Module"] : {};
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
Module['onAbort'] = message => {
    Module['onAbort'] = undefined;
    sendMessage({
        token: workerCallbackToken,
        type: "loaded",
        success: false,
        message: message
    });
};
try {
    Module['locateFile'] = file => "../../asm/generated/" + file;
    importScripts("../../asm/generated/TeaWeb-Worker-Codec-Opus.js");
}
catch (e) {
    try {
        Module['locateFile'] = file => "../assembly/" + file;
        importScripts("../assembly/TeaWeb-Worker-Codec-Opus.js");
    }
    catch (e) {
        console.log(e);
        Module['onAbort']("Cloud not load native script!");
    }
}
//let Module = typeof Module !== 'undefined' ? Module : {};
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
//# sourceMappingURL=WorkerCodec.js.map