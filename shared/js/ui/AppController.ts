import * as React from "react";
import * as ReactDOM from "react-dom";
import {Registry} from "tc-shared/events";
import {ControlBarEvents} from "tc-shared/ui/frames/control-bar/Definitions";
import {initializeControlBarController} from "tc-shared/ui/frames/control-bar/Controller";
import {TeaAppMainView} from "tc-shared/ui/AppRenderer";
import {ConnectionListUIEvents} from "tc-shared/ui/frames/connection-handler-list/Definitions";
import {initializeConnectionListController} from "tc-shared/ui/frames/connection-handler-list/Controller";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {server_connections} from "tc-shared/ConnectionManager";
import {AppUiEvents} from "tc-shared/ui/AppDefinitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export class AppController {
    private uiEvents: Registry<AppUiEvents>;

    private listener: (() => void)[];

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private container: HTMLDivElement;
    private controlBarEvents: Registry<ControlBarEvents>;
    private connectionListEvents: Registry<ConnectionListUIEvents>;

    constructor() {
        this.uiEvents = new Registry<AppUiEvents>();
        this.uiEvents.on("query_channel_tree", () => this.notifyChannelTree());

        this.listener = [];
    }

    destroy() {
        this.listener?.forEach(callback => callback());
        this.listener = [];

        ReactDOM.unmountComponentAtNode(this.container);
        this.container.remove();
        this.container = undefined;

        this.controlBarEvents?.fire("notify_destroy");
        this.controlBarEvents?.destroy();
        this.controlBarEvents = undefined;

        this.connectionListEvents?.fire("notify_destroy");
        this.connectionListEvents?.destroy();
        this.connectionListEvents = undefined;

        this.uiEvents?.destroy();
        this.uiEvents = undefined;
    }

    initialize() {
        this.listener = [];

        this.container = document.createElement("div");
        this.container.classList.add("app-container");
        document.body.append(this.container);

        this.controlBarEvents = new Registry<ControlBarEvents>()
        initializeControlBarController(this.controlBarEvents, "main");

        this.connectionListEvents = new Registry<ConnectionListUIEvents>();
        initializeConnectionListController(this.connectionListEvents);

        this.listener.push(server_connections.events().on("notify_active_handler_changed", event => this.setConnectionHandler(event.newHandler)));
        this.setConnectionHandler(server_connections.active_connection());
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.currentConnection === connection) {
            return;
        }

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];
        this.currentConnection = connection;

        this.notifyChannelTree();
    }

    renderApp() {
        ReactDOM.render(React.createElement(TeaAppMainView, {
            controlBar: this.controlBarEvents,
            connectionList: this.connectionListEvents,
            sidebar: server_connections.getSidebarController().uiEvents,
            sidebarHeader: server_connections.getSidebarController().getHeaderController().uiEvents,
            log: server_connections.serverLogController.events,
            events: this.uiEvents,
            hostBanner: server_connections.hostBannerController.uiEvents
        }), this.container);
    }

    private notifyChannelTree() {
        this.uiEvents.fire_react("notify_channel_tree", {
            handlerId: this.currentConnection?.handlerId,
            events: this.currentConnection?.channelTree.mainTreeUiEvents
        });
    }
}

let appViewController: AppController;
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "app view",
    function: async () => {
        appViewController = new AppController();
        appViewController.initialize();
        appViewController.renderApp();

        (window as any).AppController = AppController;
        (window as any).appViewController = appViewController;
    },
    priority: 0
});
