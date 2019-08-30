class AudioResampler {
    targetSampleRate: number;
    private _use_promise: boolean;

    constructor(targetSampleRate: number){
        this.targetSampleRate = targetSampleRate;
        if(this.targetSampleRate < 3000 || this.targetSampleRate > 384000) throw tr("The target sample rate is outside the range [3000, 384000].");
    }

    resample(buffer: AudioBuffer) : Promise<AudioBuffer> {
        if(!buffer) {
            log.warn(LogCategory.AUDIO, tr("Received empty buffer as input! Returning empty output!"));
            return Promise.resolve(buffer);
        }
        //console.log("Encode from %i to %i", buffer.sampleRate, this.targetSampleRate);
        if(buffer.sampleRate == this.targetSampleRate)
            return Promise.resolve(buffer);

        let context;
        context = new (window.webkitOfflineAudioContext || window.OfflineAudioContext)(buffer.numberOfChannels, Math.ceil(buffer.length * this.targetSampleRate / buffer.sampleRate), this.targetSampleRate);

        let source = context.createBufferSource();
        source.buffer = buffer;
        source.start(0);
        source.connect(context.destination);

        if(typeof(this._use_promise) === "undefined") {
           this._use_promise = navigator.browserSpecs.name != 'Safari';
        }

        if(this._use_promise)
            return context.startRendering();
        else {
            return new Promise<AudioBuffer>((resolve, reject) => {
                context.oncomplete = event => resolve(event.renderedBuffer);
                try {
                    context.startRendering();
                } catch (ex) {
                    reject(ex);
                }
            })
        }
    }
}