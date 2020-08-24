import {AbstractInput, InputConsumerType, NodeInputConsumer} from "tc-shared/voice/RecorderBase";
import * as aplayer from "tc-backend/web/audio/player";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {WebRTCVoiceBridge} from "./WebRTCVoiceBridge";

export class NativeWebRTCVoiceBridge extends WebRTCVoiceBridge {
    static isSupported(): boolean {
        const context = window.webkitAudioContext || window.AudioContext;
        if (!context)
            return false;

        if (!context.prototype.createMediaStreamDestination)
            return false; /* Required, but not available within edge */

        return true;
    }

    private readonly localAudioDestinationNode: MediaStreamAudioDestinationNode;
    private currentInput: AbstractInput;
    private voicePacketId: number;

    constructor() {
        super();

        this.voicePacketId = 0;
        this.localAudioDestinationNode = aplayer.context().createMediaStreamDestination();
    }

    protected generateRtpOfferOptions(): RTCOfferOptions {
        let options: RTCOfferOptions = {};
        options.offerToReceiveAudio = false;
        options.offerToReceiveVideo = false;
        options.voiceActivityDetection = true;
        return options;
    }

    protected initializeRtpConnection(connection: RTCPeerConnection) {
        connection.addStream(this.localAudioDestinationNode.stream);
    }

    protected handleMainDataChannelMessage(message: MessageEvent) {
        super.handleMainDataChannelMessage(message);

        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];

        this.callback_incoming_voice({
            clientId: clientId,
            voiceId: packetId,
            codec: codec,
            payload: new Uint8Array(message.data, 5)
        });
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
                    callback_node: node => node.connect(this.localAudioDestinationNode),
                    callback_disconnect: node => node.disconnect(this.localAudioDestinationNode)
                } as NodeInputConsumer);
                log.debug(LogCategory.VOICE, tr("Successfully set/updated to the new input for the recorder"));
            } catch (e) {
                log.warn(LogCategory.VOICE, tr("Failed to set consumer to the new recorder input: %o"), e);
            }
        }
    }

    private fillVoicePacketHeader(packet: Uint8Array, codec: number) {
        packet[0] = 0; //Flag header
        packet[1] = 0; //Flag fragmented
        packet[2] = (this.voicePacketId >> 8) & 0xFF; //HIGHT (voiceID)
        packet[3] = (this.voicePacketId >> 0) & 0xFF; //LOW   (voiceID)
        packet[4] = codec; //Codec
        this.voicePacketId++;
    }

    sendStopSignal(codec: number) {
        const packet = new Uint8Array(5);
        this.fillVoicePacketHeader(packet, codec);

        const channel = this.getMainDataChannel();
        if (!channel || channel.readyState !== "open")
            return;

        channel.send(packet);
    }
}