/// <reference path="VoiceHandler.ts" />
/// <reference path="../ui/elements/modal.ts" />

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

let voice_recoder: VoiceRecorder;
class VoiceRecorder {
    private static readonly CHANNEL = 0;
    private static readonly CHANNELS = 2;
    private static readonly BUFFER_SIZE = 1024 * 4;

    on_support_state_change: () => any;
    on_data: (data: AudioBuffer, head: boolean) => void = undefined;
    on_end: () => any;
    on_start: () => any;
    on_yield: () => any; /* called when owner looses ownership */

    owner: connection.voice.AbstractVoiceConnection | undefined;

    private on_ready_callbacks: (() => any)[] = [];

    private _recording: boolean = false;
    private _recording_supported: boolean = true; /* recording is supported until anything else had been set */
    private _tag_favicon: JQuery;

    private microphoneStream: MediaStreamAudioSourceNode = undefined;
    private mediaStream: MediaStream = undefined;

    private audioContext: AudioContext;
    private processor: ScriptProcessorNode;
    get_output_stream() : ScriptProcessorNode { return this.processor; }

    private vadHandler: VoiceActivityDetector;
    private _chunkCount: number = 0;

    private _deviceId: string;
    private _deviceGroup: string;

    private current_handler: ConnectionHandler;

    constructor() {
        this._deviceId = settings.global("microphone_device_id", "default");
        this._deviceGroup = settings.global("microphone_device_group", "default");

        audio.player.on_ready(() => {
            this.audioContext = audio.player.context();
            this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);

            const empty_buffer = this.audioContext.createBuffer(VoiceRecorder.CHANNELS, VoiceRecorder.BUFFER_SIZE, 48000);
            this.processor.addEventListener('audioprocess', ev => {
                if(this.microphoneStream && this.vadHandler.shouldRecord(ev.inputBuffer)) {
                    if(this._chunkCount == 0)
                        this.on_voice_start();

                    if(this.on_data)
                        this.on_data(ev.inputBuffer, this._chunkCount == 0);
                    else {
                        for(let channel = 0; channel < ev.inputBuffer.numberOfChannels; channel++)
                            ev.outputBuffer.copyToChannel(ev.inputBuffer.getChannelData(channel), channel);
                    }
                    this._chunkCount++;
                } else {
                    if(this._chunkCount != 0 )
                        this.on_voice_end();
                    this._chunkCount = 0;

                    for(let channel = 0; channel < ev.inputBuffer.numberOfChannels; channel++)
                        ev.outputBuffer.copyToChannel(empty_buffer.getChannelData(channel), channel);
                }
            });
            this.processor.connect(this.audioContext.destination);

            if(this.vadHandler)
                this.vadHandler.initialise();
            this.on_microphone(this.mediaStream);

            for(const callback of this.on_ready_callbacks)
                callback();
            this.on_ready_callbacks = [];
        });

        this.setVADHandler(new PassThroughVAD());
        this._tag_favicon = $("head link[rel='icon']");
    }

    own_recoder(connection: connection.voice.AbstractVoiceConnection | undefined) {
        if(connection === this.owner)
            return;
        if(this.on_yield)
            this.on_yield();

        this.owner = connection;

        this.on_end = undefined;
        this.on_start = undefined;
        this.on_data = undefined;
        this.on_yield = undefined;
        this.on_support_state_change = undefined;
        this.on_ready_callbacks = [];

        this._chunkCount = 0;

        if(this.processor) /* processor stream might be null because of the late audio initialisation */
            this.processor.connect(this.audioContext.destination);
    }

    input_available() : boolean {
        return !!getUserMediaFunction();
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

            if(ppt_settings.delay === undefined)
                ppt_settings.delay = 300;

            if(!(this.getVADHandler() instanceof PushToTalkVAD))
                this.setVADHandler(new PushToTalkVAD(ppt_settings));
            else (this.getVADHandler() as PushToTalkVAD).settings = ppt_settings;
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

    set_recording(flag_enabled: boolean) {
        if(this._recording == flag_enabled)
            return;

        if(flag_enabled)
            this.start_recording(this._deviceId, this._deviceGroup);
        else
            this.stop_recording();
    }

    clean_recording_supported() { this._recording_supported = true; }

    is_recording_supported() { return this._recording_supported; }

    is_recording() { return this._recording; }

    device_group_id() : string { return this._deviceGroup; }
    device_id() : string { return this._deviceId; }

    change_device(device: string, group: string) {
        if(this._deviceId == device && this._deviceGroup == group) return;
        this._deviceId = device;
        this._deviceGroup = group;

        settings.changeGlobal("microphone_device_id", device);
        settings.changeGlobal("microphone_device_group", group);
        if(this._recording) {
            this.stop_recording();
            this.start_recording(device, group);
        }
    }

    start_recording(device: string, groupId: string){
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
            this._recording = false;
            if(this._recording_supported) {
                this._recording_supported = false;
                if(this.on_support_state_change)
                    this.on_support_state_change();
            }

            createErrorModal(tr("Could not resolve microphone!"), tr("Could not resolve microphone!<br>Message: ") + error).open();
            console.error(tr("Could not get microphone!"));
            console.error(error);
        });
    }

    stop_recording(stop_media_stream: boolean = true){
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

    on_initialized(callback: () => any) {
        if(this.processor)
            callback();
        else
            this.on_ready_callbacks.push(callback);
    }

    private on_microphone(stream: MediaStream) {
        const old_microphone_stream = this.microphoneStream;
        if(old_microphone_stream)
            this.stop_recording(this.mediaStream != stream); //Disconnect old stream

        this.mediaStream = stream;
        if(!this.mediaStream)
            return;

        if(!this.audioContext) {
            console.log(tr("[VoiceRecorder] Got microphone stream, but havn't a audio context. Waiting until its initialized"));
            return;
        }

        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
        if(this.vadHandler)
            this.vadHandler.initialiseNewStream(old_microphone_stream, this.microphoneStream);

        if(!this._recording_supported) {
            this._recording_supported = true;
            if(this.on_support_state_change)
                this.on_support_state_change();
        }
    }

    private on_voice_start() {
        this._tag_favicon.attr('href', "img/favicon/speaking.png");
        if(this.on_start)
            this.on_start();

    }
    private on_voice_end() {
        this._tag_favicon.attr('href', "img/favicon/teacup.png");
        if(this.on_end)
            this.on_end();
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

interface PPTKeySettings extends ppt.KeyDescriptor {
    version?: number;
    delay: number;
}

class PushToTalkVAD extends VoiceActivityDetector {
    private _settings: PPTKeySettings;
    private _key_hook: ppt.KeyHook;
    private _timeout: NodeJS.Timer;

    private _pushed: boolean = false;

    constructor(settings: PPTKeySettings) {
        super();
        this._settings = settings;
        this._key_hook = {
            callback_release: () => {
                if(this._timeout)
                    clearTimeout(this._timeout);

                if(this._settings.delay > 0)
                    this._timeout = setTimeout(() => this._pushed = false, this._settings.delay);
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

        this.initialize_hook();
    }

    private initialize_hook() {
        this._key_hook.key_code = this._settings.key_code;
        this._key_hook.key_alt = this._settings.key_alt;
        this._key_hook.key_ctrl = this._settings.key_ctrl;
        this._key_hook.key_shift = this._settings.key_shift;
        this._key_hook.key_windows = this._settings.key_windows;
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

    set settings(settings: PPTKeySettings) {
        ppt.unregister_key_hook(this._key_hook);

        this._settings = settings;
        this.initialize_hook();
        this._pushed = false;

        ppt.register_key_hook(this._key_hook);
    }

    shouldRecord(buffer: AudioBuffer): boolean {
        return this._pushed;
    }
}