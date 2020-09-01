import {WorkerHandler} from "tc-shared/workers/WorkerHandler";
import {
    AWCommand,
    AWCommandResponse,
    AWMessageRelations,
    AWNotifies,
    AWNotifiesWorker
} from "tc-backend/web/audio-lib/WorkerMessages";

import {AudioLibrary, getAudioLibraryInstance} from "./async_require";

/*
 * Fix since rust wasm is used to run in normal space, not as worker.
 */
(self as any).Window = (self as any).DedicatedWorkerGlobalScope;

let audioLibrary: AudioLibrary;
export async function initializeAudioLib() {
    audioLibrary = await getAudioLibraryInstance();

    const error = audioLibrary.initialize();
    if(typeof error === "string") {
        console.error("Failed to initialize the audio lib: %s", error);
    }
}

const workerHandler = new WorkerHandler<AWCommand, AWCommandResponse, AWMessageRelations, AWNotifies, AWNotifiesWorker>();
workerHandler.initialize();

workerHandler.registerMessageHandler("create-client", () => {
    const client = audioLibrary.audio_client_create();
    audioLibrary.audio_client_buffer_callback(client, (ptr, samples, channels) => {
        try {
            const sendBuffer = new Uint8Array(samples * channels * 4);
            sendBuffer.set(new Uint8Array(audioLibrary.memory.buffer, ptr, samples * channels * 4));

            workerHandler.notify("notify-decoded-audio", {
                buffer: sendBuffer.buffer,
                byteLength: sendBuffer.byteLength,
                byteOffset: sendBuffer.byteOffset,
                clientId: client,

                sampleRate: 48000,
                channelCount: channels
            });
        } catch (error) {
            console.error(error);
        }
    });

    return {
        clientId: client
    }
});

workerHandler.registerMessageHandler("initialize", async () => {
    await initializeAudioLib();
})

workerHandler.registerMessageHandler("enqueue-audio-packet", payload => {
    audioLibrary.audio_client_enqueue_buffer(payload.clientId, new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength), payload.packetId, payload.codec);
});