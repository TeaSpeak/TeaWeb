import {ChannelTree, ChannelTreeEvents} from "tc-shared/tree/ChannelTree";
import {ChannelTreeEntry as ChannelTreeEntryModel, ChannelTreeEntryEvents} from "tc-shared/tree/ChannelTreeEntry";
import {EventHandler, Registry} from "tc-shared/events";
import {
    ChannelIcons,
    ChannelTreeEntry,
    ChannelTreeUIEvents,
    ClientTalkIconState,
    ServerState
} from "tc-shared/ui/tree/Definitions";
import {ChannelTreeRenderer} from "./Renderer";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {LogCategory, logWarn} from "tc-shared/log";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ClientEntry, ClientProperties, ClientType, LocalClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {ConnectionEvents, ConnectionState} from "tc-shared/ConnectionHandler";
import {VoiceConnectionEvents, VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {spawnFileTransferModal} from "tc-shared/ui/modal/transfer/ModalFileTransfer";
import {GroupManager, GroupManagerEvents} from "tc-shared/permission/GroupManager";
import {ServerEntry} from "tc-shared/tree/Server";
import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";

export function renderChannelTree(channelTree: ChannelTree, target: HTMLElement) {
    const events = new Registry<ChannelTreeUIEvents>();
    events.enableDebug("channel-tree-view");
    initializeTreeController(events, channelTree);

    ReactDOM.render([
        <ChannelTreeRenderer handlerId={channelTree.client.handlerId} events={events} />
        //<TreeEntryMove key={"move"} onMoveEnd={(point) => this.onMoveEnd(point.x, point.y)} ref={this.view_move} />
    ], target);

    (window as any).chan_pop = () => {
        const events = new Registry<ChannelTreeUIEvents>();
        events.enableDebug("channel-tree-view-modal");
        initializeTreeController(events, channelTree);
        const modal = spawnExternalModal("channel-tree", events, { handlerId: channelTree.client.handlerId });
        modal.show();
    }
}

/* FIXME: Client move is not a part of the channel tree, it's part of our own controller here */
const ChannelIconUpdateKeys: (keyof ChannelProperties)[] = [
    "channel_name",
    "channel_flag_password",

    "channel_maxclients",
    "channel_flag_maxclients_unlimited",

    "channel_maxfamilyclients",
    "channel_flag_maxfamilyclients_inherited",
    "channel_flag_maxfamilyclients_unlimited",
];

const ChannelIconsUpdateKeys: (keyof ChannelProperties)[] = [
    "channel_icon_id",
    "channel_codec",
    "channel_flag_default",
    "channel_flag_password",
    "channel_needed_talk_power",
];

const ClientNameInfoUpdateKeys: (keyof ClientProperties)[] = [
    "client_nickname",
    "client_away_message",
    "client_away",
    "client_channel_group_id",
    "client_servergroups"
];

const ClientTalkStatusUpdateKeys: (keyof ClientProperties)[] = [
    "client_is_talker",
    "client_talk_power",
    "client_talk_request",
    "client_talk_request_msg",
    "client_talk_power"
]

class ChannelTreeController {
    readonly events: Registry<ChannelTreeUIEvents>;
    readonly channelTree: ChannelTree;

    /* the key here is the unique entry id! */
    private eventListeners: {[key: number]: (() => void)[]} = {};
    private channelTreeInitialized = false;

    private readonly connectionStateListener;
    private readonly voiceConnectionStateListener;
    private readonly groupUpdatedListener;
    private readonly groupsReceivedListener;

    constructor(events, channelTree) {
        this.events = events;
        this.channelTree = channelTree;

        this.connectionStateListener = this.handleConnectionStateChanged.bind(this);
        this.voiceConnectionStateListener = this.handleVoiceConnectionStateChanged.bind(this);
        this.groupUpdatedListener = this.handleGroupsUpdated.bind(this);
        this.groupsReceivedListener = this.handleGroupsReceived.bind(this);
    }

    initialize() {
        this.channelTree.client.events().on("notify_connection_state_changed", this.connectionStateListener);
        this.channelTree.client.serverConnection.getVoiceConnection().events.on("notify_connection_status_changed", this.voiceConnectionStateListener);
        this.channelTree.client.groups.events.on("notify_groups_updated", this.groupUpdatedListener);
        this.channelTree.client.groups.events.on("notify_groups_received", this.groupsReceivedListener);
        this.initializeServerEvents(this.channelTree.server);

        this.channelTree.events.register_handler(this);
        this.channelTree.channels.forEach(channel => this.initializeChannelEvents(channel));
        this.channelTree.clients.forEach(client => this.initializeClientEvents(client));
    }

    destroy() {
        this.channelTree.client.events().off("notify_connection_state_changed", this.connectionStateListener);
        this.channelTree.client.serverConnection.getVoiceConnection().events.off("notify_connection_status_changed", this.voiceConnectionStateListener);
        this.channelTree.client.groups.events.off("notify_groups_updated", this.groupUpdatedListener);
        this.channelTree.client.groups.events.off("notify_groups_received", this.groupsReceivedListener);
        this.finalizeEvents(this.channelTree.server);

        this.channelTree.events.unregister_handler(this);
        Object.values(this.eventListeners).forEach(callbacks => callbacks.forEach(callback => callback()));
        this.eventListeners = {};
    }

    private handleConnectionStateChanged(event: ConnectionEvents["notify_connection_state_changed"]) {
        if(event.new_state !== ConnectionState.CONNECTED) {
            this.channelTreeInitialized = false;
            this.sendChannelTreeEntries();
        }
        this.sendServerStatus(this.channelTree.server);
    }

    private handleVoiceConnectionStateChanged(event: VoiceConnectionEvents["notify_connection_status_changed"]) {
        if(event.newStatus !== VoiceConnectionStatus.Connected && event.oldStatus !== VoiceConnectionStatus.Connected) {
            return;
        }

        if(!this.channelTreeInitialized) {
            return;
        }

        this.channelTree.channels.forEach(channel => this.sendChannelIcons(channel));
    }

    private handleGroupsUpdated(event: GroupManagerEvents["notify_groups_updated"]) {
        if(!this.channelTreeInitialized) {
            return;
        }

        for(const update of event.updates) {
            if(update.key === "name-mode" || update.key === "name") {
                /* TODO: Only test if the client actually has the group (prevent twice updates than as well)? */
                this.channelTree.clients.forEach(client => this.sendClientNameInfo(client));
                break;
            }
        }

        for(const update of event.updates) {
            if(update.key === "icon" || update.key === "sort-id") {
                /* TODO: Only test if the client actually has the group (prevent twice updates than as well)? */
                this.channelTree.clients.forEach(client => this.sendClientIcons(client));
                break;
            }
        }
    }

    private handleGroupsReceived() {
        if(!this.channelTreeInitialized) {
            return;
        }

        this.channelTree.clients.forEach(channel => this.sendClientNameInfo(channel));
        this.channelTree.clients.forEach(client => this.sendClientIcons(client));
    }

    /* general channel tree event handlers */
    @EventHandler<ChannelTreeEvents>("notify_channel_list_received")
    private handleChannelListReceived() {
        this.channelTreeInitialized = true;
        this.channelTree.channels.forEach(channel => this.initializeChannelEvents(channel));
        this.channelTree.clients.forEach(channel => this.initializeClientEvents(channel));
        this.sendChannelTreeEntries();
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_created")
    private handleChannelCreated(event: ChannelTreeEvents["notify_channel_created"]) {
        if(!this.channelTreeInitialized) { return; }
        this.initializeChannelEvents(event.channel);
        this.sendChannelTreeEntries();
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_deleted")
    private handleChannelDeleted(event: ChannelTreeEvents["notify_channel_deleted"]) {
        if(!this.channelTreeInitialized) { return; }
        this.finalizeEvents(event.channel);
        this.sendChannelTreeEntries();
    }

    @EventHandler<ChannelTreeEvents>("notify_client_enter_view")
    private handleClientEnter(event: ChannelTreeEvents["notify_client_enter_view"]) {
        if(!this.channelTreeInitialized) { return; }

        this.initializeClientEvents(event.client);
        this.sendChannelInfo(event.targetChannel);
        this.sendChannelStatusIcon(event.targetChannel);
        this.sendChannelTreeEntries();
    }

    @EventHandler<ChannelTreeEvents>("notify_client_leave_view")
    private handleClientLeave(event: ChannelTreeEvents["notify_client_leave_view"]) {
        if(!this.channelTreeInitialized) { return; }

        this.finalizeEvents(event.client);
        this.sendChannelInfo(event.sourceChannel);
        this.sendChannelStatusIcon(event.sourceChannel);
        this.sendChannelTreeEntries();
    }

    @EventHandler<ChannelTreeEvents>("notify_client_moved")
    private handleClientMoved(event: ChannelTreeEvents["notify_client_moved"]) {
        if(!this.channelTreeInitialized) { return; }

        this.sendChannelInfo(event.oldChannel);
        this.sendChannelStatusIcon(event.oldChannel);

        this.sendChannelInfo(event.newChannel);
        this.sendChannelStatusIcon(event.newChannel);
        this.sendChannelTreeEntries();
    }

    /* entry event handlers */
    private initializeTreeEntryEvents<T extends ChannelTreeEntryEvents>(entry: ChannelTreeEntryModel<T>, events: any[]) {
        events.push(entry.events.on("notify_unread_state_change", event => {
            this.events.fire("notify_unread_state", { unread: event.unread, treeEntryId: entry.uniqueEntryId });
        }));

        events.push(entry.events.on("notify_select_state_change", event => {
            this.events.fire("notify_select_state", { selected: event.selected, treeEntryId: entry.uniqueEntryId });
        }));
    }

    private initializeChannelEvents(channel: ChannelEntry) {
        this.finalizeEvents(channel);
        const events = this.eventListeners[channel.uniqueEntryId] = [];

        this.initializeTreeEntryEvents(channel, events);
        events.push(channel.events.on("notify_collapsed_state_changed", () => {
            this.sendChannelInfo(channel);
            this.sendChannelTreeEntries();
        }));

        events.push(channel.events.on("notify_properties_updated", event => {
            for (const key of ChannelIconUpdateKeys) {
                if (key in event.updated_properties) {
                    this.sendChannelInfo(channel);
                    break;
                }
            }

            for (const key of ChannelIconsUpdateKeys) {
                if (key in event.updated_properties) {
                    this.sendChannelIcons(channel);
                    break;
                }
            }

            if("channel_needed_talk_power" in event.updated_properties) {
                channel.clients(false).forEach(client => this.sendClientTalkStatus(client));
            }
        }));

        events.push(channel.events.on("notify_cached_password_updated", () => {
            this.sendChannelStatusIcon(channel);
        }));

        events.push(channel.events.on("notify_subscribe_state_changed", () => {
            this.sendChannelStatusIcon(channel);
        }));
    }

    private initializeClientEvents(client: ClientEntry) {
        this.finalizeEvents(client);
        const events = this.eventListeners[client.uniqueEntryId] = [];
        this.initializeTreeEntryEvents(client, events);

        events.push(client.events.on("notify_status_icon_changed", event => {
            this.events.fire("notify_client_status", { treeEntryId: client.uniqueEntryId, status: event.newIcon });
        }));

        events.push(client.events.on("notify_properties_updated", event => {
            for (const key of ClientNameInfoUpdateKeys) {
                if (key in event.updated_properties) {
                    this.sendClientNameInfo(client);
                    break;
                }
            }

            for (const key of ClientTalkStatusUpdateKeys) {
                if (key in event.updated_properties) {
                    this.sendClientTalkStatus(client);
                    break;
                }
            }

            if("client_servergroups" in event.updated_properties || "client_channel_group_id" in event.updated_properties || "client_icon_id" in event.updated_properties) {
                this.sendClientIcons(client);
            }
        }));
    }

    private initializeServerEvents(server: ServerEntry) {
        this.finalizeEvents(server);
        const events = this.eventListeners[server.uniqueEntryId] = [];
        this.initializeTreeEntryEvents(server, events);

        events.push(server.events.on("notify_properties_updated", event => {
            if("virtualserver_name" in event.updated_properties || "virtualserver_icon_id" in event.updated_properties) {
                this.sendServerStatus(server);
            }
        }));
    }

    private finalizeEvents<T extends ChannelTreeEntryEvents>(entry: ChannelTreeEntryModel<T>) {
        if(this.eventListeners[entry.uniqueEntryId]) {
            this.eventListeners[entry.uniqueEntryId].forEach(callback => callback());
        }
        delete this.eventListeners[entry.uniqueEntryId];
    }

    /* notify state update methods */
    public sendChannelTreeEntries() {
        const entries = [] as ChannelTreeEntry[];

        /* at first comes the server */
        entries.push({ type: "server", entryId: this.channelTree.server.uniqueEntryId, depth: 0 });

        const buildSubTree = (channel: ChannelEntry, depth: number) => {
            entries.push({ type: "channel", entryId: channel.uniqueEntryId, depth: depth });
            if(channel.collapsed) {
                return;
            }

            let clients = channel.channelClientsOrdered();
            if(!this.channelTree.areServerQueriesShown()) {
                clients = clients.filter(client => client.properties.client_type_exact !== ClientType.CLIENT_QUERY);
            }

            entries.push(...clients.map(client => { return {
                type: client instanceof LocalClientEntry ? "client-local" : "client",
                depth: depth + 1,
                entryId: client.uniqueEntryId
            } as ChannelTreeEntry }));
            channel.children(false).forEach(channel => buildSubTree(channel, depth + 1));
        };

        this.channelTree.rootChannel().forEach(entry => buildSubTree(entry, 1));

        this.events.fire_async("notify_tree_entries", { entries: entries });
    }

    public sendChannelInfo(channel: ChannelEntry) {
        this.events.fire_async("notify_channel_info", {
            treeEntryId: channel.uniqueEntryId,
            info: {
                collapsedState: channel.child_channel_head || channel.channelClientsOrdered().length > 0 ? channel.collapsed ? "collapsed" : "expended" : "unset",
                name: channel.parsed_channel_name.text,
                nameStyle: channel.parsed_channel_name.alignment
            }
        })
    }

    public sendChannelStatusIcon(channel: ChannelEntry) {
        this.events.fire_async("notify_channel_icon", { icon: channel.getStatusIcon(), treeEntryId: channel.uniqueEntryId });
    }

    public sendChannelIcons(channel: ChannelEntry) {
        let icons: ChannelIcons = {
            musicQuality: channel.properties.channel_codec === 3 || channel.properties.channel_codec === 5,
            codecUnsupported: true,
            default: channel.properties.channel_flag_default,
            moderated: channel.properties.channel_needed_talk_power !== 0,
            passwordProtected: channel.properties.channel_flag_password,
            channelIcon: {
                iconId: channel.properties.channel_icon_id,
                serverUniqueId: this.channelTree.client.getCurrentServerUniqueId()
            }
        };

        const voiceConnection = this.channelTree.client.serverConnection.getVoiceConnection();
        const voiceState = voiceConnection.getConnectionState();

        switch (voiceState) {
            case VoiceConnectionStatus.Connected:
                icons.codecUnsupported = !voiceConnection.decodingSupported(channel.properties.channel_codec);
                break;

            default:
                icons.codecUnsupported = true;
        }

        this.events.fire_async("notify_channel_icons", { icons: icons, treeEntryId: channel.uniqueEntryId });
    }

    public sendClientNameInfo(client: ClientEntry) {
        let prefix = [];
        let suffix = [];
        for(const groupId of client.assignedServerGroupIds()) {
            const group = this.channelTree.client.groups.findServerGroup(groupId);
            if(!group) {
                continue;
            }

            if(group.properties.namemode === 1) {
                prefix.push(group.name);
            } else if(group.properties.namemode === 2) {
                suffix.push(group.name);
            }
        }

        const channelGroup = this.channelTree.client.groups.findChannelGroup(client.assignedChannelGroup());
        if(channelGroup) {
            if(channelGroup.properties.namemode === 1) {
                prefix.push(channelGroup.name);
            } else if(channelGroup.properties.namemode === 2) {
                suffix.push(channelGroup.name);
            }
        }

        const afkMessage = client.properties.client_away ? client.properties.client_away_message : undefined;
        this.events.fire_async("notify_client_name", {
            info: {
                name: client.clientNickName(),
                awayMessage: afkMessage,
                prefix: prefix,
                suffix: suffix
            },
            treeEntryId: client.uniqueEntryId
        });
    }

    public sendClientIcons(client: ClientEntry) {
        const uniqueServerId = this.channelTree.client.getCurrentServerUniqueId();

        const serverGroupIcons = client.assignedServerGroupIds()
            .map(groupId => this.channelTree.client.groups.findServerGroup(groupId))
            .filter(group => !!group && group.properties.iconid !== 0)
            .sort(GroupManager.sorter())
            .map(group => { return { iconId: group.properties.iconid, groupName: group.name, groupId: group.id, serverUniqueId: uniqueServerId }; });

        const channelGroupIcon = [client.assignedChannelGroup()]
            .map(groupId => this.channelTree.client.groups.findChannelGroup(groupId))
            .filter(group => !!group && group.properties.iconid !== 0)
            .map(group => { return { iconId: group.properties.iconid, groupName: group.name, groupId: group.id, serverUniqueId: uniqueServerId }; });

        const clientIcon = client.properties.client_icon_id === 0 ? [] : [client.properties.client_icon_id];
        this.events.fire_async("notify_client_icons", {
            icons: {
                serverGroupIcons: serverGroupIcons,
                channelGroupIcon: channelGroupIcon[0],
                clientIcon: clientIcon.length > 0 ? { iconId: clientIcon[0], serverUniqueId: uniqueServerId } : undefined
            },
            treeEntryId: client.uniqueEntryId
        });
    }

    public sendClientTalkStatus(client: ClientEntry) {
        let status: ClientTalkIconState = "unset";

        if(client.properties.client_is_talker) {
            status = "granted";
        } else if(client.properties.client_talk_power < client.currentChannel().properties.channel_needed_talk_power) {
            status = "prohibited";

            if(client.properties.client_talk_request !== 0) {
                status = "requested";
            }
        }

        this.events.fire_async("notify_client_talk_status", { treeEntryId: client.uniqueEntryId, requestMessage: client.properties.client_talk_request_msg, status: status });
    }

    public sendServerStatus(serverEntry: ServerEntry) {
        let status: ServerState;

        switch (this.channelTree.client.connection_state) {
            case ConnectionState.AUTHENTICATING:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                status = {
                    state: "connecting",
                    targetAddress: serverEntry.remote_address.host + (serverEntry.remote_address.port === 9987 ? "" : `:${serverEntry.remote_address.port}`)
                };
                break;

            case ConnectionState.DISCONNECTING:
            case ConnectionState.UNCONNECTED:
                status = { state: "disconnected" };
                break;

            case ConnectionState.CONNECTED:
                status = {
                    state: "connected",
                    name: serverEntry.properties.virtualserver_name,
                    icon: { iconId: serverEntry.properties.virtualserver_icon_id, serverUniqueId: serverEntry.properties.virtualserver_unique_identifier }
                };
                break;
        }

        this.events.fire_async("notify_server_state", { treeEntryId: serverEntry.uniqueEntryId, state: status });
    }
}

function initializeTreeController(events: Registry<ChannelTreeUIEvents>, channelTree: ChannelTree) {
    /* initialize the general update handler */
    const controller = new ChannelTreeController(events, channelTree);
    controller.initialize();
    events.on("notify_destroy", () => controller.destroy());

    /* initialize the query handlers */

    events.on("query_unread_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the unread state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        events.fire_async("notify_unread_state", { treeEntryId: event.treeEntryId, unread: entry.isUnread() });
    });

    events.on("query_select_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the select state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        events.fire_async("notify_select_state", { treeEntryId: event.treeEntryId, selected: entry.isSelected() });
    });

    events.on("notify_destroy", channelTree.client.events().on("notify_visibility_changed", event => events.fire("notify_visibility_changed", event)));

    events.on("query_tree_entries", () => controller.sendChannelTreeEntries());
    events.on("query_channel_info", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the channel state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendChannelInfo(entry);
    });
    events.on("query_channel_icon", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the channels status icon of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendChannelStatusIcon(entry);
    });
    events.on("query_channel_icons", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the channels icons of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendChannelIcons(entry);
    });
    events.on("query_client_status", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the client status of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        events.fire_async("notify_client_status", { treeEntryId: entry.uniqueEntryId, status: entry.getStatusIcon() });
    });
    events.on("query_client_name", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the client name of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendClientNameInfo(entry);
    });
    events.on("query_client_icons", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the client icons of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendClientIcons(entry);
    });
    events.on("query_client_talk_status", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the client talk status of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendClientTalkStatus(entry);
    });
    events.on("query_server_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ServerEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the server state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        controller.sendServerStatus(entry);
    });

    events.on("action_set_collapsed_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to set the collapsed state state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        entry.collapsed = event.state === "collapsed";
    });

    events.on("action_select", event => {
        if(!event.ignoreClientMove && channelTree.isClientMoveActive()) {
            return;
        }

        const entries = [];
        for(const entryId of event.entryIds) {
            const entry = channelTree.findEntryId(entryId);
            if(!entry) {
                logWarn(LogCategory.CHANNEL, tr("Tried to select an invalid tree entry with id %o. Skipping entry."), entryId);
                continue;
            }

            entries.push(entry);
        }

        channelTree.events.fire("action_select_entries", {
            mode: event.mode,
            entries: entries
        });
    });

    events.on("action_show_context_menu", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Tried to open a context menu for an invalid channel tree entry with id %o"), event.treeEntryId);
            return;
        }

        if (channelTree.selection.is_multi_select() && entry.isSelected()) {
            channelTree.open_multiselect_context_menu(channelTree.selection.selected_entries, event.pageX, event.pageY);
            return;
        }

        channelTree.events.fire("action_select_entries", {
            entries: [entry],
            mode: "exclusive"
        });
        entry.showContextMenu(event.pageX, event.pageY);
    });

    events.on("action_channel_join", event => {
        if(!event.ignoreMultiSelect && channelTree.selection.is_multi_select()) {
            return;
        }

        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to join an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        entry.joinChannel();
    });

    events.on("action_channel_open_file_browser", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to open the file browser for an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        channelTree.events.fire("action_select_entries", {
            entries: [entry],
            mode: "exclusive"
        });
        spawnFileTransferModal(entry.channelId);
    });

    events.on("action_client_double_click", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to execute a double click action for an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        if(channelTree.selection.is_multi_select()) {
            return;
        }

        if (entry instanceof LocalClientEntry) {
            entry.openRename(events);
        } else if (entry instanceof MusicClientEntry) {
            /* no action defined yet */
        } else {
            entry.open_text_chat();
        }
    });


    events.on("action_client_name_submit", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof LocalClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Having a client nickname submit notify for an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        events.fire("notify_client_name_edit", { treeEntryId: event.treeEntryId, initialValue: undefined });
        if(!event.name || event.name === entry.clientNickName()) { return; }

        entry.renameSelf(event.name).then(result => {
            if(result) { return; }
            events.fire("notify_client_name_edit", { treeEntryId: event.treeEntryId, initialValue: event.name });
        })
    });

    events.on("notify_client_name_edit_failed", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof LocalClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Having a client nickname edit failed notify for an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        switch (event.reason) {
            case "scroll-to":
                entry.openRenameModal();
                break;
        }
    });
}