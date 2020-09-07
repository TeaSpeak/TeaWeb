import {FilterType, StateFilter, ThresholdFilter} from "tc-shared/voice/Filter";

export abstract class JAbstractFilter<NodeType extends AudioNode> {
    readonly priority: number;

    source_node: AudioNode;
    audioNode: NodeType;

    context: AudioContext;
    enabled: boolean = false;

    active: boolean = false; /* if true the filter filters! */

    callback_active_change: (new_state: boolean) => any;
    callback_enabled_change: () => any;

    paused: boolean = true;

    constructor(priority: number) {
        this.priority = priority;
    }

    /* Attention: After initialized, paused is the default state */
    abstract initialize(context: AudioContext, sourceNode: AudioNode);
    abstract finalize();

    /* whatever the input has been paused and we don't expect any input */
    abstract setPaused(flag: boolean);
    abstract isPaused() : boolean;

    isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(flag: boolean) {
        this.enabled = flag;

        if(this.callback_enabled_change) {
            this.callback_enabled_change();
        }
    }
}

export class JThresholdFilter extends JAbstractFilter<GainNode> implements ThresholdFilter {
    public static update_task_interval = 20; /* 20ms */

    readonly type = FilterType.THRESHOLD;

    private threshold = 50;

    private analyzeTask: any;
    private audioAnalyserNode: AnalyserNode;
    private analyseBuffer: Uint8Array;

    private silenceCount = 0;
    private marginFrames = 5;

    private currentLevel = 0;
    private smoothRelease = 0;
    private smoothAttack = 0;

    private levelCallbacks: ((level: number) => void)[] = [];

    finalize() {
        this.paused = true;
        this.shutdownAnalyzer();

        if(this.source_node) {
            try { this.source_node.disconnect(this.audioAnalyserNode) } catch (error) {}
            try { this.source_node.disconnect(this.audioNode) } catch (error) {}
        }

        this.audioAnalyserNode = undefined;
        this.source_node = undefined;
        this.audioNode = undefined;
        this.context = undefined;
    }

    initialize(context: AudioContext, source_node: AudioNode) {
        this.paused = true;

        this.context = context;
        this.source_node = source_node;

        this.audioNode = context.createGain();
        this.audioAnalyserNode = context.createAnalyser();

        const optimal_ftt_size = Math.ceil((source_node.context || context).sampleRate * (JThresholdFilter.update_task_interval / 1000));
        const base2_ftt = Math.pow(2, Math.ceil(Math.log2(optimal_ftt_size)));
        this.audioAnalyserNode.fftSize = base2_ftt;

        if(!this.analyseBuffer || this.analyseBuffer.length < this.audioAnalyserNode.fftSize)
            this.analyseBuffer = new Uint8Array(this.audioAnalyserNode.fftSize);

        this.active = false;
        this.audioNode.gain.value = 0; /* silence by default */

        this.source_node.connect(this.audioNode);
        this.source_node.connect(this.audioAnalyserNode);
    }

    getMarginFrames(): number { return this.marginFrames; }
    setMarginFrames(value: number) {
        this.marginFrames = value;
    }

    getAttackSmooth(): number {
        return this.smoothAttack;
    }

    getReleaseSmooth(): number {
        return this.smoothRelease;
    }

    setAttackSmooth(value: number) {
        this.smoothAttack = value;
    }

    setReleaseSmooth(value: number) {
        this.smoothRelease = value;
    }

    getThreshold(): number {
        return this.threshold;
    }

    setThreshold(value: number) {
        this.threshold = value;
        this.updateGainNode(false);
    }

    public static calculateAudioLevel(buffer: Uint8Array, fttSize: number, previous: number, smooth: number) : number {
        let level;
        {
            let total = 0, float, rms;

            for(let index = 0; index < fttSize; index++) {
                float = ( buffer[index++] / 0x7f ) - 1;
                total += (float * float);
            }
            rms = Math.sqrt(total / fttSize);
            let db  = 20 * ( Math.log(rms) / Math.log(10) );
            // sanity check

            db = Math.max(-192, Math.min(db, 0));
            level = 100 + ( db * 1.92 );
        }

        return previous * smooth + level * (1 - smooth);
    }

    private analyzeAnalyseBuffer() {
        if(!this.audioNode || !this.audioAnalyserNode)
            return;

        this.audioAnalyserNode.getByteTimeDomainData(this.analyseBuffer);

        let smooth;
        if(this.silenceCount == 0)
            smooth = this.smoothRelease;
        else
            smooth = this.smoothAttack;

        this.currentLevel = JThresholdFilter.calculateAudioLevel(this.analyseBuffer, this.audioAnalyserNode.fftSize, this.currentLevel, smooth);

        this.updateGainNode(true);
        for(const callback of this.levelCallbacks)
            callback(this.currentLevel);
    }

    private updateGainNode(increaseSilenceCount: boolean) {
        if(!this.audioNode) {
            return;
        }

        let state;
        if(this.currentLevel > this.threshold) {
            this.silenceCount = 0;
            state = true;
        } else {
            state = this.silenceCount < this.marginFrames;
            if(increaseSilenceCount)
                this.silenceCount++;
        }

        if(state) {
            this.audioNode.gain.value = 1;
            if(this.active) {
                this.active = false;
                this.callback_active_change(false);
            }
        } else {
            this.audioNode.gain.value = 0;
            if(!this.active) {
                this.active = true;
                this.callback_active_change(true);
            }
        }
    }

    isPaused(): boolean {
        return this.paused;
    }

    setPaused(flag: boolean) {
        if(flag === this.paused) {
            return;
        }

        this.paused = flag;

        if(!this.paused) {
            this.initializeAnalyzer();
        }
    }

    registerLevelCallback(callback: (value: number) => void) {
        this.levelCallbacks.push(callback);
    }

    removeLevelCallback(callback: (value: number) => void) {
        this.levelCallbacks.remove(callback);
    }

    private initializeAnalyzer() {
        if(this.analyzeTask || !this.audioNode) {
            return;
        }

        /* by default we're consuming the input */
        this.active = true;
        this.audioNode.gain.value = 0;

        this.analyzeTask = setInterval(() => this.analyzeAnalyseBuffer(), JThresholdFilter.update_task_interval);
    }

    private shutdownAnalyzer() {
        clearInterval(this.analyzeTask);
        this.analyzeTask = undefined;
    }
}

export class JStateFilter extends JAbstractFilter<GainNode> implements StateFilter {
    public readonly type = FilterType.STATE;

    finalize() {
        if(this.source_node) {
            try { this.source_node.disconnect(this.audioNode) } catch (error) {}
        }

        this.source_node = undefined;
        this.audioNode = undefined;
        this.context = undefined;
    }

    initialize(context: AudioContext, source_node: AudioNode) {
        this.context = context;
        this.source_node = source_node;

        this.audioNode = context.createGain();
        this.audioNode.gain.value = this.active ? 0 : 1;

        this.source_node.connect(this.audioNode);
    }

    isActive(): boolean {
        return this.active;
    }

    setState(state: boolean) {
        if(this.active === state)
            return;

        this.active = state;
        if(this.audioNode)
            this.audioNode.gain.value = state ? 0 : 1;
        this.callback_active_change(state);
    }

    isPaused(): boolean {
        return this.paused;
    }

    setPaused(flag: boolean) {
        this.paused = flag;
    }
}