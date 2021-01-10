import {AbstractIconManager, kIPCIconChannel, RemoteIcon, RemoteIconState, setIconManager} from "tc-shared/file/Icons";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ChannelMessage, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import * as ipc from "tc-shared/ipc/BrowserIPC";
import {AppParameters} from "tc-shared/settings";
import {LogCategory, logWarn} from "tc-shared/log";

class RemoteRemoteIcon extends RemoteIcon {
    constructor(serverUniqueId: string, iconId: number) {
        super(serverUniqueId, iconId);
    }

    public setState(state: RemoteIconState) {
        super.setState(state);
    }

    public setErrorMessage(message: string) {
        super.setErrorMessage(message);
    }

    public setImageUrl(url: string) {
        super.setImageUrl(url);
    }
}

class RemoteIconManager extends AbstractIconManager {
    private readonly ipcChannel: IPCChannel;
    private callbackInitialized: () => void;

    private cachedIcons: {[key: string]: RemoteRemoteIcon} = {};

    constructor() {
        super();

        this.ipcChannel = ipc.getIpcInstance().createChannel(AppParameters.getValue(AppParameters.KEY_IPC_REMOTE_ADDRESS, "invalid"), kIPCIconChannel);
        this.ipcChannel.messageHandler = this.handleIpcMessage.bind(this);
    }

    async initialize() {
        this.ipcChannel.sendMessage("initialize", {});

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.callbackInitialized = undefined;
                reject(tr("initialize timeout"));
            }, 5000);

            this.callbackInitialized = () => {
                clearTimeout(timeout);
                resolve();
            }
        });
    }

    resolveIcon(iconId: number, serverUniqueId?: string, handlerId?: string): RemoteIcon {
        serverUniqueId = serverUniqueId || "";

        iconId = iconId >>> 0;

        const uniqueId = RemoteIconManager.iconUniqueKey(iconId, serverUniqueId);
        if(this.cachedIcons[uniqueId]) { return this.cachedIcons[uniqueId]; }

        const icon = new RemoteRemoteIcon(serverUniqueId, iconId);
        this.cachedIcons[uniqueId] = icon;

        this.ipcChannel.sendMessage("icon-resolve", {
            iconId: iconId,
            serverUniqueId: serverUniqueId,
            handlerId: handlerId
        });
        return icon;
    }


    private handleIpcMessage(_remoteId: string, broadcast: boolean, message: ChannelMessage) {
        if(!broadcast) {
            if(message.type === "initialized") {
                if(this.callbackInitialized)
                    this.callbackInitialized();
            }
        }

        if(message.type === "notify-icon-status") {
            const icon = this.cachedIcons[message.data.iconUniqueId];
            if(!icon) { return; }

            switch (message.data.status as RemoteIconState) {
                case "destroyed":
                    delete this.cachedIcons[message.data.iconUniqueId];
                    icon.destroy();
                    break;

                case "empty":
                    icon.setState("empty");
                    break;

                case "error":
                    icon.setErrorMessage(message.data.errorMessage);
                    icon.setState("error");
                    break;

                case "loaded":
                    icon.setImageUrl(message.data.url);
                    icon.setState("loaded");
                    break;

                case "loading":
                    icon.setState("loading");
                    break;

                default:
                    logWarn(LogCategory.FILE_TRANSFER, tr("Received remote icon state change with an unknown state %s"), message.data.state);
                    break;
            }
        }
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 10,
    name: "IPC icon init",
    function: async () => {
        let instance = new RemoteIconManager();
        await instance.initialize();
        setIconManager(instance);
    }
});