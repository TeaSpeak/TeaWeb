/// <reference path="channel.ts" />
/// <reference path="modal/ModalChangeVolume.ts" />
/// <reference path="modal/ModalServerGroupDialog.ts" />
/// <reference path="client_move.ts" />

import KeyEvent = ppt.KeyEvent;

enum ClientType {
    CLIENT_VOICE,
    CLIENT_QUERY,
    CLIENT_INTERNAL,
    CLIENT_WEB,
    CLIENT_MUSIC,
    CLIENT_UNDEFINED
}

class ClientProperties {
    client_type: ClientType = ClientType.CLIENT_VOICE; //TeamSpeaks type
    client_type_exact: ClientType = ClientType.CLIENT_VOICE;

    client_database_id: number = 0;
    client_version: string = "";
    client_platform: string = "";
    client_nickname: string = "unknown";
    client_unique_identifier: string = "unknown";
    client_description: string = "";
    client_servergroups: string = "";

    client_channel_group_id: number = 0;
    client_lastconnected: number = 0;

    client_flag_avatar: string = "";
    client_icon_id: number = 0;

    client_away_message: string = "";
    client_away: boolean = false;


    client_input_hardware: boolean = false;
    client_output_hardware: boolean = false;
    client_input_muted: boolean = false;
    client_output_muted: boolean = false;
    client_is_channel_commander: boolean = false;

    client_teaforum_id: number = 0;
    client_teaforum_name: string = "";

    client_talk_power: number = 0;
}

class ClientEntry {
    protected _clientId: number;
    protected _channel: ChannelEntry;
    protected _tag: JQuery<HTMLElement>;

    protected _properties: ClientProperties;
    protected lastVariableUpdate: number = 0;
    protected _speaking: boolean = false;
    protected _listener_initialized: boolean;
    protected _audio_handle: connection.voice.VoiceClient;

    channelTree: ChannelTree;

    constructor(clientId: number, clientName, properties: ClientProperties = new ClientProperties()) {
        this._properties = properties;
        this._properties.client_nickname = clientName;
        this._clientId = clientId;
        this.channelTree = null;
        this._channel = null;
    }

    set_audio_handle(handle: connection.voice.VoiceClient) {
        if(this._audio_handle === handle)
            return;

        //TODO may ensure that the id is the same?
        this._audio_handle = handle;
        if(!handle) {
            this.speaking = false;
            return;
        }

        handle.callback_playback = () => this.speaking = true;
        handle.callback_stopped = () => this.speaking = false;
    }

    get_audio_handle() : connection.voice.VoiceClient {
        return this._audio_handle;
    }

    get properties() : ClientProperties {
        return this._properties;
    }

    currentChannel() : ChannelEntry { return this._channel; }
    clientNickName(){ return this.properties.client_nickname; }
    clientUid(){ return this.properties.client_unique_identifier; }
    clientId(){ return this._clientId; }

    protected initializeListener(){
        if(this._listener_initialized) return;
        this._listener_initialized = true;

        this.tag.on('mouseup', event => {
            if(!this.channelTree.client_mover.is_active()) {
                this.channelTree.onSelect(this);
            }
        });

        this.tag.on('click', event => {
            console.log("I've been clicked!");
        });

        if(!(this instanceof LocalClientEntry) && !(this instanceof MusicClientEntry))
            this.tag.dblclick(event => {
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    return;
                }
                this.chat(true).focus();
            });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.tag.on("contextmenu", (event) => {
                event.preventDefault();
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    (this.channelTree.currently_selected_context_callback || ((_) => null))(event);
                    return;
                }

                this.channelTree.onSelect(this, true);
                this.showContextMenu(event.pageX, event.pageY, () => {});
                return false;
            });
        }

        this.tag.on('mousedown', event => {
            if(event.which != 1) return; //Only the left button

            let clients = this.channelTree.currently_selected as (ClientEntry | ClientEntry[]);

            if(ppt.key_pressed(ppt.SpecialKey.SHIFT)) {
                if(clients != this && !($.isArray(clients) && clients.indexOf(this) != -1))
                    clients = $.isArray(clients) ? [...clients, this] : [clients, this];
            } else {
                clients = this;
            }

            this.channelTree.client_mover.activate(clients, target => {
                if(!target) return;

                for(const client of $.isArray(clients) ? clients : [clients]) {
                    if(target == client._channel) continue;

                    const source = client._channel;
                    const self = this.channelTree.client.getClient();
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: client.clientId(),
                        cid: target.getChannelId()
                    }).then(event => {
                        if(client.clientId() == this.channelTree.client.clientId)
                            this.channelTree.client.sound.play(Sound.CHANNEL_JOINED);
                        else if(target !== source && target != self.currentChannel())
                            this.channelTree.client.sound.play(Sound.USER_MOVED);
                    });
                }

                this.channelTree.onSelect();
            }, event);
        });
    }

    protected assignment_context() : ContextMenuEntry[] {
        let server_groups: ContextMenuEntry[] = [];
        for(let group of this.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
            if(group.type != GroupType.NORMAL) continue;

            let entry: ContextMenuEntry = {} as any;

            {
                let tag = $.spawn("label").addClass("checkbox");
                $.spawn("input").attr("type", "checkbox").prop("checked", this.groupAssigned(group)).appendTo(tag);
                $.spawn("span").addClass("checkmark").appendTo(tag);
                entry.icon = tag;
            }

            entry.name = group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]";
            if(this.groupAssigned(group)) {
                entry.callback = () => {
                    this.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                        sgid: group.id,
                        cldbid: this.properties.client_database_id
                    });
                };
                entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
            } else {
                entry.callback = () => {
                    this.channelTree.client.serverConnection.send_command("servergroupaddclient", {
                        sgid: group.id,
                        cldbid: this.properties.client_database_id
                    });
                };
                entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_REMOVE_POWER).granted(group.requiredMemberAddPower);
            }
            entry.type = MenuEntryType.ENTRY;
            server_groups.push(entry);
        }

        let channel_groups: ContextMenuEntry[] = [];
        for(let group of this.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
            if(group.type != GroupType.NORMAL) continue;

            let entry: ContextMenuEntry = {} as any;
            {
                let tag = $.spawn("label").addClass("checkbox");
                $.spawn("input").attr("type", "checkbox").prop("checked", this.assignedChannelGroup() == group.id).appendTo(tag);
                $.spawn("span").addClass("checkmark").appendTo(tag);
                entry.icon = tag;
            }
            entry.name = group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]";
            entry.callback = () => {
                this.channelTree.client.serverConnection.send_command("setclientchannelgroup", {
                    cldbid: this.properties.client_database_id,
                    cgid: group.id,
                    cid: this.currentChannel().channelId
                });
            };
            entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
            entry.type = MenuEntryType.ENTRY;
            channel_groups.push(entry);
        }

        return [{
            type: MenuEntryType.SUB_MENU,
            icon: "client-permission_server_groups",
            name: tr("Set server group"),
            sub_menu: [
                {
                    type: MenuEntryType.ENTRY,
                    icon: "client-permission_server_groups",
                    name: "Server groups dialog",
                    callback: () => {
                        Modals.createServerGroupAssignmentModal(this, (group, flag) => {
                            if(flag) {
                                return this.channelTree.client.serverConnection.send_command("servergroupaddclient", {
                                    sgid: group.id,
                                    cldbid: this.properties.client_database_id
                                }).then(result => true);
                            } else
                                return this.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                                    sgid: group.id,
                                    cldbid: this.properties.client_database_id
                                }).then(result => true);
                        });
                    }
                },
                MenuEntry.HR(),
                ...server_groups
            ]
        },{
            type: MenuEntryType.SUB_MENU,
            icon: "client-permission_channel",
            name: tr("Set channel group"),
            sub_menu: [
                ...channel_groups
            ]
        },{
            type: MenuEntryType.SUB_MENU,
            icon: "client-permission_client",
            name: tr("Permissions"),
            disabled: true,
            sub_menu: [ ]
        }];
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let trigger_close = true;
        spawn_context_menu(x, y,
            {
                type: MenuEntryType.ENTRY,
                name: tr("Show client info"),
                callback: () => {
                    trigger_close = false;
                    this.channelTree.client.select_info.open_popover()
                },
                icon: "client-about",
                visible: this.channelTree.client.select_info.is_popover()
            }, {
                type: MenuEntryType.HR,
                visible: this.channelTree.client.select_info.is_popover(),
                name: ''
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-change_nickname",
                name: tr("<b>Open text chat</b>"),
                callback: () => {
                    this.channelTree.client.chat.activeChat = this.chat(true);
                    this.channelTree.client.chat.focus();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-poke",
                name: tr("Poke client"),
                callback: () => {
                    createInputModal(tr("Poke client"), tr("Poke message:<br>"), text => true, result => {
                        if(typeof(result) === "string") {
                            //TODO tr
                            console.log("Poking client " + this.clientNickName() + " with message " + result);
                            this.channelTree.client.serverConnection.send_command("clientpoke", {
                                clid: this.clientId(),
                                msg: result
                            });

                        }
                    }, { width: 400, maxLength: 512 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-edit",
                name: tr("Change description"),
                callback: () => {
                    createInputModal(tr("Change client description"), tr("New description:<br>"), text => true, result => {
                        if(typeof(result) === "string") {
                            //TODO tr
                            console.log("Changing " + this.clientNickName() + "'s description to " + result);
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                }
            },
            MenuEntry.HR(),
            ...this.assignment_context(),
            MenuEntry.HR(), {
                type: MenuEntryType.ENTRY,
                icon: "client-move_client_to_own_channel",
                name: tr("Move client to your channel"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    });
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_channel",
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            //TODO tr
                            console.log("Kicking client " + this.clientNickName() + " from channel with reason " + result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_server",
                name: tr("Kick client fom server"),
                callback: () => {
                    createInputModal(tr("Kick client from server"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            //TODO tr
                            console.log("Kicking client " + this.clientNickName() + " from server with reason " + result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-ban_client",
                name: tr("Ban client"),
                invalidPermission: !this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                callback: () => {
                    Modals.spawnBanClient(this.properties.client_nickname, (data) => {
                        this.channelTree.client.serverConnection.send_command("banclient", {
                            uid: this.properties.client_unique_identifier,
                            banreason: data.reason,
                            time: data.length
                        }, {
                            flagset: [data.no_ip ? "no-ip" : "", data.no_hwid ? "no-hardware-id" : "", data.no_name ? "no-nickname" : ""]
                        }).then(() => {
                            this.channelTree.client.sound.play(Sound.USER_BANNED);
                        });
                    });
                }
            },
            MenuEntry.HR(),
            /*
            {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_server",
                name: "Add group to client",
                invalidPermission: true, //!this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                callback: () => {
                    Modals.spawnBanClient(this.properties.client_nickname, (duration, reason) => {
                        this.channelTree.client.serverConnection.send_command("banclient", {
                            uid: this.properties.client_unique_identifier,
                            banreason: reason,
                            time: duration
                        });
                    });
                }
            },
            MenuEntry.HR(),
            */
            {
                type: MenuEntryType.ENTRY,
                icon: "client-volume",
                name: tr("Change Volume"),
                callback: () => {
                    Modals.spawnChangeVolume(this._audio_handle.get_volume(), volume => {
                        this.channelTree.client.settings.changeServer("volume_client_" + this.clientUid(), volume);
                        this._audio_handle.set_volume(volume);
                        if(this.channelTree.client.select_info.currentSelected == this)
                            this.channelTree.client.select_info.update();
                    });
                }
            },
            MenuEntry.CLOSE(() => (trigger_close ? on_close : () => {})())
        );
    }

    get tag() : JQuery<HTMLElement> {
        if(this._tag) return this._tag;

        let container_client = $.spawn("div")
            .addClass("tree-entry client")
            .attr("client-id", this.clientId());


        container_client.append(
            $.spawn("div")
            .addClass("icon_client_state")
            .attr("title", "Client state")
        );

        container_client.append(
            $.spawn("div")
            .addClass("group-prefix")
            .attr("title", "Server groups prefixes")
            .hide()
        );
        container_client.append(
            $.spawn("div")
            .addClass("client-name")
            .text(this.clientNickName())
        );
        container_client.append(
            $.spawn("div")
            .addClass("group-suffix")
            .attr("title", "Server groups suffix")
            .hide()
        );
        container_client.append(
            $.spawn("div")
            .addClass("client-away-message")
            .text(this.clientNickName())
        );

        let container_icons = $.spawn("div").addClass("container-icons");

        container_icons.append(
            $.spawn("div")
                .addClass("icon icon_talk_power client-input_muted")
                .hide()
        );
        container_icons.append(
            $.spawn("div")
            .addClass("container-icons-group")
        );
        container_icons.append(
            $.spawn("div")
            .addClass("container-icon-client")
        );
        container_client.append(container_icons);

        this._tag = container_client;
        this.initializeListener();
        return this._tag;
    }

    static bbcodeTag(id: number, name: string, uid: string) : string {
        return "[url=client://" + id + "/" + uid + "~" + encodeURIComponent(name) + "]" + name + "[/url]";
    }

    static chatTag(id: number, name: string, uid: string, braces: boolean = false) : JQuery {
        return $(htmltags.generate_client({
            client_name: name,
            client_id: id,
            client_unique_id: uid,
            add_braces: braces
        }));
    }

    create_bbcode() : string {
        return ClientEntry.bbcodeTag(this.clientId(), this.clientNickName(), this.clientUid());
    }

    createChatTag(braces: boolean = false) : JQuery {
        return ClientEntry.chatTag(this.clientId(), this.clientNickName(), this.clientUid(), braces);
    }

    set speaking(flag) {
        if(flag == this._speaking) return;
        this._speaking = flag;
        this.updateClientSpeakIcon();
    }

    updateClientStatusIcons() {
        let talk_power = this.properties.client_talk_power >= this._channel.properties.channel_needed_talk_power;
        if(talk_power)
            this.tag.find(".icon_talk_power").hide();
        else
            this.tag.find(".icon_talk_power").show();
    }

    updateClientSpeakIcon() {
        let icon: string = "";
        let clicon: string = "";

        if(this.properties.client_type_exact == ClientType.CLIENT_QUERY) {
            icon = "client-server_query";
            console.log("Server query!");
        } else {
            if(this.properties.client_away) {
                icon = "client-away";
            } else if(!this.properties.client_output_hardware) {
                icon = "client-hardware_output_muted";
            } else if(this.properties.client_output_muted) {
                icon = "client-output_muted";
            } else if(!this.properties.client_input_hardware) {
                icon = "client-hardware_input_muted";
            } else if(this.properties.client_input_muted) {
                icon = "client-input_muted";
            } else {
                if(this._speaking) {
                    if(this.properties.client_is_channel_commander)
                        clicon = "client_cc_talk";
                    else
                        clicon = "client_talk";
                } else {
                    if(this.properties.client_is_channel_commander)
                        clicon = "client_cc_idle";
                    else
                        clicon = "client_idle";
                }
            }
        }


        if(clicon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state clicon ' + clicon);
        else if(icon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon ' + icon);
        else
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon_empty');
    }

    updateAwayMessage() {
        let tag = this.tag.find(".client-away-message");
        if(this.properties.client_away == true && this.properties.client_away_message){
            tag.text("[" + this.properties.client_away_message + "]");
            tag.show();
        } else {
            tag.hide();
        }
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CLIENT, tr("Update properties (%i) of %s (%i)"), variables.length, this.clientNickName(), this.clientId());

        let update_icon_status = false;
        let update_icon_speech = false;
        let update_away = false;
        let reorder_channel = false;

        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table("Client update properties", entries);
        }

        for(const variable of variables) {
            JSON.map_field_to(this._properties, variable.value, variable.key);

            if(variable.key == "client_nickname") {
                this.tag.find(".client-name").text(variable.value);
                let chat = this.chat(false);
                if(chat) chat.name = variable.value;

                reorder_channel = true;
            }
            if(
                variable.key == "client_away" ||
                variable.key == "client_input_hardware" ||
                variable.key == "client_output_hardware" ||
                variable.key == "client_output_muted" ||
                variable.key == "client_input_muted" ||
                variable.key == "client_is_channel_commander"){
                update_icon_speech = true;
            }
            if(variable.key == "client_away_message" || variable.key == "client_away") {
                update_away = true;
            }
            if(variable.key == "client_unique_identifier") {
                if(this._audio_handle) {
                    const volume = parseFloat(this.channelTree.client.settings.server("volume_client_" + this.clientUid(), "1"));
                    this._audio_handle.set_volume(volume);
                    log.debug(LogCategory.CLIENT, tr("Loaded client volume %d for client %s from config."), volume, this.clientUid());
                } else {
                    log.warn(LogCategory.CLIENT, tr("Visible client got unique id assigned, but hasn't yet an audio handle. Ignoring volume assignment."));
                }
            }
            if(variable.key == "client_talk_power") {
                reorder_channel = true;
                update_icon_status = true;
            }
            if(variable.key == "client_icon_id") {
                /* yeah we like javascript. Due to JS wiered integer behaviour parsing for example fails for 18446744073409829863.
                *  parseInt("18446744073409829863") evaluates to  18446744073409829000.
                *  In opposite "18446744073409829863" >>> 0 evaluates to 3995244544, which is the icon id :)
                */
                this.properties.client_icon_id = variable.value as any >>> 0;
                this.updateClientIcon();
            }
            if(variable.key =="client_channel_group_id" || variable.key == "client_servergroups")
                this.update_displayed_client_groups();
        }

        /* process updates after variables have been set */
        if(this._channel && reorder_channel)
            this._channel.reorderClients();
        if(update_icon_speech)
            this.updateClientSpeakIcon();
        if(update_icon_status)
            this.updateClientStatusIcons();
        if(update_away)
            this.updateAwayMessage();

        group.end();
    }

    update_displayed_client_groups() {
        this.tag.find(".container-icons-group").children().detach();

        for(let id of this.assignedServerGroupIds())
            this.updateGroupIcon(this.channelTree.client.groups.serverGroup(id));

        this.updateGroupIcon(this.channelTree.client.groups.channelGroup(this.properties.client_channel_group_id));

        let prefix_groups: string[] = [];
        let suffix_groups: string[] = [];
        for(const group_id of this.assignedServerGroupIds()) {
            const group = this.channelTree.client.groups.serverGroup(group_id);
            if(!group) continue;

            if(group.properties.namemode == 1)
                prefix_groups.push(group.name);
            else if(group.properties.namemode == 2)
                suffix_groups.push(group.name);
        }

        const tag_group_prefix = this.tag.find(".group-prefix");
        const tag_group_suffix = this.tag.find(".group-suffix");
        if(prefix_groups.length > 0) {
            tag_group_prefix.text("[" + prefix_groups.join("][") + "]").show();
        } else {
            tag_group_prefix.hide()
        }

        if(suffix_groups.length > 0) {
            tag_group_suffix.text("[" + suffix_groups.join("][") + "]").show();
        } else {
            tag_group_suffix.hide()
        }
    }

    updateClientVariables(){
        if(this.lastVariableUpdate == 0 || new Date().getTime() - 10 * 60 * 1000 > this.lastVariableUpdate){ //Cache these only 10 min
            this.lastVariableUpdate = new Date().getTime();
            this.channelTree.client.serverConnection.send_command("clientgetvariables", {clid: this.clientId()});
        }
    }

    private chat_name() {
        return "client_" + this.clientUid() + ":" + this.clientId();
    }

    chat(create: boolean = false) : ChatEntry {
        let chatName = "client_" + this.clientUid() + ":" + this.clientId();
        let chat = this.channelTree.client.chat.findChat(chatName);
        if(!chat && create) {
            chat = this.channelTree.client.chat.createChat(chatName);
            chat.flag_closeable = true;
            chat.name = this.clientNickName();
            chat.owner_unique_id = this.properties.client_unique_identifier;
        }

        this.initialize_chat(chat);
        return chat;
    }

    initialize_chat(handle?: ChatEntry) {
        handle = handle || this.channelTree.client.chat.findChat(this.chat_name());
        if(!handle)
            return;

        handle.onMessageSend = text => {
            this.channelTree.client.serverConnection.command_helper.sendMessage(text, ChatType.CLIENT, this);
        };

        handle.onClose = () => {
            if(!handle.flag_offline)
                this.channelTree.client.serverConnection.send_command("clientchatclosed", {"clid": this.clientId()}, {process_result: false}).catch(error => {
                    log.warn(LogCategory.GENERAL, tr("Failed to notify chat participant (%o) that the chat has been closed. Error: %o"), this, error);
                });
            return true;
        };
    }

    updateClientIcon() {
        this.tag.find(".container-icon-client").children().detach();
        if(this.properties.client_icon_id > 0) {
            this.channelTree.client.fileManager.icons.generateTag(this.properties.client_icon_id).attr("title", "Client icon")
                .appendTo(this.tag.find(".container-icon-client"));
        }
    }

    updateGroupIcon(group: Group) {
        if(!group) return;
        //TODO group icon order
        this.tag.find(".container-icons-group .icon_group_" + group.id).detach();

        if (group.properties.iconid > 0) {
            this.tag.find(".container-icons-group").append(
                $.spawn("div")
                    .addClass("container-group-icon icon_group_" + group.id)
                    .append(this.channelTree.client.fileManager.icons.generateTag(group.properties.iconid)).attr("title", group.name)
            );
        }
    }

    assignedServerGroupIds() : number[] {
        let result = [];
        for(let id of this.properties.client_servergroups.split(",")){
            if(id.length == 0) continue;
            result.push(Number.parseInt(id));
        }
        return result;
    }

    assignedChannelGroup() : number {
        return this.properties.client_channel_group_id;
    }

    groupAssigned(group: Group) : boolean {
        if(group.target == GroupTarget.SERVER) {
            for(let id of this.assignedServerGroupIds())
                if(id == group.id) return true;
            return false;
        } else return group.id == this.assignedChannelGroup();
    }

    onDelete() { }

    calculateOnlineTime() : number {
        return Date.now() / 1000 - this.properties.client_lastconnected;
    }

    avatarId?() : string {
        function str2ab(str) {
            let buf = new ArrayBuffer(str.length); // 2 bytes for each char
            let bufView = new Uint8Array(buf);
            for (let i=0, strLen = str.length; i<strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        }

        try {
            let raw = atob(this.properties.client_unique_identifier);
            let input = hex.encode(str2ab(raw));

            let result: string = "";
            for(let index = 0; index < input.length; index++) {
                let c = input.charAt(index);
                let offset: number = 0;
                if(c >= '0' && c <= '9')
                    offset = c.charCodeAt(0) - '0'.charCodeAt(0);
                else if(c >= 'A' && c <= 'F')
                    offset = c.charCodeAt(0) - 'A'.charCodeAt(0) + 0x0A;
                else if(c >= 'a' && c <= 'f')
                    offset = c.charCodeAt(0) - 'a'.charCodeAt(0) + 0x0A;
                result += String.fromCharCode('a'.charCodeAt(0) + offset);
            }
            return result;
        } catch (e) { //invalid base 64 (like music bot etc)
            return undefined;
        }
    }

    update_family_index() {
        if(!this._channel) return;
        const index = this._channel.calculate_family_index();

        this.tag.css('padding-left', (index + 2) * 16 + "px");
    }
}

class LocalClientEntry extends ClientEntry {
    handle: ConnectionHandler;

    private renaming: boolean;

    constructor(handle: ConnectionHandler) {
        super(0, "local client");
        this.handle = handle;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        const _self = this;

        spawn_context_menu(x, y,
            {
                name: tr("<b>Change name</b>"),
                icon: "client-change_nickname",
                callback: () =>_self.openRename(),
                type: MenuEntryType.ENTRY
            }, {
                name: tr("Change description"),
                icon: "client-edit",
                callback: () => {
                    createInputModal(tr("Change own description"), tr("New description:<br>"), text => true, result => {
                        if(result) {
                            console.log(tr("Changing own description to %s"), result);
                            _self.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: _self.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                },
                type: MenuEntryType.ENTRY
            },
            MenuEntry.HR(),
            ...this.assignment_context(),
            MenuEntry.CLOSE(on_close)
        );
    }

    initializeListener(): void {
        super.initializeListener();
        this.tag.find(".client-name").addClass("client-name-own");

        this.tag.dblclick(() => {
            if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                return;
            }
            this.openRename();
        });
    }

    openRename() : void {
        const _self = this;

        this.channelTree.client_mover.enabled = false;

        const elm = this.tag.find(".client-name");
        elm.attr("contenteditable", "true");
        elm.removeClass("client-name-own");
        elm.css("background-color", "white");
        elm.focus();
        _self.renaming = true;

        elm.keypress(function (e) {
            if(e.keyCode == KeyCode.KEY_RETURN) {
                $(this).trigger("focusout");
                return false;
            }
        });

        elm.focusout(e => {
            this.channelTree.client_mover.enabled = true;

            if(!_self.renaming) return;
            _self.renaming = false;

            elm.css("background-color", "");
            elm.removeAttr("contenteditable");
            elm.addClass("client-name-own");
            let text = elm.text().toString();
            if(_self.clientNickName() == text) return;

            elm.text(_self.clientNickName());
            _self.handle.serverConnection.command_helper.updateClient("client_nickname", text).then((e) => {
                settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, text);
                this.channelTree.client.chat.serverChat().appendMessage(tr("Nickname successfully changed"));
            }).catch((e: CommandResult) => {
                this.channelTree.client.chat.serverChat().appendError(tr("Could not change nickname ({})"),  e.extra_message);
                _self.openRename();
            });
        });
    }
}

class MusicClientProperties extends ClientProperties {
    player_state: number = 0;
    player_volume: number = 0;

    client_playlist_id: number = 0;
    client_disabled: boolean = false;
}

class MusicClientPlayerInfo {
    bot_id: number = 0;
    player_state: number = 0;

    player_buffered_index: number = 0;
    player_replay_index: number = 0;
    player_max_index: number = 0;
    player_seekable: boolean = false;

    player_title: string = "";
    player_description: string = "";

    song_id: number = 0;
    song_url: string = "";
    song_invoker: number = 0;
    song_loaded: boolean = false;
    song_title: string = "";
    song_thumbnail: string = "";
    song_length: number = 0;
}

class MusicClientEntry extends ClientEntry {
    private _info_promise: Promise<MusicClientPlayerInfo>;
    private _info_promise_age: number = 0;
    private _info_promise_resolve: any;
    private _info_promise_reject: any;

    constructor(clientId, clientName) {
        super(clientId, clientName, new MusicClientProperties());
    }

    get properties() : MusicClientProperties {
        return this._properties as MusicClientProperties;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        let trigger_close = true;
        spawn_context_menu(x, y,
            {
                type: MenuEntryType.ENTRY,
                name: tr("Show bot info"),
                callback: () => {
                    trigger_close = false;
                    this.channelTree.client.select_info.open_popover()
                },
                icon: "client-about",
                visible: this.channelTree.client.select_info.is_popover()
            }, {
                type: MenuEntryType.HR,
                visible: this.channelTree.client.select_info.is_popover(),
                name: ''
            }, {
                name: tr("<b>Change bot name</b>"),
                icon: "client-change_nickname",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Change music bots nickname"), tr("New nickname:<br>"), text => text.length >= 3 && text.length <= 31, result => {
                        if(result) {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_nickname: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                },
                type: MenuEntryType.ENTRY
            }, {
                name: tr("Change bot description"),
                icon: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Change music bots description"), tr("New description:<br>"), text => true, result => {
                        if(typeof(result) === 'string') {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                },
                type: MenuEntryType.ENTRY
            },
            /*
            {
                name: tr("Open music panel"),
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            },
            */
            {
                name: tr("Open bot's playlist"),
                icon: "client-edit",
                disabled: false,
                callback: () => {
                    this.channelTree.client.serverConnection.command_helper.request_playlist_list().then(lists => {
                        for(const entry of lists) {
                            if(entry.playlist_id == this.properties.client_playlist_id) {
                                Modals.spawnPlaylistEdit(this.channelTree.client, entry);
                                return;
                            }
                        }
                        createErrorModal(tr("Invalid permissions"), tr("You dont have to see the bots playlist.")).open();
                    }).catch(error => {
                        createErrorModal(tr("Failed to query playlist."), tr("Failed to query playlist info.")).open();
                    });
                },
                type: MenuEntryType.ENTRY
            },
            {
                name: tr("Quick url replay"),
                icon: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Please enter the URL"), tr("URL:"), text => true, result => {
                        if(result) {
                            this.channelTree.client.serverConnection.send_command("musicbotqueueadd", {
                                bot_id: this.properties.client_database_id,
                                type: "yt", //Its a hint not a force!
                                url: result
                            }).catch(error => {
                                if(error instanceof CommandResult) {
                                    error = error.extra_message || error.message;
                                }
                                //TODO tr
                                createErrorModal(tr("Failed to replay url"), "Failed to enqueue url:<br>" + error).open();
                            });
                        }
                    }, { width: 400, maxLength: 255 }).open();
                },
                type: MenuEntryType.ENTRY
            },
            MenuEntry.HR(),
            ...super.assignment_context(),
            MenuEntry.HR(),{
                type: MenuEntryType.ENTRY,
                icon: "client-move_client_to_own_channel",
                name: tr("Move client to your channel"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    });
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_channel",
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            console.log(tr("Kicking client %o from channel with reason %o"), this.clientNickName(), result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            });
                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            },
            MenuEntry.HR(),
            {
                type: MenuEntryType.ENTRY,
                icon: "client-volume",
                name: tr("Change local volume"),
                callback: () => {
                    Modals.spawnChangeVolume(this._audio_handle.get_volume(), volume => {
                        this.channelTree.client.settings.changeServer("volume_client_" + this.clientUid(), volume);
                        this._audio_handle.set_volume(volume);
                        if(this.channelTree.client.select_info.currentSelected == this)
                            (<MusicInfoManager>this.channelTree.client.select_info.current_manager()).update_local_volume(volume);
                    });
                }
            },
            {
                type: MenuEntryType.ENTRY,
                icon: "client-volume",
                name: tr("Change remote volume"),
                callback: () => {
                    let max_volume = this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME).value;
                    if(max_volume < 0)
                        max_volume = 100;

                    Modals.spawnChangeRemoteVolume(this.properties.player_volume, max_volume / 100, value => {
                        if(typeof(value) !== "number")
                            return;

                        this.channelTree.client.serverConnection.send_command("clientedit", {
                            clid: this.clientId(),
                            player_volume: value,
                        }).then(() => {
                            if(this.channelTree.client.select_info.currentSelected == this)
                                (<MusicInfoManager>this.channelTree.client.select_info.current_manager()).update_remote_volume(value);
                        });
                    });
                }
            },
            MenuEntry.HR(),
            {
                name: tr("Delete bot"),
                icon: "client-delete",
                disabled: false,
                callback: () => {
                    const tag = $.spawn("div").append(MessageHelper.formatMessage(tr("Do you really want to delete {0}"), this.createChatTag(false)));
                    Modals.spawnYesNo(tr("Are you sure?"), $.spawn("div").append(tag), result => {
                       if(result) {
                           this.channelTree.client.serverConnection.send_command("musicbotdelete", {
                               bot_id: this.properties.client_database_id
                           });
                       }
                    });
                },
                type: MenuEntryType.ENTRY
            },
            MenuEntry.CLOSE(() => (trigger_close ? on_close : () => {})())
        );
    }

    initializeListener(): void {
        super.initializeListener();
    }

    handlePlayerInfo(json) {
        if(json) {
            let info = JSON.map_to(new MusicClientPlayerInfo(), json);
            if(this._info_promise_resolve)
                this._info_promise_resolve(info);
            this._info_promise_reject = undefined;
        }
        if(this._info_promise) {
            if(this._info_promise_reject)
                this._info_promise_reject("timeout");
            this._info_promise = undefined;
            this._info_promise_age = undefined;
            this._info_promise_reject = undefined;
            this._info_promise_resolve = undefined;
        }
    }

    requestPlayerInfo(max_age: number = 1000) : Promise<MusicClientPlayerInfo> {
        if(this._info_promise && this._info_promise_age && Date.now() - max_age <= this._info_promise_age) return this._info_promise;
        this._info_promise_age = Date.now();
        this._info_promise = new Promise<MusicClientPlayerInfo>((resolve, reject) => {
            this._info_promise_reject = reject;
            this._info_promise_resolve = resolve;
        });

        this.channelTree.client.serverConnection.send_command("musicbotplayerinfo", {bot_id: this.properties.client_database_id });
        return this._info_promise;
    }
}