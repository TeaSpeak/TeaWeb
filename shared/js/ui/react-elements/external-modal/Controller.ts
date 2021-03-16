import {LogCategory, logDebug, logTrace} from "../../../log";
import * as ipc from "../../../ipc/BrowserIPC";
import {ChannelMessage} from "../../../ipc/BrowserIPC";
import {Registry} from "tc-events";
import {
    EventControllerBase,
    kPopoutIPCChannelId,
    Popout2ControllerMessages,
    PopoutIPCMessage
} from "../../../ui/react-elements/external-modal/IPCMessage";
import {ModalEvents, ModalOptions, ModalState} from "../../../ui/react-elements/ModalDefinitions";
import {guid} from "tc-shared/crypto/uid";
import {ModalInstanceController, ModalInstanceEvents} from "tc-shared/ui/react-elements/modal/Definitions";

export abstract class AbstractExternalModalController extends EventControllerBase<"controller"> implements ModalInstanceController {
    public readonly modalType: string;
    public readonly constructorArguments: any[];

    private readonly modalEvents: Registry<ModalInstanceEvents>;
    private modalState: ModalState = ModalState.DESTROYED;

    private readonly documentUnloadListener: () => void;
    private callbackWindowInitialized: (error?: string) => void;

    protected constructor(modalType: string, constructorArguments: any[]) {
        super(guid());
        this.modalType = modalType;
        this.constructorArguments = constructorArguments;

        this.modalEvents = new Registry<ModalInstanceEvents>();

        this.ipcChannel = ipc.getIpcInstance().createChannel(kPopoutIPCChannelId);
        this.ipcChannel.messageHandler = this.handleIPCMessage.bind(this);

        this.documentUnloadListener = () => this.destroy();
    }

    getOptions(): Readonly<ModalOptions> {
        return {}; /* FIXME! */
    }

    getEvents(): Registry<ModalInstanceEvents> {
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
        this.modalEvents.fire("notify_open");
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
        this.modalEvents.fire("notify_close");
    }

    destroy() {
        if(this.modalState === ModalState.DESTROYED) {
            return;
        }

        this.doDestroyWindow();
        if(this.ipcChannel) {
            ipc.getIpcInstance().deleteChannel(this.ipcChannel);
        }

        this.destroyIPC();
        this.modalState = ModalState.DESTROYED;
        this.modalEvents.fire("notify_destroy");
    }

    protected handleWindowClosed() {
        /* no other way currently */
        this.destroy();
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(!broadcast && remoteId !== this.ipcRemotePeerId) {
            logDebug(LogCategory.IPC, tr("Received direct IPC message for popout controller from unknown source: %s"), remoteId);
            return;
        }

        this.handleTypedIPCMessage(remoteId, broadcast, message.type as any, message.data);
    }

    protected handleTypedIPCMessage<T extends Popout2ControllerMessages>(remoteId: string, isBroadcast: boolean, type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(remoteId, isBroadcast, type, payload);

        if(type === "hello-popout") {
            const messageHello = payload as PopoutIPCMessage["hello-popout"];
            if(messageHello.authenticationCode !== this.ipcAuthenticationCode) {
                /* most likely not for us */
                return;
            }

            if(this.ipcRemotePeerId) {
                logTrace(LogCategory.IPC, tr("Modal popout slave changed from %s to %s. Side reload?"), this.ipcRemotePeerId, remoteId);
                /* TODO: Send a good by to the old modal */
            }
            this.ipcRemotePeerId = remoteId;

            logTrace(LogCategory.IPC, "Received Hello World from popup (peer id %s) with version %s (expected %s).", remoteId, messageHello.version, __build.version);
            if(messageHello.version !== __build.version) {
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

            this.sendIPCMessage("hello-controller", { accepted: true, constructorArguments: this.constructorArguments });
        }
    }
}