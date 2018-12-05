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
    channel_name_phonetic: string = "";
    channel_topic: string = "";

    channel_password: string = "";

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

    channel_icon_id: number = 0;
    channel_delete_delay: number = 0;

    //Only after request
    channel_description: string = "";
}

class ChannelEntry {
    channelTree: ChannelTree;
    channelId: number;
    parent?: ChannelEntry;
    properties: ChannelProperties = new ChannelProperties();
    originalHeight: number;

    channel_previous?: ChannelEntry;
    channel_next?: ChannelEntry;

    private _channelAlign: string;
    private _formatedChannelName: string;
    private _family_index: number = 0;

    //HTML DOM elements
    private _tag_root:              JQuery<HTMLElement>;
    private _tag_siblings:          JQuery<HTMLElement>;
    private _tag_clients:           JQuery<HTMLElement>;
    private _tag_channel:           JQuery<HTMLElement>;

    private _cachedPassword: string;
    private _cached_channel_description: string = undefined;
    private _cached_channel_description_promise: Promise<string> = undefined;
    private _cached_channel_description_promise_resolve: any = undefined;
    private _cached_channel_description_promise_reject: any = undefined;

    constructor(channelId, channelName, parent = null) {
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this._formatedChannelName = channelName;
        this.parent = parent;
        this.channelTree = null;

        this.initializeTag();
        this.__updateChannelName();
    }

    channelName(){
        return this.properties.channel_name;
    }

    formatedChannelName() {
        return this._formatedChannelName !== undefined ? this._formatedChannelName : this.properties.channel_name;
    }

    getChannelDescription() : Promise<string> {
        if(this._cached_channel_description) return new Promise<string>(resolve => resolve(this._cached_channel_description));
        if(this._cached_channel_description_promise) return this._cached_channel_description_promise;

        this.channelTree.client.serverConnection.sendCommand("channelgetdescription", {cid: this.channelId}).catch(error => {
            this._cached_channel_description_promise_reject(error);
        });

        return this._cached_channel_description_promise = new Promise<string>((resolve, reject) => {
            this._cached_channel_description_promise_resolve = resolve;
            this._cached_channel_description_promise_reject = reject;
        });
    }

    parent_channel?() { return this.parent; }
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
                    if(current.parent_channel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parent_channel();
                }
            } else
                if(current.parent_channel() == self)
                    result.push(entry);
        });
        return result;
    }

    clients(deep = false) : ClientEntry[] {
        const result: ClientEntry[] = [];
        if(this.channelTree == null) return [];

        const self = this;
        this.channelTree.clients.forEach(function (entry) {
            let current = entry.currentChannel();
            if(deep) {
                while(current) {
                    if(current.parent_channel() == self) {
                        result.push(entry);
                        break;
                    }
                    current = current.parent_channel();
                }
            } else
            if(current == self)
                result.push(entry);
        });
        return result;
    }

    clients_ordered() : ClientEntry[] {
        const clients = this.clients(false);

        clients.sort((a, b) => {
            if(a.properties.client_talk_power < b.properties.client_talk_power)
                return 1;
            if(a.properties.client_talk_power > b.properties.client_talk_power)
                return -1;

            if(a.properties.client_nickname > b.properties.client_nickname)
                return 1;
            if(a.properties.client_nickname < b.properties.client_nickname)
                return -1;

            return 0;
        });
        return clients;
    }

    private initializeTag() {
        let rootTag = $.spawn("div");

        rootTag.attr("id", "channel_" + this.getChannelId());
        rootTag.addClass("channel");
        //rootTag.append($.spawn("div").addClass("icon_empty"));

        //Tag channel
        this._tag_channel = $.spawn("div");
        this._tag_channel.attr('channel-id', this.channelId);
        this._tag_channel.addClass("channelLine");
        this._tag_channel.addClass(this._channelAlign); //For left
        this._tag_channel.css('z-index', this._family_index);

        let channelType = $.spawn("div");
        channelType.addClass("channel_only_normal channel_type icon client-channel_green_subscribed");
        this._tag_channel.append(channelType);

        this._tag_channel.append($.spawn("div").addClass("channel_name_container").append($.spawn("a").addClass("channel_name").text(this.channelName())));

        //Icons
        let iconTag = $.spawn("span").addClass("icons");
        iconTag.appendTo(this._tag_channel);

        //Default icon (5)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_default icon client-channel_default").attr("title", "Default channel")));
        //Password icon (4)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_password icon client-register").attr("title", "The channel is password protected")));
        //Music icon (3)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_music icon client-music").attr("title", "Music quality")));
        //Channel moderated (2)
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry icon_moderated icon client-moderated").attr("title", "Channel is moderated")));
        //Channel Icon (1)
        //iconTag.append($.spawn("div").addClass("channel_only_normal").addClass("icon_entry channel_icon").attr("title", "Channel icon"));
        iconTag.append($.spawn("div").addClass("channel_only_normal").append($.spawn("div").addClass("icon_entry channel_icon").attr("title", "Channel icon")));
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

    reorderClients() {
        let clients = this.clients();

        if(clients.length > 1) {
            clients.sort((a, b) => {
                if(a.properties.client_talk_power < b.properties.client_talk_power)
                    return 1;
                if(a.properties.client_talk_power > b.properties.client_talk_power)
                    return -1;

                if(a.properties.client_nickname > b.properties.client_nickname)
                    return 1;
                if(a.properties.client_nickname < b.properties.client_nickname)
                    return -1;

                return 0;
            });
            clients.reverse();

            for(let index = 0; index + 1 < clients.length; index++)
                clients[index].tag.before(clients[index + 1].tag);

            for(let client of clients) {
                console.log("- %i %s", client.properties.client_talk_power, client.properties.client_nickname);
            }
        }
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
        if(parent && this.parent_channel()) this.parent_channel().adjustSize(parent);
    }

    initializeListener() {
        const _this = this;
        this.channelTag().click(function () {
            _this.channelTree.onSelect(_this);
        });
        this.channelTag().dblclick(() => {
            if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                return;
            }
            this.joinChannel()
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.channelTag().on("contextmenu", (event) => {
                event.preventDefault();
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    (this.channelTree.currently_selected_context_callback || ((_) => null))(event);
                    return;
                }

                _this.channelTree.onSelect(_this, true);
                _this.showContextMenu(event.pageX, event.pageY, () => {
                    _this.channelTree.onSelect(undefined, true);
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

        spawn_context_menu(x, y, {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_switch",
                name: tr("<b>Switch to channel</b>"),
                callback: () => this.joinChannel()
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_edit",
                name: tr("Edit channel"),
                invalidPermission: !channelModify,
                callback: () => {
                    Modals.createChannelModal(this, undefined, this.channelTree.client.permissions, (changes?, permissions?) => {
                        if(changes) {
                            changes["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.sendCommand("channeledit", changes);
                            log.info(LogCategory.CHANNEL, tr("Changed channel properties of channel %s: %o"), this.channelName(), changes);
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
                            this.channelTree.client.serverConnection.sendCommand("channeladdperm", perms, ["continueonerror"]).then(() => {
                                sound.play(Sound.CHANNEL_EDITED_SELF);
                            });
                        }
                    });
                }
            },
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_delete",
                name: tr("Delete channel"),
                invalidPermission: !flagDelete,
                callback: () => {
                    this.channelTree.client.serverConnection.sendCommand("channeldelete", {cid: this.channelId}).then(() => {
                        sound.play(Sound.CHANNEL_DELETED);
                    })
                }
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-addon-collection",
                name: tr("Create music bot"),
                callback: () => {
                    this.channelTree.client.serverConnection.sendCommand("musicbotcreate", {cid: this.channelId}).then(() => {
                        createInfoModal(tr("Bot successfully created"), tr("But has been successfully created.")).open();
                    }).catch(error => {
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }

                        //TODO tr
                        createErrorModal(tr("Failed to create bot"), "Failed to create the music bot:<br>" + error).open();
                    });
                }
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_create_sub",
                name: tr("Create sub channel"),
                invalidPermission: !(channelCreate && this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_CHILD).granted(1)),
                callback: () => this.channelTree.spawnCreateChannel(this)
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-channel_create",
                name: tr("Create channel"),
                invalidPermission: !channelCreate,
                callback: () => this.channelTree.spawnCreateChannel()
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    handle_frame_resized() {
        this.__updateChannelName();
    }

    private __updateChannelName() {
        this._formatedChannelName = undefined;
        parseType:
        if(this.parent_channel() == null && this.properties.channel_name.charAt(0) == '[') {
            let end = this.properties.channel_name.indexOf(']');
            if(end == -1) break parseType;

            let options = this.properties.channel_name.substr(1, end - 1);
            if(options.indexOf("spacer") == -1) break parseType;
            options = options.substr(0, options.indexOf("spacer"));

            console.log(tr("Channel options: '%o'"), options);
            if(options.length == 0) options = "l";
            else if(options.length > 1) options = options[0];

            if(options == "r" || options == "l" || options == "c" || options == "*")
                this._channelAlign = options;
            else break parseType;

            this._formatedChannelName = this.properties.channel_name.substr(end + 1);
            console.log(tr("Got channel name: %o"), this._formatedChannelName);
        }

        let self = this.channelTag();
        let channelName = self.find(".channel_name");
        channelName.text(this.formatedChannelName());
        channelName.parent().removeClass("l r c *"); //Alignments
        (this._formatedChannelName !== undefined ? $.fn.hide : $.fn.show).apply(self.find(".channel_only_normal"));

        if(this._formatedChannelName !== undefined) {
            channelName.parent().addClass(this._channelAlign);

            if(this._channelAlign == "*") {
                let lastSuccess = "";
                let index = 6;

                let name = this.formatedChannelName();
                while(index-- > 0)
                    name = name + name;
                channelName.text(name);
                do {
                    channelName.text(name = name + name);
                } while (channelName.parent().width() >= channelName.width() && ++index < 64);
                if(index == 64) console.warn(LogCategory.CHANNEL, tr("Repeating spacer took too much repeats!"));
                if(lastSuccess.length > 0) {
                    channelName.text(lastSuccess);
                    self.addClass("c");
                }
            }
        }
        console.log(tr("Align: %s"), this._channelAlign);
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL, tr("Update properties (%i) of %s (%i)"), variables.length, this.channelName(), this.getChannelId());

        for(let variable of variables) {
            let key = variable.key;
            let value = variable.value;
            JSON.map_field_to(this.properties, value, variable.key);

            group.log(tr("Updating property %s = '%s' -> %o"), key, value, this.properties[key]);

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
            else if(key == "channel_needed_talk_power")
                (this.properties.channel_needed_talk_power > 0 ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_moderated"));
            else if(key == "channel_description") {
                this._cached_channel_description = undefined;
                if(this._cached_channel_description_promise_resolve)
                    this._cached_channel_description_promise_resolve(value);
                this._cached_channel_description_promise = undefined;
                this._cached_channel_description_promise_resolve = undefined;
                this._cached_channel_description_promise_reject = undefined;
            }
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
            createInputModal(tr("Channel password"), tr("Channel password:"), () => true, text => {
                if(typeof(text) == typeof(true)) return;
                helpers.hashPassword(text as string).then(result => {
                    this._cachedPassword = result;
                    this.joinChannel();
                    this.updateChannelTypeIcon();
                });
            }).open();
        } else if(this.channelTree.client.getClient().currentChannel() != this)
            this.channelTree.client.getServerConnection().joinChannel(this, this._cachedPassword).then(() => {
                sound.play(Sound.CHANNEL_JOINED);
            }).catch(error => {
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
    let chid : number = Number.parseInt(element.attr("channelId"));
    let channel = globalClient.channelTree.findChannel(chid);
    if(!channel) {
        //TODO
        return;
    }

    channel.showContextMenu(event.pageX, event.pageY);
}