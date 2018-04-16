/// <reference path="VoiceHandler.ts" />
/// <reference path="../utils/modal.ts" />

abstract class VoiceActivityDetector {
    protected handle: VoiceRecorder;

    abstract shouldRecord(buffer: AudioBuffer) : boolean;
    initialise() {}
    finalize() {}

    initialiseNewStream(old: MediaStreamAudioSourceNode, _new: MediaStreamAudioSourceNode) : void {}

    changeHandle(handle: VoiceRecorder, triggerNewStream: boolean) {
        const oldStream = !this.handle ? undefined : this.handle.getMicrophoneStream();
        this.handle = handle;
        if(triggerNewStream) this.initialiseNewStream(oldStream, !handle ? undefined : handle.getMicrophoneStream());
    }
}

class VoiceRecorder {
    private static readonly CHANNEL = 0;
    private static readonly CHANNELS = 1;
    private static readonly BUFFER_SIZE = 1024;

    handle: VoiceConnection;
    on_data: (data: AudioBuffer, head: boolean) => void = (data) => {};
    on_end: () => void = () => {};

    private _recording: boolean = false;

    private userMedia: any;
    private microphoneStream: MediaStreamAudioSourceNode = undefined;
    private mediaStream: MediaStream = undefined;

    private audioContext: AudioContext;
    private processor: any;
    private mute: GainNode;

    private vadHandler: VoiceActivityDetector;
    private _chunkCount: number = 0;

    private _deviceId: string;

    constructor(handle: VoiceConnection) {
        this.handle = handle;
        this.userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        this._deviceId = settings.global("microphone_id", "default");

        this.audioContext = AudioController.globalContext;
        this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);

        this.processor.addEventListener('audioprocess', ev => {
            if(this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer))
                this.on_data(ev.inputBuffer, this._chunkCount++ == 0);
            else {
                if(this._chunkCount != 0) this.on_end();
                this._chunkCount = 0
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

    avariable() : boolean {
        return !!this.userMedia;
    }

    recording() : boolean {
        return this._recording;
    }

    getMediaStream() : MediaStream {
        return this.mediaStream;
    }

    getDestinationContext() : AudioNode {
        return this.mute;
    }

    getMicrophoneStream() : MediaStreamAudioSourceNode {
        return this.microphoneStream;
    }

    reinitialiseVAD() {
        let type = settings.global("vad_type", "vad");
        if(type == "ppt") {
            let keyCode: number = parseInt(settings.global("vad_ppt_key", Key.T.toString()));
            if(!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHander(new PushToTalkVAD(keyCode));
            else (this.getVADHandler() as PushToTalkVAD).key = keyCode;
        } else if(type == "pt") {
            if(!(this.getVADHandler() instanceof PassThroughVAD))
                this.setVADHander(new PassThroughVAD());
        } else if(type == "vad") {
            if(!(this.getVADHandler() instanceof VoiceActivityDetectorVAD))
                this.setVADHander(new VoiceActivityDetectorVAD());
            let threshold = parseInt(settings.global("vad_threshold", "50"));
            (this.getVADHandler() as VoiceActivityDetectorVAD).percentageThreshold = threshold;
        } else {
            console.warn("Invalid VAD handler! (" + type + ")");
        }
    }

    setVADHander(handler: VoiceActivityDetector) {
        if(this.vadHandler) {
            this.vadHandler.changeHandle(null, true);
            this.vadHandler.finalize();
        }
        this.vadHandler = handler;
        this.vadHandler.changeHandle(this, false);
        this.vadHandler.initialise();
        this.vadHandler.initialiseNewStream(undefined, this.microphoneStream);
    }

    getVADHandler() : VoiceActivityDetector {
        return this.vadHandler;
    }

    update(flag: boolean) {
        if(this._recording == flag) return;
        if(flag) this.start(this._deviceId);
        else this.stop();
    }

    changeDevice(device: string) {
        if(this._deviceId == device) return;
        this._deviceId = device;
        settings.changeGlobal("microphone_id", device);
        if(this._recording) {
            this.stop();
            this.start(device);
        }
    }

    start(device: string){
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

    stop(){
        console.log("Stop recording!");
        this._recording = false;

        if(this.microphoneStream) this.microphoneStream.disconnect();
        this.microphoneStream = undefined;
        if(this.mediaStream) {
            if(this.mediaStream.stop)
                this.mediaStream.stop();
            else
                this.mediaStream.getTracks().forEach(value => {
                    value.stop();
                });
        }
        this.mediaStream = undefined;
    }

    private on_microphone(stream: MediaStream) {
        if(this.microphoneStream) {
            this.stop(); //Disconnect old stream
        }
        console.log("Start recording!");

        this.mediaStream = stream as MediaStream;
        const oldStream = this.microphoneStream;
        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
        this.vadHandler.initialiseNewStream(oldStream, this.microphoneStream);
    }
}

class MuteVAD extends VoiceActivityDetector {
    shouldRecord(buffer: AudioBuffer): boolean {
        return false;
    }
}

class PassThroughVAD extends VoiceActivityDetector {
    shouldRecord(buffer: AudioBuffer): boolean {
        return true;
    }
}

class VoiceActivityDetectorVAD extends VoiceActivityDetector {
    analyzer: AnalyserNode;
    buffer: Uint8Array;

    continuesCount: number = 0;
    maxContinuesCount: number = 12;

    percentageThreshold: number = 50;

    percentage_listener: (per: number) => void = ($) => {};

    initialise() {
        this.analyzer = AudioController.globalContext.createAnalyser();
        this.analyzer.smoothingTimeConstant = 1; //TODO test
        this.buffer = new Uint8Array(this.analyzer.fftSize);
        return super.initialise();
    }

    initialiseNewStream(old: MediaStreamAudioSourceNode, _new: MediaStreamAudioSourceNode): void {
        if(this.analyzer)
            this.analyzer.disconnect();
        if(_new)
            _new.connect(this.analyzer);
    }

    shouldRecord(buffer: AudioBuffer): boolean {
        let usage = this.calculateUsage();
        if($.isFunction(this.percentage_listener)) this.percentage_listener(usage);
        if(usage >= this.percentageThreshold) {
            this.continuesCount = 0;
        } else this.continuesCount++;
        return this.continuesCount < this.maxContinuesCount;
    }

    calculateUsage() : number {
        let total = 0
            ,float
            ,rms;
        this.analyzer.getByteTimeDomainData(this.buffer);
        for(let index = 0; index < this.analyzer.fftSize; index++) {
            float = ( this.buffer[index++] / 0x7f ) - 1;
            total += (float * float);
        }
        rms = Math.sqrt(total / this.analyzer.fftSize);
        let db  = 20 * ( Math.log(rms) / Math.log(10) );
        // sanity check
        db = Math.max(-192, Math.min(db, 0));
        let percentage = 100 + ( db * 1.92 );
        return percentage;
    }
}

class PushToTalkVAD extends VoiceActivityDetector {
    private _key: number;
    private _pushed: boolean = false;
    private _evListenerDown = (e: KeyboardEvent) => {
        //console.log("Down -> " + e.key + " -> " + e.keyCode);
        if(e.key == String.fromCharCode(this._key))
            this.pushed = true;
    };

    private _evListenerUp = e => {
        if(e.key == String.fromCharCode(this._key))
            this.pushed = false;
    };

    constructor(key: any) {
        super();
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

    set pushed(flag: boolean) {
        this._pushed = flag;
    }

    set key(key: number) {
        this._key = key;
        this._pushed = false;
    }

    shouldRecord(buffer: AudioBuffer): boolean {
        return this._pushed;
    }
}