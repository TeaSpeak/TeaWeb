import * as React from "react";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {Settings} from "tc-shared/settings";

const kIpcChannel = "entry-tags";
const cssStyle = require("./EntryTags.scss");

let ipcChannel: IPCChannel;

export const ClientTag = (props: { clientName: string, clientUniqueId: string, handlerId: string, clientId?: number, clientDatabaseId?: number, className?: string }) => (
    <div className={cssStyle.client + (props.className ? ` ${props.className}` : ``)}
         onContextMenu={event => {
             event.preventDefault();

             ipcChannel.sendMessage("contextmenu-client", {
                 clientUniqueId: props.clientUniqueId,
                 handlerId: props.handlerId,
                 clientId: props.clientId,
                 clientDatabaseId: props.clientDatabaseId,

                 pageX: event.pageX,
                 pageY: event.pageY
             });
         }}
    >
        {props.clientName}
    </div>
);

export const ChannelTag = (props: { channelName: string, channelId: number, handlerId: string, className?: string }) => (
    <div
        className={cssStyle.client + (props.className ? ` ${props.className}` : ``)}
        onContextMenu={event => {
            event.preventDefault();

            ipcChannel.sendMessage("contextmenu-channel", {
                handlerId: props.handlerId,
                channelId: props.channelId,

                pageX: event.pageX,
                pageY: event.pageY
            });
        }}
    >
        {props.channelName}
    </div>
);


loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "entry tags",
    priority: 10,
    function: async () => {
        const ipc = getIpcInstance();
        ipcChannel = ipc.createChannel(Settings.instance.static(Settings.KEY_IPC_REMOTE_ADDRESS, ipc.getLocalAddress()), kIpcChannel);
    }
});