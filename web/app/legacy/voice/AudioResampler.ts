import {LogCategory, logWarn} from "tc-shared/log";

const OfflineAudioContext = window.webkitOfflineAudioContext || window.OfflineAudioContext;
export class AudioResampler {
    private readonly targetSampleRate: number;
    private readonly isPromiseResponse: boolean;

    constructor(targetSampleRate: number){
        this.targetSampleRate = targetSampleRate;
        this.isPromiseResponse = navigator.browserSpecs.name != 'Safari';

        if(this.targetSampleRate < 3000 || this.targetSampleRate > 384000) {
            throw tr("The target sample rate is outside the range [3000, 384000].");
        }
    }

    getTargetSampleRate() : number {
        return this.targetSampleRate;
    }

    async resample(buffer: AudioBuffer) : Promise<AudioBuffer> {
        if(!buffer) {
            logWarn(LogCategory.AUDIO, tr("Received empty buffer as input! Returning empty output!"));
            return buffer;
        }

        if(buffer.sampleRate == this.targetSampleRate) {
            return buffer;
        }

        const context = new OfflineAudioContext(
            buffer.numberOfChannels,
            Math.ceil(buffer.length * this.targetSampleRate / buffer.sampleRate),
            this.targetSampleRate
        );

        let source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        if(this.isPromiseResponse) {
            return await context.startRendering();
        } else {
            return await new Promise<AudioBuffer>((resolve, reject) => {
                context.oncomplete = event => resolve(event.renderedBuffer);
                try {
                    context.startRendering();
                } catch (ex) {
                    reject(ex);
                }
            });
        }
    }
}