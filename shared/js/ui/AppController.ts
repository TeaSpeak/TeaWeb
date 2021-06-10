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
import {AppUiVariables} from "tc-shared/ui/AppDefinitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {SideBarController} from "tc-shared/ui/frames/SideBarController";
import {ServerEventLogController} from "tc-shared/ui/frames/log/Controller";
import {HostBannerController} from "tc-shared/ui/frames/HostBannerController";
import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";

export class AppController {
    private listener: (() => void)[];

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private variables: IpcUiVariableProvider<AppUiVariables>;

    private container: HTMLDivElement;
    private controlBarEvents: Registry<ControlBarEvents>;
    private connectionListEvents: Registry<ConnectionListUIEvents>;

    private sideBarController: SideBarController;
    private serverLogController: ServerEventLogController;
    private hostBannerController: HostBannerController;

    constructor() {
        this.variables = createIpcUiVariableProvider();
        this.variables.setVariableProvider("connectionList", () => this.connectionListEvents.generateIpcDescription());
        this.variables.setVariableProvider("controlBar", () => this.controlBarEvents.generateIpcDescription());
        this.variables.setVariableProvider("hostBanner", () => this.hostBannerController.uiEvents.generateIpcDescription());
        this.variables.setVariableProvider("log", () => this.serverLogController.events.generateIpcDescription());
        this.variables.setVariableProvider("sidebar", () => this.sideBarController.uiEvents.generateIpcDescription());
        this.variables.setVariableProvider("sidebarHeader", () => this.sideBarController.getHeaderController().uiEvents.generateIpcDescription());
        this.variables.setVariableProvider("channelTree", () => ({
            events: this.currentConnection?.channelTree.mainTreeUiEvents.generateIpcDescription(),
            handlerId: this.currentConnection?.handlerId
        }));
        this.variables.setVariableProvider("channelVideo", () => ({
            events: this.currentConnection?.video_frame.getEvents().generateIpcDescription(),
            handlerId: this.currentConnection?.handlerId
        }));

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

        this.variables?.destroy();
        this.variables = undefined;
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

        this.sideBarController = new SideBarController();
        this.serverLogController = new ServerEventLogController();
        this.hostBannerController = new HostBannerController();

        this.listener.push(server_connections.events().on("notify_active_handler_changed", event => this.setConnectionHandler(event.newHandler)));
        this.setConnectionHandler(server_connections.getActiveConnectionHandler());
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

        this.variables.sendVariable("channelTree");
        this.variables.sendVariable("channelVideo");
    }

    renderApp() {
        ReactDOM.render(React.createElement(TeaAppMainView, {
            variables: this.variables.generateConsumerDescription(),
        }), this.container);
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
