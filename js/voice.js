/// <reference path="client.ts" />
class VoiceConnection {
    constructor(client) {
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        this.voiceRecorder.on_data = data => this.sendPCMData(data);
        this.codec = new OpusCodec();
        this.codec.initialise();
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
        let clientId = bin[0] << 8 | bin[1];
        console.log("Client id " + clientId);
        let client = this.client.channelTree.findClient(clientId);
        if (!client) {
            console.error("Having  voice from unknown client? (ClientID: " + clientId + ")");
            return;
        }
        var encodedData = new Uint8Array(message.data, 4);
        let result = this.codec.decode(encodedData);
        if (result instanceof Float32Array)
            client.getAudioController().play(result);
        else
            console.log("Invalid decode " + result);
    }
    sendPCMData(data) {
        console.log("SEND DATA!");
        //console.log(data);
        //FIXME just for debug
        if (this.dataChannel) {
            console.log("XXX");
            let enbcoded = this.codec.encode(data);
            if (enbcoded instanceof Uint8Array)
                this.dataChannel.send(enbcoded);
            else
                console.log("Invalid decode " + enbcoded);
        }
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
            if (_this.microphoneStream)
                this.on_data(ev.inputBuffer.getChannelData(VoiceRecorder.CHANNEL));
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
VoiceRecorder.BUFFER_SIZE = 4096;
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
    play(pcm) {
        let buffer = this.speakerContext.createBuffer(1, 960, 48000);
        buffer.copyToChannel(pcm, 0);
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
            var buffer = cache.shift();
            var source = this.speakerContext.createBufferSource();
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
//# sourceMappingURL=voice.js.map