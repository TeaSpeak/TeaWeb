import {UiVariableConsumer, UiVariableMap, UiVariableProvider} from "tc-shared/ui/utils/Variable";
import {guid} from "tc-shared/crypto/uid";
import {LogCategory, logWarn} from "tc-shared/log";

export class IpcUiVariableProvider<Variables extends UiVariableMap> extends UiVariableProvider<Variables> {
    readonly ipcChannelId: string;
    private broadcastChannel: BroadcastChannel;

    constructor() {
        super();

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
        this.broadcastChannel.postMessage({
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
                    this.broadcastChannel.postMessage({
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
        }
    }

    generateConsumerDescription() : IpcVariableDescriptor<Variables> {
        return {
            ipcChannelId: this.ipcChannelId
        };
    }
}

export type IpcVariableDescriptor<Variables extends UiVariableMap> = {
    readonly ipcChannelId: string
}

let editTokenIndex = 0;
class IpcUiVariableConsumer<Variables extends UiVariableMap> extends UiVariableConsumer<Variables> {
    readonly description: IpcVariableDescriptor<Variables>;
    private broadcastChannel: BroadcastChannel;
    private editListener: {[key: string]: { resolve: () => void, reject: (error) => void }};

    constructor(description: IpcVariableDescriptor<Variables>) {
        super();
        this.description = description;
        this.editListener = {};

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
            this.broadcastChannel.postMessage({
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
        this.broadcastChannel.postMessage({
            type: "query",
            variable,
            customData,
        });
    }

    private handleIpcMessage(message: any, _source: MessageEventSource | null) {
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
        }
    }
}

export function createIpcUiVariableProvider<Variables extends UiVariableMap>() : IpcUiVariableProvider<Variables> {
    return new IpcUiVariableProvider();
}

export function createIpcUiVariableConsumer<Variables extends UiVariableMap>(description: IpcVariableDescriptor<Variables>) : IpcUiVariableConsumer<Variables> {
    return new IpcUiVariableConsumer<Variables>(description);
}