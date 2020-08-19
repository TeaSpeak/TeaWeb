import * as log from "tc-shared/log";
import {LogCategory, logDebug, logInfo, logWarn} from "tc-shared/log";
import * as aplayer from "../audio/player";
import {ServerConnection} from "../connection/ServerConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClientController} from "./VoiceClient";
import {settings, ValuedSettingsKey} from "tc-shared/settings";
import {tr} from "tc-shared/i18n/localize";
import {AbstractVoiceConnection, VoiceClient, VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {codecPool} from "./CodecConverter";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {ServerConnectionEvents} from "tc-shared/connection/ConnectionBase";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import {VoiceBridge, VoicePacket} from "./bridge/VoiceBridge";
import {NativeWebRTCVoiceBridge} from "./bridge/NativeWebRTCVoiceBridge";
import {EventType} from "tc-shared/ui/frames/log/Definitions";

export enum VoiceEncodeType {
    JS_ENCODE,
    NATIVE_ENCODE
}

const KEY_VOICE_CONNECTION_TYPE: ValuedSettingsKey<number> = {
    key: "voice_connection_type",
    valueType: "number",
    defaultValue: VoiceEncodeType.NATIVE_ENCODE
};

export class VoiceConnection extends AbstractVoiceConnection {
    static codecSupported(type: number) : boolean {
        return !!codecPool && codecPool.length > type && codecPool[type].supported();
    }

    readonly connection: ServerConnection;

    private readonly serverConnectionStateListener;
    private connectionType: VoiceEncodeType = VoiceEncodeType.NATIVE_ENCODE;
    private connectionState: VoiceConnectionStatus;

    private localAudioStarted = false;
    private connectionLostModalOpen = false;

    private connectAttemptCounter = 0;
    private awaitingAudioInitialize = false;

    private currentAudioSource: RecorderProfile;
    private voiceClients: VoiceClientController[] = [];

    private voiceBridge: VoiceBridge;

    private encoderCodec: number = 5;

    constructor(connection: ServerConnection) {
        super(connection);

        this.connectionState = VoiceConnectionStatus.Disconnected;

        this.connection = connection;
        this.connectionType = settings.static_global(KEY_VOICE_CONNECTION_TYPE, this.connectionType);

        this.connection.events.on("notify_connection_state_changed",
            this.serverConnectionStateListener = this.handleServerConnectionStateChanged.bind(this));
    }

    getConnectionState(): VoiceConnectionStatus {
        return this.connectionState;
    }

    destroy() {
        this.connection.events.off(this.serverConnectionStateListener);
        this.dropVoiceBridge();
        this.acquire_voice_recorder(undefined, true).catch(error => {
            log.warn(LogCategory.VOICE, tr("Failed to release voice recorder: %o"), error);
        }).then(() => {
            for(const client of this.voiceClients)  {
                client.abort_replay();
                client.callback_playback = undefined;
                client.callback_state_changed = undefined;
                client.callback_stopped = undefined;
            }
            this.voiceClients = undefined;
            this.currentAudioSource = undefined;
        });
        this.events.destroy();
    }

    async acquire_voice_recorder(recorder: RecorderProfile | undefined, enforce?: boolean) {
        if(this.currentAudioSource === recorder && !enforce)
            return;

        if(this.currentAudioSource) {
            await this.voiceBridge?.setInput(undefined);
            this.currentAudioSource.callback_unmount = undefined;
            await this.currentAudioSource.unmount();
        }

        /* unmount our target recorder */
        await recorder?.unmount();

        this.handleRecorderStop();
        this.currentAudioSource = recorder;

        if(recorder) {
            recorder.current_handler = this.connection.client;

            recorder.callback_unmount = this.handleRecorderUnmount.bind(this);
            recorder.callback_start = this.handleRecorderStart.bind(this);
            recorder.callback_stop = this.handleRecorderStop.bind(this);

            recorder.callback_input_initialized = async input => {
                if(!this.voiceBridge)
                    return;

                await this.voiceBridge.setInput(input);
            };

            if(recorder.input && this.voiceBridge) {
                await this.voiceBridge.setInput(recorder.input);
            }

            if(!recorder.input || recorder.input.isFiltered()) {
                this.handleRecorderStop();
            } else {
                this.handleRecorderStart();
            }
        } else {
            await this.voiceBridge.setInput(undefined);
        }

        this.events.fire("notify_recorder_changed");
    }

    private startVoiceBridge() {
        if(!aplayer.initialized()) {
            logDebug(LogCategory.VOICE, tr("Audio player isn't initialized yet. Waiting for it to initialize."));
            if(!this.awaitingAudioInitialize) {
                this.awaitingAudioInitialize = true;
                aplayer.on_ready(() => this.startVoiceBridge());
            }
            return;
        }

        if(this.connection.getConnectionState() !== ConnectionState.CONNECTED)
            return;

        this.connectAttemptCounter++;
        if(this.voiceBridge) {
            this.voiceBridge.callback_disconnect = undefined;
            this.voiceBridge.disconnect();
        }

        this.voiceBridge = new NativeWebRTCVoiceBridge();
        this.voiceBridge.callback_incoming_voice = packet => this.handleVoicePacket(packet);
        this.voiceBridge.callback_send_control_data = (request, payload) => {
            this.connection.sendData(JSON.stringify(Object.assign({
                type: "WebRTC",
                request: request
            }, payload)))
        };
        this.voiceBridge.callback_disconnect = () => {
            this.connection.client.log.log(EventType.CONNECTION_VOICE_DROPPED, { });
            if(!this.connectionLostModalOpen) {
                this.connectionLostModalOpen = true;
                const modal =  createErrorModal(tr("Voice connection lost"), tr("Lost voice connection to the target server. Trying to reconnect..."));
                modal.close_listener.push(() => this.connectionLostModalOpen = false);
                modal.open();
            }
            logInfo(LogCategory.WEBRTC, tr("Lost voice connection to target server. Trying to reconnect."));
            this.startVoiceBridge();
        }

        this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT, { attemptCount: this.connectAttemptCounter });
        this.setConnectionState(VoiceConnectionStatus.Connecting);
        this.voiceBridge.connect().then(result => {
            if(result.type === "success") {
                this.connectAttemptCounter = 0;

                this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT_SUCCEEDED, { });
                const currentInput = this.voice_recorder()?.input;
                if(currentInput) {
                    this.voiceBridge.setInput(currentInput).catch(error => {
                        createErrorModal(tr("Input recorder attechment failed"), tr("Failed to apply the current microphone recorder to the voice sender.")).open();
                        logWarn(LogCategory.VOICE, tr("Failed to apply the input to the voice bridge: %o"), error);
                        this.handleRecorderUnmount();
                    });
                }

                this.setConnectionState(VoiceConnectionStatus.Connected);
            } else if(result.type === "canceled") {
                /* we've to do nothing here */
            } else if(result.type === "failed") {
                logWarn(LogCategory.VOICE, tr("Failed to setup voice bridge: %s. Reconnect: %o"), result.message, result.allowReconnect);

                this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT_FAILED, {
                    reason: result.message,
                    reconnect_delay: result.allowReconnect ? 1 : 0
                });

                if(result.allowReconnect) {
                    this.startVoiceBridge();
                }
            }
        });
    }

    private dropVoiceBridge() {
        if(this.voiceBridge) {
            this.voiceBridge.callback_disconnect = undefined;
            this.voiceBridge.disconnect();
            this.voiceBridge = undefined;
        }
        this.setConnectionState(VoiceConnectionStatus.Disconnected);
    }

    handleControlPacket(json) {
        this.voiceBridge.handleControlData(json["request"], json);
        return;
    }

    protected handleVoicePacket(packet: VoicePacket) {
        const chandler = this.connection.client;
        if(chandler.isSpeakerMuted() || chandler.isSpeakerDisabled()) /* we dont need to do anything with sound playback when we're not listening to it */
            return;

        let client = this.find_client(packet.clientId);
        if(!client) {
            log.error(LogCategory.VOICE, tr("Having voice from unknown audio client? (ClientID: %o)"), packet.clientId);
            return;
        }

        let codec_pool = codecPool[packet.codec];
        if(!codec_pool) {
            log.error(LogCategory.VOICE, tr("Could not playback codec %o"), packet.codec);
            return;
        }

        if(packet.payload.length == 0) {
            client.stopAudio();
            codec_pool.releaseCodec(packet.clientId);
        } else {
            codec_pool.ownCodec(packet.clientId, () => {
                logWarn(LogCategory.VOICE, tr("Received an encoded voice packet even thou we're only decoding!"));
            }, true)
                .then(decoder => decoder.decodeSamples(client.get_codec_cache(packet.codec), packet.payload))
                .then(buffer => client.playback_buffer(buffer)).catch(error => {
                log.error(LogCategory.VOICE, tr("Could not playback client's (%o) audio (%o)"), packet.clientId, error);
                if(error instanceof Error)
                    log.error(LogCategory.VOICE, error.stack);
            });
        }
    }

    private handleRecorderStop() {
        const chandler = this.connection.client;
        const ch = chandler.getClient();
        if(ch) ch.speaking = false;

        if(!chandler.connected)
            return false;

        if(chandler.isMicrophoneMuted())
            return false;

        log.info(LogCategory.VOICE, tr("Local voice ended"));
        this.localAudioStarted = false;

        this.voiceBridge?.sendStopSignal(this.encoderCodec);
    }

    private handleRecorderStart() {
        const chandler = this.connection.client;
        if(chandler.isMicrophoneMuted()) {
            log.warn(LogCategory.VOICE, tr("Received local voice started event, even thou we're muted!"));
            return;
        }

        this.localAudioStarted = true;
        log.info(LogCategory.VOICE, tr("Local voice started"));

        const ch = chandler.getClient();
        if(ch) ch.speaking = true;
    }

    private handleRecorderUnmount() {
        log.info(LogCategory.VOICE, "Lost recorder!");
        this.currentAudioSource = undefined;
        this.acquire_voice_recorder(undefined, true); /* we can ignore the promise because we should finish this directly */
    }

    private setConnectionState(state: VoiceConnectionStatus) {
        if(this.connectionState === state)
            return;

        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_connection_status_changed", { newStatus: state, oldStatus: oldState });
    }

    private handleServerConnectionStateChanged(event: ServerConnectionEvents["notify_connection_state_changed"]) {
        if(event.newState === ConnectionState.CONNECTED) {
            this.startVoiceBridge();
        } else {
            this.dropVoiceBridge();
        }
    }

    voice_recorder(): RecorderProfile {
        return this.currentAudioSource;
    }

    available_clients(): VoiceClient[] {
        return this.voiceClients;
    }

    find_client(client_id: number) : VoiceClientController | undefined {
        for(const client of this.voiceClients)
            if(client.client_id === client_id)
                return client;
        return undefined;
    }

    unregister_client(client: VoiceClient): Promise<void> {
        if(!(client instanceof VoiceClientController))
            throw "Invalid client type";

        this.voiceClients.remove(client);
        return Promise.resolve();
    }

    register_client(client_id: number): VoiceClient {
        const client = new VoiceClientController(client_id);
        this.voiceClients.push(client);
        return client;
    }

    decoding_supported(codec: number): boolean {
        return VoiceConnection.codecSupported(codec);
    }

    encoding_supported(codec: number): boolean {
        return VoiceConnection.codecSupported(codec);
    }

    get_encoder_codec(): number {
        return this.encoderCodec;
    }

    set_encoder_codec(codec: number) {
        this.encoderCodec = codec;
    }
}

/* funny fact that typescript dosn't find this */
declare global {
    interface RTCPeerConnection {
        addStream(stream: MediaStream): void;
        getLocalStreams(): MediaStream[];
        getStreamById(streamId: string): MediaStream | null;
        removeStream(stream: MediaStream): void;
    }
}