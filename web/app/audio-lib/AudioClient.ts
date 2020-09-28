import {AudioLibrary} from "tc-backend/web/audio-lib/index";
import {LogCategory, logWarn} from "tc-shared/log";

export class AudioClient {
    private readonly handle: AudioLibrary;
    private readonly clientId: number;
    public callback_decoded: (buffer: AudioBuffer) => void;
    public callback_ended: () => void;

    constructor(handle: AudioLibrary, clientId: number) {
        this.handle = handle;
        this.clientId = clientId;
    }

    async initialize() { }

    destroy() {
        this.callback_ended = undefined;
        this.callback_decoded = undefined;
        this.handle.destroyClient(this.clientId);
    }

    enqueueBuffer(buffer: Uint8Array, packetId: number, codec: number, head: boolean) {
        this.handle.getWorker().executeThrow("enqueue-audio-packet", {
            clientId: this.clientId,

            codec: codec,
            packetId: packetId,
            head: head,

            buffer: buffer.buffer,
            byteLength: buffer.byteLength,
            byteOffset: buffer.byteOffset,
        }, 5000, [buffer.buffer]).catch(error => {
            logWarn(LogCategory.AUDIO, tr("Failed to enqueue audio buffer for audio client %d: %o"), this.clientId, error);
        });
    }
}