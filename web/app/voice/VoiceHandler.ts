import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as aplayer from "../audio/player";
import {ServerConnection} from "../connection/ServerConnection";
import {RecorderProfile} from "tc-shared/voice/RecorderProfile";
import {VoiceClientController} from "./VoiceClient";
import {settings, ValuedSettingsKey} from "tc-shared/settings";
import {CallbackInputConsumer, InputConsumerType, NodeInputConsumer} from "tc-shared/voice/RecorderBase";
import {tr} from "tc-shared/i18n/localize";
import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {AbstractVoiceConnection, VoiceClient, VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {codecPool, CodecPool} from "tc-backend/web/voice/CodecConverter";

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
    readonly connection: ServerConnection;

    connectionState: VoiceConnectionStatus;
    rtcPeerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;

    private connectionType: VoiceEncodeType = VoiceEncodeType.NATIVE_ENCODE;

    private localAudioStarted = false;
    /*
     * To ensure we're not sending any audio because the settings activates the input,
     * we self mute the audio stream
     */
    local_audio_mute: GainNode;
    local_audio_stream: MediaStreamAudioDestinationNode;

    static codecSupported(type: number) : boolean {
        return !!codecPool && codecPool.length > type && codecPool[type].supported();
    }

    private voice_packet_id: number = 0;
    private chunkVPacketId: number = 0;
    private send_task: number;

    private _audio_source: RecorderProfile;
    private _audio_clients: VoiceClientController[] = [];

    private _encoder_codec: number = 5;

    constructor(connection: ServerConnection) {
        super(connection);

        this.connectionState = VoiceConnectionStatus.Disconnected;

        this.connection = connection;
        this.connectionType = settings.static_global(KEY_VOICE_CONNECTION_TYPE, this.connectionType);
    }

    getConnectionState(): VoiceConnectionStatus {
        return this.connectionState;
    }

    destroy() {
        clearInterval(this.send_task);
        this.drop_rtp_session();
        this.acquire_voice_recorder(undefined, true).catch(error => {
            log.warn(LogCategory.VOICE, tr("Failed to release voice recorder: %o"), error);
        }).then(() => {
            for(const client of this._audio_clients)  {
                client.abort_replay();
                client.callback_playback = undefined;
                client.callback_state_changed = undefined;
                client.callback_stopped = undefined;
            }
            this._audio_clients = undefined;
            this._audio_source = undefined;
        });
        this.events.destroy();
    }

    static native_encoding_supported() : boolean {
        const context = window.webkitAudioContext || window.AudioContext;
        if(!context)
            return false;

        if(!context.prototype.createMediaStreamDestination)
            return false; /* Required, but not available within edge */

        return true;
    }

    static javascript_encoding_supported() : boolean {
        return typeof window.RTCPeerConnection !== "undefined" && typeof window.RTCPeerConnection.prototype.createDataChannel === "function";
    }

    current_encoding_supported() : boolean {
        switch (this.connectionType) {
            case VoiceEncodeType.JS_ENCODE:
                return VoiceConnection.javascript_encoding_supported();
            case VoiceEncodeType.NATIVE_ENCODE:
                return VoiceConnection.native_encoding_supported();
        }
        return false;
    }

    private setup_native() {
        log.info(LogCategory.VOICE, tr("Setting up native voice stream!"));
        if(!VoiceConnection.native_encoding_supported()) {
            log.warn(LogCategory.VOICE, tr("Native codec isn't supported!"));
            return;
        }

        if(!this.local_audio_stream) {
            this.local_audio_stream = aplayer.context().createMediaStreamDestination();
        }
        if(!this.local_audio_mute) {
            this.local_audio_mute = aplayer.context().createGain();
            this.local_audio_mute.connect(this.local_audio_stream);
            this.local_audio_mute.gain.value = 1;
        }
    }

    private setup_js() {
        if(!VoiceConnection.javascript_encoding_supported()) return;
        if(!this.send_task)
            this.send_task = setInterval(this.send_next_voice_packet.bind(this), 20); /* send all 20ms out voice packets */
    }

    async acquire_voice_recorder(recorder: RecorderProfile | undefined, enforce?: boolean) {
        if(this._audio_source === recorder && !enforce)
            return;

        if(recorder) {
            await recorder.unmount();
        }

        if(this._audio_source) {
            await this._audio_source.unmount();
        }

        this.handleLocalVoiceEnded();
        this._audio_source = recorder;

        if(recorder) {
            recorder.current_handler = this.connection.client;

            recorder.callback_unmount = this.on_recorder_yield.bind(this);
            recorder.callback_start = this.handleLocalVoiceStarted.bind(this);
            recorder.callback_stop = this.handleLocalVoiceEnded.bind(this);

            recorder.callback_input_change = async (old_input, new_input) => {
                if(old_input) {
                    try {
                        await old_input.set_consumer(undefined);
                    } catch(error) {
                        log.warn(LogCategory.VOICE, tr("Failed to release own consumer from old input: %o"), error);
                    }
                }
                if(new_input) {
                    if(this.connectionType == VoiceEncodeType.NATIVE_ENCODE) {
                        if(!this.local_audio_stream)
                            this.setup_native(); /* requires initialized audio */

                        try {
                            await new_input.set_consumer({
                                type: InputConsumerType.NODE,
                                callback_node: node => {
                                    if(!this.local_audio_stream || !this.local_audio_mute)
                                        return;

                                    node.connect(this.local_audio_mute);
                                },
                                callback_disconnect: node => {
                                    if(!this.local_audio_mute)
                                        return;

                                    node.disconnect(this.local_audio_mute);
                                }
                            } as NodeInputConsumer);
                            log.debug(LogCategory.VOICE, tr("Successfully set/updated to the new input for the recorder"));
                        } catch (e) {
                            log.warn(LogCategory.VOICE, tr("Failed to set consumer to the new recorder input: %o"), e);
                        }
                    } else {
                        try {
                            await recorder.input.set_consumer({
                                type: InputConsumerType.CALLBACK,
                                callback_audio: buffer => this.handleLocalVoiceBuffer(buffer, false)
                            } as CallbackInputConsumer);

                            log.debug(LogCategory.VOICE, tr("Successfully set/updated to the new input for the recorder"));
                        } catch (e) {
                            log.warn(LogCategory.VOICE, tr("Failed to set consumer to the new recorder input: %o"), e);
                        }
                    }
                }
            };
        }

        this.events.fire("notify_recorder_changed");
    }

    get_encoder_type() : VoiceEncodeType { return this.connectionType; }
    set_encoder_type(target: VoiceEncodeType) {
        if(target == this.connectionType) return;
        this.connectionType = target;

        if(this.connectionType == VoiceEncodeType.NATIVE_ENCODE)
            this.setup_native();
        else
            this.setup_js();
        this.start_rtc_session();
    }

    voice_playback_support() : boolean {
        return this.dataChannel && this.dataChannel.readyState == "open";
    }

    voice_send_support() : boolean {
        if(this.connectionType == VoiceEncodeType.NATIVE_ENCODE)
            return VoiceConnection.native_encoding_supported() && this.rtcPeerConnection.getLocalStreams().length > 0;
        else
            return this.voice_playback_support();
    }

    private voice_send_queue: {data: Uint8Array, codec: number}[] = [];
    handleEncodedVoicePacket(data: Uint8Array, codec: number){
        this.voice_send_queue.push({data: data, codec: codec});
    }

    private send_next_voice_packet() {
        const buffer = this.voice_send_queue.pop_front();
        if(!buffer)
            return;
        this.sendVoicePacket(buffer.data, buffer.codec);
    }

    private fillVoicePacketHeader(packet: Uint8Array, codec: number) {
        packet[0] = this.chunkVPacketId++ < 5 ? 1 : 0; //Flag header
        packet[1] = 0; //Flag fragmented
        packet[2] = (this.voice_packet_id >> 8) & 0xFF; //HIGHT (voiceID)
        packet[3] = (this.voice_packet_id >> 0) & 0xFF; //LOW   (voiceID)
        packet[4] = codec; //Codec
    }

    sendVoicePacket(encoded_data: Uint8Array, codec: number) {
        if(this.dataChannel) {
            this.voice_packet_id++;
            if(this.voice_packet_id > 65535)
                this.voice_packet_id = 0;

            let packet = new Uint8Array(encoded_data.byteLength + 5);
            this.fillVoicePacketHeader(packet, codec);
            packet.set(encoded_data, 5);

            try {
                this.dataChannel.send(packet);
            } catch (error) {
                log.warn(LogCategory.VOICE, tr("Failed to send voice packet. Error: %o"), error);
            }
        } else {
            log.warn(LogCategory.VOICE, tr("Could not transfer audio (not connected)"));
        }
    }

    sendVoiceStopPacket(codec: number) {
        if(!this.dataChannel)
            return;

        const packet = new Uint8Array(5);
        this.fillVoicePacketHeader(packet, codec);

        try {
            this.dataChannel.send(packet);
        } catch (error) {
            log.warn(LogCategory.VOICE, tr("Failed to send voice packet. Error: %o"), error);
        }
    }

    private _audio_player_waiting = false;
    start_rtc_session() {
        if(!aplayer.initialized()) {
            log.info(LogCategory.VOICE, tr("Audio player isn't initialized yet. Waiting for gesture."));
            if(!this._audio_player_waiting) {
                this._audio_player_waiting = true;
                aplayer.on_ready(() => this.start_rtc_session());
            }
            return;
        }

        if(!this.current_encoding_supported())
            return false;

        if(this.connectionType == VoiceEncodeType.NATIVE_ENCODE)
            this.setup_native();
        else
            this.setup_js();

        this.drop_rtp_session();
        this._ice_use_cache = true;

        this.setConnectionState(VoiceConnectionStatus.Connecting);
        let config: RTCConfiguration = {};
        config.iceServers = [];
        config.iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
        //config.iceServers.push({ urls: "stun:stun.teaspeak.de:3478" });
        this.rtcPeerConnection = new RTCPeerConnection(config);
        const dataChannelConfig = { ordered: false, maxRetransmits: 0 };

        this.dataChannel = this.rtcPeerConnection.createDataChannel('main', dataChannelConfig);
        this.dataChannel.onmessage = this.onMainDataChannelMessage.bind(this);
        this.dataChannel.onopen = this.onMainDataChannelOpen.bind(this);
        this.dataChannel.binaryType = "arraybuffer";

        let sdpConstraints : RTCOfferOptions = {};
        sdpConstraints.offerToReceiveAudio = this.connectionType == VoiceEncodeType.NATIVE_ENCODE;
        sdpConstraints.offerToReceiveVideo = false;
        sdpConstraints.voiceActivityDetection = true;

        this.rtcPeerConnection.onicegatheringstatechange = () => console.log("ICE gathering state changed to %s", this.rtcPeerConnection.iceGatheringState);
        this.rtcPeerConnection.oniceconnectionstatechange = () => console.log("ICE connection state changed to %s", this.rtcPeerConnection.iceConnectionState);
        this.rtcPeerConnection.onicecandidate = this.on_local_ice_candidate.bind(this);
        if(this.local_audio_stream) { //May a typecheck?
            this.rtcPeerConnection.addStream(this.local_audio_stream.stream);
            log.info(LogCategory.VOICE, tr("Adding native audio stream (%o)!"), this.local_audio_stream.stream);
        }

        this.rtcPeerConnection.createOffer(sdpConstraints)
            .then(offer => this.on_local_offer_created(offer))
            .catch(error => {
                log.error(LogCategory.VOICE, tr("Could not create ice offer! error: %o"), error);
            });
    }

    drop_rtp_session() {
        if(this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = undefined;
        }

        if(this.rtcPeerConnection) {
            this.rtcPeerConnection.close();
            this.rtcPeerConnection = undefined;
        }

        this._ice_use_cache = true;
        this._ice_cache = [];

        this.setConnectionState(VoiceConnectionStatus.Disconnected);
    }

    private registerRemoteICECandidate(candidate: RTCIceCandidate) {
        if(candidate.candidate === "") {
            console.log("Adding end candidate");
            this.rtcPeerConnection.addIceCandidate(null).catch(error => {
                log.info(LogCategory.VOICE, tr("Failed to add remote cached ice candidate finish: %o"), error);
            });
            return;
        }

        const pcandidate = new RTCIceCandidate(candidate);
        if(pcandidate.protocol !== "tcp") return; /* UDP does not work currently */

        log.info(LogCategory.VOICE, tr("Add remote ice! (%o)"), pcandidate);
        this.rtcPeerConnection.addIceCandidate(pcandidate).catch(error => {
            log.info(LogCategory.VOICE, tr("Failed to add remote cached ice candidate %o: %o"), candidate, error);
        });
    }

    private _ice_use_cache: boolean = true;
    private _ice_cache: RTCIceCandidate[] = [];
    handleControlPacket(json) {
        if(json["request"] === "answer") {
            const session_description = new RTCSessionDescription(json["msg"]);
            log.info(LogCategory.VOICE, tr("Received answer to our offer. Answer: %o"), session_description);
            this.rtcPeerConnection.setRemoteDescription(session_description).then(() => {
                log.info(LogCategory.VOICE, tr("Answer applied successfully. Applying ICE candidates (%d)."), this._ice_cache.length);
                this._ice_use_cache = false;

                for(let candidate of this._ice_cache)
                    this.registerRemoteICECandidate(candidate);
                this._ice_cache = [];
            }).catch(error => {
                log.info(LogCategory.VOICE, tr("Failed to apply remote description: %o"), error); //FIXME error handling!
            });
        } else if(json["request"] === "ice" || json["request"] === "ice_finish") {
            const candidate = new RTCIceCandidate(json["msg"]);
            if(!this._ice_use_cache) {
                this.registerRemoteICECandidate(candidate);
            } else {
                log.info(LogCategory.VOICE, tr("Cache remote ice! (%o)"), json["msg"]);
                this._ice_cache.push(candidate);
            }
        } else if(json["request"] == "status") {
            if(json["state"] == "failed") {
                const chandler = this.connection.client;
                chandler.log.log(EventType.CONNECTION_VOICE_SETUP_FAILED, {
                    reason: json["reason"],
                    reconnect_delay: json["allow_reconnect"] ? 1 : 0
                });
                log.error(LogCategory.NETWORKING, tr("Failed to setup voice bridge (%s). Allow reconnect: %s"), json["reason"], json["allow_reconnect"]);
                if(json["allow_reconnect"] == true) {
                    this.start_rtc_session();
                }
                //TODO handle fail specially when its not allowed to reconnect
            }
        } else {
            log.warn(LogCategory.NETWORKING, tr("Received unknown web client control packet: %s"), json["request"]);
        }
    }

    private on_local_ice_candidate(event: RTCPeerConnectionIceEvent) {
        if (event) {
            if(event.candidate && event.candidate.protocol !== "tcp")
                return;

            if(event.candidate) {
                log.info(LogCategory.VOICE, tr("Gathered local ice candidate for stream %d: %s"), event.candidate.sdpMLineIndex, event.candidate.candidate);
                this.connection.sendData(JSON.stringify({
                    type: 'WebRTC',
                    request: "ice",
                    msg: event.candidate,
                }));
            } else {
                log.info(LogCategory.VOICE, tr("Local ICE candidate gathering finish."));
                this.connection.sendData(JSON.stringify({
                    type: 'WebRTC',
                    request: "ice_finish"
                }));
            }
        }
    }

    private on_local_offer_created(localSession) {
        log.info(LogCategory.VOICE, tr("Local offer created. Setting up local description. (%o)"), localSession);
        this.rtcPeerConnection.setLocalDescription(localSession).then(() => {
            log.info(LogCategory.VOICE, tr("Offer applied successfully. Sending offer to server."));
            this.connection.sendData(JSON.stringify({type: 'WebRTC', request: "create", msg: localSession}));
        }).catch(error => {
            log.info(LogCategory.VOICE, tr("Failed to apply local description: %o"), error);
            //FIXME error handling
        });
    }

    private onMainDataChannelOpen(channel) {
        log.info(LogCategory.VOICE, tr("Got new data channel! (%s)"), this.dataChannel.readyState);

        this.setConnectionState(VoiceConnectionStatus.Connected);
    }

    private onMainDataChannelMessage(message: MessageEvent) {
        const chandler = this.connection.client;
        if(chandler.isSpeakerMuted() || chandler.isSpeakerDisabled()) /* we dont need to do anything with sound playback when we're not listening to it */
            return;

        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];
        //log.info(LogCategory.VOICE, "Client id " + clientId + " PacketID " + packetId + " Codec: " + codec);
        let client = this.find_client(clientId);
        if(!client) {
            log.error(LogCategory.VOICE, tr("Having voice from unknown audio client? (ClientID: %o)"), clientId);
            return;
        }

        let codec_pool = codecPool[codec];
        if(!codec_pool) {
            log.error(LogCategory.VOICE, tr("Could not playback codec %o"), codec);
            return;
        }

        let encodedData;
        if(message.data.subarray)
            encodedData = message.data.subarray(5);
        else encodedData = new Uint8Array(message.data, 5);

        if(encodedData.length == 0) {
            client.stopAudio();
            codec_pool.releaseCodec(clientId);
        } else {
            codec_pool.ownCodec(clientId, e => this.handleEncodedVoicePacket(e, codec), true)
                .then(decoder => decoder.decodeSamples(client.get_codec_cache(codec), encodedData))
                .then(buffer => client.playback_buffer(buffer)).catch(error => {
                log.error(LogCategory.VOICE, tr("Could not playback client's (%o) audio (%o)"), clientId, error);
                if(error instanceof Error)
                    log.error(LogCategory.VOICE, error.stack);
            });
        }
    }

    private handleLocalVoiceBuffer(data: AudioBuffer, head: boolean) {
        const chandler = this.connection.client;
        if(!this.localAudioStarted || !chandler.connected)
            return false;

        if(chandler.isMicrophoneMuted())
            return false;

        if(head)
            this.chunkVPacketId = 0;

        let client = this.find_client(chandler.getClientId());
        if(!client) {
            log.error(LogCategory.VOICE, tr("Tried to send voice data, but local client hasn't a voice client handle"));
            return;
        }

        const codec = this._encoder_codec;
        codecPool[codec]
            .ownCodec(chandler.getClientId(), e => this.handleEncodedVoicePacket(e, codec), true)
            .then(encoder => encoder.encodeSamples(client.get_codec_cache(codec), data));
    }

    private handleLocalVoiceEnded() {
        const chandler = this.connection.client;
        const ch = chandler.getClient();
        if(ch) ch.speaking = false;

        if(!chandler.connected)
            return false;
        if(chandler.isMicrophoneMuted())
            return false;
        log.info(LogCategory.VOICE, tr("Local voice ended"));
        this.localAudioStarted = false;

        if(this.connectionType === VoiceEncodeType.NATIVE_ENCODE) {
            setTimeout(() => {
                /* first send all data, than send the stop signal */
                this.sendVoiceStopPacket(this._encoder_codec);
            }, 150);
        } else {
            this.sendVoiceStopPacket(this._encoder_codec);
        }
    }

    private handleLocalVoiceStarted() {
        const chandler = this.connection.client;
        if(chandler.isMicrophoneMuted()) {
            log.warn(LogCategory.VOICE, tr("Received local voice started event, even thou we're muted! Do not send any voice."));
            if(this.local_audio_mute)
                this.local_audio_mute.gain.value = 0;
            return;
        }
        if(this.local_audio_mute)
            this.local_audio_mute.gain.value = 1;

        this.localAudioStarted = true;
        log.info(LogCategory.VOICE, tr("Local voice started"));

        const ch = chandler.getClient();
        if(ch) ch.speaking = true;
    }

    private on_recorder_yield() {
        log.info(LogCategory.VOICE, "Lost recorder!");
        this._audio_source = undefined;
        this.acquire_voice_recorder(undefined, true); /* we can ignore the promise because we should finish this directly */
    }

    private setConnectionState(state: VoiceConnectionStatus) {
        if(this.connectionState === state)
            return;

        const oldState = this.connectionState;
        this.connectionState = state;
        this.events.fire("notify_connection_status_changed", { newStatus: state, oldStatus: oldState });
    }

    connected(): boolean {
        return typeof(this.dataChannel) !== "undefined" && this.dataChannel.readyState === "open";
    }

    voice_recorder(): RecorderProfile {
        return this._audio_source;
    }

    available_clients(): VoiceClient[] {
        return this._audio_clients;
    }

    find_client(client_id: number) : VoiceClientController | undefined {
        for(const client of this._audio_clients)
            if(client.client_id === client_id)
                return client;
        return undefined;
    }

    unregister_client(client: VoiceClient): Promise<void> {
        if(!(client instanceof VoiceClientController))
            throw "Invalid client type";

        this._audio_clients.remove(client);
        return Promise.resolve();
    }

    register_client(client_id: number): VoiceClient {
        const client = new VoiceClientController(client_id);
        this._audio_clients.push(client);
        return client;
    }

    decoding_supported(codec: number): boolean {
        return VoiceConnection.codecSupported(codec);
    }

    encoding_supported(codec: number): boolean {
        return VoiceConnection.codecSupported(codec);
    }

    get_encoder_codec(): number {
        return this._encoder_codec;
    }

    set_encoder_codec(codec: number) {
        this._encoder_codec = codec;
    }
}


/* funny fact that typescript dosn't find this */
declare global {
    interface RTCPeerConnection {
        addStream(stream: MediaStream): void;
        getLocalStreams(): MediaStream[];
        getStreamById(streamId: string): MediaStream | null;
        removeStream(stream: MediaStream): void;
        createOffer(successCallback?: RTCSessionDescriptionCallback, failureCallback?: RTCPeerConnectionErrorCallback, options?: RTCOfferOptions): Promise<RTCSessionDescription>;
    }
}