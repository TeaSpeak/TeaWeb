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
//let Module = typeof Module !== 'undefined' ? Module : {};
try {
    Module['locateFile'] = file => "../../asm/generated/" + file;
    importScripts("../../asm/generated/TeaWeb-Worker-Codec-Opus.js");
}
catch (e) {
    console.error("Could not load native script!");
    console.log(e);
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
//# sourceMappingURL=OpusCodec.js.map