import {IPCChannel} from "../../../ipc/BrowserIPC";

export const kPopoutIPCChannelId = "popout-channel";

export interface PopoutIPCMessage {
    "hello-popout": { version: string, authenticationCode: string },
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
    protected readonly ipcAuthenticationCode: string;
    protected ipcRemotePeerId: string;
    protected ipcChannel: IPCChannel;

    protected constructor(ipcAuthenticationCode: string) {
        this.ipcAuthenticationCode = ipcAuthenticationCode;
    }

    protected sendIPCMessage<T extends SendIPCMessage[Type]>(type: T, payload: PopoutIPCMessage[T]) {
        this.ipcChannel.sendMessage(type, payload, this.ipcRemotePeerId);
    }

    protected handleTypedIPCMessage<T extends ReceivedIPCMessage[Type]>(remoteId: string, isBroadcast: boolean, type: T, payload: PopoutIPCMessage[T]) {

    }

    protected destroyIPC() {
        this.ipcChannel = undefined;
        this.ipcRemotePeerId = undefined;
    }
}