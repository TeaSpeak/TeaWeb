import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {ChannelBarMode, ChannelBarUiEvents} from "tc-shared/ui/frames/side/ChannelBarDefinitions";
import {ChannelEntry, ChannelSidebarMode} from "tc-shared/tree/Channel";
import {ChannelConversationController} from "tc-shared/ui/frames/side/ChannelConversationController";
import {ChannelDescriptionController} from "tc-shared/ui/frames/side/ChannelDescriptionController";
import {LocalClientEntry} from "tc-shared/tree/Client";
import {ChannelFileBrowserController} from "tc-shared/ui/frames/side/ChannelFileBrowserController";

export class ChannelBarController {
    readonly uiEvents: Registry<ChannelBarUiEvents>;

    private channelConversations: ChannelConversationController;
    private description: ChannelDescriptionController;
    private fileBrowser: ChannelFileBrowserController;

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    private currentChannel: ChannelEntry;
    private listenerChannel: (() => void)[];

    constructor() {
        this.uiEvents = new Registry<ChannelBarUiEvents>();
        this.listenerConnection = [];
        this.listenerChannel = [];

        this.channelConversations = new ChannelConversationController();
        this.description = new ChannelDescriptionController();
        this.fileBrowser = new ChannelFileBrowserController();

        this.uiEvents.on("query_mode", () => this.notifyChannelMode());
        this.uiEvents.on("query_channel_id", () => this.notifyChannelId());
        this.uiEvents.on("query_data", event => this.notifyModeData(event.mode));
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.listenerChannel.forEach(callback => callback());
        this.listenerChannel = [];

        this.currentChannel = undefined;
        this.currentConnection = undefined;

        this.fileBrowser?.destroy();
        this.fileBrowser = undefined;

        this.channelConversations?.destroy();
        this.channelConversations = undefined;

        this.description?.destroy();
        this.description = undefined;

        this.uiEvents.destroy();
    }

    setConnectionHandler(handler: ConnectionHandler) {
        if(this.currentConnection === handler) {
            return;
        }

        this.channelConversations.setConnectionHandler(handler);
        this.fileBrowser.setConnectionHandler(handler);

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.currentConnection = handler;

        const selectedEntry = handler?.channelTree.getSelectedEntry();
        if(selectedEntry instanceof ChannelEntry) {
            this.setChannel(selectedEntry);
        } else {
            this.setChannel(undefined);
        }

        if(handler) {
            this.listenerConnection.push(handler.channelTree.events.on("notify_selected_entry_changed", event => {
                if(event.newEntry instanceof ChannelEntry) {
                    this.setChannel(event.newEntry);
                }
            }));

            this.listenerConnection.push(handler.channelTree.events.on("notify_client_moved", event => {
                if(event.client instanceof LocalClientEntry) {
                    if(event.oldChannel === this.currentChannel || event.newChannel === this.currentChannel) {
                        /* The mode may changed since we can now write in the channel */
                        this.notifyChannelMode();
                    }
                }
            }));

            this.listenerConnection.push(handler.getChannelConversations().events.on("notify_cross_conversation_support_changed", () => {
                this.notifyChannelMode();
            }));
        }
    }

    private setChannel(channel: ChannelEntry) {
        if(this.currentChannel === channel) {
            return;
        }

        this.fileBrowser.setChannel(channel);
        this.description.setChannel(channel);

        this.listenerChannel.forEach(callback => callback());
        this.listenerChannel = [];

        this.currentChannel = channel;
        this.notifyChannelId();

        if(channel) {
            this.listenerChannel.push(channel.events.on("notify_properties_updated", event => {
                if("channel_sidebar_mode" in event.updated_properties) {
                    this.notifyChannelMode();
                }
            }));
        }
    }

    private notifyChannelId() {
        this.uiEvents.fire_react("notify_channel_id", {
            channelId: this.currentChannel ? this.currentChannel.channelId : -1,
            handlerId: this.currentConnection ? this.currentConnection.handlerId : "unbound"
        });
    }

    private notifyChannelMode() {
        let mode: ChannelBarMode = "none";

        if(this.currentChannel) {
            switch(this.currentChannel.properties.channel_sidebar_mode) {
                case ChannelSidebarMode.Description:
                    mode = "description";
                    break;

                case ChannelSidebarMode.FileTransfer:
                    mode = "file-transfer";
                    break;

                case ChannelSidebarMode.Conversation:
                    mode = "conversation";
                    break;

                case ChannelSidebarMode.Unknown:
                default:
                    if(this.currentConnection) {
                        const channelConversation = this.currentConnection.getChannelConversations();
                        if(channelConversation.hasCrossConversationSupport() || this.currentChannel === this.currentConnection.getClient().currentChannel()) {
                            mode = "conversation";
                        } else {
                            /* A really old TeaSpeak server or a TeamSpeak server. */
                            mode = "description";
                        }
                    } else {
                        mode = "none";
                    }
                    break;
            }
        }

        this.uiEvents.fire_react("notify_mode", { mode: mode });
    }

    private notifyModeData(mode: ChannelBarMode) {
        switch (mode) {
            case "none":
                this.uiEvents.fire_react("notify_data", { content: "none", data: {} });
                break;

            case "conversation":
                this.uiEvents.fire_react("notify_data", {
                    content: "conversation",
                    data: {
                        events: this.channelConversations.getUiEvents()
                    }
                });
                break;

            case "description":
                this.uiEvents.fire_react("notify_data", {
                    content: "description",
                    data: {
                        events: this.description.uiEvents
                    }
                });
                break;

            case "file-transfer":
                this.uiEvents.fire_react("notify_data", {
                    content: "file-transfer",
                    data: {
                        events: this.fileBrowser.uiEvents
                    }
                });
                break;
        }
    }
}