/// <reference path="channel.ts" />
/// <reference path="modal/ModalChangeVolume.ts" />

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

    channelTree: ChannelTree;
    audioController: AudioController;

    constructor(clientId, clientName, properties: ClientProperties = new ClientProperties()) {
        this._properties = properties;
        this._properties.client_nickname = clientName;
        this._clientId = clientId;
        this.channelTree = null;
        this._channel = null;
        this.audioController = new AudioController();

        const _this = this;
        this.audioController.onSpeaking = function () {
            _this.speaking = true;
        };

        this.audioController.onSilence = function () {
            _this.speaking = false;
        };
        this.audioController.initialize();
    }

    get properties() : ClientProperties {
        return this._properties;
    }

    currentChannel() { return this._channel; }
    clientNickName(){ return this.properties.client_nickname; }
    clientUid(){ return this.properties.client_unique_identifier; }
    clientId(){ return this._clientId; }

    getAudioController() : AudioController {
        return this.audioController;
    }

    initializeListener(){
        const _this = this;
        this.tag.click(event => {
            _this.channelTree.onSelect(_this);
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.tag.on("contextmenu", function (event) {
                event.preventDefault();
                _this.channelTree.onSelect(_this);
                _this.showContextMenu(event.pageX, event.pageY, () => {
                    _this.channelTree.onSelect(undefined);
                });
                return false;
            });
        }
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        const _this = this;

        spawnMenu(x, y,
            {
                type: MenuEntryType.ENTRY,
                icon: "client-change_nickname",
                name: "<b>Open text chat</b>",
                callback: function () {
                    chat.activeChat = _this.chat(true);
                    chat.focus();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-poke",
                name: "Poke client",
                callback: function () {
                    createInputModal("Poke client", "Poke message:<br>", text => true, result => {
                        if(result) {
                            console.log("Poking client " + _this.clientNickName() + " with message " + result);
                            _this.channelTree.client.serverConnection.sendCommand("clientpoke", {
                                clid: _this.clientId(),
                                msg: result
                            });

                        }
                    }, { width: 400, maxLength: 512 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-edit",
                name: "Change description",
                callback: function () {
                    createInputModal("Change client description", "New description:<br>", text => true, result => {
                        if(result) {
                            console.log("Changing " + _this.clientNickName() + "'s description to " + result);
                            _this.channelTree.client.serverConnection.sendCommand("clientedit", {
                                clid: _this.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                }
            },
            MenuEntry.HR(), {
                type: MenuEntryType.ENTRY,
                icon: "client-move_client_to_own_channel",
                name: "Move client to your channel",
                callback: () => {
                    this.channelTree.client.serverConnection.sendCommand("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    });
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_channel",
                name: "Kick client from channel",
                callback: function () {
                    createInputModal("Kick client from channel", "Kick reason:<br>", text => true, result => {
                        if(result) {
                            console.log("Kicking client " + _this.clientNickName() + " from channel with reason " + result);
                            _this.channelTree.client.serverConnection.sendCommand("clientkick", {
                                clid: _this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_server",
                name: "Kick client fom server",
                callback: function () {
                    createInputModal("Kick client from server", "Kick reason:<br>", text => true, result => {
                        if(result) {
                            console.log("Kicking client " + _this.clientNickName() + " from server with reason " + result);
                            _this.channelTree.client.serverConnection.sendCommand("clientkick", {
                                clid: _this.clientId(),
                                reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: MenuEntryType.ENTRY,
                icon: "client-ban_client",
                name: "Ban client",
                invalidPermission: !this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                callback: () => {
                    Modals.spawnBanClient(this.properties.client_nickname, (duration, reason) => {
                        this.channelTree.client.serverConnection.sendCommand("banclient", {
                            uid: this.properties.client_unique_identifier,
                            banreason: reason,
                            time: duration
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
                        this.channelTree.client.serverConnection.sendCommand("banclient", {
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
                name: "Change Volume",
                callback: () => {
                    Modals.spawnChangeVolume(this.audioController.volume, volume => {
                        settings.changeServer("volume_client_" + this.clientUid(), volume);
                        this.audioController.volume = volume;
                        if(globalClient.selectInfo.currentSelected == this)
                            globalClient.selectInfo.update();
                    });
                }
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    get tag() : JQuery<HTMLElement> {
        if(this._tag) return this._tag;

        let tag = $.spawn("div");

        tag.attr("id", "client_" + this.clientId());
        tag.addClass("client");
        tag.append($.spawn("div").addClass("icon_empty"));

        tag.append($.spawn("div").addClass("icon_client_state").attr("title", "Client state"));

        tag.append($.spawn("div").addClass("name").text(this.clientNickName()));
        tag.append($.spawn("div").addClass("away").text(this.clientNickName()));

        let clientIcons = $.spawn("span");
        clientIcons.append($.spawn("div").addClass("icon icon_talk_power client-input_muted").hide());
        clientIcons.append($.spawn("span").addClass("group_icons"));
        clientIcons.append($.spawn("span").addClass("client_icon"));
        tag.append(clientIcons);

        return this._tag = tag;
    }

    static chatTag(id: number, name: string, uid: string, braces: boolean = false) : JQuery {
        let tag = $.spawn("div");

        tag.css("cursor", "pointer")
            .css("font-weight", "bold")
            .css("color", "darkblue")
            .css("display", "inline-block")
            .css("margin", 0);

        if(braces)
            tag.text("\"" + name + "\"");
        else
            tag.text(name);

        tag.contextmenu(event => {
            if(event.isDefaultPrevented()) return;

            event.preventDefault();
            let client = globalClient.channelTree.findClient(id);
            if(!client) return;
            if(client.properties.client_unique_identifier != uid) return;
            client.showContextMenu(event.pageX, event.pageY);
        });
        tag.attr("clientId", id);
        tag.attr("clientUid", uid);
        tag.attr("clientName", name);
        return tag;
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
            this.tag.find("span").find(".icon_talk_power").hide();
        else
            this.tag.find("span").find(".icon_talk_power").show();
    }

    updateClientSpeakIcon() {
        let icon: string = "";
        let clicon: string = "";
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
        if(clicon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state clicon ' + clicon);
        else if(icon.length > 0)
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon ' + icon);
        else
            this.tag.find(".icon_client_state").attr('class', 'icon_client_state icon_empty');
    }

    updateAwayMessage() {
        let tag = this.tag.find(".away");
        if(this.properties.client_away == true && this.properties.client_away_message){
            tag.text("[" + this.properties.client_away_message + "]");
            tag.show();
        } else {
            tag.hide();
        }
    }

    updateVariables(...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.CLIENT, "Update properties (%i) of %s (%i)", variables.length, this.clientNickName(), this.clientId());

        let update_status_icon = false;
        for(let variable of variables) {
            JSON.map_field_to(this._properties, variable.value, variable.key);

            group.log("Updating client " + this.clientId() + ". Key " + variable.key + " Value: '" + variable.value + "' (" + typeof (this.properties[variable.key]) + ")");
            if(variable.key == "client_nickname") {
                this.tag.find(".name").text(variable.value);
                let chat = this.chat(false);
                if(chat) chat.name = variable.value;
                if(this._channel)
                    this._channel.reorderClients();
            }
            if(variable.key == "client_away" || variable.key == "client_output_muted" || variable.key == "client_input_hardware" || variable.key == "client_input_muted" || variable.key == "client_is_channel_commander"){
                this.updateClientSpeakIcon();
            }
            if(variable.key == "client_away_message" || variable.key == "client_away") {
                this.updateAwayMessage();
            }
            if(variable.key == "client_unique_identifier") {
                this.audioController.volume = parseFloat(settings.server("volume_client_" + this.clientUid(), "1"));
                console.error("Updated volume from config " + this.audioController.volume + " - " + "volume_client_" + this.clientUid() + " - " + settings.server("volume_client_" + this.clientUid(), "1"));
                console.log(this.avatarId());
            }
            if(variable.key == "client_talk_power") {
                if(this._channel) {
                    this._channel.reorderClients();
                    this.updateClientStatusIcons();
                }

            }
            if(variable.key == "client_icon_id")
                this.updateClientIcon();
        }

        group.end();
    }

    updateClientVariables(){
        if(this.lastVariableUpdate == 0 || new Date().getTime() - 10 * 60 * 1000 > this.lastVariableUpdate){ //Cache these only 10 min
            this.lastVariableUpdate = new Date().getTime();
            this.channelTree.client.serverConnection.sendCommand("clientgetvariables", {clid: this.clientId()});
        }
    }

    chat(create: boolean = false) : ChatEntry {
        let chatName = "client_" + this.clientUid() + ":" + this.clientId();
        let c = chat.findChat(chatName);
        if((!c) && create) {
            c = chat.createChat(chatName);
            c.closeable = true;
            c.name = this.clientNickName();

            const _this = this;
            c.onMessageSend = function (text: string) {
                _this.channelTree.client.serverConnection.sendMessage(text, ChatType.CLIENT, _this);
            };

            c.onClose = function () : boolean {
                //TODO check online?
                _this.channelTree.client.serverConnection.sendCommand("clientchatclosed", {"clid": _this.clientId()});
                return true;
            }
        }
        return c;
    }

    updateClientIcon() {
        this.tag.find("span .client_icon").children().detach();
        if(this.properties.client_icon_id > 0) {
            this.channelTree.client.fileManager.icons.generateTag(this.properties.client_icon_id).attr("title", "Client icon")
                .appendTo(this.tag.find("span .client_icon"));
        }
    }

    updateGroupIcon(group: Group) {
        //TODO group icon order
        this.tag.find(".group_icons .icon_group_" + group.id).detach();

        if (group.properties.iconid > 0) {
            this.tag.find("span .group_icons").append(
                $.spawn("div").addClass("icon_group_" + group.id).append(this.channelTree.client.fileManager.icons.generateTag(group.properties.iconid)).attr("title", group.name)
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

    onDelete() {
        this.audioController.close();
        this.audioController = undefined;
    }

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
}

class LocalClientEntry extends ClientEntry {
    handle: TSClient;

    private renaming: boolean;

    constructor(handle: TSClient) {
        super(0, "local client");
        this.handle = handle;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        const _self = this;

        spawnMenu(x, y,
            {
                name: "<b>Change name</b>",
                icon: "client-change_nickname",
                callback: () =>_self.openRename(),
                type: MenuEntryType.ENTRY
            }, {
                name: "Change description",
                icon: "client-edit",
                callback: () => {
                    createInputModal("Change own description", "New description:<br>", text => true, result => {
                        if(result) {
                            console.log("Changing own description to " + result);
                            _self.channelTree.client.serverConnection.sendCommand("clientedit", {
                                clid: _self.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                },
                type: MenuEntryType.ENTRY
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    initializeListener(): void {
        super.initializeListener();
        this.tag.find(".name").addClass("own_name");

        const _self = this;
        this.tag.dblclick(function () {
            _self.openRename();
        });
    }

    openRename() : void {
        const _self = this;

        const elm = this.tag.find(".name");
        elm.attr("contenteditable", "true");
        elm.removeClass("own_name");
        elm.css("background-color", "white");
        elm.focus();
        _self.renaming = true;

        elm.keypress(function (e) {
            if(e.keyCode == JQuery.Key.Enter) {
                $(this).trigger("focusout");
                return false;
            }
        });

        elm.focusout(function (e) {
            if(!_self.renaming) return;
            _self.renaming = false;

            elm.css("background-color", "");
            elm.removeAttr("contenteditable");
            elm.addClass("own_name");
            let text = elm.text().toString();
            if(_self.clientNickName() == text) return;

            elm.text(_self.clientNickName());
            _self.handle.serverConnection.updateClient("client_nickname", text).then((e) => {
                chat.serverChat().appendMessage("Nickname successfully changed");
            }).catch((e: CommandResult) => {
                chat.serverChat().appendError("Could not change nickname (" + e.extra_message + ")");
                _self.openRename();
            });
        });
    }
}

class MusicClientProperties extends ClientProperties {
    player_state: number = 0;
    player_volume: number = 0;
}

class MusicClientPlayerInfo {
    botid: number = 0;
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
        spawnMenu(x, y,
            {
                name: "<b>Change bot name</b>",
                icon: "client-change_nickname",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            }, {
                name: "Change bot description",
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            }, {
                name: "Open music panel",
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            },
            MenuEntry.HR(),
            {
                name: "Delete bot",
                icon: "client-delete",
                disabled: true,
                callback: () => {
                   //TODO
                },
                type: MenuEntryType.ENTRY
            },
            MenuEntry.CLOSE(on_close)
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

        this.channelTree.client.serverConnection.sendCommand("musicbotplayerinfo", {botid: this.properties.client_database_id });
        return this._info_promise;
    }
}