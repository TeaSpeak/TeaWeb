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
    private static readonly CHANNELS = 2;
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

        audio.player.on_ready(() => {
            this.audioContext = audio.player.context();
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
        return !!getUserMediaFunction() && !!getUserMediaFunction();
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
            if(settings.global('vad_ppt_key', undefined)) {
                //TODO remove that because its legacy shit
                createErrorModal(tr("VAD changed!"), tr("VAD key detection changed.<br>Please reset your PPT key!")).open();
            }
            let ppt_settings: PPTKeySettings = settings.global('vad_ppt_settings', undefined);
            ppt_settings = ppt_settings ? JSON.parse(ppt_settings as any as string) : {};

            if(ppt_settings.version === undefined)
                ppt_settings.version = 1;

            if(ppt_settings.key_code === undefined)
                ppt_settings.key_code = "KeyT";

            if(ppt_settings.key_ctrl === undefined)
                ppt_settings.key_ctrl = false;

            if(ppt_settings.key_shift === undefined)
                ppt_settings.key_shift = false;

            if(ppt_settings.key_alt === undefined)
                ppt_settings.key_alt = false;

            if(ppt_settings.key_windows === undefined)
                ppt_settings.key_windows = false;

            if(!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHandler(new PushToTalkVAD(ppt_settings));
            else (this.getVADHandler() as PushToTalkVAD).key = ppt_settings;
        } else if(type == "pt") {
            if(!(this.getVADHandler() instanceof PassThroughVAD))
                this.setVADHandler(new PassThroughVAD());
        } else if(type == "vad") {
            if(!(this.getVADHandler() instanceof VoiceActivityDetectorVAD))
                this.setVADHandler(new VoiceActivityDetectorVAD());
            (this.getVADHandler() as VoiceActivityDetectorVAD).percentageThreshold = settings.global("vad_threshold", 50);
        } else {
            console.warn(tr("Invalid VAD (Voice activation detector) handler! (%o)"), type);
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

        console.log(tr("[VoiceRecorder] Start recording! (Device: %o | Group: %o)"), device, groupId);
        this._recording = true;

        //FIXME Implement that here for thew client as well
        getUserMediaFunction()({
            audio: {
                deviceId: device,
                groupId: groupId,
                echoCancellation: true,
                echoCancellationType: 'browser'
            }
        }, this.on_microphone.bind(this), error => {
            createErrorModal(tr("Could not resolve microphone!"), tr("Could not resolve microphone!<br>Message: ") + error).open();
            console.error(tr("Could not get microphone!"));
            console.error(error);
        });
    }

    stop(stop_media_stream: boolean = true){
        console.log(tr("Stop recording!"));
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
            console.log(tr("[VoiceRecorder] Got microphone stream, but havn't a audio context. Waiting until its initialized"));
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
        this.analyzer = audio.player.context().createAnalyser();
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

interface PPTKeySettings extends ppt.KeyDescriptor{
    version?: number;
}

class PushToTalkVAD extends VoiceActivityDetector {
    private _key: ppt.KeyDescriptor;
    private _key_hook: ppt.KeyHook;
    private _timeout: NodeJS.Timer;
    private _delay = /* 300 */ 0; //TODO configurable

    private _pushed: boolean = false;

    constructor(key: ppt.KeyDescriptor) {
        super();
        this._key = key;
        this._key_hook = {
            callback_release: () => {
                if(this._timeout)
                    clearTimeout(this._timeout);

                if(this._delay > 0)
                    this._timeout = setTimeout(() => this._pushed = false, this._delay);
                else
                    this._pushed = false;
            },
            callback_press: () => {
                if(this._timeout)
                    clearTimeout(this._timeout);

                this._pushed = true;
            },

            cancel: false
        } as ppt.KeyHook;
        Object.assign(this._key_hook, this._key);
    }


    initialise() {
        ppt.register_key_hook(this._key_hook);
        return super.initialise();
    }

    finalize() {
        ppt.unregister_key_hook(this._key_hook);
        return super.finalize();
    }

    set pushed(flag: boolean) {
        this._pushed = flag;
    }

    set key(key: ppt.KeyDescriptor) {
        ppt.unregister_key_hook(this._key_hook);
        Object.assign(this._key, key);
        Object.assign(this._key_hook, key);
        this._pushed = false;
        ppt.register_key_hook(this._key_hook);
    }

    shouldRecord(buffer: AudioBuffer): boolean {
        return this._pushed;
    }
}