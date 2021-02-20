import {AbstractExternalModalController} from "tc-shared/ui/react-elements/external-modal/Controller";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import * as ipc from "tc-shared/ipc/BrowserIPC";
import {ChannelMessage} from "tc-shared/ipc/BrowserIPC";
import {LogCategory, logDebug, logWarn} from "tc-shared/log";
import {Popout2ControllerMessages, PopoutIPCMessage} from "tc-shared/ui/react-elements/external-modal/IPCMessage";
import {tr, tra} from "tc-shared/i18n/localize";
import {ModalOptions} from "tc-shared/ui/react-elements/modal/Definitions";
import {assertMainApplication} from "tc-shared/ui/utils";

assertMainApplication();

export class ExternalModalController extends AbstractExternalModalController {
    private readonly options: ModalOptions;
    private currentWindow: Window;
    private windowClosedTestInterval: number = 0;
    private windowClosedTimeout: number;

    constructor(modalType: string, constructorArguments: any[] | undefined, options: ModalOptions | undefined) {
        super(modalType, constructorArguments);
        this.options = options || {};
    }

    protected async spawnWindow() : Promise<boolean> {
        if(this.currentWindow) {
            return true;
        }

        this.currentWindow = this.trySpawnWindow0();
        if(!this.currentWindow) {
            await new Promise((resolve, reject) => {
                spawnYesNo(tr("Would you like to open the popup?"), tra("Would you like to open popup {}?", this.modalType), callback => {
                    if(!callback) {
                        reject("user aborted");
                        return;
                    }

                    this.currentWindow = this.trySpawnWindow0();
                    if(window) {
                        reject(tr("Failed to spawn window"));
                    } else {
                        resolve();
                    }
                }).close_listener.push(() => reject(tr("user aborted")));
            });
        }

        if(!this.currentWindow) {
            return false;
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
                    clearInterval(this.windowClosedTestInterval);
                    this.windowClosedTestInterval = 0;
                    this.handleWindowClosed();
                }
            }, 100);
        };

        return true;
    }

    protected destroyWindow() {
        clearInterval(this.windowClosedTestInterval);
        this.windowClosedTestInterval = 0;

        if(this.currentWindow) {
            this.currentWindow.close();
            this.currentWindow = undefined;
        }
    }

    protected focusWindow() {
        this.currentWindow?.focus();
    }

    private trySpawnWindow0() : Window | null {
        const parameters = {
            "loader-target": "manifest",
            "chunk": "modal-external",
            "modal-target": this.modalType,
            "modal-identify": this.ipcAuthenticationCode,
            "ipc-address": ipc.getIpcInstance().getApplicationChannelId(),
            "ipc-core-peer": ipc.getIpcInstance().getLocalPeerId(),
            "disableGlobalContextMenu": __build.mode === "debug" ? 1 : 0,
            "loader-abort": __build.mode === "debug" ? 1 : 0,
        };

        const options = this.getOptions();
        const features = {
            status: "no",
            location: "no",
            toolbar: "no",
            menubar: "no",
            resizable: "yes",
            width: options.defaultSize?.width,
            height: options.defaultSize?.height
        };

        let baseUrl = location.origin + location.pathname + "?";
        return window.open(
            baseUrl + Object.keys(parameters).map(e => e + "=" + encodeURIComponent(parameters[e])).join("&"),
            this.options?.uniqueId || this.modalType,
            Object.keys(features).map(e => e + "=" + features[e]).join(",")
        );
    }

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(!broadcast && this.ipcRemotePeerId !== remoteId) {
            if(this.windowClosedTestInterval > 0) {
                clearInterval(this.windowClosedTestInterval);
                this.windowClosedTestInterval = 0;

                logDebug(LogCategory.IPC, tr("Remote window got reconnected. Client reloaded it."));
            } else {
                logWarn(LogCategory.IPC, tr("Remote window got a new id. Maybe a reload?"));
            }
        }

        super.handleIPCMessage(remoteId, broadcast, message);
    }

    protected handleTypedIPCMessage<T extends Popout2ControllerMessages>(remoteId: string, isBroadcast: boolean, type: T, payload: PopoutIPCMessage[T]) {
        super.handleTypedIPCMessage(remoteId, isBroadcast, type, payload);

        if(isBroadcast) {
            return;
        }

        switch (type) {
            case "invoke-modal-action":
                const data = payload as PopoutIPCMessage["invoke-modal-action"];
                switch (data.action) {
                    case "close":
                        this.destroy();
                        break;

                    case "minimize":
                        window.focus();
                        break;
                }
                break;
        }
    }
}