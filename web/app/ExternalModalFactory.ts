import {AbstractExternalModalController} from "tc-shared/ui/react-elements/external-modal/Controller";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import * as ipc from "tc-shared/ipc/BrowserIPC";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setExternalModalControllerFactory} from "tc-shared/ui/react-elements/external-modal";
import {ChannelMessage} from "tc-shared/ipc/BrowserIPC";
import {LogCategory, logDebug, logWarn} from "tc-shared/log";

class ExternalModalController extends AbstractExternalModalController {
    private currentWindow: Window;
    private windowClosedTestInterval: number = 0;
    private windowClosedTimeout: number;

    constructor(a, b, c) {
        super(a, b, c);
    }

    protected async spawnWindow() : Promise<boolean> {
        if(this.currentWindow)
            return true;

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

        if(!this.currentWindow)
            return false;

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

    protected handleIPCMessage(remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(!broadcast && this.ipcRemoteId !== remoteId) {
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
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 50,
    name: "external modal controller factory setup",
    function: async () => {
        setExternalModalControllerFactory((modal, events, userData) => new ExternalModalController(modal, events, userData));
    }
});