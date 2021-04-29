import {ChannelConversationController} from "tc-shared/ui/frames/side/ChannelConversationController";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {ignorePromise} from "tc-shared/proto";
import {ChannelConversation} from "tc-shared/conversations/ChannelConversationManager";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export function spawnModalChannelChat(connectionHandler: ConnectionHandler, conversation: ChannelConversation) {
    const channel = connectionHandler.channelTree.findChannel(conversation.conversationId);

    const controller = new ChannelConversationController();
    controller.setConnectionHandler(connectionHandler);
    controller.setSelectedConversation(conversation);

    const modal = spawnModal("channel-chat", [{
        handlerId: connectionHandler.handlerId,
        channelId: typeof channel === "undefined" ? 0 : channel.channelId,
        channelName: typeof channel === "undefined" ? "Unknown channel" : channel.channelName(),
        events: controller.getUiEvents().generateIpcDescription()
    }], {
        popoutable: false,
        popedOut: true,
        uniqueId: "chan-conv-" + connectionHandler.handlerId + "-" + conversation.getChatId()
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    ignorePromise(modal.show());
}