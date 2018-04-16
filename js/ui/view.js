/// <reference path="../voice/VoiceHandler.ts" />
/// <reference path="../client.ts" />
/// <reference path="../contextMenu.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />
/// <reference path="modal/ModalCreateChannel.ts" />
class ChannelTree {
    constructor(client, htmlTree) {
        this.client = client;
        this.htmlTree = htmlTree;
        this.reset();
        if (!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            let _this = this;
            this.htmlTree.parent().on("contextmenu", function (event) {
                if (event.isDefaultPrevented())
                    return;
                event.preventDefault();
                _this.onSelect(undefined);
                _this.showContextMenu(event.pageX, event.pageY);
            });
        }
    }
    showContextMenu(x, y, on_close = undefined) {
        let channelCreate = this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create",
            name: "Create channel",
            invalidPermission: !channelCreate,
            callback: () => this.spawnCreateChannel()
        }, MenuEntry.CLOSE(on_close));
    }
    initialiseHead(serverName) {
        this.server = new ServerEntry(this, serverName);
        this.server.htmlTag.appendTo(this.htmlTree);
        this.server.initializeListener();
    }
    __deleteAnimation(element) {
        let tag = element instanceof ChannelEntry ? element.rootTag() : element.tag;
        this.htmlTree.find(tag).fadeOut("slow", () => {
            tag.remove();
            if (element instanceof ChannelEntry) {
                if (element.parentChannel())
                    element.parentChannel().adjustSize(true);
            }
            else if (element instanceof ClientEntry) {
                element.currentChannel().adjustSize(true);
            }
        });
    }
    rootChannel() {
        return this.channels.filter(e => e.parent == undefined);
    }
    deleteChannel(channel) {
        const _this = this;
        for (let index = 0; index < this.channels.length; index++) {
            let entry = this.channels[index];
            let currentEntry = this.channels[index];
            while (currentEntry != undefined && currentEntry != null) {
                if (currentEntry == channel) {
                    _this.channels.remove(entry);
                    _this.__deleteAnimation(entry);
                    entry.channelTree = null;
                    index--;
                    break;
                }
                else
                    currentEntry = currentEntry.parentChannel();
            }
        }
        this.channels.remove(channel);
        this.__deleteAnimation(channel);
        channel.channelTree = null;
    }
    insertChannel(channel) {
        channel.channelTree = this;
        this.channels.push(channel);
        let elm = undefined;
        let tag = this.htmlTree;
        let prevChannel = null;
        if (channel.hasParent()) {
            let parent = channel.parentChannel();
            let siblings = parent.siblings();
            if (siblings.length == 0) {
                elm = parent.rootTag();
                prevChannel = null;
            }
            else {
                prevChannel = siblings.last();
                elm = prevChannel.tag;
            }
            tag = parent.siblingTag();
        }
        channel.prevChannel = prevChannel;
        let entry = channel.rootTag().css({ display: "none" }).fadeIn("slow");
        entry.appendTo(tag);
        channel.originalHeight = entry.outerHeight(false);
        if (elm != undefined)
            elm.after(entry);
        channel.adjustSize(true);
        channel.initializeListener();
    }
    findChannel(channelId) {
        for (let index = 0; index < this.channels.length; index++)
            if (this.channels[index].getChannelId() == channelId)
                return this.channels[index];
        return undefined;
    }
    moveChannel(channel, prevChannel, parent) {
        if (prevChannel != null && prevChannel.parent != parent) {
            console.error("Invalid channel move (different parents! (" + prevChannel.parent + "|" + parent + ")");
            return;
        }
        let oldParent = channel.parentChannel();
        channel.prevChannel = prevChannel;
        channel.parent = parent;
        if (prevChannel)
            prevChannel.rootTag().after(channel.rootTag());
        else {
            if (parent) {
                let siblings = parent.siblings();
                if (siblings.length <= 1) {
                    let left = channel.rootTag();
                    left.appendTo($(parent.siblingTag()));
                }
                else {
                    channel.prevChannel = siblings[siblings.length - 2];
                    channel.prevChannel.rootTag().after(channel.rootTag());
                }
            }
            else
                this.htmlTree.find(".server").after(channel.rootTag());
        }
        if (oldParent)
            oldParent.adjustSize();
        if (channel)
            channel.adjustSize();
    }
    deleteClient(client) {
        this.clients.remove(client);
        this.__deleteAnimation(client);
        client.onDelete();
    }
    insertClient(client, channel) {
        let newClient = this.findClient(client.clientId());
        if (newClient)
            client = newClient; //Got new client :)
        else
            this.clients.push(client);
        client.channelTree = this;
        client["_channel"] = channel;
        let tag = client.tag.css({ display: "none" }).fadeIn("slow");
        tag.appendTo(channel.clientTag());
        channel.adjustSize(true);
        client.initializeListener();
        channel.updateChannelTypeIcon();
        return client;
    }
    registerClient(client) {
        this.clients.push(client);
        client.channelTree = this;
        client.initializeListener();
    }
    moveClient(client, channel) {
        let oldChannel = client.currentChannel();
        client["_channel"] = channel;
        let tag = client.tag;
        tag.detach();
        tag.appendTo(client.currentChannel().clientTag());
        if (oldChannel) {
            oldChannel.adjustSize();
            oldChannel.updateChannelTypeIcon();
        }
        if (client.currentChannel()) {
            client.currentChannel().adjustSize();
            client.currentChannel().updateChannelTypeIcon();
        }
    }
    findClient(clientId) {
        for (let index = 0; index < this.clients.length; index++)
            if (this.clients[index].clientId() == clientId)
                return this.clients[index];
        return null;
    }
    onSelect(entry) {
        this.htmlTree.find(".selected").each(function (idx, e) {
            $(e).removeClass("selected");
        });
        if (entry instanceof ChannelEntry)
            entry.rootTag().find("> .channelLine").addClass("selected");
        else if (entry instanceof ClientEntry)
            entry.tag.addClass("selected");
        else if (entry instanceof ServerEntry)
            entry.htmlTag.addClass("selected");
        this.client.selectInfo.currentSelected = entry;
    }
    clientsByGroup(group) {
        let result = [];
        for (let client of this.clients) {
            if (client.groupAssigned(group))
                result.push(client);
        }
        return result;
    }
    clientsByChannel(channel) {
        let result = [];
        for (let client of this.clients) {
            if (client.currentChannel() == channel)
                result.push(client);
        }
        return result;
    }
    reset() {
        this.server = null;
        this.clients = [];
        this.channels = [];
        this.htmlTree.empty();
    }
    spawnCreateChannel(parent) {
        Modals.createChannelModal(undefined, parent, (properties) => {
            if (!properties)
                return;
            properties["cpid"] = parent ? parent.channelId : 0;
            log.debug(LogCategory.CHANNEL, "Creating new channel with properties: %o", properties);
            this.client.serverConnection.sendCommand("channelcreate", properties);
        });
    }
}
//# sourceMappingURL=view.js.map