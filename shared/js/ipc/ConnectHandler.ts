import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {BasicIPCHandler, IPCChannel, ChannelMessage} from "tc-shared/ipc/BrowserIPC";
import {guid} from "tc-shared/crypto/uid";

export type ConnectRequestData = {
    address: string;

    profile?: string;
    username?: string;
    password?: {
        value: string;
        hashed: boolean;
    };
}

export interface ConnectOffer {
    request_id: string;
    data: ConnectRequestData;
}

export interface ConnectOfferAnswer {
    request_id: string;
    accepted: boolean;
}

export interface ConnectExecute {
    request_id: string;
}

export interface ConnectExecuted {
    request_id: string;
    succeeded: boolean;
    message?: string;
}

/* The connect process:
 *  1. Broadcast an offer
 *  2. Wait 50ms for all offer responses or until the first one respond with "ok"
 *  3. Select (if possible) on accepted offer and execute the connect
 */
export class ConnectHandler {
    private static readonly CHANNEL_NAME = "connect";

    readonly ipc_handler: BasicIPCHandler;
    private ipc_channel: IPCChannel;

    public callback_available: (data: ConnectRequestData) => boolean = () => false;
    public callback_execute: (data: ConnectRequestData) => boolean | string = () => false;


    private _pending_connect_offers: {
        id: string;
        data: ConnectRequestData;
        timeout: number;

        remote_handler: string;
    }[] = [];

    private _pending_connects_requests: {
        id: string;

        data: ConnectRequestData;
        timeout: number;

        callback_success: () => any;
        callback_failed: (message: string) => any;
        callback_avail: () => Promise<boolean>;

        remote_handler?: string;
    }[] = [];

    constructor(ipc_handler: BasicIPCHandler) {
        this.ipc_handler = ipc_handler;
    }

    public setup() {
        this.ipc_channel = this.ipc_handler.createChannel(undefined, ConnectHandler.CHANNEL_NAME);
        this.ipc_channel.messageHandler = this.onMessage.bind(this);
    }

    private onMessage(sender: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast) {
            if(message.type == "offer") {
                const data = message.data as ConnectOffer;

                const response = {
                    accepted: this.callback_available(data.data),
                    currentRequestId: data.request_id
                } as ConnectOfferAnswer;

                if(response.accepted) {
                    log.debug(LogCategory.IPC, tr("Received new connect offer from %s: %s"), sender, data.request_id);

                    const ld = {
                        remote_handler: sender,
                        data: data.data,
                        id: data.request_id,
                        timeout: 0
                    };
                    this._pending_connect_offers.push(ld);
                    ld.timeout = setTimeout(() => {
                        log.debug(LogCategory.IPC, tr("Dropping connect request %s, because we never received an execute."), ld.id);
                        this._pending_connect_offers.remove(ld);
                    }, 120 * 1000) as any;
                }
                this.ipc_channel.sendMessage("offer-answer", response, sender);
            }
        } else {
            if(message.type == "offer-answer") {
                const data = message.data as ConnectOfferAnswer;
                const request = this._pending_connects_requests.find(e => e.id === data.request_id);
                if(!request) {
                    log.warn(LogCategory.IPC, tr("Received connect offer answer with unknown request id (%s)."), data.request_id);
                    return;
                }
                if(!data.accepted) {
                    log.debug(LogCategory.IPC, tr("Client %s rejected the connect offer (%s)."), sender, request.id);
                    return;
                }
                if(request.remote_handler) {
                    log.debug(LogCategory.IPC, tr("Client %s accepted the connect offer (%s), but offer has already been accepted."), sender, request.id);
                    return;
                }

                log.debug(LogCategory.IPC, tr("Client %s accepted the connect offer (%s). Request local acceptance."), sender, request.id);
                request.remote_handler = sender;
                clearTimeout(request.timeout);

                request.callback_avail().then(flag => {
                    if(!flag) {
                        request.callback_failed("local avail rejected");
                        return;
                    }

                    log.debug(LogCategory.IPC, tr("Executing connect with client %s"), request.remote_handler);
                    this.ipc_channel.sendMessage("execute", {
                        currentRequestId: request.id
                    } as ConnectExecute, request.remote_handler);
                    request.timeout = setTimeout(() => {
                        request.callback_failed("connect execute timeout");
                    }, 1000) as any;
                }).catch(error => {
                    log.error(LogCategory.IPC, tr("Local avail callback caused an error: %o"), error);
                    request.callback_failed(tr("local avail callback caused an error"));
                });

            }
            else if(message.type == "executed") {
                const data = message.data as ConnectExecuted;
                const request = this._pending_connects_requests.find(e => e.id === data.request_id);
                if(!request) {
                    log.warn(LogCategory.IPC, tr("Received connect executed with unknown request id (%s)."), data.request_id);
                    return;
                }

                if(request.remote_handler != sender) {
                    log.warn(LogCategory.IPC, tr("Received connect executed for request %s, but from wrong client: %s (expected %s)"), data.request_id, sender, request.remote_handler);
                    return;
                }

                log.debug(LogCategory.IPC, tr("Received connect executed response from client %s for request %s. Succeeded: %o (%s)"), sender, data.request_id, data.succeeded, data.message);
                clearTimeout(request.timeout);
                if(data.succeeded)
                    request.callback_success();
                else
                    request.callback_failed(data.message);
            }
            else if(message.type == "execute") {
                const data = message.data as ConnectExecute;
                const request = this._pending_connect_offers.find(e => e.id === data.request_id);
                if(!request) {
                    log.warn(LogCategory.IPC, tr("Received connect execute with unknown request id (%s)."), data.request_id);
                    return;
                }

                if(request.remote_handler != sender) {
                    log.warn(LogCategory.IPC, tr("Received connect execute for request %s, but from wrong client: %s (expected %s)"), data.request_id, sender, request.remote_handler);
                    return;
                }
                clearTimeout(request.timeout);
                this._pending_connect_offers.remove(request);

                log.debug(LogCategory.IPC, tr("Executing connect for %s"), data.request_id);
                const cr = this.callback_execute(request.data);

                const response = {
                    currentRequestId: data.request_id,

                    succeeded: typeof(cr) !== "string" && cr,
                    message: typeof(cr) === "string" ? cr : "",
                } as ConnectExecuted;
                this.ipc_channel.sendMessage("executed", response, request.remote_handler);
            }
        }
    }

    post_connect_request(data: ConnectRequestData, callback_avail: () => Promise<boolean>) : Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const pd = {
                data: data,
                id: guid(),
                timeout: 0,

                callback_success: () => {
                    this._pending_connects_requests.remove(pd);
                    clearTimeout(pd.timeout);
                    resolve();
                },

                callback_failed: error => {
                    this._pending_connects_requests.remove(pd);
                    clearTimeout(pd.timeout);
                    reject(error);
                },

                callback_avail: callback_avail,
            };
            this._pending_connects_requests.push(pd);

            this.ipc_channel.sendMessage("offer", {
                currentRequestId: pd.id,
                data: pd.data
            } as ConnectOffer);
            pd.timeout = setTimeout(() => {
                pd.callback_failed("received no response to offer");
            }, 50) as any;
        })
    }
}