import {
    AbstractVoiceConnection,
    VoiceConnectionStatus,
    WhisperSessionInitializer
} from "tc-shared/connection/VoiceConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClient} from "tc-shared/voice/VoiceClient";
import {WhisperSession, WhisperSessionState, WhisperTarget} from "tc-shared/voice/VoiceWhisper";
import {RTCConnection, RTCConnectionEvents, RTPConnectionState} from "tc-backend/web/rtc/Connection";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import {VoicePlayerState} from "tc-shared/voice/VoicePlayer";
import * as log from "tc-shared/log";
import {LogCategory, logError, logTrace, logWarn} from "tc-shared/log";
import * as aplayer from "../../audio/player";
import {tr} from "tc-shared/i18n/localize";
import {RtpVoiceClient} from "tc-backend/web/rtc/voice/VoiceClient";
import {InputConsumerType} from "tc-shared/voice/RecorderBase";

export class RtpVoiceConnection extends AbstractVoiceConnection {
    private readonly rtcConnection: RTCConnection;

    private readonly listenerRtcAudioAssignment;
    private readonly listenerRtcStateChanged;
    private listenerClientMoved;

    private connectionState: VoiceConnectionStatus;
    private localFailedReason: string;

    private localAudioDestination: MediaStreamAudioDestinationNode;
    private currentAudioSourceNode: AudioNode;
    private currentAudioSource: RecorderProfile;

    private voiceClients: RtpVoiceClient[] = [];

    private currentlyReplayingVoice: boolean = false;
    private readonly voiceClientStateChangedEventListener;
    private readonly whisperSessionStateChangedEventListener;


    constructor(connection: AbstractServerConnection, rtcConnection: RTCConnection) {
        super(connection);

        this.rtcConnection = rtcConnection;
        this.voiceClientStateChangedEventListener = this.handleVoiceClientStateChange.bind(this);

        this.rtcConnection.getEvents().on("notify_audio_assignment_changed",
            this.listenerRtcAudioAssignment = event => this.handleAudioAssignmentChanged(event));

        this.rtcConnection.getEvents().on("notify_state_changed",
            this.listenerRtcStateChanged = event => this.handleRtcConnectionStateChanged(event));

        this.listenerClientMoved = this.rtcConnection.getConnection().command_handler_boss().register_explicit_handler("notifyclientmoved", event => {
            const localClientId = this.rtcConnection.getConnection().client.getClientId();
            for(const data of event.arguments) {
                if(parseInt(data["clid"]) === localClientId) {
                    /* TODO: Error handling if we failed to start */
                    this.rtcConnection.startTrackBroadcast("audio");
                }
            }
        });


        this.setConnectionState(VoiceConnectionStatus.Disconnected);
        aplayer.on_ready(() => {
            this.localAudioDestination = aplayer.context().createMediaStreamDestination();
            if(this.currentAudioSourceNode) {
                this.currentAudioSourceNode.connect(this.localAudioDestination);
            }
        });
    }

    destroy() {
        if(this.listenerClientMoved) {
            this.listenerClientMoved();
            this.listenerClientMoved = undefined;
        }

        this.rtcConnection.getEvents().off("notify_audio_assignment_changed", this.listenerRtcAudioAssignment);
        this.rtcConnection.getEvents().off("notify_state_changed", this.listenerRtcStateChanged);

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

        this.events.fire("notify_recorder_changed");
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

        this.rtcConnection.setTrackSource("audio", null).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
        });
    }

    private handleRecorderStart() {
        const chandler = this.connection.client;
        if(chandler.isMicrophoneMuted()) {
            log.warn(LogCategory.VOICE, tr("Received local voice started event, even thou we're muted!"));
            return;
        }

        log.info(LogCategory.VOICE, tr("Local voice started"));

        const ch = chandler.getClient();
        if(ch) ch.speaking = true;
        this.rtcConnection.setTrackSource("audio", this.localAudioDestination.stream.getAudioTracks()[0])
            .catch(error => {
                logError(LogCategory.AUDIO, tr("Failed to set current audio track: %o"), error);
            });
    }

    private handleRecorderUnmount() {
        log.info(LogCategory.VOICE, "Lost recorder!");
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
        return 5;
    }
    setEncoderCodec(codec: number) { }


    availableVoiceClients(): VoiceClient[] {
        return Object.values(this.voiceClients);
    }

    registerVoiceClient(clientId: number) {
        if(typeof this.voiceClients[clientId] !== "undefined") {
            throw tr("voice client already registered");
        }

        const client = new RtpVoiceClient(clientId);
        this.voiceClients[clientId] = client;
        client.events.on("notify_state_changed", this.voiceClientStateChangedEventListener);
        return client;
    }

    unregisterVoiceClient(client: VoiceClient) {
        if(!(client instanceof RtpVoiceClient))
            throw "Invalid client type";

        console.error("Destroy voice client %d", client.getClientId());
        client.events.off("notify_state_changed", this.voiceClientStateChangedEventListener);
        delete this.voiceClients[client.getClientId()];
        client.destroy();
    }

    stopAllVoiceReplays() {
    }


    getWhisperSessionInitializer(): WhisperSessionInitializer | undefined {
        return undefined;
    }

    setWhisperSessionInitializer(initializer: WhisperSessionInitializer | undefined) {
    }

    getWhisperSessions(): WhisperSession[] {
        return [];
    }

    getWhisperTarget(): WhisperTarget | undefined {
        return undefined;
    }

    dropWhisperSession(session: WhisperSession) {
    }

    startWhisper(target: WhisperTarget): Promise<void> {
        return Promise.resolve(undefined);
    }

    stopWhisper() { }

    private handleVoiceClientStateChange(/* event: VoicePlayerEvents["notify_state_changed"] */) {
        this.updateVoiceReplaying();
    }

    private handleWhisperSessionStateChange() {
        this.updateVoiceReplaying();
    }

    private updateVoiceReplaying() {
        let replaying = false;

        /* if(this.connectionState === VoiceConnectionStatus.Connected) */ {
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
        if(this.connectionState === state)
            return;

        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_connection_status_changed", { newStatus: state, oldStatus: oldState });
    }

    private handleRtcConnectionStateChanged(event: RTCConnectionEvents["notify_state_changed"]) {
        switch (event.newState) {
            case RTPConnectionState.CONNECTED:
                this.rtcConnection.startTrackBroadcast("audio").then(() => {
                    logTrace(LogCategory.VOICE, tr("Local audio broadcasting has been started successfully"));
                    this.setConnectionState(VoiceConnectionStatus.Connected);
                }).catch(error => {
                    logError(LogCategory.VOICE, tr("Failed to start voice audio broadcasting: %o"), error);
                    this.localFailedReason = tr("Failed to start audio broadcasting");
                    this.setConnectionState(VoiceConnectionStatus.Failed);
                });
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
        }
    }

    private handleAudioAssignmentChanged(event: RTCConnectionEvents["notify_audio_assignment_changed"]) {
        const oldClient = Object.values(this.voiceClients).find(client => client.getRtpTrack() === event.track);
        if(oldClient) {
            oldClient.setRtpTrack(undefined);
        }

        if(event.info) {
            const newClient = this.voiceClients[event.info.client_id];
            if(newClient) {
                newClient.setRtpTrack(event.track);
            } else {
                logWarn(LogCategory.AUDIO, tr("Received audio track assignment for unknown voice client (%o)."), event.info);
            }
        }
    }
}