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
import {SideBarController} from "tc-shared/ui/frames/SideBarController";
import {ServerEventLogController} from "tc-shared/ui/frames/log/Controller";
import {HostBannerController} from "tc-shared/ui/frames/HostBannerController";

export class AppController {
    private uiEvents: Registry<AppUiEvents>;

    private listener: (() => void)[];

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private container: HTMLDivElement;
    private controlBarEvents: Registry<ControlBarEvents>;
    private connectionListEvents: Registry<ConnectionListUIEvents>;

    private sideBarController: SideBarController;
    private serverLogController: ServerEventLogController;
    private hostBannerController: HostBannerController;

    constructor() {
        this.uiEvents = new Registry<AppUiEvents>();
        this.uiEvents.on("query_channel_tree", () => this.notifyChannelTree());
        this.uiEvents.on("query_video_container", () => this.notifyVideoContainer());

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

        this.sideBarController?.destroy();
        this.sideBarController = undefined;

        this.serverLogController?.destroy();
        this.serverLogController = undefined;

        this.hostBannerController?.destroy();
        this.hostBannerController = undefined;

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
        this.setConnectionHandler(server_connections.getActiveConnectionHandler());

        this.sideBarController = new SideBarController();
        this.serverLogController = new ServerEventLogController();
        this.hostBannerController = new HostBannerController();
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.currentConnection === connection) {
            return;
        }

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];
        this.currentConnection = connection;

        this.sideBarController.setConnection(connection);
        this.serverLogController.setConnectionHandler(connection);
        this.hostBannerController.setConnectionHandler(connection);

        this.notifyChannelTree();
        this.notifyVideoContainer();
    }

    renderApp() {
        ReactDOM.render(React.createElement(TeaAppMainView, {
            controlBar: this.controlBarEvents,
            connectionList: this.connectionListEvents,
            sidebar: this.sideBarController.uiEvents,
            sidebarHeader: this.sideBarController.getHeaderController().uiEvents,
            log: this.serverLogController.events,
            events: this.uiEvents,
            hostBanner: this.hostBannerController.uiEvents
        }), this.container);
    }

    private notifyChannelTree() {
        this.uiEvents.fire_react("notify_channel_tree", {
            handlerId: this.currentConnection?.handlerId,
            events: this.currentConnection?.channelTree.mainTreeUiEvents
        });
    }

    private notifyVideoContainer() {
        this.uiEvents.fire_react("notify_video_container", {
            container: this.currentConnection?.video_frame.getContainer()
        });
    }
}

export let appViewController: AppController;
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
