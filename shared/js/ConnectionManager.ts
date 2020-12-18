import {ConnectionHandler, DisconnectReason} from "./ConnectionHandler";
import {Registry} from "./events";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {FooterRenderer} from "tc-shared/ui/frames/footer/Renderer";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {SideBarController} from "tc-shared/ui/frames/SideBarController";
import {ServerEventLogController} from "tc-shared/ui/frames/log/Controller";
import {ServerLogFrame} from "tc-shared/ui/frames/log/Renderer";

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

export class ConnectionManager {
    private readonly event_registry: Registry<ConnectionManagerEvents>;
    private connection_handlers: ConnectionHandler[] = [];
    private active_handler: ConnectionHandler | undefined;

    private _container_channel_tree: JQuery;
    private _container_hostbanner: JQuery;
    private containerChannelVideo: ReplaceableContainer;
    private containerSideBar: HTMLDivElement;
    private containerFooter: HTMLDivElement;
    private containerServerLog: HTMLDivElement;

    private sideBarController: SideBarController;
    private serverLogController: ServerEventLogController;

    constructor() {
        this.event_registry = new Registry<ConnectionManagerEvents>();
        this.event_registry.enableDebug("connection-manager");

        this.sideBarController = new SideBarController();
        this.serverLogController = new ServerEventLogController();

        this.containerChannelVideo = new ReplaceableContainer(document.getElementById("channel-video") as HTMLDivElement);
        this.containerServerLog = document.getElementById("server-log") as HTMLDivElement;
        this.containerFooter = document.getElementById("container-footer") as HTMLDivElement;
        this._container_channel_tree = $("#channelTree");
        this._container_hostbanner = $("#hostbanner");

        this.sideBarController.renderInto(document.getElementById("chat") as HTMLDivElement);
        this.set_active_connection(undefined);
    }

    initializeReactComponents() {
        ReactDOM.render(React.createElement(FooterRenderer), this.containerFooter);
        ReactDOM.render(React.createElement(ServerLogFrame, { events: this.serverLogController.events }), this.containerServerLog);
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

    swapHandlerOrder(handlerA: ConnectionHandler, handlerB: ConnectionHandler) {
        const indexA = this.connection_handlers.findIndex(handler => handlerA === handler);
        const indexB = this.connection_handlers.findIndex(handler => handlerB === handler);

        if(indexA === -1 || indexB === -1 || indexA === indexB) {
            return;
        }

        let temp = this.connection_handlers[indexA];
        this.connection_handlers[indexA] = this.connection_handlers[indexB];
        this.connection_handlers[indexB] = temp;
        this.events().fire("notify_handler_order_changed");
    }

    private set_active_connection_(handler: ConnectionHandler) {
        this.sideBarController.setConnection(handler);
        this.serverLogController.setConnectionHandler(handler);

        this._container_channel_tree.children().detach();
        this._container_hostbanner.children().detach();
        this.containerChannelVideo.replaceWith(handler?.video_frame.getContainer());

        if(handler) {
            this._container_hostbanner.append(handler.hostbanner.html_tag);
            this._container_channel_tree.append(handler.channelTree.tag_tree());
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
    },

    notify_handler_order_changed: { }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "server manager init",
    function: async () => {
        server_connections = new ConnectionManager();
        server_connections.initializeReactComponents();
    },
    priority: 80
});
