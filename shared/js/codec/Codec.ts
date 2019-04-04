interface CodecCostructor {
    new (codecSampleRate: number) : Codec;
}

enum CodecType {
    OPUS_VOICE,
    OPUS_MUSIC,

    SPEEX_NARROWBAND,
    SPEEX_WIDEBAND,
    SPEEX_ULTRA_WIDEBAND,
    CELT_MONO
}

class BufferChunk {
    buffer: AudioBuffer;
    index: number;

    constructor(buffer: AudioBuffer) {
        this.buffer = buffer;
        this.index = 0;
    }

    copyRangeTo(target: AudioBuffer, maxLength: number, offset: number) {
        let copy = Math.min(this.buffer.length - this.index, maxLength);
        //TODO may warning if channel counts are not queal?
        for(let channel = 0; channel < Math.min(target.numberOfChannels, this.buffer.numberOfChannels); channel++) {
            target.getChannelData(channel).set(
                this.buffer.getChannelData(channel).subarray(this.index, this.index + copy),
                offset
            );
        }
        return copy;
    }
}

class CodecClientCache {
    _last_access: number;
    _chunks: BufferChunk[] = [];

    bufferedSamples(max: number = 0) : number {
        let value = 0;
        for(let i = 0; i < this._chunks.length && value < max; i++)
            value += this._chunks[i].buffer.length - this._chunks[i].index;
        return value;
    }
}

interface Codec {
    on_encoded_data: (Uint8Array) => void;

    channelCount: number;
    samplesPerUnit: number;

    name() : string;
    initialise();
    deinitialise();

    decodeSamples(cache: CodecClientCache, data: Uint8Array) : Promise<AudioBuffer>;
    encodeSamples(cache: CodecClientCache, pcm: AudioBuffer);

    reset() : boolean;
}