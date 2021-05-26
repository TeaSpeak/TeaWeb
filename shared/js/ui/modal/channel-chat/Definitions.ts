import {IpcRegistryDescription} from "tc-events";
import {ChannelConversationUiEvents} from "tc-shared/ui/frames/side/ChannelConversationDefinitions";

export interface ModalChannelChatParameters {
    events: IpcRegistryDescription<ChannelConversationUiEvents>,
    channelName: string,
    channelId: number,
    handlerId: string
}