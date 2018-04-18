/// <reference path="Codec.ts"/>

abstract class BasicCodec implements Codec {
    protected _audioContext: OfflineAudioContext;
    protected _decodeResampler: AudioResampler;
    protected _encodeResampler: AudioResampler;
    protected _codecSampleRate: number;

    on_encoded_data: (Uint8Array) => void = $ => {};
    channelCount: number = 1;
    samplesPerUnit: number = 960;

    constructor(codecSampleRate: number) {
        this.channelCount = 1;
        this.samplesPerUnit = 960;
        this._audioContext = new OfflineAudioContext(1, 1024,44100 );
        this._codecSampleRate = codecSampleRate;
        this._decodeResampler = new AudioResampler(AudioController.globalContext.sampleRate);
        this._encodeResampler = new AudioResampler(codecSampleRate);
    }

    abstract name() : string;
    abstract initialise();
    abstract deinitialise();
    abstract reset() : boolean;

    protected abstract decode(data: Uint8Array) : Promise<AudioBuffer>;
    protected abstract encode(data: AudioBuffer) : Promise<Uint8Array | string>;


    encodeSamples(cache: CodecClientCache, pcm: AudioBuffer) {
        this._encodeResampler.resample(pcm).then(buffer => this.encodeSamples0(cache, buffer))
            .catch(error => console.error("Could not resample PCM data for codec. Error:" + error));

    }

    private encodeSamples0(cache: CodecClientCache, buffer: AudioBuffer) {
        cache._chunks.push(new BufferChunk(buffer)); //TODO multi channel!

        while(cache.bufferedSamples(this.samplesPerUnit) >= this.samplesPerUnit) {
            let buffer = this._audioContext.createBuffer(this.channelCount, this.samplesPerUnit, this._codecSampleRate);
            let index = 0;
            while(index < this.samplesPerUnit) {
                let buf = cache._chunks[0];
                let cpyBytes = buf.copyRangeTo(buffer, this.samplesPerUnit - index, index);
                index += cpyBytes;
                buf.index += cpyBytes;
                if(buf.index == buf.buffer.length)
                    cache._chunks.pop_front();
            }

            let encodeBegin = new Date().getTime();
            this.encode(buffer).then(result => {
                if(result instanceof Uint8Array) {
                    if(new Date().getTime() - 20 > encodeBegin)
                        console.error("Required time: %d", new Date().getTime() - encodeBegin);
                    this.on_encoded_data(result);
                }
                else console.error("[Codec][" + this.name() + "] Could not encode buffer. Result: " + result);
            });
        }
        return true;
    }

    decodeSamples(cache: CodecClientCache, data: Uint8Array) : Promise<AudioBuffer> {
        return this.decode(data).then(buffer => this._decodeResampler.resample(buffer));
    }
}