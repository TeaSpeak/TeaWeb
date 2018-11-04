/// <reference path="../voice/VoiceHandler.ts" />
/// <reference path="../client.ts" />
/// <reference path="../contextMenu.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />
/// <reference path="modal/ModalCreateChannel.ts" />

let shift_pressed = false;
$(document).on('keyup keydown', function(e){
    shift_pressed = e.shiftKey;
    console.log(shift_pressed);
});
class ChannelTree {
    client: TSClient;
    htmlTree: JQuery;
    server: ServerEntry;
    channels: ChannelEntry[];
    clients: ClientEntry[];

    currently_selected: ClientEntry | ServerEntry | ChannelEntry | (ClientEntry | ServerEntry)[] = undefined;
    currently_selected_context_callback: (event) => any = undefined;
    readonly client_mover: ClientMover;

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
                name: "Create channel",
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
                if(element.parentChannel())
                    element.parentChannel().adjustSize(true);
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
                } else currentEntry = currentEntry.parentChannel();
            }
        }

        this.channels.remove(channel);
        this.__deleteAnimation(channel);
        channel.channelTree = null;
    }

    insertChannel(channel: ChannelEntry) {
        channel.channelTree = this;
        this.channels.push(channel);

        let elm = undefined;
        let tag = this.htmlTree;
        let prevChannel = null;
        if(channel.hasParent()) {
            let parent = channel.parentChannel();
            let siblings = parent.siblings();
            if(siblings.length == 0) {
                elm = parent.rootTag();
                prevChannel = null;
            } else {
                prevChannel = siblings.last();
                elm = prevChannel.tag;
            }
            tag = parent.siblingTag();
        }
        channel.prevChannel = prevChannel;
        let entry = channel.rootTag().css({display: "none"}).fadeIn("slow");

        entry.appendTo(tag);
        channel.originalHeight = entry.outerHeight(false);
        if(elm != undefined)
            elm.after(entry);

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

    moveChannel(channel: ChannelEntry, prevChannel: ChannelEntry, parent: ChannelEntry) {
        if(prevChannel != null && prevChannel.parent != parent) {
            console.error("Invalid channel move (different parents! (" + prevChannel.parent + "|" + parent + ")");
            return;
        }
        let oldParent = channel.parentChannel();
        channel.prevChannel = prevChannel;
        channel.parent = parent;

        if(prevChannel)
            prevChannel.rootTag().after(channel.rootTag());
        else {
            if(parent) {
                let siblings = parent.siblings();
                if(siblings.length <= 1) { //Self should be already in there
                    let left = channel.rootTag();
                    left.appendTo($(parent.siblingTag()));
                } else {
                    channel.prevChannel = siblings[siblings.length - 2];
                    channel.prevChannel.rootTag().after(channel.rootTag());
                }
            } else
                this.htmlTree.find(".server").after(channel.rootTag());
        }


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

    private static same_selected_type(a, b) {
        if(a instanceof ChannelEntry)
            return b instanceof ChannelEntry;
        if(a instanceof ClientEntry)
            return b instanceof ClientEntry;
        if(a instanceof ServerEntry)
            return b instanceof ServerEntry;
        return a == b;
    }

    onSelect(entry?: ChannelEntry | ClientEntry | ServerEntry, enforce_single?: boolean) {
        console.log(shift_pressed);
        if(this.currently_selected && shift_pressed && entry instanceof ClientEntry) { //Currently we're only supporting client multiselects :D
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
        console.log("Multiselect channel");
    }
    private callback_multiselect_client(event) {
        console.log("Multiselect client");
        const clients = this.currently_selected as ClientEntry[];
        const music_only = clients.map(e => e instanceof MusicClientEntry ? 0 : 1).reduce((a, b) => a + b, 0) == 0;
        const music_entry = clients.map(e => e instanceof MusicClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;
        const local_client = clients.map(e => e instanceof LocalClientEntry ? 1 : 0).reduce((a, b) => a + b, 0) > 0;
        console.log("Music only: %o | Container music: %o | Container local: %o", music_entry, music_entry, local_client);
        let entries: ContextMenuEntry[] = [];
        if (!music_entry && !local_client) { //Music bots or local client cant be poked
            entries.push({
                type: MenuEntryType.ENTRY,
                icon: "client-poke",
                name: "Poke clients",
                callback: () => {
                    createInputModal("Poke clients", "Poke message:<br>", text => true, result => {
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
            name: "Move clients to your channel",
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
                name: "Kick clients from channel",
                callback: () => {
                    createInputModal("Kick clients from channel", "Kick reason:<br>", text => true, result => {
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
                    name: "Kick clients fom server",
                    callback: () => {
                        createInputModal("Kick clients from server", "Kick reason:<br>", text => true, result => {
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
                    name: "Ban clients",
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
                    name: "Delete bots",
                    icon: "client-delete",
                    disabled: false,
                    callback: () => {
                        const param_string = clients.map((_, index) => "{" + index + "}").join(', ');
                        const param_values = clients.map(client => client.createChatTag(true));
                        const tag = $.spawn("div").append(...MessageHelper.formatMessage("Do you really want to delete " + param_string, ...param_values));
                        const tag_container = $.spawn("div").append(tag);
                        Modals.spawnYesNo("Are you sure?", tag_container, result => {
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
    }

    spawnCreateChannel(parent?: ChannelEntry) {
        Modals.createChannelModal(undefined, parent, this.client.permissions, (properties?, permissions?) => {
            if(!properties) return;
            properties["cpid"] = parent ? parent.channelId : 0;
            log.debug(LogCategory.CHANNEL, "Creating a new channel.\nProperties: %o\nPermissions: %o", properties);
            this.client.serverConnection.sendCommand("channelcreate", properties).then(() => {
                let channel = this.find_channel_by_name(properties.channel_name, parent, true);
                if(!channel) {
                    log.error(LogCategory.CHANNEL, "Failed to resolve channel after creation. Could not apply permissions!");
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
                chat.serverChat().appendMessage("Channel {} successfully created!", true, channel.createChatTag());
                sound.play(Sound.CHANNEL_CREATED);
            });
        });
    }

    handle_resized() {
        for(let channel of this.channels)
            channel.handle_frame_resized();
    }
}