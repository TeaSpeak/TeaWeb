import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";
import {initializeChannelTreeController} from "tc-shared/ui/tree/Controller";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {
    initializePopoutControlBarController
} from "tc-shared/ui/frames/control-bar/Controller";
import {server_connections} from "tc-shared/ConnectionManager";

export function spawnChannelTreePopout(handler: ConnectionHandler) {
    const eventsTree = new Registry<ChannelTreeUIEvents>();
    eventsTree.enableDebug("channel-tree-view-modal");
    initializeChannelTreeController(eventsTree, handler.channelTree);

    const eventsControlBar = new Registry<ControlBarEvents>();
    initializePopoutControlBarController(eventsControlBar, handler);

    let handlerDestroyListener;
    server_connections.events().on("notify_handler_deleted", handlerDestroyListener = event => {
        if(event.handler !== handler) {
            return;
        }

        modal.destroy();
    });

    const modal = spawnExternalModal("channel-tree", { tree: eventsTree, controlBar: eventsControlBar }, { handlerId: handler.handlerId }, "channel-tree-" + handler.handlerId);
    modal.show();

    modal.getEvents().on("destroy", () => {
        server_connections.events().off("notify_handler_deleted", handlerDestroyListener);

        eventsTree.fire("notify_destroy");
        eventsTree.destroy();

        eventsControlBar.fire("notify_destroy");
        eventsControlBar.destroy();
    });
}