import {
    WindowAction,
    WindowCreateResult,
    WindowManager,
    WindowManagerEvents,
    WindowSpawnOptions
} from "tc-shared/ui/windows/WindowManager";
import {assertMainApplication} from "tc-shared/ui/utils";
import {Registry} from "tc-events";
import {getIpcInstance} from "tc-shared/ipc/BrowserIPC";
import _ from "lodash";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {tr, tra} from "tc-shared/i18n/localize";
import {guid} from "tc-shared/crypto/uid";

assertMainApplication();

type WindowHandle = {
    window: Window,
    uniqueId: string,

    destroy: () => void,

    closeTestInterval: number | undefined,
    closeTestTimeout: number | undefined,
}

export class WebWindowManager implements WindowManager {
    private readonly events: Registry<WindowManagerEvents>;
    private registeredWindows: { [key: string]: WindowHandle } = {};

    constructor() {
        this.events = new Registry<WindowManagerEvents>();
        /* TODO: Close all active windows on page unload */
    }

    getEvents(): Registry<WindowManagerEvents> {
        return this.events;
    }

    async createWindow(options: WindowSpawnOptions): Promise<WindowCreateResult> {
        /* Multiple application instance may want to open the same windows */
        const windowUniqueId = getIpcInstance().getApplicationChannelId() + "-" + options.uniqueId;

        /* If we're opening a window with the same unique id we need to destroy the old handle */
        for(const windowId of Object.keys(this.registeredWindows)) {
            if(this.registeredWindows[windowId].uniqueId === windowUniqueId) {
                this.registeredWindows[windowId].destroy();
            }
        }

        let windowInstance = this.tryCreateWindow(options, windowUniqueId);
        if(!windowInstance) {
            try {
                await new Promise((resolve, reject) => {
                    spawnYesNo(tr("Would you like to open the popup?"), tra("Would you like to open window {}?", options.windowName), callback => {
                        if(!callback) {
                            reject();
                            return;
                        }

                        windowInstance = this.tryCreateWindow(options, windowUniqueId);
                        resolve();
                    });
                });
            } catch (_) {
                return { status: "error-user-rejected" };
            }
        }

        if(!windowInstance) {
            return { status: "error-user-rejected" };
        }

        const windowId = guid();
        const windowHandle = this.registeredWindows[windowId] = {
            window: windowInstance,
            uniqueId: windowUniqueId,

            closeTestInterval: 0,
            closeTestTimeout: 0,

            destroy: undefined
        };

        const handleWindowClosed = () => {
            if(windowHandle.window && !windowHandle.window.closed) {
                windowHandle.window.onbeforeunload = undefined;
                windowHandle.window.onunload = undefined;
                windowHandle.window.onclose = undefined;
                windowHandle.window.close();
            }

            clearInterval(windowHandle.closeTestInterval);
            clearTimeout(windowHandle.closeTestTimeout);
            if(!this.registeredWindows[windowId]) {
                return;
            }

            delete this.registeredWindows[windowId];
            this.events.fire("notify_window_destroyed", { windowId: windowId });
        };

        const testWindowClosed = (timeout: number) => {
            clearInterval(windowHandle.closeTestInterval);
            clearTimeout(windowHandle.closeTestTimeout);

            windowHandle.closeTestInterval = setInterval(() => {
                /* !== is required for compatibility with Opera */
                if(windowHandle.window.closed !== false) {
                    handleWindowClosed();
                }
            }, 100);
            windowHandle.closeTestTimeout = setTimeout(() => {
                clearInterval(windowHandle.closeTestInterval);
                clearTimeout(windowHandle.closeTestTimeout);
            }, timeout);
        };

        windowInstance.onbeforeunload = () => testWindowClosed(5000);
        windowInstance.onunload = () => testWindowClosed(2500);
        windowInstance.onclose = () => testWindowClosed(2500);

        windowHandle.destroy = () => handleWindowClosed();
        return { status: "success", windowId: windowId };
    }

    private tryCreateWindow(options: WindowSpawnOptions, uniqueId: string) : Window | null {
        const parameters = _.cloneDeep(options.appParameters || {});
        Object.assign(parameters, {
            "loader-target": "manifest",
            "loader-chunk": options.loaderTarget,
            "loader-abort": __build.mode === "debug" ? 1 : 0,

            "ipc-address": getIpcInstance().getApplicationChannelId(),
            "ipc-core-peer": getIpcInstance().getLocalPeerId(),

            "disableGlobalContextMenu": __build.mode === "debug" ? 1 : 0,
        });

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
            uniqueId,
            Object.keys(features).map(e => e + "=" + features[e]).join(",")
        );
    }

    destroyWindow(windowId: string) {
        this.registeredWindows[windowId]?.destroy();
    }

    getActiveWindowId(): string | undefined {
        /* TODO! */
        return undefined;
    }

    async executeAction(windowId: string, action: WindowAction): Promise<void> {
        const windowHandle = this.registeredWindows[windowId];
        if(!windowHandle || windowHandle.window.closed) {
            return;
        }

        switch (action) {
            case "focus":
                window.window.focus();
                break;

            case "minimize":
            case "maximize":
                /* we can't do so */
                break;
        }
    }

    isActionSupported(windowId: string, action: WindowAction) {
        switch (action) {
            case "focus":
                return true;

            case "maximize":
            case "minimize":
            default:
                return false;
        }
    }
}