import {Registry} from "tc-shared/events";
import {ConnectProperties, ConnectUiEvents} from "tc-shared/ui/modal/connect/Definitions";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ConnectModal} from "tc-shared/ui/modal/connect/Renderer";

class ConnectController {
    readonly uiEvents: Registry<ConnectUiEvents>;

    constructor() {
        this.uiEvents = new Registry<ConnectUiEvents>();
    }

    destroy() {

    }


    private sendProperty(property: keyof ConnectProperties) {
        switch (property) {
            case "address":
        }
    }
}

export type ConnectModalOptions = {
    connectInANewTab?: boolean,
    defaultAddress?: string,
    defaultProfile?: string
}

export function spawnConnectModalNew(options: ConnectModalOptions) {
    const controller = new ConnectController();
    const modal = spawnReactModal(ConnectModal, controller.uiEvents, options.connectInANewTab || false);
    modal.show();

    modal.events.one("destroy", () => {
        controller.destroy();
    });
}

(window as any).spawnConnectModalNew = spawnConnectModalNew;