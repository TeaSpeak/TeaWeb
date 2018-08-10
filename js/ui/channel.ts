/// <reference path="view.ts" />
/// <reference path="../utils/helpers.ts" />

enum ChannelType {
    PERMANENT,
    SEMI_PERMANENT,
    TEMPORARY
}
namespace ChannelType {
    export function normalize(mode: ChannelType) {
        let value: string = ChannelType[mode];
        value = value.toLowerCase();
        return value[0].toUpperCase() + value.substr(1);
    }
}

class ChannelProperties {
    channel_order: number = 0;
    channel_name: string = "";
    channel_topic: string = "";

    channel_password: string = "";
    channel_description: string = "";

    channel_codec: number = 4;
    channel_codec_quality: number = 0;
    channel_codec_is_unencrypted: boolean = false;

    channel_maxclients: number = -1;
    channel_maxfamilyclients: number = -1;

    channel_needed_talk_power: number = 1;

    channel_flag_permanent: boolean = false;
    channel_flag_semi_permanent: boolean = false;
    channel_flag_default: boolean = false;
    channel_flag_password: boolean = false;
    channel_flag_maxclients_unlimited: boolean = false;
    channel_flag_maxfamilyclients_inherited: boolean = false;
    channel_flag_maxfamilyclients_unlimited: boolean = false;

    channel_icon_id: number;
}

class ChannelEntry {
    channelTree: ChannelTree;
    channelId: number;
    parent?: ChannelEntry;
    prevChannel?: ChannelEntry;
    properties: ChannelProperties = new ChannelProperties();
    originalHeight: number;

    private _channelAlign: string;
    private _formatedChannelName: string;

    //HTML DOM elements
    private _tag_root:              JQuery<HTMLElement>;
    private _tag_siblings:          JQuery<HTMLElement>;
    private _tag_clients:           JQuery<HTMLElement>;
    private _tag_channel:           JQuery<HTMLElement>;

    private _cachedPassword: string;

    constructor(channelId, channelName, parent = null, prevChannel = null) {
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this._formatedChannelName = channelName;
        this.parent = parent;
        this.prevChannel = prevChannel;
        this.channelTree = null;

        this.initializeTag();
        this.__updateChannelName();
    }

    channelName(){
        return this.properties.channel_name;
    }

    formatedChannelName() {
        return this._formatedChannelName ? this._formatedChannelName : this.properties.channel_name;
    }

    parentChannel() { return this.parent; }
    hasParent(){ return this.parent != null; }
    getChannelId(){ return this.channelId; }
    channelClass() { return "channel_full"; }

    siblings(deep = false) : ChannelEntry[] {
        const result: ChannelEntry[] = [];
        if(this.channelTree == null) return [];

        const self = this;
        this.channelTree.channels.forEach(function (entry) {
            let current = entry;
            if(deep) {
                while(current) {
                    if(current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            } else
                if(current.parentChannel() == self)
                    result.push(entry);
        });
        return result;
    }

    clients(deep = false) {
        const result = [];
        if(this.channelTree == null) return [];

        const self = this;
        this.channelTree.clients.forEach(function (entry) {
            let current = entry.currentChannel();
            if(deep) {
                while(current) {
                    if(current.parentChannel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parentChannel();
                }
            } else
            if(current == self)
                result.push(entry);
        });
        return result;
    }

    private initializeTag() {
        let rootTag = $.spawn("div");

        rootTag.attr("id", "channel_" + this.getChannelId());
        rootTag.addClass("channel");
        //rootTag.append($.spawn("div").addClass("icon_empty"));

        //Tag channel
        this._tag_channel = $.spawn("div");
        this._tag_channel.addClass("channelLine");
        this._tag_channel.addClass(this._channelAlign); //For left

        let channelType = $.spawn("div");
        channelType.addClass("channel_only_normal channel_type icon client-channel_green_subscribed");
        this._tag_channel.append(channelType);

        this._tag_channel.append($.spawn("div").addClass("channel_name_container").append($.spawn("a").addClass("channel_name").text(this.channelName())));

        //Icons
        let iconTag = $.spawn("span").addClass("icons");
        iconTag.appendTo(this._tag_channel);

        //Default icon (4)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_default icon client-channel_default").attr("title", "Default channel")));
        //Password icon (3)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_password icon client-register").attr("title", "The channel is password protected")));
        //Music icon (2)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_music icon client-music").attr("title", "Music quality")));
        //Channel Icon (1)
        iconTag.append($.spawn("div").addClass("channel_only_normal").addClass("icon_entry channel_icon").attr("title", "Channel icon"));
        //Default no sound (0)
        let container = $.spawn("div");
        let noSound = $.spawn("div").addClass("icon_entry icon_no_sound icon client-conflict-icon").attr("title", "You don't support the channel codec");
        let bg = $.spawn("div")
            .width(10)
            .height(14)
            .css("background", "red")
            .css("position", "absolute")
            .css("top", "1px")
            .css("left", "3px");
        bg.appendTo(container);
        noSound.appendTo(container);
        iconTag.append(container);
        /*
        setInterval(() => {
            let color = (Math.random() * 10000000).toString(16).substr(0, 6);
            bg.css("background", "#" + color);
        }, 150);
        */

        //Build siblings
        this._tag_siblings = $.spawn("div").addClass("siblings");
        let tag_siblings_box = $.spawn("div").css("position", "absolute").css("width", "calc(100% - 16px)").css("margin", "0px");
        this._tag_siblings.appendTo(tag_siblings_box);

        //Build clients
        this._tag_clients = $.spawn("div").addClass("clients");
        let tag_clients_box = $.spawn("div").css("position", "absolute").css("width", "calc(100% - 16px)").css("margin", "0px");
        this._tag_clients.appendTo(tag_clients_box);

        this._tag_root = rootTag;
        tag_clients_box.appendTo(this._tag_root);
        tag_siblings_box.appendTo(this._tag_root);
        this._tag_channel.appendTo(this._tag_root);
    }

    rootTag() : JQuery<HTMLElement> {
        return this._tag_root;
    }

    channelTag() : JQuery<HTMLElement> {
        return this._tag_channel;
    }

    siblingTag() : JQuery<HTMLElement> {
        return this._tag_siblings;
    }
    clientTag() : JQuery<HTMLElement>{
        return this._tag_clients;
    }

    adjustSize(parent = true) {
        const size = this.originalHeight;
        let subSize = 0;
        let clientSize = 0;

        const sub = this.siblings(false);
        sub.forEach(function (e) {
            subSize += e.rootTag().outerHeight(true);
        });

        const clients = this.clients(false);
        clients.forEach(function (e) {
            clientSize += e.tag.outerHeight(true);
        });

        this._tag_root.css({height: size + subSize + clientSize});
        this._tag_siblings.css("margin-top", (clientSize + 16) + "px");
        this._tag_clients.css({height: clientSize});
        if(parent && this.parentChannel()) this.parentChannel().adjustSize(parent);
    }

    initializeListener() {
        const _this = this;
        this.channelTag().click(function () {
            _this.channelTree.onSelect(_this);
        });
        this.channelTag().dblclick(() => this.joinChannel());

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.channelTag().on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.showContextMenu(event.pageX, event.pageY, () => {
                    _this.channelTree.onSelect(undefined);
                });
            });
        }
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate =
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_TEMPORARY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_PERMANENT).granted(1);

        let channelModify =
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAXFAMILYCLIENTS).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY).granted(1) ||
            this.channelTree.client.permissions.neededPermission(PermissionType.B_ICON_MANAGE).granted(1);

        let flagDelete = true;
        if(this.clients(true).length > 0)
            flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_FLAG_FORCE).granted(1);
        if(flagDelete) {
            if (this.properties.channel_flag_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else if (this.properties.channel_flag_semi_permanent)
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_PERMANENT).granted(1);
            else
                flagDelete = this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_DELETE_TEMPORARY).granted(1);
        }

        spawnMenu(x, y, {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_switch",
                name: "<b>Switch to channel</b>",
                callback: () => this.joinChannel()
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_edit",
                name: "Edit channel",
                invalidPermission: !channelModify,
                callback: () => {
                    Modals.createChannelModal(this, undefined, this.channelTree.client.permissions, (changes?, permissions?) => {
                        if(changes) {
                            changes["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.sendCommand("channeledit", changes);
                            log.info(LogCategory.CHANNEL, "Changed channel properties of channel %s: %o", this.channelName(), changes);
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

                            perms[0]["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.sendCommand("channeladdperm", perms, ["continueonerror"]);
                        }
                    });
                }
            },
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_delete",
                name: "Delete channel",
                invalidPermission: !flagDelete,
                callback: () => this.channelTree.client.serverConnection.sendCommand("channeldelete", {cid: this.channelId})
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_create_sub",
                name: "Create sub channel",
                invalidPermission: !(channelCreate && this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_CHILD).granted(1)),
                callback: () => this.channelTree.spawnCreateChannel(this)
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_create",
                name: "Create channel",
                invalidPermission: !channelCreate,
                callback: () => this.channelTree.spawnCreateChannel()
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    private __updateChannelName() {
        this._formatedChannelName = undefined;
        parseType:
        if(this.parentChannel() == null && this.properties.channel_name.charAt(0) == '[') {
            let end = this.properties.channel_name.indexOf(']');
            if(end == -1) break parseType;

            let options = this.properties.channel_name.substr(1, end - 1);
            if(options.indexOf("spacer") == -1) break parseType;
            options = options.substr(0, options.indexOf("spacer"));

            console.log("Channel options: '" + options + "'");
            if(options.length == 0) options = "l";
            else if(options.length > 1) options = options[0];

            if(options == "r" || options == "l" || options == "c" || options == "*")
                this._channelAlign = options;
            else break parseType;

            this._formatedChannelName = this.properties.channel_name.substr(end + 1);
            console.log("Got channel name: " + this._formatedChannelName);
        }

        let self = this.channelTag();
        let channelName = self.find(".channel_name");
        channelName.text(this.formatedChannelName());
        channelName.parent().removeClass("l r c *"); //Alignments
        (this._formatedChannelName ? $.fn.hide : $.fn.show).apply(self.find(".channel_only_normal"));

        if(this._formatedChannelName) {
            channelName.parent().addClass(this._channelAlign);

            if(this._channelAlign == "*") {
                let lastSuccess = "";
                let index = 0;
                do {
                    channelName.text((lastSuccess = channelName.text()) + this.formatedChannelName());
                    console.log(channelName.parent().width() + " : " + channelName.width() + " : " + channelName.innerWidth() + " : " + channelName.outerWidth());
                } while (channelName.parent().width() >= channelName.width() && ++index < 255);
                if(index == 255) console.warn(LogCategory.CHANNEL, "Repeating spacer took too much repeats!");
                if(lastSuccess.length > 0) {
                    channelName.text(lastSuccess);
                    self.addClass("c");
                }
            }
        }
        console.log("Align: " + this._channelAlign);
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL, "Update properties (%i) of %s (%i)", variables.length, this.channelName(), this.getChannelId());

        for(let variable of variables) {
            let key = variable.key;
            let value = variable.value;
            JSON.map_field_to(this.properties, value, variable.key);

            group.log("Updating property " + key + " = '%s' -> %o", value, this.properties[key]);

            if(key == "channel_name") {
                this.__updateChannelName();
            } else if(key == "channel_order") {
                let order = this.channelTree.findChannel(this.properties.channel_order);
                this.channelTree.moveChannel(this, order, this.parent);
            } else if(key == "channel_icon_id") {
                let tag = this.channelTag().find(".icons .channel_icon");
                (this.properties.channel_icon_id > 0 ? $.fn.show : $.fn.hide).apply(tag);
                if(this.properties.channel_icon_id > 0) {
                    tag.children().detach();
                    this.channelTree.client.fileManager.icons.generateTag(this.properties.channel_icon_id).appendTo(tag);
                }
            } else if(key == "channel_codec") {
                (this.properties.channel_codec == 5 || this.properties.channel_codec == 3 ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_music"));
                (this.channelTree.client.voiceConnection.codecSupported(this.properties.channel_codec) ? $.fn.hide : $.fn.show).apply(this.channelTag().find(".icons .icon_no_sound"));
            } else if(key == "channel_flag_default") {
                (this.properties.channel_flag_default ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_default"));
            } else if(key == "channel_flag_password")
                (this.properties.channel_flag_password ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_password"));

            if(key == "channel_maxclients" || key == "channel_maxfamilyclients" || key == "channel_flag_private" || key == "channel_flag_password")
                this.updateChannelTypeIcon();
        }
        group.end();
    }

    updateChannelTypeIcon() {
        let tag = this.channelTag().find(".channel_type");
        tag.removeAttr('class');
        tag.addClass("channel_only_normal channel_type icon");

        let type;
        if(this.properties.channel_flag_password == true && !this._cachedPassword)
            type = "yellow";
        else if(
            (!this.properties.channel_flag_maxclients_unlimited && this.clients().length >= this.properties.channel_maxclients) ||
            (!this.properties.channel_flag_maxfamilyclients_unlimited && this.properties.channel_maxfamilyclients >= 0 && this.clients(true).length >= this.properties.channel_maxfamilyclients)
        )
            type = "red";
        else
            type = "green";

        tag.addClass("client-channel_" + type + "_subscribed");
    }

    createChatTag(braces: boolean = false) : JQuery {
        let tag = $.spawn("div");

        tag.css("display", "inline-block");
        tag.css("cursor", "pointer");
        tag.css("font-weight", "bold");
        tag.css("color", "darkblue");
        if(braces)
            tag.text("\"" + this.channelName() + "\"");
        else
            tag.text(this.channelName());
        tag.contextmenu(event => {
            if(event.isDefaultPrevented()) return;
            event.preventDefault();
            this.showContextMenu(event.pageX, event.pageY);
        });

        tag.attr("channelId", this.channelId);
        tag.attr("channelName", this.channelName());
        return tag;
    }

    channelType() : ChannelType {
        if(this.properties.channel_flag_permanent == true) return ChannelType.PERMANENT;
        if(this.properties.channel_flag_semi_permanent == true) return ChannelType.SEMI_PERMANENT;
        return ChannelType.TEMPORARY;
    }

    joinChannel() {
        if(this.properties.channel_flag_password == true &&
            !this._cachedPassword &&
            !this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_JOIN_IGNORE_PASSWORD).granted(1)) {
            createInputModal("Channel password", "Channel password:", () => true, text => {
                if(typeof(text) == typeof(true)) return;
                helpers.hashPassword(text as string).then(result => {
                    this._cachedPassword = result;
                    this.joinChannel();
                    this.updateChannelTypeIcon();
                });
            }).open();
        } else
            this.channelTree.client.getServerConnection().joinChannel(this, this._cachedPassword).catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id == 781) { //Invalid password
                        this._cachedPassword = undefined;
                        this.updateChannelTypeIcon();
                    }
                }
            });
    }
}

//Global functions
function chat_channel_contextmenu(_element: any, event: any) {
    event.preventDefault();

    let element = $(_element);
    console.log("Context menue for " + element.attr("channelName"));
    let chid : number = Number.parseInt(element.attr("channelId"));
    let channel = globalClient.channelTree.findChannel(chid);
    if(!channel) {
        //TODO
        return;
    }

    channel.showContextMenu(event.pageX, event.pageY);
}