import {IpcRegistryDescription} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";

export interface ChannelTreePopoutEvents {
    query_title: {},
    notify_title: { title: string }
}

export type ChannelTreePopoutConstructorArguments = {
    events: IpcRegistryDescription<ChannelTreePopoutEvents>,
    eventsTree: IpcRegistryDescription<ChannelTreeUIEvents>,
    eventsControlBar: IpcRegistryDescription<ControlBarEvents>,
    handlerId: string
};