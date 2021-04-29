import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {ChannelVideoEvents} from "tc-shared/ui/frames/video/Definitions";

export interface AppUiEvents {
    query_channel_tree: {},
    query_video: {},

    notify_channel_tree: {
        events: Registry<ChannelTreeUIEvents> | undefined,
        handlerId: string
    },
    notify_video: {
        events: Registry<ChannelVideoEvents> | undefined,
        handlerId: string
    }
}