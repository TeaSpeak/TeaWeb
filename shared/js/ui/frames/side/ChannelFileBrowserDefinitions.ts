import {FileBrowserEvents} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {IpcRegistryDescription} from "tc-shared/events";

export interface ChannelFileBrowserUiEvents {
    query_events: {},

    notify_events: {
        browserEvents: IpcRegistryDescription<FileBrowserEvents>,
        channelId: number
    },
}