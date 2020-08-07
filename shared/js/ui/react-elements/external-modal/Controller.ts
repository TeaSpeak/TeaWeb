import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as ipc from "tc-shared/ipc/BrowserIPC";
import {ChannelMessage} from "tc-shared/ipc/BrowserIPC";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {Registry} from "tc-shared/events";
import {
    EventControllerBase,
    Popout2ControllerMessages,
    PopoutIPCMessage
} from "tc-shared/ui/react-elements/external-modal/IPCMessage";
import {ModalController, ModalEvents, ModalOptions, ModalState} from "tc-shared/ui/react-elements/Modal";

export class ExternalModalController extends EventControllerBase<"controller"> implements ModalController {
    public readonly modalType: string;
    public readonly userData: any;

    private modalState: ModalState = ModalState.DESTROYED;
    private readonly modalEvents: Registry<ModalEvents>;

    private currentWindow: Window;
    private callbackWindowInitialized: (error?: string) => void;

    private readonly documentQuitListener: () => void;
    private windowClosedTestInterval: number = 0;
    private windowClosedTimeout: number;

    constructor(modal: string, localEventRegistry: Registry<any>, userData: any) {
        super(localEventRegistry);

        this.modalEvents = new Registry<ModalEvents>();

        this.modalType = modal;
        this.userData = userData;

        this.ipcChannel = ipc.getInstance().createChannel();
        this.ipcChannel.messageHandler = this.handleIPCMessage.bind(this);

        this.documentQuitListener = () => this.currentWindow?.close();
    }

    getOptions(): Readonly<ModalOptions> {
        return {}; /* FIXME! */
    }

    getEvents(): Registry<ModalEvents> {
        return this.modalEvents;
    }

    getState(): ModalState {
        return this.modalState;
    }

    private trySpawnWindow() : Window | null {
        const parameters = {
            "loader-target": "manifest",
            "chunk": "modal-external",
            "modal-target": this.modalType,
            "ipc-channel": this.ipcChannel.channelId,
            "ipc-address": ipc.getInstance().getLocalAddress(),
            "disableGlobalContextMenu": __build.mode === "debug" ? 1 : 0,
            "loader-abort": __build.mode === "debug" ? 1 : 0,
        };

        const features = {
            status: "no",
            location: "no",
            toolbar: "no",
            menubar: "no",
            /*
            width: 600,
            height: 400
            */
        };

        let baseUrl = location.origin + location.pathname + "?";
        return window.open(
            baseUrl + Object.keys(parameters).map(e => e + "=" + encodeURIComponent(parameters[e])).join("&"),
            this.modalType,
            Object.keys(features).map(e => e + "=" + features[e]).join(",")
        );
    }

    async show() {
        if(this.currentWindow) {
            this.currentWindow.focus();
            return;
        }

        this.currentWindow = this.trySpawnWindow();
        if(!this.currentWindow) {
            await new Promise((resolve, reject) => {
                spawnYesNo(tr("Would you like to open the popup?"), tra("Would you like to open popup {}?", this.modalType), callback => {
                    if(!callback) {
                        reject("user aborted");
                        return;
                    }

                    this.currentWindow = this.trySpawnWindow();
                    if(this.currentWindow) {
                        reject(tr("Failed to spawn window"));
                    } else {
                        resolve();
                    }
                }).close_listener.push(() => reject(tr("user aborted")));
            })
        }

        if(!this.currentWindow) {
            /* some shitty popup blocker or whatever */
            throw tr("failed to create window");
        }
        window.addEventListener("unload", this.documentQuitListener);

        try {
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
        } catch (e) {
            this.currentWindow?.close();
            this.currentWindow = undefined;
            throw e;
        }

        this.currentWindow.onbeforeunload = () => {
            clearInterval(this.windowClosedTestInterval);

            this.windowClosedTimeout = Date.now() + 5000;
            this.windowClosedTestInterval = setInterval(() => {
                if(!this.currentWindow) {
                    clearInterval(this.windowClosedTestInterval);
                    this.windowClosedTestInterval = 0;
                    return;
                }

                if(this.currentWindow.closed || Date.now() > this.windowClosedTimeout) {
                    window.removeEventListener("unload", this.documentQuitListener);
                    this.currentWindow = undefined;
                    this.destroy(); /* TODO: Test if we should do this */
                }
            }, 100);
        };

        this.modalState = ModalState.SHOWN;
        this.modalEvents.fire("open");
    }

    private destroyPopUp() {
        if(this.currentWindow) {
            clearInterval(this.windowClosedTestInterval);
            this.windowClosedTestInterval = 0;

            window.removeEventListener("beforeunload", this.documentQuitListener);
            this.currentWindow.close();
            this.currentWindow = undefined;
        }
    }

    async hide() {
        if(this.modalState == ModalState.DESTROYED || this.modalState === ModalState.HIDDEN)
            return;

        this.destroyPopUp();
        this.modalState = ModalState.HIDDEN;
        this.modalEvents.fire("close");
    }

    destroy() {
        if(this.modalState === ModalState.DESTROYED)
            return;

        this.destroyPopUp();
        if(this.ipcChannel)
            ipc.getInstance().deleteChannel(this.ipcChannel);

        this.destroyIPC();
        this.modalState = ModalState.DESTROYED;
        this.modalEvents.fire("destroy");
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast)
            return;

        if(this.ipcRemoteId === undefined) {
            log.debug(LogCategory.IPC, tr("Remote window connected with id %s"), remoteId);
            this.ipcRemoteId = remoteId;
        } else if(this.ipcRemoteId !== remoteId) {
            if(this.windowClosedTestInterval > 0) {
                clearInterval(this.windowClosedTestInterval);
                this.windowClosedTestInterval = 0;

                log.debug(LogCategory.IPC, tr("Remote window got reconnected. Client reloaded it."));
            } else {
                log.warn(LogCategory.IPC, tr("Remote window got a new id. Maybe a reload?"));
            }
            this.ipcRemoteId = remoteId;
        }

        super.handleIPCMessage(remoteId, broadcast, message);
    }

    protected handleTypedIPCMessage<T extends Popout2ControllerMessages>(type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(type, payload);

        switch (type) {
            case "hello-popout": {
                const tpayload = payload as PopoutIPCMessage["hello-popout"];
                log.trace(LogCategory.IPC, "Received Hello World from popup with version %s (expected %s).", tpayload.version, __build.version);
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
                log.warn(LogCategory.IPC, "Received unknown message type from popup window: %s", type);
                return;
        }
    }
}