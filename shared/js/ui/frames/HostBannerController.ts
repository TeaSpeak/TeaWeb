import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {HostBannerInfoMode, HostBannerUiEvents} from "tc-shared/ui/frames/HostBannerDefinitions";

export class HostBannerController {
    readonly uiEvents: Registry<HostBannerUiEvents>;

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    constructor() {
        this.uiEvents = new Registry<HostBannerUiEvents>();
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
        this.listenerConnection.push(handler.channelTree.server.events.on("notify_properties_updated", event => {
            if(
                "virtualserver_hostbanner_url" in event.updated_properties ||
                "virtualserver_hostbanner_mode" in event.updated_properties ||
                "virtualserver_hostbanner_gfx_url" in event.updated_properties ||
                "virtualserver_hostbanner_gfx_interval" in event.updated_properties
            ) {
                this.notifyHostBanner();
            }
        }));

        this.listenerConnection.push(handler.events().on("notify_connection_state_changed", event => {
            if(event.oldState === ConnectionState.CONNECTED || event.newState === ConnectionState.CONNECTED) {
                this.notifyHostBanner();
            }
        }));
    }

    private notifyHostBanner() {
        if(this.currentConnection?.connected) {
            const properties = this.currentConnection.channelTree.server.properties;
            if(properties.virtualserver_hostbanner_gfx_url) {
                let mode: HostBannerInfoMode;
                switch (properties.virtualserver_hostbanner_mode) {
                    case 0:
                        mode = "original";
                        break;

                    case 1:
                        mode = "resize";
                        break;

                    case 2:
                    default:
                        mode = "resize-ratio";
                        break;
                }

                this.uiEvents.fire_react("notify_host_banner", {
                    banner: {
                        status: "set",

                        linkUrl: properties.virtualserver_hostbanner_url,
                        mode: mode,

                        imageUrl: properties.virtualserver_hostbanner_gfx_url,
                        updateInterval: properties.virtualserver_hostbanner_gfx_interval,
                    }
                });
                return;
            }
        }

        this.uiEvents.fire_react("notify_host_banner", { banner: { status: "none" }});
    }
}