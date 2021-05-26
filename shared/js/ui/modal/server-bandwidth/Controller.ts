import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-events";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {ModalServerBandwidthEvents} from "tc-shared/ui/modal/server-bandwidth/Definitions";

class Controller {
    readonly handler: ConnectionHandler;
    readonly events: Registry<ModalServerBandwidthEvents>;

    private connectionInfoInterval: number;

    constructor(handler: ConnectionHandler) {
        this.handler = handler;

        this.events = new Registry<ModalServerBandwidthEvents>();
    }

    @CallOnce
    initialize() {
        this.refreshConnectionInfo();
        this.connectionInfoInterval = setInterval(() => this.refreshConnectionInfo(), 1000);
    }

    @CallOnce
    destroy() {
        clearInterval(this.connectionInfoInterval);
        this.connectionInfoInterval = 0;

        this.events.destroy();
    }

    private refreshConnectionInfo() {
        const server = this.handler.channelTree.server;
        server.requestConnectionInfo().then(info => this.events.fire_react("notify_connection_info", { info: info }));
    }
}

export function spawnServerBandwidth(handler: ConnectionHandler) {
    const controller = new Controller(handler);
    controller.initialize();

    const modal = spawnModal("modal-server-bandwidth", [
        controller.events.generateIpcDescription(),
    ], {
        popoutable: true
    });

    modal.getEvents().on("destroy", () => controller.destroy());
    modal.getEvents().on("destroy", handler.events().on("notify_connection_state_changed", event => {
        if(event.newState !== ConnectionState.CONNECTED) {
            modal.destroy();
        }
    }));
    ignorePromise(modal.show());
}