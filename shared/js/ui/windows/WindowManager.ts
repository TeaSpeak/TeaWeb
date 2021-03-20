import {Registry} from "tc-events";

export type WindowCreateResult = {
    status: "success",
    windowId: string
} | {
    status: "error-unknown",
    message: string
} | {
    status: "error-user-rejected",
};

export interface WindowManagerEvents {
    notify_window_created: { windowId: string },
    notify_window_focused: { windowId: string },
    notify_window_destroyed: { windowId: string },
}

export type WindowAction = "focus" | "maximize" | "minimize";

export interface WindowSpawnOptions {
    uniqueId: string,
    loaderTarget: string,
    /* if the window hasn't been created within a user gesture the client will be prompted if he wants to open the window */
    windowName?: string,

    appParameters?: {[key: string]: string},
    defaultSize?: { width: number, height: number },
}

export interface WindowManager {
    getEvents() : Registry<WindowManagerEvents>;

    createWindow(options: WindowSpawnOptions) : Promise<WindowCreateResult>;
    destroyWindow(windowId: string);

    getActiveWindowId() : string | undefined;

    isActionSupported(windowId: string, action: WindowAction) : boolean;
    executeAction(windowId: string, action: WindowAction) : Promise<void>;
}

let windowManager: WindowManager;
export function getWindowManager() : WindowManager {
    return windowManager;
}

export function setWindowManager(newWindowManager: WindowManager) {
    windowManager = newWindowManager;
}