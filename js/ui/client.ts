/// <reference path="channel.ts" />

class ClientEntry {
    private _clientId: number;
    private _channel: ChannelEntry;
    private _htmlTag: JQuery<HTMLElement>;

    properties: any = {
        client_nickname: "",
        client_unique_identifier: "",
        client_servergroups: "0",
        client_channel_group_id: "0",
        client_lastconnected: "0"
    };
    private lastVariableUpdate: number = 0;
    private _speaking: boolean = false;

    channelTree: ChannelTree;
    audioController: AudioController;

    constructor(clientId, clientName) {
        this._clientId = clientId;
        this.properties.client_nickname = clientName;
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
        this.htmlTag.click(event => {
            _this.channelTree.onSelect(_this);
        });
        this.htmlTag.on("contextmenu", function (event) {
            event.preventDefault();
            _this.channelTree.onSelect(_this);
            _this.showContextMenu(event.pageX, event.pageY, () => {
                _this.channelTree.onSelect(undefined);
            });
            return false;
        });
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
            MenuEntry.HR(),
            {
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
            },
            MenuEntry.CLOSE(on_close)
        );
    }

    get htmlTag() : JQuery<HTMLElement> {
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div")

        tag.attr("id", "client_" + this.clientId());
        tag.addClass("client");
        tag.append("<div class=\"icon_empty\"></div>");

        let clientIcon = $.spawn("div");
        clientIcon.addClass("icon_client_state");
        tag.append(clientIcon);

        tag.append("<div class='name'>" + this.clientNickName() + "</div>");
        tag.append("<div class='away'>" + this.clientNickName() + "</div>");

        let clientIcons = $.spawn("span");
        tag.append(clientIcons);

        return this._htmlTag = tag;
    }

    static chatTag(id: number, name: string, uid: string, braces: boolean = false) {
        let tag = $.spawn("div");

        tag.css("cursor", "pointer");
        tag.css("font-weight", "bold");
        tag.css("color", "darkblue");
        if(braces)
            tag.text("\"" + name + "\"");
        else
            tag.text(name);
        tag.attr("oncontextmenu", "chat_client_contextmenu(this, ...arguments);");
        tag.attr("clientId", id);
        tag.attr("clientUid", uid);
        tag.attr("clientName", name);
        return tag.wrap("<p/>").parent().html();
    }

    createChatTag(braces: boolean = false) : string {
        return ClientEntry.chatTag(this.clientId(), this.clientNickName(), this.clientUid(), braces);
    }

    set speaking(flag) {
        if(flag == this._speaking) return;
        this._speaking = flag;
        this.updateClientIcon();
    }

    updateClientIcon() {
        let icon: string = "";
        let clicon: string = "";
        if(this.properties.client_away == "1") {
            icon = "client-away";
        } else if(this.properties.client_output_muted == "1") {
            icon = "client-hardware_output_muted";
        } else if(this.properties.client_input_hardware == "0") {
            icon = "client-hardware_input_muted";
        } else if(this.properties.client_input_muted == "1") {
            icon = "client-input_muted";
        } else {
            if(this._speaking) {
                if(this.properties.client_is_channel_commander == 1)
                    clicon = "client_cc_talk";
                else
                    clicon = "client_talk";
            } else {
                if(this.properties.client_is_channel_commander == 1)
                    clicon = "client_cc_idle";
                else
                    clicon = "client_idle";
            }
        }
        if(clicon.length > 0)
            this.htmlTag.find(".icon_client_state").attr('class', 'icon_client_state clicon ' + clicon);
        else if(icon.length > 0)
            this.htmlTag.find(".icon_client_state").attr('class', 'icon_client_state icon ' + icon);
        else
            this.htmlTag.find(".icon_client_state").attr('class', 'icon_client_state icon_empty');
    }

    updateAwayMessage() {
        let tag = this.htmlTag.find(".away");
        if(this.properties.client_away == 1 && this.properties.client_away_message){
            tag.text("[" + this.properties.client_away_message + "]");
            tag.show();
        } else {
            tag.hide();
        }
    }

    updateVariable(key: string, value: string) {
        this.properties[key] = value;

        console.debug("Updating client " + this.clientId() + ". Key " + key + " Value: '" + value + "'")
        if(key == "client_nickname") {
            this.htmlTag.find(".name").text(value);
            let chat = this.chat(false);
            if(chat) chat.name = value;
        }
        if(key == "client_away" || key == "client_output_muted" || key == "client_input_hardware" || key == "client_input_muted" || key == "client_is_channel_commander"){
            this.updateClientIcon();
        }
        if(key == "client_away_message" || key == "client_away") {
            this.updateAwayMessage();
        }
    }

    updateVariables(){
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

    updateGroupIcon(group: Group) {
        //TODO group icon order
        this.htmlTag.find(".icon_group_" + group.id).detach();

        if(group.properties.iconid > 0){
            this.htmlTag.find("span").append(this.channelTree.client.fileManager.icons.generateTag(group.properties.iconid).addClass("icon_group_" + group.id));
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
        return Number.parseInt(this.properties.client_channel_group_id);
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
        return new Date().getTime() / 1000 - Number.parseInt(this.properties.client_lastconnected);
    }
}

class LocalClientEntry extends ClientEntry {
    handle: TSClient;

    private renaming: boolean;

    constructor(handle: TSClient) {
        super(0, "local client");
        this.handle = handle;
    }


    updateVariable(key: string, value: string): void {
        super.updateVariable(key, value);
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
        this.htmlTag.find(".name").addClass("own_name");

        const _self = this;
        this.htmlTag.dblclick(function () {
            _self.openRename();
        });
    }

    openRename() : void {
        const _self = this;

        const elm = this.htmlTag.find(".name");
        elm.attr("contenteditable", "true");
        elm.removeClass("own_name");
        elm.css("background-color", "white");
        elm.focus();
        _self.renaming = true;

        elm.keypress(function (e) {
            if(e.keyCode == Key.Enter) {
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
//Global functions
function chat_client_contextmenu(_element: any, event: any) {
    event.preventDefault();

    let element = $(_element);
    console.log("Context menue for " + element.attr("clientName"));
    let clid : number = Number.parseInt(element.attr("clientId"));
    let client = globalClient.channelTree.findClient(clid);
    if(!client) {
        //TODO
        return;
    }
    if(client.clientUid() != element.attr("clientUid")) {
        //TODO
        return;
    }

    client.showContextMenu(event.pageX, event.pageY);
}