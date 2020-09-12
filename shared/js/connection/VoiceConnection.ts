import {RecorderProfile} from "../voice/RecorderProfile";
import {AbstractServerConnection} from "../connection/ConnectionBase";
import {Registry} from "../events";
import {VoiceClient} from "../voice/VoiceClient";
import {WhisperSession, WhisperTarget} from "../voice/VoiceWhisper";

export enum VoiceConnectionStatus {
    ClientUnsupported,
    ServerUnsupported,

    Connecting,
    Connected,
    Disconnecting,
    Disconnected
}

export interface VoiceConnectionEvents {
    "notify_connection_status_changed": {
        oldStatus: VoiceConnectionStatus,
        newStatus: VoiceConnectionStatus
    },

    "notify_recorder_changed": {},

    "notify_whisper_created": {
        session: WhisperSession
    },
    "notify_whisper_initialized": {
        session: WhisperSession
    },
    "notify_whisper_destroyed": {
        session: WhisperSession
    }
}

export type WhisperSessionInitializeData = {
    clientName: string,
    clientUniqueId: string,

    sessionTimeout: number,

    blocked: boolean,
    volume: number
};

export type WhisperSessionInitializer = (session: WhisperSession) => Promise<WhisperSessionInitializeData>;

export abstract class AbstractVoiceConnection {
    readonly events: Registry<VoiceConnectionEvents>;
    readonly connection: AbstractServerConnection;

    protected constructor(connection: AbstractServerConnection) {
        this.events = new Registry<VoiceConnectionEvents>();
        this.connection = connection;
    }

    abstract getConnectionState() : VoiceConnectionStatus;

    abstract encodingSupported(codec: number) : boolean;
    abstract decodingSupported(codec: number) : boolean;

    abstract registerVoiceClient(clientId: number);
    abstract availableVoiceClients() : VoiceClient[];
    abstract unregisterVoiceClient(client: VoiceClient);

    abstract voiceRecorder() : RecorderProfile;
    abstract acquireVoiceRecorder(recorder: RecorderProfile | undefined) : Promise<void>;

    abstract getEncoderCodec() : number;
    abstract setEncoderCodec(codec: number);

    /* the whisper API */
    abstract getWhisperSessions() : WhisperSession[];
    abstract dropWhisperSession(session: WhisperSession);

    abstract setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined);
    abstract getWhisperSessionInitializer() : WhisperSessionInitializer | undefined;

    abstract startWhisper(target: WhisperTarget) : Promise<void>;
    abstract getWhisperTarget() : WhisperTarget | undefined;
    abstract stopWhisper();
}