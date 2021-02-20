import "broadcastchannel-polyfill";
import {LogCategory, logDebug, logError, logTrace, logWarn} from "../log";
import {ConnectHandler} from "../ipc/ConnectHandler";
import {tr} from "tc-shared/i18n/localize";
import {guid} from "tc-shared/crypto/uid";
import {AppParameters} from "tc-shared/settings";

interface IpcRawMessage {
    timestampSend: number,

    sourcePeerId: string,
    targetPeerId: string,

    targetChannelId: string,

    message: ChannelMessage
}

export interface ChannelMessage {
    type: string,
    data: any
}

export abstract class BasicIPCHandler {
    protected static readonly BROADCAST_UNIQUE_ID = "00000000-0000-4000-0000-000000000000";

    protected readonly applicationChannelId: string;
    protected readonly localPeerId: string;

    protected registeredChannels: IPCChannel[] = [];

    protected constructor(applicationChannelId: string) {
        this.applicationChannelId = applicationChannelId;
        this.localPeerId = guid();
    }

    setup() { }

    getApplicationChannelId() : string { return this.applicationChannelId; }

    getLocalPeerId() : string { return this.localPeerId; }

    abstract sendMessage(message: IpcRawMessage);

    protected handleMessage(message: IpcRawMessage) {
        logTrace(LogCategory.IPC, tr("Received message %o"), message);

        if(message.targetPeerId !== this.localPeerId && message.targetPeerId !== BasicIPCHandler.BROADCAST_UNIQUE_ID) {
            /* The message isn't for us */
            return;
        }

        let channelInvokeCount = 0;
        for(const channel of this.registeredChannels) {
            if(channel.channelId !== message.targetChannelId) {
                continue;
            }

            if(typeof channel.targetPeerId === "string" && channel.targetPeerId !== message.sourcePeerId) {
                continue;
            }

            if(channel.messageHandler) {
                channel.messageHandler(message.sourcePeerId, message.targetPeerId === BasicIPCHandler.BROADCAST_UNIQUE_ID, message.message);
            }

            channelInvokeCount++;
        }

        if(!channelInvokeCount) {
            /* Seems like we're not the only web/teaclient instance */
            /* console.warn(tr("Received channel message for unknown channel (%s)"), data.channelId); */
        }
    }

    /**
     * @param channelId
     * @param remotePeerId The peer to receive messages from. If empty messages will be broadcasted
     */
    createChannel(channelId: string, remotePeerId?: string) : IPCChannel {
        let channel: IPCChannel = {
            channelId: channelId,
            targetPeerId: remotePeerId,
            messageHandler: undefined,
            sendMessage: (type: string, data: any, remotePeerId?: string) => {
                if(typeof remotePeerId !== "undefined") {
                    if(typeof channel.targetPeerId === "string" && remotePeerId != channel.targetPeerId) {
                        throw "target id does not match channel target";
                    }
                }

                remotePeerId = remotePeerId || channel.targetPeerId || BasicIPCHandler.BROADCAST_UNIQUE_ID;
                this.sendMessage({
                    timestampSend: Date.now(),

                    sourcePeerId: this.localPeerId,
                    targetPeerId: remotePeerId,

                    targetChannelId: channelId,

                    message: {
                        data,
                        type,
                    }
                });

                if(remotePeerId === this.localPeerId || remotePeerId === BasicIPCHandler.BROADCAST_UNIQUE_ID) {
                    for(const localChannel of this.registeredChannels) {
                        if(localChannel.channelId !== channel.channelId) {
                            continue;
                        }

                        if(typeof localChannel.targetPeerId === "string" && localChannel.targetPeerId !== this.localPeerId) {
                            continue;
                        }

                        if(localChannel === channel) {
                            continue;
                        }

                        if(localChannel.messageHandler) {
                            localChannel.messageHandler(this.localPeerId, remotePeerId === BasicIPCHandler.BROADCAST_UNIQUE_ID, {
                                type: type,
                                data: data,
                            });
                        }
                    }
                }
            }
        };

        this.registeredChannels.push(channel);
        return channel;
    }

    /**
     * Create a channel which only communicates with the TeaSpeak - Core.
     * @param channelId
     */
    createCoreControlChannel(channelId: string) : IPCChannel {
        return this.createChannel(channelId, AppParameters.getValue(AppParameters.KEY_IPC_CORE_PEER_ADDRESS, this.localPeerId));
    }

    channels() : IPCChannel[] { return this.registeredChannels; }

    deleteChannel(channel: IPCChannel) {
        this.registeredChannels.remove(channel);
    }
}

export interface IPCChannel {
    /** Channel id */
    readonly channelId: string;
    /** Target peer id. If set only messages from that process will be processed */
    targetPeerId?: string;

    messageHandler: (sourcePeerId: string, broadcast: boolean, message: ChannelMessage) => void;
    sendMessage(type: string, data: any, remotePeerId?: string);
}

class BroadcastChannelIPC extends BasicIPCHandler {
    private channel: BroadcastChannel;

    constructor(applicationChannelId: string) {
        super(applicationChannelId);
    }

    setup() {
        super.setup();

        this.channel = new BroadcastChannel(this.applicationChannelId);
        this.channel.onmessage = this.onMessage.bind(this);
        this.channel.onmessageerror = this.onError.bind(this);
    }

    private onMessage(event: MessageEvent) {
        if(typeof(event.data) !== "string") {
            logWarn(LogCategory.IPC, tr("Received message with an invalid type (%s): %o"), typeof(event.data), event.data);
            return;
        }

        let message: IpcRawMessage;
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

    sendMessage(message: IpcRawMessage) {
        this.channel.postMessage(JSON.stringify(message));
    }
}

let handlerInstance: BasicIPCHandler;
let connectHandler: ConnectHandler;

export function setupIpcHandler() {
    if(handlerInstance) {
        throw "IPC handler already initialized";
    }

    handlerInstance = new BroadcastChannelIPC(AppParameters.getValue(AppParameters.KEY_IPC_APP_ADDRESS, guid()));
    handlerInstance.setup();
    logDebug(LogCategory.IPC, tr("Application IPC started for %s. Local peer address: %s"), handlerInstance.getApplicationChannelId(), handlerInstance.getLocalPeerId());

    connectHandler = new ConnectHandler(handlerInstance);
    connectHandler.setup();
}

export function getIpcInstance() {
    return handlerInstance;
}

export function getInstanceConnectHandler() {
    return connectHandler;
}