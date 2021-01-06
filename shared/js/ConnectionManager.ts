import {ConnectionHandler, DisconnectReason} from "./ConnectionHandler";
import {Registry} from "./events";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";

export let server_connections: ConnectionManager;

class ReplaceableContainer {
    placeholder: HTMLDivElement;
    container: HTMLDivElement;

    constructor(container: HTMLDivElement, placeholder?: HTMLDivElement) {
        this.container = container;
        this.placeholder = placeholder || document.createElement("div");
    }

    replaceWith(target: HTMLDivElement | undefined) {
        target = target || this.placeholder;
        this.container.replaceWith(target);
        this.container = target;
    }
}

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

    private containerChannelVideo: ReplaceableContainer;

    constructor() {
        this.events_ = new Registry<ConnectionManagerEvents>();
        this.events_.enableDebug("connection-manager");

        /* FIXME! */
        this.containerChannelVideo = new ReplaceableContainer(document.getElementById("channel-video") as HTMLDivElement);
        this.set_active_connection(undefined);
    }

    events() : Registry<ConnectionManagerEvents> {
        return this.events_;
    }

    spawn_server_connection() : ConnectionHandler {
        const handler = new ConnectionHandler();
        handler.initialize_client_state(this.activeConnectionHandler);
        this.connectionHandlers.push(handler);

        this.events_.fire("notify_handler_created", { handler: handler, handlerId: handler.handlerId });
        return handler;
    }

    destroy_server_connection(handler: ConnectionHandler) {
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
            this.set_active_connection_(this.connectionHandlers[0]);
        }
        this.events_.fire("notify_handler_deleted", { handler: handler, handlerId: handler.handlerId });

        /* destroy all elements */
        handler.destroy();
    }

    set_active_connection(handler: ConnectionHandler) {
        if(handler && this.connectionHandlers.indexOf(handler) == -1) {
            throw "Handler hasn't been registered or is already obsolete!";
        }

        if(handler === this.activeConnectionHandler) {
            return;
        }

        this.set_active_connection_(handler);
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

    private set_active_connection_(handler: ConnectionHandler) {
/*
        this.containerChannelVideo.replaceWith(handler?.video_frame.getContainer());
*/

        const oldHandler = this.activeConnectionHandler;
        this.activeConnectionHandler = handler;
        this.events_.fire("notify_active_handler_changed", {
            oldHandler: oldHandler,
            newHandler: handler,

            oldHandlerId: oldHandler?.handlerId,
            newHandlerId: handler?.handlerId
        });
        oldHandler?.events().fire("notify_visibility_changed", { visible: false });
        handler?.events().fire("notify_visibility_changed", { visible: true });
    }

    findConnection(handlerId: string) : ConnectionHandler | undefined {
        return this.connectionHandlers.find(e => e.handlerId === handlerId);
    }

    active_connection() : ConnectionHandler | undefined {
        return this.activeConnectionHandler;
    }

    all_connections() : ConnectionHandler[] {
        return this.connectionHandlers;
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "server manager init",
    function: async () => {
        server_connections = new ConnectionManager();
    },
    priority: 80
});
