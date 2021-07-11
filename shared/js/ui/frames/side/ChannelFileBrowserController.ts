import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {channelPathPrefix, FileBrowserEvents} from "tc-shared/ui/modal/transfer/FileDefinitions";
import {initializeRemoteFileBrowserController} from "tc-shared/ui/modal/transfer/FileBrowserControllerRemote";
import {ChannelFileBrowserUiEvents} from "tc-shared/ui/frames/side/ChannelFileBrowserDefinitions";
import {ChannelEntry} from "tc-shared/tree/Channel";

export class ChannelFileBrowserController {
    readonly uiEvents: Registry<ChannelFileBrowserUiEvents>;

    private currentConnection: ConnectionHandler;
    private remoteBrowseEvents: Registry<FileBrowserEvents>;

    private currentChannel: ChannelEntry;

    constructor() {
        this.uiEvents = new Registry<ChannelFileBrowserUiEvents>();
        this.uiEvents.on("query_events", () => this.notifyEvents());
    }

    destroy() {
        this.currentChannel = undefined;
        this.setConnectionHandler(undefined);
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.currentConnection === connection) {
            return;
        }

        if(this.remoteBrowseEvents) {
            this.remoteBrowseEvents.fire("notify_destroy");
            this.remoteBrowseEvents.destroy();
        }

        this.currentConnection = connection;

        if(connection) {
            this.remoteBrowseEvents = new Registry<FileBrowserEvents>();
            initializeRemoteFileBrowserController(connection, this.remoteBrowseEvents);
        }

        this.setChannel(undefined);
        this.notifyEvents();
    }

    setChannel(channel: ChannelEntry | undefined) {
        if(channel === this.currentChannel) {
            return;
        }

        this.currentChannel = channel;

        if(channel) {
            this.remoteBrowseEvents?.fire("action_navigate_to", { path: "/" + channelPathPrefix + channel.channelId + "/" });
        } else {
            this.remoteBrowseEvents?.fire("action_navigate_to", { path: "/" });
        }
    }

    private notifyEvents() {
        this.uiEvents.fire_react("notify_events", { browserEvents: this.remoteBrowseEvents.generateIpcDescription(), channelId: this.currentChannel?.channelId });
    }
}