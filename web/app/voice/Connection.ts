import * as aplayer from "../audio/player";
import {
    AbstractVoiceConnection,
    VoiceConnectionStatus,
    WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {
    kUnknownWhisperClientUniqueId,
    WhisperSession,
    WhisperSessionState,
    WhisperTarget
} from "tc-shared/voice/VoiceWhisper";
import {RTCConnection, RTCConnectionEvents, RTPConnectionState} from "tc-shared/connection/rtc/Connection";
import {AbstractServerConnection, ConnectionStatistics} from "tc-shared/connection/ConnectionBase";
import {VoicePlayerState} from "tc-shared/voice/VoicePlayer";
import {LogCategory, logDebug, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {RtpVoiceClient} from "tc-backend/web/voice/VoiceClient";
import {InputConsumerType} from "tc-shared/voice/RecorderBase";
import {RtpWhisperSession} from "tc-backend/web/voice/WhisperClient";

type CancelableWhisperTarget = WhisperTarget & { canceled: boolean };
export class RtpVoiceConnection extends AbstractVoiceConnection {
    private readonly rtcConnection: RTCConnection;

    private readonly listenerRtcAudioAssignment;
    private readonly listenerRtcStateChanged;
    private listenerClientMoved;
    private listenerSpeakerStateChanged;

    private connectionState: VoiceConnectionStatus;
    private localFailedReason: string;

    private localAudioDestination: MediaStreamAudioDestinationNode;
    private currentAudioSourceNode: AudioNode;
    private currentAudioSource: RecorderProfile;

    private speakerMuted: boolean;
    private voiceClients: RtpVoiceClient[] = [];

    private whisperSessionInitializer: WhisperSessionInitializer | undefined;
    private whisperSessions: RtpWhisperSession[] = [];
    private whisperTarget: CancelableWhisperTarget | undefined;
    private whisperTargetInitialize: Promise<void> | undefined;

    private currentlyReplayingVoice: boolean = false;
    private readonly voiceClientStateChangedEventListener;
    private readonly whisperSessionStateChangedEventListener;

    constructor(connection: AbstractServerConnection, rtcConnection: RTCConnection) {
        super(connection);

        this.rtcConnection = rtcConnection;
        this.voiceClientStateChangedEventListener = this.handleVoiceClientStateChange.bind(this);
        this.whisperSessionStateChangedEventListener = this.handleWhisperSessionStateChange.bind(this);

        this.rtcConnection.getEvents().on("notify_audio_assignment_changed",
            this.listenerRtcAudioAssignment = event => this.handleAudioAssignmentChanged(event));

        this.rtcConnection.getEvents().on("notify_state_changed",
            this.listenerRtcStateChanged = event => this.handleRtcConnectionStateChanged(event));

        this.listenerSpeakerStateChanged = connection.client.events().on("notify_state_updated", event => {
            if(event.state === "speaker") {
                this.updateSpeakerState();
            }
        });

        this.listenerClientMoved = this.rtcConnection.getConnection().command_handler_boss().register_explicit_handler("notifyclientmoved", event => {
            const localClientId = this.rtcConnection.getConnection().client.getClientId();
            for(const data of event.arguments) {
                if(parseInt(data["clid"]) === localClientId) {
                    this.rtcConnection.startAudioBroadcast().catch(error => {
                        logError(LogCategory.VOICE, tr("Failed to start voice audio broadcasting after channel switch: %o"), error);
                        this.localFailedReason = tr("Failed to start audio broadcasting");
                        this.setConnectionState(VoiceConnectionStatus.Failed);
                    }).catch(() => {
                        this.setConnectionState(VoiceConnectionStatus.Connected);
                    });
                }
            }
        });

        this.speakerMuted = connection.client.isSpeakerMuted() || connection.client.isSpeakerDisabled();

        this.setConnectionState(VoiceConnectionStatus.Disconnected);
        aplayer.on_ready(() => {
            this.localAudioDestination = aplayer.context().createMediaStreamDestination();
            if(this.currentAudioSourceNode) {
                this.currentAudioSourceNode.connect(this.localAudioDestination);
            }
        });

        this.setWhisperSessionInitializer(undefined);
    }

    destroy() {
        if(this.listenerClientMoved) {
            this.listenerClientMoved();
            this.listenerClientMoved = undefined;
        }

        if(this.listenerSpeakerStateChanged) {
            this.listenerSpeakerStateChanged();
            this.listenerSpeakerStateChanged = undefined;
        }

        this.rtcConnection.getEvents().off("notify_audio_assignment_changed", this.listenerRtcAudioAssignment);
        this.rtcConnection.getEvents().off("notify_state_changed", this.listenerRtcStateChanged);

        this.acquireVoiceRecorder(undefined, true).catch(error => {
            logWarn(LogCategory.VOICE, tr("Failed to release voice recorder: %o"), error);
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
        /*
        const whisperSessions = Object.keys(this.whisperSessions);
        whisperSessions.forEach(session => this.whisperSessions[session].destroy());
        this.whisperSessions = {};
        */
        this.events.destroy();
    }

    getConnectionState(): VoiceConnectionStatus {
        return this.connectionState;
    }

    getFailedMessage(): string {
        return this.localFailedReason || this.rtcConnection.getFailReason();
    }

    voiceRecorder(): RecorderProfile {
        return this.currentAudioSource;
    }

    async acquireVoiceRecorder(recorder: RecorderProfile | undefined, enforce?: boolean): Promise<void> {
        if(this.currentAudioSource === recorder && !enforce) {
            return;
        }

        if(this.currentAudioSource) {
            this.currentAudioSourceNode?.disconnect(this.localAudioDestination);
            this.currentAudioSourceNode = undefined;

            this.currentAudioSource.callback_unmount = undefined;
            await this.currentAudioSource.unmount();
        }

        /* unmount our target recorder */
        await recorder?.unmount();

        this.handleRecorderStop();
        const oldRecorder = recorder;
        this.currentAudioSource = recorder;

        if(recorder) {
            recorder.current_handler = this.connection.client;

            recorder.callback_unmount = this.handleRecorderUnmount.bind(this);
            recorder.callback_start = this.handleRecorderStart.bind(this);
            recorder.callback_stop = this.handleRecorderStop.bind(this);

            recorder.callback_input_initialized = async input => {
                await input.setConsumer({
                    type: InputConsumerType.NODE,
                    callbackDisconnect: node => {
                        this.currentAudioSourceNode = undefined;
                        node.disconnect(this.localAudioDestination);
                    },
                    callbackNode: node => {
                        this.currentAudioSourceNode = node;
                        if(this.localAudioDestination) {
                            node.connect(this.localAudioDestination);
                        }
                    }
                });
            };
            if(recorder.input) {
                recorder.callback_input_initialized(recorder.input);
            }

            if(!recorder.input || recorder.input.isFiltered()) {
                this.handleRecorderStop();
            } else {
                this.handleRecorderStart();
            }
        }

        this.events.fire("notify_recorder_changed", {
            oldRecorder,
            newRecorder: recorder
        });
    }

    private handleRecorderStop() {
        const chandler = this.connection.client;
        const ch = chandler.getClient();
        if(ch) ch.speaking = false;

        if(!chandler.connected) {
            return false;
        }

        if(chandler.isMicrophoneMuted()) {
            return false;
        }

        logInfo(LogCategory.VOICE, tr("Local voice ended"));

        this.rtcConnection.setTrackSource("audio", null).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
        });

        this.rtcConnection.setTrackSource("audio-whisper", null).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
        });
    }

    private handleRecorderStart() {
        const chandler = this.connection.client;
        if(chandler.isMicrophoneMuted()) {
            logWarn(LogCategory.VOICE, tr("Received local voice started event, even thou we're muted!"));
            return;
        }

        logInfo(LogCategory.VOICE, tr("Local voice started"));

        const ch = chandler.getClient();
        if(ch) { ch.speaking = true; }

        this.rtcConnection.setTrackSource(this.whisperTarget ? "audio-whisper" : "audio", this.localAudioDestination.stream.getAudioTracks()[0])
            .catch(error => {
                logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
            });
    }

    private handleRecorderUnmount() {
        logInfo(LogCategory.VOICE, "Lost recorder!");
        this.currentAudioSource = undefined;
        this.acquireVoiceRecorder(undefined, true); /* we can ignore the promise because we should finish this directly */
    }

    isReplayingVoice(): boolean {
        return this.currentlyReplayingVoice;
    }

    decodingSupported(codec: number): boolean {
        return codec === 4 || codec === 5;
    }

    encodingSupported(codec: number): boolean {
        return codec === 4 || codec === 5;
    }

    getEncoderCodec(): number {
        return 4;
    }

    setEncoderCodec(codec: number) {
        /* TODO: If possible change the payload format? */
    }

    availableVoiceClients(): VoiceClient[] {
        return Object.values(this.voiceClients);
    }

    registerVoiceClient(clientId: number) {
        if(typeof this.voiceClients[clientId] !== "undefined") {
            throw tr("voice client already registered");
        }

        const client = new RtpVoiceClient(clientId);
        client.setGloballyMuted(this.speakerMuted);
        client.events.on("notify_state_changed", this.voiceClientStateChangedEventListener);
        this.voiceClients[clientId] = client;
        return client;
    }

    unregisterVoiceClient(client: VoiceClient) {
        if(!(client instanceof RtpVoiceClient)) {
            throw "Invalid client type";
        }

        logTrace(LogCategory.VOICE, tr("Destroy voice client %d"), client.getClientId());
        client.events.off("notify_state_changed", this.voiceClientStateChangedEventListener);
        delete this.voiceClients[client.getClientId()];
        client.destroy();
    }

    stopAllVoiceReplays() { }

    getWhisperSessionInitializer(): WhisperSessionInitializer | undefined {
        return this.whisperSessionInitializer;
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

    getWhisperSessions(): WhisperSession[] {
        return this.whisperSessions;
    }

    dropWhisperSession(session: WhisperSession) {
        if(!(session instanceof RtpWhisperSession)) {
            throw tr("Invalid session type");
        }

        session.events.off("notify_state_changed", this.whisperSessionStateChangedEventListener);
        this.whisperSessions.remove(session);
        session.destroy();
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
        if(this.rtcConnection.getConnectionState() !== RTPConnectionState.CONNECTED) {
            return;
        }

        await this.rtcConnection.startWhisper(target);

        if(target.canceled) {
            return;
        }

        this.handleRecorderStop();
        if(this.currentAudioSource?.input && !this.currentAudioSource.input.isFiltered()) {
            this.handleRecorderStart();
        }
    }

    getWhisperTarget(): WhisperTarget | undefined {
        return this.whisperTarget;
    }

    stopWhisper() {
        if(this.whisperTarget) {
            this.whisperTarget.canceled = true;
            this.whisperTarget = undefined;
            this.whisperTargetInitialize = undefined;
            this.connection.send_command("whispersessionreset").catch(error => {
                logWarn(LogCategory.CLIENT, tr("Failed to clear the whisper target: %o"), error);
            });
        }

        this.handleRecorderStop();
        if(this.currentAudioSource?.input && !this.currentAudioSource.input.isFiltered()) {
            this.handleRecorderStart();
        }
    }

    private handleVoiceClientStateChange(/* event: VoicePlayerEvents["notify_state_changed"] */) {
        this.updateVoiceReplaying();
    }

    private handleWhisperSessionStateChange() {
        this.updateVoiceReplaying();
    }

    private updateVoiceReplaying() {
        let replaying;

        {
            let index = this.availableVoiceClients().findIndex(client => client.getState() === VoicePlayerState.PLAYING || client.getState() === VoicePlayerState.BUFFERING);
            replaying = index !== -1;


            if(!replaying) {
                index = this.getWhisperSessions().findIndex(session => session.getSessionState() === WhisperSessionState.PLAYING);
                replaying = index !== -1;
            }
        }

        if(this.currentlyReplayingVoice !== replaying) {
            this.currentlyReplayingVoice = replaying;
            this.events.fire_later("notify_voice_replay_state_change", { replaying: replaying });
        }
    }

    private setConnectionState(state: VoiceConnectionStatus) {
        if(this.connectionState === state) {
            return;
        }

        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_connection_status_changed", { newStatus: state, oldStatus: oldState });
    }

    private handleRtcConnectionStateChanged(event: RTCConnectionEvents["notify_state_changed"]) {
        switch (event.newState) {
            case RTPConnectionState.CONNECTED:
                this.rtcConnection.startAudioBroadcast().then(() => {
                    logTrace(LogCategory.VOICE, tr("Local audio broadcasting has been started successfully"));
                    this.setConnectionState(VoiceConnectionStatus.Connected);
                }).catch(error => {
                    logError(LogCategory.VOICE, tr("Failed to start voice audio broadcasting: %o"), error);
                    this.localFailedReason = tr("Failed to start audio broadcasting");
                    this.setConnectionState(VoiceConnectionStatus.Failed);
                });
                if(this.whisperTarget) {
                    this.startWhisper(this.whisperTarget).catch(error => {
                        logError(LogCategory.VOICE, tr("Failed to start voice whisper on connected rtc connection: &o"), error);
                        /* TODO: Somehow abort the whisper and give the user a feedback? */
                    });
                }
                break;

            case RTPConnectionState.CONNECTING:
                this.setConnectionState(VoiceConnectionStatus.Connecting);
                break;

            case RTPConnectionState.DISCONNECTED:
                this.setConnectionState(VoiceConnectionStatus.Disconnected);
                break;

            case RTPConnectionState.FAILED:
                this.localFailedReason = undefined;
                this.setConnectionState(VoiceConnectionStatus.Failed);
                break;

            case RTPConnectionState.NOT_SUPPORTED:
                this.setConnectionState(VoiceConnectionStatus.ServerUnsupported);
                break;
        }
    }

    private handleAudioAssignmentChanged(event: RTCConnectionEvents["notify_audio_assignment_changed"]) {
        {
            let oldClient = Object.values(this.voiceClients).find(client => client.getRtpTrack() === event.track);
            oldClient?.setRtpTrack(undefined);

            let oldSession = this.whisperSessions.find(e => e.getRtpTrack() === event.track);
            oldSession?.setRtpTrack(undefined);
        }

        if(event.info) {
            if(typeof event.info.media === "undefined") {
                logWarn(LogCategory.VOICE, tr("Received audio assignment event with missing media type"));
                return;
            }

            switch (event.info.media) {
                case 0: {
                    const newClient = this.voiceClients[event.info.client_id];
                    if(newClient) {
                        newClient.setRtpTrack(event.track);
                    } else {
                        logWarn(LogCategory.AUDIO, tr("Received audio track assignment for unknown voice client (%o)."), event.info);
                    }
                    break;
                }
                case 1: {
                    let session = this.whisperSessions.find(e => e.getClientId() === event.info.client_id);
                    if(typeof session === "undefined") {
                        logDebug(LogCategory.VOICE, tr("Received new whisper from %d (%s)"), event.info.client_id, event.info.client_name);
                        session = new RtpWhisperSession(event.track, event.info);
                        session.setGloballyMuted(this.speakerMuted);
                        this.whisperSessions.push(session);
                        session.events.on("notify_state_changed", this.whisperSessionStateChangedEventListener);
                        this.whisperSessionInitializer(session).then(result => {
                            try {
                                session.initializeFromData(result);
                                this.events.fire("notify_whisper_initialized", { session });
                            } catch (error) {
                                logError(LogCategory.VOICE, tr("Failed to internally initialize a voice whisper session: %o"), error);
                                session.setSessionState(WhisperSessionState.INITIALIZE_FAILED);
                            }
                        }).catch(error => {
                            logError(LogCategory.VOICE, tr("Failed to initialize whisper session: %o."), error);
                            session.initializeFailed();
                        });

                        session.events.on("notify_timed_out", () => {
                            logTrace(LogCategory.VOICE, tr("Whisper session %d timed out. Dropping session."), session.getClientId());
                            this.dropWhisperSession(session);
                        });
                        this.events.fire("notify_whisper_created", { session: session });
                    } else {
                        session.setRtpTrack(event.track);
                    }
                    break;
                }
                default:
                    logWarn(LogCategory.VOICE, tr("Received audio assignment event with invalid media type (%o)"), event.info.media);
                    break;
            }
        }
    }

    async getConnectionStats(): Promise<ConnectionStatistics> {
        const stats = await this.rtcConnection.getConnectionStatistics();

        return {
            bytesReceived: stats.voiceBytesReceived,
            bytesSend: stats.voiceBytesSent
        };
    }

    private updateSpeakerState() {
        const newState = this.connection.client.isSpeakerMuted() || this.connection.client.isSpeakerDisabled();
        if(this.speakerMuted === newState) { return; }

        this.speakerMuted = newState;
        this.voiceClients.forEach(client => client.setGloballyMuted(this.speakerMuted));
        this.whisperSessions.forEach(session => session.setGloballyMuted(this.speakerMuted));
    }

    getRetryTimestamp(): number | 0 {
        return this.rtcConnection.getRetryTimestamp();
    }
}