/// <reference path="../../declarations/imports_shared.d.ts"/>

interface MediaStream {
    stop();
}

namespace audio {
    export namespace recorder {
        let _queried_devices: JavascriptInputDevice[];
        let _queried_permissioned: boolean = false;

        export interface JavascriptInputDevice extends InputDevice {
            device_id: string;
            group_id: string;
        }

        async function query_devices() {
            const general_supported = !!getUserMediaFunctionPromise();

            try {
                const context = player.context();
                const devices = await navigator.mediaDevices.enumerateDevices();

                _queried_permissioned = false;
                if(devices.filter(e => !!e.label).length > 0)
                    _queried_permissioned = true;

                _queried_devices = devices.filter(e => e.kind === "audioinput").map((e: MediaDeviceInfo): JavascriptInputDevice => {
                    return {
                        channels: context ? context.destination.channelCount : 2,
                        sample_rate: context ? context.sampleRate : 44100,

                        default_input: e.deviceId == "default",

                        driver: "WebAudio",
                        name: e.label || "device-id{" + e.deviceId+ "}",

                        supported: general_supported,

                        device_id: e.deviceId,
                        group_id: e.groupId,

                        unique_id: e.deviceId
                    }
                });
                if(_queried_devices.length > 0 && _queried_devices.filter(e => e.default_input).length == 0)
                    _queried_devices[0].default_input = true;
            } catch(error) {
                log.error(LogCategory.AUDIO, tr("Failed to query microphone devices (%o)"), error);
                _queried_devices = [];
            }
        }

        export function devices() : InputDevice[] {
            if(typeof(_queried_devices) === "undefined")
                query_devices();

            return _queried_devices || [];
        }


        export function device_refresh_available() : boolean { return true; }
        export function refresh_devices() : Promise<void> { return query_devices(); }

        export function create_input() : AbstractInput { return new JavascriptInput(); }

        export async function create_levelmeter(device: InputDevice) : Promise<LevelMeter> {
            const meter = new JavascriptLevelmeter(device as any);
            await meter.initialize();
            return meter;
        }

        loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
            function: async () => { query_devices(); }, /* May wait for it? */
            priority: 10,
            name: "query media devices"
        });

        export namespace filter {
            export abstract class JAbstractFilter<NodeType extends AudioNode> implements Filter {
                type;

                source_node: AudioNode;
                audio_node: NodeType;

                context: AudioContext;
                enabled: boolean = false;

                active: boolean = false; /* if true the filter filters! */
                callback_active_change: (new_state: boolean) => any;

                abstract initialize(context: AudioContext, source_node: AudioNode);
                abstract finalize();

                is_enabled(): boolean {
                    return this.enabled;
                }
            }

            export class JThresholdFilter extends JAbstractFilter<GainNode> implements ThresholdFilter {
                public static update_task_interval = 20; /* 20ms */

                type = Type.THRESHOLD;
                callback_level?: (value: number) => any;

                private _threshold = 50;

                private _update_task: any;
                private _analyser: AnalyserNode;
                private _analyse_buffer: Uint8Array;

                private _silence_count = 0;
                private _margin_frames = 5;

                private _current_level = 0;
                private _smooth_release = 0;
                private _smooth_attack = 0;

                finalize() {
                    clearInterval(this._update_task);
                    this._update_task = 0;

                    if(this.source_node) {
                        try { this.source_node.disconnect(this._analyser) } catch (error) {}
                        try { this.source_node.disconnect(this.audio_node) } catch (error) {}
                    }

                    this._analyser = undefined;
                    this.source_node = undefined;
                    this.audio_node = undefined;
                    this.context = undefined;
                }

                initialize(context: AudioContext, source_node: AudioNode) {
                    this.context = context;
                    this.source_node = source_node;

                    this.audio_node = context.createGain();
                    this._analyser = context.createAnalyser();

                    const optimal_ftt_size = Math.ceil((source_node.context || context).sampleRate * (JThresholdFilter.update_task_interval / 1000));
                    const base2_ftt = Math.pow(2, Math.ceil(Math.log2(optimal_ftt_size)));
                    this._analyser.fftSize = base2_ftt;

                    if(!this._analyse_buffer || this._analyse_buffer.length < this._analyser.fftSize)
                        this._analyse_buffer = new Uint8Array(this._analyser.fftSize);

                    this.active = false;
                    this.audio_node.gain.value = 1;
                    this._update_task = setInterval(() => this._analyse(), JThresholdFilter.update_task_interval);

                    this.source_node.connect(this.audio_node);
                    this.source_node.connect(this._analyser);
                }

                get_margin_frames(): number { return this._margin_frames; }
                set_margin_frames(value: number) {
                    this._margin_frames = value;
                }

                get_attack_smooth(): number {
                    return this._smooth_attack;
                }

                get_release_smooth(): number {
                    return this._smooth_release;
                }

                set_attack_smooth(value: number) {
                    this._smooth_attack = value;
                }

                set_release_smooth(value: number) {
                    this._smooth_release = value;
                }



                get_threshold(): number {
                    return this._threshold;
                }

                set_threshold(value: number): Promise<void> {
                    this._threshold = value;
                    return Promise.resolve();
                }

                public static process(buffer: Uint8Array, ftt_size: number, previous: number, smooth: number) {
                    let level;
                    {
                        let total = 0, float, rms;

                        for(let index = 0; index < ftt_size; index++) {
                            float = ( buffer[index++] / 0x7f ) - 1;
                            total += (float * float);
                        }
                        rms = Math.sqrt(total / ftt_size);
                        let db  = 20 * ( Math.log(rms) / Math.log(10) );
                        // sanity check

                        db = Math.max(-192, Math.min(db, 0));
                        level = 100 + ( db * 1.92 );
                    }

                    return previous * smooth + level * (1 - smooth);
                }

                private _analyse() {
                    this._analyser.getByteTimeDomainData(this._analyse_buffer);

                    let smooth;
                    if(this._silence_count == 0)
                        smooth = this._smooth_release;
                    else
                        smooth = this._smooth_attack;

                    this._current_level = JThresholdFilter.process(this._analyse_buffer, this._analyser.fftSize, this._current_level, smooth);

                    this._update_gain_node();
                    if(this.callback_level)
                        this.callback_level(this._current_level);
                }

                private _update_gain_node() {
                    let state = false;
                    if(this._current_level > this._threshold) {
                        this._silence_count = 0;
                        state = true;
                    } else {
                        state = this._silence_count++ < this._margin_frames;
                    }
                    if(state) {
                        this.audio_node.gain.value = 1;
                        if(this.active) {
                            this.active = false;
                            this.callback_active_change(false);
                        }
                    } else {
                        this.audio_node.gain.value = 0;
                        if(!this.active) {
                            this.active = true;
                            this.callback_active_change(true);
                        }
                    }
                }
            }

            export class JStateFilter extends JAbstractFilter<GainNode> implements StateFilter {
                type = Type.STATE;

                finalize() {
                    if(this.source_node) {
                        try { this.source_node.disconnect(this.audio_node) } catch (error) {}
                    }

                    this.source_node = undefined;
                    this.audio_node = undefined;
                    this.context = undefined;
                }

                initialize(context: AudioContext, source_node: AudioNode) {
                    this.context = context;
                    this.source_node = source_node;

                    this.audio_node = context.createGain();
                    this.audio_node.gain.value = this.active ? 0 : 1;

                    this.source_node.connect(this.audio_node);
                }

                is_active(): boolean {
                    return this.active;
                }

                set_state(state: boolean): Promise<void> {
                    if(this.active === state)
                        return Promise.resolve();

                    this.active = state;
                    if(this.audio_node)
                        this.audio_node.gain.value = state ? 0 : 1;
                    this.callback_active_change(state);
                    return Promise.resolve();
                }
            }
        }

        class JavascriptInput implements AbstractInput {
            private _state: InputState = InputState.PAUSED;
            private _current_device: JavascriptInputDevice | undefined;
            private _current_consumer: InputConsumer;

            private _current_stream: MediaStream;
            private _current_audio_stream: MediaStreamAudioSourceNode;

            private _audio_context: AudioContext;
            private _source_node: AudioNode; /* last node which could be connected to the target; target might be the _consumer_node */
            private _consumer_callback_node: ScriptProcessorNode;
            private _volume_node: GainNode;
            private _mute_node: GainNode;

            private _filters: filter.Filter[] = [];
            private _filter_active: boolean = false;

            private _volume: number = 1;

            callback_begin: () => any = undefined;
            callback_end: () => any = undefined;

            constructor() {
                player.on_ready(() => this._audio_initialized());
            }

            private _audio_initialized() {
                this._audio_context = player.context();
                if(!this._audio_context)
                    return;

                this._mute_node = this._audio_context.createGain();
                this._mute_node.gain.value = 0;
                this._mute_node.connect(this._audio_context.destination);

                this._consumer_callback_node = this._audio_context.createScriptProcessor(1024 * 4);
                this._consumer_callback_node.addEventListener('audioprocess', event => this._audio_callback(event));
                this._consumer_callback_node.connect(this._mute_node);

                this._volume_node = this._audio_context.createGain();
                this._volume_node.gain.value = this._volume;

                if(this._state === InputState.INITIALIZING)
                    this.start();
            }

            private _initialize_filters() {
                const filters = this._filters as any as filter.JAbstractFilter<AudioNode>[];
                for(const filter of filters) {
                    if(filter.is_enabled())
                        filter.finalize();
                }

                if(this._audio_context && this._volume_node) {
                    const active_filter = filters.filter(e => e.is_enabled());
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
                const promise = (this._running_request = this.request_media_stream0(device_id, group_id));
                try {
                    return await this._running_request;
                } finally {
                    if(this._running_request === promise)
                        this._running_request = undefined;
                }
            }

            static async request_media_stream0(device_id: string, group_id: string) : Promise<MediaStream | InputStartResult> {
                const media_function = getUserMediaFunctionPromise();
                if(!media_function) return InputStartResult.ENOTSUPPORTED;

                try {
                    log.info(LogCategory.AUDIO, tr("Requesting a microphone stream for device %s in group %s"), device_id, group_id);

                    const audio_constrains: MediaTrackConstraints = {};
                    audio_constrains.deviceId = device_id;
                    audio_constrains.groupId = group_id;

                    audio_constrains.echoCancellation = true;
                    /* may supported */ (audio_constrains as any).autoGainControl = true;
                    /* may supported */ (audio_constrains as any).noiseSuppression = true;
                    /* disabled because most the time we get a OverconstrainedError */ //audio_constrains.sampleSize = {min: 420, max: 960 * 10, ideal: 960};

                    const stream = await media_function({audio: audio_constrains, video: undefined});
                    if(!_queried_permissioned) query_devices(); /* we now got permissions, requery devices */
                    return stream;
                } catch(error) {
                    if('name' in error) {
                        if(error.name === "NotAllowedError") {
                            //createErrorModal(tr("Failed to create microphone"), tr("Microphone recording failed. Please allow TeaWeb access to your microphone")).open();
                            //FIXME: Move this to somewhere else!

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

                    const _result = await JavascriptInput.request_media_stream(this._current_device.device_id, this._current_device.group_id);
                    if(!(_result instanceof MediaStream)) {
                        this._state = InputState.PAUSED;
                        return _result;
                    }
                    this._current_stream = _result;

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
                if(this._current_audio_stream)
                    this._current_audio_stream.disconnect();

                if(this._current_stream) {
                    if(this._current_stream.stop)
                        this._current_stream.stop();
                    else
                        this._current_stream.getTracks().forEach(value => {
                            value.stop();
                        });
                }

                this._current_stream = undefined;
                this._current_audio_stream = undefined;
                return undefined;
            }


            current_device(): InputDevice | undefined {
                return this._current_device;
            }

            async set_device(device: InputDevice | undefined) {
                if(this._current_device === device)
                    return;


                const saved_state = this._state;
                try {
                    await this.stop();
                } catch(error) {
                    log.warn(LogCategory.AUDIO, tr("Failed to stop previous record session (%o)"), error);
                }

                this._current_device = device as any; /* TODO: Test for device_id and device_group */
                if(!device) {
                    this._state = saved_state === InputState.PAUSED ? InputState.PAUSED : InputState.DRY;
                    return;
                }

                if(saved_state !== InputState.PAUSED) {
                    try {
                        await this.start()
                    } catch(error) {
                        log.warn(LogCategory.AUDIO, tr("Failed to start new recording stream (%o)"), error);
                        throw "failed to start record";
                    }
                }
                return;
            }


            get_filter(type: filter.Type): filter.Filter | undefined {
                for(const filter of this._filters)
                    if(filter.type == type)
                        return filter;

                let new_filter: filter.JAbstractFilter<AudioNode>;
                switch (type) {
                    case filter.Type.STATE:
                        new_filter = new filter.JStateFilter();
                        break;
                    case filter.Type.VOICE_LEVEL:
                        throw "voice filter isn't supported!";
                    case filter.Type.THRESHOLD:
                        new_filter = new filter.JThresholdFilter();
                        break;
                    default:
                        throw "invalid filter type, or type isn't implemented! (" + type + ")";
                }

                new_filter.callback_active_change = () => this._recalculate_filter_status();
                this._filters.push(new_filter as any);
                this.enable_filter(type);
                return new_filter as any;
            }

            supports_filter(type: audio.recorder.filter.Type) : boolean {
                switch (type) {
                    case audio.recorder.filter.Type.THRESHOLD:
                    case audio.recorder.filter.Type.STATE:
                        return true;
                    default:
                        return false;
                }
            }

            private find_filter(type: filter.Type) : filter.JAbstractFilter<AudioNode> | undefined {
                for(const filter of this._filters)
                    if(filter.type == type)
                        return filter as any;
                return undefined;
            }

            clear_filter() {
                for(const _filter of this._filters) {
                    if(!_filter.is_enabled())
                        continue;
                    const c_filter = _filter as any as filter.JAbstractFilter<AudioNode>;
                    c_filter.finalize();
                    c_filter.enabled = false;
                }

                this._initialize_filters();
                this._recalculate_filter_status();
            }

            disable_filter(type: filter.Type) {
                const filter = this.find_filter(type);
                if(!filter) return;

                /* test if the filter is active */
                if(!filter.is_enabled())
                    return;

                filter.enabled = false;
                filter.finalize();
                this._initialize_filters();
                this._recalculate_filter_status();
            }

            enable_filter(type: filter.Type) {
                const filter = this.get_filter(type) as any as filter.JAbstractFilter<AudioNode>;
                if(filter.is_enabled())
                    return;

                filter.enabled = true;
                this._initialize_filters();
                this._recalculate_filter_status();
            }

            private _recalculate_filter_status() {
                let filtered = this._filters.filter(e => e.is_enabled()).filter(e => (e as any as filter.JAbstractFilter<AudioNode>).active).length > 0;
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

            readonly _device: JavascriptInputDevice;

            private _callback: (num: number) => any;

            private _context: AudioContext;
            private _gain_node: GainNode;
            private _source_node: MediaStreamAudioSourceNode;
            private _analyser_node: AnalyserNode;

            private _media_stream: MediaStream;

            private _analyse_buffer: Uint8Array;

            private _current_level = 0;

            constructor(device: JavascriptInputDevice) {
                this._device = device;
            }

            async initialize() {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(reject, 5000);
                        player.on_ready(() => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    });
                } catch(error) {
                    throw tr("audio context timeout");
                }
                this._context = player.context();
                if(!this._context) throw tr("invalid context");

                this._gain_node = this._context.createGain();
                this._gain_node.gain.setValueAtTime(0, 0);

                /* analyser node */
                this._analyser_node = this._context.createAnalyser();

                const optimal_ftt_size = Math.ceil(this._context.sampleRate * (filter.JThresholdFilter.update_task_interval / 1000));
                this._analyser_node.fftSize = Math.pow(2, Math.ceil(Math.log2(optimal_ftt_size)));

                if(!this._analyse_buffer || this._analyse_buffer.length < this._analyser_node.fftSize)
                    this._analyse_buffer = new Uint8Array(this._analyser_node.fftSize);

                /* starting stream */
                const _result = await JavascriptInput.request_media_stream(this._device.device_id, this._device.group_id);
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
                    JavascriptLevelmeter._update_task = setInterval(() => JavascriptLevelmeter._analyse_all(), filter.JThresholdFilter.update_task_interval) as any;
                }
            }

            destory() {
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

            device(): audio.recorder.InputDevice {
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

                this._current_level = filter.JThresholdFilter.process(this._analyse_buffer, this._analyser_node.fftSize, this._current_level, .75);
                if(this._callback)
                    this._callback(this._current_level);
            }
        }
    }
}