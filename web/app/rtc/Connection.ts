import {ServerConnection} from "tc-backend/web/connection/ServerConnection";
import {AbstractServerConnection, ServerCommand, ServerConnectionEvents} from "tc-shared/connection/ConnectionBase";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import * as log from "tc-shared/log";
import {LogCategory, logDebug, logError, logTrace, logWarn} from "tc-shared/log";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {tr} from "tc-shared/i18n/localize";
import {Registry} from "tc-shared/events";
import {
    RemoteRTPAudioTrack,
    RemoteRTPTrackState,
    RemoteRTPVideoTrack,
    TrackClientInfo
} from "tc-backend/web/rtc/RemoteTrack";
import {SdpCompressor, SdpProcessor} from "tc-backend/web/rtc/SdpUtils";
import {context} from "tc-backend/web/audio/player";

const kSdpCompressionMode = 1;

declare global {
    interface RTCIceCandidate {
        /* Firefox has this */
        address: string | undefined;
    }

    interface HTMLCanvasElement {
        captureStream(framed: number) : MediaStream;
    }
}

let dummyVideoTrack: MediaStreamTrack | undefined;
let dummyAudioTrack: MediaStreamTrack | undefined;

/*
 * For Firefox as soon we stop a sender we're never able to get the sender starting again...
 * (This only applies after the initial negotiation. Before values of null are allowed)
 * So we've to keep it alive with a dummy track.
 */
function getIdleTrack(kind: "video" | "audio") : MediaStreamTrack | null {
    if(window.detectedBrowser?.name === "firefox" || true) {
        if(kind === "video") {
            if(!dummyVideoTrack) {
                const canvas = document.createElement("canvas");
                canvas.getContext("2d");
                const stream = canvas.captureStream(1);
                dummyVideoTrack = stream.getVideoTracks()[0];
            }

            return dummyVideoTrack;
        } else if(kind === "audio") {
            if(!dummyAudioTrack) {
                const dest = context().createMediaStreamDestination();
                dummyAudioTrack = dest.stream.getAudioTracks()[0];
            }

            return dummyAudioTrack;
        }
    }

    return null;
}

class CommandHandler extends AbstractCommandHandler {
    private readonly handle: RTCConnection;
    private readonly sdpProcessor: SdpProcessor;

    constructor(connection: AbstractServerConnection, handle: RTCConnection, sdpProcessor: SdpProcessor) {
        super(connection);
        this.handle = handle;
        this.sdpProcessor = sdpProcessor;
        this.ignore_consumed = true;
    }

    handle_command(command: ServerCommand): boolean {
        if(command.command === "notifyrtcsessiondescription") {
            const data = command.arguments[0];
            if(!this.handle["peer"]) {
                logWarn(LogCategory.WEBRTC, tr("Received remote %s without an active peer"), data.mode);
                return;
            }

            /* webrtc-sdp somehow places some empty lines into the sdp */
            let sdp = data.sdp.replace(/\r?\n\r?\n/g, "\n");
            try {
                sdp = SdpCompressor.decompressSdp(sdp, 1);
            } catch (error) {
                logError(LogCategory.WEBRTC, tr("Failed to decompress remote SDP: %o"), error);
                this.handle["handleFatalError"](tr("Failed to decompress remote SDP"), 5000);
                return;
            }
            if(RTCConnection.kEnableSdpTrace) {
                logTrace(LogCategory.WEBRTC, tr("Received remote %s:\n%s"), data.mode, data.sdp);
            }
            try {
                sdp = this.sdpProcessor.processIncomingSdp(sdp, data.mode);
            } catch (error) {
                logError(LogCategory.WEBRTC, tr("Failed to reprocess SDP %s: %o"), data.mode, error);
                this.handle["handleFatalError"](tra("Failed to preprocess SDP {}", data.mode as string), 5000);
                return;
            }
            if(RTCConnection.kEnableSdpTrace) {
                logTrace(LogCategory.WEBRTC, tr("Patched remote %s:\n%s"), data.mode, data.sdp);
            }
            if(data.mode === "answer") {
                this.handle["peer"].setRemoteDescription({
                    sdp: sdp,
                    type: "answer"
                }).catch(error => {
                    logError(LogCategory.WEBRTC, tr("Failed to set the remote description: %o"), error);
                    this.handle["handleFatalError"](tr("Failed to set the remote description (answer)"), 5000);
                })
            } else if(data.mode === "offer") {
                this.handle["peer"].setRemoteDescription({
                    sdp: sdp,
                    type: "offer"
                }).then(() => this.handle["peer"].createAnswer())
                .then(async answer => {
                    if(RTCConnection.kEnableSdpTrace) {
                        logTrace(LogCategory.WEBRTC, tr("Applying local description from remote %s:\n%s"), data.mode, answer.sdp);
                    }
                    answer.sdp = this.sdpProcessor.processOutgoingSdp(answer.sdp, "answer");

                    await this.handle["peer"].setLocalDescription(answer);
                    return answer;
                })
                .then(answer => {
                    answer.sdp = SdpCompressor.compressSdp(answer.sdp, kSdpCompressionMode);
                    if(RTCConnection.kEnableSdpTrace) {
                        logTrace(LogCategory.WEBRTC, tr("Patched answer to remote %s:\n%s"), data.mode, answer.sdp);
                    }

                    return this.connection.send_command("rtcsessiondescribe", {
                        mode: "answer",
                        sdp: answer.sdp,
                        compression: kSdpCompressionMode
                    });
                }).catch(error => {
                    logError(LogCategory.WEBRTC, tr("Failed to set the remote description and execute the renegotiation: %o"), error);
                    this.handle["handleFatalError"](tr("Failed to set the remote description (offer/renegotiation)"), 5000);
                });
            } else {
                logWarn(LogCategory.NETWORKING, tr("Received invalid mode for rtc session description (%s)."), data.mode);
            }
            return true;
        } else if(command.command === "notifyrtcstreamassignment") {
            const data = command.arguments[0];
            const ssrc = parseInt(data["streamid"]) >>> 0;

            if(parseInt(data["sclid"])) {
                this.handle["doMapStream"](ssrc, {
                    client_id: parseInt(data["sclid"]),
                    client_database_id: parseInt(data["scldbid"]),
                    client_name: data["sclname"],
                    client_unique_id: data["scluid"]
                });
            } else {
                this.handle["doMapStream"](ssrc, undefined);
            }
        } else if(command.command === "notifyrtcstateaudio") {
            const data = command.arguments[0];
            const state = parseInt(data["state"]);
            const ssrc = parseInt(data["streamid"]) >>> 0;

            if(state === 0) {
                /* stream stopped */
                this.handle["handleStreamState"](ssrc, 0, undefined);
            } else if(state === 1) {
                this.handle["handleStreamState"](ssrc, 1, {
                    client_id: parseInt(data["sclid"]),
                    client_database_id: parseInt(data["scldbid"]),
                    client_name: data["sclname"],
                    client_unique_id: data["scluid"]
                });
            } else {
                logWarn(LogCategory.WEBRTC, tr("Received unknown/invalid rtc track state: %d"), state);
            }
        }
        return false;
    }
}

export enum RTPConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    FAILED
}

class InternalRemoteRTPAudioTrack extends RemoteRTPAudioTrack {
    private muteTimeout;

    constructor(ssrc: number, transceiver: RTCRtpTransceiver) {
        super(ssrc, transceiver);
    }

    destroy() {
        this.handleTrackEnded();
        super.destroy();
    }

    handleAssignment(info: TrackClientInfo | undefined) {
        if(Object.isSimilar(this.currentAssignment, info)) {
            return;
        }

        this.currentAssignment = info;
        if(info) {
            logDebug(LogCategory.WEBRTC, tr("Remote RTP audio track %d mounted to client %o"), this.getSsrc(), info);
            this.setState(RemoteRTPTrackState.Bound);
        } else {
            logDebug(LogCategory.WEBRTC, tr("Remote RTP audio track %d has been unmounted."), this.getSsrc());
            this.setState(RemoteRTPTrackState.Unbound);
        }
    }

    handleStateNotify(state: number, info: TrackClientInfo | undefined) {
        if(!this.currentAssignment) {
            logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss info. Updating info."), this.getSsrc());
        }

        const validateInfo = () => {
            if(info.client_id !== this.currentAssignment.client_id) {
                logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss matching client info. Expected client %d but received %d. Updating stream assignment."),
                    this.getSsrc(), this.currentAssignment.client_id, info.client_id);
                this.currentAssignment = info;
                /* TODO: Update the assignment via doMapStream */
            } else if(info.client_unique_id !== this.currentAssignment.client_unique_id) {
                logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss matching client info. Expected client %s but received %s. Updating stream assignment."),
                    this.getSsrc(), this.currentAssignment.client_id, info.client_id);
                this.currentAssignment = info;
                /* TODO: Update the assignment via doMapStream */
            } else if(this.currentAssignment.client_name !== info.client_name) {
                this.currentAssignment.client_name = info.client_name;
                /* TODO: Notify name update */
            }
        };

        clearTimeout(this.muteTimeout);
        this.muteTimeout = undefined;
        if(state === 1) {
            validateInfo();
            this.shouldReplay = true;
            if(this.gainNode) {
                this.gainNode.gain.value = this.gain;
            }
            this.setState(RemoteRTPTrackState.Started);
        } else {
            /* There wil be no info present */
            this.setState(RemoteRTPTrackState.Bound);

            /* since we're might still having some jitter stuff */
            this.muteTimeout = setTimeout(() => {
                this.shouldReplay = false;
                if(this.gainNode) {
                    this.gainNode.gain.value = 0;
                }
            }, 1000);
        }
    }
}

class InternalRemoteRTPVideoTrack extends RemoteRTPVideoTrack {
    constructor(ssrc: number, transceiver: RTCRtpTransceiver) {
        super(ssrc, transceiver);
    }

    destroy() {
        this.handleTrackEnded();
        super.destroy();
    }

    handleAssignment(info: TrackClientInfo | undefined) {
        if(Object.isSimilar(this.currentAssignment, info)) {
            return;
        }

        this.currentAssignment = info;
        if(info) {
            logDebug(LogCategory.WEBRTC, tr("Remote RTP video track %d mounted to client %o"), this.getSsrc(), info);
            this.setState(RemoteRTPTrackState.Bound);
        } else {
            logDebug(LogCategory.WEBRTC, tr("Remote RTP video track %d has been unmounted."), this.getSsrc());
            this.setState(RemoteRTPTrackState.Unbound);
        }
    }

    handleStateNotify(state: number, info: TrackClientInfo | undefined) {
        if(!this.currentAssignment) {
            logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss info. Updating info."), this.getSsrc());
        }

        const validateInfo = () => {
            if(info.client_id !== this.currentAssignment.client_id) {
                logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss matching client info. Expected client %d but received %d. Updating stream assignment."),
                    this.getSsrc(), this.currentAssignment.client_id, info.client_id);
                this.currentAssignment = info;
                /* TODO: Update the assignment via doMapStream */
            } else if(info.client_unique_id !== this.currentAssignment.client_unique_id) {
                logWarn(LogCategory.WEBRTC, tr("Received stream state update for %d with miss matching client info. Expected client %s but received %s. Updating stream assignment."),
                    this.getSsrc(), this.currentAssignment.client_id, info.client_id);
                this.currentAssignment = info;
                /* TODO: Update the assignment via doMapStream */
            } else if(this.currentAssignment.client_name !== info.client_name) {
                this.currentAssignment.client_name = info.client_name;
                /* TODO: Notify name update */
            }
        };

        if(state === 1) {
            validateInfo();
            this.setState(RemoteRTPTrackState.Started);
        } else {
            /* There wil be no info present */
            this.setState(RemoteRTPTrackState.Bound);
        }
    }
}

export type RTCSourceTrackType = "audio" | "audio-whisper" | "video" | "video-screen";
export type RTCBroadcastableTrackType = Exclude<RTCSourceTrackType, "audio-whisper">;
const kRtcSourceTrackTypes: RTCSourceTrackType[] = ["audio", "audio-whisper", "video", "video-screen"];

function broadcastableTrackTypeToNumber(type: RTCBroadcastableTrackType) : number {
    switch (type) {
        case "video-screen":
            return 3;
        case "video":
            return 2;
        case "audio":
            return 1;
        default:
            throw tr("invalid target type");
    }
}

type TemporaryRtpStream = {
    createTimestamp: number,
    timeoutId: number,

    ssrc: number,
    status: number | undefined,
    info: TrackClientInfo | undefined
}

export interface RTCConnectionEvents {
    notify_state_changed: { oldState: RTPConnectionState, newState: RTPConnectionState },
    notify_audio_assignment_changed: { track: RemoteRTPAudioTrack, info: TrackClientInfo | undefined },
    notify_video_assignment_changed: { track: RemoteRTPVideoTrack, info: TrackClientInfo | undefined },
}

export class RTCConnection {
    public static readonly kEnableSdpTrace = true;
    private readonly events: Registry<RTCConnectionEvents>;
    private readonly connection: ServerConnection;
    private readonly commandHandler: CommandHandler;
    private readonly sdpProcessor: SdpProcessor;

    private connectionState: RTPConnectionState;
    private failedReason: string;

    private retryTimeout: number;

    private peer: RTCPeerConnection;
    private localCandidateCount: number;

    private currentTracks: {[T in RTCSourceTrackType]: MediaStreamTrack | undefined} = {
        "audio-whisper": undefined,
        "video-screen": undefined,
        audio: undefined,
        video: undefined
    };
    private currentTransceiver: {[T in RTCSourceTrackType]: RTCRtpTransceiver | undefined} = {
        "audio-whisper": undefined,
        "video-screen": undefined,
        audio: undefined,
        video: undefined
    };

    private remoteAudioTracks: {[key: number]: InternalRemoteRTPAudioTrack};
    private remoteVideoTracks: {[key: number]: InternalRemoteRTPVideoTrack};
    private temporaryStreams: {[key: number]: TemporaryRtpStream} = {};

    constructor(connection: ServerConnection) {
        this.events = new Registry<RTCConnectionEvents>();
        this.connection = connection;
        this.sdpProcessor = new SdpProcessor();
        this.commandHandler = new CommandHandler(connection, this, this.sdpProcessor);

        this.connection.command_handler_boss().register_handler(this.commandHandler);
        this.reset(true);

        this.connection.events.on("notify_connection_state_changed", event => this.handleConnectionStateChanged(event));
    }

    destroy() {
        this.connection.command_handler_boss().unregister_handler(this.commandHandler);
    }

    getConnection() : ServerConnection {
        return this.connection;
    }

    getEvents() {
        return this.events;
    }

    getConnectionState() : RTPConnectionState {
        return this.connectionState;
    }

    getFailReason() : string {
        return this.failedReason;
    }

    reset(updateConnectionState: boolean) {
        if(this.peer) {
            if(this.getConnection().connected()) {
                this.getConnection().send_command("rtcsessionreset").catch(error => {
                    logWarn(LogCategory.WEBRTC, tr("Failed to signal RTC session reset to server: %o"), error);
                });
            }

            for(let key in this.peer) {
                if(!key.startsWith("on")) {
                    continue;
                }

                delete this.peer[key];
            }
            this.peer.close();
            this.peer = undefined;
        }

        Object.keys(this.currentTransceiver).forEach(key => this.currentTransceiver[key] = undefined);

        this.sdpProcessor.reset();

        if(this.remoteAudioTracks) {
            Object.values(this.remoteAudioTracks).forEach(track => track.destroy());
        }
        this.remoteAudioTracks = {};

        if(this.remoteVideoTracks) {
            Object.values(this.remoteVideoTracks).forEach(track => track.destroy());
        }
        this.remoteVideoTracks = {};

        this.temporaryStreams = {};
        this.localCandidateCount = 0;

        clearTimeout(this.retryTimeout);
        this.retryTimeout = 0;

        if(updateConnectionState) {
            this.updateConnectionState(RTPConnectionState.DISCONNECTED);
        }
    }

    async setTrackSource(type: RTCSourceTrackType, source: MediaStreamTrack | null) {
        switch (type) {
            case "audio":
            case "audio-whisper":
                if(source && source.kind !== "audio") { throw tr("invalid track type"); }
                break;
            case "video":
            case "video-screen":
                if(source && source.kind !== "video") { throw tr("invalid track type"); }
                break;
        }

        if(this.currentTracks[type] === source) {
            return;
        }

        this.currentTracks[type] = source;
        await this.updateTracks();
    }

    /**
     * @param type
     * @throws a string on error
     */
    public async startTrackBroadcast(type: RTCBroadcastableTrackType) : Promise<void> {
        if(typeof this.currentTransceiver[type] !== "object") {
            throw tr("missing transceiver");
        }

        try {
            await this.connection.send_command("rtcbroadcast", {
                type: broadcastableTrackTypeToNumber(type),
                ssrc: this.sdpProcessor.getLocalSsrcFromFromMediaId(this.currentTransceiver[type].mid)
            });
        } catch (error) {
            logError(LogCategory.WEBRTC, tr("failed to start %s broadcast: %o"), type, error);
            throw tr("failed to signal broadcast start");
        }
    }

    public stopTrackBroadcast(type: RTCBroadcastableTrackType) {
        this.connection.send_command("rtcbroadcast", {
            type: broadcastableTrackTypeToNumber(type),
            ssrc: 0
        }).catch(error => {
            logWarn(LogCategory.WEBRTC, tr("Failed to signal track broadcast stop: %o"), error);
        });
    }

    private updateConnectionState(newState: RTPConnectionState) {
        if(this.connectionState === newState) { return; }

        const oldState = this.connectionState;
        this.connectionState = newState;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: newState });
    }

    private handleFatalError(error: string, retryThreshold: number) {
        this.reset(false);
        this.failedReason = error;
        this.updateConnectionState(RTPConnectionState.FAILED);

        /* FIXME: Generate a log message! */
        if(retryThreshold > 0) {
            this.retryTimeout = setTimeout(() => {
                console.error("XXXX Retry");
                this.doInitialSetup();
            }, 5000);
            /* TODO: Schedule a retry? */
        }
    }

    private static checkBrowserSupport() {
        if(!window.RTCRtpSender || !RTCRtpSender.prototype) {
            throw tr("Missing RTCRtpSender");
        }

        if(!RTCRtpSender.prototype.getParameters) {
            throw tr("RTCRtpSender.getParameters");
        }

        if(!RTCRtpSender.prototype.replaceTrack) {
            throw tr("RTCRtpSender.getParameters");
        }
    }

    private enableDtx(_sender: RTCRtpSender) { }

    private doInitialSetup() {
        if(!('RTCPeerConnection' in window)) {
            this.handleFatalError(tr("WebRTC has been disabled (RTCPeerConnection is not defined)"), 0);
            return;
        }

        this.peer = new RTCPeerConnection({
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
        });

        this.currentTransceiver["audio"] = this.peer.addTransceiver("audio");
        this.enableDtx(this.currentTransceiver["audio"].sender);

        this.currentTransceiver["audio-whisper"] = this.peer.addTransceiver("audio");
        this.enableDtx(this.currentTransceiver["audio-whisper"].sender);

        this.currentTransceiver["video"] = this.peer.addTransceiver("video");
        this.currentTransceiver["video-screen"] = this.peer.addTransceiver("video");

        /* add some other transceivers for later use */
        for(let i = 0; i < 8; i++) {
            this.peer.addTransceiver("audio");
        }
        for(let i = 0; i < 4; i++) {
            this.peer.addTransceiver("video");
        }

        this.peer.onicecandidate = event => this.handleIceCandidate(event.candidate);
        this.peer.onicecandidateerror = event => this.handleIceCandidateError(event);
        this.peer.oniceconnectionstatechange = () => this.handleIceConnectionStateChanged();
        this.peer.onicegatheringstatechange = () => this.handleIceGatheringStateChanged();

        this.peer.onsignalingstatechange = () => this.handleSignallingStateChanged();
        this.peer.onconnectionstatechange = () => this.handlePeerConnectionStateChanged();

        this.peer.ondatachannel = event => this.handleDataChannel(event.channel);
        this.peer.ontrack = event => this.handleTrack(event);

        /* FIXME: Remove this debug! */
        (window as any).rtp = this;

        this.updateConnectionState(RTPConnectionState.CONNECTING);
        this.doInitialSetup0().catch(error => {
            this.handleFatalError(tr("initial setup failed"), 5000);
            logError(LogCategory.WEBRTC, tr("Connection setup failed: %o"), error);
        });
    }

    private async updateTracks() {
        for(const type of kRtcSourceTrackTypes) {
            let fallback;
            switch (type) {
                case "audio":
                case "audio-whisper":
                    fallback = getIdleTrack("audio");
                    break;

                case "video":
                case "video-screen":
                    fallback = getIdleTrack("video");
                    break;
            }
            await this.currentTransceiver[type]?.sender.replaceTrack(this.currentTracks[type] || fallback);
        }
    }

    private async doInitialSetup0() {
        RTCConnection.checkBrowserSupport();

        const peer = this.peer;
        await this.updateTracks();

        const offer = await peer.createOffer({ iceRestart: false, offerToReceiveAudio: true, offerToReceiveVideo: true });
        if(offer.type !== "offer") { throw tr("created ofer isn't of type offer"); }
        if(this.peer !== peer) { return; }

        if(RTCConnection.kEnableSdpTrace) {
            logTrace(LogCategory.WEBRTC, tr("Generated initial local offer:\n%s"), offer.sdp);
        }
        try {
            offer.sdp = this.sdpProcessor.processOutgoingSdp(offer.sdp, "offer");
            logTrace(LogCategory.WEBRTC, tr("Patched initial local offer:\n%s"), offer.sdp);
        } catch (error) {
            logError(LogCategory.WEBRTC, tr("Failed to preprocess outgoing initial offer: %o"), error);
            this.handleFatalError(tr("Failed to preprocess outgoing initial offer"), 10000);
            return;
        }

        await peer.setLocalDescription(offer);
        if(this.peer !== peer) { return; }

        try {
            await this.connection.send_command("rtcsessiondescribe", {
                mode: "offer",
                sdp: offer.sdp
            });
        } catch (error) {
            if(this.peer !== peer) { return; }
            if(error instanceof CommandResult) {
                error = error.formattedMessage();
            }
            logWarn(LogCategory.VOICE, tr("Failed to initialize RTP connection: %o"), error);
            throw tr("server failed to accept our offer");
        }
        if(this.peer !== peer) { return; }

        this.peer.onnegotiationneeded = () => this.handleNegotiationNeeded();
        /* Nothing left to do. Server should send a notifyrtcsessiondescription with mode answer */
    }

    private handleConnectionStateChanged(event: ServerConnectionEvents["notify_connection_state_changed"]) {
        if(event.newState === ConnectionState.CONNECTED) {
            /* initialize rtc connection */
            this.doInitialSetup();
        } else {
            this.reset(true);
        }
    }

    private handleIceCandidate(candidate: RTCIceCandidate | undefined) {
        if(candidate) {
            if(candidate.address?.endsWith(".local")) {
                logTrace(LogCategory.WEBRTC, tr("Skipping local fqdn ICE candidate %s"), candidate.toJSON().candidate);
                return;
            }
            this.localCandidateCount++;

            const json = candidate.toJSON();
            logTrace(LogCategory.WEBRTC, tr("Received local ICE candidate %s"), json.candidate);
            this.connection.send_command("rtcicecandidate", {
                media_line: json.sdpMLineIndex,
                candidate: json.candidate
            }).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to transmit local ICE candidate to server: %o"), error);
            });
        } else {
            if(this.localCandidateCount === 0) {
                logError(LogCategory.WEBRTC, tr("Received local ICE candidate finish, without having any candidates."));
                this.handleFatalError(tr("Failed to gather any ICE candidates"), 0);
                return;
            } else {
                logTrace(LogCategory.WEBRTC, tr("Received local ICE candidate finish"));
            }
            this.connection.send_command("rtcicecandidate", { }).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to transmit local ICE candidate finish to server: %o"), error);
            });
        }
    }
    private handleIceCandidateError(event: RTCPeerConnectionIceErrorEvent) {
        if(this.peer.iceGatheringState === "gathering") {
            log.warn(LogCategory.WEBRTC, tr("Received error while gathering the ice candidates: %d/%s for %s (url: %s)"),
                event.errorCode, event.errorText, event.hostCandidate, event.url);
        } else {
            log.trace(LogCategory.WEBRTC, tr("Ice candidate %s (%s) errored: %d/%s"),
                event.url, event.hostCandidate, event.errorCode, event.errorText);
        }
    }
    private handleIceConnectionStateChanged() {
        log.trace(LogCategory.WEBRTC, tr("ICE connection state changed to %s"), this.peer.iceConnectionState);
    }
    private handleIceGatheringStateChanged() {
        log.trace(LogCategory.WEBRTC, tr("ICE gathering state changed to %s"), this.peer.iceGatheringState);
    }

    private handleSignallingStateChanged() {
        logTrace(LogCategory.WEBRTC, tr("Peer signalling state changed to %s"), this.peer.signalingState);
    }
    private handleNegotiationNeeded() {
        logWarn(LogCategory.WEBRTC, tr("Local peer needs negotiation, but we don't support client sideded negotiation."));
    }
    private handlePeerConnectionStateChanged() {
        logTrace(LogCategory.WEBRTC, tr("Peer connection state changed to %s"), this.peer.connectionState);
        switch (this.peer.connectionState) {
            case "connecting":
                //this.updateConnectionState(RTPConnectionState.CONNECTING);
                this.updateConnectionState(RTPConnectionState.CONNECTED);
                break;

            case "connected":
                this.updateConnectionState(RTPConnectionState.CONNECTED);
                break;

            case "failed":
            case "closed":
            case "disconnected":
            case "new":
                if(this.connectionState !== RTPConnectionState.FAILED) {
                    this.updateConnectionState(RTPConnectionState.DISCONNECTED);
                }
                break;
        }
    }

    private handleDataChannel(_channel: RTCDataChannel) {
        /* We're not doing anything with data channels */
    }

    private releaseTemporaryStream(ssrc: number) : TemporaryRtpStream | undefined {
        if(this.temporaryStreams[ssrc]) {
            const stream = this.temporaryStreams[ssrc];
            clearTimeout(stream.timeoutId);
            stream.timeoutId = 0;
            delete this.temporaryStreams[ssrc];
            return stream;
        }

        return undefined;
    }

    private handleTrack(event: RTCTrackEvent) {
        const ssrc = this.sdpProcessor.getRemoteSsrcFromFromMediaId(event.transceiver.mid);
        if(typeof ssrc !== "number") {
            logError(LogCategory.WEBRTC, tr("Received track without knowing its ssrc. Ignoring track..."));
            return;
        }

        const tempInfo = this.releaseTemporaryStream(ssrc);
        if(event.track.kind === "audio") {
            const track = new InternalRemoteRTPAudioTrack(ssrc, event.transceiver);
            logDebug(LogCategory.WEBRTC, tr("Received remote audio track on ssrc %d"), ssrc);
            if(tempInfo?.info !== undefined) {
                track.handleAssignment(tempInfo.info);
                this.events.fire("notify_audio_assignment_changed", {
                    info: tempInfo.info,
                    track: track
                });
            }
            if(tempInfo?.status !== undefined) {
                track.handleStateNotify(tempInfo.status, tempInfo.info);
            }
            this.remoteAudioTracks[ssrc] = track;
        } else if(event.track.kind === "video") {
            const track = new InternalRemoteRTPVideoTrack(ssrc, event.transceiver);
            logDebug(LogCategory.WEBRTC, tr("Received remote video track on ssrc %d"), ssrc);
            if(tempInfo?.info !== undefined) {
                track.handleAssignment(tempInfo.info);
                this.events.fire("notify_video_assignment_changed", {
                    info: tempInfo.info,
                    track: track
                });
            }
            if(tempInfo?.status !== undefined) {
                track.handleStateNotify(tempInfo.status, tempInfo.info);
            }
            this.remoteVideoTracks[ssrc] = track;
        } else {
            logWarn(LogCategory.WEBRTC, tr("Received track with unknown kind '%s'."), event.track.kind);
        }
    }

    private getOrCreateTempStream(ssrc: number) : TemporaryRtpStream {
        if(this.temporaryStreams[ssrc]) {
            return this.temporaryStreams[ssrc];
        }

        const tempStream = this.temporaryStreams[ssrc] = {
            ssrc: ssrc,
            timeoutId: 0,
            createTimestamp: Date.now(),

            info: undefined,
            status: undefined
        };
        tempStream.timeoutId = setTimeout(() => {
            logWarn(LogCategory.WEBRTC, tr("Received stream mapping for invalid stream which hasn't been signalled after 5 seconds (ssrc: %o)."), ssrc);
            delete this.temporaryStreams[ssrc];
        }, 5000);
        return tempStream;
    }

    private doMapStream(ssrc: number, target: TrackClientInfo | undefined) {
        if(this.remoteAudioTracks[ssrc]) {
            const track = this.remoteAudioTracks[ssrc];
            track.handleAssignment(target);
            this.events.fire("notify_audio_assignment_changed", {
                info: target,
                track: track
            });
        } else if(this.remoteVideoTracks[ssrc]) {
            const track = this.remoteVideoTracks[ssrc];
            track.handleAssignment(target);
            this.events.fire("notify_video_assignment_changed", {
                info: target,
                track: track
            });
        } else {
            let tempStream = this.getOrCreateTempStream(ssrc);
            tempStream.info = target;
        }
    }

    private handleStreamState(ssrc: number, state: number, info: TrackClientInfo | undefined) {
        if(this.remoteAudioTracks[ssrc]) {
            const track = this.remoteAudioTracks[ssrc];
            track.handleStateNotify(state, info);
        } else if(this.remoteVideoTracks[ssrc]) {
            const track = this.remoteVideoTracks[ssrc];
            track.handleStateNotify(state, info);
        } else {
            let tempStream = this.getOrCreateTempStream(ssrc);
            tempStream.info = info;
            tempStream.status = state;
        }
    }
}