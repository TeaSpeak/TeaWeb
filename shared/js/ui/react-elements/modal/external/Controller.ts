import {LogCategory, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {Registry} from "tc-events";
import {
    ModalInstanceController,
    ModalInstanceEvents,
    ModalOptions,
    ModalState
} from "tc-shared/ui/react-elements/modal/Definitions";
import {guid} from "tc-shared/crypto/uid";
import {getWindowManager} from "tc-shared/ui/windows/WindowManager";
import {assertMainApplication} from "tc-shared/ui/utils";
import {
    ModalIPCController2Renderer,
    ModalIPCRenderer2ControllerMessages
} from "tc-shared/ui/react-elements/modal/external/Definitions";

assertMainApplication();
export class ExternalModalController implements ModalInstanceController {
    private readonly modalType: string;
    private readonly modalOptions: ModalOptions;
    private readonly constructorArguments: any[];
    private readonly mainModalId: string;

    private readonly ipcMessageHandler: { [key: string]: (sourcePeerId: string, message: any) => void };
    private ipcRemotePeerId: string;
    private ipcChannel: IPCChannel;

    private readonly modalEvents: Registry<ModalInstanceEvents>;
    private modalInitialized: boolean;
    private modalInitializeCallback: () => void;

    private windowId: string | undefined;
    private windowListener: (() => void)[];
    private windowMutatePromise: Promise<void>;

    constructor(modalType: string, constructorArguments: any[], modalOptions: ModalOptions) {
        this.modalType = modalType;
        this.modalOptions = modalOptions;
        this.constructorArguments = constructorArguments;
        this.mainModalId = guid();

        this.modalEvents = new Registry<ModalInstanceEvents>();

        this.ipcMessageHandler = {};
        this.ipcChannel = getIpcInstance().createChannel(guid());
        this.ipcChannel.messageHandler = (sourcePeerId, broadcast, message) => {
            if(sourcePeerId !== this.ipcRemotePeerId && message.type !== "hello-renderer") {
                return;
            }

            if(typeof this.ipcMessageHandler[message.type] !== "function") {
                logWarn(LogCategory.IPC, tr("Received remote modal message but we don't know how to handle the message (%s)."), message.type);
                return;
            }

            this.ipcMessageHandler[message.type](sourcePeerId, message.data);
        };

        this.registerIpcMessageHandler("hello-renderer", (sourcePeerId, message) => {
            if(this.ipcRemotePeerId) {
                logInfo(LogCategory.IPC, tr("Modal %s got reloaded (Version: %s). Using new peer address %s instead of %s and initializing it."), this.modalType, message.version, this.ipcRemotePeerId, sourcePeerId);
                this.sendIpcMessage("invalidate-modal-instance", { });
            } else {
                logInfo(LogCategory.IPC, tr("Modal %s has called back (Version: %s). Initializing it."), this.modalType, message.version);
            }

            this.ipcRemotePeerId = sourcePeerId;
            if(message.version !== __build.version) {
                this.sendIpcMessage("hello-controller", { accepted: false, message: tr("version miss match") });
                return;
            }

            if(this.modalInitializeCallback) {
                this.modalInitializeCallback();
            }
            this.modalInitialized = true;

            this.sendIpcMessage("hello-controller", {
                accepted: true,

                modalId: this.mainModalId,
                modalType: this.modalType,
                constructorArguments: this.constructorArguments
            });
        });

        this.registerIpcMessageHandler("invoke-modal-action", (sourcePeerId, message) => {
            if(message.modalId !== this.mainModalId) {
                return;
            }

            switch (message.action) {
                case "minimize":
                    this.modalEvents.fire("action_minimize");
                    break;

                case "close":
                    this.modalEvents.fire("action_close");
                    break;
            }
        });
    }

    destroy() {
        this.hide().then(undefined);
        this.modalEvents.destroy();
    }

    getEvents(): Registry<ModalInstanceEvents> {
        return this.modalEvents;
    }

    getState(): ModalState {
        return typeof this.windowId === "string" ? ModalState.SHOWN : ModalState.DESTROYED;
    }

    async show(): Promise<void> {
        await this.mutateWindow(async () => {
            const windowManager = getWindowManager();
            if(typeof this.windowId === "string") {
                if(windowManager.isActionSupported(this.windowId, "focus")) {
                    await windowManager.executeAction(this.windowId, "focus");
                }

                return;
            }

            this.modalInitialized = false;
            this.modalInitializeCallback = undefined;
            const result = await windowManager.createWindow({
                uniqueId: this.modalOptions.uniqueId || this.modalType,
                loaderTarget: "modal-external",

                windowName: "modal " + this.modalType,

                defaultSize: this.modalOptions.defaultSize,
                appParameters: {
                    "modal-channel": this.ipcChannel.channelId,
                }
            });

            if(result.status === "error-user-rejected") {
                throw tr("user rejected");
            } else if(result.status === "error-unknown") {
                throw result.message;
            }

            this.windowListener = [];
            this.windowListener.push(windowManager.getEvents().on("notify_window_destroyed", event => {
                if(event.windowId !== this.windowId) {
                    return;
                }

                this.handleWindowDestroyed();
            }));

            this.windowId = result.windowId;
            try {
                if(!this.modalInitialized) {
                    await new Promise((resolve, reject) => {
                        const timeoutId = setTimeout(reject, 15000);
                        this.modalInitializeCallback = () => {
                            clearTimeout(timeoutId);
                            resolve();
                        };
                    });
                }
            } catch (_) {
                logError(LogCategory.IPC, tr("Opened modal failed to call back within 15 seconds."));
                getWindowManager().destroyWindow(this.windowId);
            } finally {
                this.modalInitialized = false;
                this.modalInitializeCallback = undefined;
            }

            logTrace(LogCategory.GENERAL, tr("Successfully showed external modal"));
        });
    }

    async hide(): Promise<void> {
        await this.mutateWindow(async () => {
            if(typeof this.windowId !== "string") {
                return;
            }

            getWindowManager().destroyWindow(this.windowId);
        });
    }

    async minimize(): Promise<void> {
        await this.mutateWindow(async () => {
            if (typeof this.windowId !== "string") {
                return;
            }

            await getWindowManager().executeAction(this.windowId, "minimize");
        });
    }

    async maximize(): Promise<void> {
        await this.mutateWindow(async () => {
            if (typeof this.windowId !== "string") {
                return;
            }

            await getWindowManager().executeAction(this.windowId, "maximize");
        });
    }

    private async mutateWindow<T>(callback: () => Promise<T>) : Promise<T> {
        while(this.windowMutatePromise) {
            await this.windowMutatePromise;
        }

        return await new Promise((resolveOuter, rejectOuter) => {
            const promise = callback();
            this.windowMutatePromise = new Promise<void>(resolve => {
                promise.then(result => {
                    this.windowMutatePromise = undefined;
                    resolve();

                    resolveOuter(result);
                }).catch(error => {
                    this.windowMutatePromise = undefined;
                    resolve();

                    rejectOuter(error);
                });
            });
        });
    }

    private handleWindowDestroyed() {
        this.windowId = undefined;
        this.windowListener.forEach(callback => callback());
        this.modalEvents.fire("notify_destroy");
    }

    private registerIpcMessageHandler<T extends keyof ModalIPCRenderer2ControllerMessages>(
        type: T,
        handler: (sourcePeerId: string, message: ModalIPCRenderer2ControllerMessages[T]) => void
    ) {
        this.ipcMessageHandler[type] = handler;
    }

    private sendIpcMessage<T extends keyof ModalIPCController2Renderer>(type: T, message: ModalIPCController2Renderer[T]) {
        if(!this.ipcRemotePeerId) {
            logWarn(LogCategory.IPC, tr("Tried to send a modal message but we don't know the modals peer address."));
            return;
        }

        this.ipcChannel.sendMessage(type, message, this.ipcRemotePeerId);
    }
}