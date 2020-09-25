import {ConnectionHandler, DisconnectReason} from "./ConnectionHandler";
import {Registry} from "./events";
import * as top_menu from "./ui/frames/MenuBar";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";

export let server_connections: ConnectionManager;

export class ConnectionManager {
    private readonly event_registry: Registry<ConnectionManagerEvents>;
    private connection_handlers: ConnectionHandler[] = [];
    private active_handler: ConnectionHandler | undefined;

    private _container_log_server: JQuery;
    private _container_channel_tree: JQuery;
    private _container_hostbanner: JQuery;
    private _container_chat: JQuery;

    constructor() {
        this.event_registry = new Registry<ConnectionManagerEvents>();
        this.event_registry.enableDebug("connection-manager");

        this._container_log_server = $("#server-log");
        this._container_channel_tree = $("#channelTree");
        this._container_hostbanner = $("#hostbanner");
        this._container_chat = $("#chat");

        this.set_active_connection(undefined);
    }

    events() : Registry<ConnectionManagerEvents> {
        return this.event_registry;
    }

    spawn_server_connection() : ConnectionHandler {
        const handler = new ConnectionHandler();
        handler.initialize_client_state(this.active_handler);
        this.connection_handlers.push(handler);

        this.event_registry.fire("notify_handler_created", { handler: handler, handlerId: handler.handlerId });
        return handler;
    }

    destroy_server_connection(handler: ConnectionHandler) {
        if(this.connection_handlers.length <= 1)
            throw "cannot deleted the last connection handler";

        if(!this.connection_handlers.remove(handler))
            throw "unknown connection handler";

        if(handler.serverConnection) {
            const connected = handler.connected;
            handler.serverConnection.disconnect("handler destroyed");
            handler.handleDisconnect(DisconnectReason.HANDLER_DESTROYED, connected);
        }

        if(handler === this.active_handler)
            this.set_active_connection_(this.connection_handlers[0]);
        this.event_registry.fire("notify_handler_deleted", { handler: handler, handlerId: handler.handlerId });

        /* destroy all elements */
        handler.destroy();
    }

    set_active_connection(handler: ConnectionHandler) {
        if(handler && this.connection_handlers.indexOf(handler) == -1)
            throw "Handler hasn't been registered or is already obsolete!";
        if(handler === this.active_handler)
            return;
        this.set_active_connection_(handler);
    }

    private set_active_connection_(handler: ConnectionHandler) {
        this._container_channel_tree.children().detach();
        this._container_chat.children().detach();
        this._container_log_server.children().detach();
        this._container_hostbanner.children().detach();

        if(handler) {
            this._container_hostbanner.append(handler.hostbanner.html_tag);
            this._container_channel_tree.append(handler.channelTree.tag_tree());
            this._container_chat.append(handler.side_bar.html_tag());
            this._container_log_server.append(handler.log.getHTMLTag());
        }
        const old_handler = this.active_handler;
        this.active_handler = handler;
        this.event_registry.fire("notify_active_handler_changed", {
            oldHandler: old_handler,
            newHandler: handler,

            oldHandlerId: old_handler?.handlerId,
            newHandlerId: handler?.handlerId
        });
        old_handler?.events().fire("notify_visibility_changed", { visible: false });
        handler?.events().fire("notify_visibility_changed", { visible: true });

        top_menu.update_state(); //FIXME: Top menu should listen to our events!
    }

    findConnection(handlerId: string) : ConnectionHandler | undefined {
        return this.connection_handlers.find(e => e.handlerId === handlerId);
    }

    active_connection() : ConnectionHandler | undefined {
        return this.active_handler;
    }

    all_connections() : ConnectionHandler[] {
        return this.connection_handlers;
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
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "server manager init",
    function: async () => {
        server_connections = new ConnectionManager();
    },
    priority: 80
});
