import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export interface ServerConnectionFactory {
    create(client: ConnectionHandler) : AbstractServerConnection;
    destroy(instance: AbstractServerConnection);
}

let factoryInstance: ServerConnectionFactory;
export function setServerConnectionFactory(factory: ServerConnectionFactory) {
    factoryInstance = factory;
}

export function getServerConnectionFactory() : ServerConnectionFactory {
    if(!factoryInstance) {
        throw "server connection factory hasn't been set";
    }

    return factoryInstance;
}