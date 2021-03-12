import {AudioRecorderBacked, DeviceList, IDevice,} from "tc-shared/audio/recorder";
import {Registry} from "tc-shared/events";
import {
    AbstractInput,
    FilterMode,
    InputConsumer,
    InputConsumerType,
    InputEvents,
    InputStartError,
    InputState,
    LevelMeter,
    NodeInputConsumer
} from "tc-shared/voice/RecorderBase";
import {LogCategory, logDebug, logWarn} from "tc-shared/log";
import * as aplayer from "./player";
import {JAbstractFilter, JStateFilter, JThresholdFilter} from "./RecorderFilter";
import {Filter, FilterType, FilterTypeClass} from "tc-shared/voice/Filter";
import {inputDeviceList} from "tc-backend/web/audio/RecorderDeviceList";
import {requestMediaStream, stopMediaStream} from "tc-shared/media/Stream";
import {tr} from "tc-shared/i18n/localize";

declare global {
    interface MediaStream {
        stop();
    }
}

export interface WebIDevice extends IDevice {
    groupId: string;
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

    isRnNoiseSupported() {
        return false;
    }

    toggleRnNoise(target: boolean) { throw "not supported"; }
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
    private filterMode: FilterMode = FilterMode.Block;

    private startPromise: Promise<InputStartError | true>;

    private volumeModifier: number = 1;

    constructor() {
        this.events = new Registry<InputEvents>();

        aplayer.on_ready(() => this.handleAudioInitialized());
        this.audioScriptProcessorCallback = this.handleAudio.bind(this);
    }

    destroy() { }

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
    }

    private setState(state: InputState) {
        if(this.state === state) {
            return;
        }

        const oldState = this.state;
        this.state = state;
        this.events.fire("notify_state_changed", {
            oldState,
            newState: state
        });
    }

    private initializeFilters() {
        this.registeredFilters.forEach(e => e.finalize());
        this.registeredFilters.sort((a, b) => a.priority - b.priority);
        if(!this.audioContext || !this.audioNodeVolume) {
            return;
        }

        if(this.filterMode === FilterMode.Block) {
            this.switchSourceNode(this.audioNodeMute);
        } else if(this.filterMode === FilterMode.Filter) {
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
            logDebug(LogCategory.AUDIO, tr("Input filter chain: %s"), chain);

            this.switchSourceNode(currentSource);
        } else if(this.filterMode === FilterMode.Bypass) {
            this.switchSourceNode(this.audioNodeVolume);
        }

    }

    private handleAudio(event: AudioProcessingEvent) {
        if(this.consumer?.type !== InputConsumerType.CALLBACK) {
            return;
        }

        if(this.consumer.callbackAudio) {
            this.consumer.callbackAudio(event.inputBuffer);
        }

        if(this.consumer.callbackBuffer) {
            logWarn(LogCategory.AUDIO, tr("AudioInput has callback buffer, but this isn't supported yet!"));
        }
    }

    async start() : Promise<InputStartError | true> {
        while(this.startPromise) {
            try {
                await this.startPromise;
            } catch {}
        }

        if(this.state === InputState.RECORDING) {
            return true;
        } else if(this.state === InputState.INITIALIZING) {
            return InputStartError.EBUSY;
        }

        /* do it async since if the doStart fails on the first iteration, we're setting the start promise, after it's getting cleared */
        return await (this.startPromise = Promise.resolve().then(() => this.doStart()));
    }

    private async doStart() : Promise<InputStartError | true> {
        try {
            if(!aplayer.initialized() || !this.audioContext) {
                return InputStartError.ESYSTEMUNINITIALIZED;
            }

            if(this.state != InputState.PAUSED) {
                throw tr("recorder already started");
            }
            this.setState(InputState.INITIALIZING);

            let deviceId;
            if(this.deviceId === IDevice.NoDeviceId) {
                throw tr("no device selected");
            } else if(this.deviceId === IDevice.DefaultDeviceId) {
                deviceId = undefined;
            } else {
                deviceId = this.deviceId;
            }

            const requestResult = await requestMediaStream(deviceId, undefined, "audio");
            if(!(requestResult instanceof MediaStream)) {
                this.setState(InputState.PAUSED);
                return requestResult;
            }

            /* added the then body to avoid a inspection warning... */
            inputDeviceList.refresh().then(() => {});

            if(this.currentStream) {
                stopMediaStream(this.currentStream);
                this.currentStream = undefined;
            }
            this.currentAudioStream?.disconnect();
            this.currentAudioStream = undefined;

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

            this.setState(InputState.RECORDING);
            this.updateFilterStatus(true);

            return true;
        } catch(error) {
            if(this.state == InputState.INITIALIZING) {
                this.setState(InputState.PAUSED);
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

        this.setState(InputState.PAUSED);
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
        for(const filter of this.registeredFilters) {
            if(filter.isEnabled()) {
                filter.setPaused(true);
            }
        }

        if(this.audioNodeCallbackConsumer) {
            this.audioNodeCallbackConsumer.removeEventListener('audioprocess', this.audioScriptProcessorCallback);
        }
        return undefined;
    }


    async setDeviceId(deviceId: string) {
        if(this.deviceId === deviceId)
            return;

        try {
            await this.stop();
        } catch(error) {
            logWarn(LogCategory.AUDIO, tr("Failed to stop previous record session (%o)"), error);
        }

        const oldDeviceId = deviceId;
        this.deviceId = deviceId;
        this.events.fire("notify_device_changed", { newDeviceId: deviceId, oldDeviceId })
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

        filter.callback_active_change = () => this.updateFilterStatus(false);
        filter.callback_enabled_change = () => this.initializeFilters();

        this.registeredFilters.push(filter);
        this.initializeFilters();
        this.updateFilterStatus(false);
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
        this.updateFilterStatus(false);
    }

    removeFilter(filterInstance: Filter) {
        const index = this.registeredFilters.indexOf(filterInstance as any);
        if(index === -1) return;

        const [ filter ] = this.registeredFilters.splice(index, 1);
        filter.finalize();
        filter.enabled = false;

        this.initializeFilters();
        this.updateFilterStatus(false);
    }

    private calculateCurrentFilterStatus() {
        switch (this.filterMode) {
            case FilterMode.Block:
                return true;

            case FilterMode.Bypass:
                return false;

            case FilterMode.Filter:
                return this.registeredFilters.filter(e => e.isEnabled()).filter(e => e.active).length > 0;
        }
    }

    private updateFilterStatus(forceUpdate: boolean) {
        let filtered = this.calculateCurrentFilterStatus();
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
                if(this.sourceNode) {
                    this.consumer.callbackDisconnect(this.sourceNode);
                }
            } else if(this.consumer.type === InputConsumerType.CALLBACK) {
                if(this.sourceNode) {
                    this.sourceNode.disconnect(this.audioNodeCallbackConsumer);
                }
            }
        }

        if(consumer) {
            if(consumer.type == InputConsumerType.CALLBACK) {
                if(this.sourceNode) {
                    this.sourceNode.connect(this.audioNodeCallbackConsumer);
                }
            } else if(consumer.type == InputConsumerType.NODE) {
                if(this.sourceNode) {
                    consumer.callbackNode(this.sourceNode);
                }
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
                    node_consumer.callbackDisconnect(this.sourceNode);
                }

                if(newNode) {
                    node_consumer.callbackNode(newNode);
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

    getFilterMode(): FilterMode {
        return this.filterMode;
    }

    setFilterMode(mode: FilterMode) {
        if(this.filterMode === mode) {
            return;
        }

        const oldMode = this.filterMode;
        this.filterMode = mode;
        this.updateFilterStatus(false);
        this.initializeFilters();
        this.events.fire("notify_filter_mode_changed", {
            oldMode,
            newMode: mode
        });
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
        const _result = await requestMediaStream(this._device.deviceId, this._device.groupId, "audio");
        if(!(_result instanceof MediaStream)){
            if(_result === InputStartError.ENOTALLOWED)
                throw tr("No permissions");
            if(_result === InputStartError.ENOTSUPPORTED)
                throw tr("Not supported");
            if(_result === InputStartError.EBUSY)
                throw tr("Device busy");
            if(_result === InputStartError.EUNKNOWN)
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

    getDevice(): IDevice {
        return this._device;
    }

    setObserver(callback: (value: number) => any) {
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