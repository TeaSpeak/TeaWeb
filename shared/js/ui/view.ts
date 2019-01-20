/// <reference path="../voice/VoiceHandler.ts" />
/// <reference path="../client.ts" />
/// <reference path="../contextMenu.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />
/// <reference path="modal/ModalCreateChannel.ts" />


class ChannelTree {
    client: TSClient;
    htmlTree: JQuery;
    server: ServerEntry;
    channels: ChannelEntry[];
    clients: ClientEntry[];

    currently_selected: ClientEntry | ServerEntry | ChannelEntry | (ClientEntry | ServerEntry)[] = undefined;
    currently_selected_context_callback: (event) => any = undefined;
    readonly client_mover: ClientMover;

    private _show_queries: boolean;
    private channel_last?: ChannelEntry;
    private channel_first?: ChannelEntry;

    private selected_event?: Event;

    constructor(client, htmlTree) {
        document.addEventListener("touchstart", function(){}, true);

        this.client = client;
        this.htmlTree = htmlTree;
        this.client_mover = new ClientMover(this);
        this.reset();

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.htmlTree.parent().on("contextmenu", (event) => {
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

        this.htmlTree.on('resize', this.handle_resized.bind(this));

        /* TODO release these events again when ChannelTree get deinitialized */
        $(document).on('click', event => {
            if(this.selected_event != event.originalEvent)
                this.selected_event = undefined;
        });
        $(document).on('keydown', this.handle_key_press.bind(this));
        this.htmlTree.on('click', event => {{
            this.selected_event = event.originalEvent;
        }});
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate =
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);

        spawn_context_menu(x, y,
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_create",
                name: tr("Create channel"),
                invalidPermission: !channelCreate,
                callback: () => this.spawnCreateChannel()
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    initialiseHead(serverName: string, address: ServerAddress) {
        this.server = new ServerEntry(this, serverName, address);
        this.server.htmlTag.appendTo(this.htmlTree);
        this.server.initializeListener();
    }

    private __deleteAnimation(element: ChannelEntry | ClientEntry) {
        let tag = element instanceof ChannelEntry ? element.rootTag() : element.tag;
        this.htmlTree.find(tag).fadeOut("slow", () => {
            tag.remove();
            if(element instanceof ChannelEntry) {
                if(element.parent_channel())
                    element.parent_channel().adjustSize(true);
            } else if(element instanceof ClientEntry) {
                element.currentChannel().adjustSize(true);
            }
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
        let tag = this.htmlTree;

        let previous_channel = null;
        if(channel.hasParent()) {
            let parent = channel.parent_channel();
            let siblings = parent.siblings();
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

        let entry = channel.rootTag().css({display: "none"}).fadeIn("slow");
        entry.appendTo(tag);

        channel.originalHeight = entry.outerHeight(false);
        if(elm != undefined)
            elm.after(entry);

        if(channel.channel_previous == channel) /* shall never happen */
            channel.channel_previous = undefined;
        if(channel.channel_next == channel) /* shall never happen */
            channel.channel_next = undefined;

        channel.adjustSize(true);
        channel.initializeListener();
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

    moveChannel(channel: ChannelEntry, channel_previus: ChannelEntry, parent: ChannelEntry) {
        if(channel_previus != null && channel_previus.parent != parent) {
            console.error(tr("Invalid channel move (different parents! (%o|%o)"), channel_previus.parent, parent);
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


        let oldParent = channel.parent_channel();
        channel.channel_next = undefined;
        channel.channel_previous = channel_previus;
        channel.parent = parent;

        if(channel_previus) {
            if(channel_previus == this.channel_last)
                this.channel_last = channel;

            channel.channel_next = channel_previus.channel_next;
            channel_previus.channel_next = channel;
            channel_previus.rootTag().after(channel.rootTag());

            if(channel.channel_next)
                channel.channel_next.channel_previous = channel;
        } else {
            if(parent) {
                let siblings = parent.siblings();
                if(siblings.length <= 1) { //Self should be already in there
                    let left = channel.rootTag();
                    left.appendTo(parent.siblingTag());

                    channel.channel_next = undefined;
                } else {
                    channel.channel_previous = siblings[siblings.length - 2];
                    channel.channel_previous.rootTag().after(channel.rootTag());

                    channel.channel_next = channel.channel_previous.channel_next;
                    channel.channel_next.channel_previous = channel;
                    channel.channel_previous.channel_next = channel;
                }
            } else {
                this.htmlTree.find(".server").after(channel.rootTag());

                channel.channel_next = this.channel_first;
                if(this.channel_first)
                    this.channel_first.channel_previous = channel;

                this.channel_first = channel;
            }
        }

        if(channel.channel_previous == channel) /* shall never happen */
            channel.channel_previous = undefined;
        if(channel.channel_next == channel) /* shall never happen */
            channel.channel_next = undefined;

        if(oldParent) {
            oldParent.adjustSize();
        }
        if(channel) {
            channel.adjustSize();
        }
    }

    deleteClient(client: ClientEntry) {
        this.clients.remove(client);
        this.__deleteAnimation(client);
        client.onDelete();
    }

    insertClient(client: ClientEntry, channel: ChannelEntry) : ClientEntry {
        let newClient = this.findClient(client.clientId());
        if(newClient) client = newClient; //Got new client :)
        else
            this.clients.push(client);

        if(!this._show_queries && client.properties.client_type == ClientType.CLIENT_QUERY)
            client.tag.hide();

        client.channelTree = this;
        client["_channel"] = channel;

        let tag = client.tag.css({display: "none"}).fadeIn("slow");
        tag.appendTo(channel.clientTag());
        channel.adjustSize(true);
        client.currentChannel().reorderClients();

        channel.updateChannelTypeIcon();
        return client;
    }

    registerClient(client: ClientEntry) {
        this.clients.push(client);
        client.channelTree = this;
    }

    reorderAllClients() {
        for(let channel of this.channels)
            channel.reorderClients();
    }

    moveClient(client: ClientEntry, channel: ChannelEntry) {
        let oldChannel = client.currentChannel();
        client["_channel"] = channel;

        let tag = client.tag;
        tag.detach();
        tag.appendTo(client.currentChannel().clientTag());
        if(oldChannel) {
            oldChannel.adjustSize();
            oldChannel.updateChannelTypeIcon();
        }
        if(client.currentChannel()) {
            client.currentChannel().adjustSize();
            client.currentChannel().reorderClients();
            client.currentChannel().updateChannelTypeIcon();
        }
        client.updateClientStatusIcons();
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
        console.log("Select: " + entry);
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
            this.htmlTree.find(".selected").each(function (idx, e) {
                $(e).removeClass("selected");
            });
        } else {
            for(const e of this.currently_selected)
                if(e == entry) {
                    this.currently_selected.remove(e);
                    if(entry instanceof ChannelEntry)
                        (entry as ChannelEntry).rootTag().find("> .channelLine").removeClass("selected");
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
            (entry as ChannelEntry).rootTag().find("> .channelLine").addClass("selected");
        else if(entry instanceof ClientEntry)
            (entry as ClientEntry).tag.addClass("selected");
        else if(entry instanceof ServerEntry)
            (entry as ServerEntry).htmlTag.addClass("selected");

        this.client.selectInfo.setCurrentSelected($.isArray(this.currently_selected) ? undefined : entry);
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
        console.log(tr("Music only: %o | Container music: %o | Container local: %o"), music_entry, music_entry, local_client);
        let entries: ContextMenuEntry[] = [];
        if (!music_entry && !local_client) { //Music bots or local client cant be poked
            entries.push({
                type: MenuEntryType.ENTRY,
                icon: "client-poke",
                name: tr("Poke clients"),
                callback: () => {
                    createInputModal(tr("Poke clients"), tr("Poke message:<br>"), text => true, result => {
                        if (typeof(result) === "string") {
                            for (const client of this.currently_selected as ClientEntry[])
                                this.client.serverConnection.sendCommand("clientpoke", {
                                    clid: client.clientId(),
                                    msg: result
                                });

                        }
                    }, {width: 400, maxLength: 512}).open();
                }
            });
        }
        entries.push({
            type: MenuEntryType.ENTRY,
            icon: "client-move_client_to_own_channel",
            name: tr("Move clients to your channel"),
            callback: () => {
                const target = this.client.getClient().currentChannel().getChannelId();
                for(const client of clients)
                    this.client.serverConnection.sendCommand("clientmove", {
                        clid: client.clientId(),
                        cid: target
                    });
            }
        });
        if (!local_client) {//local client cant be kicked and/or banned or kicked
            entries.push(MenuEntry.HR());
            entries.push({
                type: MenuEntryType.ENTRY,
                icon: "client-kick_channel",
                name: tr("Kick clients from channel"),
                callback: () => {
                    createInputModal(tr("Kick clients from channel"), tr("Kick reason:<br>"), text => true, result => {
                        if (result) {
                            for (const client of clients)
                                this.client.serverConnection.sendCommand("clientkick", {
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
                    type: MenuEntryType.ENTRY,
                    icon: "client-kick_server",
                    name: tr("Kick clients fom server"),
                    callback: () => {
                        createInputModal(tr("Kick clients from server"), tr("Kick reason:<br>"), text => true, result => {
                            if (result) {
                                for (const client of clients)
                                    this.client.serverConnection.sendCommand("clientkick", {
                                        clid: client.clientId(),
                                        reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                        reasonmsg: result
                                    });

                            }
                        }, {width: 400, maxLength: 255}).open();
                    }
                }, {
                    type: MenuEntryType.ENTRY,
                    icon: "client-ban_client",
                    name: tr("Ban clients"),
                    invalidPermission: !this.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                    callback: () => {
                        Modals.spawnBanClient((clients).map(entry => entry.clientNickName()), (data) => {
                            for (const client of clients)
                                this.client.serverConnection.sendCommand("banclient", {
                                    uid: client.properties.client_unique_identifier,
                                    banreason: data.reason,
                                    time: data.length
                                }, [data.no_ip ? "no-ip" : "", data.no_hwid ? "no-hardware-id" : "", data.no_name ? "no-nickname" : ""]).then(() => {
                                    sound.play(Sound.USER_BANNED);
                                });
                        });
                    }
                });
            }
            if(music_only) {
                entries.push(MenuEntry.HR());
                entries.push({
                    name: tr("Delete bots"),
                    icon: "client-delete",
                    disabled: false,
                    callback: () => {
                        const param_string = clients.map((_, index) => "{" + index + "}").join(', ');
                        const param_values = clients.map(client => client.createChatTag(true));
                        const tag = $.spawn("div").append(...MessageHelper.formatMessage(tr("Do you really want to delete ") + param_string, ...param_values));
                        const tag_container = $.spawn("div").append(tag);
                        Modals.spawnYesNo(tr("Are you sure?"), tag_container, result => {
                            if(result) {
                                for(const client of clients)
                                    this.client.serverConnection.sendCommand("musicbotdelete", {
                                        botid: client.properties.client_database_id
                                    });
                            }
                        });
                    },
                    type: MenuEntryType.ENTRY
                });
            }
        }
        spawn_context_menu(event.pageX, event.pageY, ...entries);
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
        this.server = null;
        this.clients = [];
        this.channels = [];
        this.htmlTree.children().detach(); //Do not remove the listener!

        this.channel_first = undefined;
        this.channel_last = undefined;
    }

    spawnCreateChannel(parent?: ChannelEntry) {
        Modals.createChannelModal(undefined, parent, this.client.permissions, (properties?, permissions?) => {
            if(!properties) return;
            properties["cpid"] = parent ? parent.channelId : 0;
            log.debug(LogCategory.CHANNEL, tr("Creating a new channel.\nProperties: %o\nPermissions: %o"), properties);
            this.client.serverConnection.sendCommand("channelcreate", properties).then(() => {
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
                    return this.client.serverConnection.sendCommand("channeladdperm", perms, ["continueonerror"]).then(() => new Promise<ChannelEntry>(resolve => { resolve(channel); }));
                }

                return new Promise<ChannelEntry>(resolve => { resolve(channel); })
            }).then(channel => {
                chat.serverChat().appendMessage(tr("Channel {} successfully created!"), true, channel.generate_tag(true));
                sound.play(Sound.CHANNEL_CREATED);
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

        const children = channel.siblings();
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
        if(!this.selected_event || !this.currently_selected || $.isArray(this.currently_selected)) return;

        if(event.keyCode == JQuery.Key.ArrowUp) {
            event.preventDefault();
            if(this.currently_selected instanceof ChannelEntry) {
                let previous = this.currently_selected.channel_previous;

                if(previous) {
                    while(true) {
                        const siblings = previous.siblings();
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

        } else if(event.keyCode == JQuery.Key.ArrowDown) {
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
        } else if(event.keyCode == JQuery.Key.Enter) {
            if(this.currently_selected instanceof ChannelEntry) {
                this.currently_selected.joinChannel();
            }
        }
    }

    toggle_server_queries(flag: boolean) {
        if(this._show_queries == flag) return;
        this._show_queries = flag;

        //FIXME resize channels
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
        for(const channel of channels)
            channel.adjustSize();
    }
}