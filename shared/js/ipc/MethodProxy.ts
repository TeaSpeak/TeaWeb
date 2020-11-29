import * as log from "../log";
import {LogCategory} from "../log";
import {BasicIPCHandler, IPCChannel, ChannelMessage} from "../ipc/BrowserIPC";
import {guid} from "../crypto/uid";
import { tr } from "tc-shared/i18n/localize";

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
    private _ipc_channel: IPCChannel;
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
                this._ipc_channel = this.ipc_handler.createChannel(this._ipc_parameters.client_id, this._ipc_parameters.channel_id);
            else
                this._ipc_channel = this.ipc_handler.createChannel();

            this._ipc_channel.messageHandler = this._handle_message.bind(this);
            if(this._slave)
                this._ipc_channel.sendMessage("initialize", {});
        }
    }

    protected finalize() {
        if(!this._local) {
            if(this._connected)
                this._ipc_channel.sendMessage("finalize", {});

            this.ipc_handler.deleteChannel(this._ipc_channel);
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
                    promise_id: guid()
                } as MethodProxyCallback;
                this._proxied_callbacks[proxy_callback.promise_id] = proxy_callback;
                proxy_callback.promise = new Promise((resolve, reject) => {
                    proxy_callback.resolve = resolve;
                    proxy_callback.reject = reject;
                });

                this._ipc_channel.sendMessage("invoke", {
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
        if(!this._ipc_channel.targetClientId) {
            if(this._slave)
                throw "initialize wrong state!";

            this._ipc_channel.targetClientId = remote_id; /* now we're able to send messages */
            this.on_connected();
            this._ipc_channel.sendMessage("initialize", true);
        } else {
            if(!this._slave)
                throw "initialize wrong state!";

            this.on_connected();
        }
        this._connected = true;
    }

    private _send_result(promise_id: string, success: boolean, message: any) {
        this._ipc_channel.sendMessage("result", {
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
            channel_id: this._ipc_channel.channelId,
            client_id: this.ipc_handler.getLocalAddress()
        };
    }

    is_slave() { return this._local || this._slave; } /* the popout modal */
    is_master() { return this._local || !this._slave; } /* the host (teaweb application) */

    protected abstract on_connected();
    protected abstract on_disconnected();
}