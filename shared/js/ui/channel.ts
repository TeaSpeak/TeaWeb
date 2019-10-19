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

enum ChannelSubscribeMode {
    SUBSCRIBED,
    UNSUBSCRIBED,
    INHERITED
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

    channel_flag_conversation_private: boolean = true; /* TeamSpeak mode */
    channel_conversation_history_length: number = -1;
}

class ChannelEntry {
    channelTree: ChannelTree;
    channelId: number;
    parent?: ChannelEntry;
    properties: ChannelProperties = new ChannelProperties();

    channel_previous?: ChannelEntry;
    channel_next?: ChannelEntry;

    private _channel_name_alignment: string = undefined;
    private _channel_name_formatted: string = undefined;
    private _family_index: number = 0;

    //HTML DOM elements
    private _tag_root:              JQuery<HTMLElement>; /* container for the channel, client and children tag */
    private _tag_siblings:          JQuery<HTMLElement>; /* container for all sub channels */
    private _tag_clients:           JQuery<HTMLElement>; /* container for all clients */
    private _tag_channel:           JQuery<HTMLElement>; /* container for the channel info itself */
    private _destroyed = false;

    private _cachedPassword: string;
    private _cached_channel_description: string = undefined;
    private _cached_channel_description_promise: Promise<string> = undefined;
    private _cached_channel_description_promise_resolve: any = undefined;
    private _cached_channel_description_promise_reject: any = undefined;

    private _flag_subscribed: boolean;
    private _subscribe_mode: ChannelSubscribeMode;

    constructor(channelId, channelName, parent = null) {
        this.properties = new ChannelProperties();
        this.channelId = channelId;
        this.properties.channel_name = channelName;
        this.parent = parent;
        this.channelTree = null;

        this.initializeTag();
        this.__updateChannelName();
    }

    destroy() {
        this._destroyed = true;
        if(this._tag_root) {
            this._tag_root.remove(); /* removes also all other tags */
            this._tag_root = undefined;
        }
        this._tag_siblings = undefined;
        this._tag_channel = undefined;
        this._tag_clients = undefined;

        this._cached_channel_description_promise = undefined;
        this._cached_channel_description_promise_resolve = undefined;
        this._cached_channel_description_promise_reject = undefined;

        this.channel_previous = undefined;
        this.parent = undefined;
        this.channel_next = undefined;
        this.channelTree = undefined;
    }

    channelName(){
        return this.properties.channel_name;
    }

    formattedChannelName() {
        return this._channel_name_formatted || this.properties.channel_name;
    }

    getChannelDescription() : Promise<string> {
        if(this._cached_channel_description) return new Promise<string>(resolve => resolve(this._cached_channel_description));
        if(this._cached_channel_description_promise) return this._cached_channel_description_promise;

        this.channelTree.client.serverConnection.send_command("channelgetdescription", {cid: this.channelId}).catch(error => {
            this._cached_channel_description_promise_reject(error);
        });

        return this._cached_channel_description_promise = new Promise<string>((resolve, reject) => {
            this._cached_channel_description_promise_resolve = resolve;
            this._cached_channel_description_promise_reject = reject;
        });
    }

    parent_channel() { return this.parent; }
    hasParent(){ return this.parent != null; }
    getChannelId(){ return this.channelId; }

    children(deep = false) : ChannelEntry[] {
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
                    if(current == self) {
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

    update_family_index(enforce?: boolean) {
        const current_index = this._family_index;
        const new_index = this.calculate_family_index(true);
        if(current_index == new_index && !enforce) return;

        this._tag_channel.css("z-index", this._family_index);
        this._tag_channel.css("padding-left", ((this._family_index + 1) * 16 + 10) + "px");
    }

    calculate_family_index(enforce_recalculate: boolean = false) : number {
        if(this._family_index !== undefined && !enforce_recalculate)
            return this._family_index;

        this._family_index = 0;

        let channel = this.parent_channel();
        while(channel) {
            this._family_index++;
            channel = channel.parent_channel();
        }

        return this._family_index;
    }

    private initializeTag() {
        const tag_channel = $.spawn("div").addClass("tree-entry channel");

        {
            const container_entry = $.spawn("div").addClass("container-channel");

            container_entry.attr("channel-id", this.channelId);
            container_entry.addClass(this._channel_name_alignment);

            /* unread marker */
            {
                container_entry.append(
                    $.spawn("div")
                        .addClass("marker-text-unread hidden")
                        .attr("conversation", this.channelId)
                );
            }

            /* channel icon (type) */
            {
                container_entry.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only channel-type icon client-channel_green_subscribed")
                );
            }

            /* channel name */
            {
                container_entry.append(
                    $.spawn("div")
                    .addClass("container-channel-name")
                    .append(
                        $.spawn("a")
                        .addClass("channel-name")
                        .text(this.channelName())
                    )
                )
            }

            /* all icons (last element) */
            {
                //Icons
                let container_icons = $.spawn("span").addClass("icons");

                //Default icon (5)
                container_icons.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only icon_entry icon_default icon client-channel_default")
                    .attr("title", tr("Default channel"))
                );

                //Password icon (4)
                container_icons.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only icon_entry icon_password icon client-register")
                    .attr("title", tr("The channel is password protected"))
                );

                //Music icon (3)
                container_icons.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only icon_entry icon_music icon client-music")
                    .attr("title", tr("Music quality"))
                );

                //Channel moderated (2)
                container_icons.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only icon_entry icon_moderated icon client-moderated")
                    .attr("title", tr("Channel is moderated"))
                );

                //Channel Icon (1)
                container_icons.append(
                    $.spawn("div")
                    .addClass("show-channel-normal-only icon_entry channel_icon")
                    .attr("title", tr("Channel icon"))
                );

                //Default no sound (0)
                let container = $.spawn("div")
                    .css("position", "relative")
                    .addClass("icon_no_sound");

                let noSound = $.spawn("div")
                    .addClass("icon_entry icon client-conflict-icon")
                    .attr("title", "You don't support the channel codec");

                let bg = $.spawn("div")
                    .width(10)
                    .height(14)
                    .css("background", "red")
                    .css("position", "absolute")
                    .css("top", "1px")
                    .css("left", "3px")
                    .css("z-index", "-1");
                bg.appendTo(container);
                noSound.appendTo(container);
                container_icons.append(container);

                container_icons.appendTo(container_entry);
            }

            tag_channel.append(this._tag_channel = container_entry);
            this.update_family_index(true);
        }
        {
            const container_client = $.spawn("div").addClass("container-clients");


            tag_channel.append(this._tag_clients = container_client);
        }
        {
            const container_children = $.spawn("div").addClass("container-children");


            tag_channel.append(this._tag_siblings = container_children);
        }

        /*
        setInterval(() => {
            let color = (Math.random() * 10000000).toString(16).substr(0, 6);
            tag_channel.css("background", "#" + color);
        }, 150);
        */

        this._tag_root = tag_channel;
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

    private _reorder_timer: number;
    reorderClients(sync?: boolean) {
        if(this._reorder_timer) {
            if(!sync) return;
            clearTimeout(this._reorder_timer);
            this._reorder_timer = undefined;
        } else if(!sync) {
            this._reorder_timer = setTimeout(() => {
                this._reorder_timer = undefined;
                this.reorderClients(true);
            }, 5) as any;
            return;
        }

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

            log.debug(LogCategory.CHANNEL, tr("Reordered channel clients: %d"), clients.length);
            for(let client of clients) {
                log.debug(LogCategory.CHANNEL, "- %i %s", client.properties.client_talk_power, client.properties.client_nickname);
            }
        }
    }

    initializeListener() {
        const tag_channel = this.channelTag();
        tag_channel.on('click', () => this.channelTree.onSelect(this));
        tag_channel.on('dblclick', () => {
            if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                return;
            }
            this.joinChannel()
        });

        let last_touch: number = 0;
        let touch_start: number = 0;
        tag_channel.on('touchend', event => {
            /* if over 250ms then its not a click its more a drag */
            if(Date.now() - touch_start > 250) {
                touch_start = 0;
                return;
            }
            if(Date.now() - last_touch > 750) {
                last_touch = Date.now();
                return;
            }
            last_touch = Date.now();
            /* double touch */
            tag_channel.trigger('dblclick');
        });
        tag_channel.on('touchstart', event => {
            touch_start = Date.now();
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.channelTag().on("contextmenu", (event) => {
                event.preventDefault();
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    (this.channelTree.currently_selected_context_callback || ((_) => null))(event);
                    return;
                }

                this.channelTree.onSelect(this, true);
                this.showContextMenu(event.pageX, event.pageY, () => {
                    this.channelTree.onSelect(undefined, true);
                });
            });
        }
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let channelCreate = !![
            PermissionType.B_CHANNEL_CREATE_TEMPORARY,
            PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT,
            PermissionType.B_CHANNEL_CREATE_PERMANENT
        ].find(e => this.channelTree.client.permissions.neededPermission(e).granted(1));

        let channelModify = !![
            PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT,
            PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY,
            PermissionType.B_CHANNEL_MODIFY_NAME,
            PermissionType.B_CHANNEL_MODIFY_TOPIC,
            PermissionType.B_CHANNEL_MODIFY_DESCRIPTION,
            PermissionType.B_CHANNEL_MODIFY_PASSWORD,
            PermissionType.B_CHANNEL_MODIFY_CODEC,
            PermissionType.B_CHANNEL_MODIFY_CODEC_QUALITY,
            PermissionType.B_CHANNEL_MODIFY_CODEC_LATENCY_FACTOR,
            PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS,
            PermissionType.B_CHANNEL_MODIFY_MAXFAMILYCLIENTS,
            PermissionType.B_CHANNEL_MODIFY_SORTORDER,
            PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER,
            PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED,
            PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY,
            PermissionType.B_ICON_MANAGE
        ].find(e => this.channelTree.client.permissions.neededPermission(e).granted(1));

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

        let trigger_close = true;

        const bold = text => contextmenu.get_provider().html_format_enabled() ? "<b>" + text + "</b>" : text;
        contextmenu.spawn_context_menu(x, y, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: bold(tr("Switch to channel")),
                callback: () => this.joinChannel()
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: bold(tr("Join text channel")),
                callback: () => {
                    this.channelTree.client.side_bar.channel_conversations().set_current_channel(this.getChannelId());
                    this.channelTree.client.side_bar.show_channel_conversations();
                },
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show channel info"),
                callback: () => {
                    trigger_close = false;
                    Modals.openChannelInfo(this);
                },
                icon_class: "client-about"
            },
            ...(() => {
                const local_client = this.channelTree.client.getClient();
                if (!local_client || local_client.currentChannel() !== this)
                    return [
                        contextmenu.Entry.HR(),
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-subscribe_to_channel",
                            name: bold(tr("Subscribe to channel")),
                            callback: () => this.subscribe(),
                            visible: !this.flag_subscribed
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-channel_unsubscribed",
                            name: bold(tr("Unsubscribe from channel")),
                            callback: () => this.unsubscribe(),
                            visible: this.flag_subscribed
                        },
                        {
                            type: contextmenu.MenuEntryType.ENTRY,
                            icon: "client-subscribe_mode",
                            name: bold(tr("Use inherited subscribe mode")),
                            callback: () => this.unsubscribe(true),
                            visible: this.subscribe_mode != ChannelSubscribeMode.INHERITED
                        }
                    ];
                return [];
            })(),
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_edit",
                name: tr("Edit channel"),
                invalidPermission: !channelModify,
                callback: () => {
                    Modals.createChannelModal(this.channelTree.client, this, undefined, this.channelTree.client.permissions, (changes?, permissions?) => {
                        if(changes) {
                            changes["cid"] = this.channelId;
                            this.channelTree.client.serverConnection.send_command("channeledit", changes);
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
                            this.channelTree.client.serverConnection.send_command("channeladdperm", perms, {
                                flagset: ["continueonerror"]
                            }).then(() => {
                                this.channelTree.client.sound.play(Sound.CHANNEL_EDITED_SELF);
                            });
                        }
                    });
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_delete",
                name: tr("Delete channel"),
                invalidPermission: !flagDelete,
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("channeldelete", {cid: this.channelId}).then(() => {
                        this.channelTree.client.sound.play(Sound.CHANNEL_DELETED);
                    })
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-addon-collection",
                name: tr("Create music bot"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("musicbotcreate", {cid: this.channelId}).then(() => {
                        createInfoModal(tr("Bot successfully created"), tr("Bot has been successfully created.")).open();
                    }).catch(error => {
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }

                        createErrorModal(tr("Failed to create bot"), MessageHelper.formatMessage(tr("Failed to create the music bot:<br>{0}"), error)).open();
                    });
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_create_sub",
                name: tr("Create sub channel"),
                invalidPermission: !(channelCreate && this.channelTree.client.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_CHILD).granted(1)),
                callback: () => this.channelTree.spawnCreateChannel(this)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_create",
                name: tr("Create channel"),
                invalidPermission: !channelCreate,
                callback: () => this.channelTree.spawnCreateChannel()
            },
            contextmenu.Entry.CLOSE(() => trigger_close ? on_close() : {})
        );
    }

    handle_frame_resized() {
        if(this._channel_name_formatted === "align-repetitive")
            this.__updateChannelName();
    }

    private static NAME_ALIGNMENTS: string[] = ["align-left", "align-center", "align-right", "align-repetitive"];
    private __updateChannelName() {
        this._channel_name_formatted = undefined;

        parse_type:
        if(this.parent_channel() == null && this.properties.channel_name.charAt(0) == '[') {
            let end = this.properties.channel_name.indexOf(']');
            if(end == -1) break parse_type;

            let options = this.properties.channel_name.substr(1, end - 1);
            if(options.indexOf("spacer") == -1) break parse_type;
            options = options.substr(0, options.indexOf("spacer"));

            if(options.length == 0)
                options = "l";
            else if(options.length > 1)
                options = options[0];

            switch (options) {
                case "r":
                    this._channel_name_alignment = "align-right";
                    break;
                case "l":
                    this._channel_name_alignment = "align-left";
                    break;
                case "c":
                    this._channel_name_alignment = "align-center";
                    break;
                case "*":
                    this._channel_name_alignment = "align-repetitive";
                    break;
                default:
                    this._channel_name_alignment = undefined;
                    break parse_type;
            }

            this._channel_name_formatted = this.properties.channel_name.substr(end + 1) || "";
        }

        this._tag_channel.find(".show-channel-normal-only").toggleClass("channel-normal", this._channel_name_formatted === undefined);

        const tag_container_name = this._tag_channel.find(".container-channel-name");
        tag_container_name.removeClass(ChannelEntry.NAME_ALIGNMENTS.join(" "));

        const tag_name = tag_container_name.find(".channel-name");
        let text = this._channel_name_formatted === undefined ? this.properties.channel_name : this._channel_name_formatted;

        if(this._channel_name_formatted !== undefined) {
            tag_container_name.addClass(this._channel_name_alignment);

            if(this._channel_name_alignment == "align-repetitive" && text.length > 0) {
                while(text.length < 1024 * 8)
                    text += text;
            }
        }

        tag_name.text(text);
    }

    recalculate_repetitive_name() {
        if(this._channel_name_alignment == "align-repetitive")
            this.__updateChannelName();
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CHANNEL_PROPERTIES, tr("Update properties (%i) of %s (%i)"), variables.length, this.channelName(), this.getChannelId());

        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Clannel update properties", entries);
        }

        let info_update = false;
        for(let variable of variables) {
            let key = variable.key;
            let value = variable.value;
            JSON.map_field_to(this.properties, value, variable.key);

            if(key == "channel_name") {
                this.__updateChannelName();
                info_update = true;
            } else if(key == "channel_order") {
                let order = this.channelTree.findChannel(this.properties.channel_order);
                this.channelTree.moveChannel(this, order, this.parent);
            } else if(key == "channel_icon_id") {
                /* For more detail lookup client::updateVariables and client_icon_id!
                 * ATTENTION: This is required!
                 */
                this.properties.channel_icon_id = variable.value as any >>> 0;

                let tag = this.channelTag().find(".icons .channel_icon");
                (this.properties.channel_icon_id > 0 ? $.fn.show : $.fn.hide).apply(tag);
                if(this.properties.channel_icon_id > 0) {
                    tag.children().detach();
                    this.channelTree.client.fileManager.icons.generateTag(this.properties.channel_icon_id).appendTo(tag);
                }
                info_update = true;
            } else if(key == "channel_codec") {
                (this.properties.channel_codec == 5 || this.properties.channel_codec == 3 ? $.fn.show : $.fn.hide).apply(this.channelTag().find(".icons .icon_music"));
                this.channelTag().find(".icons .icon_no_sound").toggle(!(
                    this.channelTree.client.serverConnection.support_voice() &&
                    this.channelTree.client.serverConnection.voice_connection().decoding_supported(this.properties.channel_codec)
                ));
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
            if(key == "channel_maxclients" || key == "channel_maxfamilyclients" || key == "channel_flag_private" || key == "channel_flag_password") {
                this.updateChannelTypeIcon();
                info_update = true;
            }
            if(key == "channel_flag_conversation_private") {
                const conversations = this.channelTree.client.side_bar.channel_conversations();
                const conversation = conversations.conversation(this.channelId, false);
                if(conversation)
                    conversation.set_flag_private(this.properties.channel_flag_conversation_private);
            }
        }
        group.end();

        if(info_update) {
            const _client = this.channelTree.client.getClient();
            if(_client.currentChannel() === this)
                this.channelTree.client.side_bar.info_frame().update_channel_talk();
            //TODO chat channel!
        }
    }

    updateChannelTypeIcon() {
        let tag = this.channelTag().find(".channel-type");
        tag.removeAttr('class');
        tag.addClass("show-channel-normal-only channel-type icon");

        if(this._channel_name_formatted === undefined)
            tag.addClass("channel-normal");

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

        tag.addClass("client-channel_" + type + (this._flag_subscribed ? "_subscribed" : ""));
    }

    generate_bbcode() {
        return "[url=channel://" + this.channelId + "/" + encodeURIComponent(this.properties.channel_name) + "]" + this.formattedChannelName() + "[/url]";
    }

    generate_tag(braces: boolean = false) : JQuery {
        return $(htmltags.generate_channel({
            channel_name: this.properties.channel_name,
            channel_id: this.channelId,
            add_braces: braces
        }));
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
            this.channelTree.client.getServerConnection().command_helper.joinChannel(this, this._cachedPassword).then(() => {
                this.channelTree.client.sound.play(Sound.CHANNEL_JOINED);
            }).catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id == 781) { //Invalid password
                        this._cachedPassword = undefined;
                        this.updateChannelTypeIcon();
                    }
                }
            });
    }

    cached_password() { return this._cachedPassword; }

    async subscribe() : Promise<void> {
        if(this.subscribe_mode == ChannelSubscribeMode.SUBSCRIBED)
            return;

        this.subscribe_mode = ChannelSubscribeMode.SUBSCRIBED;

        const connection = this.channelTree.client.getServerConnection();
        if(!this.flag_subscribed && connection)
            await connection.send_command('channelsubscribe', {
                'cid': this.getChannelId()
            });
        else
            this.flag_subscribed = false;
    }

    async unsubscribe(inherited_subscription_mode?: boolean) : Promise<void> {
        const connection = this.channelTree.client.getServerConnection();
        let unsubscribe: boolean;

        if(inherited_subscription_mode) {
            this.subscribe_mode = ChannelSubscribeMode.INHERITED;
            unsubscribe = this.flag_subscribed && !this.channelTree.client.client_status.channel_subscribe_all;
        } else {
            this.subscribe_mode = ChannelSubscribeMode.UNSUBSCRIBED;
            unsubscribe = this.flag_subscribed;
        }

        if(unsubscribe) {
            if(connection)
                await connection.send_command('channelunsubscribe', {
                    'cid': this.getChannelId()
                });
            else
                this.flag_subscribed = false;

            for(const client of this.clients(false))
                this.channelTree.deleteClient(client, false);
        }
    }

    get flag_subscribed() : boolean {
        return this._flag_subscribed;
    }

    set flag_subscribed(flag: boolean) {
        if(this._flag_subscribed == flag)
            return;

        this._flag_subscribed = flag;
        this.updateChannelTypeIcon();
    }

    get subscribe_mode() : ChannelSubscribeMode {
        return typeof(this._subscribe_mode) !== 'undefined' ? this._subscribe_mode : (this._subscribe_mode = this.channelTree.client.settings.server(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), ChannelSubscribeMode.INHERITED));
    }

    set subscribe_mode(mode: ChannelSubscribeMode) {
        if(this.subscribe_mode == mode)
            return;

        this._subscribe_mode = mode;
        this.channelTree.client.settings.changeServer(Settings.FN_SERVER_CHANNEL_SUBSCRIBE_MODE(this.channelId), mode);
    }

    set flag_text_unread(flag: boolean) {
        this._tag_channel.find(".marker-text-unread").toggleClass("hidden", !flag);
    }

    log_data() : log.server.base.Channel {
        return {
            channel_name: this.channelName(),
            channel_id: this.channelId
        }
    }
}