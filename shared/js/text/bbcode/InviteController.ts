import * as loader from "tc-loader";
import {ChannelMessage, getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {UrlParameterParser} from "tc-shared/settings";
import {IpcInviteInfo} from "tc-shared/text/bbcode/InviteDefinitions";
import {LogCategory, logError} from "tc-shared/log";
import {clientServiceInvite, clientServices} from "tc-shared/clientservice";
import {handleConnectRequest} from "tc-shared/main";

let ipcChannel: IPCChannel;
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "Invite controller init",
    function: async () => {
        ipcChannel = getIpcInstance().createChannel("invite-info");
        ipcChannel.messageHandler = handleIpcMessage;
    },
    priority: 10
});

type QueryCacheEntry = { result, finished: boolean, timeout: number };
let queryCache: {[key: string]: QueryCacheEntry} = {};

let executingPendingInvites = false;
const pendingInviteQueries: (() => Promise<void>)[] = [];

function handleIpcMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
    if(message.type === "query") {
        const linkId = message.data["linkId"];

        if(queryCache[linkId]) {
            if(queryCache[linkId].finished) {
                ipcChannel?.sendMessage("query-result", { linkId, result: queryCache[linkId].result }, remoteId);
                return;
            }

            /* Query already enqueued. */
            return;
        }

        const entry = queryCache[linkId] = {
            finished: false,
            result: undefined,
            timeout: 0
        } as QueryCacheEntry;

        entry.timeout = setTimeout(() => {
            if(queryCache[linkId] === entry) {
                delete queryCache[linkId];
            }
        }, 30 * 60 * 1000);

        pendingInviteQueries.push(() => queryInviteLink(linkId));
        invokeLinkQueries();
    } else if(message.type === "connect") {
        const connectParameterString = message.data.connectParameters;
        const serverAddress = message.data.serverAddress;
        const serverUniqueId = message.data.serverUniqueId;

        handleConnectRequest(serverAddress, serverUniqueId, new UrlParameterParser(new URL(`https://localhost/?${connectParameterString}`))).then(undefined);
    }
}

function invokeLinkQueries() {
    if(executingPendingInvites) {
        return;
    }

    executingPendingInvites = true;
    executePendingInvites().catch(error => {
        logError(LogCategory.GENERAL, tr("Failed to execute pending invite queries: %o"), error);
        executingPendingInvites = false;
        if(pendingInviteQueries.length > 0) {
            invokeLinkQueries();
        }
    });
}

async function executePendingInvites() {
    while(pendingInviteQueries.length > 0) {
        const invite = pendingInviteQueries.pop_front();
        await invite();
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    executingPendingInvites = false;
}

async function queryInviteLink(linkId: string) {
    let result: IpcInviteInfo;
    try {
        result = await doQueryInviteLink(linkId);
    } catch (error) {
        logError(LogCategory.GENERAL, tr("Failed to query invite link info: %o"), error);
        result = {
            status: "error",
            message: tr("lookup the console for details")
        };
    }

    if(queryCache[linkId]) {
        queryCache[linkId].finished = true;
        queryCache[linkId].result = result;
    } else {
        const entry = queryCache[linkId] = {
            finished: true,
            result: result,
            timeout: 0
        };

        entry.timeout = setTimeout(() => {
            if(queryCache[linkId] === entry) {
                delete queryCache[linkId];
            }
        }, 30 * 60 * 1000);
    }

    ipcChannel?.sendMessage("query-result", { linkId, result });
}

async function doQueryInviteLink(linkId: string) : Promise<IpcInviteInfo> {
    if(!clientServices.isSessionInitialized()) {
        const connectAwait = new Promise(resolve => {
            clientServices.awaitSession().then(() => resolve(true));
            setTimeout(() => resolve(false), 5000);
        });

        if(!await connectAwait) {
            return { status: "error", message: tr("Client service not connected") };
        }
    }

    /* TODO: Cache if the client has ever seen the view! */
    const result = await clientServiceInvite.queryInviteLink(linkId, true);
    if(result.status === "error") {
        switch (result.result.type) {
            case "InviteKeyExpired":
                return { status: "expired" };

            case "InviteKeyNotFound":
                return { status: "not-found" };

            default:
                logError(LogCategory.GENERAL, tr("Failed to query invite link info for %s: %o"), linkId, result.result);
                return { status: "error", message: tra("Server query error ({})", result.result.type) };
        }
    }

    const inviteInfo = result.unwrap();

    const serverName = inviteInfo.propertiesInfo["server-name"];
    if(typeof serverName !== "string") {
        return { status: "error", message: tr("Missing server name") };
    }

    const serverUniqueId = inviteInfo.propertiesInfo["server-unique-id"];
    if(typeof serverUniqueId !== "string") {
        return { status: "error", message: tr("Missing server unique id") };
    }

    const serverAddress = inviteInfo.propertiesConnect["server-address"];
    if(typeof serverAddress !== "string") {
        return { status: "error", message: tr("Missing server address") };
    }

    const urlParameters = {};
    {
        urlParameters["cir"] = linkId;

        urlParameters["cn"] = inviteInfo.propertiesConnect["nickname"];
        urlParameters["ctk"] = inviteInfo.propertiesConnect["token"];
        urlParameters["cc"] = inviteInfo.propertiesConnect["channel"];

        urlParameters["cph"] = inviteInfo.propertiesConnect["passwords-hashed"];
        urlParameters["csp"] = inviteInfo.propertiesConnect["server-password"];
        urlParameters["ccp"] = inviteInfo.propertiesConnect["channel-password"];
    }

    const urlParameterString = Object.keys(urlParameters)
        .filter(key => typeof urlParameters[key] === "string" && urlParameters[key].length > 0)
        .map(key => `${key}=${encodeURIComponent(urlParameters[key])}`)
        .join("&");

    return {
        linkId: linkId,

        status: "success",
        expireTimestamp: inviteInfo.timestampExpired,

        serverUniqueId: serverUniqueId,
        serverName: serverName,
        serverAddress: serverAddress,

        channelName: inviteInfo.propertiesInfo["channel-name"],

        connectParameters: urlParameterString,
    };
}