import * as sdpTransform from "sdp-transform";
import { tr } from "tc-shared/i18n/localize";

interface SdpCodec {
    payload: number;
    codec: string;
    rate?: number;
    encoding?: number;
    fmtp?: { [key: string]: string | number },
    rtcpFb?: string[]
}

/* For optimal performance these payload formats should match the servers one */
const OPUS_VOICE_PAYLOAD_TYPE = 111;
const OPUS_MUSIC_PAYLOAD_TYPE = 112;
const H264_PAYLOAD_TYPE = 126;
const VP8_PAYLOAD_TYPE = 120; /* 120 is the default codec format for Firefox. Firefox has problems when changing the payload types */

export class SdpProcessor {
    private static readonly kAudioCodecs: SdpCodec[] = [
        // Primary audio format
        // Attention, the payload id should be the same as the server once.
        // If not, Firefox start to make trouble and isn't replaying the sound...
        {
            // Opus Mono/Opus Voice
            payload: OPUS_VOICE_PAYLOAD_TYPE,
            codec: "opus",
            rate: 48000,
            encoding: 2,
            fmtp: { minptime: 1, maxptime: 20, useinbandfec: 1, usedtx: 1, stereo: 0, "sprop-stereo": 0 },
            rtcpFb: [ "transport-cc" ]
        },
        {
            // Opus Stereo/Opus Music
            payload: OPUS_MUSIC_PAYLOAD_TYPE,
            codec: "opus",
            rate: 48000,
            encoding: 2,
            fmtp: { minptime: 1, maxptime: 20, useinbandfec: 1, usedtx: 1, stereo: 1, "sprop-stereo": 1 },
            rtcpFb: [ "transport-cc" ]
        },
    ];

    private static readonly kVideoCodecs: SdpCodec[] = [
        {
            payload: VP8_PAYLOAD_TYPE,
            codec: "VP8",
            rate: 90000,
            rtcpFb: [ "nack", "nack pli", "ccm fir", "transport-cc" ],
        },
        {
            payload: H264_PAYLOAD_TYPE,
            codec: "H264",
            rate: 90000,
            rtcpFb: [ "nack", "nack pli", "ccm fir", "transport-cc" ],
            //42001f | Original: 42e01f
            fmtp: {
                "level-asymmetry-allowed": 1,
                "packetization-mode": 1,
                "profile-level-id": "42001f",
                "max-fr": 30,
            }
        },
    ];

    private rtpRemoteChannelMapping: {[key: string]: number};
    private rtpLocalChannelMapping: {[key: string]: number};

    constructor() {
        this.reset();
    }

    reset() {
        this.rtpRemoteChannelMapping = {};
        this.rtpLocalChannelMapping = {};
    }

    getRemoteSsrcFromFromMediaId(mediaId: string) : number | undefined {
        return this.rtpRemoteChannelMapping[mediaId];
    }

    getLocalSsrcFromFromMediaId(mediaId: string) : number | undefined {
        return this.rtpLocalChannelMapping[mediaId];
    }

    processIncomingSdp(sdpString: string, _mode: "offer" | "answer") : string {
        /* The server somehow does not encode the level id in hex */
        sdpString = sdpString.replace(/profile-level-id=4325407/g, "profile-level-id=4d0028");

        const sdp = sdpTransform.parse(sdpString);
        this.rtpRemoteChannelMapping = SdpProcessor.generateRtpSSrcMapping(sdp);

        return sdpTransform.write(sdp);
    }

    processOutgoingSdp(sdpString: string, _mode: "offer" | "answer") : string {
        const sdp = sdpTransform.parse(sdpString);

        /* apply the "root" fingerprint to each media, FF fix */
        if(sdp.fingerprint) {
            sdp.media.forEach(media => media.fingerprint = sdp.fingerprint);
        }

        /* remove the FID groups for video (We don't support that) */
        for(const media of sdp.media) {
            if(!media.ssrcGroups) { continue; }
            for(const group of media.ssrcGroups.slice()) {
                if(group.semantics === "FID") {
                    /* Keep the first ssrc which is the primary source. The other is for FID */
                    const ids = group.ssrcs.split(" ").map(ssrc => parseInt(ssrc) >>> 0).slice(1);
                    media.ssrcs = media.ssrcs.filter(ssrc => ids.indexOf(parseInt(ssrc.id as string) >>> 0) === -1);
                    media.ssrcGroups.remove(group);
                }
            }
        }

        this.rtpLocalChannelMapping = SdpProcessor.generateRtpSSrcMapping(sdp);

        SdpProcessor.patchLocalCodecs(sdp);

        return sdpTransform.write(sdp);
    }

    private static generateRtpSSrcMapping(sdp: sdpTransform.SessionDescription) {
        const mapping = {};
        for(let media of sdp.media) {
            if(typeof media.mid === "undefined") {
                throw tra("missing media id for line {}", sdp.media.indexOf(media));
            }

            /* every ssrc MUST have a cname */
            const ssrcs = (media.ssrcs || []).filter(e => e.attribute === "cname");
            ssrcs.forEach(ssrc => {
                if(typeof mapping[media.mid] === "undefined") {
                    mapping[media.mid] = ssrc.id as number >>> 0;
                }
            });
        }
        return mapping;
    }

    private static patchLocalCodecs(sdp: sdpTransform.SessionDescription) {
        for(let media of sdp.media) {
            if(media.type !== "video" && media.type !== "audio") {
                continue;
            }

            media.fmtp = [];
            media.rtp = [];
            media.rtcpFb = [];
            media.rtcpFbTrrInt = [];

            for(let codec of (media.type === "audio" ? this.kAudioCodecs : this.kVideoCodecs)) {
                media.rtp.push({
                    payload: codec.payload,
                    codec: codec.codec,
                    encoding: codec.encoding,
                    rate: codec.rate
                });

                codec.rtcpFb?.forEach(fb => media.rtcpFb.push({
                    payload: codec.payload,
                    type: fb
                }));

                if(codec.fmtp && Object.keys(codec.fmtp).length > 0) {
                    media.fmtp.push({
                        payload: codec.payload,
                        config: Object.keys(codec.fmtp).map(e => e + "=" + codec.fmtp[e]).join(";")
                    });
                    if(media.type === "audio") {
                        media.maxptime = media.fmtp["maxptime"];
                    }
                }

                if(window.detectedBrowser.name === "firefox") {
                    /*
                     * Firefox does not support multiple payload formats not switching between them.
                     * This causes us only to add one, the primary, codec and hope for the best
                     * (Opus Stereo and Mono mixing seem to work right now 11.2020)
                     */
                    /* TODO: Test this again since we're not sending a end signal via RTCP. This might change the behaviour? */
                    break;
                }
            }

            media.payloads = media.rtp.map(e => e.payload).join(" ");
        }
    }
}

export namespace SdpCompressor {
    export function decompressSdp(sdp: string, mode: number) : string {
        if(mode === 0) {
            return sdp;
        } else if(mode === 1) {
            /* TODO! */
            return sdp;
        } else {
            throw tr("unsupported compression mode");
        }
    }

    export function compressSdp(sdp: string, mode: number) : string {
        if(mode === 0) {
            return sdp;
        } else if(mode === 1) {
            /* TODO! */
            return sdp;
        } else {
            throw tr("unsupported compression mode");
        }
    }
}