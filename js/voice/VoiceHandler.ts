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
                entry.instance.on_encoded_data = buffer => this.handle.sendVoicePacket(buffer, this.codecIndex);
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

class VoiceConnection {
    client: TSClient;
    rtcPeerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel;

    voiceRecorder: VoiceRecorder;

    private codecPool: CodecPool[] = [
        new CodecPool(this,0,"Spex A", undefined), //Spex
        new CodecPool(this,1,"Spex B", undefined), //Spex
        new CodecPool(this,2,"Spex C", undefined), //Spex
        new CodecPool(this,3,"CELT Mono", undefined), //CELT Mono
        new CodecPool(this,4,"Opus Voice", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 1) }), //opus voice
        new CodecPool(this,5,"Opus Music", () => { return new CodecWrapper(CodecWorkerType.WORKER_OPUS, 2) })  //opus music
    ];

    private vpacketId: number = 0;
    private chunkVPacketId: number = 0;

    constructor(client) {
        this.client = client;
        this.voiceRecorder = new VoiceRecorder(this);
        this.voiceRecorder.on_data = this.handleVoiceData.bind(this);
        this.voiceRecorder.on_end = this.handleVoiceEnded.bind(this);
        this.voiceRecorder.reinitialiseVAD();

        this.codecPool[4].initialize(2);
        this.codecPool[5].initialize(2);

        setTimeout(() => {
            //if(Date.now() - this.last != 20)
            //    chat.serverChat().appendError("INVALID LAST: " + (Date.now() - this.last));
            this.last = Date.now();
            if(this.encodedCache.length == 0){
                //console.log("MISSING VOICE!");
                //chat.serverChat().appendError("MISSING VOICE!");
            } else this.sendVoicePacket(this.encodedCache[0].data, this.encodedCache[0].codec);
            this.encodedCache.pop_front();
        }, 20);
    }

    codecSupported(type: number) : boolean {
        return this.codecPool.length > type && this.codecPool[type].supported();
    }

    encodedCache: {data: Uint8Array, codec: number}[] = [];
    last: number;
    handleEncodedVoicePacket(data: Uint8Array, codec: number){
        this.encodedCache.push({data: data, codec: codec});
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
            this.dataChannel.send(packet);
        } else {
            console.warn("Could not transfer audio (not connected)");
        }
    }


    createSession() {
        const config = { /*iceServers: [{ url: 'stun:stun.l.google.com:19302' }]*/ };
        this.rtcPeerConnection = new RTCPeerConnection(config);
        const dataChannelConfig = { ordered: false, maxRetransmits: 0 };

        this.dataChannel = this.rtcPeerConnection.createDataChannel('main', dataChannelConfig);
        this.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
        this.dataChannel.onopen = this.onDataChannelOpen.bind(this);
        this.dataChannel.binaryType = "arraybuffer";

        let sdpConstraints : RTCOfferOptions = {};
        sdpConstraints.offerToReceiveAudio = 0;
        sdpConstraints.offerToReceiveVideo = 0;

        this.rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
        this.rtcPeerConnection.createOffer(this.onOfferCreated.bind(this), () => {
            console.error("Could not create ice offer!");
        }, sdpConstraints);
    }

    dropSession() {
        if(this.dataChannel) this.dataChannel.close();
        if(this.rtcPeerConnection) this.rtcPeerConnection.close();
        //TODO here!
    }

    handleControlPacket(json) {
        if(json["request"] === "create") {
            this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription({type: "answer", sdp: json["sdp"]}));
        } else if(json["request"] === "ice") {
            this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate({candidate: json["candidate"],sdpMid: json["session"],sdpMLineIndex: json["line"]}));
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

        this.client.serverConnection.sendData(JSON.stringify({type: 'WebRTC', request: "create", session: localSession}));
    }

    onDataChannelOpen(channel) {
        console.log("Got new data channel!");
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
            console.error("Having  voice from unknown manager? (ClientID: " + clientId + ")");
            return;
        }

        let codecPool = this.codecPool[codec];
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
                console.error("Could not playback manager's (" + clientId + ") audio (" + error + ")");
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
        this.codecPool[4].ownCodec(this.client.getClientId())
            .then(encoder => encoder.encodeSamples(this.client.getClient().getAudioController().codecCache(4),data));
        //this.manager.getClient().getAudioController().play(data);
    }

    private handleVoiceEnded() {
        if(!this.voiceRecorder) return;

        console.log("Voice ended");
        this.client.getClient().speaking = false;
        if(this.dataChannel)
            this.sendVoicePacket(new Uint8Array(0), 4); //TODO Use channel codec!
    }
}