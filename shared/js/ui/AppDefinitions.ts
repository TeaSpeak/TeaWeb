import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";

export interface AppUiEvents {
    query_channel_tree: {},
    query_video_container: {},

    notify_channel_tree: {
        events: Registry<ChannelTreeUIEvents> | undefined,
        handlerId: string
    },
    notify_video_container: {
        container: HTMLDivElement | undefined
    }
}