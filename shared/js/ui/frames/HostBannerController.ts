import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {HostBannerUiEvents} from "tc-shared/ui/frames/HostBannerDefinitions";
import {Registry} from "tc-shared/events";

export class HostBannerController {
    readonly uiEvents: Registry<HostBannerUiEvents>;

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    constructor() {
        this.uiEvents = new Registry<HostBannerUiEvents>();
    }

    destroy() {
        this.currentConnection = undefined;

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];

        this.uiEvents?.destroy();
    }

    setConnectionHandler(handler: ConnectionHandler) {
        if(this.currentConnection === handler) {
            return;
        }

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];

        this.currentConnection = handler;
        if(this.currentConnection) {
            this.initializeConnectionHandler(handler);
        }

        this.notifyHostBanner();
    }

    protected initializeConnectionHandler(handler: ConnectionHandler) {
        this.listenerConnection.push(handler.channelTree.server.events.on("notify_host_banner_updated", () => {
            this.notifyHostBanner();
        }));

        this.listenerConnection.push(handler.events().on("notify_connection_state_changed", event => {
            if(event.oldState === ConnectionState.CONNECTED || event.newState === ConnectionState.CONNECTED) {
                this.notifyHostBanner();
            }
        }));
    }

    private notifyHostBanner() {
        if(this.currentConnection?.connected) {
            this.uiEvents.fire_react("notify_host_banner", {
                banner: this.currentConnection.channelTree.server.generateHostBannerInfo()
            });
        } else {
            this.uiEvents.fire_react("notify_host_banner", { banner: { status: "none" }});
        }
    }
}