import {WorkerOwner} from "tc-shared/workers/WorkerOwner";
import {
    AWCommand,
    AWCommandResponse,
    AWMessageRelations,
    AWNotifies,
    AWNotifiesWorker
} from "./WorkerMessages";
import {AudioClient} from "./AudioClient";
import {LogCategory, logWarn} from "tc-shared/log";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";

export type AudioLibraryWorker = WorkerOwner<AWCommand, AWCommandResponse, AWMessageRelations, AWNotifies, AWNotifiesWorker>;
export class AudioLibrary {
    private readonly worker: AudioLibraryWorker;
    private registeredClients: {[key: number]: AudioClient} = {};

    constructor() {
        this.worker = new WorkerOwner(AudioLibrary.spawnNewWorker);
    }

    private static spawnNewWorker() : Worker {
        /*
         * Attention don't use () => new Worker(...).
         * This confuses the worker plugin and will not emit any modules
         */
        return new Worker("./worker/index.ts", { type: "module" });
    }

    async initialize() {
        await this.worker.spawnWorker();
        await this.worker.executeThrow("initialize", {}, 10000);

        this.worker.registerNotifyHandler("notify-decoded-audio", payload => {
            if(payload.channelCount === 0 || payload.byteLength === 0) {
                this.registeredClients[payload.clientId]?.callback_ended();
                return;
            }

            let buffer = new Float32Array(payload.buffer, payload.byteOffset, payload.byteLength / 4);
            let audioBuffer = new AudioBuffer({ length: buffer.length / payload.channelCount, numberOfChannels: payload.channelCount, sampleRate: payload.sampleRate });
            for(let channel = 0; channel < payload.channelCount; channel++) {
                audioBuffer.copyToChannel(buffer.subarray(channel * audioBuffer.length), channel);
            }

            this.registeredClients[payload.clientId]?.callback_decoded(audioBuffer);
        });
    }

    async createClient() {
        const { clientId } = await this.worker.executeThrow("create-client", {}, 5000);
        const wrapper = new AudioClient(this, clientId);
        try {
            await wrapper.initialize();
        } catch (error) {
            this.worker.executeThrow("destroy-client", { clientId: clientId }).catch(error => {
                logWarn(LogCategory.AUDIO, tr("Failed to destroy client after a failed initialialization: %o"), error);
            });
            throw error;
        }
        this.registeredClients[clientId] = wrapper;
        return wrapper;
    }

    destroyClient(clientId: number) {
        delete this.registeredClients[clientId];
        this.worker.execute("destroy-client", { clientId: clientId }).then(result => {
            if(result.success === false) {
                logWarn(LogCategory.AUDIO, tr("Failed to destroy audio client %d: %s"), clientId, result.error);
            }
        });
    }

    getWorker() : AudioLibraryWorker {
        return this.worker;
    }
}

let audioLibrary: AudioLibrary;

export function getAudioLibrary() {
    return audioLibrary;
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "audio lib init",
    priority: 10,
    function: async () => {
        audioLibrary = new AudioLibrary();
        try {
            await audioLibrary.initialize();
        } catch (error) {
            loader.critical_error("Audio library initialisation failed", "Lookup the console for more details");
            throw error;
        }
    }
});