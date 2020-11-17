import {ClientIcon} from "svg-sprites/client-icons";

export const kLocalVideoId = "__local__video__";

export type ChannelVideoInfo = { clientName: string, clientUniqueId: string, clientId: number, statusIcon: ClientIcon };

export type ChannelVideo ={
    status: "initializing",
} | {
    status: "connected",
    cameraStream: MediaStream | undefined,
    desktopStream: MediaStream | undefined,
} | {
    status: "error",
    message: string
} | {
    status: "no-video"
};

export interface ChannelVideoEvents {
    action_toggle_expended: { expended: boolean },
    action_video_scroll: { direction: "left" | "right" },
    action_set_spotlight: { videoId: string | undefined, expend: boolean },

    query_expended: {},
    query_videos: {},
    query_video: { videoId: string },
    query_video_info: { videoId: string },
    query_spotlight: {},

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
    }
}