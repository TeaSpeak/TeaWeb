/// <reference path="../voice.ts" />
/// <reference path="../client.ts" />
/// <reference path="../contextMenu.ts" />
/// <reference path="../proto.ts" />
/// <reference path="channel.ts" />
/// <reference path="client.ts" />

class ChannelTree {
    client: TSClient;
    htmlTree: JQuery;
    server: ServerEntry;
    channels: ChannelEntry[];
    clients: ClientEntry[];

    constructor(client, htmlTree) {
        this.client = client;
        this.htmlTree = htmlTree;
        this.server = new ServerEntry(this, "undefined");
        this.channels = [];
        this.clients = [];

        let jhtml = $(this.htmlTree);
        jhtml.empty();
        this.server.htmlTag.appendTo(jhtml);
        this.server.initializeListener();
    }

    private __deleteAnimation(element: ChannelEntry | ClientEntry) {
        $(this.htmlTree).find(element.htmlTag).fadeOut("slow", function () {
            $(this).remove();
            if(element instanceof ChannelEntry) {
                if(element.parentChannel())
                    element.parentChannel().adjustSize(true);
            } else if(element instanceof ClientEntry) {
                element.currentChannel().adjustSize(true);
            }
        });
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
            var parent = channel.parentChannel();
            var siblings = parent.siblings();
            if(siblings.length == 0) {
                elm = parent.htmlTag;
                prevChannel = null;
            } else {
                prevChannel = siblings.last();
                elm = prevChannel.htmlTag;
            }
            tag = parent.siblingTag();
        }
        channel.prevChannel = prevChannel;
        let entry = channel.htmlTag.css({display: "none"}).fadeIn("slow");

        entry.appendTo(tag);
        channel.originalHeight = entry.outerHeight(true);
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

    /**
     * @param {ChannelEntry} channel
     * @param {ChannelEntry} prevChannel
     * @param {ChannelEntry} parent
     */
    moveChannel(channel, prevChannel, parent) {
        if(prevChannel != null && prevChannel.parent != parent) {
            console.error("Invalid channel move (different parents! (" + prevChannel.parent + "|" + parent + ")");
            return;
        }
        let oldParent = channel.parentChannel();
        channel.prevChannel = prevChannel;
        channel.parent = parent;

        if(prevChannel)
            prevChannel.htmlTag.after(channel.htmlTag);
        else {
            if(parent) {
                var siblings = parent.siblings();
                if(siblings.length <= 1) { //Self should be already in there
                    var left = channel.htmlTag;
                    left.appendTo($(parent.siblingTag()));
                } else {
                    channel.prevChannel = siblings[siblings.length - 2];
                    channel.prevChannel.htmlTag.after(channel.htmlTag);
                }
            } else
                this.htmlTree.find(".server").after(channel.htmlTag);
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

        var tag = client.htmlTag.css({display: "none"}).fadeIn("slow");
        tag.appendTo(channel.clientTag());
        channel.adjustSize(true);
        client.initializeListener();

        return client;
    }

    registerClient(client: ClientEntry) {
        this.clients.push(client);
        client.channelTree = this;
        client.initializeListener();
    }

    moveClient(client: ClientEntry, channel: ChannelEntry) {
        let oldChannel = client.currentChannel();
        client["_channel"] = channel;

        let tag = client.htmlTag;
        tag.detach();
        tag.appendTo(client.currentChannel().clientTag());
        if(oldChannel) oldChannel.adjustSize();
        if(client.currentChannel()) client.currentChannel().adjustSize();
    }

    findClient(clientId) : ClientEntry {
        for(let index = 0; index < this.clients.length; index++)
            if(this.clients[index].clientId() == clientId) return this.clients[index];
        return null;
    }

    onSelect(entry?: ChannelEntry | ClientEntry | ServerEntry) {
        $(this.htmlTree).find(".selected").each(function (idx, e) {
            $(e).removeClass("selected");
        });

        if(entry instanceof ChannelEntry)
            (entry as ChannelEntry).htmlTag.find("> .channelLine").addClass("selected");
        else if(entry instanceof ClientEntry)
            (entry as ClientEntry).htmlTag.addClass("selected");
        else if(entry instanceof ServerEntry)
            (entry as ServerEntry).htmlTag.addClass("selected");
        this.client.selectInfo.currentSelected = entry;
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
}