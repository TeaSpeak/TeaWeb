/// <reference path="VoiceHandler.ts" />
/// <reference path="../utils/modal.ts" />

abstract class VoiceActivityDetector {
    abstract shouldRecord(buffer: AudioBuffer) : boolean;
    initialise(handle: VoiceRecorder) {}
    finalize() {}
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
    private mute: any;

    private vadHandler: VoiceActivityDetector;
    private _chunkCount: number = 0;

    constructor(handle: VoiceConnection) {
        this.handle = handle;
        this.userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        this.audioContext = new AudioContext();
        this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);

        const _this = this;
        this.processor.addEventListener('audioprocess', ev => {
            if(_this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer))
                this.on_data(ev.inputBuffer, this._chunkCount++ == 0);
            else {
                if(this._chunkCount != 0) this.on_end();
                this._chunkCount = 0
            };
        });

        //Not needed but make sure we have data for the preprocessor
        this.mute = this.audioContext.createGain();

        this.processor.connect(this.mute);
        this.mute.connect(this.audioContext.destination);

        //this.setVADHander(new MuteVAD());
        this.setVADHander(new PassThroughVAD());
    }

    avariable() : boolean {
        return !!this.userMedia;
    }

    reinizaliszeVAD() {
        let type = this.handle.client.settings.global("vad_type", "ppt");
        if(type == "ppt") {
            let keyCode: number = Number.parseInt(globalClient.settings.global("vad_ppt_key", Key.T.toString()));
            if(!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHander(new PushToTalkVAD(keyCode));
            else (this.getVADHandler() as PushToTalkVAD).key = keyCode;
        } else if(type == "pt") {
            if(!(this.getVADHandler() instanceof PassThroughVAD))
                this.setVADHander(new PassThroughVAD());
        } else {
            console.warn("Invalid VAD handler! (" + type + ")");
        }
    }

    setVADHander(handler: VoiceActivityDetector) {
        if(this.vadHandler) this.vadHandler.finalize();
        this.vadHandler = handler;
        this.vadHandler.initialise(this);
    }

    getVADHandler() : VoiceActivityDetector {
        return this.vadHandler;
    }

    update(flag: boolean) {
        if(this._recording == flag) return;
        if(flag) this.start();
        else this.stop();
    }

    start(){
        console.log("Attempt recording!");
        this._recording = true;
        this.userMedia({audio: true}, this.on_microphone.bind(this), error => {
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
        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
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


    initialise(handle: VoiceRecorder) {
        document.addEventListener("keydown", this._evListenerDown);
        document.addEventListener("keyup", this._evListenerUp);
        return super.initialise(handle);
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