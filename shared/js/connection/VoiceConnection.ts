import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import {Registry} from "tc-shared/events";
import {WhisperSession} from "tc-shared/voice/Whisper";

export enum PlayerState {
    PREBUFFERING,
    PLAYING,
    BUFFERING,
    STOPPING,
    STOPPED
}

export type LatencySettings = {
    min_buffer: number; /* milliseconds */
    max_buffer: number; /* milliseconds */
}

export interface VoiceClient {
    client_id: number;

    callback_playback: () => any;
    callback_stopped: () => any;

    callback_state_changed: (new_state: PlayerState) => any;

    get_state() : PlayerState;

    get_volume() : number;
    set_volume(volume: number) : void;

    abort_replay();

    support_latency_settings() : boolean;

    reset_latency_settings();
    latency_settings(settings?: LatencySettings) : LatencySettings;

    support_flush() : boolean;
    flush();
}

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

    abstract registerClient(client_id: number) : VoiceClient;
    abstract availableClients() : VoiceClient[];
    abstract unregister_client(client: VoiceClient) : Promise<void>;

    abstract voiceRecorder() : RecorderProfile;
    abstract acquireVoiceRecorder(recorder: RecorderProfile | undefined) : Promise<void>;

    abstract getEncoderCodec() : number;
    abstract setEncoderCodec(codec: number);

    /* the whisper API */
    abstract getWhisperSessions() : WhisperSession[];
    abstract dropWhisperSession(session: WhisperSession);

    abstract setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined);
    abstract getWhisperSessionInitializer() : WhisperSessionInitializer | undefined;
}