/// <reference path="../client.ts" />
/// <reference path="VoiceRecorder.ts" />
class VoiceConnection {
    constructor(client) {
        this.codecs = [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined //opus music
        ];
        this.vpacketId = 0;
        this.chunkVPacketId = 0;
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        this.voiceRecorder.on_data = this.handleVoiceData.bind(this);
        this.voiceRecorder.on_end = this.handleVoiceEnded.bind(this);
        this.codecs[4] = new OpusCodec(1, OpusType.VOIP);
        this.codecs[5] = new OpusCodec(2, OpusType.AUDIO);
        for (let index = 0; index < this.codecs.length; index++) {
            if (!this.codecs[index])
                continue;
            let codec = this.codecs[index];
            console.log("Got codec " + codec.name());
            codec.initialise();
            codec.on_encoded_data = buffer => this.sendVoicePacket(buffer, index);
        }
    }
    sendVoicePacket(data, codec) {
        if (this.dataChannel) {
            this.vpacketId++;
            if (this.vpacketId > 65535)
                this.vpacketId = 0;
            let packet = new Uint8Array(data.byteLength + 2 + 3);
            packet[0] = this.chunkVPacketId++ < 5 ? 1 : 0; //Flag header
            packet[1] = 0; //Flag frag  mented
            packet[2] = (this.vpacketId >> 8) & 0xFF; //HIGHT(voiceID)
            packet[3] = (this.vpacketId >> 0) & 0xFF; //LOW  (voiceID)
            packet[4] = codec; //Codec
            packet.set(data, 5);
            this.dataChannel.send(packet);
        }
        else {
            console.warn("Could not transfer audio (not connected)");
        }
    }
    createSession() {
        const config = {};
        this.rtcPeerConnection = new RTCPeerConnection(config);
        const dataChannelConfig = { ordered: false, maxRetransmits: 0 };
        this.dataChannel = this.rtcPeerConnection.createDataChannel('main', dataChannelConfig);
        this.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
        this.dataChannel.onopen = this.onDataChannelOpen.bind(this);
        this.dataChannel.binaryType = "arraybuffer";
        let sdpConstraints = {};
        sdpConstraints.offerToReceiveAudio = 0;
        sdpConstraints.offerToReceiveVideo = 0;
        this.rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
        this.rtcPeerConnection.createOffer(this.onOfferCreated.bind(this), () => {
            console.error("Could not create ice offer!");
        }, sdpConstraints);
    }
    dropSession() {
        if (this.dataChannel)
            this.dataChannel.close();
        if (this.rtcPeerConnection)
            this.rtcPeerConnection.close();
        //TODO here!
    }
    handleControlPacket(json) {
        if (json["request"] === "create") {
            this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: json["sdp"] }));
        }
        else if (json["request"] === "ice") {
            this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate({ candidate: json["candidate"], sdpMid: json["session"], sdpMLineIndex: json["line"] }));
        }
    }
    //Listeners
    onIceCandidate(event) {
        console.log("Got ice candidate! Event:");
        console.log(event);
        if (event && event.candidate) {
            this.client.serverConnection.sendData(JSON.stringify({
                type: 'WebRTC',
                request: "ice",
                candidate: event.candidate.candidate,
                line: event.candidate.sdpMLineIndex,
                session: event.candidate.sdpMid
            }));
        }
    }
    onOfferCreated(localSession) {
        console.log("Offer created and accepted");
        this.rtcPeerConnection.setLocalDescription(localSession);
        this.client.serverConnection.sendData(JSON.stringify({ type: 'WebRTC', request: "create", session: localSession }));
    }
    onDataChannelOpen(channel) {
        console.log("Got new data channel!");
    }
    onDataChannelMessage(message) {
        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];
        //console.log("Client id " + clientId + " PacketID " + packetId + " Codec: " + codec);
        let client = this.client.channelTree.findClient(clientId);
        if (!client) {
            console.error("Having  voice from unknown client? (ClientID: " + clientId + ")");
            return;
        }
        if (!this.codecs[codec]) {
            console.error("Could not playback codec " + codec);
            return;
        }
        let encodedData;
        if (message.data.subarray)
            encodedData = message.data.subarray(5);
        else
            encodedData = new Uint8Array(message.data, 5);
        if (encodedData.length == 0) {
            client.getAudioController().stopAudio();
        }
        else {
            this.codecs[codec].decodeSamples(encodedData).then(buffer => {
                client.getAudioController().playBuffer(buffer);
            }).catch(error => {
                console.error("Could not playback client's (" + clientId + ") audio (" + error + ")");
            });
        }
    }
    handleVoiceData(data, head) {
        if (head) {
            this.chunkVPacketId = 0;
            this.client.getClient().speaking = true;
        }
        this.codecs[4].encodeSamples(data); //TODO Use channel codec!
        //this.client.getClient().getAudioController().play(data);
    }
    handleVoiceEnded() {
        console.log("Voice ended");
        this.client.getClient().speaking = false;
        this.sendVoicePacket(new Uint8Array(0), 4); //TODO Use channel codec!
    }
}
//# sourceMappingURL=VoiceHandler.js.map