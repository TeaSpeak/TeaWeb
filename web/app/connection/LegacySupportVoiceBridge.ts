import {
    AbstractVoiceConnection,
    VoiceConnectionStatus,
    WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {RtpVoiceConnection} from "tc-backend/web/rtc/voice/Connection";
import {VoiceConnection} from "tc-backend/web/legacy/voice/VoiceHandler";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {WhisperSession, WhisperTarget} from "tc-shared/voice/VoiceWhisper";
import {AbstractServerConnection, ConnectionStatistics} from "tc-shared/connection/ConnectionBase";
import {Registry} from "tc-shared/events";
import {VoicePlayerEvents, VoicePlayerLatencySettings, VoicePlayerState} from "tc-shared/voice/VoicePlayer";
import { tr } from "tc-shared/i18n/localize";

class ProxiedVoiceClient implements VoiceClient {
    readonly clientId: number;
    readonly events: Registry<VoicePlayerEvents>;

    handle: VoiceClient;

    private volume: number;
    private latencySettings: VoicePlayerLatencySettings | undefined;

    constructor(clientId: number) {
        this.clientId = clientId;
        this.events = new Registry<VoicePlayerEvents>();

        this.volume = 1;
    }

    setHandle(handle: VoiceClient | undefined) {
        this.handle?.events.disconnectAll(this.events);
        this.handle = handle;

        if(this.latencySettings) {
            this.handle?.setLatencySettings(this.latencySettings);
        }
        this.handle?.setVolume(this.volume);
        this.handle?.events.connectAll(this.events);
    }

    abortReplay() {
        this.handle?.abortReplay();
    }

    flushBuffer() {
        this.handle?.flushBuffer();
    }

    getClientId(): number {
        return this.clientId;
    }

    getLatencySettings(): Readonly<VoicePlayerLatencySettings> {
        return this.handle?.getLatencySettings() || this.latencySettings || { maxBufferTime: 200, minBufferTime: 10 };
    }

    getState(): VoicePlayerState {
        return this.handle ? this.handle.getState() : VoicePlayerState.STOPPED;
    }

    getVolume(): number {
        return this.handle?.getVolume() || this.volume;
    }

    resetLatencySettings() {
        this.handle.resetLatencySettings();
        this.latencySettings = undefined;
    }

    setLatencySettings(settings: VoicePlayerLatencySettings) {
        this.latencySettings = settings;
        this.handle?.setLatencySettings(this.latencySettings);
    }

    setVolume(volume: number) {
        this.volume = volume;
        this.handle?.setVolume(volume);
    }

}

export class LegacySupportVoiceBridge extends AbstractVoiceConnection {
    private readonly newVoiceBride: RtpVoiceConnection;
    private readonly oldVoiceBridge: VoiceConnection;

    private activeBridge: AbstractVoiceConnection;

    private encoderCodec: number;
    private currentRecorder: RecorderProfile;

    private registeredClients: ProxiedVoiceClient[] = [];

    constructor(connection: AbstractServerConnection, oldVoiceBridge: VoiceConnection, newVoiceBride: RtpVoiceConnection) {
        super(connection);

        this.oldVoiceBridge = oldVoiceBridge;
        this.newVoiceBride = newVoiceBride;
    }

    async setVoiceBridge(type: "old" | "new" | "unset") {
        const oldState = this.getConnectionState();

        this.registeredClients.forEach(e => {
            if(e.handle) {
                this.activeBridge.unregisterVoiceClient(e.handle);
                e.setHandle(undefined);
            }
        });
        this.activeBridge?.events.disconnectAll(this.events);
        this.activeBridge = type === "old" ? this.oldVoiceBridge : type === "new" ? this.newVoiceBride : undefined;

        if(this.activeBridge) {
            this.activeBridge.events.connectAll(this.events);

            this.registeredClients.forEach(e => {
                if(!e.handle) {
                    e.setHandle(this.activeBridge.registerVoiceClient(e.clientId));
                }
            });

            await this.activeBridge.acquireVoiceRecorder(this.currentRecorder);

            /* FIXME: Fire only if the state changed */
            this.events.fire("notify_connection_status_changed", { oldStatus: oldState, newStatus: this.activeBridge.getConnectionState() });
            this.events.fire("notify_voice_replay_state_change", { replaying: this.activeBridge.isReplayingVoice() });
        } else {
            /* FIXME: Fire only if the state changed */
            this.events.fire("notify_connection_status_changed", { oldStatus: oldState, newStatus: VoiceConnectionStatus.Disconnected });
            this.events.fire("notify_voice_replay_state_change", { replaying: false });
        }
    }

    acquireVoiceRecorder(recorder: RecorderProfile | undefined): Promise<void> {
        this.currentRecorder = recorder;
        return this.activeBridge?.acquireVoiceRecorder(recorder);
    }

    decodingSupported(codec: number): boolean {
        return !!this.activeBridge?.decodingSupported(codec);
    }

    encodingSupported(codec: number): boolean {
        return !!this.activeBridge?.encodingSupported(codec);
    }

    dropWhisperSession(session: WhisperSession) {
        this.activeBridge?.dropWhisperSession(session);
    }

    getConnectionState(): VoiceConnectionStatus {
        return this.activeBridge ? this.activeBridge.getConnectionState() : VoiceConnectionStatus.Disconnected;
    }

    getConnectionStats(): Promise<ConnectionStatistics> {
        return this.activeBridge ? this.activeBridge.getConnectionStats() : Promise.resolve({
            bytesSend: 0,
            bytesReceived: 0
        });
    }

    getEncoderCodec(): number {
        return this.activeBridge ? this.activeBridge.getEncoderCodec() : this.encoderCodec;
    }

    getFailedMessage(): string {
        return this.activeBridge?.getFailedMessage();
    }

    getRetryTimestamp(): number | 0 {
        return this.activeBridge ? this.activeBridge.getRetryTimestamp() : 0;
    }

    getWhisperSessionInitializer(): WhisperSessionInitializer | undefined {
        return this.activeBridge?.getWhisperSessionInitializer();
    }

    getWhisperSessions(): WhisperSession[] {
        return this.activeBridge?.getWhisperSessions() || [];
    }

    getWhisperTarget(): WhisperTarget | undefined {
        return this.activeBridge?.getWhisperTarget();
    }

    isReplayingVoice(): boolean {
        return !!this.activeBridge?.isReplayingVoice();
    }

    availableVoiceClients(): VoiceClient[] {
        return this.registeredClients;
    }

    registerVoiceClient(clientId: number) {
        if(this.registeredClients.findIndex(e => e.clientId === clientId) !== -1) {
            throw tr("voice client already exists");
        }

        const client = new ProxiedVoiceClient(clientId);
        client.setHandle(this.activeBridge?.registerVoiceClient(clientId));
        this.registeredClients.push(client);
        return client;
    }

    setEncoderCodec(codec: number) {
        this.encoderCodec = codec;
        this.newVoiceBride.setEncoderCodec(codec);
        this.oldVoiceBridge.setEncoderCodec(codec);
    }

    setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined) {
        this.newVoiceBride.setWhisperSessionInitializer(initializer);
        this.oldVoiceBridge.setWhisperSessionInitializer(initializer);
    }

    startWhisper(target: WhisperTarget): Promise<void> {
        return this.activeBridge ? this.activeBridge.startWhisper(target) : Promise.reject(tr("voice bridge not connected"));
    }

    stopAllVoiceReplays() {
        this.activeBridge?.stopAllVoiceReplays();
    }

    stopWhisper() {
        this.oldVoiceBridge?.stopWhisper();
        this.newVoiceBride?.stopWhisper();
    }

    unregisterVoiceClient(client: VoiceClient) {
        if(!(client instanceof ProxiedVoiceClient)) {
            throw tr("invalid voice client");
        }

        const index = this.registeredClients.indexOf(client);
        if(index === -1) { return; }

        this.registeredClients.splice(index, 1);
        if(client.handle) {
            this.activeBridge?.unregisterVoiceClient(client.handle);
        }
    }

    voiceRecorder(): RecorderProfile {
        return this.currentRecorder;
    }
}