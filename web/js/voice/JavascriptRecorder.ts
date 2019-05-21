/// <reference path="../../declarations/imports_shared.d.ts"/>

namespace audio {
    export namespace recorder {
        /* TODO: Recognise if we got device permission and update list */
        let _queried_devices: JavascriptInputDevice[];

        export interface JavascriptInputDevice extends InputDevice {
            device_id: string;
            group_id: string;
        }

        async function query_devices() {
            const general_supported = !!getUserMediaFunction();

            try {
                const context = player.context();
                const devices = await navigator.mediaDevices.enumerateDevices();

                _queried_devices = devices.filter(e => e.kind === "audioinput").map((e: MediaDeviceInfo): JavascriptInputDevice => {
                    return {
                        channels: context ? context.destination.channelCount : 2,
                        sample_rate: context ? context.sampleRate : 44100,

                        default_input: e.deviceId == "default",
                        name: e.label || "device-id{" + e.deviceId+ "}",

                        supported: general_supported,

                        device_id: e.deviceId,
                        group_id: e.groupId,

                        unique_id: e.groupId + "-" + e.deviceId
                    }
                });
            } catch(error) {
                console.warn(tr("Failed to query microphone devices (%o)"), error);
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

        query_devices(); /* general query */

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
                private static update_task_interval = 20; /* 20ms */

                type = Type.THRESHOLD;
                callback_level?: (value: number) => any;

                private _threshold = 50;

                private _update_task: any;
                private _analyser: AnalyserNode;
                private _analyse_buffer: Uint8Array;

                private _silence_count = 0;
                private _margin_frames = 5;

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

                get_threshold(): number {
                    return this._threshold;
                }

                set_threshold(value: number): Promise<void> {
                    this._threshold = value;
                    return Promise.resolve();
                }

                private _analyse() {
                    let level;
                    {
                        let total = 0, float, rms;
                        this._analyser.getByteTimeDomainData(this._analyse_buffer);

                        for(let index = 0; index < this._analyser.fftSize; index++) {
                            float = ( this._analyse_buffer[index++] / 0x7f ) - 1;
                            total += (float * float);
                        }
                        rms = Math.sqrt(total / this._analyser.fftSize);
                        let db  = 20 * ( Math.log(rms) / Math.log(10) );
                        // sanity check

                        db = Math.max(-192, Math.min(db, 0));
                        level = 100 + ( db * 1.92 );
                    }

                    let state = false;
                    if(level > this._threshold) {
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

                    if(this.callback_level)
                        this.callback_level(level);
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
            private _mute_node: GainNode;

            private _filters: filter.Filter[] = [];
            private _filter_active: boolean = false;

            callback_state_change: () => any = undefined;
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

                if(this._state === InputState.INITIALIZING)
                    this.start();
            }

            private _initialize_filters() {
                const filters = this._filters as any as filter.JAbstractFilter<AudioNode>[];
                for(const filter of filters) {
                    if(filter.is_enabled())
                        filter.finalize();
                }

                if(this._audio_context && this._current_audio_stream) {
                    const active_filter = filters.filter(e => e.is_enabled());
                    let stream: AudioNode = this._current_audio_stream;
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
                    console.warn(tr("AudioInput has callback buffer, but this isn't supported yet!"));
                }
            }

            current_state() : InputState { return this._state; };

            async start() {
                this._state = InputState.INITIALIZING;
                if(!this._current_device)
                    return;

                if(!this._audio_context)
                    return;

                try {
                    const media_function = getUserMediaFunction();
                    if(!media_function)
                        throw tr("recording isn't supported");

                    try {
                        this._current_stream = await new Promise<MediaStream>((resolve, reject) => {
                            media_function({
                                audio: {
                                    deviceId: this._current_device.device_id,
                                    groupId: this._current_device.group_id,

                                    echoCancellation: true /* enable by default */
                                },
                                video: false
                            }, stream => resolve(stream), error => reject(error));
                        });
                    } catch(error) {
                        if(error instanceof DOMException) {
                            if(error.code == 0 || error.name == "NotAllowedError") {
                                console.warn(tr("Browser does not allow microphone access"));
                                this._state = InputState.PAUSED;
                                createErrorModal(tr("Failed to create microphone"), tr("Microphone recording failed. Please allow TeaWeb access to your microphone")).open();
                                return;
                            }
                        }
                        console.warn(tr("Failed to initialize recording stream (%o)"), error);
                        throw tr("record stream initialisation failed");
                    }

                    this._current_audio_stream = this._audio_context.createMediaStreamSource(this._current_stream);
                    this._initialize_filters();
                    this._state = InputState.RECORDING;
                } catch(error) {
                    this._state = InputState.PAUSED;
                    throw error;
                }
                return undefined;
            }

            async stop() {
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
                this._initialize_filters();
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
                    console.warn(tr("Failed to stop previous record session (%o)"), error);
                }

                this._current_device = device as any; /* TODO: Test for device_id and device_group */
                if(!device) {
                    this._state = InputState.PAUSED;
                    return;
                }

                if(saved_state == InputState.DRY || saved_state == InputState.INITIALIZING || saved_state == InputState.RECORDING) {
                    try {
                        await this.start()
                    } catch(error) {
                        console.warn(tr("Failed to start new recording stream (%o)"), error);
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

            private previous_filter(type: filter.Type) : filter.JAbstractFilter<AudioNode> | undefined {
                for(let index = 1; index < this._filters.length; index++)
                    if(this._filters[index].type === type)
                        return this._filters.slice(0, index).reverse().find(e => e.is_enabled()) as any;
                return undefined;
            }

            private next_filter(type: filter.Type) : filter.JAbstractFilter<AudioNode> | undefined {
                for(let index = 0; index < this._filters.length - 1; index++)
                    if(this._filters[index].type === type)
                        return this._filters.slice(index + 1).find(e => e.is_enabled()) as any;
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
        }
    }
}