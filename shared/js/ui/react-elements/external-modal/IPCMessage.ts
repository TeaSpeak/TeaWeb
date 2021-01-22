import {ChannelMessage, IPCChannel} from "../../../ipc/BrowserIPC";

export interface PopoutIPCMessage {
    "hello-popout": { version: string },
    "hello-controller": { accepted: boolean, message?: string, constructorArguments?: any[] },
    "invoke-modal-action": {
        action: "close" | "minimize"
    }
}

export type Controller2PopoutMessages = "hello-controller";
export type Popout2ControllerMessages = "hello-popout" | "invoke-modal-action";

export interface SendIPCMessage {
    "controller": Controller2PopoutMessages;
    "popout": Popout2ControllerMessages;
}

export interface ReceivedIPCMessage {
    "controller": Popout2ControllerMessages;
    "popout": Controller2PopoutMessages;
}

export abstract class EventControllerBase<Type extends "controller" | "popout"> {
    protected ipcChannel: IPCChannel;
    protected ipcRemoteId: string;

    protected constructor() { }

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

    protected handleTypedIPCMessage<T extends ReceivedIPCMessage[Type]>(type: T, payload: PopoutIPCMessage[T]) {}

    protected destroyIPC() {
        this.ipcChannel = undefined;
        this.ipcRemoteId = undefined;
    }
}