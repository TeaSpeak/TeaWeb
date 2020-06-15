import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {MenuEntryType} from "tc-shared/ui/elements/ContextMenu";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {KeyCode, SpecialKey} from "tc-shared/PPTListener";
import {Sound} from "tc-shared/sound/Sounds";
import {Group} from "tc-shared/permission/GroupManager";
import * as server_log from "tc-shared/ui/frames/server_log";
import {ServerAddress, ServerEntry} from "tc-shared/ui/server";
import {ChannelEntry, ChannelProperties, ChannelSubscribeMode} from "tc-shared/ui/channel";
import {ClientEntry, LocalClientEntry, MusicClientEntry} from "tc-shared/ui/client";
import {ConnectionHandler, ViewReasonId} from "tc-shared/ConnectionHandler";
import {createChannelModal} from "tc-shared/ui/modal/ModalCreateChannel";
import {Registry} from "tc-shared/events";
import {ChannelTreeView} from "tc-shared/ui/tree/View";
import * as ReactDOM from "react-dom";
import * as React from "react";
import * as ppt from "tc-backend/ppt";

import {batch_updates, BatchUpdateType, flush_batched_updates} from "tc-shared/ui/react-elements/ReactComponentBase";
import {ChannelTreeEntry} from "tc-shared/ui/TreeEntry";
import {createInputModal} from "tc-shared/ui/elements/Modal";
import {spawnBanClient} from "tc-shared/ui/modal/ModalBanClient";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {tra} from "tc-shared/i18n/localize";
import {TreeEntryMove} from "tc-shared/ui/tree/TreeEntryMove";

export interface ChannelTreeEvents {
    action_select_entries: {
        entries: ChannelTreeEntry<any>[],
        /**
         * auto      := Select/unselect/add/remove depending on the selected state & shift key state
         * exclusive := Only selected these entries
         * append    := Append these entries to the current selection
         * remove    := Remove these entries from the current selection
         */
        mode: "auto" | "exclusive" | "append" | "remove";
    },

    notify_selection_changed: {},
    notify_root_channel_changed: {},
    notify_tree_reset: {},
    notify_query_view_state_changed: { queries_shown: boolean },

    notify_entry_move_begin: {},
    notify_entry_move_end: {},

    notify_channel_updated: {
        channel: ChannelEntry,
        channelProperties: ChannelProperties,
        updatedProperties: ChannelProperties
    }
}

export class ChannelTreeEntrySelect {
    readonly handle: ChannelTree;
    selected_entries: ChannelTreeEntry<any>[] = [];

    private readonly handler_select_entries;

    constructor(handle: ChannelTree) {
        this.handle = handle;

        this.handler_select_entries = e => {
            batch_updates(BatchUpdateType.CHANNEL_TREE);
            try {
                this.handleSelectEntries(e)
            } finally {
                flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
            }
        };

        this.handle.events.on("action_select_entries", this.handler_select_entries);
    }

    reset() {
        this.selected_entries.splice(0, this.selected_entries.length);
    }

    destroy() {
        this.handle.events.off("action_select_entries", this.handler_select_entries);
        this.selected_entries.splice(0, this.selected_entries.length);
    }

    is_multi_select() {
        return this.selected_entries.length > 1;
    }

    is_anything_selected() {
        return this.selected_entries.length > 0;
    }

    clear_selection() {
        this.handleSelectEntries({
            entries: [],
            mode: "exclusive"
        });
    }

    private handleSelectEntries(event: ChannelTreeEvents["action_select_entries"]) {
        if(event.mode === "exclusive") {
            let deleted_entries = this.selected_entries;
            let new_entries = [];

            this.selected_entries = [];
            for(const new_entry of event.entries) {
                if(!deleted_entries.remove(new_entry))
                    new_entries.push(new_entry);
                this.selected_entries.push(new_entry);
            }

            for(const deleted of deleted_entries)
                deleted["onUnselect"]();

            for(const new_entry of new_entries)
                new_entry["onSelect"](!this.is_multi_select());

            if(deleted_entries.length !== 0 || new_entries.length !== 0)
                this.handle.events.fire("notify_selection_changed");
        } else if(event.mode === "append") {
            let new_entries = [];
            for(const entry of event.entries) {
                if(this.selected_entries.findIndex(e => e === entry) !== -1)
                    continue;

                this.selected_entries.push(entry);
                new_entries.push(entry);
            }

            for(const new_entry of new_entries)
                new_entry["onSelect"](!this.is_multi_select());

            if(new_entries.length !== 0)
                this.handle.events.fire("notify_selection_changed");
        } else if(event.mode === "remove") {
            let deleted_entries = [];
            for(const entry of event.entries) {
                if(this.selected_entries.remove(entry))
                    deleted_entries.push(entry);
            }

            for(const deleted of deleted_entries)
                deleted["onUnselect"]();

            if(deleted_entries.length !== 0)
                this.handle.events.fire("notify_selection_changed");
        } else if(event.mode === "auto") {
            let deleted_entries = [];
            let new_entries = [];

            if(ppt.key_pressed(SpecialKey.SHIFT)) {
                for(const entry of event.entries) {
                    const index = this.selected_entries.findIndex(e => e === entry);
                    if(index === -1) {
                        this.selected_entries.push(entry);
                        new_entries.push(entry);
                    } else {
                        this.selected_entries.splice(index, 1);
                        deleted_entries.push(entry);
                    }
                }
            } else {
                deleted_entries = this.selected_entries.splice(0, this.selected_entries.length);
                if(event.entries.length !== 0) {
                    const entry = event.entries[event.entries.length - 1];
                    this.selected_entries.push(entry);
                    if(!deleted_entries.remove(entry))
                        new_entries.push(entry); /* entry wans't selected yet */
                }
            }

            for(const deleted of deleted_entries)
                deleted["onUnselect"]();

            for(const new_entry of new_entries)
                new_entry["onSelect"](!this.is_multi_select());

            if(deleted_entries.length !== 0 || new_entries.length !== 0)
                this.handle.events.fire("notify_selection_changed");
        } else {
            console.warn("Received entry select event with unknown mode: %s", event.mode);
        }

        if(this.selected_entries.length === 1)
            this.handle.view.current?.scrollEntryInView(this.selected_entries[0] as any);
    }
}

export class ChannelTree {
    readonly events: Registry<ChannelTreeEvents>;

    client: ConnectionHandler;
    server: ServerEntry;

    channels: ChannelEntry[] = [];
    clients: ClientEntry[] = [];

    readonly view: React.RefObject<ChannelTreeView>;
    readonly view_move: React.RefObject<TreeEntryMove>;
    readonly selection: ChannelTreeEntrySelect;

    private readonly _tag_container: JQuery;

    private _show_queries: boolean;
    private channel_last?: ChannelEntry;
    private channel_first?: ChannelEntry;

    private _tag_container_focused = false;
    private _listener_document_click;
    private _listener_document_key;

    constructor(client) {
        this.events = new Registry<ChannelTreeEvents>();
        this.events.enable_debug("channel-tree");

        this.client = client;
        this.view = React.createRef();
        this.view_move = React.createRef();

        this.server = new ServerEntry(this, "undefined", undefined);
        this.selection = new ChannelTreeEntrySelect(this);

        this._tag_container = $.spawn("div").addClass("channel-tree-container");
        ReactDOM.render([
            <ChannelTreeView key={"tree"} onMoveStart={(a,b) => this.onChannelEntryMove(a, b)} tree={this} ref={this.view} />,
            <TreeEntryMove key={"move"} onMoveEnd={(point) => this.onMoveEnd(point.x, point.y)} ref={this.view_move} />
        ], this._tag_container[0]);

        this.reset();

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this._tag_container.on("contextmenu", (event) => {
                event.preventDefault();

                const entry = this.view.current?.getEntryFromPoint(event.pageX, event.pageY);
                if(entry) {
                    if(this.selection.is_multi_select())
                        this.open_multiselect_context_menu(this.selection.selected_entries, event.pageX, event.pageY);
                } else {
                    this.selection.clear_selection();
                    this.showContextMenu(event.pageX, event.pageY);
                }
            });
        }

        this._listener_document_key = event => this.handle_key_press(event);
        this._listener_document_click = event => {
            this._tag_container_focused = false;
            let element = event.target as HTMLElement;
            while(element) {
                if(element === this._tag_container[0]) {
                    this._tag_container_focused = true;
                    break;
                }
                element = element.parentNode as HTMLElement;
            }
        };
        document.addEventListener('click', this._listener_document_click);
        document.addEventListener('keydown', this._listener_document_key);
    }

    tag_tree() : JQuery {
        return this._tag_container;
    }

    channelsOrdered() : ChannelEntry[] {
        const result = [];

        const visit = (channel: ChannelEntry) => {
            result.push(channel);
            channel.child_channel_head && visit(channel.child_channel_head);
            channel.channel_next && visit(channel.channel_next);
        };
        this.channel_first && visit(this.channel_first);

        return result;
    }

    destroy() {
        ReactDOM.unmountComponentAtNode(this._tag_container[0]);

        this._listener_document_click && document.removeEventListener('click', this._listener_document_click);
        this._listener_document_click = undefined;

        this._listener_document_key && document.removeEventListener('keydown', this._listener_document_key);
        this._listener_document_key = undefined;

        if(this.server) {
            this.server.destroy();
            this.server = undefined;
        }
        this.reset(); /* cleanup channel and clients */

        this.channel_first = undefined;
        this.channel_last = undefined;

        this._tag_container.remove();
        this.selection.destroy();
        this.events.destroy();
    }

    initialiseHead(serverName: string, address: ServerAddress) {
        this.server.reset();
        this.server.remote_address = Object.assign({}, address);
        this.server.properties.virtualserver_name = serverName;
        this.events.fire("notify_root_channel_changed");
    }

    rootChannel() : ChannelEntry[] {
        const result = [];
        let first = this.channel_first;
        while(first) {
            result.push(first);
            first = first.channel_next;
        }
        return result;
    }

    deleteChannel(channel: ChannelEntry) {
        channel.channelTree = null;

        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            if(!this.channels.remove(channel))
                log.warn(LogCategory.CHANNEL, tr("Deleting an unknown channel!"));

            channel.children(false).forEach(e => this.deleteChannel(e));
            if(channel.clients(false).length !== 0) {
                log.warn(LogCategory.CHANNEL, tr("Deleting a non empty channel! This could cause some errors."));
                for(const client of channel.clients(false))
                    this.deleteClient(client, false);
            }

            const is_root_tree = !channel.parent;
            this.unregisterChannelFromTree(channel);
            if(is_root_tree) this.events.fire("notify_root_channel_changed");
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    insertChannel(channel: ChannelEntry, previous: ChannelEntry, parent: ChannelEntry) {
        channel.channelTree = this;
        this.channels.push(channel);

        this.moveChannel(channel, previous, parent);
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

    private unregisterChannelFromTree(channel: ChannelEntry, new_parent?: ChannelEntry) {
        let oldChannelParent;
        if(channel.parent) {
            if(channel.parent.child_channel_head === channel)
                channel.parent.child_channel_head = channel.channel_next;

            /* We need only trigger this once.
               If the new parent is equal to the old one with applying the "new" parent this event will get triggered */
            oldChannelParent = channel.parent;
        }

        if(channel.channel_previous)
            channel.channel_previous.channel_next = channel.channel_next;

        if(channel.channel_next)
            channel.channel_next.channel_previous = channel.channel_previous;

        if(channel === this.channel_last)
            this.channel_last = channel.channel_previous;

        if(channel === this.channel_first)
            this.channel_first = channel.channel_next;

        channel.channel_next = undefined;
        channel.channel_previous = undefined;
        channel.parent = undefined;

        if(oldChannelParent && oldChannelParent !== new_parent)
            oldChannelParent.events.fire("notify_children_changed");
    }

    moveChannel(channel: ChannelEntry, channel_previous: ChannelEntry, parent: ChannelEntry) {
        if(channel_previous != null && channel_previous.parent != parent) {
            console.error(tr("Invalid channel move (different parents! (%o|%o)"), channel_previous.parent, parent);
            return;
        }

        let root_tree_updated = !channel.parent;
        this.unregisterChannelFromTree(channel, parent);
        channel.channel_previous = channel_previous;
        channel.channel_next = undefined;
        channel.parent = parent;

        if(channel_previous) {
            if(channel_previous == this.channel_last)
                this.channel_last = channel;

            channel.channel_next = channel_previous.channel_next;
            channel_previous.channel_next = channel;

            if(channel.channel_next)
                channel.channel_next.channel_previous = channel;

            if(!channel.parent_channel())
                root_tree_updated = true;
            else
                channel.parent.events.fire("notify_children_changed");
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
                parent.events.fire("notify_children_changed");
            } else {
                console.error("No previous & paretn!");
                channel.channel_next = this.channel_first;
                if(this.channel_first)
                    this.channel_first.channel_previous = channel;

                this.channel_first = channel;
                this.channel_last = this.channel_last || channel;
                root_tree_updated = true;
            }
        }

        //channel.update_family_index();
        //channel.children(true).forEach(e => e.update_family_index());
        //channel.clients(true).forEach(e => e.update_family_index());

        if(channel.channel_previous == channel) {  /* shall never happen */
            channel.channel_previous = undefined;
            debugger;
        }
        if(channel.channel_next == channel) {  /* shall never happen */
            channel.channel_next = undefined;
            debugger;
        }

        if(root_tree_updated)
            this.events.fire("notify_root_channel_changed");
    }

    deleteClient(client: ClientEntry, animate_tag?: boolean) {
        const old_channel = client.currentChannel();
        old_channel?.unregisterClient(client);
        this.clients.remove(client);

        if(old_channel) {
            this.client.side_bar.info_frame().update_channel_client_count(old_channel);
        }


        //FIXME: Trigger the notify_clients_changed event!
        const voice_connection = this.client.serverConnection.voice_connection();
        if(client.get_audio_handle()) {
            if(!voice_connection) {
                log.warn(LogCategory.VOICE, tr("Deleting client with a voice handle, but we haven't a voice connection!"));
            } else {
                voice_connection.unregister_client(client.get_audio_handle());
            }
        }
        client.set_audio_handle(undefined);
        client.destroy();
    }

    registerClient(client: ClientEntry) {
        this.clients.push(client);
        client.channelTree = this;

        const voice_connection = this.client.serverConnection.voice_connection();
        if(voice_connection)
            client.set_audio_handle(voice_connection.register_client(client.clientId()));
    }

    unregisterClient(client: ClientEntry) {
        if(!this.clients.remove(client))
            return;
    }

    insertClient(client: ClientEntry, channel: ChannelEntry) : ClientEntry {
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

            return client;
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    moveClient(client: ClientEntry, channel: ChannelEntry) {
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            let oldChannel = client.currentChannel();
            oldChannel?.unregisterClient(client);
            client["_channel"] = channel;
            channel?.registerClient(client);

            if(oldChannel) {
                this.client.side_bar.info_frame().update_channel_client_count(oldChannel);
            }
            if(channel) {
                this.client.side_bar.info_frame().update_channel_client_count(channel);
            }
            client.speaking = false;
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
    private open_multiselect_context_menu(entries: ChannelTreeEntry<any>[], x: number, y: number) {
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
                                for (const client of clients)
                                    this.client.serverConnection.send_command("clientpoke", {
                                        clid: client.clientId(),
                                        msg: result
                                    });

                                this.selection.clear_selection();
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
                    for(const client of clients)
                        this.client.serverConnection.send_command("clientmove", {
                            clid: client.clientId(),
                            cid: target
                        });
                    this.selection.clear_selection();
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
                        this.selection.clear_selection();
                    }
                });

                if (!music_entry) { //Music bots  cant be poked, banned or kicked
                    client_menu.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        icon_class: "client-poke",
                        name: tr("Poke clients"),
                        callback: () => {
                            this.selection.clear_selection();
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
                            this.selection.clear_selection();
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
                            this.selection.clear_selection();
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
                                    for(const client of clients)
                                        this.client.serverConnection.send_command("musicbotdelete", {
                                            botid: client.properties.client_database_id
                                        });
                                    this.selection.clear_selection();
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
                            for(const channel of channels)
                                this.client.serverConnection.send_command("channeldelete", { cid: channel.channelId });
                            this.selection.clear_selection();
                        }
                    });
                }
            });
        }
        if(server)
            server_menu = server.contextMenuItems();

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
        batch_updates(BatchUpdateType.CHANNEL_TREE);

        try {
            this.selection.reset();

            const voice_connection = this.client.serverConnection ? this.client.serverConnection.voice_connection() : undefined;
            for(const client of this.clients) {
                if(client.get_audio_handle() && voice_connection) {
                    voice_connection.unregister_client(client.get_audio_handle());
                    client.set_audio_handle(undefined);
                }
                client.destroy();
            }
            this.clients = [];

            for(const channel of this.channels)
                channel.destroy();

            this.channels = [];
            this.channel_last = undefined;
            this.channel_first = undefined;
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
            }).then(channel => {
                this.client.log.log(server_log.Type.CHANNEL_CREATE, {
                    channel: channel.log_data(),
                    creator: this.client.getClient().log_data(),
                    own_action: true
                });
                this.client.sound.play(Sound.CHANNEL_CREATED);
            });
        });
    }

    private select_next_channel(channel: ChannelEntry, select_client: boolean) {
        if(select_client) {
            const clients = channel.clients_ordered();
            if(clients.length > 0) {
                this.events.fire("action_select_entries", {
                    mode: "exclusive",
                    entries: [ clients[0] ]
                });
                return;
            }
        }

        const children = channel.children();
        if(children.length > 0) {
            this.events.fire("action_select_entries", {
                mode: "exclusive",
                entries: [ children[0] ]
            });
            return;
        }

        const next = channel.channel_next;
        if(next) {
            this.events.fire("action_select_entries", {
                mode: "exclusive",
                entries: [ next ]
            });
            return;
        }

        let parent = channel.parent_channel();
        while(parent) {
            const p_next = parent.channel_next;
            if(p_next) {
                this.events.fire("action_select_entries", {
                    mode: "exclusive",
                    entries: [ p_next ]
                });
                return;
            }

            parent = parent.parent_channel();
        }
    }

    handle_key_press(event: KeyboardEvent) {
        if(!this._tag_container_focused || !this.selection.is_anything_selected() || this.selection.is_multi_select()) return;

        const selected = this.selection.selected_entries[0];
        if(event.keyCode == KeyCode.KEY_UP) {
            event.preventDefault();
            if(selected instanceof ChannelEntry) {
                let previous = selected.channel_previous;

                if(previous) {
                    while(true) {
                        const siblings = previous.children();
                        if(siblings.length == 0) break;
                        previous = siblings.last();
                    }
                    const clients = previous.clients_ordered();
                    if(clients.length > 0) {
                        this.events.fire("action_select_entries", {
                            mode: "exclusive",
                            entries: [ clients.last() ]
                        });
                        return;
                    } else {
                        this.events.fire("action_select_entries", {
                            mode: "exclusive",
                            entries: [ previous ]
                        });
                        return;
                    }
                } else if(selected.hasParent()) {
                    const channel = selected.parent_channel();
                    const clients = channel.clients_ordered();
                    if(clients.length > 0) {
                        this.events.fire("action_select_entries", {
                            mode: "exclusive",
                            entries: [ clients.last() ]
                        });
                        return;
                    } else {
                        this.events.fire("action_select_entries", {
                            mode: "exclusive",
                            entries: [ channel ]
                        });
                        return;
                    }
                } else {
                    this.events.fire("action_select_entries", {
                        mode: "exclusive",
                        entries: [ this.server ]
                    });
                }
            } else if(selected instanceof ClientEntry) {
                const channel = selected.currentChannel();
                const clients = channel.clients_ordered();
                const index = clients.indexOf(selected);
                if(index > 0) {
                    this.events.fire("action_select_entries", {
                        mode: "exclusive",
                        entries: [ clients[index - 1] ]
                    });
                    return;
                }
                this.events.fire("action_select_entries", {
                    mode: "exclusive",
                    entries: [ channel ]
                });
                return;
            }

        } else if(event.keyCode == KeyCode.KEY_DOWN) {
            event.preventDefault();
            if(selected instanceof ChannelEntry) {
                this.select_next_channel(selected, true);
            } else if(selected instanceof ClientEntry){
                const channel = selected.currentChannel();
                const clients = channel.clients_ordered();
                const index = clients.indexOf(selected);
                if(index + 1 < clients.length) {
                    this.events.fire("action_select_entries", {
                        mode: "exclusive",
                        entries: [ clients[index + 1] ]
                    });
                    return;
                }

                this.select_next_channel(channel, false);
            } else if(selected instanceof ServerEntry)
                this.events.fire("action_select_entries", {
                    mode: "exclusive",
                    entries: [ this.channel_first ]
                });
        } else if(event.keyCode == KeyCode.KEY_RETURN) {
            if(selected instanceof ChannelEntry) {
                selected.joinChannel();
            }
        }
    }

    toggle_server_queries(flag: boolean) {
        if(this._show_queries == flag) return;
        this._show_queries = flag;

        this.events.fire("notify_query_view_state_changed", { queries_shown: flag });
    }
    areServerQueriesShown() { return this._show_queries; }

    get_first_channel?() : ChannelEntry {
        return this.channel_first;
    }

    unsubscribe_all_channels(subscribe_specified?: boolean) {
        if(!this.client.serverConnection || !this.client.serverConnection.connected())
            return;

        this.client.serverConnection.send_command('channelunsubscribeall').then(() => {
            const channels: number[] = [];
            for(const channel of this.channels) {
                if(channel.subscribe_mode == ChannelSubscribeMode.SUBSCRIBED)
                    channels.push(channel.getChannelId());
            }

            if(channels.length > 0) {
                this.client.serverConnection.send_command('channelsubscribe', channels.map(e => { return {cid: e}; })).catch(error => {
                    console.warn(tr("Failed to subscribe to specific channels (%o)"), channels);
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
                if(channel.subscribe_mode == ChannelSubscribeMode.UNSUBSCRIBED)
                    channels.push(channel.getChannelId());
            }

            if(channels.length > 0) {
                this.client.serverConnection.send_command('channelunsubscribe', channels.map(e => { return {cid: e}; })).catch(error => {
                    console.warn(tr("Failed to unsubscribe to specific channels (%o)"), channels);
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
            root.collapsed = false;
            for(const child of root.children(false))
                this.expand_channels(child);
        }
    }

    collapse_channels(root?: ChannelEntry) {
        if(typeof root === "undefined")
            this.rootChannel().forEach(e => this.collapse_channels(e));
        else {
            root.collapsed = true;
            for(const child of root.children(false))
                this.collapse_channels(child);
        }
    }

    private onChannelEntryMove(start, current) {
        const move = this.view_move.current;
        if(!move) return;

        const target = this.view.current.getEntryFromPoint(start.x, start.y);
        if(target && this.selection.selected_entries.findIndex(e => e === target) === -1)
            this.events.fire("action_select_entries", { mode: "auto", entries: [ target ]});

        const selection = this.selection.selected_entries;
        if(selection.length === 0 || selection.filter(e => !(e instanceof ClientEntry)).length > 0)
            return;

        move.enableEntryMove(this.view.current, selection.map(e => e as ClientEntry).map(e => e.clientNickName()).join(","), start, current, () => {
            this.events.fire("notify_entry_move_begin");
        });
    }

    private onMoveEnd(x: number, y: number) {
        batch_updates(BatchUpdateType.CHANNEL_TREE);
        try {
            this.events.fire("notify_entry_move_end");

            const selection = this.selection.selected_entries.filter(e => e instanceof ClientEntry) as ClientEntry[];
            if(selection.length === 0) return;
            this.selection.clear_selection();

            const target = this.view.current.getEntryFromPoint(x, y);
            let target_channel: ChannelEntry;
            if(target instanceof ClientEntry)
                target_channel = target.currentChannel();
            else if(target instanceof ChannelEntry)
                target_channel = target;
            if(!target_channel) return;

            selection.filter(e => e.currentChannel() !== target_channel).forEach(e => {
                this.client.serverConnection.send_command("clientmove", {
                    clid: e.clientId(),
                    cid: target_channel.channelId
                });
            });
        } finally {
            flush_batched_updates(BatchUpdateType.CHANNEL_TREE);
        }
    }

    isClientMoveActive() {
        return !!this.view_move.current?.isActive();
    }
}