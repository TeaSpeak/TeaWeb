import {AbstractServerConnection, ServerCommand, ServerConnectionEvents} from "tc-shared/connection/ConnectionBase";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import * as log from "tc-shared/log";
import {group, LogCategory, logDebug, logError, logGroupNative, logTrace, LogType, logWarn} from "tc-shared/log";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {tr, tra} from "tc-shared/i18n/localize";
import {Registry} from "tc-shared/events";
import {RemoteRTPAudioTrack, RemoteRTPTrackState, RemoteRTPVideoTrack, TrackClientInfo} from "./RemoteTrack";
import {SdpCompressor, SdpProcessor} from "./SdpUtils";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {WhisperTarget} from "tc-shared/voice/VoiceWhisper";
import {globalAudioContext} from "tc-backend/audio/player";

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

export type RtcVideoBroadcastStatistics = {
    dimensions: { width: number, height: number },
    frameRate: number,

    codec?: { name: string, payloadType: number }

    bandwidth?: {
        /* bits per second */
        currentBps: number,
        /* bits per second */
        maxBps: number
    },

    qualityLimitation: "cpu" | "bandwidth" | "none",

    source: {
        frameRate: number,
        dimensions: { width: number, height: number },
    },
};

class RetryTimeCalculator {
    private readonly minTime: number;
    private readonly maxTime: number;
    private readonly increment: number;

    private retryCount: number;
    private currentTime: number;

    constructor(minTime: number, maxTime: number, increment: number) {
        this.minTime = minTime;
        this.maxTime = maxTime;
        this.increment = increment;

        this.reset();
    }

    calculateRetryTime() {
        return 0;
        if(this.retryCount >= 5) {
            /* no more retries */
            return 0;
        }
        this.retryCount++;
        const time = this.currentTime;
        this.currentTime = Math.min(this.currentTime + this.increment, this.maxTime);
        return time;
    }

    reset() {
        this.currentTime = this.minTime;
        this.retryCount = 0;
    }
}

class RTCStatsWrapper {
    private readonly supplier: () => Promise<RTCStatsReport>;
    private readonly statistics;

    constructor(supplier: () => Promise<RTCStatsReport>) {
        this.supplier = supplier;
        this.statistics = {};
    }

    async initialize() {
        for(const [key, value] of await this.supplier()) {
            if(typeof this.statistics[key] !== "undefined") {
                logWarn(LogCategory.WEBRTC, tr("Duplicated statistics entry for key %s. Dropping duplicate."), key);
                continue;
            }
            this.statistics[key] = value;
        }
    }

    getValues() : (RTCStats & {[T: string]: string | number})[] {
        return Object.values(this.statistics);
    }

    getStatistic(key: string) : RTCStats & {[T: string]: string | number} {
        return this.statistics[key];
    }

    getStatisticsByType(type: string) : (RTCStats & {[T: string]: string | number})[] {
        return Object.values(this.statistics).filter((e: any) => e.type?.replace(/-/g, "") === type) as any;
    }

    getStatisticByType(type: string): RTCStats & {[T: string]: string | number} {
        const entries = this.getStatisticsByType(type);
        if(entries.length === 0) {
            throw tra("missing statistic entry {}", type);
        } else if(entries.length === 1) {
            return entries[0];
        } else {
            throw tra("duplicated statistics entry of type {}", type);
        }
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
    if(window.detectedBrowser?.name === "firefox") {
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
                const dest = globalAudioContext().createMediaStreamDestination();
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
                this.handle["handleFatalError"](tr("Failed to decompress remote SDP"), true);
                return;
            }
            if(RTCConnection.kEnableSdpTrace) {
                const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Original remote SDP ({})", data.mode as string));
                gr.collapsed(true);
                gr.log("%s", data.sdp);
                gr.end();
            }
            try {
                sdp = this.sdpProcessor.processIncomingSdp(sdp, data.mode);
            } catch (error) {
                logError(LogCategory.WEBRTC, tr("Failed to reprocess SDP %s: %o"), data.mode, error);
                this.handle["handleFatalError"](tra("Failed to preprocess SDP {}", data.mode as string), true);
                return;
            }
            if(RTCConnection.kEnableSdpTrace) {
                const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Patched remote SDP ({})", data.mode as string));
                gr.collapsed(true);
                gr.log("%s", sdp);
                gr.end();
            }
            if(data.mode === "answer") {
                this.handle["peer"].setRemoteDescription({
                    sdp: sdp,
                    type: "answer"
                }).then(() => {
                    this.handle["cachedRemoteSessionDescription"] = sdp;
                    this.handle["peerRemoteDescriptionReceived"] = true;
                    setTimeout(() => this.handle.applyCachedRemoteIceCandidates(), 50);
                }).catch(error => {
                    logError(LogCategory.WEBRTC, tr("Failed to set the remote description: %o"), error);
                    this.handle["handleFatalError"](tr("Failed to set the remote description (answer)"), true);
                });
            } else if(data.mode === "offer") {
                this.handle["cachedRemoteSessionDescription"] = sdp;
                this.handle["peer"].setRemoteDescription({
                    sdp: sdp,
                    type: "offer"
                }).then(() => this.handle["peer"].createAnswer())
                .then(async answer => {
                    if(RTCConnection.kEnableSdpTrace) {
                        const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Original local SDP ({})", data.mode as string));
                        gr.collapsed(true);
                        gr.log("%s", answer.sdp);
                        gr.end();
                    }
                    answer.sdp = this.sdpProcessor.processOutgoingSdp(answer.sdp, "answer");

                    await this.handle["peer"].setLocalDescription(answer);
                    return answer;
                })
                .then(answer => {
                    answer.sdp = SdpCompressor.compressSdp(answer.sdp, kSdpCompressionMode);
                    if(RTCConnection.kEnableSdpTrace) {
                        const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Patched local SDP ({})", data.mode as string));
                        gr.collapsed(true);
                        gr.log("%s", answer.sdp);
                        gr.end();
                    }

                    return this.connection.send_command("rtcsessiondescribe", {
                        mode: "answer",
                        sdp: answer.sdp,
                        compression: kSdpCompressionMode
                    });
                }).catch(error => {
                    logError(LogCategory.WEBRTC, tr("Failed to set the remote description and execute the renegotiation: %o"), error);
                    this.handle["handleFatalError"](tr("Failed to set the remote description (offer/renegotiation)"), true);
                });
            } else {
                logWarn(LogCategory.NETWORKING, tr("Received invalid mode for rtc session description (%s)."), data.mode);
            }
            return true;
        } else if(command.command === "notifyrtcicecandidate") {
            const candidate = command.arguments[0]["candidate"];
            const mediaLine = parseInt(command.arguments[0]["medialine"]);

            if(Number.isNaN(mediaLine)) {
                logError(LogCategory.WEBRTC, tr("Failed to parse ICE media line: %o"), command.arguments[0]["medialine"]);
                return;
            }

            if(candidate) {
                const parsedCandidate = new RTCIceCandidate({
                    candidate: "candidate:" + candidate,
                    sdpMLineIndex: mediaLine
                });

                this.handle.handleRemoteIceCandidate(parsedCandidate, mediaLine);
            } else {
                this.handle.handleRemoteIceCandidate(undefined, mediaLine);
            }
        } else if(command.command === "notifyrtcstreamassignment") {
            const data = command.arguments[0];
            const ssrc = parseInt(data["streamid"]) >>> 0;

            if(parseInt(data["sclid"])) {
                this.handle["doMapStream"](ssrc, {
                    client_id: parseInt(data["sclid"]),
                    client_database_id: parseInt(data["scldbid"]),
                    client_name: data["sclname"],
                    client_unique_id: data["scluid"],
                    media: parseInt(data["media"])
                });
            } else {
                this.handle["doMapStream"](ssrc, undefined);
            }
        } else if(command.command === "notifyrtcstreamstate") {
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
                    client_unique_id: data["scluid"],
                });
            } else {
                logWarn(LogCategory.WEBRTC, tr("Received unknown/invalid rtc track state: %d"), state);
            }
        } else if(command.command === "notifybroadcastvideo") {
            /* FIXME: TODO! */
        }
        return false;
    }
}

export enum RTPConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    FAILED,
    NOT_SUPPORTED
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

export type RTCConnectionStatistics = {
    videoBytesReceived: number,
    videoBytesSent: number,

    voiceBytesReceived: number,
    voiceBytesSent
}

export interface RTCConnectionEvents {
    notify_state_changed: { oldState: RTPConnectionState, newState: RTPConnectionState },
    notify_audio_assignment_changed: { track: RemoteRTPAudioTrack, info: TrackClientInfo | undefined },
    notify_video_assignment_changed: { track: RemoteRTPVideoTrack, info: TrackClientInfo | undefined },
}

export class RTCConnection {
    public static readonly kEnableSdpTrace = true;

    private readonly audioSupport: boolean;
    private readonly events: Registry<RTCConnectionEvents>;
    private readonly connection: AbstractServerConnection;
    private readonly commandHandler: CommandHandler;
    private readonly sdpProcessor: SdpProcessor;

    private connectionState: RTPConnectionState;
    private connectTimeout: number;
    private failedReason: string;
    private retryCalculator: RetryTimeCalculator;
    private retryTimestamp: number;
    private retryTimeout: number;

    private peer: RTCPeerConnection;
    private localCandidateCount: number;

    private peerRemoteDescriptionReceived: boolean;
    private cachedRemoteIceCandidates: { candidate: RTCIceCandidate, mediaLine: number }[];

    private cachedRemoteSessionDescription: string;

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

    constructor(connection: AbstractServerConnection, audioSupport: boolean) {
        this.events = new Registry<RTCConnectionEvents>();
        this.connection = connection;
        this.sdpProcessor = new SdpProcessor();
        this.commandHandler = new CommandHandler(connection, this, this.sdpProcessor);
        this.retryCalculator = new RetryTimeCalculator(5000, 30000, 10000);
        this.audioSupport = audioSupport;

        this.connection.command_handler_boss().register_handler(this.commandHandler);
        this.reset(true);

        this.connection.events.on("notify_connection_state_changed", event => this.handleConnectionStateChanged(event));
    }

    destroy() {
        this.connection.command_handler_boss().unregister_handler(this.commandHandler);
    }

    isAudioEnabled() : boolean {
        return this.audioSupport;
    }

    getConnection() : AbstractServerConnection {
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

    getRetryTimestamp() : number | 0 {
        return this.retryTimestamp;
    }

    restartConnection() {
        if(this.connectionState === RTPConnectionState.DISCONNECTED) {
            /* We've been disconnected on purpose */
            return;
        }

        this.reset(true);
        this.doInitialSetup();
    }

    reset(updateConnectionState: boolean) {
        logTrace(LogCategory.WEBRTC, tr("Resetting the RTC connection (Updating connection state: %o)"), updateConnectionState);
        if(this.peer) {
            if(this.getConnection().connected()) {
                this.getConnection().send_command("rtcsessionreset").catch(error => {
                    logWarn(LogCategory.WEBRTC, tr("Failed to signal RTC session reset to server: %o"), error);
                });
            }

            this.peer.onconnectionstatechange = undefined;
            this.peer.ondatachannel = undefined;
            this.peer.onicecandidate = undefined;
            this.peer.onicecandidateerror = undefined;
            this.peer.oniceconnectionstatechange = undefined;
            this.peer.onicegatheringstatechange = undefined;
            this.peer.onnegotiationneeded = undefined;
            this.peer.onsignalingstatechange = undefined;
            this.peer.onstatsended = undefined;
            this.peer.ontrack = undefined;

            this.peer.close();
            this.peer = undefined;
        }
        this.peerRemoteDescriptionReceived = false;
        this.cachedRemoteIceCandidates = [];
        this.cachedRemoteSessionDescription = undefined;

        clearTimeout(this.connectTimeout);
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
        this.retryTimestamp = 0;
        /*
         * We do not reset the retry timer here since we might get called when a fatal error occurs.
         * Instead we're resetting it every time we've changed the server connection state.
         */
        /* this.retryCalculator.reset(); */

        if(updateConnectionState) {
            this.updateConnectionState(RTPConnectionState.DISCONNECTED);
        }
    }

    async setTrackSource(type: RTCSourceTrackType, source: MediaStreamTrack | null) : Promise<MediaStreamTrack> {
        switch (type) {
            case "audio":
            case "audio-whisper":
                if(!this.audioSupport) { throw tr("audio support isn't enabled"); }
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

        const oldTrack = this.currentTracks[type] = source;
        await this.updateTracks();
        return oldTrack;
    }

    /**
     * @param type
     * @throws a string on error
     */
    public async startTrackBroadcast(type: RTCBroadcastableTrackType) : Promise<void> {
        if(typeof this.currentTransceiver[type] !== "object") {
            throw tr("missing transceiver");
        }

        switch (type) {
            case "audio":
                if(!this.audioSupport) {
                    throw tr("audio support isn't enabled");
                }
                break;

            case "video":
            case "video-screen":
                break;

            default:
                throw tr("invalid broadcast type");
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

    public async startWhisper(target: WhisperTarget) : Promise<void> {
        if(!this.audioSupport) {
            throw tr("audio support isn't enabled");
        }

        const transceiver = this.currentTransceiver["audio-whisper"];
        if(typeof transceiver === "undefined") {
            throw tr("missing transceiver");
        }

        if(target.target === "echo") {
            await this.connection.send_command("whispersessioninitialize", {
                ssrc: this.sdpProcessor.getLocalSsrcFromFromMediaId(transceiver.mid),
                type: 0x10, /* self */
                target: 0,
                id: 0
            }, { flagset: ["new"] });
        } else if(target.target === "channel-clients") {
            throw "target not yet supported";
        } else if(target.target === "groups") {
            throw "target not yet supported";
        } else {
            throw "target not yet supported";
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

    public setNotSupported() {
        this.reset(false);
        this.updateConnectionState(RTPConnectionState.NOT_SUPPORTED);
    }

    private updateConnectionState(newState: RTPConnectionState) {
        if(this.connectionState === newState) { return; }

        const oldState = this.connectionState;
        this.connectionState = newState;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: newState });
    }

    private handleFatalError(error: string, allowRetry: boolean) {
        this.reset(false);
        this.failedReason = error;
        this.updateConnectionState(RTPConnectionState.FAILED);

        const log = this.connection.client.log;
        if(allowRetry) {
            const time = this.retryCalculator.calculateRetryTime();
            if(time > 0) {
                this.retryTimestamp = Date.now() + time;
                this.retryTimeout = setTimeout(() => {
                    this.doInitialSetup();
                }, time);

                log.log("webrtc.fatal.error", {
                    message: error,
                    retryTimeout: time
                });
            } else {
                allowRetry = false;
            }
        }

        if(!allowRetry) {
            log.log("webrtc.fatal.error", {
                message: error,
                retryTimeout: 0
            });
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

    public doInitialSetup() {
        if(!("RTCPeerConnection" in window)) {
            this.handleFatalError(tr("WebRTC has been disabled (RTCPeerConnection is not defined)"), false);
            return;
        }

        if(!("addTransceiver" in RTCPeerConnection.prototype)) {
            this.handleFatalError(tr("WebRTC api incompatible (RTCPeerConnection.addTransceiver missing)"), false);
            return;
        }

        this.peer = new RTCPeerConnection({
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
        });

        const kAddGenericTransceiver = false;

        if(this.audioSupport) {
            this.currentTransceiver["audio"] = this.peer.addTransceiver("audio");
            this.currentTransceiver["audio-whisper"] = this.peer.addTransceiver("audio");

            /* add some other transceivers for later use */
            for(let i = 0; i < 8 && kAddGenericTransceiver; i++) {
                const transceiver = this.peer.addTransceiver("audio");
                /* we only want to received on that and don't share any bandwidth limits */
                transceiver.direction = "recvonly";
            }
        }

        this.currentTransceiver["video"] = this.peer.addTransceiver("video");
        this.currentTransceiver["video-screen"] = this.peer.addTransceiver("video");

        /* add some other transceivers for later use */
        for(let i = 0; i < 4 && kAddGenericTransceiver; i++) {
            const transceiver = this.peer.addTransceiver("video");
            /* we only want to received on that and don't share any bandwidth limits */
            transceiver.direction = "recvonly";
        }

        this.peer.onicecandidate = event => this.handleLocalIceCandidate(event.candidate);
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
            this.handleFatalError(tr("initial setup failed"), true);
            logError(LogCategory.WEBRTC, tr("Connection setup failed: %o"), error);
        });
    }

    private async updateTracks() {
        for(const type of kRtcSourceTrackTypes) {
            if(!this.currentTransceiver[type]?.sender) {
                continue;
            }

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

            let target = this.currentTracks[type] || fallback;
            if(this.currentTransceiver[type].sender.track === target) {
                continue;
            }

            await this.currentTransceiver[type].sender.replaceTrack(target);
            if(target) {
                console.error("Setting sendrecv from %o", this.currentTransceiver[type].direction, this.currentTransceiver[type].currentDirection);
                this.currentTransceiver[type].direction = "sendrecv";
            } else if(type === "video" || type === "video-screen") {
                /*
                 * We don't need to stop & start the audio transceivers every time we're toggling the stream state.
                 * This would be a much overall cost than just keeping it going.
                 *
                 * The video streams instead are not toggling that much and since they split up the bandwidth between them,
                 * we've to shut them down if they're no needed. This not only allows the one stream to take full advantage
                 * of the bandwidth it also reduces resource usage.
                 */
                //this.currentTransceiver[type].direction = "recvonly";
            }
            logTrace(LogCategory.WEBRTC, "Replaced track for %o (Fallback: %o)", type, target === fallback);
        }
    }

    private async doInitialSetup0() {
        RTCConnection.checkBrowserSupport();

        const peer = this.peer;
        await this.updateTracks();

        const offer = await peer.createOffer({ iceRestart: false, offerToReceiveAudio: this.audioSupport, offerToReceiveVideo: true });
        if(offer.type !== "offer") { throw tr("created ofer isn't of type offer"); }
        if(this.peer !== peer) { return; }

        if(RTCConnection.kEnableSdpTrace) {
            const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Original initial local SDP (offer)"));
            gr.collapsed(true);
            gr.log("%s", offer.sdp);
            gr.end();
        }
        try {
            offer.sdp = this.sdpProcessor.processOutgoingSdp(offer.sdp, "offer");
            const gr = logGroupNative(LogType.TRACE, LogCategory.WEBRTC, tra("Patched initial local SDP (offer)"));
            gr.collapsed(true);
            gr.log("%s", offer.sdp);
            gr.end();
        } catch (error) {
            logError(LogCategory.WEBRTC, tr("Failed to preprocess outgoing initial offer: %o"), error);
            this.handleFatalError(tr("Failed to preprocess outgoing initial offer"), true);
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
                if(error.id === ErrorCode.COMMAND_NOT_FOUND) {
                    this.setNotSupported();
                    return;
                }
                error = error.formattedMessage();
            }
            logWarn(LogCategory.VOICE, tr("Failed to initialize RTP connection: %o"), error);
            throw tr("server failed to accept our offer");
        }
        if(this.peer !== peer) { return; }

        this.peer.onnegotiationneeded = () => this.handleNegotiationNeeded();
        this.connectTimeout = setTimeout(() => {
            this.handleFatalError("Connection initialize timeout", true);
        }, 10_000);

        /* Nothing left to do. Server should send a notifyrtcsessiondescription with mode answer */
    }

    private handleConnectionStateChanged(event: ServerConnectionEvents["notify_connection_state_changed"]) {
        if(event.newState === ConnectionState.CONNECTED) {
            /* will be called by the server connection handler */
        } else {
            this.reset(true);
            this.retryCalculator.reset();
        }
    }

    private handleLocalIceCandidate(candidate: RTCIceCandidate | undefined) {
        if(candidate) {
            console.error(candidate.candidate);
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
                logError(LogCategory.WEBRTC, tr("Received local ICE candidate finish, without having any candidates"));
                this.handleFatalError(tr("Failed to gather any local ICE candidates."), false);
                return;
            } else {
                logTrace(LogCategory.WEBRTC, tr("Received local ICE candidate finish"));
            }
            this.connection.send_command("rtcicecandidate", { }).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to transmit local ICE candidate finish to server: %o"), error);
            });
        }
    }

    public handleRemoteIceCandidate(candidate: RTCIceCandidate | undefined, mediaLine: number) {
        if(!this.peer) {
            logWarn(LogCategory.WEBRTC, tr("Received remote ICE candidate without an active peer. Dropping candidate."));
            return;
        }

        if(!this.peerRemoteDescriptionReceived) {
            logTrace(LogCategory.WEBRTC, tr("Received remote ICE candidate but haven't yet received a remote description. Caching the candidate."));
            this.cachedRemoteIceCandidates.push({ mediaLine: mediaLine, candidate: candidate });
            return;
        }

        if(!candidate) {
            /* candidates finished */
        } else {
            this.peer.addIceCandidate(candidate).then(() => {
                logTrace(LogCategory.WEBRTC, tr("Successfully added a remote ice candidate for media line %d: %s"), mediaLine, candidate.candidate);
            }).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to add a remote ice candidate for media line %d: %o (Candidate: %s)"), mediaLine, error, candidate.candidate);
            });
        }
    }

    public applyCachedRemoteIceCandidates() {
        for(const { candidate, mediaLine } of this.cachedRemoteIceCandidates) {
            this.handleRemoteIceCandidate(candidate, mediaLine);
        }

        this.handleRemoteIceCandidate(undefined, 0);
        this.cachedRemoteIceCandidates = [];
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
        logWarn(LogCategory.WEBRTC, tr("Local peer needs negotiation, but that's not supported that."));
    }
    private handlePeerConnectionStateChanged() {
        logTrace(LogCategory.WEBRTC, tr("Peer connection state changed to %s"), this.peer.connectionState);
        switch (this.peer.connectionState) {
            case "connecting":
                this.updateConnectionState(RTPConnectionState.CONNECTING);
                break;

            case "connected":
                clearTimeout(this.connectTimeout);
                this.retryCalculator.reset();
                this.updateConnectionState(RTPConnectionState.CONNECTED);
                break;

            case "failed":
                if(this.connectionState !== RTPConnectionState.FAILED) {
                    this.handleFatalError(tr("peer connection failed"), true);
                }
                break;

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
            if(!this.audioSupport) {
                logWarn(LogCategory.WEBRTC, tr("Received remote audio track %d but audio has been disabled. Dropping track."), ssrc);
                return;
            }
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
            if(typeof info.media === "undefined") {
                /* the media will only be send on stream assignments, not on stream state changes */
                info.media = tempStream.info?.media;
            }
            tempStream.info = info;
            tempStream.status = state;
        }
    }

    async getConnectionStatistics() : Promise<RTCConnectionStatistics> {
        try {
            if(!this.peer) {
                throw "missing peer";
            }

            const statisticsInfo = await this.peer.getStats();
            const statistics = [...statisticsInfo.entries()].map(e => e[1]) as RTCStats[];
            const inboundStreams = statistics.filter(e => e.type.replace(/-/, "") === "inboundrtp" && 'bytesReceived' in e) as any[];
            const outboundStreams = statistics.filter(e => e.type.replace(/-/, "") === "outboundrtp" && 'bytesSent' in e) as any[];

            return {
                voiceBytesSent: outboundStreams.filter(e => e.mediaType === "audio").reduce((a, b) => a + b.bytesSent, 0),
                voiceBytesReceived: inboundStreams.filter(e => e.mediaType === "audio").reduce((a, b) => a + b.bytesReceived, 0),

                videoBytesSent: outboundStreams.filter(e => e.mediaType === "video").reduce((a, b) => a + b.bytesSent, 0),
                videoBytesReceived: inboundStreams.filter(e => e.mediaType === "video").reduce((a, b) => a + b.bytesReceived, 0)
            }
        } catch (error) {
            logWarn(LogCategory.WEBRTC, tr("Failed to calculate connection statistics: %o"), error);
            return {
                videoBytesReceived: 0,
                videoBytesSent: 0,

                voiceBytesReceived: 0,
                voiceBytesSent: 0
            };
        }
    }

    async getVideoBroadcastStatistics(type: RTCBroadcastableTrackType) : Promise<RtcVideoBroadcastStatistics | undefined> {
        if(!this.currentTransceiver[type]?.sender) { return undefined; }

        const senderStatistics = new RTCStatsWrapper(() => this.currentTransceiver[type].sender.getStats());
        await senderStatistics.initialize();
        if(senderStatistics.getValues().length === 0) { return undefined; }

        const trackSettings = this.currentTransceiver[type].sender.track?.getSettings() || {};

        const result = {} as RtcVideoBroadcastStatistics;

        const outboundStream = senderStatistics.getStatisticByType("outboundrtp");
        /* only available in chrome */
        if("codecId" in outboundStream) {
            if(typeof outboundStream.codecId !== "string") { throw tr("invalid codec id type"); }
            if(senderStatistics[outboundStream.codecId]?.type !== "codec") { throw tra("invalid/missing codec statistic for codec {}", outboundStream.codecId); }

            const codecInfo = senderStatistics[outboundStream.codecId];
            if(typeof codecInfo.mimeType !== "string") { throw tr("codec statistic missing mine type"); }
            if(typeof codecInfo.payloadType !== "number") { throw tr("codec statistic has invalid payloadType type"); }

            result.codec = {
                name: codecInfo.mimeType.startsWith("video/") ? codecInfo.mimeType.substr(6) : codecInfo.mimeType || tr("unknown"),
                payloadType: codecInfo.payloadType
            };
        } else {
            /* TODO: Get the only one video type from the sdp */
        }

        if("frameWidth" in outboundStream && "frameHeight" in outboundStream) {
            if(typeof outboundStream.frameWidth !== "number") { throw tr("invalid frameWidth attribute of outboundrtp statistic"); }
            if(typeof outboundStream.frameHeight !== "number") { throw tr("invalid frameHeight attribute of outboundrtp statistic"); }

            result.dimensions = {
                width: outboundStream.frameWidth,
                height: outboundStream.frameHeight
            };
        } else if("height" in trackSettings && "width" in trackSettings) {
            result.dimensions = {
                height: trackSettings.height,
                width: trackSettings.width
            };
        } else {
            result.dimensions = {
                width: 0,
                height: 0
            };
        }

        if("framesPerSecond" in outboundStream) {
            if(typeof outboundStream.framesPerSecond !== "number") { throw tr("invalid framesPerSecond attribute of outboundrtp statistic"); }
            result.frameRate = outboundStream.framesPerSecond;
        } else if("frameRate" in trackSettings) {
            result.frameRate = trackSettings.frameRate;
        } else {
            result.frameRate = 0;
        }

        if("qualityLimitationReason" in outboundStream) {
            /* TODO: verify the value? */
            if(typeof outboundStream.qualityLimitationReason !== "string") { throw tr("invalid qualityLimitationReason attribute of outboundrtp statistic"); }
            result.qualityLimitation = outboundStream.qualityLimitationReason as any;
        } else {
            result.qualityLimitation = "none";
        }

        if("mediaSourceId" in outboundStream) {
            if(typeof outboundStream.mediaSourceId !== "string") { throw tr("invalid media source type"); }
            if(senderStatistics[outboundStream.mediaSourceId]?.type !== "media-source") { throw tra("invalid/missing media source statistic for source {}", outboundStream.mediaSourceId); }

            const source = senderStatistics[outboundStream.mediaSourceId];
            if(typeof source.width !== "number") { throw tr("invalid width attribute of media-source statistic"); }
            if(typeof source.height !== "number") { throw tr("invalid height attribute of media-source statistic"); }
            if(typeof source.framesPerSecond !== "number") { throw tr("invalid framesPerSecond attribute of media-source statistic"); }

            result.source = {
                dimensions: { height: source.height, width: source.width },
                frameRate: source.framesPerSecond
            };
        } else {
            result.source = {
                dimensions: { width: 0, height: 0 },
                frameRate: 0
            };

            if("height" in trackSettings && "width" in trackSettings) {
                result.source.dimensions = {
                    height: trackSettings.height,
                    width: trackSettings.width
                };
            }

            if("frameRate" in trackSettings) {
                result.source.frameRate = trackSettings.frameRate;
            }
        }

        return result;
    }
}