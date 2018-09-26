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

//A small class extention
interface MediaStreamConstraints {
    deviceId?: string;
    groupId?: string;
}

if(!AudioBuffer.prototype.copyToChannel) { //Webkit does not implement this function
    AudioBuffer.prototype.copyToChannel = function (source: Float32Array, channelNumber: number, startInChannel?: number) {
        if(!startInChannel) startInChannel = 0;

        let destination = this.getChannelData(channelNumber);
        for(let index = 0; index < source.length; index++)
            if(destination.length < index + startInChannel)
                destination[index + startInChannel] = source[index];
    }
}

class VoiceRecorder {
    private static readonly CHANNEL = 0;
    private static readonly CHANNELS = 1;
    private static readonly BUFFER_SIZE = 1024 * 4;

    handle: VoiceConnection;
    on_data: (data: AudioBuffer, head: boolean) => void = undefined;
    on_end: () => any;
    on_start: () => any;

    private _recording: boolean = false;

    private microphoneStream: MediaStreamAudioSourceNode = undefined;
    private mediaStream: MediaStream = undefined;

    private audioContext: AudioContext;
    private processor: ScriptProcessorNode;
    get_output_stream() : ScriptProcessorNode { return this.processor; }

    private vadHandler: VoiceActivityDetector;
    private _chunkCount: number = 0;

    private _deviceId: string;
    private _deviceGroup: string;

    constructor(handle: VoiceConnection) {
        this.handle = handle;

        this._deviceId = settings.global("microphone_device_id", "default");
        this._deviceGroup = settings.global("microphone_device_group", "default");

        AudioController.on_initialized(() => {
            this.audioContext = AudioController.globalContext;
            this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);

            const empty_buffer = this.audioContext.createBuffer(VoiceRecorder.CHANNELS, VoiceRecorder.BUFFER_SIZE, 48000);
            this.processor.addEventListener('audioprocess', ev => {
                if(this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer)) {
                    if(this._chunkCount == 0 && this.on_start)
                        this.on_start();

                    if(this.on_data)
                        this.on_data(ev.inputBuffer, this._chunkCount == 0);
                    else {
                        for(let channel = 0; channel < ev.inputBuffer.numberOfChannels; channel++)
                            ev.outputBuffer.copyToChannel(ev.inputBuffer.getChannelData(channel), channel);
                    }
                    this._chunkCount++;
                } else {
                    if(this._chunkCount != 0 && this.on_end)
                        this.on_end();
                    this._chunkCount = 0;

                    for(let channel = 0; channel < ev.inputBuffer.numberOfChannels; channel++)
                        ev.outputBuffer.copyToChannel(empty_buffer.getChannelData(channel), channel);
                }
            });
            this.processor.connect(this.audioContext.destination);

            if(this.vadHandler)
                this.vadHandler.initialise();
            this.on_microphone(this.mediaStream);
        });

        this.setVADHandler(new PassThroughVAD());
    }

    available() : boolean {
        return !!AudioController.userMedia;
    }

    recording() : boolean {
        return this._recording;
    }

    getMediaStream() : MediaStream {
        return this.mediaStream;
    }

    getMicrophoneStream() : MediaStreamAudioSourceNode {
        return this.microphoneStream;
    }

    reinitialiseVAD() {
        let type = settings.global("vad_type", "vad");
        if(type == "ppt") {
            let keyCode: number = parseInt(settings.global("vad_ppt_key", JQuery.Key.T.toString()));
            if(!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHandler(new PushToTalkVAD(keyCode));
            else (this.getVADHandler() as PushToTalkVAD).key = keyCode;
        } else if(type == "pt") {
            if(!(this.getVADHandler() instanceof PassThroughVAD))
                this.setVADHandler(new PassThroughVAD());
        } else if(type == "vad") {
            if(!(this.getVADHandler() instanceof VoiceActivityDetectorVAD))
                this.setVADHandler(new VoiceActivityDetectorVAD());
            (this.getVADHandler() as VoiceActivityDetectorVAD).percentageThreshold = settings.global("vad_threshold", 50);
        } else {
            console.warn("Invalid VAD (Voice activation detector) handler! (" + type + ")");
        }
    }

    setVADHandler(handler: VoiceActivityDetector) {
        if(this.vadHandler) {
            this.vadHandler.changeHandle(null, true);
            this.vadHandler.finalize();
        }

        this.vadHandler = handler;
        this.vadHandler.changeHandle(this, false);
        if(this.audioContext) {
            this.vadHandler.initialise();
            if(this.microphoneStream)
                this.vadHandler.initialiseNewStream(undefined, this.microphoneStream);
        }
    }

    getVADHandler() : VoiceActivityDetector {
        return this.vadHandler;
    }

    update(flag: boolean) {
        if(this._recording == flag) return;
        if(flag) this.start(this._deviceId, this._deviceGroup);
        else this.stop();
    }

    device_group_id() : string { return this._deviceGroup; }
    device_id() : string { return this._deviceId; }

    change_device(device: string, group: string) {
        if(this._deviceId == device && this._deviceGroup == group) return;
        this._deviceId = device;
        this._deviceGroup = group;

        settings.changeGlobal("microphone_device_id", device);
        settings.changeGlobal("microphone_device_group", group);
        if(this._recording) {
            this.stop();
            this.start(device, group);
        }
    }

    start(device: string, groupId: string){
        this._deviceId = device;
        this._deviceGroup = groupId;

        console.log("[VoiceRecorder] Start recording! (Device: %o | Group: %o)", device, groupId);
        this._recording = true;

       AudioController.userMedia({
            audio: {
                deviceId: device,
                groupId: groupId
            }
        }, this.on_microphone.bind(this), error => {
            createErrorModal("Could not resolve microphone!", "Could not resolve microphone!<br>Message: " + error).open();
            console.error("Could not get microphone!");
            console.error(error);
        });
    }

    stop(stop_media_stream: boolean = true){
        console.log("Stop recording!");
        this._recording = false;

        if(this.microphoneStream) this.microphoneStream.disconnect();
        this.microphoneStream = undefined;

        if(stop_media_stream && this.mediaStream) {
            if(this.mediaStream.stop)
                this.mediaStream.stop();
            else
                this.mediaStream.getTracks().forEach(value => {
                    value.stop();
                });
            this.mediaStream = undefined;
        }
    }

    private on_microphone(stream: MediaStream) {
        const old_microphone_stream = this.microphoneStream;
        if(old_microphone_stream)
            this.stop(this.mediaStream != stream); //Disconnect old stream

        this.mediaStream = stream;
        if(!this.mediaStream) return;

        if(!this.audioContext) {
            console.log("[VoiceRecorder] Got microphone stream, but havn't a audio context. Waiting until its initialized");
            return;
        }

        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
        if(this.vadHandler)
            this.vadHandler.initialiseNewStream(old_microphone_stream, this.microphoneStream);
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