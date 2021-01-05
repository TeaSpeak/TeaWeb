import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";

export interface AppUiEvents {
    query_channel_tree: {},

    notify_channel_tree: {
        events: Registry<ChannelTreeUIEvents> | undefined,
        handlerId: string
    }
}