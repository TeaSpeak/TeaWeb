//Used by CertAccept popup

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
        key: string;
        message: any;
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
            log.trace(LogCategory.IPC, tr("Received message %o"), message);

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
                } else if(message.type == "certificate-accept-callback") {
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
                } else if(message.type == "certificate-accept-succeeded") {
                    if(!this._cert_accept_succeeded[message.sender]) {
                        log.warn(LogCategory.IPC, tr("Received certificate accept succeeded, but haven't a callback."));
                        return;
                    }
                    this._cert_accept_succeeded[message.sender]();
                    return;
                } else if(message.type === "channel") {
                    const data: ChannelMessage = message.data;

                    let channel_invoked = false;
                    for(const channel of this._channels)
                        if(channel.channel_id === data.channel_id && (typeof(channel.target_id) === "undefined" || channel.target_id === message.sender)) {
                            if(channel.message_handler)
                                channel.message_handler(message.sender, data);
                            channel_invoked = true;
                        }
                    if(!channel_invoked) {
                        console.warn(tr("Received channel message for unknown channel (%s)"), data.channel_id);
                    }
                }
            }
        }

        create_channel(target_id?: string, channel_id?: string) {
            let channel: Channel = {
                target_id: target_id,
                channel_id: channel_id || uuidv4(),
                message_handler: undefined,
                send_message: (key: string, message: any) => {
                    if(!channel.target_id)
                        throw "channel has no target!";

                    this.send_message("channel", {
                        key: key,
                        message: message,
                        channel_id: channel.channel_id
                    } as ChannelMessage, channel.target_id)
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

        message_handler: (remote_id: string, message: ChannelMessage) => any;
        send_message(key: string, message: any);
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

        private _handle_message(remote_id: string, message: ChannelMessage) {
            if(message.key === "finalize") {
                this._handle_finalize();
            } else if(message.key === "initialize") {
                this._handle_remote_callback(remote_id);
            } else if(message.key === "invoke") {
                this._handle_invoke(message.message);
            } else if(message.key === "result") {
                this._handle_result(message.message);
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

    let handler: BasicIPCHandler;
    export function setup() {
        if(!supported())
            return;
        /* TODO: test for support */
        handler = new BroadcastChannelIPC();
        handler.setup();
    }

    export function get_handler() {
        return handler;
    }

    export function supported() {
        /* ios does not support this */
        return typeof(window.BroadcastChannel) !== "undefined";
    }
}