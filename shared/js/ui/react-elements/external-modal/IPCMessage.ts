import {ChannelMessage, IPCChannel} from "../../../ipc/BrowserIPC";
import {EventSender, RegistryMap} from "../../../events";

export interface PopoutIPCMessage {
    "hello-popout": { version: string },
    "hello-controller": { accepted: boolean, message?: string, userData?: any, registries?: string[] },

    "fire-event": {
        type: "sync" | "react" | "later";
        eventType: string;
        payload: any;
        callbackId: string;
        registry: string;
    },

    "fire-event-callback": {
        callbackId: string
    },

    "invoke-modal-action": {
        action: "close" | "minimize"
    }
}

export type Controller2PopoutMessages = "hello-controller" | "fire-event" | "fire-event-callback";
export type Popout2ControllerMessages = "hello-popout" | "fire-event" | "fire-event-callback" | "invoke-modal-action";

export interface SendIPCMessage {
    "controller": Controller2PopoutMessages;
    "popout": Popout2ControllerMessages;
}

export interface ReceivedIPCMessage {
    "controller": Popout2ControllerMessages;
    "popout": Controller2PopoutMessages;
}

let callbackIdIndex = 0;
export abstract class EventControllerBase<Type extends "controller" | "popout"> {
    protected ipcChannel: IPCChannel;
    protected ipcRemoteId: string;

    protected localRegistries: RegistryMap;
    private localEventReceiver: {[key: string]: EventSender};

    private omitEventType: string = undefined;
    private omitEventData: any;
    private eventFiredListeners: {[key: string]:{ callback: () => void, timeout: number }} = {};

    protected constructor() { }

    protected initializeRegistries(registries: RegistryMap) {
        if(typeof this.localRegistries !== "undefined") { throw "event registries have already been initialized" };

        this.localEventReceiver = {};
        this.localRegistries = registries;

        /* FIXME: Modals no longer use RegistryMap instead they should use IPCRegistryDescription */
        /*
        for(const key of Object.keys(this.localRegistries)) {
            this.localEventReceiver[key] = this.createEventReceiver(key);
            this.localRegistries[key].connectAll(this.localEventReceiver[key]);
        }
        */
    }

    private createEventReceiver(key: string) : EventSender {
        let refThis = this;

        const fireEvent = (type: "react" | "later", eventType: any, data?: any[], callback?: () => void) => {
            const callbackId = callback ? (++callbackIdIndex) + "-ev-cb" : undefined;
            refThis.sendIPCMessage("fire-event", { type: type, eventType: eventType, payload: data, callbackId: callbackId, registry: key });
            if(callbackId) {
                const timeout = setTimeout(() => {
                    delete refThis.eventFiredListeners[callbackId];
                    callback();
                }, 2500);

                refThis.eventFiredListeners[callbackId] = {
                    callback: callback,
                    timeout: timeout
                }
            }
        };

        return new class implements EventSender {
            fire<T extends keyof {}>(eventType: T, data?: any[T], overrideTypeKey?: boolean) {
                if(refThis.omitEventType === eventType && refThis.omitEventData === data) {
                    refThis.omitEventType = undefined;
                    return;
                }

                refThis.sendIPCMessage("fire-event", { type: "sync", eventType: eventType, payload: data, callbackId: undefined, registry: key });
            }

            fire_later<T extends keyof { [p: string]: any }>(eventType: T, data?: { [p: string]: any }[T], callback?: () => void) {
                fireEvent("later", eventType, data, callback);
            }

            fire_react<T extends keyof {}>(eventType: T, data?: any[T], callback?: () => void) {
                fireEvent("react", eventType, data, callback);
            }
        };
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(this.ipcRemoteId !== remoteId) {
            console.warn("Received message from unknown end: %s. Expected: %s", remoteId, this.ipcRemoteId);
            return;
        }

        this.handleTypedIPCMessage(message.type as any, message.data);
    }

    protected sendIPCMessage<T extends SendIPCMessage[Type]>(type: T, payload: PopoutIPCMessage[T]) {
        this.ipcChannel.sendMessage(type, payload, this.ipcRemoteId);
    }

    protected handleTypedIPCMessage<T extends ReceivedIPCMessage[Type]>(type: T, payload: PopoutIPCMessage[T]) {
        switch (type) {
            case "fire-event": {
                const tpayload = payload as PopoutIPCMessage["fire-event"];

                /* FIXME: Pay respect to the different event types and may bundle react updates! */
                this.omitEventData = tpayload.payload;
                this.omitEventType = tpayload.eventType;
                this.localRegistries[tpayload.registry].fire(tpayload.eventType, tpayload.payload);
                if(tpayload.callbackId)
                    this.sendIPCMessage("fire-event-callback", { callbackId: tpayload.callbackId });
                break;
            }

            case "fire-event-callback": {
                const tpayload = payload as PopoutIPCMessage["fire-event-callback"];
                const callback = this.eventFiredListeners[tpayload.callbackId];
                delete this.eventFiredListeners[tpayload.callbackId];
                if(callback) {
                    clearTimeout(callback.timeout);
                    callback.callback();
                }
                break;
            }
        }
    }

    protected destroyIPC() {
        /* FIXME: See above */
        //Object.keys(this.localRegistries).forEach(key => this.localRegistries[key].disconnectAll(this.localEventReceiver[key]));
        this.ipcChannel = undefined;
        this.ipcRemoteId = undefined;
        this.eventFiredListeners = {};
    }
}