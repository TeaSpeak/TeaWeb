import * as React from "react";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {generateDragElement, setupDragData} from "tc-shared/ui/tree/DragHelper";
import {ClientIcon} from "svg-sprites/client-icons";

const kIpcChannel = "entry-tags";
const cssStyle = require("./EntryTags.scss");

let ipcChannel: IPCChannel;

type EntryTagStyle = "text-only" | "normal";
export const ServerTag = React.memo((props: {
    serverName: string,
    handlerId: string,
    serverUniqueId?: string,
    className?: string
}) => {
    return (
        <div
            className={cssStyle.tag + (props.className ? ` ${props.className}` : ``)}
            onContextMenu={event => {
                event.preventDefault();

                ipcChannel.sendMessage("contextmenu-server", {
                    handlerId: props.handlerId,
                    serverUniqueId: props.serverUniqueId,

                    pageX: event.pageX,
                    pageY: event.pageY
                });
            }}
            draggable={false}
        >
            {props.serverName}
        </div>
    )
});

export const ClientTag = React.memo((props: {
    clientName: string,
    clientUniqueId: string,
    handlerId: string,
    clientId?: number,
    clientDatabaseId?: number,
    className?: string,

    style?: EntryTagStyle
}) => {
    let style = props.style || "normal";
    if(style === "text-only") {
        return <React.Fragment key={"text-only"}>{props.clientName}</React.Fragment>;
    }

    return (
        <div
            key={"normal"}
            className={cssStyle.tag + (props.className ? ` ${props.className}` : ``)}
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
                event.dataTransfer.setDragImage(generateDragElement([{
                    icon: ClientIcon.PlayerOn,
                    name: props.clientName
                }]), 0, 6);
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
});

export const ChannelTag = React.memo((props: {
    channelName: string,
    channelId: number,
    handlerId: string,
    className?: string
}) => (
    <div
        className={cssStyle.tag + (props.className ? ` ${props.className}` : ``)}
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
));

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "entry tags",
    priority: 10,
    function: async () => {
        ipcChannel = getIpcInstance().createCoreControlChannel(kIpcChannel);
    }
});