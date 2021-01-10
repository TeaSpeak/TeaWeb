import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {SideHeaderEvents} from "tc-shared/ui/frames/side/HeaderDefinitions";
import {Registry} from "tc-shared/events";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {LocalClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {openMusicManage} from "tc-shared/ui/modal/ModalMusicManage";
import {createErrorModal, createInputModal} from "tc-shared/ui/elements/Modal";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {LogCategory, logError} from "tc-shared/log";

const ChannelInfoUpdateProperties: (keyof ChannelProperties)[] = [
    "channel_name",
    "channel_icon_id",

    "channel_flag_maxclients_unlimited",
    "channel_maxclients",

    "channel_flag_maxfamilyclients_inherited",
    "channel_flag_maxfamilyclients_unlimited",
    "channel_maxfamilyclients"
];

/* TODO: Remove the ping interval handler. It's currently still there since the clients are not emitting the event yet */
export class SideHeaderController {
    readonly uiEvents: Registry<SideHeaderEvents>;

    private connection: ConnectionHandler;

    private listenerConnection: (() => void)[];
    private listenerVoiceChannel: (() => void)[];
    private listenerTextChannel: (() => void)[];

    private currentVoiceChannel: ChannelEntry;
    private currentTextChannel: ChannelEntry;

    private pingUpdateInterval: number;

    constructor() {
        this.uiEvents = new Registry<SideHeaderEvents>();
        this.listenerConnection = [];
        this.listenerVoiceChannel = [];
        this.listenerTextChannel = [];

        this.initialize();
    }

    private initialize() {
        this.uiEvents.on("action_open_conversation", () => {
            const selectedClient = this.connection.getSelectedClientInfo().getClient()
            if(selectedClient) {
                const conversations = this.connection.getPrivateConversations();
                conversations.setSelectedConversation(conversations.findOrCreateConversation(selectedClient));
            }
            this.connection.getSideBar().showPrivateConversations();
        });

        this.uiEvents.on("action_switch_channel_chat", () => {
            this.connection.getSideBar().showChannel();
        });

        this.uiEvents.on("action_bot_manage", () => {
            const client = this.connection.channelTree.getSelectedEntry();
            if(!(client instanceof MusicClientEntry)) {
                return;
            }

            openMusicManage(this.connection, client);
        });

        this.uiEvents.on("action_bot_add_song", () => {
            createInputModal(tr("Enter song URL"), tr("Please enter the target song URL"), text => {
                try {
                    new URL(text);
                    return true;
                } catch(error) {
                    return false;
                }
            }, async result => {
                if(!result) return;

                try {
                    const client = this.connection.channelTree.getSelectedEntry();
                    if(!(client instanceof MusicClientEntry)) {
                        throw tr("Missing music bot");
                    }

                    await this.connection.getPlaylistManager().addSong(client.properties.client_playlist_id, result as string, "any", 0);
                } catch (error) {
                    if(error instanceof CommandResult) {
                        error = error.formattedMessage();
                    } else if(typeof error !== "string") {
                        logError(LogCategory.NETWORKING, tr("Failed to add song to playlist entry: %o"), error);
                        error = tr("Lookup the console for details");
                    }

                    createErrorModal(tr("Failed to add song song"), tra("Failed to add song:\n", error)).open();
                }
            }).open();
        });

        this.uiEvents.on("query_client_info_own_client", () => this.sendClientInfoOwnClient());
        this.uiEvents.on("query_current_channel_state", event => this.sendChannelState(event.mode));
        this.uiEvents.on("query_private_conversations", () => this.sendPrivateConversationInfo());
        this.uiEvents.on("query_ping", () => this.sendPing());
        this.uiEvents.on("query_server_info", () => this.sendServerInfo());
    }

    private initializeConnection() {
        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_moved", event => {
            if(event.client instanceof LocalClientEntry) {
                this.updateVoiceChannel();
            } else {
                if(event.newChannel === this.currentVoiceChannel || event.oldChannel === this.currentVoiceChannel) {
                    this.sendChannelState("voice");
                }

                if(event.newChannel === this.currentTextChannel || event.oldChannel === this.currentTextChannel) {
                    this.sendChannelState("text");
                }
            }
        }));
        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_enter_view", event => {
            if(event.client instanceof LocalClientEntry) {
                this.updateVoiceChannel();
            } else {
                if(event.targetChannel === this.currentVoiceChannel) {
                    this.sendChannelState("voice");
                }
                if(event.targetChannel === this.currentTextChannel) {
                    this.sendChannelState("text");
                }
            }
        }));
        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_leave_view", event => {
            if(event.sourceChannel === this.currentVoiceChannel) {
                this.sendChannelState("voice");
            }

            if(event.sourceChannel === this.currentTextChannel) {
                this.sendChannelState("text");
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
        this.listenerConnection.push(this.connection.getSelectedClientInfo().events.on("notify_client_changed", () => this.sendClientInfoOwnClient()));
        this.listenerConnection.push(this.connection.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_icon_id" in event.updated_properties || "virtualserver_name" in event.updated_properties) {
                this.sendServerInfo();
            }
        }));
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
        }
        this.sendPing();
        this.sendPrivateConversationInfo();
        this.updateVoiceChannel();
        this.updateTextChannel();
    }

    getConnectionHandler() : ConnectionHandler | undefined {
        return this.connection;
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.listenerTextChannel.forEach(callback => callback());
        this.listenerTextChannel = [];

        this.listenerVoiceChannel.forEach(callback => callback());
        this.listenerVoiceChannel = [];

        clearInterval(this.pingUpdateInterval);
        this.pingUpdateInterval = undefined;
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
        if(this.connection) {
            const conversations = this.connection.getPrivateConversations();
            this.uiEvents.fire_react("notify_private_conversations", {
                info: {
                    open: conversations.getConversations().length,
                    unread: conversations.getUnreadCount()
                }
            });
        } else {
            this.uiEvents.fire_react("notify_private_conversations", {
                info: {
                    open: 0,
                    unread: 0
                }
            });
        }
    }

    private sendClientInfoOwnClient() {
        if(this.connection) {
            this.uiEvents.fire_react("notify_client_info_own_client", { isOwnClient: this.connection.getSelectedClientInfo().getClient() instanceof LocalClientEntry });
        } else {
            this.uiEvents.fire_react("notify_client_info_own_client", { isOwnClient: false });
        }
    }

    private sendServerInfo() {
        if(this.connection?.connected) {
            this.uiEvents.fire_react("notify_server_info", {
                info: {
                    name: this.connection.channelTree.server.properties.virtualserver_name,
                    icon: {
                        handlerId: this.connection.handlerId,
                        serverUniqueId: this.connection.getCurrentServerUniqueId(),
                        iconId: this.connection.channelTree.server.properties.virtualserver_icon_id
                    }
                }
            })
        } else {
            this.uiEvents.fire_react("notify_server_info", { info: undefined });
        }
    }
}