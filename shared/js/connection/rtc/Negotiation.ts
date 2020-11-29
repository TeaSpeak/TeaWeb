import {SessionDescription} from "sdp-transform";
import * as sdpTransform from "sdp-transform";
import { tr, tra } from "tc-shared/i18n/localize";

export interface RTCNegotiationMediaMapping {
    direction: "sendrecv" | "recvonly" | "sendonly" | "inactive",
    ssrc: number
}

export interface RTCNegotiationIceConfig {
    username: string,
    password: string,
    fingerprint: string,
    fingerprint_type: string,
    setup: "active" | "passive" | "actpass",
    candidates: string[]
}

export interface RTCNegotiationExtension {
    id: number;
    uri: string;

    media?: "audio" | "video";

    direction?: "recvonly" | "sendonly";
    config?: string;
}

export interface RTCNegotiationCodec {
    payload: number,
    name: string,

    channels?: number,
    rate?: number,

    fmtp?: string,
    feedback?: string[]
}

/** The offer send by the client to the server */
export interface RTCNegotiationOffer {
    type: "initial-offer" | "negotiation-offer",
    sessionId: number,
    ssrcs: number[],
    ssrc_types: number[],
    ice: RTCNegotiationIceConfig,
    /* Only present in initial response */
    extension: RTCNegotiationExtension | undefined
}

/** The offer send by the server to the client */
export interface RTCNegotiationMessage {
    type: "initial-offer" | "negotiation-offer" | "initial-answer" | "negotiation-answer",
    sessionId: number,
    sessionUsername: string,

    ssrc: number[],
    ssrc_flags: number[],

    ice: RTCNegotiationIceConfig,

    /* Only present in initial answer */
    extension: RTCNegotiationExtension[] | undefined,

    /* Only present in initial answer */
    audio_codecs: RTCNegotiationCodec[] | undefined,

    /* Only present in initial answer */
    video_codecs: RTCNegotiationCodec[] | undefined
}

type RTCDirection = "sendonly" | "recvonly" | "sendrecv" | "inactive";

type SsrcFlags = {
    type: "audio",
    mode: RTCDirection
} | {
    type: "video",
    mode: RTCDirection
}

namespace SsrcFlags {
    function parseRtcDirection(direction: number) : RTCDirection {
        switch (direction) {
            case 0: return "sendrecv";
            case 1: return "sendonly";
            case 2: return "recvonly";
            case 3: return "inactive";
            default: throw tra("invalid rtc direction type {}", direction);
        }
    }

    export function parse(flags: number) : SsrcFlags {
        switch (flags & 0x7) {
            case 0:
                return {
                    type: "audio",
                    mode: parseRtcDirection((flags >> 3) & 0x3)
                };

            case 1:
                return {
                    type: "video",
                    mode: parseRtcDirection((flags >> 3) & 0x3)
                };

            default:
                throw tr("invalid ssrc flags");
        }
    }
}

function generateSdp(session: RTCNegotiationMessage) {
    const sdp = {} as SessionDescription;
    sdp.version = 0;
    sdp.origin = {
        username: session.sessionUsername,
        sessionId: session.sessionId,
        ipVer: 4,
        netType: "IN",
        address: "127.0.0.1",
        sessionVersion: 2
    };
    sdp.name = "-";
    sdp.timing = { start: 0, stop: 0 };
    sdp.groups = [{
        type: "BUNDLE",
        mids: [...session.ssrc].map((_, idx) => idx).join(" ")
    }];

    sdp.media = [];
    const generateMedia = (ssrc: number, flags: SsrcFlags) => {
        let formats: RTCNegotiationCodec[];
        if(flags.type === "audio") {
            formats = session.audio_codecs;
        } else if(flags.type === "video") {
            formats = session.video_codecs;
        }
        const index = sdp.media.push({
            type: flags.type,
            port: 9,
            protocol: "UDP/TLS/RTP/SAVPF",
            payloads: formats.map(e => e.payload).join(" "),

            fmtp: [],
            rtp: [],
            rtcpFb: [],
            ext: [],
            ssrcs: [],
            invalid: []
        });

        const tMedia = sdp.media[index - 1];

        /* basic properties */
        tMedia.mid = (index - 1).toString();
        tMedia.direction = flags.mode;
        tMedia.rtcpMux = "rtcp-mux";

        /* ice */
        tMedia.iceUfrag = session.ice.username;
        tMedia.icePwd = session.ice.password;
        tMedia.invalid.push({ value: "ice-options:trickle" });
        tMedia.fingerprint = {
            hash: session.ice.fingerprint,
            type: session.ice.fingerprint_type,
        };
        tMedia.setup = session.ice.setup;

        /* codecs */
        for(const codec of formats) {
            tMedia.rtp.push({
                codec: codec.name,
                payload: codec.payload,
                rate: codec.rate,
                encoding: codec.channels
            });

            for(const feedback of codec.feedback || []) {
                tMedia.rtcpFb.push({
                    payload: codec.payload,
                    type: feedback
                });
            }

            if(codec.fmtp) {
                tMedia.fmtp.push({
                    payload: codec.payload,
                    config: codec.fmtp
                });
            }
        }

        /* extensions */
        for(const extension of session.extension || []) {
            if(extension.media && extension.media !== tMedia.type) {
                continue;
            }

            tMedia.ext.push({
                value: extension.id,
                config: extension.config,
                direction: extension.direction,
                uri: extension.uri
            });
        }

        /* ssrc */
        tMedia.ssrcs.push({
            id: ssrc >>> 0,
            attribute: "cname",
            value: (ssrc >>> 0).toString(16)
        });
    };

    for(let index = 0; index < session.ssrc.length; index++) {
        const flags = SsrcFlags.parse(session.ssrc_flags[index]);
        generateMedia(session.ssrc[index], flags);
    }

    console.error(JSON.stringify(session));
    return sdpTransform.write(sdp);
}

export class RTCNegotiator {
    private readonly peer: RTCPeerConnection;

    public callbackData: (data: string) => void;
    public callbackFailed: (reason: string) => void;

    private sessionCodecs: RTCNegotiationCodec | undefined;
    private sessionExtensions: RTCNegotiationExtension | undefined;

    constructor(peer: RTCPeerConnection) {
        this.peer = peer;
    }

    doInitialNegotiation() {

    }

    handleRemoteData(dataString: string) {

    }
}
/* FIXME: mozilla...THIS_IS_SDPARTA-82.0.3 (Needs to be parsed from the offer) */
/*
console.error("XYX\n%s",
    generateSdp({
        sessionId: "1234",
        audio_media: [
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            }
        ],
        video_media: [
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            },
            {
                direction: "sendrecv",
                ssrc: 123885,
            }
        ],
        audio_codecs: [{
            payload: 88,
            channels: 2,
            feedback: ["nack"],
            fmtp: "minptime=10;useinbandfec=1",
            name: "opus",
            rate: 48000
        }],
        video_codecs: [{
            payload: 89,
            name: "VP8",
            feedback: ["nack", "nack pli"]
        }],
        extension: [{
            id: 1,
            uri: "urn:ietf:params:rtp-hdrext:ssrc-audio-level"
        }],
        ice: {
            candidates: [],
            fingerprint: "E6:C3:F3:17:71:11:4B:E5:1A:DD:EC:3C:AA:F2:BB:48:08:3B:A5:69:18:44:4A:97:59:62:BF:B4:43:F1:5D:00",
            fingerprint_type: "sha-256",
            password: "passwd",
            username: "uname",
            setup: "actpass"
        }
    }, "-")
);
throw "dummy load error";
*/