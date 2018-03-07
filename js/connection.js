/// <reference path="ui/channel.ts" />
/// <reference path="client.ts" />
class CommandResult {
    constructor(json) {
        this.json = json;
        this.id = json["id"];
        this.message = json["msg"];
        this.extra_message = "";
        if (json["extra_msg"])
            this.extra_message = json["extra_msg"];
        this.success = this.id == 0;
    }
}
class ReturnListener {
}
class ServerConnection {
    constructor(client) {
        this._connectionState = ConnectionState.UNCONNECTED;
        this._connectTimeoutHandler = undefined;
        this.on_connect = () => {
            console.log("Client connected!");
            chat.serverChat().appendMessage("Client connected");
        };
        this.on_connected = () => { };
        this._client = client;
        this._socket = null;
        this.commandHandler = new ConnectionCommandHandler(this);
        this._retCodeIdx = 0;
        this._retListener = [];
    }
    generateReturnCode() {
        return (this._retCodeIdx++).toString();
    }
    startConnection(host, port, timeout = 1000) {
        if (this._connectTimeoutHandler) {
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            this.disconnect();
        }
        this.updateConnectionState(ConnectionState.CONNECTING);
        this._remoteHost = host;
        this._remotePort = port;
        const self = this;
        try {
            this._connectTimeoutHandler = setTimeout(() => {
                this.disconnect();
                this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
            }, timeout);
            this._socket = new WebSocket('ws:' + this._remoteHost + ":" + this._remotePort);
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            const _socketCpy = this._socket;
            this._socket.onopen = () => {
                if (this._socket != _socketCpy)
                    return;
                this.on_connect();
            };
            this._socket.onclose = event => {
                if (this._socket != _socketCpy)
                    return;
                this._client.handleDisconnect(DisconnectReason.CONNECTION_CLOSED, {
                    code: event.code,
                    reason: event.reason,
                    event: event
                });
            };
            this._socket.onerror = e => {
                if (this._socket != _socketCpy)
                    return;
                console.log("Got error: (" + self._socket.readyState + ")");
                console.log(e);
            };
            this._socket.onmessage = msg => {
                if (this._socket != _socketCpy)
                    return;
                self.handleWebSocketMessage(msg.data);
            };
            this.updateConnectionState(ConnectionState.INITIALISING);
        }
        catch (e) {
            this.disconnect();
            this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE, e);
        }
    }
    updateConnectionState(state) {
        this._connectionState = state;
    }
    disconnect() {
        if (this._connectionState == ConnectionState.UNCONNECTED)
            return false;
        this.updateConnectionState(ConnectionState.UNCONNECTED);
        if (this._socket)
            this._socket.close(3000 + 0xFF, "request disconnect");
        this._socket = null;
        for (let future of this._retListener)
            future.reject("Connection closed");
        this._retListener = [];
        this._retCodeIdx = 0;
        return true;
    }
    handleWebSocketMessage(data) {
        if (typeof (data) === "string") {
            let json;
            try {
                json = JSON.parse(data);
            }
            catch (e) {
                console.error("Could not parse message json!");
                alert(e); // error in the above string (in this case, yes)!
                return;
            }
            if (json["type"] === undefined) {
                console.log("Missing data type!");
                return;
            }
            if (json["type"] === "command")
                this.handleCommand(json);
            else if (json["type"] === "WebRTC")
                this._client.voiceConnection.handleControlPacket(json);
            else {
                console.log("Unknown command type " + json["type"]);
            }
        }
    }
    handleCommand(json) {
        console.log("Handling command '" + json["command"] + "'");
        let fn = this.commandHandler[json["command"]];
        if (fn === undefined) {
            console.log("Missing command '" + json["command"] + "'");
            return;
        }
        fn.call(this.commandHandler, json["data"]);
    }
    sendData(data) {
        this._socket.send(data);
    }
    sendCommand(command, data = {}, logResult = true) {
        const _this = this;
        let result = new Promise((resolve, failed) => {
            let _data = $.isArray(data) ? data : [data];
            let retCode = _data[0]["return_code"] !== undefined ? _data[0].return_code : _this.generateReturnCode();
            _data[0].return_code = retCode;
            let listener = new ReturnListener();
            listener.resolve = resolve;
            listener.reject = failed;
            listener.code = retCode;
            listener.timeout = setTimeout(() => {
                _this._retListener.remove(listener);
                listener.reject("timeout");
            }, 1500);
            this._retListener.push(listener);
            this._socket.send(JSON.stringify({
                "type": "command",
                "command": command,
                "data": _data
            }));
        });
        return new Promise((resolve, failed) => {
            result.then(resolve).catch(ex => {
                if (logResult) {
                    if (ex instanceof CommandResult) {
                        let res = ex;
                        if (!res.success) {
                            chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                        }
                    }
                    else if (typeof (ex) == "string") {
                        chat.serverChat().appendError("Command execution resuluts in " + ex);
                    }
                    else {
                        console.error("Invalid promise result type: " + typeof (ex) + ". Result:");
                        console.error(ex);
                    }
                }
                failed(ex);
            });
        });
    }
    get connected() {
        return this._socket && this._socket.readyState == WebSocket.OPEN;
    }
    /**
     *   HELPER METHODS
     */
    joinChannel(channel, password = "") {
        return this.sendCommand("clientmove", [{
                "clid": this._client.getClientId(),
                "cid": channel.getChannelId(),
                "cpw": password
            }]);
    }
    sendMessage(message, type, target) {
        if (type == ChatType.SERVER)
            return this.sendCommand("sendtextmessage", { "targetmode": 3, "target": 0, "msg": message });
        else if (type == ChatType.CHANNEL)
            return this.sendCommand("sendtextmessage", { "targetmode": 2, "target": target.getChannelId(), "msg": message });
        else if (type == ChatType.CLIENT)
            return this.sendCommand("sendtextmessage", { "targetmode": 1, "target": target.clientId(), "msg": message });
    }
    updateClient(key, value) {
        let data = {};
        data[key] = value;
        return this.sendCommand("clientupdate", data);
    }
}
class ConnectionCommandHandler {
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
        let code = json["return_code"];
        if (code.length == 0) {
            console.log("Invalid return code! (" + json + ")");
            return;
        }
        let retListeners = this.connection["_retListener"];
        for (let e of retListeners) {
            if (e.code != code)
                continue;
            retListeners.remove(e);
            let result = new CommandResult(json);
            if (result.success)
                e.resolve(result);
            else
                e.reject(result);
            break;
        }
    }
    handleCommandServerInit(json) {
        //We could setup the voice channel
        console.log("Setting up voice ");
        this.connection._client.voiceConnection.createSession();
        json = json[0]; //Only one bulk
        this.connection._client.clientId = json["aclid"];
        this.connection._client.getClient().updateVariable("client_nickname", json["acn"]);
        for (let key in json) {
            if (key === "aclid")
                continue;
            if (key === "acn")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        chat.serverChat().name = this.connection._client.channelTree.server.properties["virtualserver_name"];
        chat.serverChat().appendMessage("Connected as {0}", true, this.connection._client.getClient().createChatTag(true));
        this.connection.on_connected();
    }
    createChannelFromJson(json, ignoreOrder = false) {
        let tree = this.connection._client.channelTree;
        let channel = new ChannelEntry(json["cid"], json["channel_name"], tree.findChannel(json["cpid"]));
        tree.insertChannel(channel);
        if (json["channel_order"] !== "0") {
            let prev = tree.findChannel(json["channel_order"]);
            if (!prev && json["channel_order"] != 0) {
                if (!ignoreOrder) {
                    console.error("Invalid channel order id!");
                    return;
                }
            }
            let parent = tree.findChannel(json["cpid"]);
            if (!parent && json["cpid"] != 0) {
                console.error("Invalid channel parent");
                return;
            }
            tree.moveChannel(channel, prev, parent); //TODO test if channel exists!
        }
        if (ignoreOrder) {
            for (let ch of tree.channels) {
                if (ch.properties.channel_order == channel.channelId) {
                    tree.moveChannel(ch, channel, channel.parent); //Corrent the order :)
                }
            }
        }
        for (let key in json) {
            if (key === "cid")
                continue;
            if (key === "cpid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            channel.updateProperty(key, json[key]);
        }
    }
    handleCommandChannelList(json) {
        console.log("Got " + json.length + " new channels");
        for (let index = 0; index < json.length; index++)
            this.createChannelFromJson(json[index], true);
    }
    handleCommandChannelCreate(json) {
        this.createChannelFromJson(json[0]);
    }
    handleCommandChannelDelete(json) {
        let tree = this.connection._client.channelTree;
        console.log("Got " + json.length + " channel deletions");
        for (let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if (!channel) {
                console.error("Invalid channel onDelete (Unknown channel)");
                continue;
            }
            tree.deleteChannel(channel);
        }
    }
    handleCommandClientEnterView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client;
        let channel = tree.findChannel(json["ctid"]);
        let old_channel = tree.findChannel(json["cfid"]);
        client = tree.findClient(json["clid"]);
        if (!client) {
            client = new ClientEntry(json["clid"], json["client_nickname"]);
            client = tree.insertClient(client, channel);
        }
        else {
            if (client == this.connection._client.getClient())
                chat.channelChat().name = channel.channelName();
            tree.moveClient(client, channel);
        }
        if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if (old_channel) {
                chat.serverChat().appendMessage("{0} appeared from {1} to {2}", true, client.createChatTag(true), old_channel.createChatTag(true), channel.createChatTag(true));
            }
            else {
                chat.serverChat().appendMessage("{0} connected to channel {1}", true, client.createChatTag(true), channel.createChatTag(true));
            }
        }
        for (let key in json) {
            if (key == "cfid")
                continue;
            if (key == "ctid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            client.updateVariable(key, json[key]);
        }
    }
    handleCommandClientLeftView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        if (!client) {
            console.error("Unknown client left!");
            return 0;
        }
        if (client == this.connection._client.getClient()) {
            if (json["reasonid"] == ViewReasonId.VREASON_BAN)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_BANNED, json);
            else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK)
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_KICKED, json);
            else
                this.connection._client.handleDisconnect(DisconnectReason.UNKNOWN, json);
            return;
        }
        let channel_from = tree.findChannel(json["cfid"]);
        let channel_to = tree.findChannel(json["ctid"]);
        if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} disappeared from {1} to {2}", true, client.createChatTag(true), channel_from.createChatTag(true), channel_to.createChatTag(true));
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_LEFT) {
            chat.serverChat().appendMessage("{0} left the server ({1})", true, client.createChatTag(true), json["reasonmsg"]);
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
            chat.serverChat().appendError("{0} was kicked from the server by {1}. ({2})", client.createChatTag(true), ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]), json["reasonmsg"]);
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_BAN) {
            //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
            let duration = "permanently";
            if (json["bantime"])
                duration = "for " + formatDate(Number.parseInt(json["bantime"]));
            chat.serverChat().appendError("{0} was banned {1} by {2}. ({3})", client.createChatTag(true), duration, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]), json["reasonmsg"]);
        }
        else {
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
        if (!client) {
            console.error("Unknown client move (Client)!");
            return 0;
        }
        if (!channel_to) {
            console.error("Unknown client move (Channel to)!");
            return 0;
        }
        if (!channel_from)
            console.error("Unknown client move (Channel from)!");
        tree.moveClient(client, channel_to);
        if (client instanceof LocalClientEntry)
            chat.channelChat().name = channel_to.channelName();
        if (json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            chat.serverChat().appendMessage("{0} was moved from channel {1} to {2} by {3}", true, client.createChatTag(true), channel_from ? channel_from.createChatTag(true) : undefined, channel_to.createChatTag(true), ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]));
        }
        else if (json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage("{0} switched from channel {1} to {2}", true, client.createChatTag(true), channel_from ? channel_from.createChatTag(true) : undefined, channel_to.createChatTag(true));
        }
    }
    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk
        for (let key in json)
            console.log("Key: " + key + " Value: " + json[key]);
        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if (!channel) {
            console.error("Unknown channel move (Channel)!");
            return 0;
        }
        let prev = tree.findChannel(json["order"]);
        if (!prev && json["order"] != 0) {
            console.error("Unknown channel move (prev)!");
            return 0;
        }
        let parent = tree.findChannel(json["cpid"]);
        if (!parent && json["cpid"] != 0) {
            console.error("Unknown channel move (parent)!");
            return 0;
        }
        tree.moveChannel(channel, prev, parent);
    }
    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if (!channel) {
            console.error("Unknown channel edit (Channel)!");
            return 0;
        }
        for (let key in json) {
            if (key === "cid")
                continue;
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            channel.updateProperty(key, json[key]);
        }
    }
    handleNotifyTextMessage(json) {
        json = json[0]; //Only one bulk
        //TODO chat format?
        let mode = json["targetmode"];
        let invoker = this.connection._client.channelTree.findClient(json["invokerid"]);
        if (!invoker) {
            console.error("Invalid chat message!");
            return;
        }
        if (mode == 1) {
            if (invoker == this.connection._client.getClient()) {
                let target = this.connection._client.channelTree.findClient(json["target"]);
                target.chat(true).appendMessage("<< " + json["msg"]);
            }
            else {
                invoker.chat(true).appendMessage(">> " + json["msg"]);
            }
        }
        else if (mode == 2) {
            chat.channelChat().appendMessage("{0} >> " + json["msg"], true, invoker.createChatTag(true));
        }
        else if (mode == 3) {
            chat.serverChat().appendMessage("{0} >> " + json["msg"], true, invoker.createChatTag(true));
        }
    }
    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk
        let client = this.connection._client.channelTree.findClient(json["clid"]);
        if (!client) {
            console.error("Tried to update an non existing client");
            return;
        }
        for (let key in json) {
            if (key == "clid")
                continue;
            client.updateVariable(key, json[key]);
        }
        if (this.connection._client.selectInfo.currentSelected == client)
            this.connection._client.selectInfo.update();
    }
    handleNotifyServerEdited(json) {
        json = json[0];
        for (let key in json) {
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
    }
    handleNotifyServerUpdated(json) {
        json = json[0];
        for (let key in json) {
            if (key === "invokerid")
                continue;
            if (key === "invokername")
                continue;
            if (key === "invokeruid")
                continue;
            if (key === "reasonid")
                continue;
            this.connection._client.channelTree.server.updateProperty(key, json[key]);
        }
        let info = this.connection._client.selectInfo;
        if (info.currentSelected instanceof ServerEntry)
            info.update();
    }
}
//# sourceMappingURL=connection.js.map