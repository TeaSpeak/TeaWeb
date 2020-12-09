import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {getIpcInstance} from "tc-shared/ipc/BrowserIPC";
import {LogCategory, logWarn} from "tc-shared/log";
import {server_connections} from "tc-shared/ConnectionManager";

const kIpcChannel = "entry-tags";

function handleIpcMessage(type: string, payload: any) {
    switch (type) {
        case "contextmenu-client": {
            const {
                handlerId,

                clientUniqueId,
                clientId,
                clientDatabaseId,

                pageX,
                pageY
            } = payload;

            if(typeof pageX !== "number" || typeof pageY !== "number") {
                logWarn(LogCategory.IPC, tr("Received client context menu action with an invalid page coordinated: %ox%o."), pageX, pageY);
                return;
            }

            if(typeof handlerId !== "string") {
                logWarn(LogCategory.IPC, tr("Received client context menu action with an invalid handler id: %o."), handlerId);
                return;
            }

            if(typeof clientUniqueId !== "string") {
                logWarn(LogCategory.IPC, tr("Received client context menu action with an invalid client unique id: %o."), clientUniqueId);
                return;
            }

            if(clientId !== undefined && typeof clientId !== "number") {
                logWarn(LogCategory.IPC, tr("Received client context menu action with an invalid client id: %o."), clientId);
                return;
            }

            if(clientDatabaseId !== undefined && typeof clientDatabaseId !== "number") {
                logWarn(LogCategory.IPC, tr("Received client context menu action with an invalid client database id: %o."), clientDatabaseId);
                return;
            }

            const handler = server_connections.findConnection(handlerId);
            if(!handler) { return; }

            let clients = handler.channelTree.clients.filter(client => client.properties.client_unique_identifier === clientUniqueId);
            if(clientId) {
                clients = clients.filter(client => client.clientId() === clientId);
            }
            if(clientDatabaseId) {
                clients = clients.filter(client => client.properties.client_database_id === clientDatabaseId);
            }

            clients[0]?.showContextMenu(pageX, pageY);
            break;
        }
        case "contextmenu-channel": {
            const {
                handlerId,
                channelId,

                pageX,
                pageY
            } = payload;

            if(typeof pageX !== "number" || typeof pageY !== "number") {
                logWarn(LogCategory.IPC, tr("Received channel context menu action with an invalid page coordinated: %ox%o."), pageX, pageY);
                return;
            }

            if(typeof handlerId !== "string") {
                logWarn(LogCategory.IPC, tr("Received channel context menu action with an invalid handler id: %o."), handlerId);
                return;
            }

            if(typeof channelId !== "number") {
                logWarn(LogCategory.IPC, tr("Received channel context menu action with an invalid channel id: %o."), channelId);
                return;
            }

            const handler = server_connections.findConnection(handlerId);
            const channel = handler?.channelTree.findChannel(channelId);
            channel?.showContextMenu(pageX, pageY);
            break;
        }
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "entry tags",
    priority: 10,
    function: async () => {
        const channel = getIpcInstance().createChannel(undefined, kIpcChannel);
        channel.messageHandler = (_remoteId, _broadcast, message) => handleIpcMessage(message.type, message.data);
    }
});