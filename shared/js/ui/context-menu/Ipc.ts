import * as loader from "tc-loader";
import {Stage} from "tc-loader";

import {
    ContextMenuEntry,
    ContextMenuFactory,
    setGlobalContextMenuFactory
} from "tc-shared/ui/context-menu/index";
import {ChannelMessage, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import * as ipc from "tc-shared/ipc/BrowserIPC";
import {Settings} from "tc-shared/settings";
import {reactContextMenuInstance} from "tc-shared/ui/context-menu/ReactRenderer";
import {getIconManager, RemoteIcon} from "tc-shared/file/Icons";

const kIPCContextMenuChannel = "context-menu";

class IPCContextMenu implements ContextMenuFactory {
    private readonly ipcChannel: IPCChannel;

    private currentlyFocusedWindow: string;
    private currentWindowFocused = true;

    private remoteContextMenuSupplierId: string;

    private uniqueEntryId: number = 0;
    private menuCallbacks: {[key: string]: (() => void)} = {};
    private closeCallback: () => void;

    constructor() {
        this.ipcChannel = ipc.getInstance().createChannel(undefined, kIPCContextMenuChannel);
        this.ipcChannel.messageHandler = this.handleIpcMessage.bind(this);

        /* if we're just created we're the focused window ;) */
        this.currentWindowFocused = false;
        this.handleWindowFocusReceived();

        document.addEventListener("mousedown", () => this.handleWindowFocusReceived());
    }

    private handleWindowFocusReceived() {
        if(!this.currentWindowFocused) {
            if(this.closeCallback) {
                this.closeCallback();
            }
            this.closeCallback = undefined;
            this.menuCallbacks = {};
            this.remoteContextMenuSupplierId = undefined;

            this.currentlyFocusedWindow = undefined;
            this.currentWindowFocused = true;
            this.ipcChannel.sendMessage("notify-focus-taken", {});
        }
    }

    private wrapMenuEntryForRemote(entry: ContextMenuEntry) : ContextMenuEntry {
        switch (entry.type) {
            case "normal":
                if(entry.subMenu) {
                    entry.subMenu = entry.subMenu.map(entry => this.wrapMenuEntryForRemote(entry));
                }
                if(entry.icon instanceof RemoteIcon) {
                    entry.icon = { iconId: entry.icon.iconId, serverUniqueId: entry.icon.serverUniqueId } as any;
                }

                /* fall through wanted! */
            case "checkbox":
                if(!entry.click) { break; }

                if(!entry.uniqueId) {
                    entry.uniqueId = "r_" + (++this.uniqueEntryId);
                }

                this.menuCallbacks[entry.uniqueId] = entry.click;
                entry.click = undefined;
                break;
        }
        return entry;
    }

    private wrapMenuEntryFromRemote(entry: ContextMenuEntry) : ContextMenuEntry {
        switch (entry.type) {
            case "normal":
                if(entry.subMenu) {
                    entry.subMenu = entry.subMenu.map(entry => this.wrapMenuEntryFromRemote(entry));
                }

                if(typeof entry.icon === "object") {
                    const icon = entry.icon as any;
                    entry.icon = getIconManager().resolveIcon(icon.iconId, icon.serverUniqueId);
                }

                /* fall through wanted! */
            case "checkbox":
                if(!entry.uniqueId) { break; }

                entry.click = () => {
                    console.error("Click: %O", this.remoteContextMenuSupplierId);
                    this.remoteContextMenuSupplierId && this.ipcChannel.sendMessage("notify-entry-click", { id: entry.uniqueId }, this.remoteContextMenuSupplierId);
                };
                break;
        }
        return entry;
    }

    closeContextMenu() {
        if(this.currentWindowFocused) {
            reactContextMenuInstance.closeContextMenu();
        }
    }

    spawnContextMenu(position: { pageX: number; pageY: number }, entries: ContextMenuEntry[], callbackClose?: () => void) {
        if(this.currentWindowFocused) {
            reactContextMenuInstance.spawnContextMenu(position, entries, callbackClose);
        } else {
            this.ipcChannel.sendMessage("spawn-context-menu", {
                position: position,
                entries: entries.map(entry => this.wrapMenuEntryForRemote(entry))
            });
            this.closeCallback = callbackClose;
        }
    }

    private handleIpcMessage(remoteId: string, _broadcast: boolean, message: ChannelMessage) {
        if(message.type === "spawn-context-menu") {
            if(!this.currentWindowFocused) { return; }

            reactContextMenuInstance.spawnContextMenu(message.data.position, message.data.entries.map(entry => this.wrapMenuEntryFromRemote(entry)), () => {
                if(!this.remoteContextMenuSupplierId) { return; }
                this.ipcChannel.sendMessage("notify-menu-close", {}, this.remoteContextMenuSupplierId);

                this.remoteContextMenuSupplierId = undefined;
            });
            this.remoteContextMenuSupplierId = remoteId;
        } else if(message.type === "notify-focus-taken") {
            this.currentlyFocusedWindow = remoteId;
            this.currentWindowFocused = false;

            /* close out context menu if we've any */
            reactContextMenuInstance.closeContextMenu();
        } else if(message.type === "notify-entry-click") {
            console.error("Entry click: %o", message.data.id);
            const callback = this.menuCallbacks[message.data.id];
            if(!callback) { return; }
            callback();
        } else if(message.type === "notify-menu-close") {
            this.menuCallbacks = {};
            if(this.closeCallback) {
                this.closeCallback();
                this.closeCallback = undefined;
            }
        }
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 80,
    name: "context menu init",
    function: async () => {
        setGlobalContextMenuFactory(new IPCContextMenu());
    }
})
