class AudioResampler {
    constructor(targetSampleRate = 44100) {
        this.targetSampleRate = targetSampleRate;
        if (this.targetSampleRate < 3000 || this.targetSampleRate > 384000)
            throw "The target sample rate is outside the range [3000, 384000].";
    }
    resample(buffer) {
        if (buffer.sampleRate == this.targetSampleRate)
            return new Promise(resolve => resolve(buffer));
        let context;
        context = new OfflineAudioContext(buffer.numberOfChannels, Math.floor(buffer.length * this.targetSampleRate / buffer.sampleRate), this.targetSampleRate);
        let source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        return context.startRendering();
    }
}
//# sourceMappingURL=AudioResampler.js.map