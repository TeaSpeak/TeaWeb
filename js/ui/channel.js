/// <reference path="view.ts" />
var ChannelType;
(function (ChannelType) {
    ChannelType[ChannelType["PERMANENT"] = 0] = "PERMANENT";
    ChannelType[ChannelType["SEMI_PERMANENT"] = 1] = "SEMI_PERMANENT";
    ChannelType[ChannelType["TEMPORARY"] = 2] = "TEMPORARY";
})(ChannelType || (ChannelType = {}));
(function (ChannelType) {
    function normalize(mode) {
        let value = ChannelType[mode];
        value = value.toLowerCase();
        return value[0].toUpperCase() + value.substr(1);
    }
    ChannelType.normalize = normalize;
})(ChannelType || (ChannelType = {}));
class ChannelEntry {
    constructor(channelId, channelName, parent = null, prevChannel = null) {
        this.properties = {
            channel_order: 0,
            channel_name: "undefined",
            channel_flag_permanent: 0,
            channel_flag_semi_permanent: 0,
            channel_flag_default: 0,
            channel_flag_password: 0
        };
        this.properties = {};
        this.channelId = channelId;
        this._rawChannelName = channelName;
        this.parent = parent;
        this.prevChannel = prevChannel;
        this.channelTree = null;
        this.__updateChannelPropertiesFromName();
    }
    channelName() {
        return this.properties["channel_name"];
    }
    rawChannelName() {
        return this._rawChannelName;
    }
    parentChannel() { return this.parent; }
    hasParent() { return this.parent != null; }
    getChannelId() { return this.channelId; }
    channelClass() { return "channel_full"; }
    siblings(deep = false) {
        const result = [];
        if (this.channelTree == null)
            return [];
        const self = this;
        this.channelTree.channels.forEach(function (entry) {
            let current = entry;
            if (deep) {
                while (current) {
                    if (current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            }
            else if (current.parentChannel() == self)
                result.push(entry);
        });
        return result;
    }
    clients(deep = false) {
        const result = [];
        if (this.channelTree == null)
            return [];
        const self = this;
        this.channelTree.clients.forEach(function (entry) {
            let current = entry.currentChannel();
            if (deep) {
                while (current) {
                    if (current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            }
            else if (current == self)
                result.push(entry);
        });
        return result;
    }
    get htmlTag() {
        if (this._htmlTag)
            return this._htmlTag;
        let tag = $("<div></div>");
        tag.attr("id", "channel_" + this.getChannelId());
        tag.addClass("channel");
        tag.append("<div class=\"icon_empty\"></div>");
        let channelTag = $("<div></div>");
        channelTag.addClass("channelLine");
        channelTag.addClass(this._channelAlign); //For left
        let channelType = $("<div/>");
        channelType.addClass("channel_only_normal channel_type");
        channelType.addClass("icon");
        channelType.addClass("client-channel_green_subscribed");
        channelTag.append(channelType);
        channelTag.append("<a class='channel_name'>" + this.channelName() + "</a>");
        let channelIcon = $("<span class='channel_only_normal'/>");
        channelTag.append(channelIcon);
        tag.append("<div style='position: absolute; width: calc(100% - 16px); margin: 0px'><div class=\"siblings\"></div></div>");
        tag.append("<div style='position: absolute; width: calc(100% - 16px); margin: 0px'><div class=\"clients\"></div></div>");
        tag.append(channelTag);
        return this._htmlTag = tag;
    }
    get channelTag() {
        return this.htmlTag.find(".channelLine").last();
    }
    siblingTag() {
        return this.htmlTag.find(".siblings").first(); //Here the first because first comes the siblings tag than all other sibling comes
    }
    clientTag() {
        return this.htmlTag.find(".clients").last(); //Here last because from the sibling tag client tags could be before
    }
    adjustSize(parent = true) {
        var size = this.originalHeight;
        var subSize = 0;
        var clientSize = 0;
        var sub = this.siblings(false);
        sub.forEach(function (e) {
            subSize += e.htmlTag.outerHeight(true);
        });
        var clients = this.clients(false);
        clients.forEach(function (e) {
            clientSize += e.htmlTag.outerHeight(true);
        });
        if (sub.length >= 1)
            subSize -= 1;
        if (clients.length >= 1)
            clientSize -= 1;
        this.htmlTag.css({ height: size + subSize + clientSize });
        this.siblingTag().css("margin-top", (clientSize + 16) + "px");
        this.clientTag().css({ height: clientSize });
        if (parent && this.parentChannel())
            this.parentChannel().adjustSize(parent);
    }
    initializeListener() {
        const _this = this;
        this.channelTag.click(function () {
            _this.channelTree.onSelect(_this);
        });
        this.channelTag.dblclick(function () {
            _this.channelTree.client.serverConnection.joinChannel(_this); //TODO may ask for password
        });
        this.channelTag.on("contextmenu", function (event) {
            event.preventDefault();
            _this.channelTree.onSelect(_this);
            _this.showContextMenu(event.pageX, event.pageY, () => { _this.channelTree.onSelect(undefined); });
        });
    }
    showContextMenu(x, y, on_close = undefined) {
        const _this = this;
        spawnMenu(x, y, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_switch",
            name: "<b>Switch to channel</b>",
            callback: () => {
                _this.channelTree.client.getServerConnection().joinChannel(_this); //TODO ask for password if required
            }
        }, MenuEntry.HR(), {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create_sub",
            name: "Create sub channel",
            callback: () => {
                //TODO here
            }
        }, {
            type: MenuEntryType.ENTRY,
            icon: "client-channel_create",
            name: "Create channel",
            callback: () => {
                //TODO here
            }
        }, MenuEntry.CLOSE(on_close));
    }
    __updateChannelPropertiesFromName() {
        parseType: if (this.parentChannel() == null && this._rawChannelName.charAt(0) == '[' && this._rawChannelName.indexOf(']') != -1) {
            let typeData = this._rawChannelName.substr(1, this._rawChannelName.indexOf(']') - 1);
            //console.log("Having spacer etc? -> " + typeData);
            if (typeData.indexOf("spacer") == -1)
                break parseType;
            let strAlign = typeData.substr(0, typeData.indexOf("spacer"));
            if (strAlign.length > 0) {
                if (strAlign.length != 1) {
                    if (strAlign.length != 2 || strAlign[0] != '*')
                        break parseType;
                    strAlign = strAlign.substr(1);
                    //TODO support repeating pattern!
                }
            }
            if (strAlign == "")
                this._channelAlign = "l";
            else
                this._channelAlign = strAlign;
            var repeatData = typeData.substr(typeData.indexOf("spacer") + 6);
            //console.log("Repeat data: " + repeatData);
            this.properties["channel_name"] = this._rawChannelName.substr(this._rawChannelName.indexOf(']') + 1);
        }
        if (this.properties.channel_name == undefined) {
            this.properties.channel_name = this._rawChannelName;
            this._channelAlign = "l";
        }
        let self = this.channelTag;
        if (this.properties.channel_name == this._rawChannelName) {
            self.find(".channel_only_normal").show();
        }
        else
            self.find(".channel_only_normal").hide();
        self.find(".channel_name").text(this.channelName());
        self.removeClass("l r c"); //Alignments
        self.addClass(this._channelAlign);
        console.log("Align: " + this._channelAlign);
    }
    updateProperty(key, value) {
        this.properties[key] = value;
        console.debug("Updating channel " + this.channelId + ". Key: " + key + " Value: " + value);
        if (key == "channel_name") {
            this._rawChannelName = value;
            this.properties.channel_name = undefined;
            this.__updateChannelPropertiesFromName();
        }
        else if (key == "channel_order") {
            var order = this.channelTree.findChannel(value);
            this.channelTree.moveChannel(this, order, this.parent);
        }
        else if (key == "channel_icon_id") {
            let icons = this.channelTag.find("span");
            icons.find(".icon_property").detach();
            if (value > 0) {
                let tag = this.channelTree.client.fileManager.icons.generateTag(value);
                if (icons.children().length > 0) {
                    icons.children().last().after(tag);
                }
                else
                    icons.append(tag);
                console.log("Channel icon: " + value);
            }
        }
        else if (key == "channel_codec") {
            this.displayMusicIcon = value == 5 || value == 3;
        }
        else if (key == "channel_flag_default") {
            let icons = this.channelTag.find("span");
            icons.find(".icon_default").detach();
            if (value == "1") {
                console.log("Default: '" + value + "'");
                let icon = $.spawn("div");
                icon.addClass("icon_default icon client-channel_default");
                icon.attr("title", "Default channel");
                if (icons.children().length > 0) {
                    icons.children().first().before(icon);
                }
                else
                    icons.append(icon);
            }
        }
    }
    set displayMusicIcon(flag) {
        if (this._displayMusicIcon == flag)
            return;
        this._displayMusicIcon = flag;
        let icons = this.channelTag.find("span");
        icons.find(".icon_music").detach();
        if (flag) {
            let icon = $("<div/>");
            icon.addClass("icon_music icon client-music");
            icon.attr("title", "Music quality");
            if (icons.children(".icon_default").length > 0) {
                icons.children(".icon_default").first().before(icon);
            }
            else if (icons.children().length > 0) {
                icons.children().first().before(icon);
            }
            else
                icons.append(icon);
        }
    }
    createChatTag(braces = false) {
        var tag = $("<div></div>");
        tag.css("cursor", "pointer");
        tag.css("font-weight", "bold");
        tag.css("color", "darkblue");
        if (braces)
            tag.text("\"" + this.channelName() + "\"");
        else
            tag.text(this.channelName());
        tag.attr("oncontextmenu", "chat_channel_contextmenu(this, ...arguments);");
        tag.attr("channelId", this.channelId);
        tag.attr("channelName", this.channelName());
        return tag.wrap("<p/>").parent().html();
    }
    channelType() {
        if (this.properties.channel_flag_permanent == "1")
            return ChannelType.PERMANENT;
        if (this.properties.channel_flag_semi_permanent == "1")
            return ChannelType.SEMI_PERMANENT;
        return ChannelType.TEMPORARY;
    }
}
//Global functions
function chat_channel_contextmenu(_element, event) {
    event.preventDefault();
    let element = $(_element);
    console.log("Context menue for " + element.attr("channelName"));
    let chid = Number.parseInt(element.attr("channelId"));
    let channel = globalClient.channelTree.findChannel(chid);
    if (!channel) {
        //TODO
        return;
    }
    channel.showContextMenu(event.pageX, event.pageY);
}
//# sourceMappingURL=channel.js.map