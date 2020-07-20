import * as ipc from "tc-shared/ipc/BrowserIPC";
import {ChannelMessage, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {Registry} from "tc-shared/events";
import {
    EventControllerBase,
    Popout2ControllerMessages,
    PopoutIPCMessage
} from "tc-shared/ui/react-elements/external-modal/IPCMessage";

export class ExternalModalController extends EventControllerBase<"controller"> {
    readonly modal: string;
    readonly userData: any;

    private currentWindow: Window;
    private callbackWindowInitialized: (error?: string) => void;

    private documentQuitListener: () => void;

    constructor(modal: string, localEventRegistry: Registry<any>, userData: any) {
        super(localEventRegistry);

        this.modal = modal;
        this.userData = userData;

        this.ipcChannel = ipc.getInstance().createChannel();
        this.ipcChannel.messageHandler = this.handleIPCMessage.bind(this);

        this.documentQuitListener = () => this.currentWindow?.close();
    }

    private trySpawnWindow() {
        const parameters = {
            "loader-target": "manifest",
            "chunk": "modal-external",
            "modal-target": this.modal,
            "ipc-channel": this.ipcChannel.channelId,
            "ipc-address": ipc.getInstance().getLocalAddress(),
            "disableGlobalContextMenu": __build.mode === "debug" ? 1 : 0,
            "loader-abort": __build.mode === "debug" ? 1 : 0,
        };

        const features = {
            /*
            status: "no",
            location: "no",
            toolbar: "no",
            menubar: "no",
            width: 600,
            height: 400
            */
        };

        let baseUrl = location.origin + location.pathname + "?";
        return window.open(
            baseUrl + Object.keys(parameters).map(e => e + "=" + encodeURIComponent(parameters[e])).join("&"),
            "External Modal",
            Object.keys(features).map(e => e + "=" + features[e]).join(",")
        );
    }

    async open() {
        this.currentWindow = this.trySpawnWindow();
        if(!this.currentWindow) {
            await new Promise((resolve, reject) => {
                spawnYesNo(tr("Would you like to open the popup?"), tra("Would you like to open popup {}?", this.modal), callback => {
                    if(!callback) {
                        reject("user aborted");
                        return;
                    }

                    this.currentWindow = this.trySpawnWindow();
                    if(this.currentWindow) {
                        reject("Failed to spawn window");
                    } else {
                        resolve();
                    }
                }).close_listener.push(() => reject("user aborted"));
            })
        }

        if(!this.currentWindow) {
            /* some shitty popup blocker or whatever */
            throw "failed to create window";
        }

        this.currentWindow.onclose = () => {
            /* TODO: General handle */
            window.removeEventListener("beforeunload", this.documentQuitListener);
        };
        window.addEventListener("beforeunload", this.documentQuitListener);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.callbackWindowInitialized = undefined;
                reject("window haven't called back");
            }, 5000);

            this.callbackWindowInitialized = error => {
                this.callbackWindowInitialized = undefined;
                clearTimeout(timeout);
                error ? reject(error) : resolve();
            };
        });
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast)
            return;

        if(this.ipcRemoteId !== remoteId) {
            this.ipcRemoteId = remoteId;
        } else if(this.ipcRemoteId !== remoteId) {
            console.warn("Remote window got a new id. Maybe reload?");
            this.ipcRemoteId = remoteId;
        }

        super.handleIPCMessage(remoteId, broadcast, message);
    }

    protected handleTypedIPCMessage<T extends Popout2ControllerMessages>(type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(type, payload);

        switch (type) {
            case "hello-popout": {
                const tpayload = payload as PopoutIPCMessage["hello-popout"];
                console.log("Received Hello World from popup with version %s (expected %s).", tpayload.version, __build.version);
                if(tpayload.version !== __build.version) {
                    this.sendIPCMessage("hello-controller", { accepted: false, message: tr("version miss match") });
                    if(this.callbackWindowInitialized) {
                        this.callbackWindowInitialized(tr("version miss match"));
                        this.callbackWindowInitialized = undefined;
                    }
                    return;
                }

                if(this.callbackWindowInitialized) {
                    this.callbackWindowInitialized();
                    this.callbackWindowInitialized = undefined;
                }

                this.sendIPCMessage("hello-controller", { accepted: true, userData: this.userData });
                break;
            }

            case "fire-event":
            case "fire-event-callback":
                /* already handled by out base class */
                break;

            default:
                console.warn("Received unknown message type from popup window: %s", type);
                return;
        }
    }
}