import {FilterType, StateFilter, ThresholdFilter} from "tc-shared/voice/Filter";

export abstract class JAbstractFilter<NodeType extends AudioNode> {
    readonly priority: number;

    source_node: AudioNode;
    audio_node: NodeType;

    context: AudioContext;
    enabled: boolean = false;

    active: boolean = false; /* if true the filter filters! */
    callback_active_change: (new_state: boolean) => any;

    paused: boolean = true;

    constructor(priority: number) {
        this.priority = priority;
    }

    abstract initialize(context: AudioContext, source_node: AudioNode);
    abstract finalize();

    /* whatever the input has been paused and we don't expect any input */
    abstract set_pause(flag: boolean);

    is_enabled(): boolean {
        return this.enabled;
    }

    set_enabled(flag: boolean) {
        this.enabled = flag;
    }
}

export class JThresholdFilter extends JAbstractFilter<GainNode> implements ThresholdFilter {
    public static update_task_interval = 20; /* 20ms */

    readonly type = FilterType.THRESHOLD;
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
        this.set_pause(true);

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

        this.source_node.connect(this.audio_node);
        this.source_node.connect(this._analyser);

        /* force update paused state */
        this.set_pause(!(this.paused = !this.paused));
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
        let state;
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

    set_pause(flag: boolean) {
        if(flag === this.paused) return;
        this.paused = flag;

        if(this.paused) {
            clearInterval(this._update_task);
            this._update_task = undefined;

            if(this.active) {
                this.active = false;
                this.callback_active_change(false);
            }
        } else {
            if(!this._update_task && this._analyser)
                this._update_task = setInterval(() => this._analyse(), JThresholdFilter.update_task_interval);
        }
    }
}

export class JStateFilter extends JAbstractFilter<GainNode> implements StateFilter {
    public readonly type = FilterType.STATE;

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

    set_pause(flag: boolean) {
        this.paused = flag;
    }
}