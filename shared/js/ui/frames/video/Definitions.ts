import {ClientIcon} from "svg-sprites/client-icons";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

export const kLocalVideoId = "__local__video__";
export const kLocalBroadcastChannels: VideoBroadcastType[] = ["screen", "camera"];

export type ChannelVideoInfo = { clientName: string, clientUniqueId: string, clientId: number, statusIcon: ClientIcon };
export type ChannelVideoStreamState = "available" | "streaming" | "ignored" | "muted" | "none";

export type VideoStatistics = {
    type: "sender",
    mode: "camara" | "screen",

    dimensions: { width: number, height: number },
    frameRate: number,

    codec: { name: string, payloadType: number }

    maxBandwidth: number,
    bandwidth: number,

    qualityLimitation: "cpu" | "bandwidth",

    source: {
        frameRate: number,
        dimensions: { width: number, height: number },
    }
} | {
    type: "receiver",
    mode: "camara" | "screen",

    dimensions: { width: number, height: number },
    frameRate: number,

    codec: { name: string, payloadType: number }
};

export type VideoStreamState = {
    state: "disconnected"
} | {
    state: "available"
} | {
    state: "connecting"
} | {
    /* like join failed or whatever */
    state: "failed",
    reason?: string
} | {
    state: "connected",
    stream: MediaStream
};

/**
 * "muted": The video has been muted locally
 * "unset": The video will be normally played
 * "empty": No video available
 */
export type LocalVideoState = "muted" | "unset" | "empty";

export interface ChannelVideoEvents {
    action_toggle_expended: { expended: boolean },
    action_video_scroll: { direction: "left" | "right" },
    action_set_spotlight: { videoId: string | undefined, expend: boolean },
    action_focus_spotlight: {},
    action_set_fullscreen: { videoId: string | undefined },
    action_toggle_mute: { videoId: string, broadcastType: VideoBroadcastType, muted: boolean },
    action_dismiss: { videoId: string, broadcastType: VideoBroadcastType },

    query_expended: {},
    query_videos: {},
    query_video: { videoId: string },
    query_video_info: { videoId: string },
    query_video_statistics: { videoId: string, broadcastType: VideoBroadcastType },
    query_spotlight: {},
    query_video_stream: { videoId: string, broadcastType: VideoBroadcastType },

    notify_expended: { expended: boolean },
    notify_videos: {
        videoIds: string[]
    },
    notify_video: {
        videoId: string,

        cameraStream: ChannelVideoStreamState,
        screenStream: ChannelVideoStreamState,
    },
    notify_video_info: {
        videoId: string,
        info: ChannelVideoInfo
    },
    notify_video_info_status: {
        videoId: string,
        statusIcon: ClientIcon
    },
    notify_video_arrows: {
        left: boolean,
        right: boolean
    },
    notify_spotlight: {
        videoId: string | undefined
    },
    notify_video_statistics: {
        videoId: string | undefined,
        broadcastType: VideoBroadcastType,
        statistics: VideoStatistics
    },
    notify_video_stream: {
        videoId: string,
        broadcastType: VideoBroadcastType,
        state: VideoStreamState
    }
}