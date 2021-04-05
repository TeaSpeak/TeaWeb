import {ConnectionHandler, DisconnectReason} from "./ConnectionHandler";
import {Registry} from "./events";
import {Stage} from "tc-loader";
import * as loader from "tc-loader";
import {assertMainApplication} from "tc-shared/ui/utils";

assertMainApplication();

export interface ConnectionManagerEvents {
    notify_handler_created: {
        handlerId: string,
        handler: ConnectionHandler
    },

    /* This will also trigger when a connection gets deleted. So if you're just interested to connect event handler to the active connection,
        unregister them from the old handler and register them for the new handler every time */
    notify_active_handler_changed: {
        oldHandler: ConnectionHandler | undefined,
        newHandler: ConnectionHandler | undefined,

        oldHandlerId: string | undefined,
        newHandlerId: string | undefined
    },

    /* Will never fire on an active connection handler! */
    notify_handler_deleted: {
        handlerId: string,
        handler: ConnectionHandler
    },

    notify_handler_order_changed: { }
}

export class ConnectionManager {
    private readonly events_: Registry<ConnectionManagerEvents>;
    private connectionHandlers: ConnectionHandler[] = [];
    private activeConnectionHandler: ConnectionHandler | undefined;

    constructor() {
        this.events_ = new Registry<ConnectionManagerEvents>();
        this.events_.enableDebug("connection-manager");

        this.setActiveConnectionHandler(undefined);
    }

    events() : Registry<ConnectionManagerEvents> {
        return this.events_;
    }

    spawnConnectionHandler() : ConnectionHandler {
        const handler = new ConnectionHandler();
        handler.initialize_client_state(this.activeConnectionHandler);
        this.connectionHandlers.push(handler);

        this.events_.fire("notify_handler_created", { handler: handler, handlerId: handler.handlerId });
        return handler;
    }

    destroyConnectionHandler(handler: ConnectionHandler) {
        if(this.connectionHandlers.length <= 1) {
            throw "cannot deleted the last connection handler";
        }

        if(!this.connectionHandlers.remove(handler)) {
            throw "unknown connection handler";
        }

        if(handler.serverConnection) {
            const connected = handler.connected;
            handler.serverConnection.disconnect("handler destroyed");
            handler.handleDisconnect(DisconnectReason.HANDLER_DESTROYED, connected);
        }

        if(handler === this.activeConnectionHandler) {
            this.doSetActiveConnectionHandler(this.connectionHandlers[0]);
        }
        this.events_.fire("notify_handler_deleted", { handler: handler, handlerId: handler.handlerId });

        /* destroy all elements */
        handler.destroy();
    }

    setActiveConnectionHandler(handler: ConnectionHandler) {
        if(handler && this.connectionHandlers.indexOf(handler) == -1) {
            throw "Handler hasn't been registered or is already obsolete!";
        }

        if(handler === this.activeConnectionHandler) {
            return;
        }

        this.doSetActiveConnectionHandler(handler);
    }

    private doSetActiveConnectionHandler(handler: ConnectionHandler) {
        const oldHandler = this.activeConnectionHandler;
        this.activeConnectionHandler = handler;
        this.events_.fire("notify_active_handler_changed", {
            oldHandler: oldHandler,
            newHandler: handler,

            oldHandlerId: oldHandler?.handlerId,
            newHandlerId: handler?.handlerId
        });
    }

    swapHandlerOrder(handlerA: ConnectionHandler, handlerB: ConnectionHandler) {
        const indexA = this.connectionHandlers.findIndex(handler => handlerA === handler);
        const indexB = this.connectionHandlers.findIndex(handler => handlerB === handler);

        if(indexA === -1 || indexB === -1 || indexA === indexB) {
            return;
        }

        let temp = this.connectionHandlers[indexA];
        this.connectionHandlers[indexA] = this.connectionHandlers[indexB];
        this.connectionHandlers[indexB] = temp;
        this.events().fire("notify_handler_order_changed");
    }

    findConnection(handlerId: string) : ConnectionHandler | undefined {
        return this.connectionHandlers.find(e => e.handlerId === handlerId);
    }

    getActiveConnectionHandler() : ConnectionHandler | undefined {
        return this.activeConnectionHandler;
    }

    getAllConnectionHandlers() : ConnectionHandler[] {
        return this.connectionHandlers;
    }
}

export let server_connections: ConnectionManager;
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "server manager init",
    function: async () => {
        server_connections = new ConnectionManager();
        (window as any).server_connections = server_connections;
    },
    priority: 80
});
