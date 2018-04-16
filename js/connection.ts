/// <reference path="ui/channel.ts" />
/// <reference path="client.ts" />

class CommandResult {
    success: boolean;
    id: number;
    message: string;
    extra_message: string;

    json: any;

    constructor(json) {
        this.json = json;
        this.id = json["id"];
        this.message = json["msg"];

        this.extra_message = "";
        if(json["extra_msg"]) this.extra_message = json["extra_msg"];

        this.success = this.id == 0;
    }
}

class ReturnListener<T> {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    code: string;

    timeout: NodeJS.Timer;
}

class ServerConnection {
    _client: TSClient;
    _remoteHost: string;
    _remotePort: number;
    _socket: WebSocket;
    _connectionState: ConnectionState = ConnectionState.UNCONNECTED;
    _handshakeHandler: HandshakeHandler;
    commandHandler: ConnectionCommandHandler;

    private _connectTimeoutHandler: NodeJS.Timer = undefined;

    private _retCodeIdx: number;
    private _retListener: ReturnListener<CommandResult>[];

    constructor(client : TSClient) {
        this._client = client;

        this._socket = null;
        this.commandHandler = new ConnectionCommandHandler(this);
        this._retCodeIdx = 0;
        this._retListener = [];
    }

    on_connect: () => void = () => {
        console.log("Socket connected");
        chat.serverChat().appendMessage("Logging in...");
        this._handshakeHandler.startHandshake();
    };

    private generateReturnCode() : string {
        return (this._retCodeIdx++).toString();
    }

    startConnection(host : string, port : number, handshake: HandshakeHandler, timeout: number = 1000) {
        if(this._connectTimeoutHandler) {
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            this.disconnect();
        }
        this.updateConnectionState(ConnectionState.CONNECTING);
        this._remoteHost = host;
        this._remotePort = port;
        this._handshakeHandler = handshake;
        this._handshakeHandler.setConnection(this);
        chat.serverChat().appendMessage("Connecting to " + host + ":" + port);

        const self = this;
        try {
            this._connectTimeoutHandler = setTimeout(() => {
                this.disconnect();
                this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
            }, timeout);
            let sockCpy;
            this._socket = (sockCpy = new WebSocket('wss:' + this._remoteHost + ":" + this._remotePort));
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            if(this._socket != sockCpy) return; //Connect timeouted

            this._socket.onopen = () => {
                if(this._socket != sockCpy) return;
                this.on_connect();
            };

            this._socket.onclose = event => {
                if(this._socket != sockCpy) return;
                this._client.handleDisconnect(DisconnectReason.CONNECTION_CLOSED, {
                    code: event.code,
                    reason: event.reason,
                    event: event
                });
            };

            this._socket.onerror = e => {
                if(this._socket != sockCpy) return;
                console.log("Got error: (" + self._socket.readyState + ")");
                console.log(e);
            };

            this._socket.onmessage = msg => {
                if(this._socket != sockCpy) return;
                self.handleWebSocketMessage(msg.data);
            };
            this.updateConnectionState(ConnectionState.INITIALISING);
        } catch (e) {
            this.disconnect();
            this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE, e);
        }
    }

    updateConnectionState(state: ConnectionState) {
        this._connectionState = state;
    }

    disconnect() : boolean {
        if(this._connectionState == ConnectionState.UNCONNECTED) return false;
        this.updateConnectionState(ConnectionState.UNCONNECTED);

        if(this._socket) this._socket.close(3000 + 0xFF, "request disconnect");
        this._socket = null;
        for(let future of this._retListener)
            future.reject("Connection closed");
        this._retListener = [];
        this._retCodeIdx = 0;
        return true;
    }

    private handleWebSocketMessage(data) {
        if(typeof(data) === "string") {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {
                console.error("Could not parse message json!");
                alert(e); // error in the above string (in this case, yes)!
                return;
            }
            if(json["type"] === undefined) {
                console.log("Missing data type!");
                return;
            }
            if(json["type"] === "command") this.handleCommand(json);
            else if(json["type"] === "WebRTC") this._client.voiceConnection.handleControlPacket(json);
            else {
                console.log("Unknown command type " + json["type"]);
            }
        }
    }

    handleCommand(json) {
        let group = log.group(log.LogType.DEBUG, LogCategory.NETWORKING, "Handling command '%s'", json["command"]);
        group.log("Handling command '" + json["command"] + "'");
        group.group(log.LogType.TRACE, "Json:").collapsed(true).log("%o", json).end();

        try {
            let fn = this.commandHandler[json["command"]];
            if(fn === undefined) {
                group.log("Missing command '" + json["command"] + "'");
                return;
            }
            fn.call(this.commandHandler, json["data"]);
        } finally {
            group.end();
        }
    }

    sendData(data: any) { //TODO check stuff?
        this._socket.send(data);
    }

    private commandiefy(input: any) : string {
        return JSON.stringify(input, (key, value) => {
            switch (typeof value) {
                case "boolean": return value == true ? "1" : "0";
                case "function": return value();
                default:
                    return value;
            }
        });
    }

    sendCommand(command: string, data: any = {}, logResult: boolean = true) : Promise<CommandResult> {
        const _this = this;
        let result = new Promise<CommandResult>((resolve, failed) => {
            let _data = $.isArray(data) ? data : [data];
            let retCode = _data[0]["return_code"] !== undefined ? _data[0].return_code : _this.generateReturnCode();
            _data[0].return_code = retCode;

            let listener = new ReturnListener<CommandResult>();
            listener.resolve = resolve;
            listener.reject = failed;
            listener.code = retCode;
            listener.timeout = setTimeout(() => {
                _this._retListener.remove(listener);
                listener.reject("timeout");
            }, 1500);
            this._retListener.push(listener);

            this._socket.send(this.commandiefy({
                "type": "command",
                "command": command,
                "data": _data
            }));
        });
        return new Promise<CommandResult>((resolve, failed) => {
            result.then(resolve).catch(ex => {
                if(logResult) {
                    if(ex instanceof CommandResult) {
                        let res = ex;
                        if(!res.success) {
                            chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                        }
                    } else if(typeof(ex) == "string") {
                        chat.serverChat().appendError("Command execution resuluts in " + ex);
                    } else {
                        console.error("Invalid promise result type: " + typeof (ex) + ". Result:");
                        console.error(ex);
                    }
                }
                failed(ex);
            })
        });
    }

    get connected() : boolean {
        return this._socket && this._socket.readyState == WebSocket.OPEN;
    }

    /**
     *   HELPER METHODS
     */
    joinChannel(channel: ChannelEntry, password: string = "") : Promise<CommandResult> {
        return this.sendCommand("clientmove", [{
            "clid": this._client.getClientId(),
            "cid": channel.getChannelId(),
            "cpw": password
        }])
    }

    sendMessage(message: string, type: ChatType, target?: ChannelEntry | ClientEntry) : Promise<CommandResult> {
        if(type == ChatType.SERVER)
            return this.sendCommand("sendtextmessage", {"targetmode": 3, "target": 0, "msg": message});
        else if(type == ChatType.CHANNEL)
            return this.sendCommand("sendtextmessage", {"targetmode": 2, "target": (target as ChannelEntry).getChannelId(), "msg": message});
        else if(type == ChatType.CLIENT)
            return this.sendCommand("sendtextmessage", {"targetmode": 1, "target": (target as ClientEntry).clientId(), "msg": message});
    }

    updateClient(key: string, value: string) : Promise<CommandResult> {
        let data = {};
        data[key] = value;
        return this.sendCommand("clientupdate", data);
    }
}

class HandshakeHandler {
    readonly identity: Identity;
    readonly name?: string;
    private connection: ServerConnection;

    constructor(identity: Identity, name?: string) {
        this.identity = identity;
        this.name = name;
    }

    setConnection(con: ServerConnection) {
        this.connection = con;
        this.connection.commandHandler["handshakeidentityproof"] = this.handleCommandHandshakeIdentityProof.bind(this);
    }

    startHandshake() {
        let data: any = {
            intention: 0,
            authentication_method: this.identity.type()
        };
        if(this.identity.type() == IdentitifyType.TEAMSPEAK) {
            data.publicKey = (this.identity as TeamSpeakIdentity).publicKey();
        } else if(this.identity.type() == IdentitifyType.TEAFORO) {
            data.data = (this.identity as TeaForumIdentity).identityDataJson;
        }

        this.connection.sendCommand("handshakebegin", data).catch(error => {
            console.log(error);
            //TODO here
        });
    }

    private handleCommandHandshakeIdentityProof(json) {
        let proof: string;
        if(this.identity.type() == IdentitifyType.TEAMSPEAK) {
            proof = (this.identity as TeamSpeakIdentity).signMessage(json[0]["message"]);
        } else if(this.identity.type() == IdentitifyType.TEAFORO) {
            proof = (this.identity as TeaForumIdentity).identitySign;
        }
        this.connection.sendCommand("handshakeindentityproof", {proof: proof}).then(() => {
            this.connection.sendCommand("clientinit", {
                //TODO variables!
                client_nickname: this.name ? this.name : this.identity.name(),
                client_platform: navigator.platform,
                client_version: navigator.userAgent,
                client_browser_engine: navigator.product
            });
        }).catch(error => {
            console.error("Got login error");
            console.log(error);
        }); //TODO handle error
    }
}

class ConnectionCommandHandler {
    readonly connection: ServerConnection;

    constructor(connection) {
        this.connection = connection;
        this["error"] = this.handleCommandResult;
        this["channellist"] = this.handleCommandChannelList;
        this["notifychannelcreated"] = this.handleCommandChannelCreate;
        this["notifychanneldeleted"] = this.handleCommandChannelDelete;

        this["notifycliententerview"] = this.handleCommandClientEnterView;
        this["notifyclientleftview"] = this.handleCommandClientLeftView;
        this["notifyclientmoved"] = this.handleNotifyClientMoved;
        this["initserver"] = this.handleCommandServerInit;
        this["notifychannelmoved"] = this.handleNotifyChannelMoved;
        this["notifychanneledited"] = this.handleNotifyChannelEdited;
        this["notifytextmessage"] = this.handleNotifyTextMessage;
        this["notifyclientupdated"] = this.handleNotifyClientUpdated;
        this["notifyserveredited"] = this.handleNotifyServerEdited;
        this["notifyserverupdated"] = this.handleNotifyServerUpdated;
    }

    handleCommandResult(json) {
        json = json[0]; //Only one bulk

        let code : string = json["return_code"];
        if(code.length == 0) {
            console.log("Invalid return code! (" + json + ")");
            return;
        }
        let retListeners = this.connection["_retListener"];

        for(let e of retListeners) {
            if(e.code != code) continue;
            retListeners.remove(e);
            let result = new CommandResult(json);
            if(result.success)
                e.resolve(result);
            else
                e.reject(result);
            break;
        }
    }

    handleCommandServerInit(json){
        //We could setup the voice channel
        console.log("Setting up voice ");
        this.connection._client.voiceConnection.createSession();


        json = json[0]; //Only one bulk

        this.connection._client.clientId = parseInt(json["aclid"]);
        this.connection._client.getClient().updateVariables({key: "client_nickname", value: json["acn"]});

        for(let key in json) {
            if(key === "aclid") continue;
            if(key === "acn") continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        chat.serverChat().name = this.connection._client.channelTree.server.properties["virtualserver_name"];
        chat.serverChat().appendMessage("Connected as {0}", true, this.connection._client.getClient().createChatTag(true));
        globalClient.onConnected();
    }

    private createChannelFromJson(json, ignoreOrder: boolean = false) {
        let tree = this.connection._client.channelTree;

        let channel = new ChannelEntry(parseInt(json["cid"]), json["channel_name"], tree.findChannel(json["cpid"]));
        tree.insertChannel(channel);
        if(json["channel_order"] !== "0") {
            let prev = tree.findChannel(json["channel_order"]);
            if(!prev && json["channel_order"] != 0) {
                if(!ignoreOrder) {
                    console.error("Invalid channel order id!");
                    return;
                }
            }

            let parent = tree.findChannel(json["cpid"]);
            if(!parent && json["cpid"] != 0) {
                console.error("Invalid channel parent");
                return;
            }
            tree.moveChannel(channel, prev, parent); //TODO test if channel exists!
        }
        if(ignoreOrder) {
            for(let ch of tree.channels) {
                if(ch.properties.channel_order == channel.channelId) {
                    tree.moveChannel(ch, channel, channel.parent); //Corrent the order :)
                }
            }
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "cid") continue;
            if(key === "cpid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        channel.updateVariables(...updates);
    }

    handleCommandChannelList(json) {
        console.log("Got " + json.length + " new channels");
        for(let index = 0; index < json.length; index++)
            this.createChannelFromJson(json[index], true);
    }

    handleCommandChannelCreate(json) {
        this.createChannelFromJson(json[0]);
    }

    handleCommandChannelDelete(json) {
        let tree = this.connection._client.channelTree;

        console.log("Got " + json.length + " channel deletions");
        for(let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                console.error("Invalid channel onDelete (Unknown channel)");
                continue;
            }
            tree.deleteChannel(channel);
        }
    }

    handleCommandClientEnterView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;

        let client: ClientEntry;
        let channel = tree.findChannel(json["ctid"]);
        let old_channel = tree.findChannel(json["cfid"]);

        client = tree.findClient(json["clid"]);

        if(!client) {
            client = new ClientEntry(parseInt(json["clid"]), json["client_nickname"]);
            client = tree.insertClient(client, channel);
        } else {
            if(client == this.connection._client.getClient())
                chat.channelChat().name = channel.channelName();
            tree.moveClient(client, channel);
        }


        if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if(old_channel) {
                chat.serverChat().appendMessage("{0} appeared from {1} to {2}", true, client.createChatTag(true), old_channel.createChatTag(true), channel.createChatTag(true));
            } else {
                chat.serverChat().appendMessage("{0} connected to channel {1}", true, client.createChatTag(true), channel.createChatTag(true));
            }
        }

        let updates: {
            key: string,
            value: string
        }[] = [];

        for(let key in json) {
            if(key == "cfid") continue;
            if(key == "ctid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }

        client.updateVariables(...updates);
    }

    handleCommandClientLeftView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        if(!client) {
            console.error("Unknown client left!");
            return 0;
        }
        if(client == this.connection._client.getClient()) {
            if(json["reasonid"] == ViewReasonId.VREASON_BAN)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_BANNED, json);
            else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_KICKED, json);
            else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_SHUTDOWN)
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_STOPPED)
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            else
                this.connection._client.handleDisconnect(DisconnectReason.UNKNOWN, json);
            return;
        }

        let channel_from = tree.findChannel(json["cfid"]);
        let channel_to = tree.findChannel(json["ctid"]);


        if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} disappeared from {1} to {2}", true, client.createChatTag(true), channel_from.createChatTag(true), channel_to.createChatTag(true));
        } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_LEFT) {
            chat.serverChat().appendMessage("{0} left the server ({1})", true, client.createChatTag(true), json["reasonmsg"]);
        } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
            chat.serverChat().appendError("{0} was kicked from the server by {1}. ({2})",
                client.createChatTag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"]
            );
        } else if(json["reasonid"] == ViewReasonId.VREASON_BAN) {
            //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
            let duration = "permanently";
            if(json["bantime"])
                duration = "for " + formatDate(Number.parseInt(json["bantime"]));
            chat.serverChat().appendError("{0} was banned {1} by {2}. ({3})",
                client.createChatTag(true),
                duration,
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"]
            );
        } else {
            console.error("Unknown client left reason!");
        }

        tree.deleteClient(client);
    }

    handleNotifyClientMoved(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        let channel_to = tree.findChannel(json["ctid"]);
        let channel_from = tree.findChannel(json["cfid"]);

        if(!client) {
            console.error("Unknown client move (Client)!");
            return 0;
        }

        if(!channel_to) {
            console.error("Unknown client move (Channel to)!");
            return 0;
        }
        if(!channel_from) //Not critical
            console.error("Unknown client move (Channel from)!");

        if(client instanceof LocalClientEntry) {
            chat.channelChat().name = channel_to.channelName();
            for(let entry of client.channelTree.clientsByChannel(client.currentChannel()))
                if(entry !== client) entry.getAudioController().stopAudio(true);
        }
        tree.moveClient(client, channel_to);

        if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            chat.serverChat().appendMessage("{0} was moved from channel {1} to {2} by {3}", true,
                client.createChatTag(true),
                channel_from ? channel_from.createChatTag(true) : undefined,
                channel_to.createChatTag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"])
            );
        } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} switched from channel {1} to {2}", true,
                client.createChatTag(true),
                channel_from ? channel_from.createChatTag(true) : undefined,
                channel_to.createChatTag(true)
            );
        }
    }

    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk
        for(let key in json)
            console.log("Key: " + key + " Value: " + json[key]);

        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            console.error("Unknown channel move (Channel)!");
            return 0;
        }

        let prev = tree.findChannel(json["order"]);
        if(!prev && json["order"] != 0) {
            console.error("Unknown channel move (prev)!");
            return 0;
        }

        let parent = tree.findChannel(json["cpid"]);
        if(!parent && json["cpid"] != 0) {
            console.error("Unknown channel move (parent)!");
            return 0;
        }

        tree.moveChannel(channel, prev, parent);
    }

    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            console.error("Unknown channel edit (Channel)!");
            return 0;
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "cid") continue;
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;
            updates.push({key: key, value: json[key]});
        }
        channel.updateVariables(...updates);
    }

    handleNotifyTextMessage(json) {
        json = json[0]; //Only one bulk

        //TODO chat format?
        let mode = json["targetmode"];
        if(mode == 1){
            let invoker = this.connection._client.channelTree.findClient(json["invokerid"]);
            let target = this.connection._client.channelTree.findClient(json["target"]);
            if(!invoker) { //TODO spawn chat (Client is may invisible)
                console.error("Got private message from invalid client!");
                return;
            }
            if(!target) { //TODO spawn chat (Client is may invisible)
                console.error("Got private message from invalid client!");
                return;
            }
            if(invoker == this.connection._client.getClient()) {
                target.chat(true).appendMessage("<< " + json["msg"]);
            } else {
                invoker.chat(true).appendMessage(">> " + json["msg"]);
            }
        } else if(mode == 2) {
            chat.channelChat().appendMessage("{0} >> {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), json["msg"])
        } else if(mode == 3) {
            chat.serverChat().appendMessage("{0} >> {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), json["msg"]);
        }
    }

    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk

        let client = this.connection._client.channelTree.findClient(json["clid"]);
        if(!client) {
            console.error("Tried to update an non existing client");
            return;
        }

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key == "clid") continue;
            updates.push({key: key, value: json[key]});
        }
        client.updateVariables(...updates);
        if(this.connection._client.selectInfo.currentSelected == client)
            this.connection._client.selectInfo.update();
    }

    handleNotifyServerEdited(json) {
        json = json[0];

        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
    }

    handleNotifyServerUpdated(json) {
        json = json[0];

        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        let info = this.connection._client.selectInfo;
        if(info.currentSelected instanceof ServerEntry)
            info.update();
    }
}