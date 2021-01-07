import {ChannelTree, ChannelTreeEvents} from "tc-shared/tree/ChannelTree";
import {ChannelTreeEntry as ChannelTreeEntryModel, ChannelTreeEntryEvents} from "tc-shared/tree/ChannelTreeEntry";
import {EventHandler, Registry} from "tc-shared/events";
import {
    ChannelEntryInfo,
    ChannelIcons,
    ChannelTreeUIEvents, ClientIcons, ClientNameInfo,
    ClientTalkIconState, FullChannelTreeEntry,
    ServerState
} from "tc-shared/ui/tree/Definitions";
import * as React from "react";
import {LogCategory, logWarn} from "tc-shared/log";
import {ChannelEntry, ChannelProperties} from "tc-shared/tree/Channel";
import {ClientEntry, ClientProperties, ClientType, LocalClientEntry, MusicClientEntry} from "tc-shared/tree/Client";
import {ConnectionEvents, ConnectionState} from "tc-shared/ConnectionHandler";
import {VoiceConnectionEvents, VoiceConnectionStatus} from "tc-shared/connection/VoiceConnection";
import {spawnFileTransferModal} from "tc-shared/ui/modal/transfer/ModalFileTransfer";
import {GroupManager, GroupManagerEvents} from "tc-shared/permission/GroupManager";
import {ServerEntry} from "tc-shared/tree/Server";

export interface ChannelTreeRendererOptions {
    popoutButton: boolean;
}

export function initializeChannelTreeUiEvents(channelTree: ChannelTree, options: ChannelTreeRendererOptions) : Registry<ChannelTreeUIEvents> {
    const events = new Registry<ChannelTreeUIEvents>();
    events.enableDebug("channel-tree-view");
    initializeChannelTreeController(events, channelTree, options);
    return events;
}

function generateServerStatus(serverEntry: ServerEntry) : ServerState {
    switch (serverEntry.channelTree.client.connection_state) {
        case ConnectionState.AUTHENTICATING:
        case ConnectionState.CONNECTING:
        case ConnectionState.INITIALISING:
            return {
                state: "connecting",
                targetAddress: serverEntry.remote_address.host + (serverEntry.remote_address.port === 9987 ? "" : `:${serverEntry.remote_address.port}`)
            };

        case ConnectionState.DISCONNECTING:
        case ConnectionState.UNCONNECTED:
            return { state: "disconnected" };

        case ConnectionState.CONNECTED:
            return {
                state: "connected",
                name: serverEntry.properties.virtualserver_name,
                icon: { iconId: serverEntry.properties.virtualserver_icon_id, serverUniqueId: serverEntry.properties.virtualserver_unique_identifier }
            };
    }
}

function generateClientTalkStatus(client: ClientEntry) : { status: ClientTalkIconState, requestMessage?: string } {
    let status: ClientTalkIconState = "unset";

    if(client.properties.client_is_talker) {
        status = "granted";
    } else if(client.properties.client_talk_power < client.currentChannel().properties.channel_needed_talk_power) {
        status = "prohibited";

        if(client.properties.client_talk_request !== 0) {
            status = "requested";
        }
    }

    return {
        requestMessage: client.properties.client_talk_request_msg,
        status: status
    }
}

function generateClientIcons(client: ClientEntry) : ClientIcons {
    const uniqueServerId = client.channelTree.client.getCurrentServerUniqueId();

    const serverGroupIcons = client.assignedServerGroupIds()
        .map(groupId => client.channelTree.client.groups.findServerGroup(groupId))
        .filter(group => !!group && group.properties.iconid !== 0)
        .sort(GroupManager.sorter())
        .map(group => {
            return {
                iconId: group.properties.iconid,
                groupName: group.name,
                groupId: group.id,
                serverUniqueId: uniqueServerId
            };
        });

    const channelGroupIcon = [client.assignedChannelGroup()]
        .map(groupId => client.channelTree.client.groups.findChannelGroup(groupId))
        .filter(group => !!group && group.properties.iconid !== 0)
        .map(group => {
            return {
                iconId: group.properties.iconid,
                groupName: group.name,
                groupId: group.id,
                serverUniqueId: uniqueServerId
            };
        });

    const clientIcon = client.properties.client_icon_id === 0 ? [] : [client.properties.client_icon_id];
    return {
        serverGroupIcons: serverGroupIcons,
        channelGroupIcon: channelGroupIcon[0],
        clientIcon: clientIcon.length > 0 ? { iconId: clientIcon[0], serverUniqueId: uniqueServerId } : undefined
    };
}

function generateClientNameInfo(client: ClientEntry) : ClientNameInfo {
    let prefix = [];
    let suffix = [];
    for(const groupId of client.assignedServerGroupIds()) {
        const group = client.channelTree.client.groups.findServerGroup(groupId);
        if(!group) {
            continue;
        }

        if(group.properties.namemode === 1) {
            prefix.push(group.name);
        } else if(group.properties.namemode === 2) {
            suffix.push(group.name);
        }
    }

    const channelGroup = client.channelTree.client.groups.findChannelGroup(client.assignedChannelGroup());
    if(channelGroup) {
        if(channelGroup.properties.namemode === 1) {
            prefix.push(channelGroup.name);
        } else if(channelGroup.properties.namemode === 2) {
            suffix.push(channelGroup.name);
        }
    }

    const afkMessage = client.properties.client_away ? client.properties.client_away_message : undefined;
    return {
        name: client.clientNickName(),
        awayMessage: afkMessage,
        prefix: prefix,
        suffix: suffix
    };
}

function generateChannelIcons(channel: ChannelEntry) : ChannelIcons {
    let icons: ChannelIcons = {
        musicQuality: channel.properties.channel_codec === 3 || channel.properties.channel_codec === 5,
        codecUnsupported: true,
        default: channel.properties.channel_flag_default,
        moderated: channel.properties.channel_needed_talk_power !== 0,
        passwordProtected: channel.properties.channel_flag_password,
        channelIcon: {
            iconId: channel.properties.channel_icon_id,
            serverUniqueId: channel.channelTree.client.getCurrentServerUniqueId()
        }
    };

    const voiceConnection = channel.channelTree.client.serverConnection.getVoiceConnection();
    const voiceState = voiceConnection.getConnectionState();

    switch (voiceState) {
        case VoiceConnectionStatus.Connected:
            icons.codecUnsupported = !voiceConnection.decodingSupported(channel.properties.channel_codec);
            break;

        default:
            icons.codecUnsupported = true;
    }

    return icons;
}

function generateChannelInfo(channel: ChannelEntry) : ChannelEntryInfo {
    return {
        collapsedState: channel.child_channel_head || channel.channelClientsOrdered().length > 0 ? channel.isCollapsed() ? "collapsed" : "expended" : "unset",
        name: channel.parsed_channel_name.text,
        nameStyle: channel.parsed_channel_name.alignment
    };
}

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
    readonly options: ChannelTreeRendererOptions;

    /* the key here is the unique entry id! */
    private eventListeners: {[key: number]: (() => void)[]} = {};

    private readonly connectionStateListener;
    private readonly voiceConnectionStateListener;
    private readonly groupUpdatedListener;
    private readonly groupsReceivedListener;

    constructor(events, channelTree, options: ChannelTreeRendererOptions) {
        this.events = events;
        this.channelTree = channelTree;
        this.options = options;

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

        if(this.channelTree.channelsInitialized) {
            this.handleChannelListReceived();
        }
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
        if(event.newState !== ConnectionState.CONNECTED) {
            this.channelTree.channelsInitialized = false;
            this.sendChannelTreeEntriesFull([]);
        }
        this.sendServerStatus(this.channelTree.server);
    }

    private handleVoiceConnectionStateChanged(event: VoiceConnectionEvents["notify_connection_status_changed"]) {
        if(event.newStatus !== VoiceConnectionStatus.Connected && event.oldStatus !== VoiceConnectionStatus.Connected) {
            return;
        }

        if(!this.channelTree.channelsInitialized) {
            return;
        }

        /* Quicker than sending info for every client & channel */
        this.sendChannelTreeEntriesFull(undefined);
    }

    private handleGroupsUpdated(event: GroupManagerEvents["notify_groups_updated"]) {
        if(!this.channelTree.channelsInitialized) {
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
        if(!this.channelTree.channelsInitialized) {
            return;
        }

        /* Faster than just sending each stuff individual */
        this.sendChannelTreeEntriesFull(undefined);
    }

    /* general channel tree event handlers */
    @EventHandler<ChannelTreeEvents>("notify_popout_state_changed")
    private handlePopoutStateChanged() {
        this.sendPopoutState();
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_list_received")
    private handleChannelListReceived() {
        this.channelTree.channelsInitialized = true;
        this.channelTree.channels.forEach(channel => this.initializeChannelEvents(channel));
        this.channelTree.clients.forEach(channel => this.initializeClientEvents(channel));
        this.sendChannelTreeEntriesFull(undefined);
        this.sendSelectedEntry();
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_created")
    private handleChannelCreated(event: ChannelTreeEvents["notify_channel_created"]) {
        if(!this.channelTree.channelsInitialized) { return; }
        this.initializeChannelEvents(event.channel);
        this.sendChannelTreeEntriesFull([event.channel.uniqueEntryId]);
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_moved")
    private handleChannelMoved(event: ChannelTreeEvents["notify_channel_moved"]) {
        if(!this.channelTree.channelsInitialized) { return; }
        this.sendChannelTreeEntriesFull([]);

        if(event.previousParent && !event.previousParent.child_channel_head) {
            /* the collapsed state arrow changed */
            this.sendChannelInfo(event.previousParent);
        }
        if(event.channel.parent_channel()) {
            /* the collapsed state arrow may changed */
            this.sendChannelInfo(event.channel.parent_channel());
        }
    }

    @EventHandler<ChannelTreeEvents>("notify_channel_deleted")
    private handleChannelDeleted(event: ChannelTreeEvents["notify_channel_deleted"]) {
        if(!this.channelTree.channelsInitialized) { return; }
        this.finalizeEvents(event.channel);
        this.sendChannelTreeEntriesFull([]);
    }

    @EventHandler<ChannelTreeEvents>("notify_client_enter_view")
    private handleClientEnter(event: ChannelTreeEvents["notify_client_enter_view"]) {
        if(!this.channelTree.channelsInitialized) { return; }

        this.initializeClientEvents(event.client);
        this.sendChannelInfo(event.targetChannel);
        this.sendChannelStatusIcon(event.targetChannel);
        this.sendChannelTreeEntriesFull([event.client.uniqueEntryId]);
    }

    @EventHandler<ChannelTreeEvents>("notify_client_leave_view")
    private handleClientLeave(event: ChannelTreeEvents["notify_client_leave_view"]) {
        if(!this.channelTree.channelsInitialized) { return; }

        this.finalizeEvents(event.client);
        this.sendChannelInfo(event.sourceChannel);
        this.sendChannelStatusIcon(event.sourceChannel);
        this.sendChannelTreeEntriesFull([]);
    }

    @EventHandler<ChannelTreeEvents>("notify_client_moved")
    private handleClientMoved(event: ChannelTreeEvents["notify_client_moved"]) {
        if(!this.channelTree.channelsInitialized) { return; }

        this.sendChannelInfo(event.oldChannel);
        this.sendChannelStatusIcon(event.oldChannel);

        this.sendChannelInfo(event.newChannel);
        this.sendChannelStatusIcon(event.newChannel);
        this.sendChannelTreeEntriesFull([]);

        this.sendClientTalkStatus(event.client);
    }

    @EventHandler<ChannelTreeEvents>("notify_selected_entry_changed")
    private handleSelectedEntryChanged(_event: ChannelTreeEvents["notify_selected_entry_changed"]) {
        if(!this.channelTree.channelsInitialized) { return; }

        this.sendSelectedEntry();
    }

    /* entry event handlers */
    private initializeTreeEntryEvents<T extends ChannelTreeEntryEvents>(entry: ChannelTreeEntryModel<T>, events: any[]) {
        events.push(entry.events.on("notify_unread_state_change", event => {
            this.events.fire_react("notify_unread_state", { unread: event.unread, treeEntryId: entry.uniqueEntryId });
        }));
    }

    private initializeChannelEvents(channel: ChannelEntry) {
        this.finalizeEvents(channel);
        const events = this.eventListeners[channel.uniqueEntryId] = [];

        this.initializeTreeEntryEvents(channel, events);
        events.push(channel.events.on("notify_collapsed_state_changed", () => {
            this.sendChannelInfo(channel);
            this.sendChannelTreeEntriesFull([]);
        }));

        events.push(channel.events.on("notify_properties_updated", event => {
            if("channel_name" in event.updated_properties) {
                this.sendChannelInfo(channel);
            }

            for (const key of ChannelIconUpdateKeys) {
                if (key in event.updated_properties) {
                    this.sendChannelStatusIcon(channel);
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
            this.events.fire_react("notify_client_status", { treeEntryId: client.uniqueEntryId, status: event.newIcon });
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
    public sendPopoutState() {
        this.events.fire_react("notify_popout_state", {
            showButton: this.options.popoutButton,
            shown: this.channelTree.popoutController.hasBeenPopedOut()
        });
    }

    private buildFlatChannelTree() : { entry: ChannelTreeEntryModel<any>, depth: number }[] {
        const entries: { entry: ChannelTreeEntryModel<any>, depth: number }[] = [];

        /* at first comes the server */
        entries.push({ entry: this.channelTree.server, depth: 0 });

        const buildSubTree = (channel: ChannelEntry, depth: number) => {
            entries.push({ entry: channel, depth: depth });
            if(channel.isCollapsed()) {
                return;
            }

            let clients = channel.channelClientsOrdered();
            if(!this.channelTree.areServerQueriesShown()) {
                clients = clients.filter(client => client.properties.client_type_exact !== ClientType.CLIENT_QUERY);
            }

            entries.push(...clients.map(client => {
                return {
                    entry: client,
                    depth: depth + 1
                }
            }));
            channel.children(false).forEach(channel => buildSubTree(channel, depth + 1));
        };

        this.channelTree.rootChannel().forEach(entry => buildSubTree(entry, 1));
        return entries;
    }

    /**
     * @param fullInfoEntries If `undefined` full entry info will be send.
     *                        Else only infos for entries which are contained within the entry id array will be send.
     */
    public sendChannelTreeEntriesFull(fullInfoEntries: number[] | undefined) {
        const entries = [] as FullChannelTreeEntry[];

        for(const entry of this.buildFlatChannelTree()) {
            if(!fullInfoEntries || fullInfoEntries.indexOf(entry.entry.uniqueEntryId) !== -1) {
                console.error("Sending full info for %o - %o", entry.entry.uniqueEntryId, fullInfoEntries);
                if(entry.entry instanceof ServerEntry) {
                    entries.push({
                        type: "server",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: true,
                        state: generateServerStatus(entry.entry),
                        unread: entry.entry.isUnread()
                    });
                } else if(entry.entry instanceof ClientEntry) {
                    const talkStatus = generateClientTalkStatus(entry.entry);
                    entries.push({
                        type: entry.entry instanceof LocalClientEntry ? "client-local" : "client",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: true,
                        unread: entry.entry.isUnread(),
                        name: generateClientNameInfo(entry.entry),
                        icons: generateClientIcons(entry.entry),
                        status: entry.entry.getStatusIcon(),
                        talkStatus: talkStatus.status,
                        talkRequestMessage: talkStatus.requestMessage
                    });
                } else if(entry.entry instanceof ChannelEntry) {
                    entries.push({
                        type: "channel",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: true,
                        unread: entry.entry.isUnread(),
                        icons: generateChannelIcons(entry.entry),
                        info: generateChannelInfo(entry.entry),
                        icon: entry.entry.getStatusIcon()
                    })
                } else {
                    throw tr("Invalid flat channel tree entry");
                }
            } else {
                if(entry.entry instanceof ServerEntry) {
                    entries.push({
                        type: "server",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: false
                    });
                } else if(entry.entry instanceof ClientEntry) {
                    entries.push({
                        type: entry.entry instanceof LocalClientEntry ? "client-local" : "client",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: false
                    });
                } else if(entry.entry instanceof ChannelEntry) {
                    entries.push({
                        type: "channel",
                        entryId: entry.entry.uniqueEntryId,
                        depth: entry.depth,
                        fullInfo: false
                    })
                } else {
                    throw tr("Invalid flat channel tree entry");
                }
            }
        }

        this.events.fire_react("notify_tree_entries_full", { entries: entries });
    }

    public sendSelectedEntry() {
        const selectedEntry = this.channelTree.getSelectedEntry();
        this.events.fire_react("notify_selected_entry", { treeEntryId: selectedEntry ? selectedEntry.uniqueEntryId : 0 });
    }

    public sendChannelInfo(channel: ChannelEntry) {
        this.events.fire_react("notify_channel_info", {
            treeEntryId: channel.uniqueEntryId,
            info: generateChannelInfo(channel)
        })
    }

    public sendChannelStatusIcon(channel: ChannelEntry) {
        this.events.fire_react("notify_channel_icon", { icon: channel.getStatusIcon(), treeEntryId: channel.uniqueEntryId });
    }

    public sendChannelIcons(channel: ChannelEntry) {
        this.events.fire_react("notify_channel_icons", { icons: generateChannelIcons(channel), treeEntryId: channel.uniqueEntryId });
    }

    public sendClientNameInfo(client: ClientEntry) {
        this.events.fire_react("notify_client_name", {
            info: generateClientNameInfo(client),
            treeEntryId: client.uniqueEntryId
        });
    }

    public sendClientIcons(client: ClientEntry) {
        this.events.fire_react("notify_client_icons", {
            icons: generateClientIcons(client),
            treeEntryId: client.uniqueEntryId
        });
    }

    public sendClientTalkStatus(client: ClientEntry) {
        const status = generateClientTalkStatus(client);
        this.events.fire_react("notify_client_talk_status", { treeEntryId: client.uniqueEntryId, requestMessage: status.requestMessage, status: status.status });
    }

    public sendServerStatus(serverEntry: ServerEntry) {
        this.events.fire_react("notify_server_state", { treeEntryId: serverEntry.uniqueEntryId, state: generateServerStatus(serverEntry) });
    }
}

export function initializeChannelTreeController(events: Registry<ChannelTreeUIEvents>, channelTree: ChannelTree, options: ChannelTreeRendererOptions) {
    /* initialize the general update handler */
    const controller = new ChannelTreeController(events, channelTree, options);
    controller.initialize();
    events.on("notify_destroy", () => controller.destroy());

    /* initialize the query handlers */
    events.on("query_popout_state", () => controller.sendPopoutState());

    events.on("query_unread_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Tried to query the unread state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        events.fire_react("notify_unread_state", { treeEntryId: event.treeEntryId, unread: entry.isUnread() });
    });

    events.on("notify_destroy", channelTree.client.events().on("notify_visibility_changed", event => events.fire_react("notify_visibility_changed", event)));

    events.on("query_tree_entries", event => controller.sendChannelTreeEntriesFull(event.fullInfo ? undefined : []));
    events.on("query_selected_entry", () => controller.sendSelectedEntry());
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

        events.fire_react("notify_client_status", { treeEntryId: entry.uniqueEntryId, status: entry.getStatusIcon() });
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

    events.on("action_toggle_popout", event => {
        if(event.shown) {
            channelTree.popoutController.popout();
        } else {
            channelTree.popoutController.popin();
        }
    })

    events.on("action_set_collapsed_state", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to set the collapsed state state of an invalid tree entry with id %o"), event.treeEntryId);
            return;
        }

        entry.setCollapsed(event.state === "collapsed");
    });

    events.on("action_select", event => {
        if(event.treeEntryId === 0) {
            channelTree.setSelectedEntry(undefined);
            return;
        }

        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Tried to select an invalid channel tree entry with id %o"), event.treeEntryId);
            return;
        }

        channelTree.setSelectedEntry(entry);
    });

    events.on("action_show_context_menu", event => {
        const entries = event.treeEntryIds.map(entryId => {
            const entry = channelTree.findEntryId(entryId);
            if(!entry) {
                logWarn(LogCategory.CHANNEL, tr("Tried to open a context menu for an invalid channel tree entry with id %o"), entryId);
            }
            return entry;
        }).filter(entry => !!entry);

        if(entries.length === 0) {
            channelTree.showContextMenu(event.pageX, event.pageY);
            return;
        } else if(entries.length === 1) {
            entries[0].showContextMenu(event.pageX, event.pageY);
        } else {
            channelTree.showMultiSelectContextMenu(entries, event.pageX, event.pageY);
        }
    });

    events.on("action_channel_join", event => {
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

        channelTree.setSelectedEntry(entry);
        spawnFileTransferModal(entry.channelId);
    });

    events.on("action_client_double_click", event => {
        const entry = channelTree.findEntryId(event.treeEntryId);
        if(!entry || !(entry instanceof ClientEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Tried to execute a double click action for an invalid tree entry with id %o"), event.treeEntryId);
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

        events.fire_react("notify_client_name_edit", { treeEntryId: event.treeEntryId, initialValue: undefined });
        if(!event.name || event.name === entry.clientNickName()) { return; }

        entry.renameSelf(event.name).then(result => {
            if(result) { return; }
            events.fire_react("notify_client_name_edit", { treeEntryId: event.treeEntryId, initialValue: event.name });
        })
    });

    events.on("action_move_clients", event => {
        const entry = channelTree.findEntryId(event.targetTreeEntry);
        if(!entry) {
            logWarn(LogCategory.CHANNEL, tr("Received client move notify with an unknown target entry id %o"), event.targetTreeEntry);
            return;
        }

        let targetChannel: ChannelEntry;
        if(entry instanceof ClientEntry) {
            targetChannel = entry.currentChannel();
        } else if(entry instanceof ChannelEntry) {
            targetChannel = entry;
        } else {
            logWarn(LogCategory.CHANNEL, tr("Received client move notify with an invalid target entry id %o"), event.targetTreeEntry);
            return;
        }

        if(!targetChannel) {
            /* should not happen often that a client hasn't a channel */
            return;
        }

        const clients = event.entries.map(entryId => {
            if(entryId.type !== "client") { return; }

            let entry: ServerEntry | ChannelEntry | ClientEntry;
            if("uniqueTreeId" in entryId) {
                entry = channelTree.findEntryId(entryId.uniqueTreeId);
            } else {
                let clients = channelTree.clients.filter(client => client.properties.client_unique_identifier === entryId.clientUniqueId);
                if(entryId.clientId) {
                    clients = clients.filter(client => client.clientId() === entryId.clientId);
                }

                if(entryId.clientDatabaseId) {
                    clients = clients.filter(client => client.properties.client_database_id === entryId.clientDatabaseId);
                }

                if(clients.length === 1) {
                    entry = clients[0];
                }
            }

            if(!entry || !(entry instanceof ClientEntry)) {
                logWarn(LogCategory.CHANNEL, tr("Received client move notify with an entry id which isn't a client. Entry id: %o"), entryId);
                return undefined;
            }

            return entry;
        }).filter(client => !!client).filter(client => client.currentChannel() !== targetChannel);

        if(clients.length === 0) {
            return;
        }

        let bulks = clients.map(client => { return { clid: client.clientId() }; });
        bulks[0]["cid"] = targetChannel.channelId;

        channelTree.client.serverConnection.send_command("clientmove", bulks);
    });

    events.on("action_move_channels", event => {
        const targetChannel = channelTree.findEntryId(event.targetTreeEntry);
        if(!targetChannel || !(targetChannel instanceof ChannelEntry)) {
            logWarn(LogCategory.CHANNEL, tr("Received channel move notify with an unknown/invalid target entry id %o"), event.targetTreeEntry);
            return;
        }

        let channels = event.entries.map(entryId => {
            if(entryId.type !== "channel") { return; }

            let entry: ServerEntry | ChannelEntry | ClientEntry;
            if("uniqueTreeId" in entryId) {
                entry = channelTree.findEntryId(entryId.uniqueTreeId);
            } else {
                entry = channelTree.findChannel(entryId.channelId);
            }

            if(!entry || !(entry instanceof ChannelEntry)) {
                logWarn(LogCategory.CHANNEL, tr("Received channel move notify with a channel id which isn't a channel. Entry id: %o"), entryId);
                return undefined;
            }

            return entry;
        }).filter(channel => !!channel);

        /* remove all channel in channel channels */
        channels = channels.filter(channel => {
            while((channel = channel.parent_channel())) {
                if(channels.indexOf(channel) !== -1) {
                    return false;
                }
            }
            return true;
        });

        channels = channels.filter(channel => channel !== targetChannel);

        if(channels.length === 0) {
            return;
        }

        let parentChannelId: number, previousChannelId: number;
        if(event.mode === "before") {
            parentChannelId = targetChannel.hasParent() ? targetChannel.parent_channel().channelId : 0;
            previousChannelId = targetChannel.channel_previous ? targetChannel.channel_previous.channelId : 0;
        } else if(event.mode == "after") {
            parentChannelId = targetChannel.hasParent() ? targetChannel.parent_channel().channelId : 0;
            previousChannelId = targetChannel.channelId;
        } else if(event.mode === "child") {
            parentChannelId = targetChannel.channelId;
            previousChannelId = 0;
        } else {
            return;
        }

        (async () => {
            let channel: ChannelEntry;
            while((channel = channels.pop_front())) {
                const success = await channelTree.client.serverConnection.send_command("channelmove", {
                    cid: channel.channelId,
                    cpid: parentChannelId,
                    order: previousChannelId
                }).then(() => true).catch(() => false);

                if(!success) {
                    break;
                }

                previousChannelId = channel.channelId;
            }
        })();
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