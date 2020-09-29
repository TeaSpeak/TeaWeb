import * as log from "tc-shared/log";
import {LogCategory, logDebug, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import * as aplayer from "../audio/player";
import {ServerConnection} from "../connection/ServerConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClientController} from "./VoiceClient";
import {settings, ValuedSettingsKey} from "tc-shared/settings";
import {tr} from "tc-shared/i18n/localize";
import {
    AbstractVoiceConnection,
    VoiceConnectionStatus,
    WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {ServerConnectionEvents} from "tc-shared/connection/ConnectionBase";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import {VoiceBridge, VoicePacket, VoiceWhisperPacket} from "./bridge/VoiceBridge";
import {NativeWebRTCVoiceBridge} from "./bridge/NativeWebRTCVoiceBridge";
import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {
    kUnknownWhisperClientUniqueId,
    WhisperSession,
    WhisperSessionState,
    WhisperTarget
} from "tc-shared/voice/VoiceWhisper";
import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {WebWhisperSession} from "tc-backend/web/voice/VoiceWhisper";
import {VoicePlayerState} from "tc-shared/voice/VoicePlayer";

export enum VoiceEncodeType {
    JS_ENCODE,
    NATIVE_ENCODE
}

const KEY_VOICE_CONNECTION_TYPE: ValuedSettingsKey<number> = {
    key: "voice_connection_type",
    valueType: "number",
    defaultValue: VoiceEncodeType.NATIVE_ENCODE
};

type CancelableWhisperTarget = WhisperTarget & { canceled: boolean };

export class VoiceConnection extends AbstractVoiceConnection {
    readonly connection: ServerConnection;

    private readonly serverConnectionStateListener;
    private connectionType: VoiceEncodeType = VoiceEncodeType.NATIVE_ENCODE;
    private connectionState: VoiceConnectionStatus;
    private failedConnectionMessage: string;

    private localAudioStarted = false;
    private connectionLostModalOpen = false;

    private connectAttemptCounter = 0;
    private awaitingAudioInitialize = false;

    private currentAudioSource: RecorderProfile;
    private voiceClients: {[key: number]: VoiceClientController} = {};

    private whisperSessionInitializer: WhisperSessionInitializer;
    private whisperSessions: {[key: number]: WebWhisperSession} = {};

    private whisperTarget: CancelableWhisperTarget | undefined;
    private whisperTargetInitialize: Promise<void>;

    private voiceBridge: VoiceBridge;

    private encoderCodec: number = 5;

    private lastConnectAttempt: number = 0;

    private currentlyReplayingVoice: boolean = false;
    private readonly voiceClientStateChangedEventListener;
    private readonly whisperSessionStateChangedEventListener;

    constructor(connection: ServerConnection) {
        super(connection);

        this.setWhisperSessionInitializer(undefined);

        this.connectionState = VoiceConnectionStatus.Disconnected;

        this.connection = connection;
        this.connectionType = settings.static_global(KEY_VOICE_CONNECTION_TYPE, this.connectionType);

        this.connection.events.on("notify_connection_state_changed",
            this.serverConnectionStateListener = this.handleServerConnectionStateChanged.bind(this));

        this.voiceClientStateChangedEventListener = this.handleVoiceClientStateChange.bind(this);
        this.whisperSessionStateChangedEventListener = this.handleWhisperSessionStateChange.bind(this);
    }

    getConnectionState(): VoiceConnectionStatus {
        return this.connectionState;
    }

    getFailedMessage(): string {
        return this.failedConnectionMessage;
    }

    destroy() {
        this.connection.events.off(this.serverConnectionStateListener);
        this.dropVoiceBridge();
        this.acquireVoiceRecorder(undefined, true).catch(error => {
            log.warn(LogCategory.VOICE, tr("Failed to release voice recorder: %o"), error);
        }).then(() => {
            for(const client of Object.values(this.voiceClients))  {
                client.abortReplay();
            }
            this.voiceClients = undefined;
            this.currentAudioSource = undefined;
        });
        if(Object.keys(this.voiceClients).length !== 0) {
            logWarn(LogCategory.AUDIO, tr("Voice connection will be destroyed, but some voice clients are still left (%d)."), Object.keys(this.voiceClients).length);
        }
        const whisperSessions = Object.keys(this.whisperSessions);
        whisperSessions.forEach(session => this.whisperSessions[session].destroy());
        this.whisperSessions = {};

        this.events.destroy();
    }

    reset() {
        this.dropVoiceBridge();
    }

    async acquireVoiceRecorder(recorder: RecorderProfile | undefined, enforce?: boolean) {
        if(this.currentAudioSource === recorder && !enforce) {
            return;
        }

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
            await this.voiceBridge?.setInput(undefined);
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

        if(this.connection.getConnectionState() !== ConnectionState.CONNECTED) {
            return;
        }

        this.lastConnectAttempt = Date.now();
        this.connectAttemptCounter++;
        if(this.voiceBridge) {
            this.voiceBridge.callbackDisconnect = undefined;
            this.voiceBridge.disconnect();
        }

        this.voiceBridge = new NativeWebRTCVoiceBridge();
        this.voiceBridge.callback_incoming_voice = packet => this.handleVoicePacket(packet);
        this.voiceBridge.callback_incoming_whisper = packet => this.handleWhisperPacket(packet);
        this.voiceBridge.callback_send_control_data = (request, payload) => {
            this.connection.sendData(JSON.stringify(Object.assign({
                type: "WebRTC",
                request: request
            }, payload)))
        };
        this.voiceBridge.callbackDisconnect = () => {
            this.connection.client.log.log(EventType.CONNECTION_VOICE_DROPPED, { });
            if(!this.connectionLostModalOpen) {
                this.connectionLostModalOpen = true;
                const modal =  createErrorModal(tr("Voice connection lost"), tr("Lost voice connection to the target server. Trying to reconnect..."));
                modal.close_listener.push(() => this.connectionLostModalOpen = false);
                modal.open();
            }
            logInfo(LogCategory.WEBRTC, tr("Lost voice connection to target server. Trying to reconnect."));
            this.executeVoiceBridgeReconnect();
        }

        this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT, { attemptCount: this.connectAttemptCounter });
        this.setConnectionState(VoiceConnectionStatus.Connecting);
        this.voiceBridge.connect().then(result => {
            if(result.type === "success") {
                this.lastConnectAttempt = 0;
                this.connectAttemptCounter = 0;

                this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT_SUCCEEDED, { });
                const currentInput = this.voiceRecorder()?.input;
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
                let doReconnect = result.allowReconnect && this.connectAttemptCounter < 5;
                logWarn(LogCategory.VOICE, tr("Failed to setup voice bridge: %s. Reconnect: %o"), result.message, doReconnect);

                this.connection.client.log.log(EventType.CONNECTION_VOICE_CONNECT_FAILED, {
                    reason: result.message,
                    reconnect_delay: doReconnect ? 1 : 0
                });

                if(doReconnect) {
                    this.executeVoiceBridgeReconnect();
                } else {
                    this.failedConnectionMessage = result.message;
                    this.setConnectionState(VoiceConnectionStatus.Failed);
                }
            }
        });
    }

    private executeVoiceBridgeReconnect() {
        /* TODO: May some kind of incremental timeout? */
        this.startVoiceBridge();
    }

    private dropVoiceBridge() {
        if(this.voiceBridge) {
            this.voiceBridge.callbackDisconnect = undefined;
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

        let client = this.findVoiceClient(packet.clientId);
        if(!client) {
            log.error(LogCategory.VOICE, tr("Having voice from unknown audio client? (ClientID: %o)"), packet.clientId);
            return;
        }

        client.enqueueAudioPacket(packet.voiceId, packet.codec, packet.head, packet.payload);
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
        this.acquireVoiceRecorder(undefined, true); /* we can ignore the promise because we should finish this directly */
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
            this.connectAttemptCounter = 0;
            this.lastConnectAttempt = 0;
            this.dropVoiceBridge();
        }
    }

    voiceRecorder(): RecorderProfile {
        return this.currentAudioSource;
    }

    availableVoiceClients(): VoiceClient[] {
        return Object.values(this.voiceClients);
    }

    findVoiceClient(clientId: number) : VoiceClientController | undefined {
        return this.voiceClients[clientId];
    }

    unregisterVoiceClient(client: VoiceClient) {
        if(!(client instanceof VoiceClientController))
            throw "Invalid client type";

        client.events.off("notify_state_changed", this.voiceClientStateChangedEventListener);
        delete this.voiceClients[client.getClientId()];
        client.destroy();
    }

    registerVoiceClient(clientId: number): VoiceClient {
        if(typeof this.voiceClients[clientId] !== "undefined") {
            throw tr("voice client already registered");
        }

        const client = new VoiceClientController(clientId);
        this.voiceClients[clientId] = client;
        client.events.on("notify_state_changed", this.voiceClientStateChangedEventListener);
        return client;
    }

    decodingSupported(codec: number): boolean {
        return codec >= 4 && codec <= 5;
    }

    encodingSupported(codec: number): boolean {
        return codec >= 4 && codec <= 5;
    }

    getEncoderCodec(): number {
        return this.encoderCodec;
    }

    setEncoderCodec(codec: number) {
        this.encoderCodec = codec;
    }

    stopAllVoiceReplays() {
        this.availableVoiceClients().forEach(e => e.abortReplay());
        /* TODO: Whisper sessions as well */
    }

    isReplayingVoice(): boolean {
        return this.currentlyReplayingVoice;
    }

    private handleVoiceClientStateChange(/* event: VoicePlayerEvents["notify_state_changed"] */) {
        this.updateVoiceReplaying();
    }

    private handleWhisperSessionStateChange() {
        this.updateVoiceReplaying();
    }

    private updateVoiceReplaying() {
        let replaying = false;
        if(this.connectionState === VoiceConnectionStatus.Connected) {
            let index = this.availableVoiceClients().findIndex(client => client.getState() === VoicePlayerState.PLAYING || client.getState() === VoicePlayerState.BUFFERING);
            replaying = index !== -1;

            if(!replaying) {
                index = this.getWhisperSessions().findIndex(session => session.getSessionState() === WhisperSessionState.PLAYING);
                replaying = index !== -1;
            }
        }

        if(this.currentlyReplayingVoice !== replaying) {
            this.currentlyReplayingVoice = replaying;
            this.events.fire_async("notify_voice_replay_state_change", { replaying: replaying });
        }
    }

    protected handleWhisperPacket(packet: VoiceWhisperPacket) {
        const clientId = packet.clientId;

        let session = this.whisperSessions[clientId];
        if(typeof session !== "object") {
            logDebug(LogCategory.VOICE, tr("Received new whisper from %d (%s)"), packet.clientId, packet.clientNickname);
            session = (this.whisperSessions[clientId] = new WebWhisperSession(packet));
            session.events.on("notify_state_changed", this.whisperSessionStateChangedEventListener);
            this.whisperSessionInitializer(session).then(result => {
                session.initializeFromData(result).then(() => {
                    if(this.whisperSessions[clientId] !== session) {
                        /* seems to be an old session */
                        return;
                    }
                    this.events.fire("notify_whisper_initialized", { session });
                }).catch(error => {
                    logError(LogCategory.VOICE, tr("Failed to internally initialize a voice whisper session: %o"), error);
                    session.setSessionState(WhisperSessionState.INITIALIZE_FAILED);
                });
            }).catch(error => {
                logError(LogCategory.VOICE, tr("Failed to initialize whisper session: %o."), error);
                session.initializeFailed();
            });

            session.events.on("notify_timed_out", () => {
                logTrace(LogCategory.VOICE, tr("Whisper session %d timed out. Dropping session."), session.getClientId());
                this.dropWhisperSession(session);
            });
            this.events.fire("notify_whisper_created", { session: session });
        }

        session.enqueueWhisperPacket(packet);
    }

    getWhisperSessions(): WhisperSession[] {
        return Object.values(this.whisperSessions);
    }

    dropWhisperSession(session: WhisperSession) {
        if(!(session instanceof WebWhisperSession)) {
            throw tr("Session isn't an instance of the web whisper system");
        }

        session.events.off("notify_state_changed", this.whisperSessionStateChangedEventListener);
        delete this.whisperSessions[session.getClientId()];
        session.destroy();
    }

    setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined) {
        this.whisperSessionInitializer = initializer;
        if(!this.whisperSessionInitializer) {
            this.whisperSessionInitializer = async session => {
                logWarn(LogCategory.VOICE, tr("Missing whisper session initializer. Blocking whisper from %d (%s)"), session.getClientId(), session.getClientUniqueId());
                return {
                    clientName: session.getClientName() || tr("Unknown client"),
                    clientUniqueId: session.getClientUniqueId() || kUnknownWhisperClientUniqueId,

                    blocked: true,
                    volume: 1,

                    sessionTimeout: 60 * 1000
                }
            }
        }
    }

    getWhisperSessionInitializer(): WhisperSessionInitializer | undefined {
        return this.whisperSessionInitializer;
    }

    async startWhisper(target: WhisperTarget): Promise<void> {
        while(this.whisperTargetInitialize) {
            this.whisperTarget.canceled = true;
            await this.whisperTargetInitialize;
        }

        this.whisperTarget = Object.assign({ canceled: false }, target);
        try {
            await (this.whisperTargetInitialize = this.doStartWhisper(this.whisperTarget));
        } finally {
            this.whisperTargetInitialize = undefined;
        }
    }

    private async doStartWhisper(target: CancelableWhisperTarget) {
        if(target.target === "echo") {
            await this.connection.send_command("setwhispertarget", {
                type: 0x10, /* self */
                target: 0,
                id: 0
            }, { flagset: ["new"] });
        } else if(target.target === "channel-clients") {
            throw "target not yet supported";
        } else if(target.target === "groups") {
            throw "target not yet supported";
        } else {
            throw "target not yet supported";
        }

        if(target.canceled) {
            return;
        }

        this.voiceBridge.startWhispering();
    }

    getWhisperTarget(): WhisperTarget | undefined {
        return this.whisperTarget;
    }

    stopWhisper() {
        if(this.whisperTarget) {
            this.whisperTarget.canceled = true;
            this.whisperTargetInitialize = undefined;
            this.connection.send_command("clearwhispertarget").catch(error => {
                logWarn(LogCategory.CLIENT, tr("Failed to clear the whisper target: %o"), error);
            });
        }
        this.voiceBridge?.stopWhispering();
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