import {ServerConnectionFactory, setServerConnectionFactory} from "tc-shared/connection/ConnectionFactory";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {AbstractServerConnection} from "tc-shared/connection/ConnectionBase";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ServerConnection} from "../connection/ServerConnection";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 50,
    name: "server connection factory setup",
    function: async () => {
        setServerConnectionFactory(new class implements ServerConnectionFactory {
            create(client: ConnectionHandler): AbstractServerConnection {
                return new ServerConnection(client);
            }

            destroy(instance: AbstractServerConnection) {
                if(!(instance instanceof ServerConnection))
                    throw "invalid handle";

                instance.destroy();
            }
        });
    }
});