import {
    AbstractDeviceList,
    AudioRecorderBacked,
    DeviceList,
    DeviceListEvents,
    DeviceListState,
    IDevice,
    PermissionState
} from "tc-shared/audio/recorder";
import {Registry} from "tc-shared/events";
import * as rbase from "tc-shared/voice/RecorderBase";
import {
    AbstractInput,
    CallbackInputConsumer,
    InputConsumer,
    InputConsumerType, InputEvents,
    InputStartResult,
    InputState,
    LevelMeter,
    NodeInputConsumer
} from "tc-shared/voice/RecorderBase";
import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import * as aplayer from "./player";
import {JAbstractFilter, JStateFilter, JThresholdFilter} from "./RecorderFilter";
import * as loader from "tc-loader";
import {Filter, FilterType, FilterTypeClass} from "tc-shared/voice/Filter";

declare global {
    interface MediaStream {
        stop();
    }
}

export interface WebIDevice extends IDevice {
    groupId: string;
}

function getUserMediaFunctionPromise() : (constraints: MediaStreamConstraints) => Promise<MediaStream> {
    if('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)
        return constraints => navigator.mediaDevices.getUserMedia(constraints);

    const _callbacked_function = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if(!_callbacked_function)
        return undefined;

    return constraints => new Promise<MediaStream>((resolve, reject) => _callbacked_function(constraints, resolve, reject));
}

async function requestMicrophoneMediaStream(constraints: MediaTrackConstraints, updateDeviceList: boolean) : Promise<InputStartResult | MediaStream> {
    const mediaFunction = getUserMediaFunctionPromise();
    if(!mediaFunction) return InputStartResult.ENOTSUPPORTED;

    try {
        log.info(LogCategory.AUDIO, tr("Requesting a microphone stream for device %s in group %s"), constraints.deviceId, constraints.groupId);
        const stream = mediaFunction({ audio: constraints });

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

async function requestMicrophonePermissions() : Promise<PermissionState> {
    const begin = Date.now();
    try {
        await getUserMediaFunctionPromise()({ audio: { deviceId: "default" }, video: false });
        return "granted";
    } catch (error) {
        const end = Date.now();
        const isSystem = (end - begin) < 250;
        log.debug(LogCategory.AUDIO, tr("Microphone device request took %d milliseconds. System answered: %s"), end - begin, isSystem);
        return "denied";
    }
}

let inputDeviceList: WebInputDeviceList;
class WebInputDeviceList extends AbstractDeviceList {
    private devices: WebIDevice[];

    private deviceListQueryPromise: Promise<void>;

    constructor() {
        super();

        this.devices = [];
    }

    getDefaultDeviceId(): string {
        return "default";
    }

    getDevices(): IDevice[] {
        return this.devices;
    }

    getEvents(): Registry<DeviceListEvents> {
        return this.events;
    }

    getStatus(): DeviceListState {
        return this.listState;
    }

    isRefreshAvailable(): boolean {
        return true;
    }

    refresh(askPermissions?: boolean): Promise<void> {
        return this.queryDevices(askPermissions === true);
    }

    async requestPermissions(): Promise<PermissionState> {
        if(this.permissionState !== "unknown")
            return this.permissionState;

        let result = await requestMicrophonePermissions();
        if(result === "granted" && this.listState === "no-permissions") {
            /* if called within doQueryDevices, queryDevices will just return the promise */
            this.queryDevices(false).then(() => {});
        }
        this.setPermissionState(result);
        return result;
    }

    private queryDevices(askPermissions: boolean) : Promise<void> {
        if(this.deviceListQueryPromise)
            return this.deviceListQueryPromise;

        this.deviceListQueryPromise = this.doQueryDevices(askPermissions).catch(error => {
            log.error(LogCategory.AUDIO, tr("Failed to query microphone devices (%o)"), error);

            if(this.listState !== "healthy")
                this.listState = "error";
        }).then(() => {
            this.deviceListQueryPromise = undefined;
        });

        return this.deviceListQueryPromise || Promise.resolve();
    }

    private async doQueryDevices(askPermissions: boolean) {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let hasPermissions = devices.findIndex(e => e.label !== "") !== -1;

        if(!hasPermissions && askPermissions) {
            this.setState("no-permissions");

            let skipPermissionAsk = false;
            if('permissions' in navigator && 'query' in navigator.permissions) {
                try {
                    const result = await navigator.permissions.query({ name: "microphone" });
                    if(result.state === "denied") {
                        this.setPermissionState("denied");
                        skipPermissionAsk = true;
                    }
                } catch (error) {
                    logWarn(LogCategory.GENERAL, tr("Failed to query for microphone permissions: %s"), error);
                }
            }

            if(skipPermissionAsk) {
                /* request permissions */
                hasPermissions = await this.requestPermissions() === "granted";
                if(hasPermissions) {
                    devices = await navigator.mediaDevices.enumerateDevices();
                }
            }
        }
        if(hasPermissions) {
            this.setPermissionState("granted");
        }

        if(window.detectedBrowser?.name === "firefox") {
            devices = [{
                label: tr("Default Firefox device"),
                groupId: "default",
                deviceId: "default",
                kind: "audioinput",

                toJSON: undefined
            }];
        }

        const inputDevices = devices.filter(e => e.kind === "audioinput");

        const oldDeviceList = this.devices;
        this.devices = [];

        let devicesAdded = 0;
        for(const device of inputDevices) {
            const oldIndex = oldDeviceList.findIndex(e => e.deviceId === device.deviceId);
            if(oldIndex === -1) {
                devicesAdded++;
            } else {
                oldDeviceList.splice(oldIndex, 1);
            }

            this.devices.push({
                deviceId: device.deviceId,
                driver: "WebAudio",
                groupId: device.groupId,
                name: device.label
            });
        }

        this.events.fire("notify_list_updated", { addedDeviceCount: devicesAdded, removedDeviceCount: oldDeviceList.length });
        if(hasPermissions) {
            this.setState("healthy");
        } else {
            this.setState("no-permissions");
        }
    }
}

export class WebAudioRecorder implements AudioRecorderBacked {
    createInput(): AbstractInput {
        return new JavascriptInput();
    }

    async createLevelMeter(device: IDevice): Promise<LevelMeter> {
        const meter = new JavascriptLevelmeter(device as any);
        await meter.initialize();
        return meter;
    }

    getDeviceList(): DeviceList {
        return inputDeviceList;
    }
}

class JavascriptInput implements AbstractInput {
    public readonly events: Registry<InputEvents>;

    private _state: InputState = InputState.PAUSED;
    private _current_device: WebIDevice | undefined;
    private _current_consumer: InputConsumer;

    private _current_stream: MediaStream;
    private _current_audio_stream: MediaStreamAudioSourceNode;

    private _audio_context: AudioContext;
    private _source_node: AudioNode; /* last node which could be connected to the target; target might be the _consumer_node */
    private _consumer_callback_node: ScriptProcessorNode;
    private readonly _consumer_audio_callback;
    private _volume_node: GainNode;
    private _mute_node: GainNode;

    private registeredFilters: (Filter & JAbstractFilter<AudioNode>)[] = [];
    private _filter_active: boolean = false;

    private _volume: number = 1;

    callback_begin: () => any = undefined;
    callback_end: () => any = undefined;

    constructor() {
        this.events = new Registry<InputEvents>();

        aplayer.on_ready(() => this._audio_initialized());
        this._consumer_audio_callback = this._audio_callback.bind(this);
    }

    private _audio_initialized() {
        this._audio_context = aplayer.context();
        if(!this._audio_context)
            return;

        this._mute_node = this._audio_context.createGain();
        this._mute_node.gain.value = 0;
        this._mute_node.connect(this._audio_context.destination);

        this._consumer_callback_node = this._audio_context.createScriptProcessor(1024 * 4);
        this._consumer_callback_node.connect(this._mute_node);

        this._volume_node = this._audio_context.createGain();
        this._volume_node.gain.value = this._volume;

        this.initializeFilters();
        if(this._state === InputState.INITIALIZING)
            this.start();
    }

    private initializeFilters() {
        for(const filter of this.registeredFilters) {
            if(filter.is_enabled())
                filter.finalize();
        }

        this.registeredFilters.sort((a, b) => a.priority - b.priority);
        if(this._audio_context && this._volume_node) {
            const active_filter = this.registeredFilters.filter(e => e.is_enabled());
            let stream: AudioNode = this._volume_node;
            for(const f of active_filter) {
                f.initialize(this._audio_context, stream);
                stream = f.audio_node;
            }
            this._switch_source_node(stream);
        }
    }

    private _audio_callback(event: AudioProcessingEvent) {
        if(!this._current_consumer || this._current_consumer.type !== InputConsumerType.CALLBACK)
            return;

        const callback = this._current_consumer as CallbackInputConsumer;
        if(callback.callback_audio)
            callback.callback_audio(event.inputBuffer);

        if(callback.callback_buffer) {
            log.warn(LogCategory.AUDIO, tr("AudioInput has callback buffer, but this isn't supported yet!"));
        }
    }

    current_state() : InputState { return this._state; };

    private _start_promise: Promise<InputStartResult>;
    async start() : Promise<InputStartResult> {
        if(this._start_promise) {
            try {
                await this._start_promise;
                if(this._state != InputState.PAUSED)
                    return;
            } catch(error) {
                log.debug(LogCategory.AUDIO, tr("JavascriptInput:start() Start promise await resulted in an error: %o"), error);
            }
        }

        return await (this._start_promise = this._start());
    }

    /* request permission for devices only one per time! */
    private static _running_request: Promise<MediaStream | InputStartResult>;
    static async request_media_stream(device_id: string, group_id: string) : Promise<MediaStream | InputStartResult> {
        while(this._running_request) {
            try {
                await this._running_request;
            } catch(error) { }
        }

        const audio_constrains: MediaTrackConstraints = {};
        if(window.detectedBrowser?.name === "firefox") {
            /*
             * Firefox only allows to open one mic as well deciding whats the input device it.
             * It does not respect the deviceId nor the groupId
             */
        } else {
            audio_constrains.deviceId = device_id;
            audio_constrains.groupId = group_id;
        }

        audio_constrains.echoCancellation = true;
        audio_constrains.autoGainControl = true;
        audio_constrains.noiseSuppression = true;

        const promise = (this._running_request = requestMicrophoneMediaStream(audio_constrains, true));
        try {
            return await this._running_request;
        } finally {
            if(this._running_request === promise)
                this._running_request = undefined;
        }
    }

    private async _start() : Promise<InputStartResult> {
        try {
            if(this._state != InputState.PAUSED)
                throw tr("recorder already started");

            this._state = InputState.INITIALIZING;
            if(!this._current_device)
                throw tr("invalid device");

            if(!this._audio_context) {
                debugger;
                throw tr("missing audio context");
            }

            const _result = await JavascriptInput.request_media_stream(this._current_device.deviceId, this._current_device.groupId);
            if(!(_result instanceof MediaStream)) {
                this._state = InputState.PAUSED;
                return _result;
            }
            this._current_stream = _result;

            for(const f of this.registeredFilters) {
                if(f.is_enabled()) {
                    f.set_pause(false);
                }
            }
            this._consumer_callback_node.addEventListener('audioprocess', this._consumer_audio_callback);

            this._current_audio_stream = this._audio_context.createMediaStreamSource(this._current_stream);
            this._current_audio_stream.connect(this._volume_node);
            this._state = InputState.RECORDING;
            return InputStartResult.EOK;
        } catch(error) {
            if(this._state == InputState.INITIALIZING) {
                this._state = InputState.PAUSED;
            }
            throw error;
        } finally {
            this._start_promise = undefined;
        }
    }

    async stop() {
        /* await all starts */
        try {
            if(this._start_promise)
                await this._start_promise;
        } catch(error) {}

        this._state = InputState.PAUSED;
        if(this._current_audio_stream) {
            this._current_audio_stream.disconnect();
        }

        if(this._current_stream) {
            if(this._current_stream.stop) {
                this._current_stream.stop();
            } else {
                this._current_stream.getTracks().forEach(value => {
                    value.stop();
                });
            }
        }

        this._current_stream = undefined;
        this._current_audio_stream = undefined;
        for(const f of this.registeredFilters) {
            if(f.is_enabled()) {
                f.set_pause(true);
            }
        }

        if(this._consumer_callback_node) {
            this._consumer_callback_node.removeEventListener('audioprocess', this._consumer_audio_callback);
        }
        return undefined;
    }


    current_device(): IDevice | undefined {
        return this._current_device;
    }

    async set_device(device: IDevice | undefined) {
        if(this._current_device === device)
            return;

        const savedState = this._state;
        try {
            await this.stop();
        } catch(error) {
            log.warn(LogCategory.AUDIO, tr("Failed to stop previous record session (%o)"), error);
        }

        this._current_device = device as any;
        if(!device) {
            this._state = savedState === InputState.PAUSED ? InputState.PAUSED : InputState.DRY;
            return;
        }

        if(savedState !== InputState.PAUSED) {
            try {
                await this.start()
            } catch(error) {
                log.warn(LogCategory.AUDIO, tr("Failed to start new recording stream (%o)"), error);
                throw "failed to start record";
            }
        }
        return;
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

        filter.callback_active_change = () => this._recalculate_filter_status();
        this.registeredFilters.push(filter);
        this.initializeFilters();
        this._recalculate_filter_status();
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
        this._recalculate_filter_status();
    }

    removeFilter(filterInstance: Filter) {
        const index = this.registeredFilters.indexOf(filterInstance as any);
        if(index === -1) return;

        const [ filter ] = this.registeredFilters.splice(index, 1);
        filter.finalize();
        filter.enabled = false;

        this.initializeFilters();
        this._recalculate_filter_status();
    }

    private _recalculate_filter_status() {
        let filtered = this.registeredFilters.filter(e => e.is_enabled()).filter(e => (e as JAbstractFilter<AudioNode>).active).length > 0;
        if(filtered === this._filter_active)
            return;

        this._filter_active = filtered;
        if(filtered) {
            if(this.callback_end)
                this.callback_end();
        } else {
            if(this.callback_begin)
                this.callback_begin();
        }
    }

    current_consumer(): InputConsumer | undefined {
        return this._current_consumer;
    }

    async set_consumer(consumer: InputConsumer) {
        if(this._current_consumer) {
            if(this._current_consumer.type == InputConsumerType.NODE) {
                if(this._source_node)
                    (this._current_consumer as NodeInputConsumer).callback_disconnect(this._source_node)
            } else if(this._current_consumer.type === InputConsumerType.CALLBACK) {
                if(this._source_node)
                    this._source_node.disconnect(this._consumer_callback_node);
            }
        }

        if(consumer) {
            if(consumer.type == InputConsumerType.CALLBACK) {
                if(this._source_node)
                    this._source_node.connect(this._consumer_callback_node);
            } else if(consumer.type == InputConsumerType.NODE) {
                if(this._source_node)
                    (consumer as NodeInputConsumer).callback_node(this._source_node);
            } else {
                throw "native callback consumers are not supported!";
            }
        }
        this._current_consumer = consumer;
    }

    private _switch_source_node(new_node: AudioNode) {
        if(this._current_consumer) {
            if(this._current_consumer.type == InputConsumerType.NODE) {
                const node_consumer = this._current_consumer as NodeInputConsumer;
                if(this._source_node)
                    node_consumer.callback_disconnect(this._source_node);
                if(new_node)
                    node_consumer.callback_node(new_node);
            } else if(this._current_consumer.type == InputConsumerType.CALLBACK) {
                this._source_node.disconnect(this._consumer_callback_node);
                if(new_node)
                    new_node.connect(this._consumer_callback_node);
            }
        }
        this._source_node = new_node;
    }

    get_volume(): number {
        return this._volume;
    }

    set_volume(volume: number) {
        if(volume === this._volume)
            return;
        this._volume = volume;
        this._volume_node.gain.value = volume;
    }
}

class JavascriptLevelmeter implements LevelMeter {
    private static _instances: JavascriptLevelmeter[] = [];
    private static _update_task: number;

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
        const _result = await JavascriptInput.request_media_stream(this._device.deviceId, this._device.groupId);
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

        JavascriptLevelmeter._instances.push(this);
        if(JavascriptLevelmeter._instances.length == 1) {
            clearInterval(JavascriptLevelmeter._update_task);
            JavascriptLevelmeter._update_task = setInterval(() => JavascriptLevelmeter._analyse_all(), JThresholdFilter.update_task_interval) as any;
        }
    }

    destroy() {
        JavascriptLevelmeter._instances.remove(this);
        if(JavascriptLevelmeter._instances.length == 0) {
            clearInterval(JavascriptLevelmeter._update_task);
            JavascriptLevelmeter._update_task = 0;
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
        for(const instance of [...this._instances])
            instance._analyse();
    }

    private _analyse() {
        this._analyser_node.getByteTimeDomainData(this._analyse_buffer);

        this._current_level = JThresholdFilter.process(this._analyse_buffer, this._analyser_node.fftSize, this._current_level, .75);
        if(this._callback)
            this._callback(this._current_level);
    }
}

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    function: async () => {
        inputDeviceList = new WebInputDeviceList();
    },
    priority: 80,
    name: "initialize media devices"
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    function: async () => {
        inputDeviceList.refresh().then(() => {});
    },
    priority: 10,
    name: "query media devices"
});