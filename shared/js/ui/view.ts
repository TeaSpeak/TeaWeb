/// <reference path="../ConnectionHandler.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />
/// <reference path="modal/ModalCreateChannel.ts" />


class ChannelTree {
    client: ConnectionHandler;
    server: ServerEntry;

    channels: ChannelEntry[] = [];
    clients: ClientEntry[] = [];

    currently_selected: ClientEntry | ServerEntry | ChannelEntry | (ClientEntry | ServerEntry)[] = undefined;
    currently_selected_context_callback: (event) => any = undefined;
    readonly client_mover: ClientMover;

    private _tag_container: JQuery;
    private _tag_entries: JQuery;

    private _tree_detached: boolean = false;
    private _show_queries: boolean;
    private channel_last?: ChannelEntry;
    private channel_first?: ChannelEntry;

    private _focused = false;
    private _listener_document_click;
    private _listener_document_key;

    constructor(client) {
        this.client = client;

        this._tag_container = $.spawn("div").addClass("channel-tree-container");
        this._tag_entries = $.spawn("div").addClass("channel-tree");

        this.client_mover = new ClientMover(this);
        this.reset();

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this._tag_container.on("contextmenu", (event) => {
                if(event.isDefaultPrevented()) return;

                for(const element of document.elementsFromPoint(event.pageX, event.pageY))
                    if(element.classList.contains("channelLine") || element.classList.contains("client"))
                        return;

                event.preventDefault();
                if($.isArray(this.currently_selected)) { //Multiselect
                    (this.currently_selected_context_callback || ((_) => null))(event);
                } else {
                    this.onSelect(undefined);
                    this.showContextMenu(event.pageX, event.pageY);
                }
            });
        }

        this._tag_container.on('resize', this.handle_resized.bind(this));
        this._listener_document_key = event => this.handle_key_press(event);
        this._listener_document_click = event => {
            this._focused = false;
            let element = event.target as HTMLElement;
            while(element) {
                if(element === this._tag_container[0]) {
                    this._focused = true;
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

    destroy() {
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
        this.currently_selected = undefined;
        this.currently_selected_context_callback = undefined;
    }

    hide_channel_tree() {
        this._tag_entries.detach();
        this._tree_detached = true;
    }

    show_channel_tree() {
        this._tree_detached = false;
        this._tag_entries.appendTo(this._tag_container);

        this.channels.forEach(e => {
            e.recalculate_repetitive_name();
            e.reorderClients();
        });
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
            contextmenu.Entry.CLOSE(on_close)
        );
    }

    initialiseHead(serverName: string, address: ServerAddress) {
        if(this.server) {
            this.server.destroy();
            this.server = undefined;
        }
        this.server = new ServerEntry(this, serverName, address);
        this.server.htmlTag.appendTo(this._tag_entries);
        this.server.initializeListener();
    }

    private __deleteAnimation(element: ChannelEntry | ClientEntry) {
        let tag = element instanceof ChannelEntry ? element.rootTag() : element.tag;
        tag.fadeOut("slow", () => {
            tag.detach();
            element.destroy();
        });
    }

    rootChannel() : ChannelEntry[] {
        return this.channels.filter(e => e.parent == undefined);
    }

    deleteChannel(channel: ChannelEntry) {
        const _this = this;
        for(let index = 0; index < this.channels.length; index++) {
            let entry = this.channels[index];
            let currentEntry = this.channels[index];
            while(currentEntry != undefined && currentEntry != null) {
                if(currentEntry == channel) {
                    _this.channels.remove(entry);
                    _this.__deleteAnimation(entry);
                    entry.channelTree = null;
                    index--;
                    break;
                } else currentEntry = currentEntry.parent_channel();
            }
        }

        this.channels.remove(channel);
        this.__deleteAnimation(channel);
        channel.channelTree = null;

        if(channel.channel_previous)
            channel.channel_previous.channel_next = channel.channel_next;

        if(channel.channel_next)
            channel.channel_next.channel_previous = channel.channel_previous;

        if(channel == this.channel_first)
            this.channel_first = channel.channel_next;

        if(channel == this.channel_last)
            this.channel_last = channel.channel_previous;
    }

    insertChannel(channel: ChannelEntry) {
        channel.channelTree = this;
        this.channels.push(channel);

        let elm = undefined;
        let tag = this._tag_entries;

        let previous_channel = null;
        if(channel.hasParent()) {
            let parent = channel.parent_channel();
            let siblings = parent.children();
            if(siblings.length == 0) {
                elm = parent.rootTag();
                previous_channel = null;
            } else {
                previous_channel = siblings.last();
                elm = previous_channel.tag;
            }
            tag = parent.siblingTag();
        } else {
            previous_channel = this.channel_last;

            if(!this.channel_last)
                this.channel_last = channel;

            if(!this.channel_first)
                this.channel_first = channel;
        }

        channel.channel_previous = previous_channel;
        channel.channel_next = undefined;

        if(previous_channel) {
            channel.channel_next = previous_channel.channel_next;
            previous_channel.channel_next = channel;

            if(channel.channel_next)
                channel.channel_next.channel_previous = channel;
        }

        let entry = channel.rootTag();
        if(!this._tree_detached)
            entry.css({display: "none"}).fadeIn("slow");
        entry.appendTo(tag);

        if(elm != undefined)
            elm.after(entry);

        if(channel.channel_previous == channel) /* shall never happen */
            channel.channel_previous = undefined;
        if(channel.channel_next == channel) /* shall never happen */
            channel.channel_next = undefined;

        channel.initializeListener();
        channel.update_family_index();
    }

    findChannel(channelId: number) : ChannelEntry | undefined {
        for(let index = 0; index < this.channels.length; index++)
            if(this.channels[index].getChannelId() == channelId) return this.channels[index];
        return undefined;
    }

    find_channel_by_name(name: string, parent?: ChannelEntry, force_parent: boolean = true) : ChannelEntry | undefined {
        for(let index = 0; index < this.channels.length; index++)
            if(this.channels[index].channelName() == name && (!force_parent || parent == this.channels[index].parent))
                return this.channels[index];
        return undefined;
    }

    moveChannel(channel: ChannelEntry, channel_previous: ChannelEntry, parent: ChannelEntry) {
        if(channel_previous != null && channel_previous.parent != parent) {
            console.error(tr("Invalid channel move (different parents! (%o|%o)"), channel_previous.parent, parent);
            return;
        }

        if(channel.channel_next)
            channel.channel_next.channel_previous = channel.channel_previous;

        if(channel.channel_previous)
            channel.channel_previous.channel_next = channel.channel_next;

        if(channel == this.channel_last)
            this.channel_last = channel.channel_previous;

        if(channel == this.channel_first)
            this.channel_first = channel.channel_next;


        channel.channel_next = undefined;
        channel.channel_previous = channel_previous;
        channel.parent = parent;

        if(channel_previous) {
            if(channel_previous == this.channel_last)
                this.channel_last = channel;

            channel.channel_next = channel_previous.channel_next;
            channel_previous.channel_next = channel;
            channel_previous.rootTag().after(channel.rootTag());

            if(channel.channel_next)
                channel.channel_next.channel_previous = channel;
        } else {
            if(parent) {
                let children = parent.children();
                if(children.length <= 1) { //Self should be already in there
                    let left = channel.rootTag();
                    left.appendTo(parent.siblingTag());

                    channel.channel_next = undefined;
                } else {
                    channel.channel_previous = undefined;
                    channel.rootTag().prependTo(parent.siblingTag());

                    channel.channel_next = children[1]; /* children 0 shall be the channel itself */
                    channel.channel_next.channel_previous = channel;
                }
            } else {
                this._tag_entries.find(".server").after(channel.rootTag());

                channel.channel_next = this.channel_first;
                if(this.channel_first)
                    this.channel_first.channel_previous = channel;

                this.channel_first = channel;
            }
        }

        channel.update_family_index();
        channel.children(true).forEach(e => e.update_family_index());
        channel.clients(true).forEach(e => e.update_family_index());

        if(channel.channel_previous == channel) {  /* shall never happen */
            channel.channel_previous = undefined;
            debugger;
        }
        if(channel.channel_next == channel) {  /* shall never happen */
            channel.channel_next = undefined;
            debugger;
        }
    }

    deleteClient(client: ClientEntry, animate_tag?: boolean) {
        const old_channel = client.currentChannel();
        this.clients.remove(client);
        if(typeof(animate_tag) !== "boolean" || animate_tag)
            this.__deleteAnimation(client);
        else
            client.tag.detach();
        client.onDelete();

        if(old_channel) {
            this.client.side_bar.info_frame().update_channel_client_count(old_channel);
        }

        const voice_connection = this.client.serverConnection.voice_connection();
        if(client.get_audio_handle()) {
            if(!voice_connection) {
                log.warn(LogCategory.VOICE, tr("Deleting client with a voice handle, but we haven't a voice connection!"));
            } else {
                voice_connection.unregister_client(client.get_audio_handle());
            }
        }
        client.set_audio_handle(undefined);
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
        client.tree_unregistered();
    }

    private _update_timer: number;
    private _reorder_channels = new Set<ChannelEntry>();

    insertClient(client: ClientEntry, channel: ChannelEntry) : ClientEntry {
        let newClient = this.findClient(client.clientId());
        if(newClient)
            client = newClient; //Got new client :)
        else {
            this.registerClient(client);
        }

        client["_channel"] = channel;
        let tag = client.tag;

        if(!this._show_queries && client.properties.client_type == ClientType.CLIENT_QUERY)
            client.tag.hide();
        else if(!this._tree_detached)
            tag.css("display", "none").fadeIn("slow");

        tag.appendTo(channel.clientTag());
        channel.reorderClients();

        /* schedule a reorder for this channel. */
        this._reorder_channels.add(client.currentChannel());
        if(!this._update_timer) {
            this._update_timer = setTimeout(() => {
                this._update_timer = undefined;
                for(const channel of this._reorder_channels) {
                    channel.updateChannelTypeIcon();
                    this.client.side_bar.info_frame().update_channel_client_count(channel);
                }
                this._reorder_channels.clear();
            }, 5) as any;
        }

        client.update_family_index(); /* why the hell is this here?! */
        return client;
    }

    moveClient(client: ClientEntry, channel: ChannelEntry) {
        let oldChannel = client.currentChannel();
        client["_channel"] = channel;

        let tag = client.tag;
        tag.detach();
        tag.appendTo(client.currentChannel().clientTag());
        if(oldChannel) {
            oldChannel.updateChannelTypeIcon();
            this.client.side_bar.info_frame().update_channel_client_count(oldChannel);
        }
        if(channel) {
            channel.reorderClients();
            channel.updateChannelTypeIcon();
            this.client.side_bar.info_frame().update_channel_client_count(channel);
        }
        client.updateClientStatusIcons();
        client.update_family_index();
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

    private static same_selected_type(a, b) {
        if(a instanceof ChannelEntry)
            return b instanceof ChannelEntry;
        if(a instanceof ClientEntry)
            return b instanceof ClientEntry;
        if(a instanceof ServerEntry)
            return b instanceof ServerEntry;
        return a == b;
    }

    onSelect(entry?: ChannelEntry | ClientEntry | ServerEntry, enforce_single?: boolean, flag_shift?: boolean) {
        if(this.currently_selected && (ppt.key_pressed(ppt.SpecialKey.SHIFT) || flag_shift) && entry instanceof ClientEntry) { //Currently we're only supporting client multiselects :D
            if(!entry) return; //Nowhere

            if($.isArray(this.currently_selected)) {
                if(!ChannelTree.same_selected_type(this.currently_selected[0], entry)) return; //Not the same type
            } else if(ChannelTree.same_selected_type(this.currently_selected, entry)) {
                this.currently_selected = [this.currently_selected] as any;
            }
            if(entry instanceof ChannelEntry)
                this.currently_selected_context_callback = this.callback_multiselect_channel.bind(this);
            if(entry instanceof ClientEntry)
                this.currently_selected_context_callback = this.callback_multiselect_client.bind(this);
        } else
            this.currently_selected = undefined;

        if(!$.isArray(this.currently_selected) || enforce_single) {
            this.currently_selected = entry;
            this._tag_entries.find(".selected").each(function (idx, e) {
                $(e).removeClass("selected");
            });
        } else {
            for(const e of this.currently_selected)
                if(e == entry) {
                    this.currently_selected.remove(e);
                    if(entry instanceof ChannelEntry)
                        (entry as ChannelEntry).channelTag().removeClass("selected");
                    else if(entry instanceof ClientEntry)
                        (entry as ClientEntry).tag.removeClass("selected");
                    else if(entry instanceof ServerEntry)
                        (entry as ServerEntry).htmlTag.removeClass("selected");
                    if(this.currently_selected.length == 1)
                        this.currently_selected = this.currently_selected[0];
                    else if(this.currently_selected.length == 0)
                        this.currently_selected = undefined;
                    //Already selected
                    return;
                }
            this.currently_selected.push(entry as any);
        }

        if(entry instanceof ChannelEntry)
            (entry as ChannelEntry).channelTag().addClass("selected");
        else if(entry instanceof ClientEntry)
            (entry as ClientEntry).tag.addClass("selected");
        else if(entry instanceof ServerEntry)
            (entry as ServerEntry).htmlTag.addClass("selected");

        if(!$.isArray(this.currently_selected)) {
            if(this.currently_selected instanceof ClientEntry && settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT)) {
                this.client.side_bar.show_client_info(this.currently_selected);
            } else if(this.currently_selected instanceof ChannelEntry && settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
                this.client.side_bar.channel_conversations().set_current_channel(this.currently_selected.channelId);
                this.client.side_bar.show_channel_conversations();
            } else if(this.currently_selected instanceof ServerEntry && settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
                this.client.side_bar.channel_conversations().set_current_channel(0);
                this.client.side_bar.show_channel_conversations();
            }
        }
    }

    private callback_multiselect_channel(event) {
        console.log(tr("Multiselect channel"));
    }
    private callback_multiselect_client(event) {
        console.log(tr("Multiselect client"));
        const clients = this.currently_selected as ClientEntry[];
        const music_only = clients.map(e => e instanceof MusicClientEntry ? 0 : 1).reduce((a, b) => a + b, 0) == 0;
        const music_entry = clients.map(e => e instanceof MusicClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;
        const local_client = clients.map(e => e instanceof LocalClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;
        let entries: contextmenu.MenuEntry[] = [];
        if (!music_entry && !local_client) { //Music bots or local client cant be poked
            entries.push({
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-poke",
                name: tr("Poke clients"),
                callback: () => {
                    createInputModal(tr("Poke clients"), tr("Poke message:<br>"), text => true, result => {
                        if (typeof(result) === "string") {
                            for (const client of this.currently_selected as ClientEntry[])
                                this.client.serverConnection.send_command("clientpoke", {
                                    clid: client.clientId(),
                                    msg: result
                                });

                        }
                    }, {width: 400, maxLength: 512}).open();
                }
            });
        }
        entries.push({
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
            }
        });
        if (!local_client) {//local client cant be kicked and/or banned or kicked
            entries.push(contextmenu.Entry.HR());
            entries.push({
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

            if (!music_entry) { //Music bots  cant be banned or kicked
                entries.push({
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
                        Modals.spawnBanClient(this.client, (clients).map(entry => {
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
                entries.push(contextmenu.Entry.HR());
                entries.push({
                    name: tr("Delete bots"),
                    icon_class: "client-delete",
                    disabled: false,
                    callback: () => {
                        const param_string = clients.map((_, index) => "{" + index + "}").join(', ');
                        const param_values = clients.map(client => client.createChatTag(true));
                        const tag = $.spawn("div").append(...MessageHelper.formatMessage(tr("Do you really want to delete ") + param_string, ...param_values));
                        const tag_container = $.spawn("div").append(tag);
                        Modals.spawnYesNo(tr("Are you sure?"), tag_container, result => {
                            if(result) {
                                for(const client of clients)
                                    this.client.serverConnection.send_command("musicbotdelete", {
                                        botid: client.properties.client_database_id
                                    });
                            }
                        });
                    },
                    type: contextmenu.MenuEntryType.ENTRY
                });
            }
        }
        contextmenu.spawn_context_menu(event.pageX, event.pageY, ...entries);
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

    reset(){
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

        this._tag_entries.children().detach(); //Dont remove listeners

        this.channel_first = undefined;
        this.channel_last = undefined;
    }

    spawnCreateChannel(parent?: ChannelEntry) {
        Modals.createChannelModal(this.client, undefined, parent, this.client.permissions, (properties?, permissions?) => {
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
                this.client.log.log(log.server.Type.CHANNEL_CREATE, {
                    channel: channel.log_data(),
                    creator: this.client.getClient().log_data(),
                    own_action: true
                });
                this.client.sound.play(Sound.CHANNEL_CREATED);
            });
        });
    }

    handle_resized() {
        for(let channel of this.channels)
            channel.handle_frame_resized();
    }

    private select_next_channel(channel: ChannelEntry, select_client: boolean) {
        if(select_client) {
            const clients = channel.clients_ordered();
            if(clients.length > 0) {
                this.onSelect(clients[0], true);
                return;
            }
        }

        const children = channel.children();
        if(children.length > 0) {
            this.onSelect(children[0], true);
            return;
        }

        const next = channel.channel_next;
        if(next) {
            this.onSelect(next, true);
            return;
        }

        let parent = channel.parent_channel();
        while(parent) {
            const p_next = parent.channel_next;
            if(p_next) {
                this.onSelect(p_next, true);
                return;
            }

            parent = parent.parent_channel();
        }
    }

    handle_key_press(event: KeyboardEvent) {
        //console.log("Keydown: %o | %o | %o", this._focused, this.currently_selected, Array.isArray(this.currently_selected));
        if(!this._focused || !this.currently_selected || Array.isArray(this.currently_selected)) return;

        if(event.keyCode == KeyCode.KEY_UP) {
            event.preventDefault();
            if(this.currently_selected instanceof ChannelEntry) {
                let previous = this.currently_selected.channel_previous;

                if(previous) {
                    while(true) {
                        const siblings = previous.children();
                        if(siblings.length == 0) break;
                        previous = siblings.last();
                    }
                    const clients = previous.clients_ordered();
                    if(clients.length > 0) {
                        this.onSelect(clients.last(), true);
                        return;
                    } else {
                        this.onSelect(previous, true);
                        return;
                    }
                } else if(this.currently_selected.hasParent()) {
                    const channel = this.currently_selected.parent_channel();
                    const clients = channel.clients_ordered();
                    if(clients.length > 0) {
                        this.onSelect(clients.last(), true);
                        return;
                    } else {
                        this.onSelect(channel, true);
                        return;
                    }
                } else
                    this.onSelect(this.server, true);
            } else if(this.currently_selected instanceof ClientEntry) {
                const channel = this.currently_selected.currentChannel();
                const clients = channel.clients_ordered();
                const index = clients.indexOf(this.currently_selected);
                if(index > 0) {
                    this.onSelect(clients[index - 1], true);
                    return;
                }

                this.onSelect(channel, true);
                return;
            }

        } else if(event.keyCode == KeyCode.KEY_DOWN) {
            event.preventDefault();
            if(this.currently_selected instanceof ChannelEntry) {
                this.select_next_channel(this.currently_selected, true);
            } else if(this.currently_selected instanceof ClientEntry){
                const channel = this.currently_selected.currentChannel();
                const clients = channel.clients_ordered();
                const index = clients.indexOf(this.currently_selected);
                if(index + 1 < clients.length) {
                    this.onSelect(clients[index + 1], true);
                    return;
                }

                this.select_next_channel(channel, false);
            } else if(this.currently_selected instanceof ServerEntry)
                this.onSelect(this.channel_first, true);
        } else if(event.keyCode == KeyCode.KEY_RETURN) {
            if(this.currently_selected instanceof ChannelEntry) {
                this.currently_selected.joinChannel();
            }
        }
    }

    toggle_server_queries(flag: boolean) {
        if(this._show_queries == flag) return;
        this._show_queries = flag;

        const channels: ChannelEntry[] = []
        for(const client of this.clients)
            if(client.properties.client_type == ClientType.CLIENT_QUERY) {
                if(this._show_queries)
                    client.tag.show();
                else
                    client.tag.hide();
                if(channels.indexOf(client.currentChannel()) == -1)
                    channels.push(client.currentChannel());
            }
    }

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
}