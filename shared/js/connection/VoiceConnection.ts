import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import {Registry} from "tc-shared/events";

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

    "notify_recorder_changed": {}
}

export abstract class AbstractVoiceConnection {
    readonly events: Registry<VoiceConnectionEvents>;
    readonly connection: AbstractServerConnection;

    protected constructor(connection: AbstractServerConnection) {
        this.events = new Registry<VoiceConnectionEvents>();
        this.connection = connection;
    }

    abstract getConnectionState() : VoiceConnectionStatus;

    abstract encoding_supported(codec: number) : boolean;
    abstract decoding_supported(codec: number) : boolean;

    abstract register_client(client_id: number) : VoiceClient;
    abstract available_clients() : VoiceClient[];
    abstract unregister_client(client: VoiceClient) : Promise<void>;

    abstract voice_recorder() : RecorderProfile;
    abstract acquire_voice_recorder(recorder: RecorderProfile | undefined) : Promise<void>;

    abstract get_encoder_codec() : number;
    abstract set_encoder_codec(codec: number);
}