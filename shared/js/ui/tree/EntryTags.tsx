import * as React from "react";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {AppParameters} from "tc-shared/settings";
import {generateDragElement, setupDragData} from "tc-shared/ui/tree/DragHelper";
import {ClientIcon} from "svg-sprites/client-icons";

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
         draggable={true}
         onDragStart={event => {
             /* clients only => move */
             event.dataTransfer.effectAllowed = "move"; /* prohibit copying */
             event.dataTransfer.dropEffect = "move";
             event.dataTransfer.setDragImage(generateDragElement([{ icon: ClientIcon.PlayerOn, name: props.clientName }]), 0, 6);
             setupDragData(event.dataTransfer, props.handlerId, [
                 {
                     type: "client",
                     clientUniqueId: props.clientUniqueId,
                     clientId: props.clientId,
                     clientDatabaseId: props.clientDatabaseId
                 }
             ], "client");
             event.dataTransfer.setData("text/plain", props.clientName);
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
        draggable={true}
        onDragStart={event => {
            event.dataTransfer.effectAllowed = "all";
            event.dataTransfer.dropEffect = "move";
            event.dataTransfer.setDragImage(generateDragElement([{ icon: ClientIcon.ChannelGreen, name: props.channelName }]), 0, 6);
            setupDragData(event.dataTransfer, props.handlerId, [
                {
                    type: "channel",
                    channelId: props.channelId
                }
            ], "channel");
            event.dataTransfer.setData("text/plain", props.channelName);
        }}
    >
        {props.channelName}
    </div>
);


loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "entry tags",
    priority: 10,
    function: async () => {
        ipcChannel = getIpcInstance().createCoreControlChannel(kIpcChannel);
    }
});