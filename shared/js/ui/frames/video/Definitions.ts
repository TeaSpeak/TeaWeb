import {ClientIcon} from "svg-sprites/client-icons";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

export const kLocalVideoId = "__local__video__";
export const kLocalBroadcastChannels: VideoBroadcastType[] = ["screen", "camera"];

export type ChannelVideoInfo = { clientName: string, clientUniqueId: string, clientId: number, statusIcon: ClientIcon };
export type ChannelVideoStream = "available" | MediaStream | undefined;

export type ChannelVideo ={
    status: "initializing",
} | {
    status: "connected",

    cameraStream: ChannelVideoStream,
    desktopStream: ChannelVideoStream,

    dismissed: {[T in VideoBroadcastType]: boolean}
} | {
    status: "error",
    message: string
} | {
    status: "no-video"
};

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
    query_video_mute_status: { videoId: string }

    notify_expended: { expended: boolean },
    notify_videos: {
        videoIds: string[]
    },
    notify_video: {
        videoId: string,
        status: ChannelVideo
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
    notify_video_mute_status: {
        videoId: string,
        status: {[T in VideoBroadcastType] : "muted" | "available" | "unset"}
    }
}