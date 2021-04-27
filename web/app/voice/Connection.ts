import {
    AbstractVoiceConnection,
    VoiceConnectionStatus,
    WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {ConnectionRecorderProfileOwner, RecorderProfile} from "tc-shared/voice/RecorderProfile";
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
import {AbstractInput, InputConsumerType} from "tc-shared/voice/RecorderBase";
import {getAudioBackend} from "tc-shared/audio/Player";
import {RtpVoiceClient} from "./VoiceClient";
import {RtpWhisperSession} from "./WhisperClient";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {CallOnce, crashOnThrow, ignorePromise} from "tc-shared/proto";

type CancelableWhisperTarget = WhisperTarget & { canceled: boolean };
export class RtpVoiceConnection extends AbstractVoiceConnection {
    private readonly rtcConnection: RTCConnection;

    private listenerCallbacks: (() => void)[];

    private connectionState: VoiceConnectionStatus;
    private localFailedReason: string;

    private localAudioDestination: MediaStreamAudioDestinationNode;
    private currentAudioSourceNode: AudioNode;
    private currentAudioSource: RecorderProfile;
    private ignoreRecorderUnmount: boolean;
    private currentAudioListener: (() => void)[];

    private speakerMuted: boolean;
    private voiceClients: {[T: number]: RtpVoiceClient} = {};

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

        this.listenerCallbacks = [];
        this.listenerCallbacks.push(
            this.rtcConnection.getEvents().on("notify_audio_assignment_changed", event => this.handleAudioAssignmentChanged(event))
        );

        this.listenerCallbacks.push(
            this.rtcConnection.getEvents().on("notify_state_changed", event => this.handleRtcConnectionStateChanged(event))
        );

        this.listenerCallbacks.push(
            connection.client.events().on("notify_state_updated", event => {
                if(event.state === "speaker") {
                    this.updateSpeakerState();
                }
            })
        );

        this.listenerCallbacks.push(
            this.rtcConnection.getConnection().getCommandHandler().registerCommandHandler("notifyclientmoved", event => {
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
            })
        );

        this.speakerMuted = connection.client.isSpeakerMuted() || connection.client.isSpeakerDisabled();

        this.setConnectionState(VoiceConnectionStatus.Disconnected);
        getAudioBackend().executeWhenInitialized(() => {
            this.localAudioDestination = getAudioBackend().getAudioContext().createMediaStreamDestination();
            if(this.currentAudioSourceNode) {
                this.currentAudioSourceNode.connect(this.localAudioDestination);
            }
        });

        this.setWhisperSessionInitializer(undefined);
    }

    @CallOnce
    destroy() {
        this.listenerCallbacks?.forEach(callback => callback());
        this.listenerCallbacks = undefined;

        this.ignoreRecorderUnmount = true;
        this.acquireVoiceRecorder(undefined).catch(error => {
            logWarn(LogCategory.VOICE, tr("Failed to release voice recorder: %o"), error);
        });

        for(const key of Object.keys(this.voiceClients)) {
            const client = this.voiceClients[key];
            delete this.voiceClients[key];

            client.abortReplay();
            client.destroy();
        }

        this.currentAudioSource = undefined;

        for(const client of this.whisperSessions) {
            client.getVoicePlayer()?.abortReplay();
            client.destroy();
        }
        this.whisperSessions = [];

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

        this.currentAudioListener?.forEach(callback => callback());
        this.currentAudioListener = undefined;

        if(this.currentAudioSource) {
            this.currentAudioSourceNode?.disconnect(this.localAudioDestination);
            this.currentAudioSourceNode = undefined;

            this.ignoreRecorderUnmount = true;
            await this.currentAudioSource.ownRecorder(undefined);
            this.ignoreRecorderUnmount = false;
        }

        const oldRecorder = recorder;
        this.currentAudioSource = recorder;

        if(recorder) {
            const rtpConnection = this;
            await recorder.ownRecorder(new class extends ConnectionRecorderProfileOwner {
                getConnection(): ConnectionHandler {
                    return rtpConnection.connection.client;
                }

                protected handleRecorderInput(input: AbstractInput) {
                    input.setConsumer({
                        type: InputConsumerType.NODE,
                        callbackDisconnect: node => {
                            if(rtpConnection.currentAudioSourceNode !== node) {
                                /* We're not connected */
                                return;
                            }

                            rtpConnection.currentAudioSourceNode = undefined;
                            if(rtpConnection.localAudioDestination) {
                                node.disconnect(rtpConnection.localAudioDestination);
                            }
                        },
                        callbackNode: node => {
                            if(rtpConnection.currentAudioSourceNode === node) {
                                return;
                            }

                            if(rtpConnection.localAudioDestination) {
                                rtpConnection.currentAudioSourceNode?.disconnect(rtpConnection.localAudioDestination);
                            }

                            rtpConnection.currentAudioSourceNode = node;
                            if(rtpConnection.localAudioDestination) {
                                node.connect(rtpConnection.localAudioDestination);
                            }
                        }
                    });
                }

                protected handleUnmount() {
                    rtpConnection.handleRecorderUnmount();
                }
            });

            this.currentAudioListener = [];
            this.currentAudioListener.push(recorder.events.on("notify_voice_start", () => this.handleRecorderStart()));
            this.currentAudioListener.push(recorder.events.on("notify_voice_end", () => this.handleRecorderStop(tr("recorder event"))));
        }

        if(this.currentAudioSource?.isInputActive()) {
            this.handleRecorderStart();
        } else {
            this.handleRecorderStop(tr("recorder change"));
        }

        this.events.fire("notify_recorder_changed", {
            oldRecorder,
            newRecorder: recorder
        });
    }

    private handleRecorderStop(reason: string) {
        const chandler = this.connection.client;
        chandler.getClient()?.setSpeaking(false);

        logInfo(LogCategory.VOICE, tr("Received local voice end signal (%s)"), reason);
        this.rtcConnection.clearTrackSources(["audio", "audio-whisper"]).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to stop/remove audio RTC tracks: %o"), error);
        });
    }

    private handleRecorderStart() {
        const chandler = this.connection.client;
        if(chandler.isMicrophoneMuted()) {
            logWarn(LogCategory.VOICE, tr("Received local voice started event, even thou we're muted!"));
            return;
        }

        logInfo(LogCategory.VOICE, tr("Local voice started"));

        chandler.getClient()?.setSpeaking(true);

        const audioTrack = this.localAudioDestination.stream.getAudioTracks()[0];
        const audioTarget = this.whisperTarget ? "audio-whisper" : "audio";
        this.rtcConnection.setTrackSource(audioTarget, audioTrack).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
        });
    }

    private handleRecorderUnmount() {
        logInfo(LogCategory.VOICE, "Lost recorder!");
        this.currentAudioSource = undefined;
        ignorePromise(crashOnThrow(this.acquireVoiceRecorder(undefined, true)));
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

        this.handleRecorderStop(tr("whisper start"));
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

        this.handleRecorderStop(tr("whisper stop"));
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
        Object.values(this.voiceClients).forEach(client => client.setGloballyMuted(this.speakerMuted));
        this.whisperSessions.forEach(session => session.setGloballyMuted(this.speakerMuted));
    }

    getRetryTimestamp(): number | 0 {
        return this.rtcConnection.getRetryTimestamp();
    }
}