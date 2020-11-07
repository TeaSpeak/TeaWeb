import {AbstractInput, InputConsumerType, NodeInputConsumer} from "tc-shared/voice/RecorderBase";
import * as aplayer from "tc-backend/web/audio/player";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {WebRTCVoiceBridge} from "./WebRTCVoiceBridge";
import {VoiceWhisperPacket} from "tc-backend/web/voice/bridge/VoiceBridge";
import {CryptoHelper} from "tc-shared/profiles/identities/TeamSpeakIdentity";
import arraybuffer_to_string = CryptoHelper.arraybuffer_to_string;

export class NativeWebRTCVoiceBridge extends WebRTCVoiceBridge {
    static isSupported(): boolean {
        const context = window.webkitAudioContext || window.AudioContext;
        if (!context)
            return false;

        if (!context.prototype.createMediaStreamDestination)
            return false; /* Required, but not available within edge */

        return true;
    }

    private readonly localVoiceDestinationNode: MediaStreamAudioDestinationNode;
    private readonly localWhisperDestinationNode: MediaStreamAudioDestinationNode;
    private currentInputNode: AudioNode;
    private currentInput: AbstractInput;
    private whispering: boolean;

    constructor() {
        super();

        this.whispering = false;
        this.localVoiceDestinationNode = aplayer.context().createMediaStreamDestination();
        this.localWhisperDestinationNode = aplayer.context().createMediaStreamDestination();
    }

    protected generateRtpOfferOptions(): RTCOfferOptions {
        let options: RTCOfferOptions = {};
        options.offerToReceiveAudio = false;
        options.offerToReceiveVideo = false;
        options.voiceActivityDetection = true;
        return options;
    }

    protected initializeRtpConnection(connection: RTCPeerConnection) {
        connection.addTrack(this.localVoiceDestinationNode.stream.getAudioTracks()[0]);
        connection.addTrack(this.localWhisperDestinationNode.stream.getAudioTracks()[0]);
    }

    protected handleVoiceDataChannelMessage(message: MessageEvent) {
        super.handleVoiceDataChannelMessage(message);

        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];

        this.callback_incoming_voice({
            clientId: clientId,
            voiceId: packetId,
            codec: codec,
            head: false,
            payload: new Uint8Array(message.data, 5)
        });
    }

    protected handleWhisperDataChannelMessage(message: MessageEvent) {
        super.handleWhisperDataChannelMessage(message);

        let payload = new Uint8Array(message.data);
        let payload_offset = 0;

        const flags = payload[payload_offset++];

        let packet = {
            head: (flags & 0x01) === 1
        } as VoiceWhisperPacket;

        if(packet.head) {
            packet.clientUniqueId = arraybuffer_to_string(payload.subarray(payload_offset, payload_offset + 28));
            payload_offset += 28;

            packet.clientNickname = arraybuffer_to_string(payload.subarray(payload_offset + 1, payload_offset + 1 + payload[payload_offset]));
            payload_offset += payload[payload_offset] + 1;
        }
        packet.voiceId = payload[payload_offset] << 8 | payload[payload_offset + 1];
        payload_offset += 2;

        packet.clientId = payload[payload_offset] << 8 | payload[payload_offset + 1];
        payload_offset += 2;

        packet.codec = payload[payload_offset++];
        packet.payload = new Uint8Array(message.data, payload_offset);
        this.callback_incoming_whisper(packet);
    }

    getInput(): AbstractInput | undefined {
        return this.currentInput;
    }

    async setInput(input: AbstractInput | undefined) {
        if (this.currentInput === input)
            return;

        if (this.currentInput) {
            await this.currentInput.setConsumer(undefined);
            this.currentInput = undefined;
        }

        this.currentInput = input;

        if (this.currentInput) {
            try {
                await this.currentInput.setConsumer({
                    type: InputConsumerType.NODE,
                    callbackNode: node => {
                        this.currentInputNode = node;
                        node.connect(this.whispering ? this.localWhisperDestinationNode : this.localVoiceDestinationNode);
                    },
                    callbackDisconnect: node => {
                        this.currentInputNode = undefined;
                        node.disconnect(this.whispering ? this.localWhisperDestinationNode : this.localVoiceDestinationNode);
                    }
                } as NodeInputConsumer);
                log.debug(LogCategory.VOICE, tr("Successfully set/updated to the new input for the recorder"));
            } catch (e) {
                log.warn(LogCategory.VOICE, tr("Failed to set consumer to the new recorder input: %o"), e);
            }
        }
    }

    sendStopSignal(codec: number) {
        /*
         * No stop signal needs to be send.
         * The server will automatically send one, when the stream contains silence.
         */
    }

    startWhispering() {
        if(this.whispering) {
            return;
        }

        this.whispering = true;
        if(this.currentInputNode) {
            this.currentInputNode.disconnect(this.localVoiceDestinationNode);
            this.currentInputNode.connect(this.localWhisperDestinationNode);
        }
    }

    stopWhispering() {
        if(!this.whispering) {
            return;
        }

        this.whispering = false;
        if(this.currentInputNode) {
            this.currentInputNode.connect(this.localVoiceDestinationNode);
            this.currentInputNode.disconnect(this.localWhisperDestinationNode);
        }
    }
}

