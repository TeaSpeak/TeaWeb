import {getIpcInstance as getIPCInstance} from "../../../ipc/BrowserIPC";
import {AppParameters} from "../../../settings";
import {
    Controller2PopoutMessages,
    EventControllerBase, kPopoutIPCChannelId,
    PopoutIPCMessage,
} from "../../../ui/react-elements/external-modal/IPCMessage";

let controller: PopoutController;
export function getPopoutController() {
    if(!controller) {
        controller = new PopoutController();
    }

    return controller;
}


class PopoutController extends EventControllerBase<"popout"> {
    private constructorArguments: any[];
    private callbackControllerHello: (accepted: boolean | string) => void;

    constructor() {
        super(AppParameters.getValue(AppParameters.KEY_MODAL_IDENTITY_CODE, "invalid"));

        this.ipcChannel = getIPCInstance().createChannel(kPopoutIPCChannelId);
        this.ipcChannel.messageHandler = (sourcePeerId, broadcast, message) => {
            this.handleTypedIPCMessage(sourcePeerId, broadcast, message.type as any, message.data);
        };
    }

    getConstructorArguments() : any[] {
        return this.constructorArguments;
    }

    async initialize() {
        this.sendIPCMessage("hello-popout", { version: __build.version, authenticationCode: this.ipcAuthenticationCode });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.callbackControllerHello = undefined;
                reject("controller haven't called back");
            }, 5000);

            this.callbackControllerHello = result => {
                this.callbackControllerHello = undefined;
                clearTimeout(timeout);
                if(typeof result === "string") {
                    reject(result);
                } else if(!result) {
                    reject();
                } else {
                    resolve();
                }
            };
        });
    }

    protected handleTypedIPCMessage<T extends Controller2PopoutMessages>(remoteId: string, isBroadcast: boolean, type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(remoteId, isBroadcast, type, payload);

        switch (type) {
            case "hello-controller": {
                const tpayload = payload as PopoutIPCMessage["hello-controller"];
                this.ipcRemotePeerId = remoteId;
                console.log("Received Hello World from controller (peer id %s). Window instance accepted: %o", this.ipcRemotePeerId, tpayload.accepted);
                if(!this.callbackControllerHello) {
                    return;
                }

                this.constructorArguments = tpayload.constructorArguments;
                this.callbackControllerHello(tpayload.accepted ? true : tpayload.message || false);
                break;
            }

            default:
                console.warn("Received unknown message type from controller: %s", type);
                return;
        }
    }

    doClose() {
        this.sendIPCMessage("invoke-modal-action", { action: "close" });
    }

    doMinimize() {
        this.sendIPCMessage("invoke-modal-action", { action: "minimize" });
    }
}