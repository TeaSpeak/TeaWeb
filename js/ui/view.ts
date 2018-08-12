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

    constructor(client, htmlTree) {
        this.client = client;
        this.htmlTree = htmlTree;
        this.reset();

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            let _this = this;
            this.htmlTree.parent().on("contextmenu", function (event) {
                if(event.isDefaultPrevented()) return;

                event.preventDefault();
                _this.onSelect(undefined);
                _this.showContextMenu(event.pageX, event.pageY);
            });
        }
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate =
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);

        spawnMenu(x, y,
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


        if(oldParent) oldParent.adjustSize();
        if(channel) channel.adjustSize();
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
        client.initializeListener();

        channel.updateChannelTypeIcon();
        return client;
    }

    registerClient(client: ClientEntry) {
        this.clients.push(client);
        client.channelTree = this;
        client.initializeListener();
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
        for(let index = 0; index < this.clients.length; index++)
            if(this.clients[index].clientId() == clientId) return this.clients[index];
        return undefined;
    }

    find_client_by_dbid?(client_dbid: number) : ClientEntry {
        for(let index = 0; index < this.clients.length; index++)
            if(this.clients[index].properties.client_database_id == client_dbid) return this.clients[index];
        return undefined;
    }

    onSelect(entry?: ChannelEntry | ClientEntry | ServerEntry) {
        this.htmlTree.find(".selected").each(function (idx, e) {
            $(e).removeClass("selected");
        });

        if(entry instanceof ChannelEntry)
            (entry as ChannelEntry).rootTag().find("> .channelLine").addClass("selected");
        else if(entry instanceof ClientEntry)
            (entry as ClientEntry).tag.addClass("selected");
        else if(entry instanceof ServerEntry)
            (entry as ServerEntry).htmlTag.addClass("selected");
        this.client.selectInfo.setCurrentSelected(entry);
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
        this.htmlTree.empty();
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
            });
        });
    }
}