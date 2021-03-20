import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {
    ModalIPCController2Renderer,
    ModalIPCRenderer2ControllerMessages
} from "../Definitions";
import {LogCategory, logDebug, logWarn} from "tc-shared/log";

export type ModalInstanceInitializeResult = {
    status: "success",

    modalId: string,
    modalType: string,
    constructorArguments: any[],
} | {
    status: "timeout"
} | {
    status: "rejected",
    message: string
};

export class ModalWindowControllerInstance {
    private readonly ipcMessageHandler: { [key: string]: (sourcePeerId: string,  message: any) => void };
    private ipcRemotePeerId: string;
    private ipcChannel: IPCChannel;

    constructor(modalChannelId: string) {
        this.ipcMessageHandler = {};
        this.ipcChannel = getIpcInstance().createCoreControlChannel(modalChannelId);
        this.ipcChannel.messageHandler = (sourcePeerId, broadcast, message) => {
            if(this.ipcRemotePeerId && sourcePeerId !== this.ipcRemotePeerId) {
                return;
            }

            if(typeof this.ipcMessageHandler[message.type] !== "function") {
                logWarn(LogCategory.IPC, tr("Received remote controller message but we don't know how to handle the message (%s)."), message.type);
                return;
            }

            this.ipcMessageHandler[message.type](sourcePeerId, message.data);
        };

        this.registerIpcMessageHandler("invalidate-modal-instance", () => {
            logWarn(LogCategory.IPC, tr("This modal instance has been invalidated."));
            /* TODO: Show so on the screen. */
        });
    }

    async initialize() : Promise<ModalInstanceInitializeResult> {
        this.sendIpcMessage("hello-renderer", {
            version: __build.version
        });

        let controllerResult: ModalIPCController2Renderer["hello-controller"];
        try {
            controllerResult = await new Promise((resolve, reject) => {
                this.registerIpcMessageHandler("hello-controller", (sourcePeerId, message) => {
                    logDebug(LogCategory.IPC, tr("Found remote controller peer id: %s"), sourcePeerId);
                    this.ipcRemotePeerId = sourcePeerId;
                    resolve(message);
                });

                setTimeout(reject, 15000);
            });
        } catch (_) {
            return { status: "timeout" };
        }

        if(controllerResult.accepted === true) {
            return {
                status: "success",

                modalId: controllerResult.modalId,
                modalType: controllerResult.modalType,
                constructorArguments: controllerResult.constructorArguments
            };
        } else {
            return {
                status: "rejected",
                message: controllerResult.message
            };
        }
    }

    triggerModalAction(modalId: string, action: "minimize" | "close") {
        this.sendIpcMessage("invoke-modal-action", {
            modalId: modalId,
            action: action
        });
    }

    private registerIpcMessageHandler<T extends keyof ModalIPCController2Renderer>(
        type: T,
        handler: (sourcePeerId: string, message: ModalIPCController2Renderer[T]) => void
    ) {
        this.ipcMessageHandler[type] = handler;
    }

    private sendIpcMessage<T extends keyof ModalIPCRenderer2ControllerMessages>(type: T, message: ModalIPCRenderer2ControllerMessages[T]) {
        if(!this.ipcRemotePeerId && type !== "hello-renderer") {
            logWarn(LogCategory.IPC, tr("Tried to send a controller message but we don't know the controllers peer address."));
            return;
        }

        this.ipcChannel.sendMessage(type, message, this.ipcRemotePeerId);
    }
}