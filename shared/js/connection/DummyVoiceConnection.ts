import {
    AbstractVoiceConnection, LatencySettings,
    PlayerState,
    VoiceClient,
    VoiceConnectionStatus, WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import {WhisperSession} from "tc-shared/voice/Whisper";

class DummyVoiceClient implements VoiceClient {
    client_id: number;

    callback_playback: () => any;
    callback_stopped: () => any;

    callback_state_changed: (new_state: PlayerState) => any;

    private volume: number;

    constructor(clientId: number) {
        this.client_id = clientId;

        this.volume = 1;
        this.reset_latency_settings();
    }

    abort_replay() { }

    flush() {
        throw "flush isn't supported";}

    get_state(): PlayerState {
        return PlayerState.STOPPED;
    }

    latency_settings(settings?: LatencySettings): LatencySettings {
        throw "latency settings are not supported";
    }

    reset_latency_settings() {
        throw "latency settings are not supported";
    }

    set_volume(volume: number): void {
        this.volume = volume;
    }

    get_volume(): number {
        return this.volume;
    }

    support_flush(): boolean {
        return false;
    }

    support_latency_settings(): boolean {
        return false;
    }
}

export class DummyVoiceConnection extends AbstractVoiceConnection {
    private recorder: RecorderProfile;
    private voiceClients: DummyVoiceClient[] = [];

    constructor(connection: AbstractServerConnection) {
        super(connection);
    }

    async acquireVoiceRecorder(recorder: RecorderProfile | undefined): Promise<void> {
        if(this.recorder === recorder)
            return;

        if(this.recorder) {
            this.recorder.callback_unmount = undefined;
            await this.recorder.unmount();
        }

        await recorder?.unmount();
        this.recorder = recorder;

        if(this.recorder) {
            this.recorder.callback_unmount = () => {
                this.recorder = undefined;
                this.events.fire("notify_recorder_changed");
            }
        }

        this.events.fire("notify_recorder_changed", {});
    }

    availableClients(): VoiceClient[] {
        return this.voiceClients;
    }

    decodingSupported(codec: number): boolean {
        return false;
    }

    encodingSupported(codec: number): boolean {
        return false;
    }

    getConnectionState(): VoiceConnectionStatus {
        return VoiceConnectionStatus.ClientUnsupported;
    }

    getEncoderCodec(): number {
        return 0;
    }

    registerClient(clientId: number): VoiceClient {
        const client = new DummyVoiceClient(clientId);
        this.voiceClients.push(client);
        return client;
    }

    setEncoderCodec(codec: number) {}

    async unregister_client(client: VoiceClient): Promise<void> {
        this.voiceClients.remove(client as any);
    }

    voiceRecorder(): RecorderProfile {
        return this.recorder;
    }

    dropWhisperSession(session: WhisperSession) { }

    getWhisperSessionInitializer(): WhisperSessionInitializer | undefined {
        return undefined;
    }

    getWhisperSessions(): WhisperSession[] {
        return [];
    }

    setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined) { }
}