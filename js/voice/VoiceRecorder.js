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
        this._deviceId = "default";
        this.handle = handle;
        this.userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        this.audioContext = AudioController.globalContext;
        this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);
        const _this = this;
        this.processor.addEventListener('audioprocess', ev => {
            if (_this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer))
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
    reinizaliszeVAD() {
        let type = this.handle.client.settings.global("vad_type", "ppt");
        if (type == "ppt") {
            let keyCode = Number.parseInt(globalClient.settings.global("vad_ppt_key", 84 /* T */.toString()));
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
            let threshold = Number.parseInt(globalClient.settings.global("vad_threshold", "50"));
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
//# sourceMappingURL=VoiceRecorder.js.map