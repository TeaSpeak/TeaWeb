import {ChannelMessage, getInstance as getIPCInstance, IPCChannel} from "../../../ipc/BrowserIPC";
import {Settings, SettingsKey} from "../../../settings";
import {
    Controller2PopoutMessages, EventControllerBase,
    PopoutIPCMessage
} from "../../../ui/react-elements/external-modal/IPCMessage";
import {Registry} from "../../../events";

const kSettingIPCChannel: SettingsKey<string> = {
    key: "ipc-channel",
    valueType: "string"
};

let controller: PopoutController;
export function getPopoutController() {
    if(!controller)
        controller = new PopoutController();
    return controller;
}


class PopoutController extends EventControllerBase<"popout"> {
    private userData: any;
    private callbackControllerHello: (accepted: boolean | string) => void;

    constructor() {
        super(new Registry());
        this.ipcRemoteId = Settings.instance.static(Settings.KEY_IPC_REMOTE_ADDRESS, "invalid");

        this.ipcChannel = getIPCInstance().createChannel(this.ipcRemoteId, Settings.instance.static(kSettingIPCChannel, "invalid"));
        this.ipcChannel.messageHandler = this.handleIPCMessage.bind(this);
    }

    getEventRegistry() {
        return this.localEventRegistry;
    }

    async initialize() {
        this.sendIPCMessage("hello-popout", { version: __build.version });

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

    protected handleTypedIPCMessage<T extends Controller2PopoutMessages>(type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(type, payload);

        switch (type) {
            case "hello-controller": {
                const tpayload = payload as PopoutIPCMessage["hello-controller"];
                console.log("Received Hello World from controller. Window instance accpected: %o", tpayload.accepted);
                if(!this.callbackControllerHello)
                    return;

                this.userData = tpayload.userData;
                this.callbackControllerHello(tpayload.accepted ? true : tpayload.message || false);
                break;
            }

            case "fire-event-callback":
            case "fire-event":
                /* handled by out base class */
                break;

            default:
                console.warn("Received unknown message type from controller: %s", type);
                return;
        }
    }

    getUserData() {
        return this.userData;
    }

    doClose() {
        this.sendIPCMessage("invoke-modal-action", { action: "close" });
    }

    doMinimize() {
        this.sendIPCMessage("invoke-modal-action", { action: "minimize" });
    }
}