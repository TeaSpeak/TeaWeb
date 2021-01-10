import {LogCategory, logDebug, logTrace, logWarn} from "../../../log";
import * as ipc from "../../../ipc/BrowserIPC";
import {ChannelMessage} from "../../../ipc/BrowserIPC";
import {Registry, RegistryMap} from "../../../events";
import {
    EventControllerBase,
    Popout2ControllerMessages,
    PopoutIPCMessage
} from "../../../ui/react-elements/external-modal/IPCMessage";
import {ModalController, ModalEvents, ModalOptions, ModalState} from "../../../ui/react-elements/ModalDefinitions";

export abstract class AbstractExternalModalController extends EventControllerBase<"controller"> implements ModalController {
    public readonly modalType: string;
    public readonly userData: any;

    private readonly modalEvents: Registry<ModalEvents>;
    private modalState: ModalState = ModalState.DESTROYED;

    private readonly documentUnloadListener: () => void;
    private callbackWindowInitialized: (error?: string) => void;

    protected constructor(modal: string, registries: RegistryMap, userData: any) {
        super();
        this.initializeRegistries(registries);

        this.modalEvents = new Registry<ModalEvents>();

        this.modalType = modal;
        this.userData = userData;

        this.ipcChannel = ipc.getIpcInstance().createChannel();
        this.ipcChannel.messageHandler = this.handleIPCMessage.bind(this);

        this.documentUnloadListener = () => this.destroy();
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

    protected abstract spawnWindow() : Promise<boolean>;
    protected abstract focusWindow() : void;
    protected abstract destroyWindow() : void;

    async show() {
        if(this.modalState === ModalState.SHOWN) {
            this.focusWindow();
            return;
        }
        this.modalState = ModalState.SHOWN;

        if(!await this.spawnWindow()) {
            this.modalState = ModalState.DESTROYED;
            throw tr("failed to create window");
        }

        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.callbackWindowInitialized = undefined;
                    reject("window haven't called back");
                }, 15000);

                this.callbackWindowInitialized = error => {
                    this.callbackWindowInitialized = undefined;
                    clearTimeout(timeout);
                    error ? reject(error) : resolve();
                };
            });
        } catch (e) {
            this.modalState = ModalState.DESTROYED;
            if(__build.mode !== "debug") {
                /* do not destroy the window in debug mode in order to debug what happened */
                this.doDestroyWindow();
            }
            throw e;
        }

        window.addEventListener("unload", this.documentUnloadListener);
        this.modalEvents.fire("open");
    }

    private doDestroyWindow() {
        this.destroyWindow();
        window.removeEventListener("beforeunload", this.documentUnloadListener);
    }

    async hide() {
        if(this.modalState == ModalState.DESTROYED || this.modalState === ModalState.HIDDEN)
            return;

        this.doDestroyWindow();
        this.modalState = ModalState.HIDDEN;
        this.modalEvents.fire("close");
    }

    destroy() {
        if(this.modalState === ModalState.DESTROYED)
            return;

        this.doDestroyWindow();
        if(this.ipcChannel) {
            ipc.getIpcInstance().deleteChannel(this.ipcChannel);
        }

        this.destroyIPC();
        this.modalState = ModalState.DESTROYED;
        this.modalEvents.fire("destroy");
    }

    protected handleWindowClosed() {
        /* no other way currently */
        this.destroy();
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(broadcast)
            return;

        if(this.ipcRemoteId === undefined) {
            logDebug(LogCategory.IPC, tr("Remote window connected with id %s"), remoteId);
            this.ipcRemoteId = remoteId;
        } else if(this.ipcRemoteId !== remoteId) {
            this.ipcRemoteId = remoteId;
        }

        super.handleIPCMessage(remoteId, broadcast, message);
    }

    protected handleTypedIPCMessage<T extends Popout2ControllerMessages>(type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(type, payload);

        switch (type) {
            case "hello-popout": {
                const tpayload = payload as PopoutIPCMessage["hello-popout"];
                logTrace(LogCategory.IPC, "Received Hello World from popup with version %s (expected %s).", tpayload.version, __build.version);
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

                this.sendIPCMessage("hello-controller", { accepted: true, userData: this.userData, registries: Object.keys(this.localRegistries) });
                break;
            }

            case "fire-event":
            case "fire-event-callback":
                /* already handled by out base class */
                break;

            case "invoke-modal-action":
                /* must be handled by the underlying handler */
                break;

            default:
                logWarn(LogCategory.IPC, "Received unknown message type from popup window: %s", type);
                return;
        }
    }
}