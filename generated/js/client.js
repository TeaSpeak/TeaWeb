var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["PREBUFFERING"] = 0] = "PREBUFFERING";
    PlayerState[PlayerState["PLAYING"] = 1] = "PLAYING";
    PlayerState[PlayerState["BUFFERING"] = 2] = "BUFFERING";
    PlayerState[PlayerState["STOPPING"] = 3] = "STOPPING";
    PlayerState[PlayerState["STOPPED"] = 4] = "STOPPED";
})(PlayerState || (PlayerState = {}));
class AudioController {
    constructor() {
        this.playerState = PlayerState.STOPPED;
        this.audioCache = [];
        this.playingAudioCache = [];
        this._volume = 1;
        this._codecCache = [];
        this._timeIndex = 0;
        this.allowBuffering = true;
        this.speakerContext = AudioController.globalContext;
        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }
    static get globalContext() {
        if (this._globalContext)
            return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }
    static initializeAudioController() {
        //this._globalReplayScheduler = setInterval(() => { AudioController.invokeNextReplay(); }, 20); //Fix me
    }
    initialize() {
        AudioController._audioInstances.push(this);
    }
    close() {
        AudioController._audioInstances.remove(this);
    }
    playBuffer(buffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isn't equal to playback sample rate! (" + buffer.sampleRate + " | " + this.speakerContext.sampleRate + ")");
        this.applayVolume(buffer);
        this.audioCache.push(buffer);
        if (this.playerState == PlayerState.STOPPED || this.playerState == PlayerState.STOPPING) {
            console.log("[Audio] Starting new playback");
            this.playerState = PlayerState.PREBUFFERING;
            //New audio
        }
        switch (this.playerState) {
            case PlayerState.PREBUFFERING:
            case PlayerState.BUFFERING:
                if (this.audioCache.length < 3) {
                    if (this.playerState == PlayerState.BUFFERING) {
                        if (this.allowBuffering)
                            break;
                    }
                    else
                        break;
                }
                if (this.playerState == PlayerState.PREBUFFERING) {
                    console.log("[Audio] Prebuffering succeeded (Replaying now)");
                    this.onSpeaking();
                }
                else {
                    if (this.allowBuffering)
                        console.log("[Audio] Buffering succeeded (Replaying now)");
                }
                this.playerState = PlayerState.PLAYING;
            case PlayerState.PLAYING:
                this.playQueue();
                break;
            default:
                break;
        }
    }
    playQueue() {
        let buffer;
        while (buffer = this.audioCache.pop_front()) {
            if (this._timeIndex < this.speakerContext.currentTime)
                this._timeIndex = this.speakerContext.currentTime;
            let player = this.speakerContext.createBufferSource();
            player.buffer = buffer;
            player.onended = () => this.removeNode(player);
            this.playingAudioCache.push(player);
            player.connect(this.speakerContext.destination);
            player.start(this._timeIndex);
            this._timeIndex += buffer.duration;
        }
    }
    removeNode(node) {
        this.playingAudioCache.remove(node);
        this.testBufferQueue();
    }
    stopAudio(now = false) {
        this.playerState = PlayerState.STOPPING;
        if (now) {
            this.playerState = PlayerState.STOPPED;
            this.audioCache = [];
            for (let entry of this.playingAudioCache)
                entry.stop(0);
            this.playingAudioCache = [];
        }
        this.testBufferQueue();
    }
    testBufferQueue() {
        if (this.audioCache.length == 0 && this.playingAudioCache.length == 0) {
            if (this.playerState != PlayerState.STOPPING) {
                this.playerState = PlayerState.BUFFERING;
                if (!this.allowBuffering)
                    console.warn("[Audio] Detected a buffer underflow!");
            }
            else {
                this.playerState = PlayerState.STOPPED;
                this.onSilence();
            }
        }
    }
    get volume() { return this._volume; }
    set volume(val) {
        if (this._volume == val)
            return;
        this._volume = val;
        for (let buffer of this.audioCache)
            this.applayVolume(buffer);
    }
    applayVolume(buffer) {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            let data = buffer.getChannelData(channel);
            for (let sample = 0; sample < data.length; sample++) {
                let lane = data[sample];
                lane *= this._volume;
                data[sample] = lane;
            }
        }
    }
    codecCache(codec) {
        while (this._codecCache.length <= codec)
            this._codecCache.push(new CodecClientCache());
        return this._codecCache[codec];
    }
}
AudioController._audioInstances = [];
AudioController._timeIndex = 0;
if (!Array.prototype.remove) {
    Array.prototype.remove = function (elem) {
        const index = this.indexOf(elem, 0);
        if (index > -1) {
            this.splice(index, 1);
            return true;
        }
        return false;
    };
}
if (!Array.prototype.pop_front) {
    Array.prototype.pop_front = function () {
        if (this.length == 0)
            return undefined;
        return this.splice(0, 1)[0];
    };
}
if (!Array.prototype.last) {
    Array.prototype.last = function () {
        if (this.length == 0)
            return undefined;
        return this[this.length - 1];
    };
}
if (typeof ($) !== "undefined") {
    if (!$.spawn) {
        $.spawn = function (tagName) {
            return $(document.createElement(tagName));
        };
    }
}
if (!String.prototype.format) {
    String.prototype.format = function () {
        const args = arguments;
        let array = args.length == 1 && $.isArray(args[0]);
        return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
            if (m == "{{") {
                return "{";
            }
            if (m == "}}") {
                return "}";
            }
            return array ? args[0][n] : args[n];
        });
    };
}
function concatenate(resultConstructor, ...arrays) {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new resultConstructor(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
function formatDate(secs) {
    let years = Math.floor(secs / (60 * 60 * 24 * 365));
    let days = Math.floor(secs / (60 * 60 * 24)) % 365;
    let hours = Math.floor(secs / (60 * 60)) % 24;
    let minutes = Math.floor(secs / 60) % 60;
    let seconds = Math.floor(secs % 60);
    let result = "";
    if (years > 0)
        result += years + " years ";
    if (years > 0 || days > 0)
        result += days + " days ";
    if (years > 0 || days > 0 || hours > 0)
        result += hours + " hours ";
    if (years > 0 || days > 0 || hours > 0 || minutes > 0)
        result += minutes + " minutes ";
    if (years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
        result += seconds + " seconds ";
    else
        result = "now ";
    return result.substr(0, result.length - 1);
}
class BufferChunk {
    constructor(buffer) {
        this.buffer = buffer;
        this.index = 0;
    }
    copyRangeTo(target, maxLength, offset) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        for (let channel = 0; channel < this.buffer.numberOfChannels; channel++) {
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
$(document).on("mousedown", function (e) {
    if ($(e.target).parents(".modal").length == 0) {
        $(".modal:visible").last().find(".close").trigger("click");
    }
});
const ModalFunctions = {
    divify: function (val) {
        if (val.length > 1)
            return $.spawn("div").append(val);
        return val;
    },
    jqueriefy: function (val) {
        if ($.isFunction(val))
            val = val();
        switch (typeof val) {
            case "string": return $("<div>" + val + "</div>");
            case "object": return val;
            case "undefined":
                console.warn("Got undefined type!");
                return $.spawn("div");
            default:
                console.error("Invalid type " + typeof val);
                return $();
        }
    },
    warpProperties(data) {
        if (data instanceof ModalProperties)
            return data;
        else {
            let props = new ModalProperties();
            for (let key in data)
                props[key] = data[key];
            return props;
        }
    }
};
class ModalProperties {
    constructor() {
        this.header = () => "HEADER";
        this.body = () => "BODY";
        this.footer = () => "FOOTER";
        this.closeListener = () => { };
        this.width = "60%";
        this.hight = "auto";
        this.closeable = true;
    }
    registerCloseListener(listener) {
        if (this.closeListener) {
            if ($.isArray(this.closeListener))
                this.closeListener.push(listener);
            else
                this.closeListener = [this.closeListener, listener];
        }
        else
            this.closeListener = listener;
        return this;
    }
    triggerClose() {
        if ($.isArray(this.closeListener))
            for (let listener of this.closeListener)
                listener();
        else
            this.closeListener();
    }
}
class Modal {
    constructor(props) {
        this.properties = props;
    }
    get htmlTag() {
        if (!this._htmlTag)
            this._create();
        return this._htmlTag;
    }
    _create() {
        let modal = $.spawn("div");
        modal.addClass("modal");
        let content = $.spawn("div");
        content.addClass("modal-content");
        content.css("width", this.properties.width);
        let header = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.header)).addClass("modal-header");
        if (this.properties.closeable)
            header.append("<span class=\"close\">&times;</span>");
        let body = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.body)).addClass("modal-body");
        let footer = ModalFunctions.divify(ModalFunctions.jqueriefy(this.properties.footer)).addClass("modal-footer");
        content.append(header);
        content.append(body);
        content.append(footer);
        modal.append(content);
        modal.find(".close").click(function () {
            if (this.properties.closeable)
                this.close();
        }.bind(this));
        this._htmlTag = modal;
    }
    open() {
        this.htmlTag.appendTo($("body"));
        this.htmlTag.show();
    }
    close() {
        const _this = this;
        this.htmlTag.animate({ opacity: 0 }, () => {
            _this.htmlTag.detach();
        });
        this.properties.triggerClose();
    }
}
function createModal(data) {
    return new Modal(ModalFunctions.warpProperties(data));
}
class InputModalProperties extends ModalProperties {
}
function createInputModal(headMessage, question, validator, callback, props = {}) {
    props = ModalFunctions.warpProperties(props);
    let head = $.spawn("div");
    head.css("border-bottom", "grey solid");
    head.css("border-width", "1px");
    ModalFunctions.jqueriefy(headMessage).appendTo(head);
    let body = $.spawn("div");
    ModalFunctions.divify(ModalFunctions.jqueriefy(question)).appendTo(body);
    let input = $.spawn("input");
    input.css("width", "100%");
    input.appendTo(body);
    console.log(input);
    let footer = $.spawn("div");
    footer.addClass("modal-button-group");
    footer.css("margin-top", "5px");
    let buttonCancel = $.spawn("button");
    buttonCancel.text("Cancel");
    let buttonOk = $.spawn("button");
    buttonOk.text("Ok");
    footer.append(buttonCancel);
    footer.append(buttonOk);
    input.on("keydown", function (event) {
        if (event.keyCode == 13 /* Enter */) {
            buttonOk.trigger("click");
        }
    });
    let updateValidation = function () {
        let text = input.val().toString();
        let flag = (!props.maxLength || text.length <= props.maxLength) && validator(text);
        if (flag) {
            input.removeClass("invalid_input");
            buttonOk.removeAttr("disabled");
        }
        else {
            if (!input.hasClass("invalid_input"))
                input.addClass("invalid_input");
            buttonOk.attr("disabled", "true");
        }
    };
    input.on("keyup", updateValidation);
    let callbackCalled = false;
    let wrappedCallback = function (flag) {
        if (callbackCalled)
            return;
        callbackCalled = true;
        callback(flag);
    };
    let modal;
    buttonOk.on("click", () => {
        wrappedCallback(input.val().toString());
        modal.close();
    });
    buttonCancel.on("click", () => {
        wrappedCallback(false);
        modal.close();
    });
    props.header = head;
    props.body = body;
    props.footer = footer;
    props.closeListener = () => wrappedCallback(false);
    modal = createModal(props);
    return modal;
}
function createErrorModal(header, message, props = { footer: "" }) {
    props = ModalFunctions.warpProperties(props);
    let head = $.spawn("div");
    head.addClass("modal-head-error");
    ModalFunctions.divify(ModalFunctions.jqueriefy(header)).appendTo(head);
    props.header = head;
    props.body = ModalFunctions.divify(ModalFunctions.jqueriefy(message));
    props.footer = ModalFunctions.divify(ModalFunctions.jqueriefy(""));
    return createModal(props);
}
/// <reference path="VoiceHandler.ts" />
/// <reference path="../utils/modal.ts" />
class VoiceActivityDetector {
    initialise() { }
    finalize() { }
    initialiseNewStream(old, _new) { }
    changeHandle(handle, triggerNewStream) {
        const oldStream = !this.handle ? undefined : this.handle.getMicrophoneStream();
        this.handle = handle;
        if (triggerNewStream)
            this.initialiseNewStream(oldStream, !handle ? undefined : handle.getMicrophoneStream());
    }
}
class VoiceRecorder {
    constructor(handle) {
        this.on_data = (data) => { };
        this.on_end = () => { };
        this._recording = false;
        this.microphoneStream = undefined;
        this.mediaStream = undefined;
        this._chunkCount = 0;
        this.handle = handle;
        this.userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        this._deviceId = settings.global("microphone_id", "default");
        this.audioContext = AudioController.globalContext;
        this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);
        this.processor.addEventListener('audioprocess', ev => {
            if (this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer))
                this.on_data(ev.inputBuffer, this._chunkCount++ == 0);
            else {
                if (this._chunkCount != 0)
                    this.on_end();
                this._chunkCount = 0;
            }
        });
        //Not needed but make sure we have data for the preprocessor
        this.mute = this.audioContext.createGain();
        this.mute.gain.setValueAtTime(0, 0);
        this.processor.connect(this.mute);
        this.mute.connect(this.audioContext.destination);
        //this.setVADHander(new MuteVAD());
        this.setVADHander(new PassThroughVAD());
    }
    avariable() {
        return !!this.userMedia;
    }
    recording() {
        return this._recording;
    }
    getMediaStream() {
        return this.mediaStream;
    }
    getDestinationContext() {
        return this.mute;
    }
    getMicrophoneStream() {
        return this.microphoneStream;
    }
    reinitialiseVAD() {
        let type = settings.global("vad_type", "vad");
        if (type == "ppt") {
            let keyCode = parseInt(settings.global("vad_ppt_key", 84 /* T */.toString()));
            if (!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHander(new PushToTalkVAD(keyCode));
            else
                this.getVADHandler().key = keyCode;
        }
        else if (type == "pt") {
            if (!(this.getVADHandler() instanceof PassThroughVAD))
                this.setVADHander(new PassThroughVAD());
        }
        else if (type == "vad") {
            if (!(this.getVADHandler() instanceof VoiceActivityDetectorVAD))
                this.setVADHander(new VoiceActivityDetectorVAD());
            let threshold = parseInt(settings.global("vad_threshold", "50"));
            this.getVADHandler().percentageThreshold = threshold;
        }
        else {
            console.warn("Invalid VAD handler! (" + type + ")");
        }
    }
    setVADHander(handler) {
        if (this.vadHandler) {
            this.vadHandler.changeHandle(null, true);
            this.vadHandler.finalize();
        }
        this.vadHandler = handler;
        this.vadHandler.changeHandle(this, false);
        this.vadHandler.initialise();
        this.vadHandler.initialiseNewStream(undefined, this.microphoneStream);
    }
    getVADHandler() {
        return this.vadHandler;
    }
    update(flag) {
        if (this._recording == flag)
            return;
        if (flag)
            this.start(this._deviceId);
        else
            this.stop();
    }
    changeDevice(device) {
        if (this._deviceId == device)
            return;
        this._deviceId = device;
        settings.changeGlobal("microphone_id", device);
        if (this._recording) {
            this.stop();
            this.start(device);
        }
    }
    start(device) {
        this._deviceId = device;
        console.log("Attempt recording!");
        this._recording = true;
        this.userMedia({
            audio: true,
            deviceId: device
        }, this.on_microphone.bind(this), error => {
            createErrorModal("Could not resolve microphone!", "Could not resolve microphone!<br>Message: " + error).open();
            console.error("Could not get microphone!");
            console.error(error);
        });
    }
    stop() {
        console.log("Stop recording!");
        this._recording = false;
        if (this.microphoneStream)
            this.microphoneStream.disconnect();
        this.microphoneStream = undefined;
        if (this.mediaStream) {
            if (this.mediaStream.stop)
                this.mediaStream.stop();
            else
                this.mediaStream.getTracks().forEach(value => {
                    value.stop();
                });
        }
        this.mediaStream = undefined;
    }
    on_microphone(stream) {
        if (this.microphoneStream) {
            this.stop(); //Disconnect old stream
        }
        console.log("Start recording!");
        this.mediaStream = stream;
        const oldStream = this.microphoneStream;
        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
        this.vadHandler.initialiseNewStream(oldStream, this.microphoneStream);
    }
}
VoiceRecorder.CHANNEL = 0;
VoiceRecorder.CHANNELS = 1;
VoiceRecorder.BUFFER_SIZE = 1024;
class MuteVAD extends VoiceActivityDetector {
    shouldRecord(buffer) {
        return false;
    }
}
class PassThroughVAD extends VoiceActivityDetector {
    shouldRecord(buffer) {
        return true;
    }
}
class VoiceActivityDetectorVAD extends VoiceActivityDetector {
    constructor() {
        super(...arguments);
        this.continuesCount = 0;
        this.maxContinuesCount = 12;
        this.percentageThreshold = 50;
        this.percentage_listener = ($) => { };
    }
    initialise() {
        this.analyzer = AudioController.globalContext.createAnalyser();
        this.analyzer.smoothingTimeConstant = 1; //TODO test
        this.buffer = new Uint8Array(this.analyzer.fftSize);
        return super.initialise();
    }
    initialiseNewStream(old, _new) {
        if (this.analyzer)
            this.analyzer.disconnect();
        if (_new)
            _new.connect(this.analyzer);
    }
    shouldRecord(buffer) {
        let usage = this.calculateUsage();
        if ($.isFunction(this.percentage_listener))
            this.percentage_listener(usage);
        if (usage >= this.percentageThreshold) {
            this.continuesCount = 0;
        }
        else
            this.continuesCount++;
        return this.continuesCount < this.maxContinuesCount;
    }
    calculateUsage() {
        let total = 0, float, rms;
        this.analyzer.getByteTimeDomainData(this.buffer);
        for (let index = 0; index < this.analyzer.fftSize; index++) {
            float = (this.buffer[index++] / 0x7f) - 1;
            total += (float * float);
        }
        rms = Math.sqrt(total / this.analyzer.fftSize);
        let db = 20 * (Math.log(rms) / Math.log(10));
        // sanity check
        db = Math.max(-192, Math.min(db, 0));
        let percentage = 100 + (db * 1.92);
        return percentage;
    }
}
class PushToTalkVAD extends VoiceActivityDetector {
    constructor(key) {
        super();
        this._pushed = false;
        this._evListenerDown = (e) => {
            //console.log("Down -> " + e.key + " -> " + e.keyCode);
            if (e.key == String.fromCharCode(this._key))
                this.pushed = true;
        };
        this._evListenerUp = e => {
            if (e.key == String.fromCharCode(this._key))
                this.pushed = false;
        };
        this._key = key;
    }
    initialise() {
        document.addEventListener("keydown", this._evListenerDown);
        document.addEventListener("keyup", this._evListenerUp);
        return super.initialise();
    }
    finalize() {
        document.removeEventListener("keydown", this._evListenerDown);
        document.removeEventListener("keyup", this._evListenerUp);
        return super.finalize();
    }
    set pushed(flag) {
        this._pushed = flag;
    }
    set key(key) {
        this._key = key;
        this._pushed = false;
    }
    shouldRecord(buffer) {
        return this._pushed;
    }
}
/// <reference path="../client.ts" />
/// <reference path="../codec/Codec.ts" />
/// <reference path="VoiceRecorder.ts" />
class CodecPoolEntry {
}
class CodecPool {
    constructor(handle, index, name, creator) {
        this.entries = [];
        this.maxInstances = 2;
        this._supported = true;
        this.creator = creator;
        this.handle = handle;
        this.codecIndex = index;
        this.name = name;
    }
    initialize(cached) {
        for (let i = 0; i < cached; i++)
            this.ownCodec(i + 1).then(codec => {
                console.log("Release again! (%o)", codec);
                this.releaseCodec(i + 1);
            }).catch(error => {
                if (this._supported) {
                    createErrorModal("Could not load codec driver", "Could not load or initialize codec " + this.name + "<br>" +
                        "Error: <code>" + JSON.stringify(error) + "</code>").open();
                }
                this._supported = false;
                console.error(error);
            });
    }
    supported() { return this.creator != undefined && this._supported; }
    ownCodec(clientId, create = true) {
        return new Promise((resolve, reject) => {
            if (!this.creator || !this._supported) {
                reject("unsupported codec!");
                return;
            }
            let freeSlot = 0;
            for (let index = 0; index < this.entries.length; index++) {
                if (this.entries[index].owner == clientId) {
                    this.entries[index].last_access = new Date().getTime();
                    if (this.entries[index].instance.initialized())
                        resolve(this.entries[index].instance);
                    else {
                        this.entries[index].instance.initialise().then((flag) => {
                            //TODO test success flag
                            console.error(flag);
                            this.ownCodec(clientId, false).then(resolve).catch(reject);
                        }).catch(error => {
                            console.error("Could not initialize codec!\nError: %o", error);
                            reject("Could not initialize codec!");
                        });
                    }
                    return;
                }
                else if (freeSlot == 0 && this.entries[index].owner == 0) {
                    freeSlot = index;
                }
            }
            if (!create) {
                resolve(undefined);
                return;
            }
            if (freeSlot == 0) {
                freeSlot = this.entries.length;
                let entry = new CodecPoolEntry();
                entry.instance = this.creator();
                entry.instance.on_encoded_data = buffer => this.handle.sendVoicePacket(buffer, this.codecIndex);
                this.entries.push(entry);
            }
            this.entries[freeSlot].owner = clientId;
            this.entries[freeSlot].last_access = new Date().getTime();
            if (this.entries[freeSlot].instance.initialized())
                this.entries[freeSlot].instance.reset();
            else {
                this.ownCodec(clientId, false).then(resolve).catch(reject);
                return;
            }
            resolve(this.entries[freeSlot].instance);
        });
    }
    releaseCodec(clientId) {
        for (let index = 0; index < this.entries.length; index++)
            if (this.entries[index].owner == clientId)
                this.entries[index].owner = 0;
    }
}
class VoiceConnection {
    constructor(client) {
        this.codecPool = [
            new CodecPool(this, 0, "Spex A", undefined),
            new CodecPool(this, 1, "Spex B", undefined),
            new CodecPool(this, 2, "Spex C", undefined),
            new CodecPool(this, 3, "CELT Mono", undefined),
            new CodecPool(this, 4, "Opus Voice", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 1); }),
            new CodecPool(this, 5, "Opus Music", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 2); }) //opus music
        ];
        this.vpacketId = 0;
        this.chunkVPacketId = 0;
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        this.voiceRecorder.on_data = this.handleVoiceData.bind(this);
        this.voiceRecorder.on_end = this.handleVoiceEnded.bind(this);
        this.voiceRecorder.reinitialiseVAD();
        this.codecPool[4].initialize(2);
        this.codecPool[5].initialize(2);
    }
    codecSupported(type) {
        return this.codecPool.length > type && this.codecPool[type].supported();
    }
    sendVoicePacket(data, codec) {
        if (this.dataChannel) {
            this.vpacketId++;
            if (this.vpacketId > 65535)
                this.vpacketId = 0;
            let packet = new Uint8Array(data.byteLength + 2 + 3);
            packet[0] = this.chunkVPacketId++ < 5 ? 1 : 0; //Flag header
            packet[1] = 0; //Flag fragmented
            packet[2] = (this.vpacketId >> 8) & 0xFF; //HIGHT (voiceID)
            packet[3] = (this.vpacketId >> 0) & 0xFF; //LOW   (voiceID)
            packet[4] = codec; //Codec
            packet.set(data, 5);
            this.dataChannel.send(packet);
        }
        else {
            console.warn("Could not transfer audio (not connected)");
        }
    }
    createSession() {
        const config = { /*iceServers: [{ url: 'stun:stun.l.google.com:19302' }]*/};
        this.rtcPeerConnection = new RTCPeerConnection(config);
        const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
        this.dataChannel = this.rtcPeerConnection.createDataChannel('main', dataChannelConfig);
        this.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
        this.dataChannel.onopen = this.onDataChannelOpen.bind(this);
        this.dataChannel.binaryType = "arraybuffer";
        let sdpConstraints = {};
        sdpConstraints.offerToReceiveAudio = 0;
        sdpConstraints.offerToReceiveVideo = 0;
        this.rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
        this.rtcPeerConnection.createOffer(this.onOfferCreated.bind(this), () => {
            console.error("Could not create ice offer!");
        }, sdpConstraints);
    }
    dropSession() {
        if (this.dataChannel)
            this.dataChannel.close();
        if (this.rtcPeerConnection)
            this.rtcPeerConnection.close();
        //TODO here!
    }
    handleControlPacket(json) {
        if (json["request"] === "create") {
            this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: json["sdp"] }));
        }
        else if (json["request"] === "ice") {
            this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate({ candidate: json["candidate"], sdpMid: json["session"], sdpMLineIndex: json["line"] }));
        }
    }
    //Listeners
    onIceCandidate(event) {
        console.log("Got ice candidate! Event:");
        console.log(event);
        if (event && event.candidate) {
            this.client.serverConnection.sendData(JSON.stringify({
                type: 'WebRTC',
                request: "ice",
                candidate: event.candidate.candidate,
                line: event.candidate.sdpMLineIndex,
                session: event.candidate.sdpMid
            }));
        }
    }
    onOfferCreated(localSession) {
        console.log("Offer created and accepted");
        this.rtcPeerConnection.setLocalDescription(localSession);
        this.client.serverConnection.sendData(JSON.stringify({ type: 'WebRTC', request: "create", session: localSession }));
    }
    onDataChannelOpen(channel) {
        console.log("Got new data channel!");
    }
    onDataChannelMessage(message) {
        if (this.client.controlBar.muteOutput)
            return;
        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];
        //console.log("Client id " + clientId + " PacketID " + packetId + " Codec: " + codec);
        let client = this.client.channelTree.findClient(clientId);
        if (!client) {
            console.error("Having  voice from unknown client? (ClientID: " + clientId + ")");
            return;
        }
        let codecPool = this.codecPool[codec];
        if (!codecPool) {
            console.error("Could not playback codec " + codec);
            return;
        }
        let encodedData;
        if (message.data.subarray)
            encodedData = message.data.subarray(5);
        else
            encodedData = new Uint8Array(message.data, 5);
        if (encodedData.length == 0) {
            client.getAudioController().stopAudio();
            codecPool.releaseCodec(clientId);
        }
        else {
            codecPool.ownCodec(clientId)
                .then(decoder => decoder.decodeSamples(client.getAudioController().codecCache(codec), encodedData))
                .then(buffer => client.getAudioController().playBuffer(buffer)).catch(error => {
                console.error("Could not playback client's (" + clientId + ") audio (" + error + ")");
            });
        }
    }
    handleVoiceData(data, head) {
        if (!this.voiceRecorder)
            return;
        if (!this.client.connected)
            return false;
        if (this.client.controlBar.muteInput)
            return;
        if (head) {
            this.chunkVPacketId = 0;
            this.client.getClient().speaking = true;
        }
        //TODO Use channel codec!
        this.codecPool[4].ownCodec(this.client.getClientId())
            .then(encoder => encoder.encodeSamples(this.client.getClient().getAudioController().codecCache(4), data));
        //this.client.getClient().getAudioController().play(data);
    }
    handleVoiceEnded() {
        if (!this.voiceRecorder)
            return;
        console.log("Voice ended");
        this.client.getClient().speaking = false;
        this.sendVoicePacket(new Uint8Array(0), 4); //TODO Use channel codec!
    }
}
// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {
    // If the clicked element is not the menu
    if ($(e.target).parents(".contextMenu").length == 0) {
        // Hide it
        despawnContextMenu();
    }
});
let contextMenuCloseFn = undefined;
function despawnContextMenu() {
    let menue = $(".contextMenu");
    if (!menue.is(":visible"))
        return;
    menue.hide(100);
    if (contextMenuCloseFn)
        contextMenuCloseFn();
}
var MenuEntryType;
(function (MenuEntryType) {
    MenuEntryType[MenuEntryType["CLOSE"] = 0] = "CLOSE";
    MenuEntryType[MenuEntryType["ENTRY"] = 1] = "ENTRY";
    MenuEntryType[MenuEntryType["HR"] = 2] = "HR";
    MenuEntryType[MenuEntryType["EMPTY"] = 3] = "EMPTY";
})(MenuEntryType || (MenuEntryType = {}));
class MenuEntry {
    static HR() {
        return {
            callback: () => { },
            type: MenuEntryType.HR,
            name: "",
            icon: ""
        };
    }
    ;
    static EMPTY() {
        return {
            callback: () => { },
            type: MenuEntryType.EMPTY,
            name: "",
            icon: ""
        };
    }
    ;
    static CLOSE(callback) {
        return {
            callback: callback,
            type: MenuEntryType.EMPTY,
            name: "",
            icon: ""
        };
    }
}
function spawnMenu(x, y, ...entries) {
    const menu = $("#contextMenu");
    menu.empty();
    menu.hide();
    contextMenuCloseFn = undefined;
    let index = 0;
    for (let entry of entries) {
        if (entry.type == MenuEntryType.HR) {
            menu.append("<hr>");
        }
        else if (entry.type == MenuEntryType.CLOSE) {
            contextMenuCloseFn = entry.callback;
        }
        else if (entry.type == MenuEntryType.ENTRY) {
            let icon = $.isFunction(entry.icon) ? entry.icon() : entry.icon;
            if (icon.length == 0)
                icon = "icon_empty";
            else
                icon = "icon " + icon;
            let tag = $.spawn("li");
            tag.append("<div class='" + icon + "'></div>");
            tag.append("<div>" + ($.isFunction(entry.name) ? entry.name() : entry.name) + "</div>");
            menu.append(tag);
            if (entry.disabled || entry.invalidPermission)
                tag.addClass("disabled");
            else {
                tag.click(function () {
                    if ($.isFunction(entry.callback))
                        entry.callback();
                    despawnContextMenu();
                });
            }
        }
    }
    menu.show(100);
    // In the right position (the mouse)
    menu.css({
        "top": y + "px",
        "left": x + "px"
    });
}
//Source: https://www.movable-type.co.uk/scripts/sha1.html
var sha;
(function (sha) {
    function sha1(message) {
        let buffer = message instanceof ArrayBuffer ? message : new TextEncoder().encode(message);
        return crypto.subtle.digest("SHA-1", buffer);
    }
    sha.sha1 = sha1;
})(sha || (sha = {}));
/// <reference path="../crypto/sha.ts" />
var helpers;
(function (helpers) {
    function hashPassword(password) {
        return new Promise((resolve, reject) => {
            sha.sha1(password).then(result => {
                resolve(btoa(String.fromCharCode.apply(null, new Uint8Array(result))));
            });
        });
    }
    helpers.hashPassword = hashPassword;
})(helpers || (helpers = {}));
/// <reference path="view.ts" />
/// <reference path="../utils/helpers.ts" />
var ChannelType;
(function (ChannelType) {
    ChannelType[ChannelType["PERMANENT"] = 0] = "PERMANENT";
    ChannelType[ChannelType["SEMI_PERMANENT"] = 1] = "SEMI_PERMANENT";
    ChannelType[ChannelType["TEMPORARY"] = 2] = "TEMPORARY";
})(ChannelType || (ChannelType = {}));
(function (ChannelType) {
    function normalize(mode) {
        let value = ChannelType[mode];
        value = value.toLowerCase();
        return value[0].toUpperCase() + value.substr(1);
    }
    ChannelType.normalize = normalize;
})(ChannelType || (ChannelType = {}));
class ChannelProperties {
    constructor() {
        this.channel_order = 0;
        this.channel_name = "";
        this.channel_topic = "";
        this.channel_password = "";
        this.channel_description = "";
        this.channel_codec = 4;
        this.channel_codec_quality = 0;
        this.channel_codec_is_unencrypted = false;
        this.channel_maxclients = -1;
        this.channel_maxfamilyclients = -1;
        this.channel_needed_talk_power = 1;
        this.channel_flag_permanent = false;
        this.channel_flag_semi_permanent = false;
        this.channel_flag_default = false;
        this.channel_flag_password = false;
        this.channel_flag_maxclients_unlimited = false;
        this.channel_flag_maxfamilyclients_inherited = false;
        this.channel_flag_maxfamilyclients_unlimited = false;
    }
}
class ChannelEntry {
    constructor(channelId, channelName, parent = null, prevChannel = null) {
        this.properties = new ChannelProperties();
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this._formatedChannelName = channelName;
        this.parent = parent;
        this.prevChannel = prevChannel;
        this.channelTree = null;
        this.initializeTag();
        this.__updateChannelName();
    }
    channelName() {
        return this.properties.channel_name;
    }
    formatedChannelName() {
        return this._formatedChannelName ? this._formatedChannelName : this.properties.channel_name;
    }
    parentChannel() { return this.parent; }
    hasParent() { return this.parent != null; }
    getChannelId() { return this.channelId; }
    channelClass() { return "channel_full"; }
    siblings(deep = false) {
        const result = [];
        if (this.channelTree == null)
            return [];
        const self = this;
        this.channelTree.channels.forEach(function (entry) {
            let current = entry;
            if (deep) {
                while (current) {
                    if (current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            }
            else if (current.parentChannel() == self)
                result.push(entry);
        });
        return result;
    }
    clients(deep = false) {
        const result = [];
        if (this.channelTree == null)
            return [];
        const self = this;
        this.channelTree.clients.forEach(function (entry) {
            let current = entry.currentChannel();
            if (deep) {
                while (current) {
                    if (current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            }
            else if (current == self)
                result.push(entry);
        });
        return result;
    }
    initializeTag() {
        let rootTag = $.spawn("div");
        rootTag.attr("id", "channel_" + this.getChannelId());
        rootTag.addClass("channel");
        //rootTag.append($.spawn("div").addClass("icon_empty"));
        //Tag channel
        this._tag_channel = $.spawn("div");
        this._tag_channel.addClass("channelLine");
        this._tag_channel.addClass(this._channelAlign); //For left
        let channelType = $.spawn("div");
        channelType.addClass("channel_only_normal channel_type icon client-channel_green_subscribed");
        this._tag_channel.append(channelType);
        this._tag_channel.append($.spawn("div").addClass("channel_name_container").append($.spawn("a").addClass("channel_name").text(this.channelName())));
        //Icons
        let iconTag = $.spawn("span").addClass("icons");
        iconTag.appendTo(this._tag_channel);
        //Default icon (4)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_default icon client-channel_default").attr("title", "Default channel")));
        //Password icon (3)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_password icon client-register").attr("title", "The channel is password protected")));
        //Music icon (2)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_music icon client-music").attr("title", "Music quality")));
        //Channel Icon (1)
        iconTag.append($.spawn("div").addClass("channel_only_normal").addClass("icon_entry channel_icon").attr("title", "Channel icon"));
        //Default no sound (0)
        let container = $.spawn("div");
        let noSound = $.spawn("div").addClass("icon_entry icon_no_sound icon client-conflict-icon").attr("title", "You don't support the channel codec");
        let bg = $.spawn("div")
            .width(10)
            .height(14)
            .css("background", "red")
            .css("position", "absolute")
            .css("top", "1px")
            .css("left", "3px");
        bg.appendTo(container);
        noSound.appendTo(container);
        iconTag.append(container);
        /*
        setInterval(() => {
            let color = (Math.random() * 10000000).toString(16).substr(0, 6);
            bg.css("background", "#" + color);
        }, 150);
        */
        //Build siblings
        this._tag_siblings = $.spawn("div").addClass("siblings");
        let tag_siblings_box = $.spawn("div").css("position", "absolute").css("width", "calc(100% - 16px)").css("margin", "0px");
        this._tag_siblings.appendTo(tag_siblings_box);
        //Build clients
        this._tag_clients = $.spawn("div").addClass("clients");
        let tag_clients_box = $.spawn("div").css("position", "absolute").css("width", "calc(100% - 16px)").css("margin", "0px");
        this._tag_clients.appendTo(tag_clients_box);
        this._tag_root = rootTag;
        tag_clients_box.appendTo(this._tag_root);
        tag_siblings_box.appendTo(this._tag_root);
        this._tag_channel.appendTo(this._tag_root);
    }
    rootTag() {
        return this._tag_root;
    }
    channelTag() {
        return this._tag_channel;
    }
    siblingTag() {
        return this._tag_siblings;
    }
    clientTag() {
        return this._tag_clients;
    }
    adjustSize(parent = true) {
        const size = this.originalHeight;
        let subSize = 0;
        let clientSize = 0;
        const sub = this.siblings(false);
        sub.forEach(function (e) {
            subSize += e.rootTag().outerHeight(true);
        });
        const clients = this.clients(false);
        clients.forEach(function (e) {
            clientSize += e.tag.outerHeight(true);
        });
        this._tag_root.css({ height: size + subSize + clientSize });
        this._tag_siblings.css("margin-top", (clientSize + 16) + "px");
        this._tag_clients.css({ height: clientSize });
        if (parent && this.parentChannel())
            this.parentChannel().adjustSize(parent);
    }
    initializeListener() {
        const _this = this;
        this.channelTag().click(function () {
            _this.channelTree.onSelect(_this);
        });
        this.channelTag().dblclick(() => this.joinChannel());
        if (!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.channelTag().on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.showContextMenu(event.pageX, event.pageY, () => {
                    _this.channelTree.onSelect(undefined);
                });
            });
        }
    }
    showContextMenu(x, y, on_close = undefined) {
        let channelCreate = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);
        let channelModify = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAXFAMILYCLIENTS).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_ICON_MANAGE).granted(1);
        let flagDelete = true;
        if (this.clients(true).length > 0)
            flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_FLAG_FORCE).granted(1);
        if (flagDelete) {
            if (this.properties.channel_flag_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else if (this.properties.channel_flag_semi_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_TEMPORARY).granted(1);
        }
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_switch",
            name: "<b>Switch to channel</b>",
            callback: () => {
                this.joinChannel();
            }
        }, MenuEntry.HR(), {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_edit",
            name: "Edit channel",
            invalidPermission: !channelModify,
            callback: () => {
                Modals.createChannelModal(this, undefined, (changes) => {
                    if (!changes)
                        return;
                    changes["cid"] = this.channelId;
                    log.info(LogCategory.CHANNEL, "Changed channel properties of channel %s: %o", this.channelName(), changes);
                });
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_delete",
            name: "Delete channel",
            invalidPermission: !flagDelete,
            callback: () => this.channelTree.client.serverConnection.sendCommand("channeldelete", { cid: this.channelId })
        }, MenuEntry.HR(), {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create_sub",
            name: "Create sub channel",
            invalidPermission: !(channelCreate && this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_CHILD).granted(1)),
            callback: () => this.channelTree.spawnCreateChannel(this)
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create",
            name: "Create channel",
            invalidPermission: !channelCreate,
            callback: () => this.channelTree.spawnCreateChannel()
        }, MenuEntry.CLOSE(on_close));
    }
    __updateChannelName() {
        this._formatedChannelName = undefined;
        parseType: if (this.parentChannel() == null && this.properties.channel_name.charAt(0) == '[') {
            let end = this.properties.channel_name.indexOf(']');
            if (end == -1)
                break parseType;
            let options = this.properties.channel_name.substr(1, end - 1);
            if (options.indexOf("spacer") == -1)
                break parseType;
            options = options.substr(0, options.indexOf("spacer"));
            console.log("Channel options: '" + options + "'");
            if (options.length == 0)
                options = "l";
            else if (options.length > 1)
                options = options[0];
            if (options == "r" || options == "l" || options == "c" || options == "*")
                this._channelAlign = options;
            else
                break parseType;
            this._formatedChannelName = this.properties.channel_name.substr(end + 1);
            console.log("Got channel name: " + this._formatedChannelName);
        }
        let self = this.channelTag();
        let channelName = self.find(".channel_name");
        channelName.text(this.formatedChannelName());
        channelName.parent().removeClass("l r c *"); //Alignments
        (this._formatedChannelName ? $.fn.hide : $.fn.show).apply(self.find(".channel_only_normal"));
        if (this._formatedChannelName) {
            channelName.parent().addClass(this._channelAlign);
            if (this._channelAlign == "*") {
                let lastSuccess = "";
                let index = 0;
                do {
                    channelName.text((lastSuccess = channelName.text()) + this.formatedChannelName());
                    console.log(channelName.parent().width() + " : " + channelName.width() + " : " + channelName.innerWidth() + " : " + channelName.outerWidth());
                } while (channelName.parent().width() >= channelName.width() && ++index < 255);
                if (index == 255)
                    console.warn(LogCategory.CHANNEL, "Repeating spacer took too much repeats!");
                if (lastSuccess.length > 0) {
                    channelName.text(lastSuccess);
                    self.addClass("c");
                }
            }
        }
        console.log("Align: " + this._channelAlign);
    }
    updateVariables(...variables) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL, "Update properties (%i) of %s (%i)", variables.length, this.channelName(), this.getChannelId());
        for (let variable of variables) {
            let key = variable.key;
            let value = variable.value;
            if (typeof (this.properties[key]) == "number")
                this.properties[key] = parseInt(value);
            if (typeof (this.properties[key]) == "boolean")
                this.properties[key] = value == "true" || value == "1";
            else
                this.properties[key] = value;
            group.log("Updating property " + key + " = '%s' -> %o", value, this.properties[key]);
            if (key == "channel_name") {
                this.__updateChannelName();
            }
            else if (key == "channel_order") {
                let order = this.channelTree.findChannel(this.properties.channel_order);
                this.channelTree.moveChannel(this, order, this.parent);
            }
            else if (key == "channel_icon_id") {
                let tag = this.channelTag().find(".icons .channel_icon");
                (this.properties.channel_icon_id > 0 ? $.fn.show : $.fn.hide).apply(tag);
                if (this.properties.channel_icon_id > 0) {
                    tag.children().detach();
                    this.channelTree.client.fileManager.icons.generateTag(this.properties.channel_icon_id).appendTo(tag);
                }
            }
            else if (key == "channel_codec") {
                (this.properties.channel_codec == 5 || this.properties.channel_codec == 3 ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_music"));
                (this.channelTree.client.voiceConnection.codecSupported(this.properties.channel_codec) ? $.fn.hide : $.fn.show).apply(this.channelTag().find(".icons .icon_no_sound"));
            }
            else if (key == "channel_flag_default") {
                (this.properties.channel_flag_default ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_default"));
            }
            else if (key == "channel_flag_password")
                (this.properties.channel_flag_password ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_password"));
            if (key == "channel_maxclients" || key == "channel_maxfamilyclients" || key == "channel_flag_private" || key == "channel_flag_password")
                this.updateChannelTypeIcon();
        }
        group.end();
    }
    updateChannelTypeIcon() {
        let tag = this.channelTag().find(".channel_type");
        tag.removeAttr('class');
        tag.addClass("channel_only_normal channel_type icon");
        let type;
        if (this.properties.channel_flag_password == true && !this._cachedPassword)
            type = "yellow";
        else if ((!this.properties.channel_flag_maxclients_unlimited && this.clients().length >= this.properties.channel_maxclients) ||
            (!this.properties.channel_flag_maxfamilyclients_unlimited && this.properties.channel_maxfamilyclients >= 0 && this.clients(true).length >= this.properties.channel_maxfamilyclients))
            type = "red";
        else
            type = "green";
        tag.addClass("client-channel_" + type + "_subscribed");
    }
    createChatTag(braces = false) {
        let tag = $.spawn("div");
        tag.css("display", "table");
        tag.css("cursor", "pointer");
        tag.css("font-weight", "bold");
        tag.css("color", "darkblue");
        if (braces)
            tag.text("\"" + this.channelName() + "\"");
        else
            tag.text(this.channelName());
        tag.attr("oncontextmenu", "chat_channel_contextmenu(this, ...arguments);");
        tag.attr("channelId", this.channelId);
        tag.attr("channelName", this.channelName());
        return tag.wrap("<p/>").parent();
    }
    channelType() {
        if (this.properties.channel_flag_permanent == true)
            return ChannelType.PERMANENT;
        if (this.properties.channel_flag_semi_permanent == true)
            return ChannelType.SEMI_PERMANENT;
        return ChannelType.TEMPORARY;
    }
    joinChannel() {
        if (this.properties.channel_flag_password == true &&
            !this._cachedPassword &&
            !this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_JOIN_IGNORE_PASSWORD).granted(1)) {
            createInputModal("Channel password", "Channel password:", () => true, text => {
                if (typeof (text) == typeof (true))
                    return;
                helpers.hashPassword(text).then(result => {
                    this._cachedPassword = result;
                    this.joinChannel();
                    this.updateChannelTypeIcon();
                });
            }).open();
        }
        else
            this.channelTree.client.getServerConnection().joinChannel(this, this._cachedPassword).catch(error => {
                if (error instanceof CommandResult) {
                    if (error.id == 781) { //Invalid password
                        this._cachedPassword = undefined;
                        this.updateChannelTypeIcon();
                    }
                }
            });
    }
}
//Global functions
function chat_channel_contextmenu(_element, event) {
    event.preventDefault();
    let element = $(_element);
    console.log("Context menue for " + element.attr("channelName"));
    let chid = Number.parseInt(element.attr("channelId"));
    let channel = globalClient.channelTree.findChannel(chid);
    if (!channel) {
        //TODO
        return;
    }
    channel.showContextMenu(event.pageX, event.pageY);
}
/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />
var Modals;
(function (Modals) {
    function spawnChangeVolume(current, callback) {
        let updateCallback;
        const connectModal = createModal({
            header: function () {
                let header = $.spawn("div");
                header.text("Change volume");
                return header;
            },
            body: function () {
                let tag = $("#tmpl_change_volume").tmpl();
                tag.find(".volume_slider").on("change", _ => updateCallback(tag.find(".volume_slider").val()));
                tag.find(".volume_slider").on("input", _ => updateCallback(tag.find(".volume_slider").val()));
                //connect_address
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");
                let buttonReset = $.spawn("button");
                buttonReset.text("Reset");
                buttonReset.on("click", function () {
                    updateCallback(100);
                });
                tag.append(buttonReset);
                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel");
                buttonCancel.on("click", function () {
                    updateCallback(current * 100);
                    connectModal.close();
                });
                tag.append(buttonCancel);
                let buttonOk = $.spawn("button");
                buttonOk.text("OK");
                buttonOk.on("click", function () {
                    connectModal.close();
                });
                tag.append(buttonOk);
                return tag;
            },
            width: 600
        });
        updateCallback = value => {
            connectModal.htmlTag.find(".volume_slider").val(value);
            let display = connectModal.htmlTag.find(".display_volume");
            let number = (value - 100);
            display.html((number == 0 ? "&plusmn;" : number > 0 ? "+" : "") + number + " %");
            callback(value / 100);
        };
        connectModal.open();
        updateCallback(current * 100);
    }
    Modals.spawnChangeVolume = spawnChangeVolume;
})(Modals || (Modals = {}));
/// <reference path="channel.ts" />
/// <reference path="modal/ModalChangeVolume.ts" />
class ClientProperties {
    constructor() {
        this.client_version = "";
        this.client_platform = "";
        this.client_nickname = "unknown";
        this.client_unique_identifier = "unknown";
        this.client_description = "";
        this.client_servergroups = "";
        this.client_channel_group_id = 0;
        this.client_lastconnected = 0;
        this.client_flag_avatar = "";
        this.client_output_muted = false;
        this.client_away_message = "";
        this.client_away = false;
        this.client_input_hardware = false;
        this.client_input_muted = false;
        this.client_is_channel_commander = false;
    }
}
class ClientEntry {
    constructor(clientId, clientName) {
        this.properties = new ClientProperties();
        this.lastVariableUpdate = 0;
        this._speaking = false;
        this._clientId = clientId;
        this.properties.client_nickname = clientName;
        this.channelTree = null;
        this._channel = null;
        this.audioController = new AudioController();
        const _this = this;
        this.audioController.onSpeaking = function () {
            _this.speaking = true;
        };
        this.audioController.onSilence = function () {
            _this.speaking = false;
        };
        this.audioController.initialize();
    }
    currentChannel() { return this._channel; }
    clientNickName() { return this.properties.client_nickname; }
    clientUid() { return this.properties.client_unique_identifier; }
    clientId() { return this._clientId; }
    getAudioController() {
        return this.audioController;
    }
    initializeListener() {
        const _this = this;
        this.tag.click(event => {
            _this.channelTree.onSelect(_this);
        });
        if (!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.tag.on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.showContextMenu(event.pageX, event.pageY, () => {
                    _this.channelTree.onSelect(undefined);
                });
                return false;
            });
        }
    }
    showContextMenu(x, y, on_close = undefined) {
        const _this = this;
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "client-change_nickname",
            name: "<b>Open text chat</b>",
            callback: function () {
                chat.activeChat = _this.chat(true);
                chat.focus();
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-poke",
            name: "Poke client",
            callback: function () {
                createInputModal("Poke client", "Poke message:<br>", text => true, result => {
                    if (result) {
                        console.log("Poking client " + _this.clientNickName() + " with message " + result);
                        _this.channelTree.client.serverConnection.sendCommand("clientpoke", {
                            clid: _this.clientId(),
                            msg: result
                        });
                    }
                }, { width: 400, maxLength: 512 }).open();
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-edit",
            name: "Change description",
            callback: function () {
                createInputModal("Change client description", "New description:<br>", text => true, result => {
                    if (result) {
                        console.log("Changing " + _this.clientNickName() + "'s description to " + result);
                        _this.channelTree.client.serverConnection.sendCommand("clientedit", {
                            clid: _this.clientId(),
                            client_description: result
                        });
                    }
                }, { width: 400, maxLength: 1024 }).open();
            }
        }, MenuEntry.HR(), {
            type: MenuEntryType.ENTRY,
            icon: "client-move_client_to_own_channel",
            name: "Move client to your channel",
            callback: () => {
                this.channelTree.client.serverConnection.sendCommand("clientmove", {
                    clid: this.clientId(),
                    cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                });
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-kick_channel",
            name: "Kick client from channel",
            callback: function () {
                createInputModal("Kick client from channel", "Kick reason:<br>", text => true, result => {
                    if (result) {
                        console.log("Kicking client " + _this.clientNickName() + " from channel with reason " + result);
                        _this.channelTree.client.serverConnection.sendCommand("clientkick", {
                            clid: _this.clientId(),
                            reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                            reasonmsg: result
                        });
                    }
                }, { width: 400, maxLength: 255 }).open();
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-kick_server",
            name: "Kick client fom server",
            callback: function () {
                createInputModal("Kick client from server", "Kick reason:<br>", text => true, result => {
                    if (result) {
                        console.log("Kicking client " + _this.clientNickName() + " from server with reason " + result);
                        _this.channelTree.client.serverConnection.sendCommand("clientkick", {
                            clid: _this.clientId(),
                            reasonid: ViewReasonId.VREASON_SERVER_KICK,
                            reasonmsg: result
                        });
                    }
                }, { width: 400, maxLength: 255 }).open();
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-ban_client",
            name: "Ban client",
            disabled: true,
            callback: () => { }
        }, MenuEntry.HR(), {
            type: MenuEntryType.ENTRY,
            icon: "client-volume",
            name: "Change Volume",
            callback: () => {
                Modals.spawnChangeVolume(this.audioController.volume, volume => {
                    settings.changeServer("volume_client_" + this.clientUid(), volume);
                    this.audioController.volume = volume;
                    if (globalClient.selectInfo.currentSelected == this)
                        globalClient.selectInfo.update();
                });
            }
        }, MenuEntry.CLOSE(on_close));
    }
    get tag() {
        if (this._tag)
            return this._tag;
        let tag = $.spawn("div");
        tag.attr("id", "client_" + this.clientId());
        tag.addClass("client");
        tag.append($.spawn("div").addClass("icon_empty"));
        tag.append($.spawn("div").addClass("icon_client_state").attr("title", "Client state"));
        tag.append($.spawn("div").addClass("name").text(this.clientNickName()));
        tag.append($.spawn("div").addClass("away").text(this.clientNickName()));
        let clientIcons = $.spawn("span");
        tag.append(clientIcons);
        return this._tag = tag;
    }
    static chatTag(id, name, uid, braces = false) {
        let tag = $.spawn("div");
        tag.css("cursor", "pointer");
        tag.css("font-weight", "bold");
        tag.css("color", "darkblue");
        tag.css("display", "table");
        if (braces)
            tag.text("\"" + name + "\"");
        else
            tag.text(name);
        tag.attr("oncontextmenu", "chat_client_contextmenu(this, ...arguments);");
        tag.attr("clientId", id);
        tag.attr("clientUid", uid);
        tag.attr("clientName", name);
        return tag.wrap("<p/>").parent();
    }
    createChatTag(braces = false) {
        return ClientEntry.chatTag(this.clientId(), this.clientNickName(), this.clientUid(), braces);
    }
    set speaking(flag) {
        if (flag == this._speaking)
            return;
        this._speaking = flag;
        this.updateClientIcon();
    }
    updateClientIcon() {
        let icon = "";
        let clicon = "";
        if (this.properties.client_away) {
            icon = "client-away";
        }
        else if (this.properties.client_output_muted) {
            icon = "client-hardware_output_muted";
        }
        else if (!this.properties.client_input_hardware) {
            icon = "client-hardware_input_muted";
        }
        else if (this.properties.client_input_muted) {
            icon = "client-input_muted";
        }
        else {
            if (this._speaking) {
                if (this.properties.client_is_channel_commander)
                    clicon = "client_cc_talk";
                else
                    clicon = "client_talk";
            }
            else {
                if (this.properties.client_is_channel_commander)
                    clicon = "client_cc_idle";
                else
                    clicon = "client_idle";
            }
        }
        if (clicon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state clicon ' + clicon);
        else if (icon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon ' + icon);
        else
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon_empty');
    }
    updateAwayMessage() {
        let tag = this.tag.find(".away");
        if (this.properties.client_away == true && this.properties.client_away_message) {
            tag.text("[" + this.properties.client_away_message + "]");
            tag.show();
        }
        else {
            tag.hide();
        }
    }
    updateVariables(...variables) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CLIENT, "Update properties (%i) of %s (%i)", variables.length, this.clientNickName(), this.clientId());
        for (let variable of variables) {
            if (typeof (this.properties[variable.key]) === "boolean")
                this.properties[variable.key] = variable.value == "true" || variable.value == "1";
            else if (typeof (this.properties[variable.key]) === "number")
                this.properties[variable.key] = parseInt(variable.value);
            else
                this.properties[variable.key] = variable.value;
            group.log("Updating client " + this.clientId() + ". Key " + variable.key + " Value: '" + variable.value + "' (" + typeof (this.properties[variable.key]) + ")");
            if (variable.key == "client_nickname") {
                this.tag.find(".name").text(variable.value);
                let chat = this.chat(false);
                if (chat)
                    chat.name = variable.value;
            }
            if (variable.key == "client_away" || variable.key == "client_output_muted" || variable.key == "client_input_hardware" || variable.key == "client_input_muted" || variable.key == "client_is_channel_commander") {
                this.updateClientIcon();
            }
            if (variable.key == "client_away_message" || variable.key == "client_away") {
                this.updateAwayMessage();
            }
            if (variable.key == "client_unique_identifier") {
                this.audioController.volume = parseFloat(settings.server("volume_client_" + this.clientUid(), "1"));
                console.error("Updated volume from config " + this.audioController.volume + " - " + "volume_client_" + this.clientUid() + " - " + settings.server("volume_client_" + this.clientUid(), "1"));
                console.log(this.avatarId());
            }
        }
        group.end();
    }
    updateClientVariables() {
        if (this.lastVariableUpdate == 0 || new Date().getTime() - 10 * 60 * 1000 > this.lastVariableUpdate) { //Cache these only 10 min
            this.lastVariableUpdate = new Date().getTime();
            this.channelTree.client.serverConnection.sendCommand("clientgetvariables", { clid: this.clientId() });
        }
    }
    chat(create = false) {
        let chatName = "client_" + this.clientUid() + ":" + this.clientId();
        let c = chat.findChat(chatName);
        if ((!c) && create) {
            c = chat.createChat(chatName);
            c.closeable = true;
            c.name = this.clientNickName();
            const _this = this;
            c.onMessageSend = function (text) {
                _this.channelTree.client.serverConnection.sendMessage(text, ChatType.CLIENT, _this);
            };
            c.onClose = function () {
                //TODO check online?
                _this.channelTree.client.serverConnection.sendCommand("clientchatclosed", { "clid": _this.clientId() });
                return true;
            };
        }
        return c;
    }
    updateGroupIcon(group) {
        //TODO group icon order
        this.tag.find(".icon_group_" + group.id).detach();
        if (group.properties.iconid > 0)
            this.tag.find("span").append(this.channelTree.client.fileManager.icons.generateTag(group.properties.iconid).addClass("icon_group_" + group.id));
    }
    assignedServerGroupIds() {
        let result = [];
        for (let id of this.properties.client_servergroups.split(",")) {
            if (id.length == 0)
                continue;
            result.push(Number.parseInt(id));
        }
        return result;
    }
    assignedChannelGroup() {
        return this.properties.client_channel_group_id;
    }
    groupAssigned(group) {
        if (group.target == GroupTarget.SERVER) {
            for (let id of this.assignedServerGroupIds())
                if (id == group.id)
                    return true;
            return false;
        }
        else
            return group.id == this.assignedChannelGroup();
    }
    onDelete() {
        this.audioController.close();
        this.audioController = undefined;
    }
    calculateOnlineTime() {
        return new Date().getTime() / 1000 - this.properties.client_lastconnected;
    }
    avatarId() {
        function str2ab(str) {
            let buf = new ArrayBuffer(str.length); // 2 bytes for each char
            let bufView = new Uint8Array(buf);
            for (let i = 0, strLen = str.length; i < strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        }
        try {
            let raw = atob(this.properties.client_unique_identifier);
            let input = hex.encode(str2ab(raw));
            let result = "";
            for (let index = 0; index < input.length; index++) {
                let c = input.charAt(index);
                let offset = 0;
                if (c >= '0' && c <= '9')
                    offset = c.charCodeAt(0) - '0'.charCodeAt(0);
                else if (c >= 'A' && c <= 'F')
                    offset = c.charCodeAt(0) - 'A'.charCodeAt(0) + 0x0A;
                else if (c >= 'a' && c <= 'f')
                    offset = c.charCodeAt(0) - 'a'.charCodeAt(0) + 0x0A;
                result += String.fromCharCode('a'.charCodeAt(0) + offset);
            }
            return result;
        }
        catch (e) { //invalid base 64 (like music bot etc)
            return undefined;
        }
    }
}
class LocalClientEntry extends ClientEntry {
    constructor(handle) {
        super(0, "local client");
        this.handle = handle;
    }
    showContextMenu(x, y, on_close = undefined) {
        const _self = this;
        spawnMenu(x, y, {
            name: "<b>Change name</b>",
            icon: "client-change_nickname",
            callback: () => _self.openRename(),
            type: MenuEntryType.ENTRY
        }, {
            name: "Change description",
            icon: "client-edit",
            callback: () => {
                createInputModal("Change own description", "New description:<br>", text => true, result => {
                    if (result) {
                        console.log("Changing own description to " + result);
                        _self.channelTree.client.serverConnection.sendCommand("clientedit", {
                            clid: _self.clientId(),
                            client_description: result
                        });
                    }
                }, { width: 400, maxLength: 1024 }).open();
            },
            type: MenuEntryType.ENTRY
        }, MenuEntry.CLOSE(on_close));
    }
    initializeListener() {
        super.initializeListener();
        this.tag.find(".name").addClass("own_name");
        const _self = this;
        this.tag.dblclick(function () {
            _self.openRename();
        });
    }
    openRename() {
        const _self = this;
        const elm = this.tag.find(".name");
        elm.attr("contenteditable", "true");
        elm.removeClass("own_name");
        elm.css("background-color", "white");
        elm.focus();
        _self.renaming = true;
        elm.keypress(function (e) {
            if (e.keyCode == 13 /* Enter */) {
                $(this).trigger("focusout");
                return false;
            }
        });
        elm.focusout(function (e) {
            if (!_self.renaming)
                return;
            _self.renaming = false;
            elm.css("background-color", "");
            elm.removeAttr("contenteditable");
            elm.addClass("own_name");
            let text = elm.text().toString();
            if (_self.clientNickName() == text)
                return;
            elm.text(_self.clientNickName());
            _self.handle.serverConnection.updateClient("client_nickname", text).then((e) => {
                chat.serverChat().appendMessage("Nickname successfully changed");
            }).catch((e) => {
                chat.serverChat().appendError("Could not change nickname (" + e.extra_message + ")");
                _self.openRename();
            });
        });
    }
}
//Global functions
function chat_client_contextmenu(_element, event) {
    event.preventDefault();
    let element = $(_element);
    console.log("Context menue for " + element.attr("clientName"));
    let clid = Number.parseInt(element.attr("clientId"));
    let client = globalClient.channelTree.findClient(clid);
    if (!client) {
        //TODO
        return;
    }
    if (client.clientUid() != element.attr("clientUid")) {
        //TODO
        return;
    }
    client.showContextMenu(event.pageX, event.pageY);
}
/// <reference path="../../utils/modal.ts" />
var Modals;
(function (Modals) {
    function createChannelModal(channel, parent, callback) {
        let properties = {}; //The changes properties
        const modal = createModal({
            header: channel ? "Edit channel" : "Create channel",
            body: () => {
                let template = $("#tmpl_channel_edit").tmpl(channel ? channel.properties : new ChannelProperties());
                template = $.spawn("div").append(template);
                return template.tabify();
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin", "5px");
                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel").addClass("button_cancel");
                let buttonOk = $.spawn("button");
                buttonOk.text("Ok").addClass("button_ok");
                footer.append(buttonCancel);
                footer.append(buttonOk);
                return footer;
            },
            width: 500
        });
        applyGeneralListener(properties, modal.htmlTag.find(".channel_general_properties"), modal.htmlTag.find(".button_ok"), !channel);
        applyStandardListener(properties, modal.htmlTag.find(".settings_standard"), modal.htmlTag.find(".button_ok"), parent, !channel);
        modal.htmlTag.find(".button_ok").click(() => {
            modal.close();
            callback(properties);
        });
        modal.htmlTag.find(".button_cancel").click(() => {
            modal.close();
            callback();
        });
        modal.open();
    }
    Modals.createChannelModal = createChannelModal;
    function applyGeneralListener(properties, tag, button, create) {
        let updateButton = () => {
            if (tag.find(".input_error").length == 0)
                button.removeAttr("disabled");
            else
                button.attr("disabled", "true");
        };
        tag.find(".channel_name").change(function () {
            properties.channel_name = this.value;
            $(this).removeClass("input_error");
            if (this.value.length < 1 || this.value.length > 40)
                $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !create && !globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1));
        tag.find(".channel_password").change(function () {
            properties.channel_flag_password = this.value.length != 0;
            if (properties.channel_flag_password)
                helpers.hashPassword(this.value).then(pass => properties.channel_password = pass);
            $(this).removeClass("input_error");
            if (!properties.channel_flag_password)
                if (globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1))
                    $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD : PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1));
        tag.find(".channel_topic").change(function () {
            properties.channel_topic = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_TOPIC : PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1));
        tag.find(".channel_description").change(function () {
            properties.channel_description = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DESCRIPTION : PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1));
        if (create) {
            tag.find(".channel_name").trigger("change");
            tag.find(".channel_password").trigger('change');
        }
    }
    function applyStandardListener(properties, tag, button, parent, create) {
        tag.find("input[name=\"channel_type\"]").change(function () {
            switch (this.value) {
                case "semi":
                    properties.channel_flag_permanent = false;
                    properties.channel_flag_semi_permanent = true;
                    break;
                case "perm":
                    properties.channel_flag_permanent = true;
                    properties.channel_flag_semi_permanent = false;
                    break;
                default:
                    properties.channel_flag_permanent = false;
                    properties.channel_flag_semi_permanent = false;
                    break;
            }
        });
        tag.find("input[name=\"channel_type\"][value=\"temp\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_TEMPORARY : PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY).granted(1));
        tag.find("input[name=\"channel_type\"][value=\"semi\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT).granted(1));
        tag.find("input[name=\"channel_type\"][value=\"perm\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1));
        tag.find("input[name=\"channel_type\"]:not(:disabled)").last().prop("checked", true).trigger('change');
        tag.find("input[name=\"channel_default\"]").change(function () {
            console.log(this.checked);
            properties.channel_flag_default = this.checked;
            let elements = tag.find("input[name=\"channel_type\"]");
            if (this.checked) {
                elements.prop("enabled", false);
                elements.prop("checked", false);
                tag.find("input[name=\"channel_type\"][value=\"perm\"]").prop("checked", true).trigger("change");
            }
            else
                elements.removeProp("enabled");
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) ||
            !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT : PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1));
        tag.find("input[name=\"talk_power\"]").change(function () {
            properties.channel_needed_talk_power = parseInt(this.value);
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER : PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1));
        let orderTag = tag.find(".order_id");
        for (let channel of (parent ? parent.siblings() : globalClient.channelTree.rootChannel()))
            $.spawn("option").attr("channelId", channel.channelId.toString()).text(channel.channelName()).appendTo(orderTag);
        orderTag.change(function () {
            let selected = $(this.options.item(this.selectedIndex));
            properties.channel_order = parseInt(selected.attr("channelId"));
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_SORTORDER : PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1));
        orderTag.find("option").last().prop("selected", true);
    }
})(Modals || (Modals = {}));
/// <reference path="../voice/VoiceHandler.ts" />
/// <reference path="../client.ts" />
/// <reference path="../contextMenu.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />
/// <reference path="modal/ModalCreateChannel.ts" />
class ChannelTree {
    constructor(client, htmlTree) {
        this.client = client;
        this.htmlTree = htmlTree;
        this.reset();
        if (!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            let _this = this;
            this.htmlTree.parent().on("contextmenu", function (event) {
                if (event.isDefaultPrevented())
                    return;
                event.preventDefault();
                _this.onSelect(undefined);
                _this.showContextMenu(event.pageX, event.pageY);
            });
        }
    }
    showContextMenu(x, y, on_close = undefined) {
        let channelCreate = this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create",
            name: "Create channel",
            invalidPermission: !channelCreate,
            callback: () => this.spawnCreateChannel()
        }, MenuEntry.CLOSE(on_close));
    }
    initialiseHead(serverName) {
        this.server = new ServerEntry(this, serverName);
        this.server.htmlTag.appendTo(this.htmlTree);
        this.server.initializeListener();
    }
    __deleteAnimation(element) {
        let tag = element instanceof ChannelEntry ? element.rootTag() : element.tag;
        this.htmlTree.find(tag).fadeOut("slow", () => {
            tag.remove();
            if (element instanceof ChannelEntry) {
                if (element.parentChannel())
                    element.parentChannel().adjustSize(true);
            }
            else if (element instanceof ClientEntry) {
                element.currentChannel().adjustSize(true);
            }
        });
    }
    rootChannel() {
        return this.channels.filter(e => e.parent == undefined);
    }
    deleteChannel(channel) {
        const _this = this;
        for (let index = 0; index < this.channels.length; index++) {
            let entry = this.channels[index];
            let currentEntry = this.channels[index];
            while (currentEntry != undefined && currentEntry != null) {
                if (currentEntry == channel) {
                    _this.channels.remove(entry);
                    _this.__deleteAnimation(entry);
                    entry.channelTree = null;
                    index--;
                    break;
                }
                else
                    currentEntry = currentEntry.parentChannel();
            }
        }
        this.channels.remove(channel);
        this.__deleteAnimation(channel);
        channel.channelTree = null;
    }
    insertChannel(channel) {
        channel.channelTree = this;
        this.channels.push(channel);
        let elm = undefined;
        let tag = this.htmlTree;
        let prevChannel = null;
        if (channel.hasParent()) {
            let parent = channel.parentChannel();
            let siblings = parent.siblings();
            if (siblings.length == 0) {
                elm = parent.rootTag();
                prevChannel = null;
            }
            else {
                prevChannel = siblings.last();
                elm = prevChannel.tag;
            }
            tag = parent.siblingTag();
        }
        channel.prevChannel = prevChannel;
        let entry = channel.rootTag().css({ display: "none" }).fadeIn("slow");
        entry.appendTo(tag);
        channel.originalHeight = entry.outerHeight(false);
        if (elm != undefined)
            elm.after(entry);
        channel.adjustSize(true);
        channel.initializeListener();
    }
    findChannel(channelId) {
        for (let index = 0; index < this.channels.length; index++)
            if (this.channels[index].getChannelId() == channelId)
                return this.channels[index];
        return undefined;
    }
    moveChannel(channel, prevChannel, parent) {
        if (prevChannel != null && prevChannel.parent != parent) {
            console.error("Invalid channel move (different parents! (" + prevChannel.parent + "|" + parent + ")");
            return;
        }
        let oldParent = channel.parentChannel();
        channel.prevChannel = prevChannel;
        channel.parent = parent;
        if (prevChannel)
            prevChannel.rootTag().after(channel.rootTag());
        else {
            if (parent) {
                let siblings = parent.siblings();
                if (siblings.length <= 1) { //Self should be already in there
                    let left = channel.rootTag();
                    left.appendTo($(parent.siblingTag()));
                }
                else {
                    channel.prevChannel = siblings[siblings.length - 2];
                    channel.prevChannel.rootTag().after(channel.rootTag());
                }
            }
            else
                this.htmlTree.find(".server").after(channel.rootTag());
        }
        if (oldParent)
            oldParent.adjustSize();
        if (channel)
            channel.adjustSize();
    }
    deleteClient(client) {
        this.clients.remove(client);
        this.__deleteAnimation(client);
        client.onDelete();
    }
    insertClient(client, channel) {
        let newClient = this.findClient(client.clientId());
        if (newClient)
            client = newClient; //Got new client :)
        else
            this.clients.push(client);
        client.channelTree = this;
        client["_channel"] = channel;
        let tag = client.tag.css({ display: "none" }).fadeIn("slow");
        tag.appendTo(channel.clientTag());
        channel.adjustSize(true);
        client.initializeListener();
        channel.updateChannelTypeIcon();
        return client;
    }
    registerClient(client) {
        this.clients.push(client);
        client.channelTree = this;
        client.initializeListener();
    }
    moveClient(client, channel) {
        let oldChannel = client.currentChannel();
        client["_channel"] = channel;
        let tag = client.tag;
        tag.detach();
        tag.appendTo(client.currentChannel().clientTag());
        if (oldChannel) {
            oldChannel.adjustSize();
            oldChannel.updateChannelTypeIcon();
        }
        if (client.currentChannel()) {
            client.currentChannel().adjustSize();
            client.currentChannel().updateChannelTypeIcon();
        }
    }
    findClient(clientId) {
        for (let index = 0; index < this.clients.length; index++)
            if (this.clients[index].clientId() == clientId)
                return this.clients[index];
        return null;
    }
    onSelect(entry) {
        this.htmlTree.find(".selected").each(function (idx, e) {
            $(e).removeClass("selected");
        });
        if (entry instanceof ChannelEntry)
            entry.rootTag().find("> .channelLine").addClass("selected");
        else if (entry instanceof ClientEntry)
            entry.tag.addClass("selected");
        else if (entry instanceof ServerEntry)
            entry.htmlTag.addClass("selected");
        this.client.selectInfo.currentSelected = entry;
    }
    clientsByGroup(group) {
        let result = [];
        for (let client of this.clients) {
            if (client.groupAssigned(group))
                result.push(client);
        }
        return result;
    }
    clientsByChannel(channel) {
        let result = [];
        for (let client of this.clients) {
            if (client.currentChannel() == channel)
                result.push(client);
        }
        return result;
    }
    reset() {
        this.server = null;
        this.clients = [];
        this.channels = [];
        this.htmlTree.empty();
    }
    spawnCreateChannel(parent) {
        Modals.createChannelModal(undefined, parent, (properties) => {
            if (!properties)
                return;
            properties["cpid"] = parent ? parent.channelId : 0;
            log.debug(LogCategory.CHANNEL, "Creating new channel with properties: %o", properties);
            this.client.serverConnection.sendCommand("channelcreate", properties);
        });
    }
}
/// <reference path="ui/channel.ts" />
/// <reference path="client.ts" />
class CommandResult {
    constructor(json) {
        this.json = json;
        this.id = json["id"];
        this.message = json["msg"];
        this.extra_message = "";
        if (json["extra_msg"])
            this.extra_message = json["extra_msg"];
        this.success = this.id == 0;
    }
}
class ReturnListener {
}
class ServerConnection {
    constructor(client) {
        this._connectionState = ConnectionState.UNCONNECTED;
        this._connectTimeoutHandler = undefined;
        this._connected = false;
        this.on_connect = () => {
            console.log("Socket connected");
            chat.serverChat().appendMessage("Logging in...");
            this._handshakeHandler.startHandshake();
        };
        this._client = client;
        this._socket = null;
        this.commandHandler = new ConnectionCommandHandler(this);
        this._retCodeIdx = 0;
        this._retListener = [];
    }
    generateReturnCode() {
        return (this._retCodeIdx++).toString();
    }
    startConnection(host, port, handshake, timeout = 1000) {
        if (this._connectTimeoutHandler) {
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            this.disconnect();
        }
        this.updateConnectionState(ConnectionState.CONNECTING);
        this._remoteHost = host;
        this._remotePort = port;
        this._handshakeHandler = handshake;
        this._handshakeHandler.setConnection(this);
        this._connected = false;
        chat.serverChat().appendMessage("Connecting to " + host + ":" + port);
        const self = this;
        try {
            this._connectTimeoutHandler = setTimeout(() => {
                this.disconnect();
                this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
            }, timeout);
            let sockCpy;
            this._socket = (sockCpy = new WebSocket('wss:' + this._remoteHost + ":" + this._remotePort));
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            if (this._socket != sockCpy)
                return; //Connect timeouted
            this._socket.onopen = () => {
                if (this._socket != sockCpy)
                    return;
                this._connected = true;
                this.on_connect();
            };
            this._socket.onclose = event => {
                if (this._socket != sockCpy)
                    return;
                this._client.handleDisconnect(this._connected ? DisconnectReason.CONNECTION_CLOSED : DisconnectReason.CONNECT_FAILURE, {
                    code: event.code,
                    reason: event.reason,
                    event: event
                });
            };
            this._socket.onerror = e => {
                if (this._socket != sockCpy)
                    return;
                console.log("Got error: (" + self._socket.readyState + ")");
                console.log(e);
            };
            this._socket.onmessage = msg => {
                if (this._socket != sockCpy)
                    return;
                self.handleWebSocketMessage(msg.data);
            };
            this.updateConnectionState(ConnectionState.INITIALISING);
        }
        catch (e) {
            this.disconnect();
            this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE, e);
        }
    }
    updateConnectionState(state) {
        this._connectionState = state;
    }
    disconnect() {
        if (this._connectionState == ConnectionState.UNCONNECTED)
            return false;
        this.updateConnectionState(ConnectionState.UNCONNECTED);
        if (this._socket)
            this._socket.close(3000 + 0xFF, "request disconnect");
        this._socket = null;
        for (let future of this._retListener)
            future.reject("Connection closed");
        this._retListener = [];
        this._retCodeIdx = 0;
        this._connected = false;
        return true;
    }
    handleWebSocketMessage(data) {
        if (typeof (data) === "string") {
            let json;
            try {
                json = JSON.parse(data);
            }
            catch (e) {
                console.error("Could not parse message json!");
                alert(e); // error in the above string (in this case, yes)!
                return;
            }
            if (json["type"] === undefined) {
                console.log("Missing data type!");
                return;
            }
            if (json["type"] === "command")
                this.handleCommand(json);
            else if (json["type"] === "WebRTC")
                this._client.voiceConnection.handleControlPacket(json);
            else {
                console.log("Unknown command type " + json["type"]);
            }
        }
    }
    handleCommand(json) {
        let group = log.group(log.LogType.DEBUG, LogCategory.NETWORKING, "Handling command '%s'", json["command"]);
        group.log("Handling command '" + json["command"] + "'");
        group.group(log.LogType.TRACE, "Json:").collapsed(true).log("%o", json).end();
        try {
            let fn = this.commandHandler[json["command"]];
            if (fn === undefined) {
                group.log("Missing command '" + json["command"] + "'");
                return;
            }
            fn.call(this.commandHandler, json["data"]);
        }
        finally {
            group.end();
        }
    }
    sendData(data) {
        this._socket.send(data);
    }
    commandiefy(input) {
        return JSON.stringify(input, (key, value) => {
            switch (typeof value) {
                case "boolean": return value == true ? "1" : "0";
                case "function": return value();
                default:
                    return value;
            }
        });
    }
    sendCommand(command, data = {}, logResult = true) {
        const _this = this;
        let result = new Promise((resolve, failed) => {
            let _data = $.isArray(data) ? data : [data];
            let retCode = _data[0]["return_code"] !== undefined ? _data[0].return_code : _this.generateReturnCode();
            _data[0].return_code = retCode;
            let listener = new ReturnListener();
            listener.resolve = resolve;
            listener.reject = failed;
            listener.code = retCode;
            listener.timeout = setTimeout(() => {
                _this._retListener.remove(listener);
                listener.reject("timeout");
            }, 1500);
            this._retListener.push(listener);
            this._socket.send(this.commandiefy({
                "type": "command",
                "command": command,
                "data": _data
            }));
        });
        return new Promise((resolve, failed) => {
            result.then(resolve).catch(ex => {
                if (logResult) {
                    if (ex instanceof CommandResult) {
                        let res = ex;
                        if (!res.success) {
                            chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                        }
                    }
                    else if (typeof (ex) == "string") {
                        chat.serverChat().appendError("Command execution resuluts in " + ex);
                    }
                    else {
                        console.error("Invalid promise result type: " + typeof (ex) + ". Result:");
                        console.error(ex);
                    }
                }
                failed(ex);
            });
        });
    }
    get connected() {
        return this._socket && this._socket.readyState == WebSocket.OPEN;
    }
    /**
     *   HELPER METHODS
     */
    joinChannel(channel, password = "") {
        return this.sendCommand("clientmove", [{
                "clid": this._client.getClientId(),
                "cid": channel.getChannelId(),
                "cpw": password
            }]);
    }
    sendMessage(message, type, target) {
        if (type == ChatType.SERVER)
            return this.sendCommand("sendtextmessage", { "targetmode": 3, "target": 0, "msg": message });
        else if (type == ChatType.CHANNEL)
            return this.sendCommand("sendtextmessage", { "targetmode": 2, "target": target.getChannelId(), "msg": message });
        else if (type == ChatType.CLIENT)
            return this.sendCommand("sendtextmessage", { "targetmode": 1, "target": target.clientId(), "msg": message });
    }
    updateClient(key, value) {
        let data = {};
        data[key] = value;
        return this.sendCommand("clientupdate", data);
    }
}
class HandshakeHandler {
    constructor(identity, name) {
        this.identity = identity;
        this.name = name;
    }
    setConnection(con) {
        this.connection = con;
        this.connection.commandHandler["handshakeidentityproof"] = this.handleCommandHandshakeIdentityProof.bind(this);
    }
    startHandshake() {
        let data = {
            intention: 0,
            authentication_method: this.identity.type()
        };
        if (this.identity.type() == IdentitifyType.TEAMSPEAK) {
            data.publicKey = this.identity.publicKey();
        }
        else if (this.identity.type() == IdentitifyType.TEAFORO) {
            data.data = this.identity.identityDataJson;
        }
        this.connection.sendCommand("handshakebegin", data).catch(error => {
            console.log(error);
            //TODO here
        });
    }
    handleCommandHandshakeIdentityProof(json) {
        let proof;
        if (this.identity.type() == IdentitifyType.TEAMSPEAK) {
            proof = this.identity.signMessage(json[0]["message"]);
        }
        else if (this.identity.type() == IdentitifyType.TEAFORO) {
            proof = this.identity.identitySign;
        }
        this.connection.sendCommand("handshakeindentityproof", { proof: proof }).then(() => {
            this.connection.sendCommand("clientinit", {
                //TODO variables!
                client_nickname: this.name ? this.name : this.identity.name(),
                client_platform: navigator.platform,
                client_version: navigator.userAgent,
                client_browser_engine: navigator.product
            });
        }).catch(error => {
            console.error("Got login error");
            console.log(error);
        }); //TODO handle error
    }
}
class ConnectionCommandHandler {
    constructor(connection) {
        this.connection = connection;
        this["error"] = this.handleCommandResult;
        this["channellist"] = this.handleCommandChannelList;
        this["notifychannelcreated"] = this.handleCommandChannelCreate;
        this["notifychanneldeleted"] = this.handleCommandChannelDelete;
        this["notifycliententerview"] = this.handleCommandClientEnterView;
        this["notifyclientleftview"] = this.handleCommandClientLeftView;
        this["notifyclientmoved"] = this.handleNotifyClientMoved;
        this["initserver"] = this.handleCommandServerInit;
        this["notifychannelmoved"] = this.handleNotifyChannelMoved;
        this["notifychanneledited"] = this.handleNotifyChannelEdited;
        this["notifytextmessage"] = this.handleNotifyTextMessage;
        this["notifyclientupdated"] = this.handleNotifyClientUpdated;
        this["notifyserveredited"] = this.handleNotifyServerEdited;
        this["notifyserverupdated"] = this.handleNotifyServerUpdated;
    }
    handleCommandResult(json) {
        json = json[0]; //Only one bulk
        let code = json["return_code"];
        if (code.length == 0) {
            console.log("Invalid return code! (" + json + ")");
            return;
        }
        let retListeners = this.connection["_retListener"];
        for (let e of retListeners) {
            if (e.code != code)
                continue;
            retListeners.remove(e);
            let result = new CommandResult(json);
            if (result.success)
                e.resolve(result);
            else
                e.reject(result);
            break;
        }
    }
    handleCommandServerInit(json) {
        //We could setup the voice channel
        console.log("Setting up voice ");
        this.connection._client.voiceConnection.createSession();
        json = json[0]; //Only one bulk
        this.connection._client.clientId = parseInt(json["aclid"]);
        this.connection._client.getClient().updateVariables({ key: "client_nickname", value: json["acn"] });
        for (let key in json) {
            if (key === "aclid")
                continue;
            if (key === "acn")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        chat.serverChat().name = this.connection._client.channelTree.server.properties["virtualserver_name"];
        chat.serverChat().appendMessage("Connected as {0}", true, this.connection._client.getClient().createChatTag(true));
        globalClient.onConnected();
    }
    createChannelFromJson(json, ignoreOrder = false) {
        let tree = this.connection._client.channelTree;
        let channel = new ChannelEntry(parseInt(json["cid"]), json["channel_name"], tree.findChannel(json["cpid"]));
        tree.insertChannel(channel);
        if (json["channel_order"] !== "0") {
            let prev = tree.findChannel(json["channel_order"]);
            if (!prev && json["channel_order"] != 0) {
                if (!ignoreOrder) {
                    console.error("Invalid channel order id!");
                    return;
                }
            }
            let parent = tree.findChannel(json["cpid"]);
            if (!parent && json["cpid"] != 0) {
                console.error("Invalid channel parent");
                return;
            }
            tree.moveChannel(channel, prev, parent); //TODO test if channel exists!
        }
        if (ignoreOrder) {
            for (let ch of tree.channels) {
                if (ch.properties.channel_order == channel.channelId) {
                    tree.moveChannel(ch, channel, channel.parent); //Corrent the order :)
                }
            }
        }
        let updates = [];
        for (let key in json) {
            if (key === "cid")
                continue;
            if (key === "cpid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            updates.push({ key: key, value: json[key] });
        }
        channel.updateVariables(...updates);
    }
    handleCommandChannelList(json) {
        console.log("Got " + json.length + " new channels");
        for (let index = 0; index < json.length; index++)
            this.createChannelFromJson(json[index], true);
    }
    handleCommandChannelCreate(json) {
        this.createChannelFromJson(json[0]);
    }
    handleCommandChannelDelete(json) {
        let tree = this.connection._client.channelTree;
        console.log("Got " + json.length + " channel deletions");
        for (let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if (!channel) {
                console.error("Invalid channel onDelete (Unknown channel)");
                continue;
            }
            tree.deleteChannel(channel);
        }
    }
    handleCommandClientEnterView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client;
        let channel = tree.findChannel(json["ctid"]);
        let old_channel = tree.findChannel(json["cfid"]);
        client = tree.findClient(json["clid"]);
        if (!client) {
            client = new ClientEntry(parseInt(json["clid"]), json["client_nickname"]);
            client = tree.insertClient(client, channel);
        }
        else {
            if (client == this.connection._client.getClient())
                chat.channelChat().name = channel.channelName();
            tree.moveClient(client, channel);
        }
        if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if (old_channel) {
                chat.serverChat().appendMessage("{0} appeared from {1} to {2}", true, client.createChatTag(true), old_channel.createChatTag(true), channel.createChatTag(true));
            }
            else {
                chat.serverChat().appendMessage("{0} connected to channel {1}", true, client.createChatTag(true), channel.createChatTag(true));
            }
        }
        let updates = [];
        for (let key in json) {
            if (key == "cfid")
                continue;
            if (key == "ctid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            updates.push({ key: key, value: json[key] });
        }
        client.updateVariables(...updates);
    }
    handleCommandClientLeftView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        if (!client) {
            console.error("Unknown client left!");
            return 0;
        }
        if (client == this.connection._client.getClient()) {
            if (json["reasonid"] == ViewReasonId.VREASON_BAN)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_BANNED, json);
            else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_KICKED, json);
            else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_SHUTDOWN)
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_STOPPED)
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            else
                this.connection._client.handleDisconnect(DisconnectReason.UNKNOWN, json);
            return;
        }
        let channel_from = tree.findChannel(json["cfid"]);
        let channel_to = tree.findChannel(json["ctid"]);
        if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} disappeared from {1} to {2}", true, client.createChatTag(true), channel_from.createChatTag(true), channel_to.createChatTag(true));
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_LEFT) {
            chat.serverChat().appendMessage("{0} left the server ({1})", true, client.createChatTag(true), json["reasonmsg"]);
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
            chat.serverChat().appendError("{0} was kicked from the server by {1}. ({2})", client.createChatTag(true), ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]), json["reasonmsg"]);
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_BAN) {
            //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
            let duration = "permanently";
            if (json["bantime"])
                duration = "for " + formatDate(Number.parseInt(json["bantime"]));
            chat.serverChat().appendError("{0} was banned {1} by {2}. ({3})", client.createChatTag(true), duration, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]), json["reasonmsg"]);
        }
        else {
            console.error("Unknown client left reason!");
        }
        tree.deleteClient(client);
    }
    handleNotifyClientMoved(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        let channel_to = tree.findChannel(json["ctid"]);
        let channel_from = tree.findChannel(json["cfid"]);
        if (!client) {
            console.error("Unknown client move (Client)!");
            return 0;
        }
        if (!channel_to) {
            console.error("Unknown client move (Channel to)!");
            return 0;
        }
        if (!channel_from) //Not critical
            console.error("Unknown client move (Channel from)!");
        if (client instanceof LocalClientEntry) {
            chat.channelChat().name = channel_to.channelName();
            for (let entry of client.channelTree.clientsByChannel(client.currentChannel()))
                if (entry !== client)
                    entry.getAudioController().stopAudio(true);
        }
        tree.moveClient(client, channel_to);
        if (json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            chat.serverChat().appendMessage("{0} was moved from channel {1} to {2} by {3}", true, client.createChatTag(true), channel_from ? channel_from.createChatTag(true) : undefined, channel_to.createChatTag(true), ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]));
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} switched from channel {1} to {2}", true, client.createChatTag(true), channel_from ? channel_from.createChatTag(true) : undefined, channel_to.createChatTag(true));
        }
    }
    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk
        for (let key in json)
            console.log("Key: " + key + " Value: " + json[key]);
        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if (!channel) {
            console.error("Unknown channel move (Channel)!");
            return 0;
        }
        let prev = tree.findChannel(json["order"]);
        if (!prev && json["order"] != 0) {
            console.error("Unknown channel move (prev)!");
            return 0;
        }
        let parent = tree.findChannel(json["cpid"]);
        if (!parent && json["cpid"] != 0) {
            console.error("Unknown channel move (parent)!");
            return 0;
        }
        tree.moveChannel(channel, prev, parent);
    }
    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if (!channel) {
            console.error("Unknown channel edit (Channel)!");
            return 0;
        }
        let updates = [];
        for (let key in json) {
            if (key === "cid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            updates.push({ key: key, value: json[key] });
        }
        channel.updateVariables(...updates);
    }
    handleNotifyTextMessage(json) {
        json = json[0]; //Only one bulk
        //TODO chat format?
        let mode = json["targetmode"];
        if (mode == 1) {
            let invoker = this.connection._client.channelTree.findClient(json["invokerid"]);
            let target = this.connection._client.channelTree.findClient(json["target"]);
            if (!invoker) { //TODO spawn chat (Client is may invisible)
                console.error("Got private message from invalid client!");
                return;
            }
            if (!target) { //TODO spawn chat (Client is may invisible)
                console.error("Got private message from invalid client!");
                return;
            }
            if (invoker == this.connection._client.getClient()) {
                target.chat(true).appendMessage("<< " + json["msg"]);
            }
            else {
                invoker.chat(true).appendMessage(">> " + json["msg"]);
            }
        }
        else if (mode == 2) {
            chat.channelChat().appendMessage("{0} >> {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), json["msg"]);
        }
        else if (mode == 3) {
            chat.serverChat().appendMessage("{0} >> {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), json["msg"]);
        }
    }
    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk
        let client = this.connection._client.channelTree.findClient(json["clid"]);
        if (!client) {
            console.error("Tried to update an non existing client");
            return;
        }
        let updates = [];
        for (let key in json) {
            if (key == "clid")
                continue;
            updates.push({ key: key, value: json[key] });
        }
        client.updateVariables(...updates);
        if (this.connection._client.selectInfo.currentSelected == client)
            this.connection._client.selectInfo.update();
    }
    handleNotifyServerEdited(json) {
        json = json[0];
        for (let key in json) {
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
    }
    handleNotifyServerUpdated(json) {
        json = json[0];
        for (let key in json) {
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        let info = this.connection._client.selectInfo;
        if (info.currentSelected instanceof ServerEntry)
            info.update();
    }
}
/// <reference path="client.ts" />
if (typeof (customElements) !== "undefined") {
    class X_Properties extends HTMLElement {
    }
    class X_Property extends HTMLElement {
    }
    customElements.define('x-properties', X_Properties, { extends: 'div' });
    customElements.define('x-property', X_Property, { extends: 'div' });
}
class Settings {
    constructor() {
        this.cacheGlobal = {};
        this.cacheServer = {};
        this.updated = false;
        this._staticPropsTag = $("#properties");
        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if (!this.cacheGlobal)
            this.cacheGlobal = {};
        const _this = this;
        this.saveWorker = setInterval(() => {
            if (_this.updated)
                _this.save();
        }, 5 * 1000);
        this.initializeStatic();
    }
    initializeStatic() {
        location.search.substr(1).split("&").forEach(part => {
            let item = part.split("=");
            $("<x-property></x-property>")
                .attr("key", item[0])
                .attr("value", item[1])
                .appendTo(this._staticPropsTag);
        });
    }
    static transformStO(input, _default) {
        if (typeof input === "undefined")
            return _default;
        if (typeof _default === "string")
            return input;
        else if (typeof _default === "number")
            return parseInt(input);
        else if (typeof _default === "boolean")
            return (input == "1" || input == "true");
        else if (typeof _default === "undefined")
            return input;
        return JSON.parse(input);
    }
    static transformOtS(input) {
        if (typeof input === "string")
            return input;
        else if (typeof input === "number")
            return input.toString();
        else if (typeof input === "boolean")
            return input ? "1" : "0";
        else if (typeof input == "undefined")
            return undefined;
        return JSON.stringify(input);
    }
    global(key, _default) {
        let result = this.cacheGlobal[key];
        return Settings.transformStO(result, _default);
    }
    server(key, _default) {
        let result = this.cacheServer[key];
        return Settings.transformStO(result, _default);
    }
    static(key, _default) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        console.log("%d | %o", result.length, result);
        return Settings.transformStO(result.length > 0 ? decodeURIComponent(result.last().attr("value")) : undefined, _default);
    }
    changeGlobal(key, value) {
        if (this.cacheGlobal[key] == value)
            return;
        this.updated = true;
        this.cacheGlobal[key] = Settings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    changeServer(key, value) {
        if (this.cacheServer[key] == value)
            return;
        this.updated = true;
        this.cacheServer[key] = Settings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    setServer(server) {
        if (this.currentServer) {
            this.save();
            this.cacheServer = {};
            this.currentServer = undefined;
        }
        this.currentServer = server;
        if (this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + serverId));
            if (!this.cacheServer)
                this.cacheServer = {};
        }
    }
    save() {
        this.updated = false;
        if (this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + serverId, server);
        }
        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
    }
    deleteStatic(key) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        if (result.length != 0)
            result.detach();
    }
}
Settings.KEY_DISABLE_CONTEXT_MENU = "disableContextMenu";
Settings.KEY_DISABLE_UNLOAD_DIALOG = "disableUnloadDialog";
Settings.UPDATE_DIRECT = true;
/// <reference path="client.ts" />
class InfoBar {
    constructor(client, htmlTag) {
        this.timers = [];
        this.intervals = [];
        this.handle = client;
        this._htmlTag = htmlTag;
    }
    createInfoTable(infos) {
        let table = $("<table/>");
        for (let e in infos) {
            console.log("Display info " + e);
            let entry = $("<tr/>");
            entry.append("<td class='info_key'>" + e + ":</td>");
            entry.append("<td>" + infos[e] + "</td>");
            table.append(entry);
        }
        return table;
    }
    set currentSelected(entry) {
        if (this._currentSelected == entry)
            return;
        this._currentSelected = entry;
        this.buildBar();
    }
    get currentSelected() {
        return this._currentSelected;
    }
    update() {
        this.buildBar();
    }
    updateServerTimings() {
        this._htmlTag.find(".uptime").text(formatDate(this._currentSelected.calculateUptime()));
    }
    updateClientTimings() {
        this._htmlTag.find(".online").text(formatDate(this._currentSelected.calculateOnlineTime()));
    }
    buildBar() {
        this._htmlTag.empty();
        if (!this._currentSelected)
            return;
        for (let timer of this.timers)
            clearTimeout(timer);
        for (let timer of this.intervals)
            clearInterval(timer);
        if (this._currentSelected instanceof ServerEntry) {
            if (this._currentSelected.shouldUpdateProperties())
                this._currentSelected.updateProperties();
            let version = this._currentSelected.properties.virtualserver_version;
            if (version.startsWith("TeaSpeak "))
                version = version.substr("TeaSpeak ".length);
            this._htmlTag.append(this.createInfoTable({
                "Name": this._currentSelected.properties.virtualserver_name,
                "Address": "unknown",
                "Type": "TeaSpeak",
                "Version": version + " on " + this._currentSelected.properties.virtualserver_platform,
                "Uptime": "<a class='uptime'>" + formatDate(this._currentSelected.calculateUptime()) + "</a>",
                "Current Channels": this._currentSelected.properties.virtualserver_channelsonline,
                "Current Clients": this._currentSelected.properties.virtualserver_clientsonline,
                "Current Queries": this._currentSelected.properties.virtualserver_queryclientsonline
            }));
            this._htmlTag.append($.spawn("div").css("height", "100%"));
            let requestUpdate = $.spawn("button");
            requestUpdate.css("min-height", "16px");
            requestUpdate.css("bottom", 0);
            requestUpdate.text("update info");
            if (this._currentSelected.shouldUpdateProperties())
                requestUpdate.css("color", "green");
            else {
                requestUpdate.attr("disabled", "true");
                requestUpdate.css("color", "red");
            }
            this._htmlTag.append(requestUpdate);
            const _server = this._currentSelected;
            const _this = this;
            requestUpdate.click(function () {
                _server.updateProperties();
                _this.buildBar();
            });
            this.timers.push(setTimeout(function () {
                requestUpdate.css("color", "green");
                requestUpdate.removeAttr("disabled");
            }, _server.nextInfoRequest - new Date().getTime()));
            this.intervals.push(setInterval(this.updateServerTimings.bind(this), 1000));
        }
        else if (this._currentSelected instanceof ChannelEntry) {
            let props = this._currentSelected.properties;
            this._htmlTag.append(this.createInfoTable({
                "Name": this._currentSelected.createChatTag().html(),
                "Topic": this._currentSelected.properties.channel_topic,
                "Codec": this._currentSelected.properties.channel_codec,
                "Codec Quality": this._currentSelected.properties.channel_codec_quality,
                "Type": ChannelType.normalize(this._currentSelected.channelType()),
                "Current clients": this._currentSelected.channelTree.clientsByChannel(this._currentSelected).length + " / " + (props.channel_maxclients == -1 ? "Unlimited" : props.channel_maxclients),
                "Subscription Status": "unknown",
                "Voice Data Encryption": "unknown"
            }));
        }
        else if (this._currentSelected instanceof ClientEntry) {
            this._currentSelected.updateVariables();
            let version = this._currentSelected.properties.client_version;
            if (!version)
                version = "";
            let infos = {
                "Name": this._currentSelected.createChatTag().html(),
                "Description": this._currentSelected.properties.client_description,
                "Version": "<a title='" + ChatMessage.formatMessage(version) + "'>" + version.split(" ")[0] + "</a>" + " on " + this._currentSelected.properties.client_platform,
                "Online since": "<a class='online'>" + formatDate(this._currentSelected.calculateOnlineTime()) + "</a>",
                "Volume": this._currentSelected.audioController.volume * 100 + " %"
            };
            if (this._currentSelected.properties["client_teaforum_id"] > 0) {
                infos["TeaSpeak Account"] = "<a href='//forum.teaspeak.de/index.php?members/{1}/' target='_blank'>{0}</a>".format(this._currentSelected.properties["client_teaforum_name"], this._currentSelected.properties["client_teaforum_id"]);
            }
            this._htmlTag.append(this.createInfoTable(infos));
            {
                let serverGroups = $.spawn("div");
                serverGroups
                    .css("display", "flex")
                    .css("flex-direction", "column");
                let header = $.spawn("div");
                header
                    .css("display", "flex")
                    .css("margin-top", "5px")
                    .css("align-items", "center");
                $.spawn("div").addClass("icon client-permission_server_groups").appendTo(header);
                $.spawn("div").text("Server groups:").css("margin-left", "3px").css("font-weight", "bold").appendTo(header);
                header.appendTo(serverGroups);
                for (let groupId of this._currentSelected.assignedServerGroupIds()) {
                    let group = this.handle.groups.serverGroup(groupId);
                    if (!group)
                        continue;
                    let groupTag = $.spawn("div");
                    groupTag
                        .css("display", "flex")
                        .css("margin-top", "1px")
                        .css("margin-left", "10px")
                        .css("align-items", "center");
                    this.handle.fileManager.icons.generateTag(group.properties.iconid).appendTo(groupTag);
                    $.spawn("div").text(group.name).css("margin-left", "3px").appendTo(groupTag);
                    groupTag.appendTo(serverGroups);
                }
                this._htmlTag.append(serverGroups);
            }
            {
                let channelGroup = $.spawn("div");
                channelGroup
                    .css("display", "flex")
                    .css("flex-direction", "column");
                let header = $.spawn("div");
                header
                    .css("display", "flex")
                    .css("margin-top", "10px")
                    .css("align-items", "center");
                $.spawn("div").addClass("icon client-permission_channel").appendTo(header);
                $.spawn("div").text("Channel group:").css("margin-left", "3px").css("font-weight", "bold").appendTo(header);
                header.appendTo(channelGroup);
                let group = this.handle.groups.channelGroup(this._currentSelected.assignedChannelGroup());
                if (group) {
                    let groupTag = $.spawn("div");
                    groupTag
                        .css("display", "flex")
                        .css("margin-top", "1px")
                        .css("margin-left", "10px")
                        .css("align-items", "center");
                    this.handle.fileManager.icons.generateTag(group.properties.iconid).appendTo(groupTag);
                    $.spawn("div").text(group.name).css("margin-left", "3px").appendTo(groupTag);
                    groupTag.appendTo(channelGroup);
                }
                this._htmlTag.append(channelGroup);
            }
            if (this._currentSelected.properties.client_flag_avatar.length > 0)
                this.handle.fileManager.avatars.generateTag(this._currentSelected).appendTo(this._htmlTag);
            this.intervals.push(setInterval(this.updateClientTimings.bind(this), 1000));
        }
    }
}
/// <reference path="../client.ts" />
var PermissionType;
(function (PermissionType) {
    PermissionType["B_SERVERINSTANCE_HELP_VIEW"] = "b_serverinstance_help_view";
    PermissionType["B_SERVERINSTANCE_VERSION_VIEW"] = "b_serverinstance_version_view";
    PermissionType["B_SERVERINSTANCE_INFO_VIEW"] = "b_serverinstance_info_view";
    PermissionType["B_SERVERINSTANCE_VIRTUALSERVER_LIST"] = "b_serverinstance_virtualserver_list";
    PermissionType["B_SERVERINSTANCE_BINDING_LIST"] = "b_serverinstance_binding_list";
    PermissionType["B_SERVERINSTANCE_PERMISSION_LIST"] = "b_serverinstance_permission_list";
    PermissionType["B_SERVERINSTANCE_PERMISSION_FIND"] = "b_serverinstance_permission_find";
    PermissionType["B_VIRTUALSERVER_CREATE"] = "b_virtualserver_create";
    PermissionType["B_VIRTUALSERVER_DELETE"] = "b_virtualserver_delete";
    PermissionType["B_VIRTUALSERVER_START_ANY"] = "b_virtualserver_start_any";
    PermissionType["B_VIRTUALSERVER_STOP_ANY"] = "b_virtualserver_stop_any";
    PermissionType["B_VIRTUALSERVER_CHANGE_MACHINE_ID"] = "b_virtualserver_change_machine_id";
    PermissionType["B_VIRTUALSERVER_CHANGE_TEMPLATE"] = "b_virtualserver_change_template";
    PermissionType["B_SERVERQUERY_LOGIN"] = "b_serverquery_login";
    PermissionType["B_SERVERINSTANCE_TEXTMESSAGE_SEND"] = "b_serverinstance_textmessage_send";
    PermissionType["B_SERVERINSTANCE_LOG_VIEW"] = "b_serverinstance_log_view";
    PermissionType["B_SERVERINSTANCE_LOG_ADD"] = "b_serverinstance_log_add";
    PermissionType["B_SERVERINSTANCE_STOP"] = "b_serverinstance_stop";
    PermissionType["B_SERVERINSTANCE_MODIFY_SETTINGS"] = "b_serverinstance_modify_settings";
    PermissionType["B_SERVERINSTANCE_MODIFY_QUERYGROUP"] = "b_serverinstance_modify_querygroup";
    PermissionType["B_SERVERINSTANCE_MODIFY_TEMPLATES"] = "b_serverinstance_modify_templates";
    PermissionType["B_VIRTUALSERVER_SELECT"] = "b_virtualserver_select";
    PermissionType["B_VIRTUALSERVER_INFO_VIEW"] = "b_virtualserver_info_view";
    PermissionType["B_VIRTUALSERVER_CONNECTIONINFO_VIEW"] = "b_virtualserver_connectioninfo_view";
    PermissionType["B_VIRTUALSERVER_CHANNEL_LIST"] = "b_virtualserver_channel_list";
    PermissionType["B_VIRTUALSERVER_CHANNEL_SEARCH"] = "b_virtualserver_channel_search";
    PermissionType["B_VIRTUALSERVER_CLIENT_LIST"] = "b_virtualserver_client_list";
    PermissionType["B_VIRTUALSERVER_CLIENT_SEARCH"] = "b_virtualserver_client_search";
    PermissionType["B_VIRTUALSERVER_CLIENT_DBLIST"] = "b_virtualserver_client_dblist";
    PermissionType["B_VIRTUALSERVER_CLIENT_DBSEARCH"] = "b_virtualserver_client_dbsearch";
    PermissionType["B_VIRTUALSERVER_CLIENT_DBINFO"] = "b_virtualserver_client_dbinfo";
    PermissionType["B_VIRTUALSERVER_PERMISSION_FIND"] = "b_virtualserver_permission_find";
    PermissionType["B_VIRTUALSERVER_CUSTOM_SEARCH"] = "b_virtualserver_custom_search";
    PermissionType["B_VIRTUALSERVER_START"] = "b_virtualserver_start";
    PermissionType["B_VIRTUALSERVER_STOP"] = "b_virtualserver_stop";
    PermissionType["B_VIRTUALSERVER_TOKEN_LIST"] = "b_virtualserver_token_list";
    PermissionType["B_VIRTUALSERVER_TOKEN_ADD"] = "b_virtualserver_token_add";
    PermissionType["B_VIRTUALSERVER_TOKEN_USE"] = "b_virtualserver_token_use";
    PermissionType["B_VIRTUALSERVER_TOKEN_DELETE"] = "b_virtualserver_token_delete";
    PermissionType["B_VIRTUALSERVER_LOG_VIEW"] = "b_virtualserver_log_view";
    PermissionType["B_VIRTUALSERVER_LOG_ADD"] = "b_virtualserver_log_add";
    PermissionType["B_VIRTUALSERVER_JOIN_IGNORE_PASSWORD"] = "b_virtualserver_join_ignore_password";
    PermissionType["B_VIRTUALSERVER_NOTIFY_REGISTER"] = "b_virtualserver_notify_register";
    PermissionType["B_VIRTUALSERVER_NOTIFY_UNREGISTER"] = "b_virtualserver_notify_unregister";
    PermissionType["B_VIRTUALSERVER_SNAPSHOT_CREATE"] = "b_virtualserver_snapshot_create";
    PermissionType["B_VIRTUALSERVER_SNAPSHOT_DEPLOY"] = "b_virtualserver_snapshot_deploy";
    PermissionType["B_VIRTUALSERVER_PERMISSION_RESET"] = "b_virtualserver_permission_reset";
    PermissionType["B_VIRTUALSERVER_MODIFY_NAME"] = "b_virtualserver_modify_name";
    PermissionType["B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE"] = "b_virtualserver_modify_welcomemessage";
    PermissionType["B_VIRTUALSERVER_MODIFY_MAXCLIENTS"] = "b_virtualserver_modify_maxclients";
    PermissionType["B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS"] = "b_virtualserver_modify_reserved_slots";
    PermissionType["B_VIRTUALSERVER_MODIFY_PASSWORD"] = "b_virtualserver_modify_password";
    PermissionType["B_VIRTUALSERVER_MODIFY_DEFAULT_SERVERGROUP"] = "b_virtualserver_modify_default_servergroup";
    PermissionType["B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELGROUP"] = "b_virtualserver_modify_default_channelgroup";
    PermissionType["B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELADMINGROUP"] = "b_virtualserver_modify_default_channeladmingroup";
    PermissionType["B_VIRTUALSERVER_MODIFY_CHANNEL_FORCED_SILENCE"] = "b_virtualserver_modify_channel_forced_silence";
    PermissionType["B_VIRTUALSERVER_MODIFY_COMPLAIN"] = "b_virtualserver_modify_complain";
    PermissionType["B_VIRTUALSERVER_MODIFY_ANTIFLOOD"] = "b_virtualserver_modify_antiflood";
    PermissionType["B_VIRTUALSERVER_MODIFY_FT_SETTINGS"] = "b_virtualserver_modify_ft_settings";
    PermissionType["B_VIRTUALSERVER_MODIFY_FT_QUOTAS"] = "b_virtualserver_modify_ft_quotas";
    PermissionType["B_VIRTUALSERVER_MODIFY_HOSTMESSAGE"] = "b_virtualserver_modify_hostmessage";
    PermissionType["B_VIRTUALSERVER_MODIFY_HOSTBANNER"] = "b_virtualserver_modify_hostbanner";
    PermissionType["B_VIRTUALSERVER_MODIFY_HOSTBUTTON"] = "b_virtualserver_modify_hostbutton";
    PermissionType["B_VIRTUALSERVER_MODIFY_PORT"] = "b_virtualserver_modify_port";
    PermissionType["B_VIRTUALSERVER_MODIFY_HOST"] = "b_virtualserver_modify_host";
    PermissionType["B_VIRTUALSERVER_MODIFY_AUTOSTART"] = "b_virtualserver_modify_autostart";
    PermissionType["B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL"] = "b_virtualserver_modify_needed_identity_security_level";
    PermissionType["B_VIRTUALSERVER_MODIFY_PRIORITY_SPEAKER_DIMM_MODIFICATOR"] = "b_virtualserver_modify_priority_speaker_dimm_modificator";
    PermissionType["B_VIRTUALSERVER_MODIFY_LOG_SETTINGS"] = "b_virtualserver_modify_log_settings";
    PermissionType["B_VIRTUALSERVER_MODIFY_MIN_CLIENT_VERSION"] = "b_virtualserver_modify_min_client_version";
    PermissionType["B_VIRTUALSERVER_MODIFY_ICON_ID"] = "b_virtualserver_modify_icon_id";
    PermissionType["B_VIRTUALSERVER_MODIFY_WEBLIST"] = "b_virtualserver_modify_weblist";
    PermissionType["B_VIRTUALSERVER_MODIFY_CODEC_ENCRYPTION_MODE"] = "b_virtualserver_modify_codec_encryption_mode";
    PermissionType["B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS"] = "b_virtualserver_modify_temporary_passwords";
    PermissionType["B_VIRTUALSERVER_MODIFY_TEMPORARY_PASSWORDS_OWN"] = "b_virtualserver_modify_temporary_passwords_own";
    PermissionType["B_VIRTUALSERVER_MODIFY_CHANNEL_TEMP_DELETE_DELAY_DEFAULT"] = "b_virtualserver_modify_channel_temp_delete_delay_default";
    PermissionType["B_VIRTUALSERVER_MODIFY_MUSIC_BOT_LIMIT"] = "b_virtualserver_modify_music_bot_limit";
    PermissionType["I_CHANNEL_MIN_DEPTH"] = "i_channel_min_depth";
    PermissionType["I_CHANNEL_MAX_DEPTH"] = "i_channel_max_depth";
    PermissionType["B_CHANNEL_GROUP_INHERITANCE_END"] = "b_channel_group_inheritance_end";
    PermissionType["I_CHANNEL_PERMISSION_MODIFY_POWER"] = "i_channel_permission_modify_power";
    PermissionType["I_CHANNEL_NEEDED_PERMISSION_MODIFY_POWER"] = "i_channel_needed_permission_modify_power";
    PermissionType["B_CHANNEL_INFO_VIEW"] = "b_channel_info_view";
    PermissionType["B_CHANNEL_CREATE_CHILD"] = "b_channel_create_child";
    PermissionType["B_CHANNEL_CREATE_PERMANENT"] = "b_channel_create_permanent";
    PermissionType["B_CHANNEL_CREATE_SEMI_PERMANENT"] = "b_channel_create_semi_permanent";
    PermissionType["B_CHANNEL_CREATE_TEMPORARY"] = "b_channel_create_temporary";
    PermissionType["B_CHANNEL_CREATE_PRIVATE"] = "b_channel_create_private";
    PermissionType["B_CHANNEL_CREATE_WITH_TOPIC"] = "b_channel_create_with_topic";
    PermissionType["B_CHANNEL_CREATE_WITH_DESCRIPTION"] = "b_channel_create_with_description";
    PermissionType["B_CHANNEL_CREATE_WITH_PASSWORD"] = "b_channel_create_with_password";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX8"] = "b_channel_create_modify_with_codec_speex8";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX16"] = "b_channel_create_modify_with_codec_speex16";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX32"] = "b_channel_create_modify_with_codec_speex32";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_CELTMONO48"] = "b_channel_create_modify_with_codec_celtmono48";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE"] = "b_channel_create_modify_with_codec_opusvoice";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC"] = "b_channel_create_modify_with_codec_opusmusic";
    PermissionType["I_CHANNEL_CREATE_MODIFY_WITH_CODEC_MAXQUALITY"] = "i_channel_create_modify_with_codec_maxquality";
    PermissionType["I_CHANNEL_CREATE_MODIFY_WITH_CODEC_LATENCY_FACTOR_MIN"] = "i_channel_create_modify_with_codec_latency_factor_min";
    PermissionType["B_CHANNEL_CREATE_WITH_MAXCLIENTS"] = "b_channel_create_with_maxclients";
    PermissionType["B_CHANNEL_CREATE_WITH_MAXFAMILYCLIENTS"] = "b_channel_create_with_maxfamilyclients";
    PermissionType["B_CHANNEL_CREATE_WITH_SORTORDER"] = "b_channel_create_with_sortorder";
    PermissionType["B_CHANNEL_CREATE_WITH_DEFAULT"] = "b_channel_create_with_default";
    PermissionType["B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER"] = "b_channel_create_with_needed_talk_power";
    PermissionType["B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD"] = "b_channel_create_modify_with_force_password";
    PermissionType["I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY"] = "i_channel_create_modify_with_temp_delete_delay";
    PermissionType["B_CHANNEL_MODIFY_PARENT"] = "b_channel_modify_parent";
    PermissionType["B_CHANNEL_MODIFY_MAKE_DEFAULT"] = "b_channel_modify_make_default";
    PermissionType["B_CHANNEL_MODIFY_MAKE_PERMANENT"] = "b_channel_modify_make_permanent";
    PermissionType["B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT"] = "b_channel_modify_make_semi_permanent";
    PermissionType["B_CHANNEL_MODIFY_MAKE_TEMPORARY"] = "b_channel_modify_make_temporary";
    PermissionType["B_CHANNEL_MODIFY_NAME"] = "b_channel_modify_name";
    PermissionType["B_CHANNEL_MODIFY_TOPIC"] = "b_channel_modify_topic";
    PermissionType["B_CHANNEL_MODIFY_DESCRIPTION"] = "b_channel_modify_description";
    PermissionType["B_CHANNEL_MODIFY_PASSWORD"] = "b_channel_modify_password";
    PermissionType["B_CHANNEL_MODIFY_CODEC"] = "b_channel_modify_codec";
    PermissionType["B_CHANNEL_MODIFY_CODEC_QUALITY"] = "b_channel_modify_codec_quality";
    PermissionType["B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR"] = "b_channel_modify_codec_latency_factor";
    PermissionType["B_CHANNEL_MODIFY_MAXCLIENTS"] = "b_channel_modify_maxclients";
    PermissionType["B_CHANNEL_MODIFY_MAXFAMILYCLIENTS"] = "b_channel_modify_maxfamilyclients";
    PermissionType["B_CHANNEL_MODIFY_SORTORDER"] = "b_channel_modify_sortorder";
    PermissionType["B_CHANNEL_MODIFY_NEEDED_TALK_POWER"] = "b_channel_modify_needed_talk_power";
    PermissionType["I_CHANNEL_MODIFY_POWER"] = "i_channel_modify_power";
    PermissionType["I_CHANNEL_NEEDED_MODIFY_POWER"] = "i_channel_needed_modify_power";
    PermissionType["B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED"] = "b_channel_modify_make_codec_encrypted";
    PermissionType["B_CHANNEL_MODIFY_TEMP_DELETE_DELAY"] = "b_channel_modify_temp_delete_delay";
    PermissionType["B_CHANNEL_DELETE_PERMANENT"] = "b_channel_delete_permanent";
    PermissionType["B_CHANNEL_DELETE_SEMI_PERMANENT"] = "b_channel_delete_semi_permanent";
    PermissionType["B_CHANNEL_DELETE_TEMPORARY"] = "b_channel_delete_temporary";
    PermissionType["B_CHANNEL_DELETE_FLAG_FORCE"] = "b_channel_delete_flag_force";
    PermissionType["I_CHANNEL_DELETE_POWER"] = "i_channel_delete_power";
    PermissionType["I_CHANNEL_NEEDED_DELETE_POWER"] = "i_channel_needed_delete_power";
    PermissionType["B_CHANNEL_JOIN_PERMANENT"] = "b_channel_join_permanent";
    PermissionType["B_CHANNEL_JOIN_SEMI_PERMANENT"] = "b_channel_join_semi_permanent";
    PermissionType["B_CHANNEL_JOIN_TEMPORARY"] = "b_channel_join_temporary";
    PermissionType["B_CHANNEL_JOIN_IGNORE_PASSWORD"] = "b_channel_join_ignore_password";
    PermissionType["B_CHANNEL_JOIN_IGNORE_MAXCLIENTS"] = "b_channel_join_ignore_maxclients";
    PermissionType["I_CHANNEL_JOIN_POWER"] = "i_channel_join_power";
    PermissionType["I_CHANNEL_NEEDED_JOIN_POWER"] = "i_channel_needed_join_power";
    PermissionType["I_CHANNEL_SUBSCRIBE_POWER"] = "i_channel_subscribe_power";
    PermissionType["I_CHANNEL_NEEDED_SUBSCRIBE_POWER"] = "i_channel_needed_subscribe_power";
    PermissionType["I_CHANNEL_DESCRIPTION_VIEW_POWER"] = "i_channel_description_view_power";
    PermissionType["I_CHANNEL_NEEDED_DESCRIPTION_VIEW_POWER"] = "i_channel_needed_description_view_power";
    PermissionType["I_ICON_ID"] = "i_icon_id";
    PermissionType["I_MAX_ICON_FILESIZE"] = "i_max_icon_filesize";
    PermissionType["B_ICON_MANAGE"] = "b_icon_manage";
    PermissionType["B_GROUP_IS_PERMANENT"] = "b_group_is_permanent";
    PermissionType["I_GROUP_AUTO_UPDATE_TYPE"] = "i_group_auto_update_type";
    PermissionType["I_GROUP_AUTO_UPDATE_MAX_VALUE"] = "i_group_auto_update_max_value";
    PermissionType["I_GROUP_SORT_ID"] = "i_group_sort_id";
    PermissionType["I_GROUP_SHOW_NAME_IN_TREE"] = "i_group_show_name_in_tree";
    PermissionType["B_VIRTUALSERVER_SERVERGROUP_LIST"] = "b_virtualserver_servergroup_list";
    PermissionType["B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST"] = "b_virtualserver_servergroup_permission_list";
    PermissionType["B_VIRTUALSERVER_SERVERGROUP_CLIENT_LIST"] = "b_virtualserver_servergroup_client_list";
    PermissionType["B_VIRTUALSERVER_CHANNELGROUP_LIST"] = "b_virtualserver_channelgroup_list";
    PermissionType["B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST"] = "b_virtualserver_channelgroup_permission_list";
    PermissionType["B_VIRTUALSERVER_CHANNELGROUP_CLIENT_LIST"] = "b_virtualserver_channelgroup_client_list";
    PermissionType["B_VIRTUALSERVER_CLIENT_PERMISSION_LIST"] = "b_virtualserver_client_permission_list";
    PermissionType["B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST"] = "b_virtualserver_channel_permission_list";
    PermissionType["B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST"] = "b_virtualserver_channelclient_permission_list";
    PermissionType["B_VIRTUALSERVER_SERVERGROUP_CREATE"] = "b_virtualserver_servergroup_create";
    PermissionType["B_VIRTUALSERVER_CHANNELGROUP_CREATE"] = "b_virtualserver_channelgroup_create";
    PermissionType["I_SERVER_GROUP_MODIFY_POWER"] = "i_server_group_modify_power";
    PermissionType["I_SERVER_GROUP_NEEDED_MODIFY_POWER"] = "i_server_group_needed_modify_power";
    PermissionType["I_SERVER_GROUP_MEMBER_ADD_POWER"] = "i_server_group_member_add_power";
    PermissionType["I_SERVER_GROUP_NEEDED_MEMBER_ADD_POWER"] = "i_server_group_needed_member_add_power";
    PermissionType["I_SERVER_GROUP_MEMBER_REMOVE_POWER"] = "i_server_group_member_remove_power";
    PermissionType["I_SERVER_GROUP_NEEDED_MEMBER_REMOVE_POWER"] = "i_server_group_needed_member_remove_power";
    PermissionType["I_CHANNEL_GROUP_MODIFY_POWER"] = "i_channel_group_modify_power";
    PermissionType["I_CHANNEL_GROUP_NEEDED_MODIFY_POWER"] = "i_channel_group_needed_modify_power";
    PermissionType["I_CHANNEL_GROUP_MEMBER_ADD_POWER"] = "i_channel_group_member_add_power";
    PermissionType["I_CHANNEL_GROUP_NEEDED_MEMBER_ADD_POWER"] = "i_channel_group_needed_member_add_power";
    PermissionType["I_CHANNEL_GROUP_MEMBER_REMOVE_POWER"] = "i_channel_group_member_remove_power";
    PermissionType["I_CHANNEL_GROUP_NEEDED_MEMBER_REMOVE_POWER"] = "i_channel_group_needed_member_remove_power";
    PermissionType["I_GROUP_MEMBER_ADD_POWER"] = "i_group_member_add_power";
    PermissionType["I_GROUP_NEEDED_MEMBER_ADD_POWER"] = "i_group_needed_member_add_power";
    PermissionType["I_GROUP_MEMBER_REMOVE_POWER"] = "i_group_member_remove_power";
    PermissionType["I_GROUP_NEEDED_MEMBER_REMOVE_POWER"] = "i_group_needed_member_remove_power";
    PermissionType["I_GROUP_MODIFY_POWER"] = "i_group_modify_power";
    PermissionType["I_GROUP_NEEDED_MODIFY_POWER"] = "i_group_needed_modify_power";
    PermissionType["I_DISPLAYED_GROUP_MEMBER_ADD_POWER"] = "i_displayed_group_member_add_power";
    PermissionType["I_DISPLAYED_GROUP_NEEDED_MEMBER_ADD_POWER"] = "i_displayed_group_needed_member_add_power";
    PermissionType["I_DISPLAYED_GROUP_MEMBER_REMOVE_POWER"] = "i_displayed_group_member_remove_power";
    PermissionType["I_DISPLAYED_GROUP_NEEDED_MEMBER_REMOVE_POWER"] = "i_displayed_group_needed_member_remove_power";
    PermissionType["I_DISPLAYED_GROUP_MODIFY_POWER"] = "i_displayed_group_modify_power";
    PermissionType["I_DISPLAYED_GROUP_NEEDED_MODIFY_POWER"] = "i_displayed_group_needed_modify_power";
    PermissionType["I_PERMISSION_MODIFY_POWER"] = "i_permission_modify_power";
    PermissionType["B_PERMISSION_MODIFY_POWER_IGNORE"] = "b_permission_modify_power_ignore";
    PermissionType["B_VIRTUALSERVER_SERVERGROUP_DELETE"] = "b_virtualserver_servergroup_delete";
    PermissionType["B_VIRTUALSERVER_CHANNELGROUP_DELETE"] = "b_virtualserver_channelgroup_delete";
    PermissionType["I_CLIENT_PERMISSION_MODIFY_POWER"] = "i_client_permission_modify_power";
    PermissionType["I_CLIENT_NEEDED_PERMISSION_MODIFY_POWER"] = "i_client_needed_permission_modify_power";
    PermissionType["I_CLIENT_MAX_CLONES_UID"] = "i_client_max_clones_uid";
    PermissionType["I_CLIENT_MAX_IDLETIME"] = "i_client_max_idletime";
    PermissionType["I_CLIENT_MAX_AVATAR_FILESIZE"] = "i_client_max_avatar_filesize";
    PermissionType["I_CLIENT_MAX_CHANNEL_SUBSCRIPTIONS"] = "i_client_max_channel_subscriptions";
    PermissionType["B_CLIENT_IS_PRIORITY_SPEAKER"] = "b_client_is_priority_speaker";
    PermissionType["B_CLIENT_SKIP_CHANNELGROUP_PERMISSIONS"] = "b_client_skip_channelgroup_permissions";
    PermissionType["B_CLIENT_FORCE_PUSH_TO_TALK"] = "b_client_force_push_to_talk";
    PermissionType["B_CLIENT_IGNORE_BANS"] = "b_client_ignore_bans";
    PermissionType["B_CLIENT_IGNORE_ANTIFLOOD"] = "b_client_ignore_antiflood";
    PermissionType["B_CLIENT_ISSUE_CLIENT_QUERY_COMMAND"] = "b_client_issue_client_query_command";
    PermissionType["B_CLIENT_USE_RESERVED_SLOT"] = "b_client_use_reserved_slot";
    PermissionType["B_CLIENT_USE_CHANNEL_COMMANDER"] = "b_client_use_channel_commander";
    PermissionType["B_CLIENT_REQUEST_TALKER"] = "b_client_request_talker";
    PermissionType["B_CLIENT_AVATAR_DELETE_OTHER"] = "b_client_avatar_delete_other";
    PermissionType["B_CLIENT_IS_STICKY"] = "b_client_is_sticky";
    PermissionType["B_CLIENT_IGNORE_STICKY"] = "b_client_ignore_sticky";
    PermissionType["B_CLIENT_MUSIC_CHANNEL_LIST"] = "b_client_music_channel_list";
    PermissionType["B_CLIENT_MUSIC_SERVER_LIST"] = "b_client_music_server_list";
    PermissionType["I_CLIENT_MUSIC_INFO"] = "i_client_music_info";
    PermissionType["I_CLIENT_MUSIC_NEEDED_INFO"] = "i_client_music_needed_info";
    PermissionType["B_CLIENT_INFO_VIEW"] = "b_client_info_view";
    PermissionType["B_CLIENT_PERMISSIONOVERVIEW_VIEW"] = "b_client_permissionoverview_view";
    PermissionType["B_CLIENT_PERMISSIONOVERVIEW_OWN"] = "b_client_permissionoverview_own";
    PermissionType["B_CLIENT_REMOTEADDRESS_VIEW"] = "b_client_remoteaddress_view";
    PermissionType["I_CLIENT_SERVERQUERY_VIEW_POWER"] = "i_client_serverquery_view_power";
    PermissionType["I_CLIENT_NEEDED_SERVERQUERY_VIEW_POWER"] = "i_client_needed_serverquery_view_power";
    PermissionType["B_CLIENT_CUSTOM_INFO_VIEW"] = "b_client_custom_info_view";
    PermissionType["I_CLIENT_KICK_FROM_SERVER_POWER"] = "i_client_kick_from_server_power";
    PermissionType["I_CLIENT_NEEDED_KICK_FROM_SERVER_POWER"] = "i_client_needed_kick_from_server_power";
    PermissionType["I_CLIENT_KICK_FROM_CHANNEL_POWER"] = "i_client_kick_from_channel_power";
    PermissionType["I_CLIENT_NEEDED_KICK_FROM_CHANNEL_POWER"] = "i_client_needed_kick_from_channel_power";
    PermissionType["I_CLIENT_BAN_POWER"] = "i_client_ban_power";
    PermissionType["I_CLIENT_NEEDED_BAN_POWER"] = "i_client_needed_ban_power";
    PermissionType["I_CLIENT_MOVE_POWER"] = "i_client_move_power";
    PermissionType["I_CLIENT_NEEDED_MOVE_POWER"] = "i_client_needed_move_power";
    PermissionType["I_CLIENT_COMPLAIN_POWER"] = "i_client_complain_power";
    PermissionType["I_CLIENT_NEEDED_COMPLAIN_POWER"] = "i_client_needed_complain_power";
    PermissionType["B_CLIENT_COMPLAIN_LIST"] = "b_client_complain_list";
    PermissionType["B_CLIENT_COMPLAIN_DELETE_OWN"] = "b_client_complain_delete_own";
    PermissionType["B_CLIENT_COMPLAIN_DELETE"] = "b_client_complain_delete";
    PermissionType["B_CLIENT_BAN_LIST"] = "b_client_ban_list";
    PermissionType["B_CLIENT_BAN_LIST_GLOBAL"] = "b_client_ban_list_global";
    PermissionType["B_CLIENT_BAN_CREATE"] = "b_client_ban_create";
    PermissionType["B_CLIENT_BAN_CREATE_GLOBAL"] = "b_client_ban_create_global";
    PermissionType["B_CLIENT_BAN_EDIT"] = "b_client_ban_edit";
    PermissionType["B_CLIENT_BAN_EDIT_GLOBAL"] = "b_client_ban_edit_global";
    PermissionType["B_CLIENT_BAN_DELETE_OWN"] = "b_client_ban_delete_own";
    PermissionType["B_CLIENT_BAN_DELETE"] = "b_client_ban_delete";
    PermissionType["B_CLIENT_BAN_DELETE_OWN_GLOBAL"] = "b_client_ban_delete_own_global";
    PermissionType["B_CLIENT_BAN_DELETE_GLOBAL"] = "b_client_ban_delete_global";
    PermissionType["I_CLIENT_BAN_MAX_BANTIME"] = "i_client_ban_max_bantime";
    PermissionType["I_CLIENT_PRIVATE_TEXTMESSAGE_POWER"] = "i_client_private_textmessage_power";
    PermissionType["I_CLIENT_NEEDED_PRIVATE_TEXTMESSAGE_POWER"] = "i_client_needed_private_textmessage_power";
    PermissionType["B_CLIENT_SERVER_TEXTMESSAGE_SEND"] = "b_client_server_textmessage_send";
    PermissionType["B_CLIENT_CHANNEL_TEXTMESSAGE_SEND"] = "b_client_channel_textmessage_send";
    PermissionType["B_CLIENT_OFFLINE_TEXTMESSAGE_SEND"] = "b_client_offline_textmessage_send";
    PermissionType["I_CLIENT_TALK_POWER"] = "i_client_talk_power";
    PermissionType["I_CLIENT_NEEDED_TALK_POWER"] = "i_client_needed_talk_power";
    PermissionType["I_CLIENT_POKE_POWER"] = "i_client_poke_power";
    PermissionType["I_CLIENT_NEEDED_POKE_POWER"] = "i_client_needed_poke_power";
    PermissionType["B_CLIENT_SET_FLAG_TALKER"] = "b_client_set_flag_talker";
    PermissionType["I_CLIENT_WHISPER_POWER"] = "i_client_whisper_power";
    PermissionType["I_CLIENT_NEEDED_WHISPER_POWER"] = "i_client_needed_whisper_power";
    PermissionType["B_CLIENT_MODIFY_DESCRIPTION"] = "b_client_modify_description";
    PermissionType["B_CLIENT_MODIFY_OWN_DESCRIPTION"] = "b_client_modify_own_description";
    PermissionType["B_CLIENT_MODIFY_DBPROPERTIES"] = "b_client_modify_dbproperties";
    PermissionType["B_CLIENT_DELETE_DBPROPERTIES"] = "b_client_delete_dbproperties";
    PermissionType["B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN"] = "b_client_create_modify_serverquery_login";
    PermissionType["B_CLIENT_MUSIC_CREATE"] = "b_client_music_create";
    PermissionType["I_CLIENT_MUSIC_LIMIT"] = "i_client_music_limit";
    PermissionType["I_CLIENT_MUSIC_DELETE_POWER"] = "i_client_music_delete_power";
    PermissionType["I_CLIENT_MUSIC_NEEDED_DELETE_POWER"] = "i_client_music_needed_delete_power";
    PermissionType["I_CLIENT_MUSIC_PLAY_POWER"] = "i_client_music_play_power";
    PermissionType["I_CLIENT_MUSIC_NEEDED_PLAY_POWER"] = "i_client_music_needed_play_power";
    PermissionType["I_CLIENT_MUSIC_RENAME_POWER"] = "i_client_music_rename_power";
    PermissionType["I_CLIENT_MUSIC_NEEDED_RENAME_POWER"] = "i_client_music_needed_rename_power";
    PermissionType["B_FT_IGNORE_PASSWORD"] = "b_ft_ignore_password";
    PermissionType["B_FT_TRANSFER_LIST"] = "b_ft_transfer_list";
    PermissionType["I_FT_FILE_UPLOAD_POWER"] = "i_ft_file_upload_power";
    PermissionType["I_FT_NEEDED_FILE_UPLOAD_POWER"] = "i_ft_needed_file_upload_power";
    PermissionType["I_FT_FILE_DOWNLOAD_POWER"] = "i_ft_file_download_power";
    PermissionType["I_FT_NEEDED_FILE_DOWNLOAD_POWER"] = "i_ft_needed_file_download_power";
    PermissionType["I_FT_FILE_DELETE_POWER"] = "i_ft_file_delete_power";
    PermissionType["I_FT_NEEDED_FILE_DELETE_POWER"] = "i_ft_needed_file_delete_power";
    PermissionType["I_FT_FILE_RENAME_POWER"] = "i_ft_file_rename_power";
    PermissionType["I_FT_NEEDED_FILE_RENAME_POWER"] = "i_ft_needed_file_rename_power";
    PermissionType["I_FT_FILE_BROWSE_POWER"] = "i_ft_file_browse_power";
    PermissionType["I_FT_NEEDED_FILE_BROWSE_POWER"] = "i_ft_needed_file_browse_power";
    PermissionType["I_FT_DIRECTORY_CREATE_POWER"] = "i_ft_directory_create_power";
    PermissionType["I_FT_NEEDED_DIRECTORY_CREATE_POWER"] = "i_ft_needed_directory_create_power";
    PermissionType["I_FT_QUOTA_MB_DOWNLOAD_PER_CLIENT"] = "i_ft_quota_mb_download_per_client";
    PermissionType["I_FT_QUOTA_MB_UPLOAD_PER_CLIENT"] = "i_ft_quota_mb_upload_per_client";
})(PermissionType || (PermissionType = {}));
class PermissionInfo {
}
class GrantedPermission {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
    granted(requiredValue, required = true) {
        let result = false;
        if (this.value == -2)
            result = !required;
        result = this.value == -1 || this.value >= requiredValue;
        log.trace(LogCategory.PERMISSIONS, "Test needed required: %o | %i | %o => " + result, this, requiredValue, required);
        return result;
    }
    hasValue() {
        return this.value != -2;
    }
}
class NeededGrantedPermission extends GrantedPermission {
    constructor(type, value) {
        super(type, value);
        this.changeListener = [];
    }
}
class PermissionManager {
    constructor(client) {
        this.permissionList = [];
        this.neededPermissions = [];
        this.initializedListener = [];
        this.handle = client;
        this.handle.serverConnection.commandHandler["notifyclientneededpermissions"] = this.onNeededPermissions.bind(this);
        this.handle.serverConnection.commandHandler["notifypermissionlist"] = this.onPermissionList.bind(this);
    }
    initialized() {
        return this.permissionList.length > 0;
    }
    requestPermissionList() {
        this.handle.serverConnection.sendCommand("permissionlist");
    }
    onPermissionList(json) {
        this.permissionList = [];
        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, "Permission mapping");
        for (let e of json) {
            if (e["group_id_end"])
                continue; //Skip all group ids (may use later?)
            let perm = new PermissionInfo();
            perm.name = e["permname"];
            perm.id = parseInt(e["permid"]);
            perm.description = e["permdesc"];
            group.log("%i <> %s -> %s", perm.id, perm.name, perm.description);
            this.permissionList.push(perm);
        }
        group.end();
        log.info(LogCategory.PERMISSIONS, "Got %i permissions", this.permissionList.length);
        if (this._cacheNeededPermissions)
            this.onNeededPermissions(this._cacheNeededPermissions);
        for (let listener of this.initializedListener)
            listener(true);
    }
    onNeededPermissions(json) {
        if (this.permissionList.length == 0) {
            log.warn(LogCategory.PERMISSIONS, "Got needed permissions but don't have a permission list!");
            this._cacheNeededPermissions = json;
            return;
        }
        this._cacheNeededPermissions = undefined;
        let copy = this.neededPermissions.slice();
        let addcount = 0;
        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, "Got " + json.length + " needed permissions.");
        for (let e of json) {
            let entry = undefined;
            for (let p of copy) {
                if (p.type.id == e["permid"]) {
                    entry = p;
                    copy.remove(p);
                    break;
                }
            }
            if (!entry) {
                let info = this.resolveInfo(e["permid"]);
                if (info) {
                    entry = new NeededGrantedPermission(info, -2);
                    this.neededPermissions.push(entry);
                }
                else {
                    log.warn(LogCategory.PERMISSIONS, "Could not resolve perm for id %s (%o|%o)", e["permid"], e, info);
                    continue;
                }
                addcount++;
            }
            if (entry.value == parseInt(e["permvalue"]))
                continue;
            entry.value = parseInt(e["permvalue"]);
            group.log("Update needed permission " + entry.type.name + " to " + entry.value);
            for (let listener of entry.changeListener)
                listener(entry.value);
        }
        group.end();
        log.debug(LogCategory.PERMISSIONS, "Dropping " + copy.length + " needed permissions and added " + addcount + " permissions.");
        for (let e of copy) {
            e.value = -2;
            for (let listener of e.changeListener)
                listener(e.value);
        }
    }
    resolveInfo(key) {
        for (let perm of this.permissionList)
            if (perm.id == key || perm.name == key)
                return perm;
        return undefined;
    }
    neededPermission(key) {
        for (let perm of this.neededPermissions)
            if (perm.type.id == key || perm.type.name == key || perm.type == key)
                return perm;
        log.debug(LogCategory.PERMISSIONS, "Could not resolve grant permission %o. Creating a new one.", key);
        let info = key instanceof PermissionInfo ? key : this.resolveInfo(key);
        if (!info) {
            log.warn(LogCategory.PERMISSIONS, "Requested needed permission with invalid key! (%o)", key);
            return undefined;
        }
        let result = new NeededGrantedPermission(info, -2);
        this.neededPermissions.push(result);
        return result;
    }
}
var GroupType;
(function (GroupType) {
    GroupType[GroupType["QUERY"] = 0] = "QUERY";
    GroupType[GroupType["TEMPLATE"] = 1] = "TEMPLATE";
    GroupType[GroupType["NORMAL"] = 2] = "NORMAL";
})(GroupType || (GroupType = {}));
var GroupTarget;
(function (GroupTarget) {
    GroupTarget[GroupTarget["SERVER"] = 0] = "SERVER";
    GroupTarget[GroupTarget["CHANNEL"] = 1] = "CHANNEL";
})(GroupTarget || (GroupTarget = {}));
class Group {
    constructor(handle, id, target, type, name) {
        this.properties = {
            iconid: 0
        };
        this.requiredModifyPower = 0;
        this.requiredMemberAddPower = 0;
        this.requiredMemberRemovePower = 0;
        this.handle = handle;
        this.id = id;
        this.target = target;
        this.type = type;
        this.name = name;
    }
    updateProperty(key, value) {
        this.properties[key] = value;
        if (key == "iconid") {
            const _this = this;
            console.log("Icon id " + _this.properties.iconid);
            this.handle.handle.channelTree.clientsByGroup(this).forEach(client => {
                client.updateGroupIcon(_this);
            });
        }
    }
}
class GroupManager {
    constructor(client) {
        this.serverGroups = [];
        this.channelGroups = [];
        this.handle = client;
        this.handle.serverConnection.commandHandler["notifyservergrouplist"] = this.onServerGroupList.bind(this);
        this.handle.serverConnection.commandHandler["notifychannelgrouplist"] = this.onServerGroupList.bind(this);
    }
    requestGroups() {
        this.handle.serverConnection.sendCommand("servergrouplist");
        this.handle.serverConnection.sendCommand("channelgrouplist");
    }
    serverGroup(id) {
        for (let group of this.serverGroups)
            if (group.id == id)
                return group;
        return undefined;
    }
    channelGroup(id) {
        for (let group of this.channelGroups)
            if (group.id == id)
                return group;
        return undefined;
    }
    onServerGroupList(json) {
        let target;
        if (json[0]["sgid"])
            target = GroupTarget.SERVER;
        else if (json[0]["cgid"])
            target = GroupTarget.CHANNEL;
        else {
            console.error("Could not resolve group target! => " + json[0]);
            return;
        }
        if (target == GroupTarget.SERVER)
            this.serverGroups = [];
        else
            this.channelGroups = [];
        for (let groupData of json) {
            let type;
            switch (Number.parseInt(groupData["type"])) {
                case 0:
                    type = GroupType.TEMPLATE;
                    break;
                case 1:
                    type = GroupType.NORMAL;
                    break;
                case 2:
                    type = GroupType.QUERY;
                    break;
                default:
                    console.error("Invalid group type: " + groupData["type"] + " for group " + groupData["name"]);
                    continue;
            }
            let group = new Group(this, target == GroupTarget.SERVER ? groupData["sgid"] : groupData["cgid"], target, type, groupData["name"]);
            for (let key in groupData) {
                if (key == "sgid")
                    continue;
                if (key == "cgid")
                    continue;
                if (key == "type")
                    continue;
                if (key == "name")
                    continue;
                group.updateProperty(key, groupData[key]);
            }
            group.requiredMemberRemovePower = groupData["n_member_removep"];
            group.requiredMemberAddPower = groupData["n_member_addp"];
            group.requiredModifyPower = groupData["n_modifyp"];
            if (target == GroupTarget.SERVER)
                this.serverGroups.push(group);
            else
                this.channelGroups.push(group);
        }
        console.log("Got " + json.length + " new " + target + " groups:");
    }
}
if (typeof (customElements) !== "undefined") {
    class X_Tab extends HTMLElement {
    }
    class X_Entry extends HTMLElement {
    }
    class X_Tag extends HTMLElement {
    }
    class X_Content extends HTMLElement {
    }
    customElements.define('x-tab', X_Tab, { extends: 'div' });
    customElements.define('x-entry', X_Entry, { extends: 'div' });
    customElements.define('x-tag', X_Tag, { extends: 'div' });
    customElements.define('x-content', X_Content, { extends: 'div' });
}
else {
    console.warn("Could not defied tab customElements!");
}
var TabFunctions = {
    tabify(template) {
        console.log("Tabify:");
        console.log(template);
        let tag = $.spawn("div");
        tag.addClass("tab");
        let header = $.spawn("div");
        header.addClass("tab-header");
        let content = $.spawn("div");
        content.addClass("tab-content");
        let silentContent = $.spawn("div");
        silentContent.addClass("tab-content-invisible");
        template.find("x-entry").each(function () {
            let hentry = $.spawn("div");
            hentry.addClass("entry");
            hentry.append($(this).find("x-tag").clone(true, true));
            const _this = $(this);
            const _entryContent = _this.find("x-content").clone(true, true);
            silentContent.append(_entryContent);
            hentry.on("click", function () {
                if (hentry.hasClass("selected"))
                    return;
                tag.find(".tab-header .selected").removeClass("selected");
                hentry.addClass("selected");
                content.children().appendTo(silentContent);
                console.log(silentContent);
                content.empty();
                content.append(_entryContent);
                //console.log(_this.find("x-content"));
                //content.append(_this.find("x-content"));
            });
            console.log(this);
            header.append(hentry);
        });
        header.find(".entry").first().trigger("click");
        tag.append(header);
        tag.append(content);
        tag.append(silentContent);
        return tag;
    }
};
if (!$.fn.asTabWidget) {
    $.fn.asTabWidget = function () {
        if ($(this).prop("tagName") == "X-TAB")
            return TabFunctions.tabify($(this));
        else {
            throw "Invalid tag! " + $(this).prop("tagName");
        }
    };
}
if (!$.fn.tabify) {
    $.fn.tabify = function () {
        try {
            let self = this.asTabWidget();
            this.replaceWith(self);
        }
        catch (object) { }
        this.find("x-tab").each(function () {
            $(this).replaceWith($(this).asTabWidget());
        });
        return this;
    };
}
/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />
var Modals;
(function (Modals) {
    function spawnSettingsModal() {
        let modal;
        modal = createModal({
            header: "Settings",
            body: () => {
                let template = $("#tmpl_settings").tmpl();
                template = $.spawn("div").append(template);
                initialiseSettingListeners(modal, template = template.tabify());
                return template;
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin-top", "5px");
                footer.css("margin-bottom", "5px");
                footer.css("text-align", "right");
                let buttonOk = $.spawn("button");
                buttonOk.text("Ok");
                buttonOk.click(() => modal.close());
                footer.append(buttonOk);
                return footer;
            },
            width: 750
        });
        modal.open();
    }
    Modals.spawnSettingsModal = spawnSettingsModal;
    function initialiseSettingListeners(modal, tag) {
        //Voice
        initialiseVoiceListeners(modal, tag.find(".settings_voice"));
    }
    function initialiseVoiceListeners(modal, tag) {
        let currentVAD = settings.global("vad_type");
        tag.find("input[type=radio][name=\"vad_type\"]").change(function () {
            tag.find(".vad_settings .vad_type").text($(this).attr("display"));
            tag.find(".vad_settings .vad_type_settings").hide();
            tag.find(".vad_settings .vad_type_" + this.value).show();
            settings.changeGlobal("vad_type", this.value);
            globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();
            switch (this.value) {
                case "ppt":
                    let keyCode = parseInt(settings.global("vad_ppt_key", 84 /* T */.toString()));
                    tag.find(".vat_ppt_key").text(String.fromCharCode(keyCode));
                    break;
                case "vad":
                    let slider = tag.find(".vad_vad_slider");
                    let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
                    slider.val(vad.percentageThreshold);
                    slider.trigger("change");
                    globalClient.voiceConnection.voiceRecorder.update(true);
                    vad.percentage_listener = per => {
                        tag.find(".vad_vad_bar_filler")
                            .css("width", per + "%");
                    };
                    break;
            }
        });
        if (!currentVAD)
            currentVAD = "ppt";
        let elm = tag.find("input[type=radio][name=\"vad_type\"][value=\"" + currentVAD + "\"]");
        elm.attr("checked", "true");
        tag.find(".vat_ppt_key").click(function () {
            let modal = createModal({
                body: "",
                header: () => {
                    let head = $.spawn("div");
                    head.text("Type the key you wish");
                    head.css("background-color", "blue");
                    return head;
                },
                footer: ""
            });
            $(document).one("keypress", function (e) {
                console.log("Got key " + e.keyCode);
                modal.close();
                settings.changeGlobal("vad_ppt_key", e.keyCode.toString());
                globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();
                tag.find(".vat_ppt_key").text(String.fromCharCode(e.keyCode));
            });
            modal.open();
        });
        //VAD VAD
        let slider = tag.find(".vad_vad_slider");
        slider.on("input change", () => {
            settings.changeGlobal("vad_threshold", slider.val().toString());
            let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
            if (vad instanceof VoiceActivityDetectorVAD)
                vad.percentageThreshold = slider.val();
            tag.find(".vad_vad_slider_value").text(slider.val().toString());
        });
        modal.properties.registerCloseListener(() => {
            let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
            if (vad instanceof VoiceActivityDetectorVAD)
                vad.percentage_listener = undefined;
        });
        //Trigger radio button select for VAD setting setup
        elm.trigger("change");
        //Initialise microphones
        console.log(tag);
        let mselect = tag.find(".voice_microphone_select");
        console.log(mselect);
        let mselectError = tag.find(".voice_microphone_select_error");
        navigator.mediaDevices.enumerateDevices().then(devices => {
            let currentStream = globalClient.voiceConnection.voiceRecorder.getMediaStream();
            let currentDeviceId;
            if (currentStream) {
                let audio = currentStream.getAudioTracks()[0];
                currentDeviceId = audio.getSettings().deviceId;
            }
            console.log("Got " + devices.length + " devices:");
            for (let device of devices) {
                console.log(device);
                if (device.kind == "audioinput") {
                    let dtag = $.spawn("option");
                    dtag.attr("device-id", device.deviceId);
                    dtag.attr("device-group", device.groupId);
                    dtag.text(device.label);
                    mselect.append(dtag);
                    if (currentDeviceId && device.deviceId == currentDeviceId)
                        mselect.attr("selected", "");
                }
            }
        }).catch(error => {
            console.error("Could not enumerate over devices!");
            console.error(error);
            mselectError.text("Could not get device list!").show();
        });
        mselect.change(event => {
            let deviceSelected = mselect.find("option:selected");
            let deviceId = deviceSelected.attr("device-id");
            console.log("Selected device: " + deviceId);
            globalClient.voiceConnection.voiceRecorder.changeDevice(deviceId);
        });
    }
})(Modals || (Modals = {}));
/// <reference path="../client.ts" />
/// <reference path="modal/ModalSettings.ts" />
/*
        client_output_hardware Value: '1'
        client_output_muted Value: '0'
        client_outputonly_muted Value: '0'

        client_input_hardware Value: '1'
        client_input_muted Value: '0'

        client_away Value: '0'
        client_away_message Value: ''
 */
class ControlBar {
    constructor(handle, htmlTag) {
        this.handle = handle;
        this.htmlTag = htmlTag;
    }
    initialise() {
        this.htmlTag.find(".btn_connect").click(this.onConnect.bind(this));
        this.htmlTag.find(".btn_client_away").click(this.onAway.bind(this));
        this.htmlTag.find(".btn_mute_input").click(this.onInputMute.bind(this));
        this.htmlTag.find(".btn_mute_output").click(this.onOutputMute.bind(this));
        this.htmlTag.find(".btn_open_settings").click(this.onOpenSettings.bind(this));
        //Need an initialise
        this.muteInput = settings.global("mute_input") == "1";
        this.muteOutput = settings.global("mute_output") == "1";
    }
    onAway() {
        this.away = !this._away;
    }
    onInputMute() {
        this.muteInput = !this._muteInput;
    }
    onOutputMute() {
        this.muteOutput = !this._muteOutput;
    }
    set muteInput(flag) {
        if (this._muteInput == flag)
            return;
        this._muteInput = flag;
        let tag = this.htmlTag.find(".btn_mute_input");
        if (flag) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-input_muted");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-capture");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput
            });
        settings.changeGlobal("mute_input", this._muteInput);
        this.updateMicrophoneRecordState();
    }
    get muteOutput() { return this._muteOutput; }
    set muteOutput(flag) {
        if (this._muteOutput == flag)
            return;
        this._muteOutput = flag;
        let tag = this.htmlTag.find(".btn_mute_output");
        if (flag) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-output_muted");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-volume");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_output_muted: this._muteOutput
            });
        settings.changeGlobal("mute_output", this._muteOutput);
        this.updateMicrophoneRecordState();
    }
    set away(value) {
        if (typeof (value) == "boolean") {
            if (this._away == value)
                return;
            this._away = value;
            this._awayMessage = "";
        }
        else {
            this._awayMessage = value;
            this._away = true;
        }
        let tag = this.htmlTag.find(".btn_client_away");
        if (this._away) {
            if (!tag.hasClass("activated"))
                tag.addClass("activated");
        }
        else {
            if (tag.hasClass("activated"))
                tag.removeClass("activated");
        }
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_away: this._away,
                client_away_message: this._awayMessage
            });
        this.updateMicrophoneRecordState();
    }
    updateMicrophoneRecordState() {
        let enabled = !this._muteInput && !this._muteOutput && !this._away;
        this.handle.voiceConnection.voiceRecorder.update(enabled);
    }
    updateProperties() {
        if (this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput,
                client_output_muted: this._muteOutput,
                client_away: this._away,
                client_away_message: this._awayMessage,
            });
    }
    onOpenSettings() {
        Modals.spawnSettingsModal();
    }
    onConnect() {
        Modals.spawnConnectModal(settings.static("connect_default_host", "ts.TeaSpeak.de"));
    }
}
/// <reference path="voice/AudioController.ts" />
/// <reference path="proto.ts" />
/// <reference path="ui/view.ts" />
/// <reference path="connection.ts" />
/// <reference path="settings.ts" />
/// <reference path="InfoBar.ts" />
/// <reference path="FileManager.ts" />
/// <reference path="permission/PermissionManager.ts" />
/// <reference path="permission/GroupManager.ts" />
/// <reference path="ui/ControlBar.ts" />
var DisconnectReason;
(function (DisconnectReason) {
    DisconnectReason[DisconnectReason["REQUESTED"] = 0] = "REQUESTED";
    DisconnectReason[DisconnectReason["CONNECT_FAILURE"] = 1] = "CONNECT_FAILURE";
    DisconnectReason[DisconnectReason["CONNECTION_CLOSED"] = 2] = "CONNECTION_CLOSED";
    DisconnectReason[DisconnectReason["CONNECTION_FATAL_ERROR"] = 3] = "CONNECTION_FATAL_ERROR";
    DisconnectReason[DisconnectReason["CONNECTION_PING_TIMEOUT"] = 4] = "CONNECTION_PING_TIMEOUT";
    DisconnectReason[DisconnectReason["CLIENT_KICKED"] = 5] = "CLIENT_KICKED";
    DisconnectReason[DisconnectReason["CLIENT_BANNED"] = 6] = "CLIENT_BANNED";
    DisconnectReason[DisconnectReason["SERVER_CLOSED"] = 7] = "SERVER_CLOSED";
    DisconnectReason[DisconnectReason["UNKNOWN"] = 8] = "UNKNOWN";
})(DisconnectReason || (DisconnectReason = {}));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["UNCONNECTED"] = 0] = "UNCONNECTED";
    ConnectionState[ConnectionState["CONNECTING"] = 1] = "CONNECTING";
    ConnectionState[ConnectionState["INITIALISING"] = 2] = "INITIALISING";
    ConnectionState[ConnectionState["CONNECTED"] = 3] = "CONNECTED";
    ConnectionState[ConnectionState["DISCONNECTING"] = 4] = "DISCONNECTING";
})(ConnectionState || (ConnectionState = {}));
var ViewReasonId;
(function (ViewReasonId) {
    ViewReasonId[ViewReasonId["VREASON_USER_ACTION"] = 0] = "VREASON_USER_ACTION";
    ViewReasonId[ViewReasonId["VREASON_MOVED"] = 1] = "VREASON_MOVED";
    ViewReasonId[ViewReasonId["VREASON_SYSTEM"] = 2] = "VREASON_SYSTEM";
    ViewReasonId[ViewReasonId["VREASON_TIMEOUT"] = 3] = "VREASON_TIMEOUT";
    ViewReasonId[ViewReasonId["VREASON_CHANNEL_KICK"] = 4] = "VREASON_CHANNEL_KICK";
    ViewReasonId[ViewReasonId["VREASON_SERVER_KICK"] = 5] = "VREASON_SERVER_KICK";
    ViewReasonId[ViewReasonId["VREASON_BAN"] = 6] = "VREASON_BAN";
    ViewReasonId[ViewReasonId["VREASON_SERVER_STOPPED"] = 7] = "VREASON_SERVER_STOPPED";
    ViewReasonId[ViewReasonId["VREASON_SERVER_LEFT"] = 8] = "VREASON_SERVER_LEFT";
    ViewReasonId[ViewReasonId["VREASON_CHANNEL_UPDATED"] = 9] = "VREASON_CHANNEL_UPDATED";
    ViewReasonId[ViewReasonId["VREASON_EDITED"] = 10] = "VREASON_EDITED";
    ViewReasonId[ViewReasonId["VREASON_SERVER_SHUTDOWN"] = 11] = "VREASON_SERVER_SHUTDOWN";
})(ViewReasonId || (ViewReasonId = {}));
class TSClient {
    constructor() {
        this._clientId = 0;
        this.selectInfo = new InfoBar(this, $("#select_info"));
        this.channelTree = new ChannelTree(this, $("#channelTree"));
        this.serverConnection = new ServerConnection(this);
        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);
        this.groups = new GroupManager(this);
        this.voiceConnection = new VoiceConnection(this);
        this._ownEntry = new LocalClientEntry(this);
        this.controlBar = new ControlBar(this, $("#control_bar"));
        this.channelTree.registerClient(this._ownEntry);
    }
    setup() {
        this.controlBar.initialise();
    }
    startConnection(addr, identity, name) {
        if (this.serverConnection)
            this.handleDisconnect(DisconnectReason.REQUESTED);
        let idx = addr.lastIndexOf(':');
        let port;
        let host;
        if (idx != -1) {
            port = parseInt(addr.substr(idx + 1));
            host = addr.substr(0, idx);
        }
        else {
            host = addr;
            port = 9987;
        }
        console.log("Start connection to " + host + ":" + port);
        this.channelTree.initialiseHead(addr);
        this.serverConnection.startConnection(host, port, new HandshakeHandler(identity, name));
    }
    getClient() { return this._ownEntry; }
    getClientId() { return this._clientId; } //TODO here
    set clientId(id) {
        this._clientId = id;
        this._ownEntry["_clientId"] = id;
    }
    get clientId() {
        return this._clientId;
    }
    getServerConnection() { return this.serverConnection; }
    /**
     * LISTENER
     */
    onConnected() {
        console.log("Client connected!");
        this.channelTree.registerClient(this._ownEntry);
        settings.setServer(this.channelTree.server);
        this.permissions.requestPermissionList();
        this.serverConnection.sendCommand("channelsubscribeall");
        if (this.groups.serverGroups.length == 0)
            this.groups.requestGroups();
        this.controlBar.updateProperties();
    }
    get connected() {
        return !!this.serverConnection && this.serverConnection.connected;
    }
    handleDisconnect(type, data = {}) {
        switch (type) {
            case DisconnectReason.REQUESTED:
                break;
            case DisconnectReason.CONNECT_FAILURE:
                console.error("Could not connect to remote host! Exception");
                console.error(data);
                //TODO test for status 1006
                createErrorModal("Could not connect", "Could not connect to remote host (Connection refused)<br>" +
                    "If you're shure that the remot host is up, than you may not allow unsigned certificates.<br>" +
                    "Click <a href='https://" + this.serverConnection._remoteHost + ":" + this.serverConnection._remotePort + "'>here</a> to accept the remote certificate").open();
                break;
            case DisconnectReason.CONNECTION_CLOSED:
                console.error("Lost connection to remote server!");
                createErrorModal("Connection closed", "The connection was closed by remote host").open();
                break;
            case DisconnectReason.CONNECTION_PING_TIMEOUT:
                console.error("Connection ping timeout");
                createErrorModal("Connection lost", "Lost connection to remote host (Ping timeout)<br>Even possible?").open();
                break;
            case DisconnectReason.SERVER_CLOSED:
                chat.serverChat().appendError("Server closed ({0})", data.reasonmsg);
                createErrorModal("Server closed", "The server is closed.<br>" +
                    "Reason: " + data.reasonmsg).open();
                break;
            default:
                console.error("Got uncaught disconnect!");
                console.error("Type: " + type + " Data:");
                console.error(data);
                break;
        }
        this.selectInfo.currentSelected = null;
        this.channelTree.reset();
        this.voiceConnection.dropSession();
        if (this.serverConnection)
            this.serverConnection.disconnect();
    }
}
/// <reference path="client.ts" />
class FileEntry {
}
class FileListRequest {
}
class DownloadFileTransfer {
    constructor(handle, id) {
        this.currentSize = 0;
        this.on_start = () => { };
        this.on_complete = () => { };
        this.on_fail = (_) => { };
        this.on_data = (_) => { };
        this.transferId = id;
        this._handle = handle;
    }
    startTransfer() {
        if (!this.remoteHost || !this.remotePort || !this.transferKey || !this.totalSize) {
            this.on_fail("Missing data!");
            return;
        }
        console.debug("Create new file download to " + this.remoteHost + ":" + this.remotePort + " (Key: " + this.transferKey + ", Expect " + this.totalSize + " bytes)");
        this._active = true;
        this._socket = new WebSocket("wss://" + this.remoteHost + ":" + this.remotePort);
        this._socket.onopen = this.onOpen.bind(this);
        this._socket.onclose = this.onClose.bind(this);
        this._socket.onmessage = this.onMessage.bind(this);
        this._socket.onerror = this.onError.bind(this);
    }
    onOpen() {
        if (!this._active)
            return;
        this._socket.send(this.transferKey);
        this.on_start();
    }
    onMessage(data) {
        if (!this._active) {
            console.error("Got data, but socket closed?");
            return;
        }
        this._parseActive = true;
        let fileReader = new FileReader();
        fileReader.onload = (event) => {
            this.onBinaryData(new Uint8Array(event.target.result));
            //if(this._socket.readyState != WebSocket.OPEN && !this._succeed) this.on_fail("unexpected close");
            this._parseActive = false;
        };
        fileReader.readAsArrayBuffer(data.data);
    }
    onBinaryData(data) {
        this.currentSize += data.length;
        this.on_data(data);
        if (this.currentSize == this.totalSize) {
            this._succeed = true;
            this.on_complete();
            this.disconnect();
        }
    }
    onError() {
        if (!this._active)
            return;
        this.on_fail("an error occurent");
        this.disconnect();
    }
    onClose() {
        if (!this._active)
            return;
        if (!this._parseActive)
            this.on_fail("unexpected close (remote closed)");
        this.disconnect();
    }
    disconnect() {
        this._active = false;
        //this._socket.close();
    }
}
class FileManager {
    constructor(client) {
        this.listRequests = [];
        this.pendingDownloadTransfers = [];
        this.downloadCounter = 0;
        this.handle = client;
        this.icons = new IconManager(this);
        this.avatars = new AvatarManager(this);
        this.handle.serverConnection.commandHandler["notifyfilelist"] = this.notifyFileList.bind(this);
        this.handle.serverConnection.commandHandler["notifyfilelistfinished"] = this.notifyFileListFinished.bind(this);
        this.handle.serverConnection.commandHandler["notifystartdownload"] = this.notifyStartDownload.bind(this);
    }
    /******************************** File list ********************************/
    //TODO multiple requests (same path)
    requestFileList(path, channel, password) {
        const _this = this;
        return new Promise((accept, reject) => {
            let req = new FileListRequest();
            req.path = path;
            req.entries = [];
            req.callback = accept;
            _this.listRequests.push(req);
            _this.handle.serverConnection.sendCommand("ftgetfilelist", { "path": path, "cid": (channel ? channel.channelId : "0"), "cpw": (password ? password : "") }).then(() => { }).catch(reason => {
                _this.listRequests.remove(req);
                if (reason instanceof CommandResult) {
                    if (reason.id == 0x0501) {
                        accept([]); //Empty result
                        return;
                    }
                }
                reject(reason);
            });
        });
    }
    notifyFileList(json) {
        let entry = undefined;
        for (let e of this.listRequests) {
            if (e.path == json[0]["path"]) {
                entry = e;
                break;
            }
        }
        if (!entry) {
            console.error("Invalid file list entry. Path: " + json[0]["path"]);
            return;
        }
        for (let e of json)
            entry.entries.push(e);
    }
    notifyFileListFinished(json) {
        let entry = undefined;
        for (let e of this.listRequests) {
            if (e.path == json[0]["path"]) {
                entry = e;
                this.listRequests.remove(e);
                break;
            }
        }
        if (!entry) {
            console.error("Invalid file list entry finish. Path: " + json[0]["path"]);
            return;
        }
        entry.callback(entry.entries);
    }
    /******************************** File download ********************************/
    requestFileDownload(path, file, channel, password) {
        const _this = this;
        let transfer = new DownloadFileTransfer(this, this.downloadCounter++);
        this.pendingDownloadTransfers.push(transfer);
        return new Promise((resolve, reject) => {
            transfer["_promiseCallback"] = resolve;
            _this.handle.serverConnection.sendCommand("ftinitdownload", {
                "path": path,
                "name": file,
                "cid": (channel ? channel.channelId : "0"),
                "cpw": (password ? password : ""),
                "clientftfid": transfer.transferId
            }).catch(reason => {
                _this.pendingDownloadTransfers.remove(transfer);
                reject(reason);
            });
        });
    }
    notifyStartDownload(json) {
        json = json[0];
        let transfer;
        for (let e of this.pendingDownloadTransfers)
            if (e.transferId == json["clientftfid"]) {
                transfer = e;
                break;
            }
        transfer.serverTransferId = json["serverftfid"];
        transfer.transferKey = json["ftkey"];
        transfer.totalSize = json["size"];
        transfer.remotePort = json["port"];
        transfer.remoteHost = json["ip"].replace(/,/g, "");
        if (transfer.remoteHost == '0.0.0.0' || transfer.remoteHost == '127.168.0.0')
            transfer.remoteHost = this.handle.serverConnection._remoteHost;
        transfer["_promiseCallback"](transfer);
        this.pendingDownloadTransfers.remove(transfer);
    }
}
class Icon {
}
class IconManager {
    constructor(handle) {
        this.handle = handle;
    }
    iconList() {
        return this.handle.requestFileList("/icons");
    }
    downloadIcon(id) {
        return this.handle.requestFileDownload("", "/icon_" + id);
    }
    resolveCached(id) {
        let icon = localStorage.getItem("icon_" + id);
        if (icon) {
            let i = JSON.parse(icon);
            if (i.base64.length > 0) { //TODO timestamp?
                return i;
            }
        }
        return undefined;
    }
    loadIcon(id) {
        const _this = this;
        return new Promise((resolve, reject) => {
            let icon = this.resolveCached(id);
            if (icon) {
                resolve(icon);
                return;
            }
            _this.downloadIcon(id).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    console.error("Could not download icon " + id + " -> " + reason);
                    chat.serverChat().appendError("Fail to download icon {0}. ({1})", id, JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => { };
                ft.on_data = (data) => {
                    array = concatenate(Uint8Array, array, data);
                };
                ft.on_complete = () => {
                    let base64 = btoa(String.fromCharCode.apply(null, array));
                    let icon = new Icon();
                    icon.base64 = base64;
                    icon.id = id;
                    icon.name = "icon_" + id;
                    localStorage.setItem("icon_" + id, JSON.stringify(icon));
                    resolve(icon);
                };
                ft.startTransfer();
            }).catch(reason => {
                console.error("Error while downloading icon! (" + JSON.stringify(reason) + ")");
                chat.serverChat().appendError("Failed to request download for icon {0}. ({1})", id, JSON.stringify(reason));
                reject(reason);
            });
        });
    }
    //$("<img width=\"16\" height=\"16\" alt=\"tick\" src=\"data:image/png;base64," + value.base64 + "\">")
    generateTag(id) {
        if (id == 0)
            return $("<div class='icon_empty'></div>");
        else if (id < 1000)
            return $("<div class='icon client-group_" + id + "'></div>");
        let tag = $.spawn("div");
        tag.addClass("icon_empty");
        let img = $.spawn("img");
        img.attr("width", 16).attr("height", 16).attr("alt", "");
        let icon = this.resolveCached(id);
        if (icon) {
            img.attr("src", "data:image/png;base64," + icon.base64);
            tag.append(img);
        }
        else {
            img.attr("src", "file://null");
            let loader = $.spawn("div");
            loader.addClass("icon_loading");
            tag.append(loader);
            this.loadIcon(id).then(icon => {
                img.attr("src", "data:image/png;base64," + icon.base64);
                console.debug("Icon " + id + " loaded :)");
                img.css("opacity", 0);
                tag.append(img);
                loader.animate({ opacity: 0 }, 50, function () {
                    $(this).detach();
                    img.animate({ opacity: 1 }, 150);
                });
            }).catch(reason => {
                console.error("Could not load icon " + id + ". Reason: " + reason);
                loader.removeClass("icon_loading").addClass("icon client-warning").attr("tag", "Could not load icon " + id);
            });
        }
        return tag;
    }
}
class Avatar {
}
class AvatarManager {
    constructor(handle) {
        this.handle = handle;
    }
    downloadAvatar(client) {
        return this.handle.requestFileDownload("", "/avatar_" + client.avatarId());
    }
    resolveCached(client) {
        let avatar = localStorage.getItem("avatar_" + client.properties.client_unique_identifier);
        if (avatar) {
            let i = JSON.parse(avatar);
            if (i.base64.length > 0 && i.avatarId == client.properties.client_flag_avatar) { //TODO timestamp?
                return i;
            }
        }
        return undefined;
    }
    loadAvatar(client) {
        const _this = this;
        return new Promise((resolve, reject) => {
            let avatar = this.resolveCached(client);
            if (avatar) {
                resolve(avatar);
                return;
            }
            _this.downloadAvatar(client).then(ft => {
                let array = new Uint8Array(0);
                ft.on_fail = reason => {
                    console.error("Could not download avatar " + client.properties.client_flag_avatar + " -> " + reason);
                    chat.serverChat().appendError("Fail to download avatar for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                    reject(reason);
                };
                ft.on_start = () => { };
                ft.on_data = (data) => {
                    array = concatenate(Uint8Array, array, data);
                };
                ft.on_complete = () => {
                    let base64 = btoa(String.fromCharCode.apply(null, array));
                    let avatar = new Avatar();
                    avatar.base64 = base64;
                    avatar.clientUid = client.clientUid();
                    avatar.avatarId = client.properties.client_flag_avatar;
                    localStorage.setItem("avatar_" + client.properties.client_unique_identifier, JSON.stringify(avatar));
                    resolve(avatar);
                };
                ft.startTransfer();
            }).catch(reason => {
                console.error("Error while downloading avatar! (" + JSON.stringify(reason) + ")");
                chat.serverChat().appendError("Failed to request avatar download for {0}. ({1})", client.clientNickName(), JSON.stringify(reason));
                reject(reason);
            });
        });
    }
    generateTag(client) {
        let tag = $.spawn("div");
        let img = $.spawn("img");
        img.attr("alt", "");
        let avatar = this.resolveCached(client);
        if (avatar) {
            img.attr("src", "data:image/png;base64," + avatar.base64);
            tag.append(img);
        }
        else {
            img.attr("src", "file://null");
            let loader = $.spawn("div");
            loader.addClass("avatar_loading");
            tag.append(loader);
            this.loadAvatar(client).then(avatar => {
                img.attr("src", "data:image/png;base64," + avatar.base64);
                console.debug("Avatar " + client.clientNickName() + " loaded :)");
                img.css("opacity", 0);
                tag.append(img);
                loader.animate({ opacity: 0 }, 50, function () {
                    $(this).detach();
                    img.animate({ opacity: 1 }, 150);
                });
            }).catch(reason => {
                console.error("Could not load avatar for " + client.clientNickName() + ". Reason: " + reason);
                //TODO Broken image
                loader.removeClass("avatar_loading").addClass("icon client-warning").attr("tag", "Could not load avatar " + client.clientNickName());
            });
        }
        return tag;
    }
}
var IdentitifyType;
(function (IdentitifyType) {
    IdentitifyType[IdentitifyType["TEAFORO"] = 0] = "TEAFORO";
    IdentitifyType[IdentitifyType["TEAMSPEAK"] = 1] = "TEAMSPEAK";
})(IdentitifyType || (IdentitifyType = {}));
var TSIdentityHelper;
(function (TSIdentityHelper) {
    var Pointer_stringify = Module.Pointer_stringify;
    let functionLastError;
    let functionClearLastError;
    let functionDestroyString;
    let functionDestroyIdentity;
    function setup() {
        functionDestroyString = Module.cwrap("destroy_string", "pointer", []);
        functionLastError = Module.cwrap("last_error_message", null, ["string"]);
        TSIdentityHelper.funcationParseIdentity = Module.cwrap("parse_identity", "pointer", ["string"]);
        TSIdentityHelper.funcationParseIdentityByFile = Module.cwrap("parse_identity_file", "pointer", ["string"]);
        functionDestroyIdentity = Module.cwrap("delete_identity", null, ["pointer"]);
        TSIdentityHelper.funcationCalculateSecurityLevel = Module.cwrap("identity_security_level", "pointer", ["pointer"]);
        TSIdentityHelper.funcationExportIdentity = Module.cwrap("identity_export", "pointer", ["pointer"]);
        TSIdentityHelper.funcationPublicKey = Module.cwrap("identity_key_public", "pointer", ["pointer"]);
        TSIdentityHelper.funcationSignMessage = Module.cwrap("identity_sign", "pointer", ["pointer", "string", "number"]);
        TSIdentityHelper.functionUid = Module.cwrap("identity_uid", "pointer", ["pointer"]);
        return Module.cwrap("tomcrypt_initialize", "number", [])() == 0;
    }
    TSIdentityHelper.setup = setup;
    function last_error() {
        return unwarpString(functionLastError());
    }
    TSIdentityHelper.last_error = last_error;
    function unwarpString(str) {
        if (str == "")
            return "";
        let message = Pointer_stringify(str);
        functionDestroyString(str);
        return message;
    }
    TSIdentityHelper.unwarpString = unwarpString;
    function loadIdentity(key) {
        let handle = TSIdentityHelper.funcationParseIdentity(key);
        if (!handle)
            return undefined;
        return new TeamSpeakIdentity(handle, "TeaWeb user");
    }
    TSIdentityHelper.loadIdentity = loadIdentity;
    function loadIdentityFromFileContains(contains) {
        let handle = TSIdentityHelper.funcationParseIdentityByFile(contains);
        if (!handle)
            return undefined;
        return new TeamSpeakIdentity(handle, "TeaWeb user");
    }
    TSIdentityHelper.loadIdentityFromFileContains = loadIdentityFromFileContains;
})(TSIdentityHelper || (TSIdentityHelper = {}));
class TeamSpeakIdentity {
    constructor(handle, name) {
        this.handle = handle;
        this._name = name;
    }
    securityLevel() {
        return parseInt(TSIdentityHelper.unwarpString(TSIdentityHelper.funcationCalculateSecurityLevel(this.handle)));
    }
    name() { return this._name; }
    uid() {
        return TSIdentityHelper.unwarpString(TSIdentityHelper.functionUid(this.handle));
    }
    type() { return IdentitifyType.TEAMSPEAK; }
    signMessage(message) {
        return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationSignMessage(this.handle, message, message.length));
    }
    exported() {
        return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationExportIdentity(this.handle));
    }
    publicKey() {
        return TSIdentityHelper.unwarpString(TSIdentityHelper.funcationPublicKey(this.handle));
    }
}
class TeaForumIdentity {
    constructor(data, sign) {
        this.identityDataJson = data;
        this.identityData = JSON.parse(this.identityDataJson);
        this.identitySign = sign;
    }
    name() { return this.identityData["user_name"]; }
    uid() { return "TeaForo#" + this.identityData["user_id"]; }
    type() { return IdentitifyType.TEAFORO; }
}
var ChatType;
(function (ChatType) {
    ChatType[ChatType["GENERAL"] = 0] = "GENERAL";
    ChatType[ChatType["SERVER"] = 1] = "SERVER";
    ChatType[ChatType["CHANNEL"] = 2] = "CHANNEL";
    ChatType[ChatType["CLIENT"] = 3] = "CLIENT";
})(ChatType || (ChatType = {}));
class ChatMessage {
    constructor(message) {
        this.date = new Date();
        this.message = message;
    }
    num(num) {
        let str = num.toString();
        while (str.length < 2)
            str = '0' + str;
        return str;
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
        let tag = $.spawn("div");
        tag.addClass("message");
        let dateTag = $.spawn("div");
        dateTag.text("<" + this.num(this.date.getUTCHours()) + ":" + this.num(this.date.getUTCMinutes()) + ":" + this.num(this.date.getUTCSeconds()) + "> ");
        dateTag.css("margin-right", "4px");
        dateTag.css("color", "dodgerblue");
        let messageTag = $.spawn("div");
        messageTag.html(this.message);
        messageTag.css("color", "blue");
        this._htmlTag = tag;
        tag.append(dateTag);
        tag.append(messageTag);
        tag.hide();
        return tag;
    }
    static formatMessage(message) {
        /*
        message = message
                    .replace(/ /g, '&nbsp;')
                    .replace(/\n/g, "<br/>");
        */
        const div = document.createElement('div');
        div.innerText = message;
        message = div.innerHTML;
        console.log(message + "->" + div.innerHTML);
        return message;
    }
}
class ChatEntry {
    constructor(handle, type, key) {
        this.handle = handle;
        this.type = type;
        this.key = key;
        this._name = key;
        this.history = [];
        this.onClose = function () { return true; };
    }
    appendError(message, ...args) {
        this.appendMessage("<a style='color: red'>{0}</a>".format(ChatMessage.formatMessage(message).format(...args)), false);
    }
    appendMessage(message, fmt = true, ...args) {
        let parms = [];
        for (let index = 2; index < arguments.length; index++) {
            if (typeof arguments[index] == "string")
                arguments[index] = ChatMessage.formatMessage(arguments[index]);
            else if (arguments[index] instanceof jQuery)
                arguments[index] = arguments[index].html();
            else {
                console.error("Invalid type " + typeof arguments[index] + "|" + arguments[index].prototype);
                arguments[index] = arguments[index].toString();
            }
            parms.push(arguments[index]);
        }
        let msg = fmt ? ChatMessage.formatMessage(message) : message;
        msg = msg.format(parms);
        let elm = new ChatMessage(msg);
        this.history.push(elm);
        while (this.history.length > 100) {
            let elm = this.history.pop_front();
            elm.htmlTag.animate({ opacity: 0 }, 200, function () {
                $(this).detach();
            });
        }
        if (this.handle.activeChat === this) {
            let box = $(this.handle.htmlTag).find(".messages");
            let mbox = $(this.handle.htmlTag).find(".message_box");
            let bottom = box.scrollTop() + box.height() + 1 >= mbox.height();
            mbox.append(elm.htmlTag);
            elm.htmlTag.show().css("opacity", "0").animate({ opacity: 1 }, 100);
            if (bottom)
                box.scrollTop(mbox.height());
        }
        else {
            this.unread = true;
        }
    }
    displayHistory() {
        this.unread = false;
        let box = $(this.handle.htmlTag).find(".messages");
        let mbox = $(this.handle.htmlTag).find(".message_box");
        mbox.empty();
        for (let e of this.history) {
            mbox.append(e.htmlTag);
            if (e.htmlTag.is(":hidden"))
                e.htmlTag.show();
        }
        box.scrollTop(mbox.height());
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
        let tag = $.spawn("div");
        tag.addClass("chat");
        tag.append("<div class=\"chatIcon icon clicon " + this.chatIcon() + "\"></div>");
        tag.append("<a class='name'>" + this._name + "</a>");
        let closeTag = $.spawn("div");
        closeTag.addClass("btn_close icon client-tab_close_button");
        if (!this._closeable)
            closeTag.hide();
        tag.append(closeTag);
        const _this = this;
        tag.click(function () {
            _this.handle.activeChat = _this;
        });
        tag.on("contextmenu", function (e) {
            e.preventDefault();
            let actions = [];
            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "",
                name: "Clear",
                callback: () => {
                    _this.history = [];
                    _this.displayHistory();
                }
            });
            if (_this.closeable) {
                actions.push({
                    type: MenuEntryType.ENTRY,
                    icon: "client-tab_close_button",
                    name: "Close",
                    callback: () => {
                        chat.deleteChat(_this);
                    }
                });
            }
            actions.push({
                type: MenuEntryType.ENTRY,
                icon: "client-tab_close_button",
                name: "Close all private tabs",
                callback: () => {
                    //TODO Implement this?
                }
            });
            spawnMenu(e.pageX, e.pageY, ...actions);
        });
        closeTag.click(function () {
            if ($.isFunction(_this.onClose) && !_this.onClose())
                return;
            _this.handle.deleteChat(_this);
        });
        this._htmlTag = tag;
        return tag;
    }
    set name(newName) {
        console.log("Change name!");
        this._name = newName;
        this.htmlTag.find(".name").text(this._name);
    }
    set closeable(flag) {
        if (this._closeable == flag)
            return;
        this._closeable = flag;
        console.log("Set closeable: " + this._closeable);
        if (flag)
            this.htmlTag.find(".btn_close").show();
        else
            this.htmlTag.find(".btn_close").hide();
    }
    set unread(flag) {
        if (this._unread == flag)
            return;
        this._unread = flag;
        this.htmlTag.find(".chatIcon").attr("class", "chatIcon icon clicon " + this.chatIcon());
        if (flag) {
            this.htmlTag.find(".name").css("color", "blue");
        }
        else {
            this.htmlTag.find(".name").css("color", "black");
        }
    }
    chatIcon() {
        if (this._unread) {
            switch (this.type) {
                case ChatType.CLIENT:
                    return "client-new_chat";
            }
        }
        switch (this.type) {
            case ChatType.SERVER:
                return "client-server_log";
            case ChatType.CHANNEL:
                return "client-channel_chat";
            case ChatType.CLIENT:
                return "client-player_chat";
            case ChatType.GENERAL:
                return "client-channel_chat";
        }
        return "";
    }
}
class ChatBox {
    constructor(htmlTag) {
        this.htmlTag = htmlTag;
        this.htmlTag.find(".input button").click(this.onSend.bind(this));
        this.htmlTag.find(".input_box").keypress(event => {
            if (event.keyCode == 13 /* Enter */ && !event.shiftKey) {
                this.onSend();
                return false;
            }
        }).on('input', (event) => {
            let text = $(event.target).val().toString();
            if (this.testMessage(text))
                this.htmlTag.find(".input button").removeAttr("disabled");
            else
                this.htmlTag.find(".input button").attr("disabled", "true");
        }).trigger("input");
        this.chats = [];
        this._activeChat = undefined;
        this.createChat("chat_server", ChatType.SERVER).onMessageSend = (text) => {
            if (!globalClient.serverConnection) {
                chat.serverChat().appendError("Could not send chant message (Not connected)");
                return;
            }
            globalClient.serverConnection.sendMessage(text, ChatType.SERVER);
        };
        this.createChat("chat_channel", ChatType.CHANNEL).onMessageSend = (text) => {
            if (!globalClient.serverConnection) {
                chat.channelChat().appendError("Could not send chant message (Not connected)");
                return;
            }
            globalClient.serverConnection.sendMessage(text, ChatType.CHANNEL, globalClient.getClient().currentChannel());
        };
        globalClient.permissions.initializedListener.push(flag => {
            if (flag)
                this.activeChat0(this._activeChat);
        });
    }
    createChat(key, type = ChatType.CLIENT) {
        let chat = new ChatEntry(this, type, key);
        this.chats.push(chat);
        this.htmlTag.find(".chats").append(chat.htmlTag);
        if (!this._activeChat)
            this.activeChat = chat;
        return chat;
    }
    findChat(key) {
        for (let e of this.chats)
            if (e.key == key)
                return e;
        return undefined;
    }
    deleteChat(chat) {
        this.chats.remove(chat);
        chat.htmlTag.detach();
        if (this._activeChat === chat) {
            if (this.chats.length > 0)
                this.activeChat = this.chats.last();
            else
                this.activeChat = undefined;
        }
    }
    onSend() {
        let textBox = $(this.htmlTag).find(".input_box");
        let text = textBox.val().toString();
        if (!this.testMessage(text))
            return;
        textBox.val("");
        $(this.htmlTag).find(".input_box").trigger("input");
        if (this._activeChat && $.isFunction(this._activeChat.onMessageSend))
            this._activeChat.onMessageSend(text);
    }
    set activeChat(chat) {
        if (this.chats.indexOf(chat) === -1)
            return;
        if (this._activeChat == chat)
            return;
        this.activeChat0(chat);
    }
    activeChat0(chat) {
        this._activeChat = chat;
        for (let e of this.chats)
            e.htmlTag.removeClass("active");
        let flagAllowSend = false;
        if (this._activeChat) {
            this._activeChat.htmlTag.addClass("active");
            this._activeChat.displayHistory();
            if (globalClient && globalClient.permissions && globalClient.permissions.initialized())
                switch (this._activeChat.type) {
                    case ChatType.CLIENT:
                        flagAllowSend = true;
                        break;
                    case ChatType.SERVER:
                        flagAllowSend = globalClient.permissions.neededPermission(PermissionType.B_CLIENT_SERVER_TEXTMESSAGE_SEND).granted(1);
                        break;
                    case ChatType.CHANNEL:
                        flagAllowSend = globalClient.permissions.neededPermission(PermissionType.B_CLIENT_CHANNEL_TEXTMESSAGE_SEND).granted(1);
                        break;
                }
        }
        this.htmlTag.find(".input_box").prop("disabled", !flagAllowSend);
    }
    get activeChat() { return this._activeChat; }
    channelChat() {
        return this.findChat("chat_channel");
    }
    serverChat() {
        return this.findChat("chat_server");
    }
    focus() {
        $(this.htmlTag).find(".input_box").focus();
    }
    testMessage(message) {
        message = message
            .replace(/ /gi, "")
            .replace(/<br>/gi, "")
            .replace(/\n/gi, "")
            .replace(/<br\/>/gi, "");
        return message.length > 0;
    }
}
var LogCategory;
(function (LogCategory) {
    LogCategory[LogCategory["CHANNEL"] = 0] = "CHANNEL";
    LogCategory[LogCategory["CLIENT"] = 1] = "CLIENT";
    LogCategory[LogCategory["PERMISSIONS"] = 2] = "PERMISSIONS";
    LogCategory[LogCategory["GENERAL"] = 3] = "GENERAL";
    LogCategory[LogCategory["NETWORKING"] = 4] = "NETWORKING";
})(LogCategory || (LogCategory = {}));
var log;
(function (log_1) {
    let LogType;
    (function (LogType) {
        LogType[LogType["TRACE"] = 0] = "TRACE";
        LogType[LogType["DEBUG"] = 1] = "DEBUG";
        LogType[LogType["INFO"] = 2] = "INFO";
        LogType[LogType["WARNING"] = 3] = "WARNING";
        LogType[LogType["ERROR"] = 4] = "ERROR";
    })(LogType = log_1.LogType || (log_1.LogType = {}));
    let category_mapping = new Map([
        [LogCategory.CHANNEL, "Channel    "],
        [LogCategory.CLIENT, "Client     "],
        [LogCategory.PERMISSIONS, "Permission "],
        [LogCategory.GENERAL, "General    "],
        [LogCategory.NETWORKING, "Network    "]
    ]);
    function logDirect(type, message, ...optionalParams) {
        switch (type) {
            case LogType.TRACE:
            case LogType.DEBUG:
                console.debug(message, ...optionalParams);
                break;
            case LogType.INFO:
                console.log(message, ...optionalParams);
                break;
            case LogType.WARNING:
                console.warn(message, ...optionalParams);
                break;
            case LogType.ERROR:
                console.error(message, ...optionalParams);
                break;
        }
        //console.log("This is %cMy stylish message", "color: yellow; font-style: italic; background-color: blue;padding: 2px");
    }
    function log(type, category, message, ...optionalParams) {
        optionalParams.unshift(category_mapping.get(category));
        message = "[%s] " + message;
        logDirect(type, message, ...optionalParams);
    }
    log_1.log = log;
    function trace(category, message, ...optionalParams) {
        log(LogType.TRACE, category, message, ...optionalParams);
    }
    log_1.trace = trace;
    function debug(category, message, ...optionalParams) {
        log(LogType.DEBUG, category, message, ...optionalParams);
    }
    log_1.debug = debug;
    function info(category, message, ...optionalParams) {
        log(LogType.INFO, category, message, ...optionalParams);
    }
    log_1.info = info;
    function warn(category, message, ...optionalParams) {
        log(LogType.WARNING, category, message, ...optionalParams);
    }
    log_1.warn = warn;
    function error(category, message, ...optionalParams) {
        log(LogType.ERROR, category, message, ...optionalParams);
    }
    log_1.error = error;
    function group(level, category, name, ...optionalParams) {
        name = "[%s] " + name;
        optionalParams.unshift(category_mapping.get(category));
        return new Group(level, category, name, optionalParams);
    }
    log_1.group = group;
    class Group {
        constructor(level, category, name, optionalParams, owner = undefined) {
            this.owner = undefined;
            this._collapsed = true;
            this.initialized = false;
            this.level = level;
            this.category = category;
            this.name = name;
            this.optionalParams = optionalParams;
        }
        group(level, name, ...optionalParams) {
            return new Group(level, this.category, name, optionalParams, this);
        }
        collapsed(flag = true) {
            this._collapsed = flag;
            return this;
        }
        log(message, ...optionalParams) {
            if (!this.initialized) {
                if (this._collapsed && console.groupCollapsed)
                    console.groupCollapsed(this.name, ...this.optionalParams);
                else
                    console.group(this.name, ...this.optionalParams);
                this.initialized = true;
            }
            logDirect(this.level, message, ...optionalParams);
            return this;
        }
        end() {
            if (this.initialized)
                console.groupEnd();
        }
    }
    log_1.Group = Group;
})(log || (log = {}));
/// <reference path="../../utils/modal.ts" />
var Modals;
(function (Modals) {
    function spawnConnectModal(defaultHost = "ts.TeaSpeak.de") {
        let connectIdentity;
        const connectModal = createModal({
            header: function () {
                let header = $.spawn("div");
                header.text("Create a new connection");
                return header;
            },
            body: function () {
                let tag = $("#tmpl_connect").contents().clone();
                let updateFields = function () {
                    if (connectIdentity)
                        tag.find(".connect_nickname").attr("placeholder", connectIdentity.name());
                    else
                        tag.find(".connect_nickname").attr("");
                    let button = tag.parents(".modal-content").find(".connect_connect_button");
                    let field_address = tag.find(".connect_address");
                    let address = field_address.val().toString();
                    let flag_address = !!address.match(Regex.IP_V4) || !!address.match(Regex.DOMAIN);
                    let field_nickname = tag.find(".connect_nickname");
                    let nickname = field_nickname.val().toString();
                    let flag_nickname = nickname.length == 0 || nickname.length >= 3 && nickname.length <= 32;
                    if (flag_address) {
                        if (field_address.hasClass("invalid_input"))
                            field_address.removeClass("invalid_input");
                    }
                    else {
                        if (!field_address.hasClass("invalid_input"))
                            field_address.addClass("invalid_input");
                    }
                    if (flag_nickname) {
                        if (field_nickname.hasClass("invalid_input"))
                            field_nickname.removeClass("invalid_input");
                    }
                    else {
                        if (!field_nickname.hasClass("invalid_input"))
                            field_nickname.addClass("invalid_input");
                    }
                    if (!flag_nickname || !flag_address || !connectIdentity) {
                        button.attr("disabled", "true");
                    }
                    else {
                        button.removeAttr("disabled");
                    }
                };
                tag.find(".connect_address").val(defaultHost);
                tag.find(".connect_address").on("keyup", () => updateFields());
                tag.find(".connect_nickname").on("keyup", () => updateFields());
                tag.find(".identity_select").on('change', function () {
                    settings.changeGlobal("connect_identity_type", this.value);
                    tag.find(".error_message").hide();
                    tag.find(".identity_config:not(" + ".identity_config_" + this.value + ")").hide();
                    tag.find(".identity_config_" + this.value).show().trigger('shown');
                });
                tag.find(".identity_select").val(settings.global("connect_identity_type", "forum"));
                setTimeout(() => tag.find(".identity_select").trigger('change'), 0); //For some reason could not be run instantly
                tag.find(".identity_file").change(function () {
                    const reader = new FileReader();
                    reader.onload = function () {
                        connectIdentity = TSIdentityHelper.loadIdentityFromFileContains(reader.result);
                        console.log(connectIdentity.uid());
                        if (!connectIdentity)
                            tag.find(".error_message").text("Could not read identity! " + TSIdentityHelper.last_error());
                        else {
                            tag.find(".identity_string").val(connectIdentity.exported());
                            settings.changeGlobal("connect_identity_teamspeak_identity", connectIdentity.exported());
                        }
                        (!!connectIdentity ? tag.hide : tag.show).apply(tag.find(".error_message"));
                        updateFields();
                    };
                    reader.onerror = ev => {
                        tag.find(".error_message").text("Could not read identity file!").show();
                        updateFields();
                    };
                    reader.readAsText(this.files[0]);
                });
                tag.find(".identity_string").on('change', function () {
                    if (this.value.length == 0) {
                        tag.find(".error_message").text("Please select an identity!");
                    }
                    else {
                        connectIdentity = TSIdentityHelper.loadIdentity(this.value);
                        if (!connectIdentity)
                            tag.find(".error_message").text("Could not parse identity! " + TSIdentityHelper.last_error());
                        else
                            settings.changeGlobal("connect_identity_teamspeak_identity", this.value);
                    }
                    (!!connectIdentity ? tag.hide : tag.show).apply(tag.find(".error_message"));
                    tag.find(".identity_file").val("");
                    updateFields();
                });
                tag.find(".identity_string").val(settings.global("connect_identity_teamspeak_identity", ""));
                tag.find(".identity_config_teamspeak").on('shown', ev => { tag.find(".identity_string").trigger('change'); });
                if (!forumIdentity)
                    tag.find(".identity_config_forum").html("You cant use your TeaSpeak forum account.<br>You're not connected!");
                tag.find(".identity_config_forum").on('shown', ev => { connectIdentity = forumIdentity; updateFields(); });
                //connect_address
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");
                let button = $.spawn("button");
                button.addClass("connect_connect_button");
                button.text("Connect");
                button.on("click", function () {
                    connectModal.close();
                    let field_address = tag.parents(".modal-content").find(".connect_address");
                    let address = field_address.val().toString();
                    globalClient.startConnection(address, connectIdentity, tag.parents(".modal-content").find(".connect_nickname").val().toString());
                });
                tag.append(button);
                return tag;
            },
            width: 600,
        });
        connectModal.open();
    }
    Modals.spawnConnectModal = spawnConnectModal;
    let Regex = {
        //DOMAIN<:port>
        DOMAIN: /^(localhost|((([a-zA-Z0-9_-]{0,63}\.){0,253})?[a-zA-Z0-9_-]{0,63}\.[a-zA-Z]{2,5}))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
        //IP<:port>
        IP_V4: /(^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
        IP_V6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
        IP: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    };
})(Modals || (Modals = {}));
/*
<div style="display: flex; justify-content: space-between;">
                        <div style="text-align: right;">Identity Settings</div>
                        <select class="identity_select">
                            <option name="identity_type" value="identity_type_forum">Forum Account</option>
                            <option name="identity_type" value="identity_type_teamspeak">TeamSpeak</option>
                        </select>
                    </div>
                    <hr>
                    <div class="identity_config_teamspeak">
                        Please enter your exported TS3 Identity string bellow or select your exported Identity<br>
                        <div style="width: 100%; display: flex; flex-direction: row">
                            <input placeholder="Identity string" style="width: 70%; margin: 5px;" class="identity_string">
                            <div style="width: 30%; margin: 5px"><input name="identity_file" type="file"></div>
                        </div>
                    </div>
                    <div class="identity_config_forum">
                        You're using your forum account as verification
                    </div>

                    <div style="background-color: red; border-radius: 1px; display: none" class="error_message">
                        Identity isnt valid!
                    </div>
 */ 
/// <reference path="Codec.ts"/>
class BasicCodec {
    constructor(codecSampleRate) {
        this.on_encoded_data = $ => { };
        this.channelCount = 1;
        this.samplesPerUnit = 960;
        this.channelCount = 1;
        this.samplesPerUnit = 960;
        this._audioContext = new OfflineAudioContext(1, 1024, 44100);
        this._codecSampleRate = codecSampleRate;
        this._decodeResampler = new AudioResampler(AudioController.globalContext.sampleRate);
        this._encodeResampler = new AudioResampler(codecSampleRate);
    }
    encodeSamples(cache, pcm) {
        this._encodeResampler.resample(pcm).then(buffer => this.encodeSamples0(cache, buffer))
            .catch(error => console.error("Could not resample PCM data for codec. Error:" + error));
    }
    encodeSamples0(cache, buffer) {
        cache._chunks.push(new BufferChunk(buffer)); //TODO multi channel!
        while (cache.bufferedSamples(this.samplesPerUnit) >= this.samplesPerUnit) {
            let buffer = this._audioContext.createBuffer(this.channelCount, this.samplesPerUnit, this._codecSampleRate);
            let index = 0;
            while (index < this.samplesPerUnit) {
                let buf = cache._chunks[0];
                let cpyBytes = buf.copyRangeTo(buffer, this.samplesPerUnit - index, index);
                index += cpyBytes;
                buf.index += cpyBytes;
                if (buf.index == buf.buffer.length)
                    cache._chunks.pop_front();
            }
            let encodeBegin = new Date().getTime();
            this.encode(buffer).then(result => {
                if (result instanceof Uint8Array) {
                    if (new Date().getTime() - 20 > encodeBegin)
                        console.error("Required time: %d", new Date().getTime() - encodeBegin);
                    this.on_encoded_data(result);
                }
                else
                    console.error("[Codec][" + this.name() + "] Could not encode buffer. Result: " + result);
            });
        }
        return true;
    }
    decodeSamples(cache, data) {
        return this.decode(data).then(buffer => this._decodeResampler.resample(buffer));
    }
}
/// <reference path="BasicCodec.ts"/>
var CodecWorkerType;
(function (CodecWorkerType) {
    CodecWorkerType[CodecWorkerType["WORKER_OPUS"] = 0] = "WORKER_OPUS";
})(CodecWorkerType || (CodecWorkerType = {}));
class CodecWrapper extends BasicCodec {
    constructor(type, channelCount) {
        super(48000);
        this._workerListener = [];
        this._workerCallbackToken = "callback_token";
        this._workerTokeIndex = 0;
        this._initialized = false;
        this.type = type;
        this.channelCount = channelCount;
    }
    name() {
        return "Worker for " + CodecWorkerType[this.type] + " Channels " + this.channelCount;
    }
    initialise() {
        if (this._initializePromise)
            return this._initializePromise;
        return this._initializePromise = this.spawnWorker().then(() => new Promise((resolve, reject) => {
            const token = this.generateToken();
            this.sendWorkerMessage({
                command: "initialise",
                type: this.type,
                channelCount: this.channelCount,
                token: token
            });
            this._workerListener.push({
                token: token,
                resolve: data => {
                    console.log("Init result: %o", data);
                    this._initialized = data["success"] == true;
                    if (data["success"] == true)
                        resolve();
                    else
                        reject(data.message);
                }
            });
        }));
    }
    initialized() {
        return this._initialized;
    }
    deinitialise() {
        this.sendWorkerMessage({
            command: "deinitialise"
        });
    }
    decode(data) {
        let token = this.generateToken();
        let result = new Promise((resolve, reject) => {
            this._workerListener.push({
                token: token,
                resolve: (data) => {
                    if (data.success) {
                        let array = new Float32Array(data.dataLength);
                        for (let index = 0; index < array.length; index++)
                            array[index] = data.data[index];
                        let audioBuf = this._audioContext.createBuffer(this.channelCount, array.length / this.channelCount, this._codecSampleRate);
                        for (let channel = 0; channel < this.channelCount; channel++)
                            for (let offset = 0; offset < audioBuf.length; offset++)
                                audioBuf.getChannelData(channel)[offset] = array[channel * audioBuf.length + offset];
                        resolve(audioBuf);
                    }
                    else {
                        reject(data.message);
                    }
                }
            });
        });
        this.sendWorkerMessage({
            command: "decodeSamples",
            token: token,
            data: data,
            dataLength: data.length
        });
        return result;
    }
    encode(data) {
        let token = this.generateToken();
        let result = new Promise((resolve, reject) => {
            this._workerListener.push({
                token: token,
                resolve: (data) => {
                    if (data.success) {
                        let array = new Uint8Array(data.dataLength);
                        for (let index = 0; index < array.length; index++)
                            array[index] = data.data[index];
                        resolve(array);
                    }
                    else {
                        reject(data.message);
                    }
                }
            });
        });
        let buffer = new Float32Array(this.channelCount * data.length);
        for (let offset = 0; offset < data.length; offset++) {
            for (let channel = 0; channel < this.channelCount; channel++)
                buffer[offset * this.channelCount + channel] = data.getChannelData(channel)[offset];
        }
        //FIXME test if this is right!
        this.sendWorkerMessage({
            command: "encodeSamples",
            token: token,
            data: buffer,
            dataLength: buffer.length
        });
        return result;
    }
    reset() {
        this.sendWorkerMessage({
            command: "reset"
        });
        return true;
    }
    generateToken() {
        return this._workerTokeIndex++ + "_token";
    }
    sendWorkerMessage(message, transfare) {
        //console.log("Send worker: %o", message);
        this._worker.postMessage(JSON.stringify(message), transfare);
    }
    onWorkerMessage(message) {
        //console.log("Worker message: %o", message);
        if (!message["token"]) {
            console.error("Invalid worker token!");
            return;
        }
        if (message["token"] == this._workerCallbackToken) {
            if (message["type"] == "loaded") {
                console.log("[Codec] Got worker init response: Success: %o Message: %o", message["success"], message["message"]);
                if (message["success"]) {
                    if (this._workerCallbackResolve)
                        this._workerCallbackResolve();
                }
                else {
                    if (this._workerCallbackReject)
                        this._workerCallbackReject(message["message"]);
                }
                this._workerCallbackReject = undefined;
                this._workerCallbackResolve = undefined;
                return;
            }
            console.log("Costume callback! (%o)", message);
            return;
        }
        for (let entry of this._workerListener) {
            if (entry.token == message["token"]) {
                entry.resolve(message);
                this._workerListener.remove(entry);
                return;
            }
        }
        console.error("Could not find worker token entry! (" + message["token"] + ")");
    }
    spawnWorker() {
        return new Promise((resolve, reject) => {
            this._workerCallbackReject = reject;
            this._workerCallbackResolve = resolve;
            this._worker = new Worker(settings.static("worker_directory", "js/workers/") + "WorkerCodec.js");
            this._worker.onmessage = event => this.onWorkerMessage(JSON.parse(event.data));
        });
    }
}
/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="Identity.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="ui/modal/ModalCreateChannel.ts" />
/// <reference path="codec/CodecWrapper.ts" />
/// <reference path="settings.ts" />
/// <reference path="log.ts" />
let settings;
let globalClient;
let chat;
let forumIdentity;
function main() {
    //localhost:63343/Web-Client/index.php?disableUnloadDialog=1&default_connect_type=forum&default_connect_url=localhost
    AudioController.initializeAudioController();
    if (!TSIdentityHelper.setup()) {
        console.error("Could not setup the TeamSpeak identity parser!");
        return;
    }
    settings = new Settings();
    globalClient = new TSClient();
    /** Setup the XF forum identity **/
    if (settings.static("forum_user_data")) {
        forumIdentity = new TeaForumIdentity(settings.static("forum_user_data"), settings.static("forum_user_sign"));
    }
    chat = new ChatBox($("#chat"));
    globalClient.setup();
    //globalClient.startConnection("localhost:19974"); //TODO remove only for testing
    if (!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
        window.addEventListener("beforeunload", function (event) {
            if (globalClient.serverConnection && globalClient.serverConnection.connected)
                event.returnValue = "Are you really sure?<br>You're still connected!";
            //event.preventDefault();
        });
    }
    //Modals.spawnConnectModal();
    //Modals.spawnSettingsModal();
    //Modals.createChannelModal(undefined);
    if (settings.static("default_connect_url")) {
        if (settings.static("default_connect_type", "forum")) {
            globalClient.startConnection(settings.static("default_connect_url"), forumIdentity);
        }
        else
            Modals.spawnConnectModal(settings.static("default_connect_url"));
    }
}
app.loadedListener.push(() => main());
/// <reference path="BasicCodec.ts"/>
class RawCodec extends BasicCodec {
    constructor(codecSampleRate) {
        super(codecSampleRate);
        this.bufferSize = 4096 * 4;
    }
    name() {
        return "raw";
    }
    initialise() {
        this.converterRaw = Module._malloc(this.bufferSize);
        this.converter = new Uint8Array(Module.HEAPU8.buffer, this.converterRaw, this.bufferSize);
        return new Promise(resolve => resolve());
    }
    initialized() {
        return true;
    }
    deinitialise() { }
    decode(data) {
        return new Promise((resolve, reject) => {
            this.converter.set(data);
            let buf = Module.HEAPF32.slice(this.converter.byteOffset / 4, (this.converter.byteOffset / 4) + data.length / 4);
            let audioBuf = this._audioContext.createBuffer(1, data.length / 4, this._codecSampleRate);
            audioBuf.copyToChannel(buf, 0);
            resolve(audioBuf);
        });
    }
    encode(data) {
        return new Promise(resolve => resolve(new Uint8Array(data.getChannelData(0))));
    }
    reset() { return true; }
}
var hex;
(function (hex) {
    function encode(buffer) {
        let hexCodes = [];
        let view = new DataView(buffer);
        for (let i = 0; i < view.byteLength % 4; i++) {
            let value = view.getUint32(i * 4);
            let stringValue = value.toString(16);
            let padding = '00000000';
            let paddedValue = (padding + stringValue).slice(-padding.length);
            hexCodes.push(paddedValue);
        }
        for (let i = (view.byteLength % 4) * 4; i < view.byteLength; i++) {
            let value = view.getUint8(i).toString(16);
            let padding = '00';
            hexCodes.push((padding + value).slice(-padding.length));
        }
        return hexCodes.join("");
    }
    hex.encode = encode;
})(hex || (hex = {}));
/// <reference path="channel.ts" />
class ServerEntry {
    constructor(tree, name) {
        this.properties = {
            virtualserver_name: "",
            virtualserver_icon_id: 0,
            virtualserver_version: "unknown",
            virtualserver_platform: "unknown",
            virtualserver_unique_identifier: "",
            virtualserver_clientsonline: 0,
            virtualserver_queryclientsonline: 0,
            virtualserver_channelsonline: 0,
            virtualserver_uptime: 0,
            virtualserver_maxclients: 0
        };
        this.lastInfoRequest = 0;
        this.nextInfoRequest = 0;
        this.channelTree = tree;
        this.properties.virtualserver_name = name;
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
        let tag = $.spawn("div");
        tag.attr("id", "server");
        tag.addClass("server");
        tag.append($.spawn("div").addClass("server_type icon client-server_green"));
        tag.append("<a class='name'>" + this.properties.virtualserver_name + "</a>");
        const serverIcon = $("<span/>");
        //we cant spawn an icon on creation :)
        serverIcon.append("<div class='icon_property icon_empty'></div>");
        tag.append(serverIcon);
        return this._htmlTag = tag;
    }
    initializeListener() {
        const _this = this;
        this._htmlTag.click(function () {
            _this.channelTree.onSelect(_this);
        });
        if (!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.htmlTag.on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.spawnContextMenu(event.pageX, event.pageY, () => { _this.channelTree.onSelect(undefined); });
            });
        }
    }
    spawnContextMenu(x, y, on_close = () => { }) {
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "",
            name: "test",
            callback: () => { }
        }, MenuEntry.CLOSE(on_close));
    }
    updateProperty(key, value) {
        console.log("Updating property " + key + " => '" + value + "' for the server");
        this.properties[key] = value;
        if (key == "virtualserver_name") {
            this.htmlTag.find(".name").text(value);
        }
        else if (key == "virtualserver_icon_id") {
            if (this.channelTree.client.fileManager && this.channelTree.client.fileManager.icons)
                this.htmlTag.find(".icon_property").replaceWith(this.channelTree.client.fileManager.icons.generateTag(this.properties.virtualserver_icon_id).addClass("icon_property"));
        }
    }
    updateProperties() {
        this.lastInfoRequest = new Date().getTime();
        this.nextInfoRequest = this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.sendCommand("servergetvariables");
    }
    shouldUpdateProperties() {
        return this.nextInfoRequest < new Date().getTime();
    }
    calculateUptime() {
        if (this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0)
            return Number.parseInt(this.properties.virtualserver_uptime);
        return Number.parseInt(this.properties.virtualserver_uptime) + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }
}
class AudioResampler {
    constructor(targetSampleRate = 44100) {
        this.targetSampleRate = targetSampleRate;
        if (this.targetSampleRate < 3000 || this.targetSampleRate > 384000)
            throw "The target sample rate is outside the range [3000, 384000].";
    }
    resample(buffer) {
        //console.log("Encode from %i to %i", buffer.sampleRate, this.targetSampleRate);
        if (buffer.sampleRate == this.targetSampleRate)
            return new Promise(resolve => resolve(buffer));
        let context;
        context = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(buffer.length * this.targetSampleRate / buffer.sampleRate), this.targetSampleRate);
        let source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        return context.startRendering();
    }
}
//# sourceMappingURL=client.js.map