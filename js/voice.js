/// <reference path="client.ts" />
class VoiceConnection {
    /*
    private _voicePacketBuffer: Uint8Array[] = [];
    private _voicePacketSender: NodeJS.Timer;
    private _triggered = false;
    */
    constructor(client) {
        this.vpacketId = 0;
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        this.voiceRecorder.on_data = data => this.handleVoiceData(data);
        this.codec = new OpusCodec();
        this.codec.initialise();
        this.codec.on_encoded_data = buffer => {
            if (this.dataChannel) {
                this.vpacketId++;
                if (this.vpacketId > 65535)
                    this.vpacketId = 0;
                let packet = new Uint8Array(buffer.byteLength + 2 + 3);
                packet[0] = this.vpacketId < 6 ? 1 : 0; //Flag header
                packet[1] = 0; //Flag fragmented
                packet[2] = (this.vpacketId >> 8) & 0xFF; //HIGHT(voiceID)
                packet[3] = (this.vpacketId >> 0) & 0xFF; //LOW  (voiceID)
                packet[4] = 4; //Codec
                packet.set(buffer, 5);
                //this._voicePacketBuffer.push(packet);
                this.dataChannel.send(packet);
            }
        };
        /*
        this._voicePacketSender = setInterval(() => {
            if(this._voicePacketBuffer.length > 5 || this._triggered) {
                let packet = this._voicePacketBuffer.pop_front();
                if (packet) {
                    this.dataChannel.send(packet);
                }
                this._triggered = this._voicePacketBuffer.length > 0;
            }
        }, 20);
        */
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
        this.dataChannel.close();
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
            this.client.serverConnection.send(JSON.stringify({
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
        this.client.serverConnection.send(JSON.stringify({ type: 'WebRTC', request: "create", session: localSession }));
    }
    onDataChannelOpen(channel) {
        console.log("Got new data channel!");
    }
    onDataChannelMessage(message) {
        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];
        console.log("Client id " + clientId + " PacketID " + packetId + " Codec: " + codec);
        let client = this.client.channelTree.findClient(clientId);
        if (!client) {
            console.error("Having  voice from unknown client? (ClientID: " + clientId + ")");
            return;
        }
        var encodedData = new Uint8Array(message.data, 5);
        this.codec.decodeSamples(encodedData).then(buffer => client.getAudioController().play(buffer)).catch(error => {
            console.error("Could not playback client's (" + clientId + ") audio (" + error + ")");
        });
    }
    handleVoiceData(data) {
        setTimeout(() => {
            this.codec.encodeSamples(data);
        }, 1);
    }
}
class VoiceRecorder {
    constructor(handle) {
        this.on_data = (data) => { };
        this._recording = false;
        this.microphoneStream = undefined;
        this.mediaStream = undefined;
        this.handle = handle;
        this.userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        this.audioContext = new AudioContext();
        this.processor = this.audioContext.createScriptProcessor(VoiceRecorder.BUFFER_SIZE, VoiceRecorder.CHANNELS, VoiceRecorder.CHANNELS);
        const _this = this;
        this.processor.addEventListener('audioprocess', ev => {
            console.log(ev.inputBuffer);
            if (_this.microphoneStream)
                this.on_data(ev.inputBuffer);
        });
        //Not needed but make sure we have data for the preprocessor
        this.mute = this.audioContext.createGain();
        this.processor.connect(this.mute);
        this.mute.connect(this.audioContext.destination);
    }
    avariable() {
        return !!this.userMedia;
    }
    update(flag) {
        if (this._recording == flag)
            return;
        if (flag)
            this.start();
        else
            this.stop();
    }
    start() {
        console.log("Attempt recording!");
        this._recording = true;
        this.userMedia({ audio: true }, this.on_microphone.bind(this), error => {
            createErrorModal("Could not resolve microphone!", "Could not resolve microphone!<br>Message: " + error).open();
            console.error("Could not get microphone!");
            console.error(error);
        });
    }
    stop() {
        console.log("Stop recording!");
        this._recording = false;
        if (this.microphoneStream)
            this.microphoneStream.disconnect();
        this.microphoneStream = undefined;
        if (this.mediaStream) {
            if (this.mediaStream.stop)
                this.mediaStream.stop();
            else
                this.mediaStream.getTracks().forEach(value => {
                    value.stop();
                });
        }
        this.mediaStream = undefined;
    }
    on_microphone(stream) {
        if (this.microphoneStream) {
            this.stop(); //Disconnect old stream
        }
        console.log("Start recording!");
        this.mediaStream = stream;
        this.microphoneStream = this.audioContext.createMediaStreamSource(stream);
        this.microphoneStream.connect(this.processor);
    }
}
VoiceRecorder.CHANNEL = 0;
VoiceRecorder.CHANNELS = 1;
VoiceRecorder.BUFFER_SIZE = 16384 / 2;
class AudioController {
    static get globalContext() {
        if (this._globalContext)
            return this._globalContext;
        this._globalContext = new AudioContext();
        return this._globalContext;
    }
    constructor() {
        this.speakerContext = AudioController.globalContext;
        this.nextTime = 0;
        this.last = 0;
        this.audioCache = [];
        this.init = false;
        this.stimeout = null;
        this.onSpeaking = function () { };
        this.onSilence = function () { };
    }
    play(buffer) {
        if (buffer.sampleRate != this.speakerContext.sampleRate)
            console.warn("[AudioController] Source sample rate isnt equal to playback sample rate!");
        this.audioCache.push(buffer);
        let currentTime = new Date().getTime();
        if ((currentTime - this.last) > 50) {
            this.init = false;
            this.nextTime = 0;
            console.log("[Audio] New data");
        }
        this.last = currentTime;
        // make sure we put at least 5 chunks in the buffer before starting
        if ((this.init === true) || ((this.init === false) && (this.audioCache.length > 5))) {
            if (this.init === false) {
                this.onSpeaking();
            }
            this.init = true;
            this.playCache(this.audioCache);
        }
        this.triggerTimeout();
    }
    ;
    playCache(cache) {
        while (cache.length) {
            let buffer = cache.shift();
            let source = this.speakerContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.speakerContext.destination);
            if (this.nextTime == 0) {
                // add a delay of 0.05 seconds
                console.log("New next time!");
                this.nextTime = this.speakerContext.currentTime + .05;
            }
            source.start(this.nextTime);
            this.nextTime += source.buffer.duration;
        }
    }
    ;
    triggerTimeout() {
        if (this.stimeout)
            clearTimeout(this.stimeout);
        this.stimeout = setTimeout(function (_this) {
            _this.onSilence();
            _this.stimeout = null;
        }, 50, this);
    }
    close() {
        clearTimeout(this.stimeout);
    }
}
class Resampler {
    constructor(targetSampleRate = 44100) {
        this.targetSampleRate = targetSampleRate;
    }
    resample(buffer) {
        if (buffer.sampleRate == this.targetSampleRate)
            return new Promise(resolve => resolve(buffer));
        console.log(this.targetSampleRate);
        let context = new OfflineAudioContext(1, Math.ceil(buffer.length * this.targetSampleRate / buffer.sampleRate), this.targetSampleRate);
        let source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
        return context.startRendering();
    }
}
//# sourceMappingURL=voice.js.map