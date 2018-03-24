var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["PREBUFFERING"] = 0] = "PREBUFFERING";
    PlayerState[PlayerState["PLAYING"] = 1] = "PLAYING";
    PlayerState[PlayerState["BUFFERING"] = 2] = "BUFFERING";
    PlayerState[PlayerState["STOPPED"] = 3] = "STOPPED";
})(PlayerState || (PlayerState = {}));
class AudioController {
    constructor() {
        this.timeIndex = 0;
        this.playerState = PlayerState.STOPPED;
        this._playingSources = [];
        this.allowBuffering = true;
        this.speakerContext = AudioController.globalContext;
        this.audioCache = [];
        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }
    static get globalContext() {
        if (this._globalContext)
            return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }
    playBuffer(buffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isn't equal to playback sample rate!");
        this.audioCache.push(buffer);
        if (this.playerState == PlayerState.STOPPED) {
            console.log("[Audio] Starting new playback");
            this.playerState = PlayerState.PREBUFFERING;
            //New audio
        }
        switch (this.playerState) {
            case PlayerState.PREBUFFERING:
            case PlayerState.BUFFERING:
                if (this.audioCache.length < 5) {
                    if (this.playerState == PlayerState.BUFFERING) {
                        if (this.allowBuffering)
                            break;
                    }
                    else
                        break;
                }
                if (this.playerState == PlayerState.PREBUFFERING) {
                    console.log("[Audio] Prebuffering succeeded (Replaying now)");
                    this.onSpeaking();
                }
                else {
                    if (this.allowBuffering)
                        console.log("[Audio] Buffering succeeded (Replaying now)");
                }
                this.timeIndex = 0; //Instant replay
                this.playerState = PlayerState.PLAYING;
            case PlayerState.PLAYING:
                this.playCache(this.audioCache);
                break;
            default:
                break;
        }
    }
    playCache(cache) {
        while (cache.length) {
            let buffer = cache.shift();
            let source = this.speakerContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.speakerContext.destination);
            source.onended = () => {
                this._playingSources.remove(source);
                this.testBufferQueue();
            };
            if (this.timeIndex == 0) {
                this.timeIndex = this.speakerContext.currentTime;
                console.log("New next time!");
            }
            source.start(this.timeIndex);
            this.timeIndex += source.buffer.duration;
            this._playingSources.push(source);
        }
    }
    ;
    stopAudio(now = false) {
        this.playerState = PlayerState.STOPPED;
        if (now) {
            for (let e of this._playingSources)
                e.stop();
            this._playingSources = [];
        }
    }
    testBufferQueue() {
        if (this._playingSources.length == 0) {
            if (this.playerState != PlayerState.STOPPED) {
                this.playerState = PlayerState.BUFFERING;
                if (!this.allowBuffering)
                    console.warn("[Audio] Detected a buffer underflow!");
            }
            else
                this.onSilence();
        }
    }
    close() {
    }
}
//# sourceMappingURL=AudioController.js.map