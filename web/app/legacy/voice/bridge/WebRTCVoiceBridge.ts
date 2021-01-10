import * as aplayer from "tc-backend/web/audio/player";
import * as log from "tc-shared/log";
import {LogCategory, logDebug, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {VoiceBridge, VoiceBridgeConnectResult} from "./VoiceBridge";

export abstract class WebRTCVoiceBridge extends VoiceBridge {
    private readonly muteAudioNode: GainNode;

    private connectionState: "unconnected" | "connecting" | "connected";

    private rtcConnection: RTCPeerConnection;
    private voiceDataChannel: RTCDataChannel;
    private whisperDataChannel: RTCDataChannel;

    private cachedIceCandidates: RTCIceCandidateInit[];
    private localIceCandidateCount: number;

    private callbackRtcAnswer: (answer: any) => void;

    private callbackConnectCanceled: (() => void)[] = [];
    private callbackRtcConnected: () => void;
    private callbackRtcConnectFailed: (error: any) => void;
    private callbackVoiceDataChannelOpened: (() => void)[] = [];

    private allowReconnect: boolean;

    protected constructor() {
        super();

        this.connectionState = "unconnected";
        const audioContext = aplayer.context();
        this.muteAudioNode = audioContext.createGain();
    }

    connect(): Promise<VoiceBridgeConnectResult> {
        this.disconnect(); /* just to ensure */
        this.connectionState = "connecting";
        this.allowReconnect = true;

        return new Promise<VoiceBridgeConnectResult>(resolve => {
            let cancelState = { value: false };
            const cancelHandler = () => {
                cancelState.value = true;
                resolve({ type: "canceled" });
            }

            this.callbackConnectCanceled.push(cancelHandler);
            this.doConnect(cancelState).then(() => {
                if(cancelState.value) return;

                this.callbackConnectCanceled.remove(cancelHandler);
                this.connectionState = "connected";
                resolve({ type: "success" });
            }).catch(error => {
                if(cancelState.value) return;

                this.callbackConnectCanceled.remove(cancelHandler);
                this.connectionState = "unconnected";
                this.cleanupRtcResources();
                resolve({ type: "failed", message: error, allowReconnect: this.allowReconnect === true });
            })
        });
    }

    disconnect() {
        switch (this.connectionState) {
            case "connecting":
                this.abortConnectionAttempt();
                break;

            case "connected":
                this.doDisconnect();
                break;
        }
    }

    private async doConnect(canceled: { value: boolean }) {
        {
            let rtcConfig: RTCConfiguration = {};
            rtcConfig.iceServers = [];
            rtcConfig.iceServers.push({ urls: ['stun:stun.l.google.com:19302'] });

            this.rtcConnection = new RTCPeerConnection(rtcConfig);

            this.rtcConnection.onicegatheringstatechange = this.handleIceGatheringStateChange.bind(this);
            this.rtcConnection.oniceconnectionstatechange = this.handleIceConnectionStateChange.bind(this);
            this.rtcConnection.onicecandidate = this.handleIceCandidate.bind(this);
            this.rtcConnection.onicecandidateerror = this.handleIceCandidateError.bind(this);

            this.rtcConnection.onconnectionstatechange = this.handleRtcConnectionStateChange.bind(this);

            this.initializeRtpConnection(this.rtcConnection);
        }

        {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };

            this.voiceDataChannel = this.rtcConnection.createDataChannel('main', dataChannelConfig);
            this.voiceDataChannel.onmessage = this.handleVoiceDataChannelMessage.bind(this);
            this.voiceDataChannel.onopen = this.handleVoiceDataChannelOpen.bind(this);
            this.voiceDataChannel.binaryType = "arraybuffer";
        }

        {
            const dataChannelConfig = { ordered: false, maxRetransmits: 0 };

            this.whisperDataChannel = this.rtcConnection.createDataChannel('voice-whisper', dataChannelConfig);
            this.whisperDataChannel.onmessage = this.handleWhisperDataChannelMessage.bind(this);
            this.whisperDataChannel.onopen = this.handleWhisperDataChannelOpen.bind(this);
            this.whisperDataChannel.binaryType = "arraybuffer";
        }

        /* setting a dummy connect failed handler in case the rtc peer connection changes it's state to failed */
        const connectFailedPromise = new Promise((resolve, reject) => this.callbackRtcConnectFailed = reject);
        const wrapWithError = <T>(promise: Promise<T>) : Promise<T> => Promise.race([ promise, connectFailedPromise ]) as any;

        let offer: RTCSessionDescriptionInit;
        try {
            offer = await wrapWithError(this.rtcConnection.createOffer(this.generateRtpOfferOptions()));
            if(canceled.value) return;
        } catch (error) {
            logError(LogCategory.VOICE, tr("Failed to generate RTC offer: %o"), error);
            throw tr("failed to generate local offer");
        }

        this.localIceCandidateCount = 0;

        try {
            await wrapWithError(this.rtcConnection.setLocalDescription(offer));
            if(canceled.value) return;
        } catch (error) {
            logError(LogCategory.VOICE, tr("Failed to apply local description: %o"), error);
            throw tr("failed to apply local description");
        }

        /* cache all ICE candidates until we've received out answer */
        this.cachedIceCandidates = [];

        /* exchange the offer and answer */
        let answer;
        {
            this.callback_send_control_data("create", {
                msg: {
                    type: offer.type,
                    sdp: offer.sdp
                }
            });
            answer = await wrapWithError(new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if(canceled.value) {
                        resolve();
                        return;
                    }

                    this.callbackRtcAnswer = undefined;
                    reject(tr("failed to received a WebRTC answer (timeout)"));
                }, 5000);

                this.callbackRtcAnswer = answer => {
                    this.callbackRtcAnswer = undefined;
                    clearTimeout(timeout);
                    resolve(answer);
                };
            }));
            if(canceled.value) return;
        }

        if(!('msg' in answer)) {
            throw tr("Missing msg in servers answer");
        }

        try {
            await wrapWithError(this.rtcConnection.setRemoteDescription(new RTCSessionDescription(answer.msg)));
            if(canceled.value) return;
        } catch (error) {
            const kParseErrorPrefix = "Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': ";
            if(error instanceof DOMException && error.message.startsWith(kParseErrorPrefix))
                throw error.message.substring(kParseErrorPrefix.length);

            logError(LogCategory.VOICE, tr("Failed to apply remotes description: %o"), error);
            throw tr("failed to apply remotes description");
        }

        while(this.cachedIceCandidates.length > 0) {
            this.registerRemoteIceCandidate(this.cachedIceCandidates.pop_front());
        }

        /* ATTENTION: Do not use wrapWithError from now on (this.callbackRtcConnectFailed has been changed) */
        await new Promise((resolve, reject) => {
            if(this.rtcConnection.connectionState === "connected") {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                reject(tr("failed to establish a connection"));
            }, 20 * 1000);

            this.callbackRtcConnected = () => {
                clearTimeout(timeout);
                resolve();
            };

            this.callbackRtcConnectFailed = error => {
                clearTimeout(timeout);
                reject(error);
            };
        });
        if(canceled.value) return;

        logDebug(LogCategory.WEBRTC, tr("Successfully connected to server. Awaiting main data channel to open."));
        try {
            await this.awaitMainChannelOpened(10 * 1000);
        } catch {
            throw tr("failed to open the main data channel");
        }

        logInfo(LogCategory.WEBRTC, tr("Successfully initialized session with server."));
    }

    private doDisconnect() {
        this.cleanupRtcResources();
        this.connectionState = "unconnected";

        if(this.callbackDisconnect)
            this.callbackDisconnect();
    }

    private abortConnectionAttempt() {
        while(this.callbackConnectCanceled.length > 0)
            this.callbackConnectCanceled.pop()();

        this.cleanupRtcResources();
        this.connectionState = "unconnected";
    }

    private cleanupRtcResources() {
        if(this.voiceDataChannel) {
            this.voiceDataChannel.onclose = undefined;
            this.voiceDataChannel.close();
            this.voiceDataChannel = undefined;
        }

        if(this.rtcConnection) {
            this.rtcConnection.onicegatheringstatechange = undefined;
            this.rtcConnection.oniceconnectionstatechange = undefined;
            this.rtcConnection.onicecandidate = undefined;
            this.rtcConnection.onicecandidateerror = undefined;

            this.rtcConnection.onconnectionstatechange = undefined;

            this.rtcConnection.close();
            this.rtcConnection = undefined;
        }

        this.cachedIceCandidates = undefined;
    }

    protected async awaitMainChannelOpened(timeout: number) {
        if(typeof this.voiceDataChannel === "undefined")
            throw tr("missing main data channel");

        if(this.voiceDataChannel.readyState === "open") {
            return;
        }

        await new Promise((resolve, reject) => {
            const id = setTimeout(reject, timeout);
            this.callbackVoiceDataChannelOpened.push(() => {
                clearTimeout(id);
                resolve();
            });
        })
    }

    private registerRemoteIceCandidate(candidate: RTCIceCandidateInit) {
        if(!this.rtcConnection) {
            logDebug(LogCategory.WEBRTC, tr("Tried to register a remote ICE candidate without a RTC connection. Dropping candidate."));
            return;
        }

        if(candidate.candidate === "") {
            logDebug(LogCategory.WEBRTC, tr("Remote send candidate finish for channel %d."), candidate.sdpMLineIndex);
            this.rtcConnection.addIceCandidate(candidate).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to add remote ICE end candidate to local rtc connection: %o"), error);
            });
        } else {
            const pcandidate = new RTCIceCandidate(candidate);
            if(pcandidate.protocol !== "tcp") return; /* UDP does not work currently */

            logTrace(LogCategory.WEBRTC, tr("Adding remote ICE candidate %s for media line %d: %s"), pcandidate.foundation, candidate.sdpMLineIndex, candidate.candidate);
            this.rtcConnection.addIceCandidate(pcandidate).catch(error => {
                logWarn(LogCategory.WEBRTC, tr("Failed to add remote ICE candidate %s: %o"), pcandidate.foundation, error);
            })
        }
    }

    private handleRtcConnectionStateChange() {
        logDebug(LogCategory.WEBRTC, tr("Connection state changed to %s (Local connection state: %s)"), this.rtcConnection.connectionState, this.connectionState);
        switch (this.rtcConnection.connectionState) {
            case "connected":
                if(this.callbackRtcConnected)
                    this.callbackRtcConnected();
                break;

            case "failed":
                if(this.callbackRtcConnectFailed)
                    this.callbackRtcConnectFailed(tr("connect attempt failed"));
                else if(this.callbackDisconnect)
                    this.callbackDisconnect();
                break;

            case "disconnected":
            case "closed":
                if(this.callbackDisconnect)
                    this.callbackDisconnect();
                break;
        }
    }

    private handleIceGatheringStateChange() {
        logTrace(LogCategory.WEBRTC, tr("ICE gathering state changed to %s"), this.rtcConnection.iceGatheringState);
    }

    private handleIceConnectionStateChange() {
        logTrace(LogCategory.WEBRTC, tr("ICE connection state changed to %s"), this.rtcConnection.iceConnectionState);
    }

    private handleIceCandidate(event: RTCPeerConnectionIceEvent) {
        if(event.candidate && event.candidate.protocol !== "tcp") {
            return;
        }

        if(event.candidate) {
            this.localIceCandidateCount++;
            logDebug(LogCategory.WEBRTC, tr("Gathered local ice candidate for stream %d: %s"), event.candidate.sdpMLineIndex, event.candidate.candidate);
            this.callback_send_control_data("ice", { msg: event.candidate.toJSON() });
        } else if(this.localIceCandidateCount === 0) {
            logError(LogCategory.WEBRTC, tr("Failed to gather any local ice candidates... This is a fatal error."));

            /* we don't allow a reconnect here since it's most the times not fixable by just trying again */
            this.allowReconnect = false;
            if(this.callbackRtcConnectFailed) {
                this.callbackRtcConnectFailed(tr("failed to gather any local ICE candidates"));
            }
        } else {
            logDebug(LogCategory.WEBRTC, tr("Local ICE candidate gathering finish."));
            this.callback_send_control_data("ice_finish", {});
        }

    }

    private handleIceCandidateError(event: RTCPeerConnectionIceErrorEvent) {
        if(this.rtcConnection.iceGatheringState === "gathering") {
            logWarn(LogCategory.WEBRTC, tr("Received error while gathering the ice candidates: %d/%s for %s (url: %s)"),
                event.errorCode, event.errorText, event.hostCandidate, event.url);
        } else {
            logTrace(LogCategory.WEBRTC, tr("Ice candidate %s (%s) errored: %d/%s"),
                event.url, event.hostCandidate, event.errorCode, event.errorText);
        }
    }

    protected handleVoiceDataChannelOpen() {
        logDebug(LogCategory.WEBRTC, tr("Voice data channel is open now"));
        while(this.callbackVoiceDataChannelOpened.length > 0)
            this.callbackVoiceDataChannelOpened.pop()();
    }

    protected handleVoiceDataChannelMessage(message: MessageEvent) { }

    protected handleWhisperDataChannelOpen() {
        logDebug(LogCategory.WEBRTC, tr("Whisper data channel is open now"));
    }

    protected handleWhisperDataChannelMessage(message: MessageEvent) { }

    handleControlData(request: string, payload: any) {
        super.handleControlData(request, payload);

        if(request === "answer") {
            if(typeof this.callbackRtcAnswer === "function") {
                this.callbackRtcAnswer(payload);
            } else {
                logWarn(LogCategory.WEBRTC, tr("Received answer, but we're not expecting one. Dropping it."));
            }
            return;
        } else if(request === "ice" || request === "ice_finish") {
            if(this.cachedIceCandidates) {
                this.cachedIceCandidates.push(payload["msg"]);
            } else {
                this.registerRemoteIceCandidate(payload["msg"]);
            }
        } else if(request === "status") {
            if(request["state"] === "failed") {
                if(this.callbackRtcConnectFailed) {
                    this.allowReconnect = request["allow_reconnect"];
                    this.callbackRtcConnectFailed(payload["reason"]);
                }
                return;
            }
        }
    }

    public getMainDataChannel() : RTCDataChannel {
        return this.voiceDataChannel;
    }

    protected abstract initializeRtpConnection(connection: RTCPeerConnection);
    protected abstract generateRtpOfferOptions() : RTCOfferOptions;
}