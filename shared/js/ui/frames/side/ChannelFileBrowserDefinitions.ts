import {FileBrowserEvents} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {Registry} from "tc-shared/events";

export interface ChannelFileBrowserUiEvents {
    query_events: {},

    notify_events: {
        browserEvents: Registry<FileBrowserEvents>,
        channelId: number
    },
}