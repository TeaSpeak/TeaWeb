/* from handle to worker */
export interface AWCommand {
    "initialize": {},

    "create-client": {},
    "enqueue-audio-packet": {
        clientId: number,
        packetId: number,
        codec: number,
        head: boolean,

        buffer: ArrayBuffer,
        byteLength: number,
        byteOffset: number,
    },
    "destroy-client": {
        clientId: number
    }
}

/* from worker to handle */
export interface AWCommandResponse {
    "create-client-result": { clientId: number }
}

export interface AWMessageRelations {
    "initialize": void,

    "create-client": "create-client-result",
    "create-client-result": never,

    "enqueue-audio-packet": void,
    "destroy-client": void
}

/* host to worker notifies */
export interface AWNotifies {}

/* worker to host notifies */
export interface AWNotifiesWorker {
    "notify-decoded-audio": {
        clientId: number,

        buffer: ArrayBuffer,
        byteLength: number,
        byteOffset: number,

        channelCount: number,
        sampleRate: number
    }
}