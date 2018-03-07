class AudioController {
    private static _globalContext;
    static get globalContext() : AudioContext {
        if(this._globalContext) return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }

    speakerContext: AudioContext;
    nextTime: number;
    last: number;
    audioCache: AudioBuffer[];
    init: boolean;
    private _audioStopped: boolean = true;
    //Events
    onSpeaking: () => void;
    onSilence: () => void;

    constructor() {
        this.speakerContext = AudioController.globalContext;
        this.nextTime = 0;
        this.last = 0;
        this.audioCache = [];
        this.init = false;

        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }

    play(buffer: AudioBuffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isn't equal to playback sample rate!");
        this.audioCache.push(buffer);

        let currentTime = new Date().getTime();
        if (this._audioStopped && !this.init) {
            this.nextTime = 0;
            this.init = true;
            console.log("[Audio] New data");
        }
        this.last = currentTime;


        if (this.init && this.audioCache.length > 5) {
            this.onSpeaking();
            this.playCache(this.audioCache);
            this.init = false;
            console.log("[Audio] Prebuffering succeeded (Replaying now)");
        } else if (!this.init) {
            this.playCache(this.audioCache);
        }
    }

    private _playingSources: AudioBufferSourceNode[] = [];
    playCache(cache) {
        while (cache.length) {
            let buffer = cache.shift();
            let source = this.speakerContext.createBufferSource();

            source.buffer = buffer;
            source.connect(this.speakerContext.destination);
            source.onended = () => {
                this._playingSources.remove(source);
                this.testPlayback();
            };
            if (this.nextTime == 0) {
                this._audioStopped = false;
                this.nextTime = this.speakerContext.currentTime;
                console.log("New next time!");
            }
            source.start(this.nextTime);
            this.nextTime += source.buffer.duration;
            this._playingSources.push(source);
        }
    };

    stopAudio(now: boolean = false) {
        if(now) {
            for(let e of this._playingSources)
                e.stop();
            this._playingSources = [];
            this.testPlayback();
        }
    }

    private testPlayback() {
        if(this._playingSources.length == 0) {
            this.onSilence();
            this._audioStopped = true;
        }
    }

    close(){

    }
}