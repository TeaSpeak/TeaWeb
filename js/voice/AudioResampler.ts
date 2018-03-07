class AudioResampler {
    targetSampleRate: number;

    constructor(targetSampleRate: number = 44100){
        this.targetSampleRate = targetSampleRate;
    }

    resample(buffer: AudioBuffer) : Promise<AudioBuffer> {
        if(buffer.sampleRate == this.targetSampleRate)
            return new Promise<AudioBuffer>(resolve => resolve(buffer));

        let context;
        context = new OfflineAudioContext(1, Math.ceil(buffer.length * this.targetSampleRate / buffer.sampleRate), this.targetSampleRate);

        let source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        return context.startRendering();
    }
}