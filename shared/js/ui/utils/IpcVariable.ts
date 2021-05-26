import {UiVariableConsumer, UiVariableMap, UiVariableProvider} from "tc-shared/ui/utils/Variable";
import {guid} from "tc-shared/crypto/uid";
import {LogCategory, logWarn} from "tc-shared/log";
import ReactDOM from "react-dom";
import {Settings, settings} from "tc-shared/settings";

/*
 * We need to globally bundle all IPC invoke events since
 * calling setImmediate too often will cause a electron crash with
 * "async hook stack has become corrupted (actual: 88, expected: 0)".
 *
 * WolverinDEV has never experience it by himself but @REDOSS had.
 */
let ipcInvokeCallbacks: (() => void)[];

function registerInvokeCallback(callback: () => void) {
    if(Array.isArray(ipcInvokeCallbacks)) {
        ipcInvokeCallbacks.push(callback);
    } else {
        ipcInvokeCallbacks = [ callback ];
        setImmediate(() => {
            const callbacks = ipcInvokeCallbacks;
            ipcInvokeCallbacks = undefined;
            for(const callback of callbacks) {
                callback();
            }
        });
    }
}

export class IpcUiVariableProvider<Variables extends UiVariableMap> extends UiVariableProvider<Variables> {
    readonly ipcChannelId: string;
    private readonly bundleMaxSize: number;

    private broadcastChannel: BroadcastChannel;
    private enqueuedMessages: any[];

    constructor() {
        super();

        this.bundleMaxSize = settings.getValue(Settings.KEY_IPC_EVENT_BUNDLE_MAX_SIZE);
        this.ipcChannelId = "teaspeak-ipc-vars-" + guid();
        this.broadcastChannel = new BroadcastChannel(this.ipcChannelId);
        this.broadcastChannel.onmessage = event => this.handleIpcMessage(event.data, event.source, event.origin);
    }

    destroy() {
        super.destroy();

        if(this.broadcastChannel) {
            this.broadcastChannel.onmessage = undefined;
            this.broadcastChannel.onmessageerror = undefined;
            this.broadcastChannel.close();
        }

        this.broadcastChannel = undefined;
    }

    protected doSendVariable(variable: string, customData: any, value: any) {
        this.broadcastIpcMessage({
            type: "notify",

            variable,
            customData,
            value
        });
    }

    private handleIpcMessage(message: any, source: MessageEventSource | null, origin: string) {
        if(message.type === "edit") {
            const token = message.token;
            const sendResult = (error?: any) => {
                if(source) {
                    // @ts-ignore
                    source.postMessage({
                        type: "edit-result",
                        token,
                        error
                    });
                } else {
                    this.broadcastIpcMessage({
                        type: "edit-result",
                        token,
                        error
                    });
                }
            }

            try {
                const result = this.doEditVariable(message.variable, message.customData, message.newValue);
                if(result instanceof Promise) {
                    result.then(sendResult)
                        .catch(error => {
                            logWarn(LogCategory.GENERAL, tr("Failed to edit variable %s: %o"), message.variable, error);
                            sendResult(tr("invoke error"));
                        });
                } else {
                    sendResult();
                }
            } catch (error) {
                logWarn(LogCategory.GENERAL, tr("Failed to edit variable %s: %o"), message.variable, error);
                sendResult(tr("invoke error"));
            }
        } else if(message.type === "query") {
            this.sendVariable(message.variable, message.customData, true);
        } else if(message.type === "bundled") {
            for(const bundledMessage of message.messages) {
                this.handleIpcMessage(bundledMessage, source, origin);
            }
        }
    }

    generateConsumerDescription() : IpcVariableDescriptor<Variables> {
        return {
            ipcChannelId: this.ipcChannelId
        };
    }

    /**
     * Send an IPC message.
     * We bundle messages to improve performance when doing a lot of combined requests.
     * @param message IPC message to send
     * @private
     */
    private broadcastIpcMessage(message: any) {
        if(this.bundleMaxSize <= 0) {
            this.broadcastChannel.postMessage(message);
            return;
        }

        if(Array.isArray(this.enqueuedMessages)) {
            this.enqueuedMessages.push(message);
            if(this.enqueuedMessages.length >= this.bundleMaxSize) {
                this.sendEnqueuedMessages();
            }
            return;
        }

        this.enqueuedMessages = [ message ];
        registerInvokeCallback(() => this.sendEnqueuedMessages());
    }

    private sendEnqueuedMessages() {
        if(!this.enqueuedMessages) {
            return;
        }

        this.broadcastChannel.postMessage({
            type: "bundled",
            messages: this.enqueuedMessages
        });
        this.enqueuedMessages = undefined;
    }
}

export type IpcVariableDescriptor<Variables extends UiVariableMap> = {
    readonly ipcChannelId: string
}

let editTokenIndex = 0;

class IpcUiVariableConsumer<Variables extends UiVariableMap> extends UiVariableConsumer<Variables> {
    readonly description: IpcVariableDescriptor<Variables>;
    private readonly bundleMaxSize: number;

    private broadcastChannel: BroadcastChannel;
    private editListener: {[key: string]: { resolve: () => void, reject: (error) => void }};

    private enqueuedMessages: any[];

    constructor(description: IpcVariableDescriptor<Variables>) {
        super();
        this.description = description;
        this.editListener = {};

        this.bundleMaxSize = settings.getValue(Settings.KEY_IPC_EVENT_BUNDLE_MAX_SIZE);
        this.broadcastChannel = new BroadcastChannel(this.description.ipcChannelId);
        this.broadcastChannel.onmessage = event => this.handleIpcMessage(event.data, event.source);
    }

    destroy() {
        super.destroy();

        if(this.broadcastChannel) {
            this.broadcastChannel.onmessage = undefined;
            this.broadcastChannel.onmessageerror = undefined;
            this.broadcastChannel.close();
        }

        this.broadcastChannel = undefined;

        Object.values(this.editListener).forEach(listener => listener.reject(tr("consumer destroyed")));
        this.editListener = {};
    }

    protected doEditVariable(variable: string, customData: any, newValue: any): Promise<void> | void {
        const token = "t" + ++editTokenIndex;

        return new Promise((resolve, reject) => {
            this.sendIpcMessage({
                type: "edit",
                token,
                variable,
                customData,
                newValue
            });

            this.editListener[token] = {
                reject,
                resolve
            }
        });
    }

    protected doRequestVariable(variable: string, customData: any) {
        this.sendIpcMessage({
            type: "query",
            variable,
            customData,
        });
    }

    private handleIpcMessage(message: any, source: MessageEventSource | null) {
        if(message.type === "notify") {
            this.notifyRemoteVariable(message.variable, message.customData, message.value);
        } else if(message.type === "edit-result") {
            const payload = this.editListener[message.token];
            if(!payload) {
                return;
            }
            delete this.editListener[message.token];

            if(typeof message.error !== "undefined") {
                payload.reject(message.error);
            } else {
                payload.resolve();
            }
        } else if(message.type === "bundled") {
            ReactDOM.unstable_batchedUpdates(() => {
                for(const bundledMessage of message.messages) {
                    this.handleIpcMessage(bundledMessage, source);
                }
            });
        }
    }

    /**
     * Send an IPC message.
     * We bundle messages to improve performance when doing a lot of combined requests.
     * The response will most likely also be bundled. This means that we're only updating react once.
     * @param message IPC message to send
     * @private
     */
    private sendIpcMessage(message: any) {
        if(this.bundleMaxSize <= 0) {
            this.broadcastChannel.postMessage(message);
            return;
        }

        if(Array.isArray(this.enqueuedMessages)) {
            this.enqueuedMessages.push(message);
            if(this.enqueuedMessages.length >= this.bundleMaxSize) {
                this.sendEnqueuedMessages();
            }
            return;
        }

        this.enqueuedMessages = [ message ];
        registerInvokeCallback(() => this.sendEnqueuedMessages());
    }

    private sendEnqueuedMessages() {
        if(!this.enqueuedMessages) {
            return;
        }

        this.broadcastChannel.postMessage({
            type: "bundled",
            messages: this.enqueuedMessages
        });
        this.enqueuedMessages = undefined;
    }
}

export function createIpcUiVariableProvider<Variables extends UiVariableMap>() : IpcUiVariableProvider<Variables> {
    return new IpcUiVariableProvider();
}

export function createIpcUiVariableConsumer<Variables extends UiVariableMap>(description: IpcVariableDescriptor<Variables>) : IpcUiVariableConsumer<Variables> {
    return new IpcUiVariableConsumer<Variables>(description);
}