import {ChannelMessage, getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import * as loader from "tc-loader";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {assertMainApplication} from "tc-shared/ui/utils";

assertMainApplication();

let ipcChannel: IPCChannel;
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "Invite controller init",
    function: async () => {
        ipcChannel = getIpcInstance().createChannel("bbcode-youtube");
        ipcChannel.messageHandler = handleIpcMessage;
    },
    priority: 10
});


function handleIpcMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
    if(message.type === "w2g") {
        global_client_actions.fire("action_w2g", {
            videoUrl: message.data.videoUrl,
            handlerId: message.data.handlerId
        });
    }
}