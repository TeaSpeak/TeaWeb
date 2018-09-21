/// <reference path="../client.ts" />
/// <reference path="../codec/Codec.ts" />
/// <reference path="VoiceRecorder.ts" />

class CodecPoolEntry {
    instance: BasicCodec;
    owner: number;

    last_access: number;
}

class CodecPool {
    handle: VoiceConnection;
    codecIndex: number;
    name: string;
    creator: () => BasicCodec;

    entries: CodecPoolEntry[] = [];
    maxInstances: number = 2;

    private _supported: boolean = true;

    initialize(cached: number) {
        for(let i = 0; i < cached; i++)
            this.ownCodec(i + 1).then(codec => {
                console.log("Release again! (%o)", codec);
                this.releaseCodec(i + 1);
            }).catch(error => {
                if(this._supported) {
                    createErrorModal("Could not load codec driver", "Could not load or initialize codec " + this.name + "<br>" +
                        "Error: <code>" + JSON.stringify(error) + "</code>").open();
                }
                this._supported = false;
                console.error(error);
            });
    }

    supported() { return this.creator != undefined && this._supported; }

    ownCodec?(clientId: number, create: boolean = true) : Promise<BasicCodec | undefined> {
        return new Promise<BasicCodec>((resolve, reject) => {
            if(!this.creator || !this._supported) {
                reject("unsupported codec!");
                return;
            }

            let freeSlot = 0;
            for(let index = 0; index < this.entries.length; index++) {
                if(this.entries[index].owner == clientId) {
                    this.entries[index].last_access = new Date().getTime();
                    if(this.entries[index].instance.initialized()) resolve(this.entries[index].instance);
                    else {
                        this.entries[index].instance.initialise().then((flag) => {
                            //TODO test success flag
                            this.ownCodec(clientId, false).then(resolve).catch(reject);
                        }).catch(error => {
                            console.error("Could not initialize codec!\nError: %o", error);
                            reject("Could not initialize codec!");
                        });
                    }
                    return;
                } else if(freeSlot == 0 && this.entries[index].owner == 0) {
                    freeSlot = index;
                }
            }

            if(!create) {
                resolve(undefined);
                return;
            }

            if(freeSlot == 0){
                freeSlot = this.entries.length;
                let entry = new CodecPoolEntry();
                entry.instance = this.creator();
                entry.instance.on_encoded_data = buffer => this.handle.handleEncodedVoicePacket(buffer, this.codecIndex);
                this.entries.push(entry);
            }
            this.entries[freeSlot].owner = clientId;
            this.entries[freeSlot].last_access = new Date().getTime();
            if(this.entries[freeSlot].instance.initialized())
                this.entries[freeSlot].instance.reset();
            else {
                this.ownCodec(clientId, false).then(resolve).catch(reject);
                return;
            }
            resolve(this.entries[freeSlot].instance);
        });
    }

    releaseCodec(clientId: number) {
        for(let index = 0; index < this.entries.length; index++)
            if(this.entries[index].owner == clientId) this.entries[index].owner = 0;
    }

    constructor(handle: VoiceConnection, index: number, name: string, creator: () => BasicCodec){
        this.creator = creator;
        this.handle = handle;
        this.codecIndex = index;
        this.name = name;
    }
}

enum VoiceConnectionType {
    JS_ENCODE,
    NATIVE_ENCODE
}

class VoiceConnection {
    client: TSClient;
    rtcPeerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;

    voiceRecorder: VoiceRecorder;
    type: VoiceConnectionType = VoiceConnectionType.NATIVE_ENCODE;

    local_audio_stream: any;

    private codec_pool: CodecPool[] = [
        new CodecPool(this,0,"Spex A", undefined), //Spex
        new CodecPool(this,1,"Spex B", undefined), //Spex
        new CodecPool(this,2,"Spex C", undefined), //Spex
        new CodecPool(this,3,"CELT Mono", undefined), //CELT Mono
        new CodecPool(this,4,"Opus Voice", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 1) }), //opus voice
        new CodecPool(this,5,"Opus Music", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 2) })  //opus music
    ];

    private vpacketId: number = 0;
    private chunkVPacketId: number = 0;
    private send_task: number = 0;

    constructor(client) {
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        if(this.type != VoiceConnectionType.NATIVE_ENCODE) {
            this.voiceRecorder.on_data = this.handleVoiceData.bind(this);
        }
        this.voiceRecorder.on_end = this.handleVoiceEnded.bind(this);
        this.voiceRecorder.reinitialiseVAD();

        AudioController.on_initialized(() => {
            this.codec_pool[4].initialize(2);
            this.codec_pool[5].initialize(2);

            if(this.type == VoiceConnectionType.NATIVE_ENCODE) {
                let stream =  this.voiceRecorder.get_output_stream();
                stream.disconnect();

                this.local_audio_stream = AudioController.globalContext.createMediaStreamDestination();
                stream.connect(this.local_audio_stream);
            }
        });

        this.send_task = setInterval(this.sendNextVoicePacket.bind(this), 20);
    }

    codecSupported(type: number) : boolean {
        return this.codec_pool.length > type && this.codec_pool[type].supported();
    }

    voiceSupported() : boolean {
        return this.dataChannel && this.dataChannel.readyState == "open";
    }

    private voice_send_queue: {data: Uint8Array, codec: number}[] = [];
    handleEncodedVoicePacket(data: Uint8Array, codec: number){
        this.voice_send_queue.push({data: data, codec: codec});
    }

    private sendNextVoicePacket() {
        let buffer = this.voice_send_queue.pop_front();
        if(!buffer) return;
        this.sendVoicePacket(buffer.data, buffer.codec);
    }

    sendVoicePacket(data: Uint8Array, codec: number) {
        if(this.dataChannel) {
            this.vpacketId++;
            if(this.vpacketId > 65535) this.vpacketId = 0;
            let packet = new Uint8Array(data.byteLength + 2 + 3);
            packet[0] = this.chunkVPacketId++ < 5 ? 1 : 0; //Flag header
            packet[1] = 0; //Flag fragmented
            packet[2] = (this.vpacketId >> 8) & 0xFF; //HIGHT (voiceID)
            packet[3] = (this.vpacketId >> 0) & 0xFF; //LOW   (voiceID)
            packet[4] = codec; //Codec
            packet.set(data, 5);
            try {
                this.dataChannel.send(packet);
            } catch (e) {
                //TODO may handle error?
            }
        } else {
            console.warn("Could not transfer audio (not connected)");
        }
    }


    createSession() {
        this._ice_use_cache = true;


        let config: RTCConfiguration = {};
        config.iceServers = [];
        config.iceServers.push({ urls: 'stun:stun.l.google.com:19302' });
        this.rtcPeerConnection = new RTCPeerConnection(config);
        const dataChannelConfig = { ordered: true, maxRetransmits: 0 };

        this.dataChannel = this.rtcPeerConnection.createDataChannel('main', dataChannelConfig);
        this.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
        this.dataChannel.onopen = this.onDataChannelOpen.bind(this);
        this.dataChannel.binaryType = "arraybuffer";

        let sdpConstraints : RTCOfferOptions = {};
        sdpConstraints.offerToReceiveAudio = this.type == VoiceConnectionType.NATIVE_ENCODE ? 1 : 0;
        sdpConstraints.offerToReceiveVideo = 0;

        this.rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);

        if(this.local_audio_stream) { //May a typecheck?
            this.rtcPeerConnection.addStream(this.local_audio_stream.stream);
        }
        this.rtcPeerConnection.createOffer(this.onOfferCreated.bind(this), () => {
            console.error("Could not create ice offer!");
        }, sdpConstraints);
    }

    dropSession() {
        if(this.dataChannel) this.dataChannel.close();
        if(this.rtcPeerConnection) this.rtcPeerConnection.close();
        //TODO here!
    }

    _ice_use_cache: boolean = true;
    _ice_cache: any[] = [];
    handleControlPacket(json) {
        if(json["request"] === "answer") {
            console.log("Set remote sdp! (%o)", json["msg"]);
            this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(json["msg"]));
            this._ice_use_cache = false;
            for(let msg of this._ice_cache) {
                this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(msg));
            }
        } else if(json["request"] === "ice") {
            if(!this._ice_use_cache) {
                console.log("Add remote ice! (%s | %o)", json["msg"], json);
                this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(json["msg"]));
            } else {
                console.log("Cache remote ice! (%s | %o)", json["msg"], json);
                this._ice_cache.push(json["msg"]);
            }
        } else if(json["request"] == "status") {
            if(json["state"] == "failed") {
                chat.serverChat().appendError("Failed to setup voice bridge ({}). Allow reconnect: {}", json["reason"], json["allow_reconnect"]);
                log.error(LogCategory.NETWORKING, "Failed to setup voice bridge (%s). Allow reconnect: %s", json["reason"], json["allow_reconnect"]);
                if(json["allow_reconnect"] == true) {
                    this.createSession();
                }
                //TODO handle fail specially when its not allowed to reconnect
            }
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
                msg: event.candidate,
            }));
        }
    }

    onOfferCreated(localSession) {
        console.log("Offer created and accepted");
        this.rtcPeerConnection.setLocalDescription(localSession);

        console.log("Send offer: %o", localSession);
        this.client.serverConnection.sendData(JSON.stringify({type: 'WebRTC', request: "create", msg: localSession}));
    }

    onDataChannelOpen(channel) {
        console.log("Got new data channel! (%s)", this.dataChannel.readyState);
        this.client.controlBar.updateVoice();
    }

    onDataChannelMessage(message) {
        if(this.client.controlBar.muteOutput) return;

        let bin = new Uint8Array(message.data);
        let clientId = bin[2] << 8 | bin[3];
        let packetId = bin[0] << 8 | bin[1];
        let codec = bin[4];
        //console.log("Client id " + clientId + " PacketID " + packetId + " Codec: " + codec);
        let client = this.client.channelTree.findClient(clientId);
        if(!client) {
            console.error("Having  voice from unknown client? (ClientID: " + clientId + ")");
            return;
        }

        let codecPool = this.codec_pool[codec];
        if(!codecPool) {
            console.error("Could not playback codec " + codec);
            return;
        }

        let encodedData;
        if(message.data.subarray)
            encodedData = message.data.subarray(5);
        else encodedData = new Uint8Array(message.data, 5);

        if(encodedData.length == 0) {
            client.getAudioController().stopAudio();
            codecPool.releaseCodec(clientId);
        } else {
            codecPool.ownCodec(clientId)
                .then(decoder => decoder.decodeSamples(client.getAudioController().codecCache(codec), encodedData))
                .then(buffer => client.getAudioController().playBuffer(buffer)).catch(error => {
                    console.error("Could not playback client's (" + clientId + ") audio (" + error + ")");
                    if(error instanceof Error)
                        console.error(error.stack);
                });
        }
    }

    private handleVoiceData(data: AudioBuffer, head: boolean) {
        if(!this.voiceRecorder) return;
        if(!this.client.connected) return false;
        if(this.client.controlBar.muteInput) return;

        if(head) {
            this.chunkVPacketId = 0;
            this.client.getClient().speaking = true;
        }

        //TODO Use channel codec!
        this.codec_pool[4].ownCodec(this.client.getClientId())
            .then(encoder => encoder.encodeSamples(this.client.getClient().getAudioController().codecCache(4), data));
    }

    audio_destination() : AudioNode {
        return undefined;
    }

    private handleVoiceEnded() {
        if(!this.voiceRecorder) return;
        if(!this.client.connected) return;

        console.log("Voice ended");
        this.client.getClient().speaking = false;
        if(this.dataChannel)
            this.sendVoicePacket(new Uint8Array(0), 5); //TODO Use channel codec!
    }
}