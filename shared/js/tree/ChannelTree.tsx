import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {MenuEntryType} from "tc-shared/ui/elements/ContextMenu";
import * as log from "tc-shared/log";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {SpecialKey} from "tc-shared/PPTListener";
import {Sound} from "tc-shared/sound/Sounds";
import {Group} from "tc-shared/permission/GroupManager";
import {ServerAddress, ServerEntry} from "./Server";
import {ChannelEntry, ChannelProperties, ChannelSubscribeMode} from "./Channel";
import {ClientEntry, LocalClientEntry, MusicClientEntry} from "./Client";
import {ChannelTreeEntry} from "./ChannelTreeEntry";
import {ConnectionHandler, ViewReasonId} from "tc-shared/ConnectionHandler";
import {createChannelModal} from "tc-shared/ui/modal/ModalCreateChannel";
import {Registry} from "tc-shared/events";
import * as ReactDOM from "react-dom";
import * as React from "react";
import * as ppt from "tc-backend/ppt";

import {batch_updates, BatchUpdateType, flush_batched_updates} from "tc-shared/ui/react-elements/ReactComponentBase";
import {createInputModal} from "tc-shared/ui/elements/Modal";
import {spawnBanClient} from "tc-shared/ui/modal/ModalBanClient";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {tra} from "tc-shared/i18n/localize";
import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {renderChannelTree} from "tc-shared/ui/tree/Controller";
import {ChannelTreePopoutController} from "tc-shared/ui/tree/popout/Controller";
import {Settings, settings} from "tc-shared/settings";
import {ServerConnection} from "tc-backend/web/connection/ServerConnection";

export interface ChannelTreeEvents {
    /* general tree notified */
    notify_tree_reset: {},
    notify_query_view_state_changed: { queries_shown: boolean },
    notify_popout_state_changed: { popoutShown: boolean },

    notify_entry_move_begin: {},
    notify_entry_move_end: {},

    /* channel tree events */
    notify_channel_created: { channel: ChannelEntry },
    notify_channel_moved: { channel: ChannelEntry },
    notify_channel_deleted: { channel: ChannelEntry },
    notify_channel_client_order_changed: { channel: ChannelEntry },

    notify_channel_updated: {
        channel: ChannelEntry,
        channelProperties: ChannelProperties,
        updatedProperties: ChannelProperties
    },

    notify_channel_list_received: {}

    /* client events */
    notify_client_enter_view: {
        client: ClientEntry,
        reason: ViewReasonId,
        isServerJoin: boolean,
        targetChannel: ChannelEntry
    },
    notify_client_moved: {
        client: ClientEntry,
        oldChannel: ChannelEntry | undefined,
        newChannel: ChannelEntry
    }
    notify_client_leave_view: {
        client: ClientEntry,
        reason: ViewReasonId,
        message?: string,
        isServerLeave: boolean,
        sourceChannel: ChannelEntry
    },

    notify_selected_entry_changed: {
        oldEntry: ChannelTreeEntry<any> | undefined,
        newEntry: ChannelTreeEntry<any> | undefined
    }
}

export class ChannelTree {
    readonly events: Registry<ChannelTreeEvents>;

    client: ConnectionHandler;
    server: ServerEntry;

    channels: ChannelEntry[] = [];
    clients: ClientEntry[] = [];

    /* whatever all channels have been initialized */
    channelsInitialized: boolean = false;

    readonly popoutController: ChannelTreePopoutController;

    private readonly tagContainer: JQuery;

    private selectedEntry: ChannelTreeEntry<any> | undefined;
    private showQueries: boolean;
    private channelLast?: ChannelEntry;
    private channelFirst?: ChannelEntry;

    constructor(client: ConnectionHandler) {
        this.events = new Registry<ChannelTreeEvents>();
        this.events.enableDebug("channel-tree");

        this.client = client;

        this.server = new ServerEntry(this, "undefined", undefined);
        this.popoutController = new ChannelTreePopoutController(this);

        this.tagContainer = $.spawn("div").addClass("channel-tree-container");
        renderChannelTree(this, this.tagContainer[0], { popoutButton: true });

        this.reset();
    }

    tag_tree() : HTMLDivElement {
        return this.tagContainer[0] as HTMLDivElement;
    }

    channelsOrdered() : ChannelEntry[] {
        const result = [];

        const visit = (channel: ChannelEntry) => {
            result.push(channel);
            channel.child_channel_head && visit(channel.child_channel_head);
            channel.channel_next && visit(channel.channel_next);
        };
        this.channelFirst && visit(this.channelFirst);

        return result;
    }

    findEntryId(entryId: number) : ServerEntry | ChannelEntry | ClientEntry {
        /* TODO: Build a cache and don't iterate over everything */
        if(this.server.uniqueEntryId === entryId) {
            return this.server;
        }

        const channelIndex = this.channels.findIndex(channel => channel.uniqueEntryId === entryId);
        if(channelIndex !== -1) {
            return this.channels[channelIndex];
        }

        const clientIndex = this.clients.findIndex(client => client.uniqueEntryId === entryId);
        if(clientIndex !== -1) {
            return this.clients[clientIndex];
        }

        return undefined;
    }

    getSelectedEntry() : ChannelTreeEntry<any> | undefined {
        return this.selectedEntry;
    }

    setSelectedEntry(entry: ChannelTreeEntry<any> | undefined) {
        if(this.selectedEntry === entry) { return; }

        const oldEntry = this.selectedEntry;
        this.selectedEntry = entry;
        this.events.fire("notify_selected_entry_changed", { newEntry: entry, oldEntry: oldEntry });

        if(this.selectedEntry instanceof ClientEntry) {
            if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT)) {
                if(this.selectedEntry instanceof MusicClientEntry) {
                    this.client.side_bar.show_music_player(this.selectedEntry);
                } else {
                    this.client.side_bar.show_client_info(this.selectedEntry);
                }
            }
        } else if(this.selectedEntry instanceof ChannelEntry) {
            if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
                this.client.side_bar.channel_conversations().setSelectedConversation(this.selectedEntry.channelId);
                this.client.side_bar.show_channel_conversations();
            }
        } else if(this.selectedEntry instanceof ServerEntry) {
            if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
                const sidebar = this.client.side_bar;
                sidebar.channel_conversations().findOrCreateConversation(0);
                sidebar.channel_conversations().setSelectedConversation(0);
                sidebar.show_channel_conversations();
            }
        }
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this.tagContainer[0]);

        if(this.server) {
            this.server.destroy();
            this.server = undefined;
        }
        this.reset(); /* cleanup channel and clients */

        this.channelFirst = undefined;
        this.channelLast = undefined;

        this.popoutController.destroy();
        this.tagContainer.remove();
        this.events.destroy();
    }

    initialiseHead(serverName: string, address: ServerAddress) {
        this.server.reset();
        this.server.remote_address = Object.assign({}, address);
        this.server.properties.virtualserver_name = serverName;
    }

    rootChannel() : ChannelEntry[] {
        const result = [];
        let first = this.channelFirst;
        while(first) {
            result.push(first);
            first = first.channel_next;
        }
        return result;
    }

    deleteChannel(channel: ChannelEntry) {
        if(this.selectedEntry === channel) {
            this.setSelectedEntry(undefined);
        }

        channel.channelTree = null;
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            if(!this.channels.remove(channel)) {
                log.warn(LogCategory.CHANNEL, tr("Deleting an unknown channel!"));
            }

            channel.children(false).forEach(e => this.deleteChannel(e));
            if(channel.clients(false).length !== 0) {
                log.warn(LogCategory.CHANNEL, tr("Deleting a non empty channel! This could cause some errors."));
                for(const client of channel.clients(false)) {
                    this.deleteClient(client, { reason: ViewReasonId.VREASON_SYSTEM, serverLeave: false });
                }
            }

            this.unregisterChannelFromTree(channel);
            this.events.fire("notify_channel_deleted", { channel: channel });
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    handleChannelCreated(previous: ChannelEntry, parent: ChannelEntry, channelId: number, channelName: string) : ChannelEntry {
        const channel = new ChannelEntry(this, channelId, channelName);
        this.channels.push(channel);
        this.moveChannel(channel, previous, parent, false);
        this.events.fire("notify_channel_created", { channel: channel });
        return channel;
    }

    findChannel(channelId: number) : ChannelEntry | undefined {
        if(typeof channelId === "string") /* legacy fix */
            channelId = parseInt(channelId);

        for(let index = 0; index < this.channels.length; index++)
            if(this.channels[index].channelId === channelId) return this.channels[index];
        return undefined;
    }

    find_channel_by_name(name: string, parent?: ChannelEntry, force_parent: boolean = true) : ChannelEntry | undefined {
        for(let index = 0; index < this.channels.length; index++)
            if(this.channels[index].channelName() == name && (!force_parent || parent == this.channels[index].parent))
                return this.channels[index];
        return undefined;
    }

    private unregisterChannelFromTree(channel: ChannelEntry) {
        if(channel.parent) {
            if(channel.parent.child_channel_head === channel) {
                channel.parent.child_channel_head = channel.channel_next;
            }
        }

        if(channel.channel_previous) {
            channel.channel_previous.channel_next = channel.channel_next;
        }

        if(channel.channel_next) {
            channel.channel_next.channel_previous = channel.channel_previous;
        }

        if(channel === this.channelLast) {
            this.channelLast = channel.channel_previous;
        }

        if(channel === this.channelFirst) {
            this.channelFirst = channel.channel_next;
        }

        channel.channel_next = undefined;
        channel.channel_previous = undefined;
        channel.parent = undefined;
    }

    moveChannel(channel: ChannelEntry, channelPrevious: ChannelEntry, parent: ChannelEntry, triggerMoveEvent: boolean) {
        if(channelPrevious != null && channelPrevious.parent != parent) {
            console.error(tr("Invalid channel move (different parents! (%o|%o)"), channelPrevious.parent, parent);
            return;
        }

        this.unregisterChannelFromTree(channel);
        channel.channel_previous = channelPrevious;
        channel.channel_next = undefined;
        channel.parent = parent;

        if(channelPrevious) {
            if(channelPrevious == this.channelLast) {
                this.channelLast = channel;
            }

            channel.channel_next = channelPrevious.channel_next;
            channelPrevious.channel_next = channel;

            if(channel.channel_next) {
                channel.channel_next.channel_previous = channel;
            }
        } else {
            if(parent) {
                let children = parent.children();
                parent.child_channel_head = channel;
                if(children.length === 0) { //Self should be already in there
                    channel.channel_next = undefined;
                } else {
                    channel.channel_next = children[0];
                    channel.channel_next.channel_previous = channel;
                }
            } else {
                channel.channel_next = this.channelFirst;
                if(this.channelFirst) {
                    this.channelFirst.channel_previous = channel;
                }

                this.channelFirst = channel;
                this.channelLast = this.channelLast || channel;
            }
        }

        if(channel.channel_previous == channel) {  /* shall never happen */
            channel.channel_previous = undefined;
            debugger;
        }
        if(channel.channel_next == channel) {  /* shall never happen */
            channel.channel_next = undefined;
            debugger;
        }

        if(triggerMoveEvent) {
            this.events.fire("notify_channel_moved", { channel: channel });
        }
    }

    deleteClient(client: ClientEntry, reason: { reason: ViewReasonId, message?: string, serverLeave: boolean }) {
        if(this.selectedEntry === client) {
            this.setSelectedEntry(undefined);
        }

        const oldChannel = client.currentChannel();
        oldChannel?.unregisterClient(client);
        this.unregisterClient(client);

        if(oldChannel) {
            this.events.fire("notify_client_leave_view", { client: client, message: reason.message, reason: reason.reason, isServerLeave: reason.serverLeave, sourceChannel: oldChannel });
            this.client.side_bar.info_frame().update_channel_client_count(oldChannel);
        } else {
            logWarn(LogCategory.CHANNEL, tr("Deleting client %s from channel tree which hasn't a channel."), client.clientId());
        }

        client.destroy();
    }

    registerClient(client: ClientEntry) {
        this.clients.push(client);

        const isLocalClient = client instanceof LocalClientEntry;
        if(isLocalClient) {
            if(client.channelTree !== this) {
                throw tr("client channel tree missmatch");
            }
        } else {
            client.channelTree = this;
        }

        /* for debug purposes, the server might send back the own audio/video stream */
        if(!isLocalClient || __build.mode === "debug") {
            const voiceConnection = this.client.serverConnection.getVoiceConnection();
            try {
                client.setVoiceClient(voiceConnection.registerVoiceClient(client.clientId()));
            } catch (error) {
                logError(LogCategory.AUDIO, tr("Failed to register a voice client for %d: %o"), client.clientId(), error);
            }

            const videoConnection = this.client.serverConnection.getVideoConnection();
            try {
                client.setVideoClient(videoConnection.registerVideoClient(client.clientId()));
            } catch (error) {
                logError(LogCategory.VIDEO, tr("Failed to register a video client for %d: %o"), client.clientId(), error);
            }
        }
    }

    unregisterClient(client: ClientEntry) {
        if(!this.clients.remove(client)) {
            return;
        }

        const voiceConnection = this.client.serverConnection.getVoiceConnection();
        if(client.getVoiceClient()) {
            voiceConnection.unregisterVoiceClient(client.getVoiceClient());
            client.setVoiceClient(undefined);
        }

        const videoConnection = this.client.serverConnection.getVideoConnection();
        if(client.getVideoClient()) {
            videoConnection.unregisterVideoClient(client.getVideoClient());
            client.setVideoClient(undefined);
        }
    }

    insertClient(client: ClientEntry, channel: ChannelEntry, reason: { reason: ViewReasonId, isServerJoin: boolean }) : ClientEntry {
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            let newClient = this.findClient(client.clientId());
            if(newClient)
                client = newClient; //Got new client :)
            else {
                this.registerClient(client);
            }

            client.currentChannel()?.unregisterClient(client);
            client["_channel"] = channel;
            channel.registerClient(client);

            this.events.fire("notify_client_enter_view", { client: client, reason: reason.reason, isServerJoin: reason.isServerJoin, targetChannel: channel });
            return client;
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    moveClient(client: ClientEntry, targetChannel: ChannelEntry) {
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            let oldChannel = client.currentChannel();
            oldChannel?.unregisterClient(client);
            client["_channel"] = targetChannel;
            targetChannel?.registerClient(client);

            if(oldChannel) {
                this.client.side_bar.info_frame().update_channel_client_count(oldChannel);
            }

            if(targetChannel) {
                this.client.side_bar.info_frame().update_channel_client_count(targetChannel);
            }

            this.events.fire("notify_client_moved", { oldChannel: oldChannel, newChannel: targetChannel, client: client });
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    findClient?(clientId: number) : ClientEntry {
        for(let index = 0; index < this.clients.length; index++) {
            if(this.clients[index].clientId() == clientId)
                return this.clients[index];
        }
        return undefined;
    }

    find_client_by_dbid?(client_dbid: number) : ClientEntry {
        for(let index = 0; index < this.clients.length; index++) {
            if(this.clients[index].properties.client_database_id == client_dbid)
                return this.clients[index];
        }
        return undefined;
    }

    find_client_by_unique_id?(unique_id: string) : ClientEntry {
        for(let index = 0; index < this.clients.length; index++) {
            if(this.clients[index].properties.client_unique_identifier == unique_id)
                return this.clients[index];
        }
        return undefined;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate =
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);

        contextmenu.spawn_context_menu(x, y,
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_create",
                name: tr("Create channel"),
                invalidPermission: !channelCreate,
                callback: () => this.spawnCreateChannel()
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_collapse_all",
                name: tr("Collapse all channels"),
                callback: () => this.collapse_channels()
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_expand_all",
                name: tr("Expend all channels"),
                callback: () => this.expand_channels()
            },
            contextmenu.Entry.CLOSE(on_close)
        );
    }

    public showMultiSelectContextMenu(entries: ChannelTreeEntry<any>[], x: number, y: number) {
        const clients = entries.filter(e => e instanceof ClientEntry) as ClientEntry[];
        const channels = entries.filter(e => e instanceof ChannelEntry) as ChannelEntry[];
        const server = entries.find(e => e instanceof ServerEntry) as ServerEntry;

        let client_menu: contextmenu.MenuEntry[];
        let channel_menu: contextmenu.MenuEntry[];
        let server_menu: contextmenu.MenuEntry[];

        if(clients.length > 0) {
            client_menu = [];

            const music_only = clients.map(e => e instanceof MusicClientEntry ? 0 : 1).reduce((a, b) => a + b, 0) == 0;
            const music_entry = clients.map(e => e instanceof MusicClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;
            const local_client = clients.map(e => e instanceof LocalClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;

            if (!music_entry && !local_client) { //Music bots or local client cant be poked
                client_menu.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-poke",
                    name: tr("Poke clients"),
                    callback: () => {
                        createInputModal(tr("Poke clients"), tr("Poke message:<br>"), text => true, result => {
                            if (typeof(result) === "string") {
                                for (const client of clients) {
                                    this.client.serverConnection.send_command("clientpoke", {
                                        clid: client.clientId(),
                                        msg: result
                                    });
                                }
                            }
                        }, {width: 400, maxLength: 512}).open();
                    }
                });
            }
            client_menu.push({
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-move_client_to_own_channel",
                name: tr("Move clients to your channel"),
                callback: () => {
                    const target = this.client.getClient().currentChannel().getChannelId();
                    for(const client of clients) {
                        this.client.serverConnection.send_command("clientmove", {
                            clid: client.clientId(),
                            cid: target
                        });
                    }
                }
            });
            if (!local_client) {//local client cant be kicked and/or banned or kicked
                client_menu.push(contextmenu.Entry.HR());
                client_menu.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-kick_channel",
                    name: tr("Kick clients from channel"),
                    callback: () => {
                        createInputModal(tr("Kick clients from channel"), tr("Kick reason:<br>"), text => true, result => {
                            if (result) {
                                for (const client of clients)
                                    this.client.serverConnection.send_command("clientkick", {
                                        clid: client.clientId(),
                                        reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                        reasonmsg: result
                                    });
                            }
                        }, {width: 400, maxLength: 255}).open();
                    }
                });

                if (!music_entry) { //Music bots  cant be poked, banned or kicked
                    client_menu.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        icon_class: "client-poke",
                        name: tr("Poke clients"),
                        callback: () => {
                            createInputModal(tr("Poke clients"), tr("Poke message:<br>"), text => true, result => {
                                if (result) {
                                    const elements = clients.map(e => { return { clid: e.clientId() } as any });
                                    elements[0].msg = result;
                                    this.client.serverConnection.send_command("clientpoke", elements);
                                }
                            }, {width: 400, maxLength: 255}).open();
                        }
                    }, {
                        type: contextmenu.MenuEntryType.ENTRY,
                        icon_class: "client-kick_server",
                        name: tr("Kick clients fom server"),
                        callback: () => {
                            createInputModal(tr("Kick clients from server"), tr("Kick reason:<br>"), text => true, result => {
                                if (result) {
                                    for (const client of clients)
                                        this.client.serverConnection.send_command("clientkick", {
                                            clid: client.clientId(),
                                            reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                            reasonmsg: result
                                        });
                                }
                            }, {width: 400, maxLength: 255}).open();
                        }
                    }, {
                        type: contextmenu.MenuEntryType.ENTRY,
                        icon_class: "client-ban_client",
                        name: tr("Ban clients"),
                        invalidPermission: !this.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                        callback: () => {
                            spawnBanClient(this.client, (clients).map(entry => {
                                return {
                                    name: entry.clientNickName(),
                                    unique_id: entry.properties.client_unique_identifier
                                }
                            }), (data) => {
                                for (const client of clients)
                                    this.client.serverConnection.send_command("banclient", {
                                        uid: client.properties.client_unique_identifier,
                                        banreason: data.reason,
                                        time: data.length
                                    }, {
                                        flagset: [data.no_ip ? "no-ip" : "", data.no_hwid ? "no-hardware-id" : "", data.no_name ? "no-nickname" : ""]
                                    }).then(() => {
                                        this.client.sound.play(Sound.USER_BANNED);
                                    });
                            });
                        }
                    });
                }
                if(music_only) {
                    client_menu.push(contextmenu.Entry.HR());
                    client_menu.push({
                        name: tr("Delete bots"),
                        icon_class: "client-delete",
                        disabled: false,
                        callback: () => {
                            const param_string = clients.map((_, index) => "{" + index + "}").join(', ');
                            const param_values = clients.map(client => client.createChatTag(true));
                            const tag = $.spawn("div").append(...formatMessage(tr("Do you really want to delete ") + param_string, ...param_values));
                            const tag_container = $.spawn("div").append(tag);
                            spawnYesNo(tr("Are you sure?"), tag_container, result => {
                                if(result) {
                                    for(const client of clients) {
                                        this.client.serverConnection.send_command("musicbotdelete", {
                                            botid: client.properties.client_database_id
                                        });
                                    }
                                }
                            });
                        },
                        type: contextmenu.MenuEntryType.ENTRY
                    });
                }
            }
        }
        if(channels.length > 0) {
            channel_menu = [];

            //TODO: Subscribe mode settings
            channel_menu.push({
                type: MenuEntryType.ENTRY,
                name: tr("Delete all channels"),
                icon_class: "client-delete",
                callback: () => {
                    spawnYesNo(tr("Are you sure?"), tra("Do you really want to delete {0} channels?", channels.length), result => {
                        if(typeof result === "boolean" && result) {
                            for(const channel of channels) {
                                this.client.serverConnection.send_command("channeldelete", { cid: channel.channelId });
                            }
                        }
                    });
                }
            });
        }
        if(server) {
            server_menu = server.contextMenuItems();
        }

        const menus = [
            {
                text: tr("Apply to all clients"),
                menu: client_menu,
                icon: "client-user-account"
            },
            {
                text: tr("Apply to all channels"),
                menu: channel_menu,
                icon: "client-channel_green"
            },
            {
                text: tr("Server actions"),
                menu: server_menu,
                icon: "client-server_green"
            }
        ].filter(e => !!e.menu);
        if(menus.length === 1) {
            contextmenu.spawn_context_menu(x, y, ...menus[0].menu);
        } else {
            contextmenu.spawn_context_menu(x, y, ...menus.map(e => {
                return {
                    icon_class: e.icon,
                    name: e.text,
                    type: MenuEntryType.SUB_MENU,
                    sub_menu: e.menu
                } as contextmenu.MenuEntry
            }));
        }
    }

    clientsByGroup(group: Group) : ClientEntry[] {
        let result = [];

        for(let client of this.clients) {
            if(client.groupAssigned(group))
                result.push(client);
        }

        return result;
    }

    clientsByChannel(channel: ChannelEntry) : ClientEntry[] {
        let result = [];

        for(let client of this.clients) {
            if(client.currentChannel() == channel)
                result.push(client);
        }

        return result;
    }

    reset() {
        this.channelsInitialized = false;
        batch_updates(BatchUpdateType.CHANNEL_TREE);

        try {
            this.setSelectedEntry(undefined);

            const voiceConnection = this.client.serverConnection ? this.client.serverConnection.getVoiceConnection() : undefined;
            const videoConnection = this.client.serverConnection ? this.client.serverConnection.getVideoConnection() : undefined;
            for(const client of this.clients) {
                if(client.getVoiceClient() && videoConnection) {
                    voiceConnection.unregisterVoiceClient(client.getVoiceClient());
                    client.setVoiceClient(undefined);
                }
                if(client.getVideoClient()) {
                    videoConnection.unregisterVideoClient(client.getVideoClient());
                    client.setVideoClient(undefined);
                }

                client.destroy();
            }
            this.clients = [];

            for(const channel of this.channels)
                channel.destroy();

            this.channels = [];
            this.channelLast = undefined;
            this.channelFirst = undefined;
            this.events.fire("notify_tree_reset");
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    spawnCreateChannel(parent?: ChannelEntry) {
        createChannelModal(this.client, undefined, parent, this.client.permissions, (properties?, permissions?) => {
            if(!properties) return;

            properties["cpid"] = parent ? parent.channelId : 0;
            log.debug(LogCategory.CHANNEL, tr("Creating a new channel.\nProperties: %o\nPermissions: %o"), properties);
            this.client.serverConnection.send_command("channelcreate", properties).then(() => {
                let channel = this.find_channel_by_name(properties.channel_name, parent, true);
                if(!channel) {
                    log.error(LogCategory.CHANNEL, tr("Failed to resolve channel after creation. Could not apply permissions!"));
                    return;
                }
                if(permissions && permissions.length > 0) {
                    let perms = [];
                    for(let perm of permissions) {
                        perms.push({
                            permvalue: perm.value,
                            permnegated: false,
                            permskip: false,
                            permid: perm.type.id
                        });
                    }

                    perms[0]["cid"] = channel.channelId;
                    return this.client.serverConnection.send_command("channeladdperm", perms, {
                        flagset: ["continueonerror"]
                    }).then(() => new Promise<ChannelEntry>(resolve => { resolve(channel); }));
                }

                return new Promise<ChannelEntry>(resolve => { resolve(channel); })
            });
        });
    }

    toggle_server_queries(flag: boolean) {
        if(this.showQueries == flag) return;
        this.showQueries = flag;

        this.events.fire("notify_query_view_state_changed", { queries_shown: flag });
    }
    areServerQueriesShown() { return this.showQueries; }

    get_first_channel?() : ChannelEntry {
        return this.channelFirst;
    }

    unsubscribe_all_channels() {
        if(!this.client.serverConnection || !this.client.serverConnection.connected()) {
            return;
        }

        this.client.serverConnection.send_command('channelunsubscribeall').then(() => {
            const channels: number[] = [];
            for(const channel of this.channels) {
                if(channel.getSubscriptionMode() == ChannelSubscribeMode.SUBSCRIBED) {
                    channels.push(channel.getChannelId());
                }
            }

            if(channels.length > 0) {
                this.client.serverConnection.send_command('channelsubscribe', channels.map(e => { return {cid: e}; })).catch(error => {
                    console.warn(tr("Failed to subscribe to specific channels (%o): %o"), channels, error);
                });
            }
        }).catch(error => {
            console.warn(tr("Failed to unsubscribe to all channels! (%o)"), error);
        });
    }

    subscribe_all_channels() {
        if(!this.client.serverConnection || !this.client.serverConnection.connected())
            return;

        this.client.serverConnection.send_command('channelsubscribeall').then(() => {
            const channels: number[] = [];
            for(const channel of this.channels) {
                if(channel.getSubscriptionMode() == ChannelSubscribeMode.UNSUBSCRIBED) {
                    channels.push(channel.getChannelId());
                }
            }

            if(channels.length > 0) {
                this.client.serverConnection.send_command('channelunsubscribe', channels.map(e => { return {cid: e}; })).catch(error => {
                    console.warn(tr("Failed to unsubscribe to specific channels (%o): %o"), channels, error);
                });
            }
        }).catch(error => {
            console.warn(tr("Failed to subscribe to all channels! (%o)"), error);
        });
    }

    expand_channels(root?: ChannelEntry) {
        if(typeof root === "undefined")
            this.rootChannel().forEach(e => this.expand_channels(e));
        else {
            root.setCollapsed(false);
            for(const child of root.children(false)) {
                this.expand_channels(child);
            }
        }
    }

    collapse_channels(root?: ChannelEntry) {
        if(typeof root === "undefined") {
            this.rootChannel().forEach(e => this.collapse_channels(e));
        } else {
            root.setCollapsed(true);
            for(const child of root.children(false))
                this.collapse_channels(child);
        }
    }
}