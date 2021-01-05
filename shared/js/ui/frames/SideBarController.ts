import {ConnectionHandler} from "../../ConnectionHandler";
import {PrivateConversationController} from "./side/PrivateConversationController";
import {ClientInfoController} from "tc-shared/ui/frames/side/ClientInfoController";
import {SideHeaderController} from "tc-shared/ui/frames/side/HeaderController";
import {SideBarEvents, SideBarType} from "tc-shared/ui/frames/SideBarDefinitions";
import {Registry} from "tc-shared/events";
import {LogCategory, logWarn} from "tc-shared/log";
import {ChannelBarController} from "tc-shared/ui/frames/side/ChannelBarController";
import {MusicBotController} from "tc-shared/ui/frames/side/MusicBotController";

export class SideBarController {
    readonly uiEvents: Registry<SideBarEvents>;

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private header: SideHeaderController;
    private clientInfo: ClientInfoController;
    private privateConversations: PrivateConversationController;
    private channelBar: ChannelBarController;
    private musicPanel: MusicBotController;

    constructor() {
        this.listenerConnection = [];

        this.uiEvents = new Registry<SideBarEvents>();
        this.uiEvents.on("query_content", () => this.sendContent());
        this.uiEvents.on("query_content_data", event => this.sendContentData(event.content));

        this.musicPanel = new MusicBotController();
        this.channelBar = new ChannelBarController();
        this.privateConversations = new PrivateConversationController();
        this.clientInfo = new ClientInfoController();
        this.header = new SideHeaderController();
    }

    setConnection(connection: ConnectionHandler) {
        if(this.currentConnection === connection) {
            return;
        }

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.currentConnection = connection;
        this.header.setConnectionHandler(connection);
        this.clientInfo.setConnectionHandler(connection);
        this.privateConversations.setConnectionHandler(connection);
        this.channelBar.setConnectionHandler(connection);
        this.musicPanel.setConnection(connection);

        if(connection) {
            this.listenerConnection.push(connection.getSideBar().events.on("notify_content_type_changed", () => this.sendContent()));
        }

        this.sendContent();
    }

    destroy() {
        this.header?.destroy();
        this.header = undefined;

        this.musicPanel?.destroy();
        this.musicPanel = undefined;

        this.channelBar?.destroy();
        this.channelBar = undefined;

        this.clientInfo?.destroy();
        this.clientInfo = undefined;

        this.privateConversations?.destroy();
        this.privateConversations = undefined;
    }

    renderInto(container: HTMLDivElement) {
        /*
        ReactDOM.render(React.createElement(SideBarRenderer, {
            events: this.uiEvents,
            eventsHeader: this.header["uiEvents"],
        }), container);
        */
    }

    getMusicController() : MusicBotController {
        return this.musicPanel;
    }

    getHeaderController() : SideHeaderController {
        return this.header;
    }

    private sendContent() {
        if(this.currentConnection) {
            this.uiEvents.fire("notify_content", { content: this.currentConnection.getSideBar().getSideBarContent() });
        } else {
            this.uiEvents.fire("notify_content", { content: "none" });
        }
    }

    private sendContentData(content: SideBarType) {
        switch (content) {
            case "none":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "none",
                    data: {}
                });
                break;

            case "channel":
                if(!this.currentConnection) {
                    logWarn(LogCategory.GENERAL, tr("Received channel chat content data request without an active connection."));
                    return;
                }

                this.uiEvents.fire_react("notify_content_data", {
                    content: "channel",
                    data: {
                        events: this.channelBar.uiEvents,
                    }
                });
                break;

            case "server":
                this.uiEvents.fire_react("notify_content_data", {
                    content: "server",
                    data: this.currentConnection ? {
                        chatEvents: this.channelBar.getChannelConversationController().getUiEvents(),
                        handlerId: this.currentConnection.handlerId
                    } : undefined
                });
                break;

            case "private-chat":
                if(!this.currentConnection) {
                    logWarn(LogCategory.GENERAL, tr("Received private chat content data request without an active connection."));
                    return;
                }

                this.uiEvents.fire_react("notify_content_data", {
                    content: "private-chat",
                    data: {
                        events: this.privateConversations["uiEvents"],
                        handlerId: this.currentConnection.handlerId
                    }
                });
                break;

            case "client-info":
                if(!this.currentConnection) {
                    logWarn(LogCategory.GENERAL, tr("Received client info content data request without an active connection."));
                    return;
                }

                this.uiEvents.fire_react("notify_content_data", {
                    content: "client-info",
                    data: {
                        events: this.clientInfo["uiEvents"],
                    }
                });
                break;

            case "music-manage":
                if(!this.currentConnection) {
                    logWarn(LogCategory.GENERAL, tr("Received music bot content data request without an active connection."));
                    return;
                }

                this.uiEvents.fire_react("notify_content_data", {
                    content: "music-manage",
                    data: {
                        botEvents: this.musicPanel.getBotUiEvents(),
                        playlistEvents: this.musicPanel.getPlaylistUiEvents()
                    }
                });
                break;
        }
    }
}