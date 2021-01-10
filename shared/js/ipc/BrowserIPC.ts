import "broadcastchannel-polyfill";
import {LogCategory, logDebug, logError, logWarn} from "../log";
import {ConnectHandler} from "../ipc/ConnectHandler";
import {tr} from "tc-shared/i18n/localize";

export interface BroadcastMessage {
    timestamp: number;
    receiver: string;
    sender: string;

    type: string;
    data: any;
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

interface ProcessQuery {
    timestamp: number
    query_id: string;
}

export interface ChannelMessage {
    channel_id: string;
    type: string;
    data: any;
}

export interface ProcessQueryResponse {
    request_timestamp: number
    request_query_id: string;

    device_id: string;
    protocol: number;
}

export interface CertificateAcceptCallback {
    request_id: string;
}
export interface CertificateAcceptSucceeded { }

export abstract class BasicIPCHandler {
    protected static readonly BROADCAST_UNIQUE_ID = "00000000-0000-4000-0000-000000000000";
    protected static readonly PROTOCOL_VERSION = 1;

    protected registeredChannels: IPCChannel[] = [];
    protected localUniqueId: string;

    protected constructor() { }

    setup() {
        this.localUniqueId = uuidv4();
    }

    getLocalAddress() : string { return this.localUniqueId; }

    abstract sendMessage(type: string, data: any, target?: string);

    protected handleMessage(message: BroadcastMessage) {
        //log.trace(LogCategory.IPC, tr("Received message %o"), message);

        if(message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID) {
            if(message.type == "process-query") {
                logDebug(LogCategory.IPC, tr("Received a device query from %s."), message.sender);
                this.sendMessage("process-query-response", {
                    request_query_id: (<ProcessQuery>message.data).query_id,
                    request_timestamp: (<ProcessQuery>message.data).timestamp,

                    device_id: this.localUniqueId,
                    protocol: BasicIPCHandler.PROTOCOL_VERSION
                } as ProcessQueryResponse, message.sender);
                return;
            }
        } else if(message.receiver === this.localUniqueId) {
            if(message.type == "process-query-response") {
                const response: ProcessQueryResponse = message.data;
                if(this._query_results[response.request_query_id])
                    this._query_results[response.request_query_id].push(response);
                else {
                    logWarn(LogCategory.IPC, tr("Received a query response for an unknown request."));
                }
                return;
            }
            else if(message.type == "certificate-accept-callback") {
                const data: CertificateAcceptCallback = message.data;
                if(!this._cert_accept_callbacks[data.request_id]) {
                    logWarn(LogCategory.IPC, tr("Received certificate accept callback for an unknown request ID."));
                    return;
                }
                this._cert_accept_callbacks[data.request_id]();
                delete this._cert_accept_callbacks[data.request_id];

                this.sendMessage("certificate-accept-succeeded", {

                } as CertificateAcceptSucceeded, message.sender);
                return;
            }
            else if(message.type == "certificate-accept-succeeded") {
                if(!this._cert_accept_succeeded[message.sender]) {
                    logWarn(LogCategory.IPC, tr("Received certificate accept succeeded, but haven't a callback."));
                    return;
                }
                this._cert_accept_succeeded[message.sender]();
                return;
            }
        }
        if(message.type === "channel") {
            const data: ChannelMessage = message.data;

            let channel_invoked = false;
            for(const channel of this.registeredChannels) {
                if(channel.channelId === data.channel_id && (typeof(channel.targetClientId) === "undefined" || channel.targetClientId === message.sender)) {
                    if(channel.messageHandler)
                        channel.messageHandler(message.sender, message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID, data);
                    channel_invoked = true;
                }
            }

            if(!channel_invoked) {
                /* Seems like we're not the only web/teaclient instance */
                /* console.warn(tr("Received channel message for unknown channel (%s)"), data.channel_id); */
            }
        }
    }

    createChannel(targetId?: string, channelId?: string) : IPCChannel {
        let channel: IPCChannel = {
            targetClientId: targetId,
            channelId: channelId || uuidv4(),
            messageHandler: undefined,
            sendMessage: (type: string, data: any, target?: string) => {
                if(typeof target !== "undefined") {
                    if(typeof channel.targetClientId === "string" && target != channel.targetClientId) {
                        throw "target id does not match channel target";
                    }
                }

                this.sendMessage("channel", {
                    type: type,
                    data: data,
                    channel_id: channel.channelId
                } as ChannelMessage, target || channel.targetClientId || BasicIPCHandler.BROADCAST_UNIQUE_ID);
            }
        };

        this.registeredChannels.push(channel);
        return channel;
    }

    channels() : IPCChannel[] { return this.registeredChannels; }

    deleteChannel(channel: IPCChannel) {
        this.registeredChannels = this.registeredChannels.filter(e => e !== channel);
    }

    private _query_results: {[key: string]:ProcessQueryResponse[]} = {};
    async queryProcesses(timeout?: number) : Promise<ProcessQueryResponse[]> {
        const query_id = uuidv4();
        this._query_results[query_id] = [];

        this.sendMessage("process-query", {
            query_id: query_id,
            timestamp: Date.now()
        } as ProcessQuery);

        await new Promise(resolve => setTimeout(resolve, timeout || 250));
        const result = this._query_results[query_id];
        delete this._query_results[query_id];
        return result;
    }

    private _cert_accept_callbacks: {[key: string]:(() => any)} = {};
    register_certificate_accept_callback(callback: () => any) : string {
        const id = uuidv4();
        this._cert_accept_callbacks[id] = callback;
        return this.localUniqueId + ":" + id;
    }

    private _cert_accept_succeeded: {[sender: string]:(() => any)} = {};
    post_certificate_accpected(id: string, timeout?: number) : Promise<void> {
        return new Promise((resolve, reject) => {
            const data = id.split(":");
            const timeout_id = setTimeout(() => {
                delete this._cert_accept_succeeded[data[0]];
                clearTimeout(timeout_id);
                reject("timeout");
            }, timeout || 250);
            this._cert_accept_succeeded[data[0]] = () => {
                delete this._cert_accept_succeeded[data[0]];
                clearTimeout(timeout_id);
                resolve();
            };
            this.sendMessage("certificate-accept-callback", {
                request_id: data[1]
            } as CertificateAcceptCallback, data[0]);
        })
    }
}

export interface IPCChannel {
    readonly channelId: string;
    targetClientId?: string;

    messageHandler: (remoteId: string, broadcast: boolean, message: ChannelMessage) => void;
    sendMessage(type: string, message: any, target?: string);
}

class BroadcastChannelIPC extends BasicIPCHandler {
    private static readonly CHANNEL_NAME = "TeaSpeak-Web";

    private channel: BroadcastChannel;

    constructor() {
        super();
    }

    setup() {
        super.setup();

        this.channel = new BroadcastChannel(BroadcastChannelIPC.CHANNEL_NAME);
        this.channel.onmessage = this.onMessage.bind(this);
        this.channel.onmessageerror = this.onError.bind(this);
    }

    private onMessage(event: MessageEvent) {
        if(typeof(event.data) !== "string") {
            logWarn(LogCategory.IPC, tr("Received message with an invalid type (%s): %o"), typeof(event.data), event.data);
            return;
        }

        let message: BroadcastMessage;
        try {
            message = JSON.parse(event.data);
        } catch(error) {
            logError(LogCategory.IPC, tr("Received an invalid encoded message: %o"), event.data);
            return;
        }
        super.handleMessage(message);
    }

    private onError(event: MessageEvent) {
        logWarn(LogCategory.IPC, tr("Received error: %o"), event);
    }

    sendMessage(type: string, data: any, target?: string) {
        const message: BroadcastMessage = {} as any;

        message.sender = this.localUniqueId;
        message.receiver = target ? target : BasicIPCHandler.BROADCAST_UNIQUE_ID;
        message.timestamp = Date.now();
        message.type = type;
        message.data = data;

        if(message.receiver === this.localUniqueId) {
            this.handleMessage(message);
        } else {
            this.channel.postMessage(JSON.stringify(message));
        }
    }
}

let handler: BasicIPCHandler;
let connect_handler: ConnectHandler;

export function setup() {
    if(!supported())
        return;

    if(handler)
        throw "bipc already started";

    handler = new BroadcastChannelIPC();
    handler.setup();

    connect_handler = new ConnectHandler(handler);
    connect_handler.setup();
}

export function getIpcInstance() {
    return handler;
}

export function getInstanceConnectHandler() {
    return connect_handler;
}

export function supported() {
    /* we've a polyfill now */
    return true;

    /* ios does not support this */
    return typeof(window.BroadcastChannel) !== "undefined";
}