import {AudioRecorderBacked, DeviceList, IDevice,} from "tc-shared/audio/recorder";
import {Registry} from "tc-shared/events";
import {
    AbstractInput,
    InputConsumer,
    InputConsumerType,
    InputEvents,
    InputStartResult,
    InputState,
    LevelMeter,
    NodeInputConsumer
} from "tc-shared/voice/RecorderBase";
import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import * as aplayer from "./player";
import {JAbstractFilter, JStateFilter, JThresholdFilter} from "./RecorderFilter";
import {Filter, FilterType, FilterTypeClass} from "tc-shared/voice/Filter";
import {inputDeviceList} from "tc-backend/web/audio/RecorderDeviceList";

declare global {
    interface MediaStream {
        stop();
    }
}

export interface WebIDevice extends IDevice {
    groupId: string;
}

async function requestMicrophoneMediaStream(constraints: MediaTrackConstraints, updateDeviceList: boolean) : Promise<InputStartResult | MediaStream> {
    try {
        log.info(LogCategory.AUDIO, tr("Requesting a microphone stream for device %s in group %s"), constraints.deviceId, constraints.groupId);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });

        if(updateDeviceList && inputDeviceList.getStatus() === "no-permissions") {
            inputDeviceList.refresh().then(() => {}); /* added the then body to avoid a inspection warning... */
        }

        return stream;
    } catch(error) {
        if('name' in error) {
            if(error.name === "NotAllowedError") {
                log.warn(LogCategory.AUDIO, tr("Microphone request failed (No permissions). Browser message: %o"), error.message);
                return InputStartResult.ENOTALLOWED;
            } else {
                log.warn(LogCategory.AUDIO, tr("Microphone request failed. Request resulted in error: %o: %o"), error.name, error);
            }
        } else {
            log.warn(LogCategory.AUDIO, tr("Failed to initialize recording stream (%o)"), error);
        }

        return InputStartResult.EUNKNOWN;
    }
}

/* request permission for devices only one per time! */
let currentMediaStreamRequest: Promise<MediaStream | InputStartResult>;
async function requestMediaStream(deviceId: string, groupId: string) : Promise<MediaStream | InputStartResult> {
    /* wait for the current media stream requests to finish */
    while(currentMediaStreamRequest) {
        try {
            await currentMediaStreamRequest;
        } catch(error) { }
    }

    const audioConstrains: MediaTrackConstraints = {};
    if(window.detectedBrowser?.name === "firefox") {
        /*
         * Firefox only allows to open one mic as well deciding whats the input device it.
         * It does not respect the deviceId nor the groupId
         */
    } else {
        audioConstrains.deviceId = deviceId;
        audioConstrains.groupId = groupId;
    }

    audioConstrains.echoCancellation = true;
    audioConstrains.autoGainControl = true;
    audioConstrains.noiseSuppression = true;

    const promise = (currentMediaStreamRequest = requestMicrophoneMediaStream(audioConstrains, true));
    try {
        return await currentMediaStreamRequest;
    } finally {
        if(currentMediaStreamRequest === promise)
            currentMediaStreamRequest = undefined;
    }
}

export class WebAudioRecorder implements AudioRecorderBacked {
    createInput(): AbstractInput {
        return new JavascriptInput();
    }

    async createLevelMeter(device: IDevice): Promise<LevelMeter> {
        const meter = new JavascriptLevelMeter(device as any);
        await meter.initialize();
        return meter;
    }

    getDeviceList(): DeviceList {
        return inputDeviceList;
    }
}

class JavascriptInput implements AbstractInput {
    public readonly events: Registry<InputEvents>;

    private state: InputState = InputState.PAUSED;
    private deviceId: string | undefined;
    private consumer: InputConsumer;

    private currentStream: MediaStream;
    private currentAudioStream: MediaStreamAudioSourceNode;

    private audioContext: AudioContext;
    private sourceNode: AudioNode; /* last node which could be connected to the target; target might be the _consumer_node */
    private audioNodeCallbackConsumer: ScriptProcessorNode;
    private readonly audioScriptProcessorCallback;
    private audioNodeVolume: GainNode;

    /* The node is connected to the audio context. Used for the script processor so it has a sink */
    private audioNodeMute: GainNode;

    private registeredFilters: (Filter & JAbstractFilter<AudioNode>)[] = [];
    private inputFiltered: boolean = false;

    private startPromise: Promise<InputStartResult>;

    private volumeModifier: number = 1;

    constructor() {
        this.events = new Registry<InputEvents>();

        aplayer.on_ready(() => this.handleAudioInitialized());
        this.audioScriptProcessorCallback = this.handleAudio.bind(this);
    }

    private handleAudioInitialized() {
        this.audioContext = aplayer.context();
        this.audioNodeMute = this.audioContext.createGain();
        this.audioNodeMute.gain.value = 0;
        this.audioNodeMute.connect(this.audioContext.destination);

        this.audioNodeCallbackConsumer = this.audioContext.createScriptProcessor(1024 * 4);
        this.audioNodeCallbackConsumer.connect(this.audioNodeMute);

        this.audioNodeVolume = this.audioContext.createGain();
        this.audioNodeVolume.gain.value = this.volumeModifier;

        this.initializeFilters();
        if(this.state === InputState.INITIALIZING) {
            this.start().catch(error => {
                logWarn(LogCategory.AUDIO, tr("Failed to automatically start audio recording: %s"), error);
            });
        }
    }

    private initializeFilters() {
        this.registeredFilters.forEach(e => e.finalize());
        this.registeredFilters.sort((a, b) => a.priority - b.priority);

        if(this.audioContext && this.audioNodeVolume) {
            const activeFilters = this.registeredFilters.filter(e => e.isEnabled());

            let chain = "output <- ";
            let currentSource: AudioNode = this.audioNodeVolume;
            for(const f of activeFilters) {
                f.initialize(this.audioContext, currentSource);
                f.setPaused(false);

                currentSource = f.audioNode;
                chain += FilterType[f.type] + " <- ";
            }
            chain += "input";
            console.error("Filter chain: %s", chain);

            this.switchSourceNode(currentSource);
        }
    }

    private handleAudio(event: AudioProcessingEvent) {
        if(this.consumer?.type !== InputConsumerType.CALLBACK) {
            return;
        }

        if(this.consumer.callback_audio) {
            this.consumer.callback_audio(event.inputBuffer);
        }

        if(this.consumer.callback_buffer) {
            log.warn(LogCategory.AUDIO, tr("AudioInput has callback buffer, but this isn't supported yet!"));
        }
    }

    async start() : Promise<InputStartResult> {
        while(this.startPromise) {
            try {
                await this.startPromise;
            } catch {}
        }

        if(this.state != InputState.PAUSED)
            return;

        return await (this.startPromise = this.doStart());
    }

    private async doStart() : Promise<InputStartResult> {
        try {
            if(this.state != InputState.PAUSED)
                throw tr("recorder already started");

            this.state = InputState.INITIALIZING;
            if(!this.deviceId) {
                throw tr("invalid device");
            }

            if(!this.audioContext) {
                /* Awaiting the audio context to be initialized */
                return;
            }

            const requestResult = await requestMediaStream(this.deviceId, undefined);
            if(!(requestResult instanceof MediaStream)) {
                this.state = InputState.PAUSED;
                return requestResult;
            }
            this.currentStream = requestResult;

            for(const filter of this.registeredFilters) {
                if(filter.isEnabled()) {
                    filter.setPaused(false);
                }
            }
            /* TODO: Only add if we're really having a callback consumer */
            this.audioNodeCallbackConsumer.addEventListener('audioprocess', this.audioScriptProcessorCallback);

            this.currentAudioStream = this.audioContext.createMediaStreamSource(this.currentStream);
            this.currentAudioStream.connect(this.audioNodeVolume);

            this.state = InputState.RECORDING;
            this.recalculateFilterStatus(true);

            return InputStartResult.EOK;
        } catch(error) {
            if(this.state == InputState.INITIALIZING) {
                this.state = InputState.PAUSED;
            }

            throw error;
        } finally {
            this.startPromise = undefined;
        }
    }

    async stop() {
        /* await the start */
        if(this.startPromise) {
            try {
                await this.startPromise;
            } catch {}
        }

        this.state = InputState.PAUSED;
        if(this.currentAudioStream) {
            this.currentAudioStream.disconnect();
        }

        if(this.currentStream) {
            if(this.currentStream.stop) {
                this.currentStream.stop();
            } else {
                this.currentStream.getTracks().forEach(value => {
                    value.stop();
                });
            }
        }

        this.currentStream = undefined;
        this.currentAudioStream = undefined;
        for(const f of this.registeredFilters) {
            if(f.isEnabled()) {
                f.setPaused(true);
            }
        }

        if(this.audioNodeCallbackConsumer) {
            this.audioNodeCallbackConsumer.removeEventListener('audioprocess', this.audioScriptProcessorCallback);
        }
        return undefined;
    }


    async setDeviceId(deviceId: string | undefined) {
        if(this.deviceId === deviceId)
            return;

        try {
            await this.stop();
        } catch(error) {
            log.warn(LogCategory.AUDIO, tr("Failed to stop previous record session (%o)"), error);
        }

        this.deviceId = deviceId;
    }


    createFilter<T extends FilterType>(type: T, priority: number): FilterTypeClass<T> {
        let filter: JAbstractFilter<AudioNode> & Filter;
        switch (type) {
            case FilterType.STATE:
                filter = new JStateFilter(priority);
                break;

            case FilterType.THRESHOLD:
                filter = new JThresholdFilter(priority);
                break;

            case FilterType.VOICE_LEVEL:
                throw tr("voice filter isn't supported!");

            default:
                throw tr("unknown filter type");
        }

        filter.callback_active_change = () => this.recalculateFilterStatus(false);
        filter.callback_enabled_change = () => this.initializeFilters();

        this.registeredFilters.push(filter);
        this.initializeFilters();
        this.recalculateFilterStatus(false);
        return filter as any;
    }

    supportsFilter(type: FilterType): boolean {
        switch (type) {
            case FilterType.THRESHOLD:
            case FilterType.STATE:
                return true;
            default:
                return false;
        }
    }

    resetFilter() {
        for(const filter of this.registeredFilters) {
            filter.finalize();
            filter.enabled = false;
        }

        this.registeredFilters = [];
        this.initializeFilters();
        this.recalculateFilterStatus(false);
    }

    removeFilter(filterInstance: Filter) {
        const index = this.registeredFilters.indexOf(filterInstance as any);
        if(index === -1) return;

        const [ filter ] = this.registeredFilters.splice(index, 1);
        filter.finalize();
        filter.enabled = false;

        this.initializeFilters();
        this.recalculateFilterStatus(false);
    }

    private recalculateFilterStatus(forceUpdate: boolean) {
        let filtered = this.registeredFilters.filter(e => e.isEnabled()).filter(e => e.active).length > 0;
        if(filtered === this.inputFiltered && !forceUpdate)
            return;

        this.inputFiltered = filtered;
        if(filtered) {
            this.events.fire("notify_voice_end");
        } else {
            this.events.fire("notify_voice_start");
        }
    }

    isRecording(): boolean {
        return !this.inputFiltered;
    }

    async setConsumer(consumer: InputConsumer) {
        if(this.consumer) {
            if(this.consumer.type == InputConsumerType.NODE) {
                if(this.sourceNode)
                    (this.consumer as NodeInputConsumer).callback_disconnect(this.sourceNode)
            } else if(this.consumer.type === InputConsumerType.CALLBACK) {
                if(this.sourceNode)
                    this.sourceNode.disconnect(this.audioNodeCallbackConsumer);
            }
        }

        if(consumer) {
            if(consumer.type == InputConsumerType.CALLBACK) {
                if(this.sourceNode)
                    this.sourceNode.connect(this.audioNodeCallbackConsumer);
            } else if(consumer.type == InputConsumerType.NODE) {
                if(this.sourceNode)
                    (consumer as NodeInputConsumer).callback_node(this.sourceNode);
            } else {
                throw "native callback consumers are not supported!";
            }
        }
        this.consumer = consumer;
    }

    private switchSourceNode(newNode: AudioNode) {
        if(this.consumer) {
            if(this.consumer.type == InputConsumerType.NODE) {
                const node_consumer = this.consumer as NodeInputConsumer;
                if(this.sourceNode) {
                    node_consumer.callback_disconnect(this.sourceNode);
                }

                if(newNode) {
                    node_consumer.callback_node(newNode);
                }
            } else if(this.consumer.type == InputConsumerType.CALLBACK) {
                this.sourceNode.disconnect(this.audioNodeCallbackConsumer);
                if(newNode) {
                    newNode.connect(this.audioNodeCallbackConsumer);
                }
            }
        }

        this.sourceNode = newNode;
    }

    currentConsumer(): InputConsumer | undefined {
        return this.consumer;
    }

    currentDeviceId(): string | undefined {
        return this.deviceId;
    }

    currentState(): InputState {
        return this.state;
    }

    getVolume(): number {
        return this.volumeModifier;
    }

    setVolume(volume: number) {
        if(volume === this.volumeModifier)
            return;
        this.volumeModifier = volume;
        this.audioNodeVolume.gain.value = volume;
    }

    isFiltered(): boolean {
        return this.state === InputState.RECORDING ? this.inputFiltered : true;
    }
}

class JavascriptLevelMeter implements LevelMeter {
    private static meterInstances: JavascriptLevelMeter[] = [];
    private static meterUpdateTask: number;

    readonly _device: WebIDevice;

    private _callback: (num: number) => any;

    private _context: AudioContext;
    private _gain_node: GainNode;
    private _source_node: MediaStreamAudioSourceNode;
    private _analyser_node: AnalyserNode;

    private _media_stream: MediaStream;

    private _analyse_buffer: Uint8Array;

    private _current_level = 0;

    constructor(device: WebIDevice) {
        this._device = device;
    }

    async initialize() {
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(reject, 5000);
                aplayer.on_ready(() => {
                    clearTimeout(timeout);
                    resolve();
                });
            });
        } catch(error) {
            throw tr("audio context timeout");
        }
        this._context = aplayer.context();
        if(!this._context) throw tr("invalid context");

        this._gain_node = this._context.createGain();
        this._gain_node.gain.setValueAtTime(0, 0);

        /* analyser node */
        this._analyser_node = this._context.createAnalyser();

        const optimal_ftt_size = Math.ceil(this._context.sampleRate * (JThresholdFilter.update_task_interval / 1000));
        this._analyser_node.fftSize = Math.pow(2, Math.ceil(Math.log2(optimal_ftt_size)));

        if(!this._analyse_buffer || this._analyse_buffer.length < this._analyser_node.fftSize)
            this._analyse_buffer = new Uint8Array(this._analyser_node.fftSize);

        /* starting stream */
        const _result = await requestMediaStream(this._device.deviceId, this._device.groupId);
        if(!(_result instanceof MediaStream)){
            if(_result === InputStartResult.ENOTALLOWED)
                throw tr("No permissions");
            if(_result === InputStartResult.ENOTSUPPORTED)
                throw tr("Not supported");
            if(_result === InputStartResult.EBUSY)
                throw tr("Device busy");
            if(_result === InputStartResult.EUNKNOWN)
                throw tr("an error occurred");
            throw _result;
        }
        this._media_stream = _result;

        this._source_node = this._context.createMediaStreamSource(this._media_stream);
        this._source_node.connect(this._analyser_node);
        this._analyser_node.connect(this._gain_node);
        this._gain_node.connect(this._context.destination);

        JavascriptLevelMeter.meterInstances.push(this);
        if(JavascriptLevelMeter.meterInstances.length == 1) {
            clearInterval(JavascriptLevelMeter.meterUpdateTask);
            JavascriptLevelMeter.meterUpdateTask = setInterval(() => JavascriptLevelMeter._analyse_all(), JThresholdFilter.update_task_interval) as any;
        }
    }

    destroy() {
        JavascriptLevelMeter.meterInstances.remove(this);
        if(JavascriptLevelMeter.meterInstances.length == 0) {
            clearInterval(JavascriptLevelMeter.meterUpdateTask);
            JavascriptLevelMeter.meterUpdateTask = 0;
        }

        if(this._source_node) {
            this._source_node.disconnect();
            this._source_node = undefined;
        }
        if(this._media_stream) {
            if(this._media_stream.stop)
                this._media_stream.stop();
            else
                this._media_stream.getTracks().forEach(value => {
                    value.stop();
                });
            this._media_stream = undefined;
        }
        if(this._gain_node) {
            this._gain_node.disconnect();
            this._gain_node = undefined;
        }
        if(this._analyser_node) {
            this._analyser_node.disconnect();
            this._analyser_node = undefined;
        }
    }

    device(): IDevice {
        return this._device;
    }

    set_observer(callback: (value: number) => any) {
        this._callback = callback;
    }

    private static _analyse_all() {
        for(const instance of [...this.meterInstances])
            instance._analyse();
    }

    private _analyse() {
        this._analyser_node.getByteTimeDomainData(this._analyse_buffer);

        this._current_level = JThresholdFilter.calculateAudioLevel(this._analyse_buffer, this._analyser_node.fftSize, this._current_level, .75);
        if(this._callback)
            this._callback(this._current_level);
    }
}