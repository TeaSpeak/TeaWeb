class A {
    constructor() {}

    a() : void{ }
}

namespace B {
    export class C {
        constructor() {}

        a() : void{ }

        get c() { return undefined; }
        set c(_) {  }
    }
}


declare class XXX {
    private static _audioInstances;
    private static _globalReplayScheduler;
    private static _timeIndex;
    private static _audioDestinationStream;
    static initializeAudioController(): void;
    speakerContext: AudioContext;
    private playerState;
    private audioCache;
    private playingAudioCache;
    private _volume;
    private _codecCache;
    private _timeIndex;
    private _latencyBufferLength;
    private _buffer_timeout;
    allowBuffering: boolean;
    onSpeaking: () => void;
    onSilence: () => void;
    constructor();
    initialize(): void;
    close(): void;
    playBuffer(buffer: AudioBuffer): void;
    private playQueue;
    private removeNode;
    stopAudio(now?: boolean): void;
    private testBufferQueue;
    private reset_buffer_timeout;
    volume: number;
    private applyVolume;
    codecCache(codec: number): CodecClientCache;
}