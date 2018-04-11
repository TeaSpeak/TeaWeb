var PlayerState;
(function (PlayerState) {
    PlayerState[PlayerState["PREBUFFERING"] = 0] = "PREBUFFERING";
    PlayerState[PlayerState["PLAYING"] = 1] = "PLAYING";
    PlayerState[PlayerState["BUFFERING"] = 2] = "BUFFERING";
    PlayerState[PlayerState["STOPPING"] = 3] = "STOPPING";
    PlayerState[PlayerState["STOPPED"] = 4] = "STOPPED";
})(PlayerState || (PlayerState = {}));
class AudioController {
    constructor() {
        this.playerState = PlayerState.STOPPED;
        this.audioCache = [];
        this.playingAudioCache = [];
        this._volume = 1;
        this._codecCache = [];
        this._timeIndex = 0;
        this.allowBuffering = true;
        this.speakerContext = AudioController.globalContext;
        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }
    static get globalContext() {
        if (this._globalContext)
            return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }
    static initializeAudioController() {
        //this._globalReplayScheduler = setInterval(() => { AudioController.invokeNextReplay(); }, 20); //Fix me
    }
    initialize() {
        AudioController._audioInstances.push(this);
    }
    close() {
        AudioController._audioInstances.remove(this);
    }
    playBuffer(buffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isn't equal to playback sample rate! (" + buffer.sampleRate + " | " + this.speakerContext.sampleRate + ")");
        this.applayVolume(buffer);
        this.audioCache.push(buffer);
        if (this.playerState == PlayerState.STOPPED || this.playerState == PlayerState.STOPPING) {
            console.log("[Audio] Starting new playback");
            this.playerState = PlayerState.PREBUFFERING;
            //New audio
        }
        switch (this.playerState) {
            case PlayerState.PREBUFFERING:
            case PlayerState.BUFFERING:
                if (this.audioCache.length < 3) {
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
                this.playerState = PlayerState.PLAYING;
            case PlayerState.PLAYING:
                this.playQueue();
                break;
            default:
                break;
        }
    }
    playQueue() {
        let buffer;
        while (buffer = this.audioCache.pop_front()) {
            if (this._timeIndex < this.speakerContext.currentTime)
                this._timeIndex = this.speakerContext.currentTime;
            let player = this.speakerContext.createBufferSource();
            player.buffer = buffer;
            player.onended = () => this.removeNode(player);
            this.playingAudioCache.push(player);
            player.connect(this.speakerContext.destination);
            player.start(this._timeIndex);
            this._timeIndex += buffer.duration;
        }
    }
    removeNode(node) {
        this.playingAudioCache.remove(node);
        this.testBufferQueue();
    }
    stopAudio(now = false) {
        this.playerState = PlayerState.STOPPING;
        if (now) {
            this.playerState = PlayerState.STOPPED;
            this.audioCache = [];
            for (let entry of this.playingAudioCache)
                entry.stop(0);
            this.playingAudioCache = [];
        }
        this.testBufferQueue();
    }
    testBufferQueue() {
        if (this.audioCache.length == 0 && this.playingAudioCache.length == 0) {
            if (this.playerState != PlayerState.STOPPING) {
                this.playerState = PlayerState.BUFFERING;
                if (!this.allowBuffering)
                    console.warn("[Audio] Detected a buffer underflow!");
            }
            else {
                this.playerState = PlayerState.STOPPED;
                this.onSilence();
            }
        }
    }
    get volume() { return this._volume; }
    set volume(val) {
        if (this._volume == val)
            return;
        this._volume = val;
        for (let buffer of this.audioCache)
            this.applayVolume(buffer);
    }
    applayVolume(buffer) {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            let data = buffer.getChannelData(channel);
            for (let sample = 0; sample < data.length; sample++) {
                let lane = data[sample];
                lane *= this._volume;
                data[sample] = lane;
            }
        }
    }
    codecCache(codec) {
        while (this._codecCache.length <= codec)
            this._codecCache.push(new CodecClientCache());
        return this._codecCache[codec];
    }
}
AudioController._audioInstances = [];
AudioController._timeIndex = 0;
//# sourceMappingURL=AudioController.js.map