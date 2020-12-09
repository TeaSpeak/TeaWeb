import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as ReactDOM from "react-dom";
import {SideHeaderRenderer} from "./HeaderRenderer";
import * as React from "react";
import {SideHeaderEvents, SideHeaderState} from "tc-shared/ui/frames/side/HeaderDefinitions";
import * as _ from "lodash";
import {Registry} from "tc-shared/events";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ClientEntry, LocalClientEntry} from "tc-shared/tree/Client";
import {openMusicManage} from "tc-shared/ui/modal/ModalMusicManage";

const ChannelInfoUpdateProperties: (keyof ChannelProperties)[] = [
    "channel_name",
    "channel_icon_id",

    "channel_flag_maxclients_unlimited",
    "channel_maxclients",

    "channel_flag_maxfamilyclients_inherited",
    "channel_flag_maxfamilyclients_unlimited",
    "channel_maxfamilyclients"
];

/* TODO: Remove the ping interval handler. It's currently still there since the clients are not emiting the event yet */
export class SideHeader {
    private readonly htmlTag: HTMLDivElement;
    private readonly uiEvents: Registry<SideHeaderEvents>;

    private connection: ConnectionHandler;

    private listenerConnection: (() => void)[];
    private listenerVoiceChannel: (() => void)[];
    private listenerTextChannel: (() => void)[];

    private currentState: SideHeaderState;
    private currentVoiceChannel: ChannelEntry;
    private currentTextChannel: ChannelEntry;

    private pingUpdateInterval: number;

    constructor() {
        this.uiEvents = new Registry<SideHeaderEvents>();
        this.listenerConnection = [];
        this.listenerVoiceChannel = [];
        this.listenerTextChannel = [];

        this.htmlTag = document.createElement("div");
        this.htmlTag.style.display = "flex";
        this.htmlTag.style.flexDirection = "column";
        this.htmlTag.style.flexShrink = "0";
        this.htmlTag.style.flexGrow = "0";

        ReactDOM.render(React.createElement(SideHeaderRenderer, { events: this.uiEvents }), this.htmlTag);
        this.initialize();
    }

    private initialize() {
        this.uiEvents.on("action_open_conversation", () => {
            const selectedClient = this.connection.side_bar.getClientInfo().getClient()
            if(selectedClient) {
                const conversations = this.connection.getPrivateConversations();
                conversations.setSelectedConversation(conversations.findOrCreateConversation(selectedClient));
            }
            this.connection.side_bar.showPrivateConversations();
        });

        this.uiEvents.on("action_switch_channel_chat", () => {
            this.connection.side_bar.showChannelConversations();
        });

        this.uiEvents.on("action_bot_manage", () => {
            const bot = this.connection.side_bar.music_info().current_bot();
            if(!bot) return;

            openMusicManage(this.connection, bot);
        });

        this.uiEvents.on("action_bot_manage", () => this.connection.side_bar.music_info().events.fire("action_song_add"));

        this.uiEvents.on("query_current_channel_state", event => this.sendChannelState(event.mode));
        this.uiEvents.on("query_private_conversations", () => this.sendPrivateConversationInfo());
        this.uiEvents.on("query_ping", () => this.sendPing());
    }

    private initializeConnection() {
        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_moved", event => {
            if(event.client instanceof LocalClientEntry) {
                this.updateVoiceChannel();
            }
        }));
        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_enter_view", event => {
            if(event.client instanceof LocalClientEntry) {
                this.updateVoiceChannel();
            }
        }));
        this.listenerConnection.push(this.connection.events().on("notify_connection_state_changed", () => {
            this.updateVoiceChannel();
            this.updateTextChannel();
            this.sendPing();
            if(this.connection.connected) {
                if(!this.pingUpdateInterval) {
                    this.pingUpdateInterval = setInterval(() => this.sendPing(), 2000);
                }
            } else if(this.pingUpdateInterval) {
                clearInterval(this.pingUpdateInterval);
                this.pingUpdateInterval = undefined;
            }
        }));
        this.listenerConnection.push(this.connection.getChannelConversations().events.on("notify_selected_changed", () => this.updateTextChannel()));
        this.listenerConnection.push(this.connection.serverConnection.events.on("notify_ping_updated", () => this.sendPing()));
        this.listenerConnection.push(this.connection.getPrivateConversations().events.on("notify_unread_count_changed", () => this.sendPrivateConversationInfo()));
        this.listenerConnection.push(this.connection.getPrivateConversations().events.on(["notify_conversation_destroyed", "notify_conversation_destroyed"], () => this.sendPrivateConversationInfo()));
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.connection === connection) {
            return;
        }

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.connection = connection;
        if(connection) {
            this.initializeConnection();
            /* TODO: Update state! */
        } else {
            this.setState({ state: "none" });
        }
    }

    getConnectionHandler() : ConnectionHandler | undefined {
        return this.connection;
    }

    getHtmlTag() : HTMLDivElement {
        return this.htmlTag;
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.htmlTag);

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.listenerTextChannel.forEach(callback => callback());
        this.listenerTextChannel = [];

        this.listenerVoiceChannel.forEach(callback => callback());
        this.listenerVoiceChannel = [];

        clearInterval(this.pingUpdateInterval);
        this.pingUpdateInterval = undefined;
    }

    setState(state: SideHeaderState) {
        if(_.isEqual(this.currentState, state)) {
            return;
        }

        this.currentState = state;
        this.uiEvents.fire_react("notify_header_state", { state: state });
    }

    private sendChannelState(mode: "voice" | "text") {
        const channel = mode === "voice" ? this.currentVoiceChannel : this.currentTextChannel;
        if(channel) {
            let maxClients = -1;
            if(!channel.properties.channel_flag_maxclients_unlimited) {
                maxClients = channel.properties.channel_maxclients;
            }

            this.uiEvents.fire_react("notify_current_channel_state", {
                mode: mode,
                state: {
                    state: "connected",
                    channelName: channel.parsed_channel_name.text,
                    channelIcon: {
                        handlerId: this.connection.handlerId,
                        serverUniqueId: this.connection.getCurrentServerUniqueId(),
                        iconId: channel.properties.channel_icon_id
                    },
                    channelUserCount: channel.clients(false).length,
                    channelMaxUser: maxClients
                }
            });
        } else {
            this.uiEvents.fire_react("notify_current_channel_state", { mode: mode, state: { state: "not-connected" }});
        }
    }

    private updateVoiceChannel() {
        let targetChannel = this.connection?.connected ? this.connection.getClient().currentChannel() : undefined;
        if(this.currentVoiceChannel === targetChannel) {
            return;
        }

        this.listenerVoiceChannel.forEach(callback => callback());
        this.listenerVoiceChannel = [];

        this.currentVoiceChannel = targetChannel;
        this.sendChannelState("voice");

        if(targetChannel) {
            this.listenerTextChannel.push(targetChannel.events.on("notify_properties_updated", event => {
                for(const key of ChannelInfoUpdateProperties) {
                    if(key in event.updated_properties) {
                        this.sendChannelState("voice");
                        return;
                    }
                }
            }));
        }
    }

    private updateTextChannel() {
        let targetChannel: ChannelEntry;
        let targetChannelId = this.connection?.connected ? parseInt(this.connection.getChannelConversations().getSelectedConversation()?.getChatId()) : -1;
        if(!isNaN(targetChannelId) && targetChannelId >= 0) {
            targetChannel = this.connection.channelTree.findChannel(targetChannelId);
        }

        if(this.currentTextChannel === targetChannel) {
            return;
        }

        this.listenerTextChannel.forEach(callback => callback());
        this.listenerTextChannel = [];

        this.currentTextChannel = targetChannel;
        this.sendChannelState("text");


        if(targetChannel) {
            this.listenerTextChannel.push(targetChannel.events.on("notify_properties_updated", event => {
                for(const key of ChannelInfoUpdateProperties) {
                    if(key in event.updated_properties) {
                        this.sendChannelState("text");
                        return;
                    }
                }
            }));
        }
    }

    private sendPing() {
        if(this.connection?.connected) {
            const ping = this.connection.getServerConnection().ping();
            this.uiEvents.fire_react("notify_ping", {
                ping: {
                    native: typeof ping.native !== "number" ? -1 : ping.native,
                    javaScript: ping.javascript
                }
            });
        } else {
            this.uiEvents.fire_react("notify_ping", { ping: undefined });
        }
    }

    private sendPrivateConversationInfo() {
        const conversations = this.connection.getPrivateConversations();
        this.uiEvents.fire_react("notify_private_conversations", {
            info: {
                open: conversations.getConversations().length,
                unread: conversations.getUnreadCount()
            }
        });
    }
}