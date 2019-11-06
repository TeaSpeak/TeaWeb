interface Window {
    BroadcastChannel: BroadcastChannel;
}

namespace bipc {
    export interface BroadcastMessage {
        timestamp: number;
        receiver: string;
        sender: string;

        type: string;
        data: any;
    }

    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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

        protected _channels: Channel[] = [];
        protected unique_id;

        protected constructor() { }

        setup() {
            this.unique_id = uuidv4(); /* lets get an unique identifier */
        }

        get_local_address() { return this.unique_id; }

        abstract send_message(type: string, data: any, target?: string);

        protected handle_message(message: BroadcastMessage) {
            //log.trace(LogCategory.IPC, tr("Received message %o"), message);

            if(message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID) {
                if(message.type == "process-query") {
                    log.debug(LogCategory.IPC, tr("Received a device query from %s."), message.sender);
                    this.send_message("process-query-response", {
                        request_query_id: (<ProcessQuery>message.data).query_id,
                        request_timestamp: (<ProcessQuery>message.data).timestamp,

                        device_id: this.unique_id,
                        protocol: BasicIPCHandler.PROTOCOL_VERSION
                    } as ProcessQueryResponse, message.sender);
                    return;
                }
            } else if(message.receiver === this.unique_id) {
                if(message.type == "process-query-response") {
                    const response: ProcessQueryResponse = message.data;
                    if(this._query_results[response.request_query_id])
                        this._query_results[response.request_query_id].push(response);
                    else {
                        log.warn(LogCategory.IPC, tr("Received a query response for an unknown request."));
                    }
                    return;
                }
                else if(message.type == "certificate-accept-callback") {
                    const data: CertificateAcceptCallback = message.data;
                    if(!this._cert_accept_callbacks[data.request_id]) {
                        log.warn(LogCategory.IPC, tr("Received certificate accept callback for an unknown request ID."));
                        return;
                    }
                    this._cert_accept_callbacks[data.request_id]();
                    delete this._cert_accept_callbacks[data.request_id];

                    this.send_message("certificate-accept-succeeded", {

                    } as CertificateAcceptSucceeded, message.sender);
                    return;
                }
                else if(message.type == "certificate-accept-succeeded") {
                    if(!this._cert_accept_succeeded[message.sender]) {
                        log.warn(LogCategory.IPC, tr("Received certificate accept succeeded, but haven't a callback."));
                        return;
                    }
                    this._cert_accept_succeeded[message.sender]();
                    return;
                }
            }
            if(message.type === "channel") {
                const data: ChannelMessage = message.data;

                let channel_invoked = false;
                for(const channel of this._channels)
                    if(channel.channel_id === data.channel_id && (typeof(channel.target_id) === "undefined" || channel.target_id === message.sender)) {
                        if(channel.message_handler)
                            channel.message_handler(message.sender, message.receiver === BasicIPCHandler.BROADCAST_UNIQUE_ID, data);
                        channel_invoked = true;
                    }
                if(!channel_invoked) {
                    console.warn(tr("Received channel message for unknown channel (%s)"), data.channel_id);
                }
            }
        }

        create_channel(target_id?: string, channel_id?: string) {
            let channel: Channel = {
                target_id: target_id,
                channel_id: channel_id || uuidv4(),
                message_handler: undefined,
                send_message: (type: string, data: any, target?: string) => {
                    if(typeof target !== "undefined") {
                        if(typeof channel.target_id === "string" && target != channel.target_id)
                            throw "target id does not match channel target";
                    }

                    this.send_message("channel", {
                        type: type,
                        data: data,
                        channel_id: channel.channel_id
                    } as ChannelMessage, target || channel.target_id || BasicIPCHandler.BROADCAST_UNIQUE_ID);
                }
            };

            this._channels.push(channel);
            return channel;
        }

        channels() : Channel[] { return this._channels; }

        delete_channel(channel: Channel) {
            this._channels = this._channels.filter(e => e !== channel);
        }

        private _query_results: {[key: string]:ProcessQueryResponse[]} = {};
        async query_processes(timeout?: number) : Promise<ProcessQueryResponse[]> {
            const query_id = uuidv4();
            this._query_results[query_id] = [];

            this.send_message("process-query", {
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
            return this.unique_id + ":" + id;
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
                this.send_message("certificate-accept-callback", {
                    request_id: data[1]
                } as CertificateAcceptCallback, data[0]);
            })
        }
    }

    export interface Channel {
        readonly channel_id: string;
        target_id?: string;

        message_handler: (remote_id: string, broadcast: boolean, message: ChannelMessage) => any;
        send_message(type: string, message: any, target?: string);
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
            this.channel.onmessage = this.on_message.bind(this);
            this.channel.onmessageerror = this.on_error.bind(this);
        }

        private on_message(event: MessageEvent) {
            if(typeof(event.data) !== "string") {
                log.warn(LogCategory.IPC, tr("Received message with an invalid type (%s): %o"), typeof(event.data), event.data);
                return;
            }

            let message: BroadcastMessage;
            try {
                message = JSON.parse(event.data);
            } catch(error) {
                log.error(LogCategory.IPC, tr("Received an invalid encoded message: %o"), event.data);
                return;
            }
            super.handle_message(message);
        }

        private on_error(event: MessageEvent) {
            log.warn(LogCategory.IPC, tr("Received error: %o"), event);
        }

        send_message(type: string, data: any, target?: string) {
            const message: BroadcastMessage = {} as any;

            message.sender = this.unique_id;
            message.receiver = target ? target : BasicIPCHandler.BROADCAST_UNIQUE_ID;
            message.timestamp = Date.now();
            message.type = type;
            message.data = data;

            this.channel.postMessage(JSON.stringify(message));
        }
    }

    export namespace connect {
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
            private ipc_channel: Channel;

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
                this.ipc_channel = this.ipc_handler.create_channel(undefined, ConnectHandler.CHANNEL_NAME);
                this.ipc_channel.message_handler = this.on_message.bind(this);
            }

            private on_message(sender: string, broadcast: boolean, message: ChannelMessage) {
                if(broadcast) {
                    if(message.type == "offer") {
                        const data = message.data as ConnectOffer;

                        const response = {
                            accepted: this.callback_available(data.data),
                            request_id: data.request_id
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
                        this.ipc_channel.send_message("offer-answer", response, sender);
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
                            this.ipc_channel.send_message("execute", {
                                request_id: request.id
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
                            request_id: data.request_id,

                            succeeded: typeof(cr) !== "string" && cr,
                            message: typeof(cr) === "string" ? cr : "",
                        } as ConnectExecuted;
                        this.ipc_channel.send_message("executed", response, request.remote_handler);
                    }
                }
            }

            post_connect_request(data: ConnectRequestData, callback_avail: () => Promise<boolean>) : Promise<void> {
                return new Promise<void>((resolve, reject) => {
                    const pd = {
                        data: data,
                        id: uuidv4(),
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

                    this.ipc_channel.send_message("offer", {
                        request_id: pd.id,
                        data: pd.data
                    } as ConnectOffer);
                    pd.timeout = setTimeout(() => {
                        pd.callback_failed("received no response to offer");
                    }, 50) as any;
                })
            }
        }
    }

    export namespace mproxy {
        export interface MethodProxyInvokeData {
            method_name: string;
            arguments: any[];
            promise_id: string;
        }
        export interface MethodProxyResultData {
            promise_id: string;
            result: any;
            success: boolean;
        }
        export interface MethodProxyCallback {
            promise: Promise<any>;
            promise_id: string;

            resolve: (object: any) => any;
            reject: (object: any) => any;
        }

        export type MethodProxyConnectParameters = {
            channel_id: string;
            client_id: string;
        }
        export abstract class MethodProxy {
            readonly ipc_handler: BasicIPCHandler;
            private _ipc_channel: Channel;
            private _ipc_parameters: MethodProxyConnectParameters;

            private readonly _local: boolean;
            private readonly _slave: boolean;

            private _connected: boolean;
            private _proxied_methods: {[key: string]:() => Promise<any>} = {};
            private _proxied_callbacks: {[key: string]:MethodProxyCallback} = {};

            protected constructor(ipc_handler: BasicIPCHandler, connect_params?: MethodProxyConnectParameters) {
                this.ipc_handler = ipc_handler;
                this._ipc_parameters = connect_params;
                this._connected = false;
                this._slave = typeof(connect_params) !== "undefined";
                this._local = typeof(connect_params) !== "undefined" && connect_params.channel_id === "local" && connect_params.client_id === "local";
            }

            protected setup() {
                if(this._local) {
                    this._connected = true;
                    this.on_connected();
                } else {
                    if(this._slave)
                        this._ipc_channel = this.ipc_handler.create_channel(this._ipc_parameters.client_id, this._ipc_parameters.channel_id);
                    else
                        this._ipc_channel = this.ipc_handler.create_channel();

                    this._ipc_channel.message_handler = this._handle_message.bind(this);
                    if(this._slave)
                        this._ipc_channel.send_message("initialize", {});
                }
            }

            protected finalize() {
                if(!this._local) {
                    if(this._connected)
                        this._ipc_channel.send_message("finalize", {});

                    this.ipc_handler.delete_channel(this._ipc_channel);
                    this._ipc_channel = undefined;
                }
                for(const promise of Object.values(this._proxied_callbacks))
                    promise.reject("disconnected");
                this._proxied_callbacks = {};

                this._connected = false;
                this.on_disconnected();
            }

            protected register_method<R>(method: (...args: any[]) => Promise<R> | string) {
                let method_name: string;
                if(typeof method === "function") {
                    log.debug(LogCategory.IPC, tr("Registering method proxy for %s"), method.name);
                    method_name = method.name;
                } else {
                    log.debug(LogCategory.IPC, tr("Registering method proxy for %s"), method);
                    method_name = method;
                }

                if(!this[method_name])
                    throw "method is missing in current object";

                this._proxied_methods[method_name] = this[method_name];
                if(!this._local) {
                    this[method_name] = (...args: any[]) => {
                        if(!this._connected)
                            return Promise.reject("not connected");

                        const proxy_callback = {
                            promise_id: uuidv4()
                        } as MethodProxyCallback;
                        this._proxied_callbacks[proxy_callback.promise_id] = proxy_callback;
                        proxy_callback.promise = new Promise((resolve, reject) => {
                            proxy_callback.resolve = resolve;
                            proxy_callback.reject = reject;
                        });

                        this._ipc_channel.send_message("invoke", {
                            promise_id: proxy_callback.promise_id,
                            arguments: [...args],
                            method_name: method_name
                        } as MethodProxyInvokeData);
                        return proxy_callback.promise;
                    }
                }
            }

            private _handle_message(remote_id: string, boradcast: boolean, message: ChannelMessage) {
                if(message.type === "finalize") {
                    this._handle_finalize();
                } else if(message.type === "initialize") {
                    this._handle_remote_callback(remote_id);
                } else if(message.type === "invoke") {
                    this._handle_invoke(message.data);
                } else if(message.type === "result") {
                    this._handle_result(message.data);
                }
            }

            private _handle_finalize() {
                this.on_disconnected();
                this.finalize();
                this._connected = false;
            }

            private _handle_remote_callback(remote_id: string) {
                if(!this._ipc_channel.target_id) {
                    if(this._slave)
                        throw "initialize wrong state!";

                    this._ipc_channel.target_id = remote_id; /* now we're able to send messages */
                    this.on_connected();
                    this._ipc_channel.send_message("initialize", true);
                } else {
                    if(!this._slave)
                        throw "initialize wrong state!";

                    this.on_connected();
                }
                this._connected = true;
            }

            private _send_result(promise_id: string, success: boolean, message: any) {
                this._ipc_channel.send_message("result", {
                    promise_id: promise_id,
                    result: message,
                    success: success
                } as MethodProxyResultData);
            }

            private _handle_invoke(data: MethodProxyInvokeData) {
                if(this._proxied_methods[data.method_name])
                    throw "we could not invoke a local proxied method!";

                if(!this[data.method_name]) {
                    this._send_result(data.promise_id, false, "missing method");
                    return;
                }

                try {
                    log.info(LogCategory.IPC, tr("Invoking method %s with arguments: %o"), data.method_name, data.arguments);

                    const promise = this[data.method_name](...data.arguments);
                    promise.then(result => {
                        log.info(LogCategory.IPC, tr("Result: %o"), result);
                        this._send_result(data.promise_id, true, result);
                    }).catch(error => {
                        this._send_result(data.promise_id, false, error);
                    });
                } catch(error) {
                    this._send_result(data.promise_id, false, error);
                    return;
                }
            }

            private _handle_result(data: MethodProxyResultData) {
                if(!this._proxied_callbacks[data.promise_id]) {
                    console.warn(tr("Received proxy method result for unknown promise"));
                    return;
                }
                const callback = this._proxied_callbacks[data.promise_id];
                delete this._proxied_callbacks[data.promise_id];

                if(data.success)
                    callback.resolve(data.result);
                else
                    callback.reject(data.result);
            }

            generate_connect_parameters() : MethodProxyConnectParameters {
                if(this._slave)
                    throw "only masters can generate connect parameters!";
                if(!this._ipc_channel)
                    throw "please call setup() before";

                return {
                    channel_id: this._ipc_channel.channel_id,
                    client_id: this.ipc_handler.get_local_address()
                };
            }

            is_slave() { return this._local || this._slave; } /* the popout modal */
            is_master() { return this._local || !this._slave; } /* the host (teaweb application) */

            protected abstract on_connected();
            protected abstract on_disconnected();
        }
    }

    let handler: BasicIPCHandler;
    let connect_handler: connect.ConnectHandler;

    export function setup() {
        if(!supported())
            return;

        handler = new BroadcastChannelIPC();
        handler.setup();

        connect_handler = new connect.ConnectHandler(handler);
        connect_handler.setup();
    }

    export function get_handler() {
        return handler;
    }

    export function get_connect_handler() {
        return connect_handler;
    }

    export function supported() {
        /* ios does not support this */
        return typeof(window.BroadcastChannel) !== "undefined";
    }
}