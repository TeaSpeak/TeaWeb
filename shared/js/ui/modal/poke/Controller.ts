import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {ModalPokeEvents, ModalPokeVariables, PokeRecord} from "tc-shared/ui/modal/poke/Definitions";
import {Registry} from "tc-events";
import {server_connections} from "tc-shared/ConnectionManager";
import {ModalController} from "tc-shared/ui/react-elements/modal/Definitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {guid} from "tc-shared/crypto/uid";

let controllerInstance: PokeController;
class PokeController {
    readonly variables: IpcUiVariableProvider<ModalPokeVariables>;
    readonly events: Registry<ModalPokeEvents>;

    private modalInstance: ModalController;

    private registeredEvents: (() => void)[] = [];
    private registeredRecords: PokeRecord[] = [];

    constructor() {
        this.variables = createIpcUiVariableProvider();
        this.events = new Registry<ModalPokeEvents>();

        this.variables.setVariableProvider("pokeList", () => this.registeredRecords);

        this.registeredRecords = [];
        this.registeredEvents.push(server_connections.events().on("notify_handler_deleted", event => {
            /* TODO: Remove such pokes (maybe?) ! */
        }));

        this.modalInstance = spawnModal(
            "modal-poked",
            [ this.events.generateIpcDescription(), this.variables.generateConsumerDescription() ],
            {
                popedOut: false,
                popoutable: true
            }
        );

        this.modalInstance.getEvents().on("destroy", () => {
            if(this.modalInstance) {
                this.modalInstance = undefined;
                this.destroy();
            }
        });
        this.modalInstance.show().then(undefined);

        this.events.on("action_close", () => this.destroy());
    }

    destroy() {
        controllerInstance = undefined;

        this.registeredEvents.forEach(callback => callback());
        this.registeredEvents = [];

        const instance = this.modalInstance;
        this.modalInstance = undefined;
        instance?.destroy();

        this.events.destroy();
        this.variables.destroy();
    }

    registerRecord(record: PokeRecord) {
        this.registeredRecords.push(record);
        this.variables.sendVariable("pokeList");
        this.modalInstance.show().then(undefined);
    }
}

export function spawnPokeModal(handler: ConnectionHandler, client: { clientName: string, clientId: number, clientUniqueId: string }, message: string) {
    if(!controllerInstance) {
        controllerInstance = new PokeController();
    }

    controllerInstance.registerRecord({
        uniqueId: guid(),
        handlerId: handler.handlerId,

        serverName: handler.channelTree.server.properties.virtualserver_name,
        serverUniqueId: handler.channelTree.server.properties.virtualserver_unique_identifier,

        clientName: client.clientName,
        clientId: client.clientId,
        clientUniqueId: client.clientUniqueId,

        timestamp: Date.now(),
        message: message
    });
}