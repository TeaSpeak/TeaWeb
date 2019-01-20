/// <reference path="ui/channel.ts" />
/// <reference path="client.ts" />
/// <reference path="sound/Sounds.ts" />
/// <reference path="ui/modal/ModalPoke.ts" />

import noExitRuntime = Module.noExitRuntime;

enum ErrorID {
    PERMISSION_ERROR = 2568,
    EMPTY_RESULT = 0x0501,
    PLAYLIST_IS_IN_USE = 0x2103
}

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
    _remote_address: ServerAddress;
    _socket: WebSocket;
    _connectionState: ConnectionState = ConnectionState.UNCONNECTED;
    _handshakeHandler: HandshakeHandler;
    commandHandler: ConnectionCommandHandler;

    readonly helper: CommandHelper;
    private _connectTimeoutHandler: NodeJS.Timer = undefined;
    private _connected: boolean = false;
    private _retCodeIdx: number;
    private _retListener: ReturnListener<CommandResult>[];

    constructor(client : TSClient) {
        this._client = client;

        this._socket = null;
        this.commandHandler = new ConnectionCommandHandler(this);
        this.helper = new CommandHelper(this);
        this._retCodeIdx = 0;
        this._retListener = [];
    }

    on_connect: () => void = () => {
        console.log(tr("Socket connected"));
        chat.serverChat().appendMessage(tr("Logging in..."));
        this._handshakeHandler.startHandshake();
    };

    private generateReturnCode() : string {
        return (this._retCodeIdx++).toString();
    }

    startConnection(address : ServerAddress, handshake: HandshakeHandler, timeout: number = 1000) {
        if(this._connectTimeoutHandler) {
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            this.disconnect();
        }
        this.updateConnectionState(ConnectionState.CONNECTING);
        this._remote_address = address;
        this._handshakeHandler = handshake;
        this._handshakeHandler.setConnection(this);
        this._connected = false;
        chat.serverChat().appendMessage(tr("Connecting to {0}:{1}"), true, address.host, address.port);

        const self = this;
        try {
            this._connectTimeoutHandler = setTimeout(() => {
                console.log(tr("Connect timeout triggered!"));
                this.disconnect();
                this._client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
            }, timeout);
            let sockCpy;
            this._socket = (sockCpy = new WebSocket('wss://' + address.host + ":" + address.port));
            clearTimeout(this._connectTimeoutHandler);
            this._connectTimeoutHandler = null;
            if(this._socket != sockCpy) return; //Connect timeouted

            this._socket.onopen = () => {
                if(this._socket != sockCpy) return;
                this._connected = true;
                this.on_connect();
            };

            this._socket.onclose = event => {
                if(this._socket != sockCpy) return;
                this._client.handleDisconnect(this._connected ? DisconnectReason.CONNECTION_CLOSED : DisconnectReason.CONNECT_FAILURE, {
                    code: event.code,
                    reason: event.reason,
                    event: event
                });
            };

            this._socket.onerror = e => {
                if(this._socket != sockCpy) return;
                console.log(tr("Got error: (%s)"), self._socket.readyState);
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
        this._client.controlBar.update_connection_state();
    }

    disconnect() : boolean {
        if(this._connectionState == ConnectionState.UNCONNECTED) return false;
        this.updateConnectionState(ConnectionState.UNCONNECTED);

        if(this._socket) this._socket.close(3000 + 0xFF, tr("request disconnect"));
        this._socket = null;
        for(let future of this._retListener)
            future.reject(tr("Connection closed"));
        this._retListener = [];
        this._retCodeIdx = 0;
        this._connected = false;
        return true;
    }

    private handleWebSocketMessage(data) {
        if(typeof(data) === "string") {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {
                console.error(tr("Could not parse message json!"));
                alert(e); // error in the above string (in this case, yes)!
                return;
            }
            if(json["type"] === undefined) {
                console.log(tr("Missing data type!"));
                return;
            }
            if(json["type"] === "command") this.handleCommand(json);
            else if(json["type"] === "WebRTC") this._client.voiceConnection.handleControlPacket(json);
            else {
                console.log(tr("Unknown command type %o"), json["type"]);
            }
        }
    }

    handleCommand(json) {
        let group = log.group(log.LogType.DEBUG, LogCategory.NETWORKING, tr("Handling command '%s'"), json["command"]);
        group.log(tr("Handling command '%s'"), json["command"]);
        group.group(log.LogType.TRACE, tr("Json:")).collapsed(true).log("%o", json).end();

        try {
            let fn = this.commandHandler[json["command"]];
            if(fn === undefined) {
                group.log(tr("Missing command '%s'"), json["command"]);
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

    sendCommand(command: string, data: any = {}, flags: string[] = [], logResult: boolean = true) : Promise<CommandResult> {
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
                "data": _data,
                "flags": flags.filter(entry => entry.length != 0)
            }));
        });
        return new Promise<CommandResult>((resolve, failed) => {
            result.then(resolve).catch(ex => {
                if(logResult) {
                    if(ex instanceof CommandResult) {
                        let res = ex;
                        if(!res.success) {
                            if(res.id == 2568) { //Permission error
                                res.message = tr("Insufficient client permissions. Failed on permission ") + this._client.permissions.resolveInfo(res.json["failed_permid"] as number).name;
                                chat.serverChat().appendError(tr("Insufficient client permissions. Failed on permission {}"), this._client.permissions.resolveInfo(res.json["failed_permid"] as number).name);
                                sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                            } else {
                                chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                            }
                        }
                    } else if(typeof(ex) === "string") {
                        chat.serverChat().appendError(tr("Command execution results in ") + ex);
                    } else {
                        console.error(tr("Invalid promise result type: %o. Result:"), typeof (ex));
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

interface HandshakeIdentityHandler {
    connection: ServerConnection;

    start_handshake();
    register_callback(callback: (success: boolean, message?: string) => any);
}

class HandshakeHandler {
    private connection: ServerConnection;
    private handshake_handler: HandshakeIdentityHandler;

    readonly profile: profiles.ConnectionProfile;
    readonly name: string;
    readonly server_password: string;

    constructor(profile: profiles.ConnectionProfile, name: string, password: string) {
        this.profile = profile;
        this.server_password = password;
        this.name = name;
    }

    setConnection(con: ServerConnection) {
        this.connection = con;
    }

    startHandshake() {
        this.handshake_handler = this.profile.spawn_identity_handshake_handler(this.connection);
        if(!this.handshake_handler) {
            this.handshake_failed("failed to create identity handler");
            return;
        }

        this.handshake_handler.register_callback((flag, message) => {
            if(flag)
                this.handshake_finished();
            else
                this.handshake_failed(message);
        });

        this.handshake_handler.start_handshake();
    }

    private handshake_failed(message: string) {
        this.connection._client.handleDisconnect(DisconnectReason.HANDSHAKE_FAILED, message);
    }

    private handshake_finished(version?: string) {
        if(native_client && window["native"] && native.client_version && !version) {
            native.client_version()
                .then( this.handshake_finished.bind(this))
                .catch(error => {
                    console.error(tr("Failed to get version:"));
                    console.error(error);
                    this.handshake_finished("?.?.?");
                });
            return;
        }

        const git_version = settings.static_global("version", "unknown");
        const browser_name = (navigator.browserSpecs || {})["name"] || " ";
        let data = {
            //TODO variables!
            client_nickname: this.name,
            client_platform: (browser_name ? browser_name + " " : "") + navigator.platform,
            client_version: "TeaWeb " + git_version + " (" + navigator.userAgent + ")",

            client_server_password: this.server_password,
            client_browser_engine: navigator.product
        };

        if(version) {
            data.client_version = "TeaClient ";
            data.client_version += " " + version;

            const os = require("os");
            const arch_mapping = {
                "x32": "32bit",
                "x64": "64bit"
            };

            data.client_version += " " + (arch_mapping[os.arch()] || os.arch());

            const os_mapping = {
                "win32": "Windows",
                "linux": "Linux"
            };
            data.client_platform = (os_mapping[os.platform()] || os.platform());
        }

        this.connection.sendCommand("clientinit", data).catch(error => {
            this.connection.disconnect();
            if(error instanceof CommandResult) {
                if(error.id == 1028) {
                    this.connection._client.handleDisconnect(DisconnectReason.SERVER_REQUIRES_PASSWORD);
                } else {

                    this.connection._client.handleDisconnect(DisconnectReason.CLIENT_KICKED, error);
                }
            }
        });
    }
}

interface ClientNameInfo {
    //cluid=tYzKUryn\/\/Y8VBMf8PHUT6B1eiE= name=Exp clname=Exp cldbid=9
    client_unique_id: string;
    client_nickname: string;
    client_database_id: number;
}

interface ClientNameFromUid {
    promise: LaterPromise<ClientNameInfo[]>,
    keys: string[],
    response: ClientNameInfo[]
}

interface QueryListEntry {
    username: string;
    unique_id: string;
    bounded_server: number;
}

interface QueryList {
    flag_own: boolean;
    flag_all: boolean;

    queries: QueryListEntry[];
}

interface Playlist {
    playlist_id: number;
    playlist_bot_id: number;
    playlist_title: string;
    playlist_type: number;
    playlist_owner_dbid: number;
    playlist_owner_name: string;

    needed_power_modify: number;
    needed_power_permission_modify: number;
    needed_power_delete: number;
    needed_power_song_add: number;
    needed_power_song_move: number;
    needed_power_song_remove: number;
}

interface PlaylistInfo {
    playlist_id: number,
    playlist_title: string,
    playlist_description: string,
    playlist_type: number,

    playlist_owner_dbid: number,
    playlist_owner_name: string,

    playlist_flag_delete_played: boolean,
    playlist_flag_finished: boolean,
    playlist_replay_mode: number,
    playlist_current_song_id: number,
}

interface PlaylistSong {
    song_id: number;
    song_previous_song_id: number;
    song_invoker: string;
    song_url: string;
    song_url_loader: string;
    song_loaded: boolean;
    song_metadata: string;
}

class CommandHelper {
    readonly connection: ServerConnection;

    private _callbacks_namefromuid: ClientNameFromUid[] = [];
    private _who_am_i: any;

    constructor(connection) {
        this.connection = connection;
        this.connection.commandHandler["notifyclientnamefromuid"] = this.handle_notifyclientnamefromuid.bind(this);
    }

    info_from_uid(...uid: string[]) : Promise<ClientNameInfo[]> {
        let uids = [...uid];
        for(let p of this._callbacks_namefromuid)
            if(p.keys == uids) return p.promise;

        let req: ClientNameFromUid = {} as any;
        req.keys = uids;
        req.response = new Array(uids.length);
        req.promise = new LaterPromise<ClientNameInfo[]>();

        for(let uid of uids) {
            this.connection.sendCommand("clientgetnamefromuid", {
                cluid: uid
            }).catch(req.promise.function_rejected());
        }

        this._callbacks_namefromuid.push(req);
        return req.promise;
    }

    request_query_list(server_id: number = undefined) : Promise<QueryList> {
        return new Promise<QueryList>((resolve, reject) => {
            this.connection.commandHandler["notifyquerylist"] = json => {
                const result = {} as QueryList;

                result.flag_all = json[0]["flag_all"];
                result.flag_own = json[0]["flag_own"];
                result.queries = [];

                for(const entry of json) {
                    const rentry = {} as QueryListEntry;
                    rentry.bounded_server = entry["client_bounded_server"];
                    rentry.username = entry["client_login_name"];
                    rentry.unique_id = entry["client_unique_identifier"];

                    result.queries.push(rentry);
                }

                resolve(result);
                this.connection.commandHandler["notifyquerylist"] = undefined;
            };

            let data = {};
            if(server_id !== undefined)
                data["server_id"] = server_id;

            this.connection.sendCommand("querylist", data).catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id == ErrorID.EMPTY_RESULT) {
                        resolve(undefined);
                        this.connection.commandHandler["notifyquerylist"] = undefined;
                        return;
                    }
                }
                reject(error);
            })
        });
    }

    request_playlist_list() : Promise<Playlist[]> {
        return new Promise((resolve, reject) => {
            const notify_handler = json => {
                const result: Playlist[] = [];

                for(const entry of json) {
                    try {
                        result.push({
                            playlist_id: parseInt(entry["playlist_id"]),
                            playlist_bot_id: parseInt(entry["playlist_bot_id"]),
                            playlist_title: entry["playlist_title"],
                            playlist_type: parseInt(entry["playlist_type"]),
                            playlist_owner_dbid: parseInt(entry["playlist_owner_dbid"]),
                            playlist_owner_name: entry["playlist_owner_name"],

                            needed_power_modify: parseInt(entry["needed_power_modify"]),
                            needed_power_permission_modify: parseInt(entry["needed_power_permission_modify"]),
                            needed_power_delete: parseInt(entry["needed_power_delete"]),
                            needed_power_song_add: parseInt(entry["needed_power_song_add"]),
                            needed_power_song_move: parseInt(entry["needed_power_song_move"]),
                            needed_power_song_remove: parseInt(entry["needed_power_song_remove"])
                        });
                    } catch(error) {
                        log.error(LogCategory.NETWORKING, tr("Failed to parse playlist entry: %o"), error);
                    }
                }

                this.connection.commandHandler.unset_handler("notifyplaylistlist", notify_handler);
                resolve(result);
            };

            this.connection.commandHandler.set_handler("notifyplaylistlist", notify_handler);
            this.connection.sendCommand("playlistlist").catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id == ErrorID.EMPTY_RESULT) {
                        this.connection.commandHandler.unset_handler("notifyplaylistlist", notify_handler);
                        resolve([]);
                        return;
                    }
                }
                reject(error);
            })
        });
    }

    request_playlist_songs(playlist_id: number) : Promise<PlaylistSong[]> {
        return new Promise((resolve, reject) => {
            const notify_handler = json => {
                if(json[0]["playlist_id"] != playlist_id) {
                    log.error(LogCategory.NETWORKING, tr("Received invalid notification for playlist songs"));
                    return;
                }

                const result: PlaylistSong[] = [];

                for(const entry of json) {
                    try {
                        result.push({
                            song_id: parseInt(entry["song_id"]),
                            song_invoker: entry["song_invoker"],
                            song_previous_song_id: parseInt(entry["song_previous_song_id"]),
                            song_url: entry["song_url"],
                            song_url_loader: entry["song_url_loader"],

                            song_loaded: entry["song_loaded"] == true || entry["song_loaded"] == "1",
                            song_metadata: entry["song_metadata"]
                        });
                    } catch(error) {
                        log.error(LogCategory.NETWORKING, tr("Failed to parse playlist song entry: %o"), error);
                    }
                }

                this.connection.commandHandler.unset_handler("notifyplaylistsonglist", notify_handler);
                resolve(result);
            };

            this.connection.commandHandler.set_handler("notifyplaylistsonglist", notify_handler);
            this.connection.sendCommand("playlistsonglist", {playlist_id: playlist_id}).catch(error => {
                if(error instanceof CommandResult) {
                    if(error.id == ErrorID.EMPTY_RESULT) {
                        this.connection.commandHandler.unset_handler("notifyplaylistsonglist", notify_handler);
                        resolve([]);
                        return;
                    }
                }
                reject(error);
            })
        });
    }

    request_playlist_info(playlist_id: number) : Promise<PlaylistInfo> {
        return new Promise((resolve, reject) => {
            const notify_handler = json => {
                if(json[0]["playlist_id"] != playlist_id) {
                    log.error(LogCategory.NETWORKING, tr("Received invalid notification for playlist info"));
                    return;
                }

                json = json[0];

                try {
                    //resolve
                    resolve({
                        playlist_id: parseInt(json["playlist_id"]),
                        playlist_title: json["playlist_title"],
                        playlist_description: json["playlist_description"],
                        playlist_type: parseInt(json["playlist_type"]),

                        playlist_owner_dbid: parseInt(json["playlist_owner_dbid"]),
                        playlist_owner_name: json["playlist_owner_name"],

                        playlist_flag_delete_played: json["playlist_flag_delete_played"] == true || json["playlist_flag_delete_played"] == "1",
                        playlist_flag_finished: json["playlist_flag_finished"] == true || json["playlist_flag_finished"] == "1",
                        playlist_replay_mode: parseInt(json["playlist_replay_mode"]),
                        playlist_current_song_id: parseInt(json["playlist_current_song_id"]),
                    });
                } catch(error) {
                    log.error(LogCategory.NETWORKING, tr("Failed to parse playlist info: %o"), error);
                    reject("failed to parse info");
                }

                this.connection.commandHandler.unset_handler("notifyplaylistinfo", notify_handler);
            };

            this.connection.commandHandler.set_handler("notifyplaylistinfo", notify_handler);
            this.connection.sendCommand("playlistinfo", {playlist_id: playlist_id}).catch(error => {
                reject(error);
            })
        });
    }

    /**
     * @deprecated
     *  Its just a workaround for the query management.
     *  There is no garante that the whoami trick will work forever
     */
    current_virtual_server_id() : Promise<number> {
        if(this._who_am_i)
            return Promise.resolve(parseInt(this._who_am_i["virtualserver_id"]));

        return new Promise<number>((resolve, reject) => {
            this.connection.commandHandler[""] = json => {
                this._who_am_i = json[0];
                resolve(parseInt(this._who_am_i["virtualserver_id"]));
                this.connection.commandHandler[""] = undefined;
            };
            this.connection.sendCommand("whoami");
        });
    }

    private handle_notifyclientnamefromuid(json: any[]) {
        for(let entry of json) {
            let info: ClientNameInfo = {} as any;
            info.client_unique_id = entry["cluid"];
            info.client_nickname = entry["clname"];
            info.client_database_id = parseInt(entry["cldbid"]);

            for(let elm of this._callbacks_namefromuid.slice(0)) {
                let unset = 0;
                for(let index = 0; index < elm.keys.length; index++) {
                    if(elm.keys[index] == info.client_unique_id) {
                        elm.response[index] = info;
                    }
                    if(elm.response[index] == undefined) unset++;
                }
                if(unset == 0) {
                    this._callbacks_namefromuid.remove(elm);
                    elm.promise.resolved(elm.response);
                }
            }
        }
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
        this["notifychannelhide"] = this.handleCommandChannelHide;
        this["notifychannelshow"] = this.handleCommandChannelShow;

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

        this["notifyclientpoke"] = this.handleNotifyClientPoke;

        this["notifymusicplayerinfo"] = this.handleNotifyMusicPlayerInfo;

        this["notifyservergroupclientadded"] = this.handleNotifyServerGroupClientAdd;
        this["notifyservergroupclientdeleted"] = this.handleNotifyServerGroupClientRemove;
        this["notifyclientchannelgroupchanged"] = this.handleNotifyClientChannelGroupChanged;
    }

    set_handler(command: string, handler: any) {
        this[command] = handler;
    }

    unset_handler(command: string, handler?: any) {
        if(handler && this[command] != handler) return;
        this[command] = undefined;
    }

    handleCommandResult(json) {
        json = json[0]; //Only one bulk

        let code : string = json["return_code"];
        if(code.length == 0) {
            console.log(tr("Invalid return code! (%o)"), json);
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
        console.log(tr("Setting up voice"));
        this.connection._client.voiceConnection.createSession();


        json = json[0]; //Only one bulk

        this.connection._client.clientId = parseInt(json["aclid"]);
        this.connection._client.getClient().updateVariables({key: "client_nickname", value: json["acn"]});

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "aclid") continue;
            if(key === "acn") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection._client.channelTree.server.updateVariables(false, ...updates);


        chat.serverChat().name = this.connection._client.channelTree.server.properties["virtualserver_name"];
        chat.serverChat().appendMessage(tr("Connected as {0}"), true, this.connection._client.getClient().createChatTag(true));
        sound.play(Sound.CONNECTION_CONNECTED);
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
                    console.error(tr("Invalid channel order id!"));
                    return;
                }
            }

            let parent = tree.findChannel(json["cpid"]);
            if(!parent && json["cpid"] != 0) {
                console.error(tr("Invalid channel parent"));
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
        console.log(tr("Got %d new channels"), json.length);
        for(let index = 0; index < json.length; index++)
            this.createChannelFromJson(json[index], true);
    }

    handleCommandChannelCreate(json) {
        this.createChannelFromJson(json[0]);
    }

    handleCommandChannelShow(json) {
        this.createChannelFromJson(json[0]); //TODO may chat?
    }

    handleCommandChannelDelete(json) {
        let tree = this.connection._client.channelTree;

        console.log(tr("Got %d channel deletions"), json.length);
        for(let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                console.error(tr("Invalid channel onDelete (Unknown channel)"));
                continue;
            }
            tree.deleteChannel(channel);
        }
    }

    handleCommandChannelHide(json) {
        let tree = this.connection._client.channelTree;

        console.log(tr("Got %d channel hides"), json.length);
        for(let index = 0; index < json.length; index++) {
            let channel = tree.findChannel(json[index]["cid"]);
            if(!channel) {
                console.error(tr("Invalid channel on hide (Unknown channel)"));
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
            if(parseInt(json["client_type_exact"]) == ClientType.CLIENT_MUSIC) {
                client = new MusicClientEntry(parseInt(json["clid"]), json["client_nickname"]);
            } else {
                client = new ClientEntry(parseInt(json["clid"]), json["client_nickname"]);
            }
            client = tree.insertClient(client, channel);
        } else {
            if(client == this.connection._client.getClient())
                chat.channelChat().name = channel.channelName();
            tree.moveClient(client, channel);
        }
        const own_channel = this.connection._client.getClient().currentChannel();

        if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            if(own_channel == channel)
                if(old_channel)
                    sound.play(Sound.USER_ENTERED);
                else
                    sound.play(Sound.USER_ENTERED_CONNECT);
            if(old_channel) {
                chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}"), true, client.createChatTag(true), old_channel.generate_tag(true), channel.generate_tag(true));
            } else {
                chat.serverChat().appendMessage(tr("{0} connected to channel {1}"), true, client.createChatTag(true), channel.generate_tag(true));
            }
        } else if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            if(own_channel == channel)
                sound.play(Sound.USER_ENTERED_MOVED);

            chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, moved by {3}"), true,
                client.createChatTag(true),
                old_channel ? old_channel.generate_tag(true) : undefined,
                channel.generate_tag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
            );
        } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
            if(own_channel == channel)
                sound.play(Sound.USER_ENTERED_KICKED);

            chat.serverChat().appendMessage(tr("{0} appeared from {1} to {2}, kicked by {3}{4}"), true,
                client.createChatTag(true),
                old_channel ? old_channel.generate_tag(true) : undefined,
                channel.generate_tag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"] > 0 ? " (" + json["msg"] + ")" : ""
            );
        } else {
            console.warn(tr("Unknown reasonid for %o"), json["reasonid"]);
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

        if(client instanceof LocalClientEntry)
            this.connection._client.controlBar.updateVoice();
    }

    handleCommandClientLeftView(json) {
        json = json[0]; //Only one bulk
        let tree = this.connection._client.channelTree;
        let client = tree.findClient(json["clid"]);
        if(!client) {
            console.error(tr("Unknown client left!"));
            return 0;
        }
        if(client == this.connection._client.getClient()) {
            if(json["reasonid"] == ViewReasonId.VREASON_BAN) {
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_BANNED, json);
            } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
                this.connection._client.handleDisconnect(DisconnectReason.CLIENT_KICKED, json);
            } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_SHUTDOWN) {
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_STOPPED) {
                this.connection._client.handleDisconnect(DisconnectReason.SERVER_CLOSED, json);
            } else
                this.connection._client.handleDisconnect(DisconnectReason.UNKNOWN, json);
            return;
        }

        const own_channel = this.connection._client.getClient().currentChannel();
        let channel_from = tree.findChannel(json["cfid"]);
        let channel_to = tree.findChannel(json["ctid"]);


        if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage(tr("{0} disappeared from {1} to {2}"), true, client.createChatTag(true), channel_from.generate_tag(true), channel_to.generate_tag(true));

            if(channel_from == own_channel)
                sound.play(Sound.USER_LEFT);
        } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_LEFT) {
            chat.serverChat().appendMessage(tr("{0} left the server{1}"), true,
                client.createChatTag(true),
                json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
            );

            if(channel_from == own_channel)
                sound.play(Sound.USER_LEFT_DISCONNECT);
        } else if(json["reasonid"] == ViewReasonId.VREASON_SERVER_KICK) {
            chat.serverChat().appendError(tr("{0} was kicked from the server by {1}.{2}"),
                client.createChatTag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
            );
            if(channel_from == own_channel)
                sound.play(Sound.USER_LEFT_KICKED_SERVER);
        } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
            chat.serverChat().appendError(tr("{0} was kicked from your channel by {1}.{2}"),
                client.createChatTag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
            );

            if(channel_from == own_channel)
                sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
        } else if(json["reasonid"] == ViewReasonId.VREASON_BAN) {
            //"Mulus" was banned for 1 second from the server by "WolverinDEV" (Sry brauchte kurz ein opfer :P <3 (Nohomo))
            let duration = "permanently";
            if(json["bantime"])
                duration = "for " + formatDate(Number.parseInt(json["bantime"]));

            chat.serverChat().appendError(tr("{0} was banned {1} by {2}.{3}"),
                client.createChatTag(true),
                duration,
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
            );

            if(channel_from == own_channel)
                sound.play(Sound.USER_LEFT_BANNED);
        } else {
            console.error(tr("Unknown client left reason!"));
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
            console.error(tr("Unknown client move (Client)!"));
            return 0;
        }

        if(!channel_to) {
            console.error(tr("Unknown client move (Channel to)!"));
            return 0;
        }
        if(!channel_from) //Not critical
            console.error(tr("Unknown client move (Channel from)!"));

        let self = client instanceof LocalClientEntry;
        let current_clients;
        if(self) {
            chat.channelChat().name = channel_to.channelName();
            current_clients = client.channelTree.clientsByChannel(client.currentChannel())
            this.connection._client.controlBar.updateVoice(channel_to);
        }

        tree.moveClient(client, channel_to);
        for(const entry of current_clients || [])
            if(entry !== client) entry.getAudioController().stopAudio(true);

        const own_channel = this.connection._client.getClient().currentChannel();
        if(json["reasonid"] == ViewReasonId.VREASON_MOVED) {
            chat.serverChat().appendMessage(self ? tr("You was moved by {3} from channel {1} to {2}") : tr("{0} was moved from channel {1} to {2} by {3}"), true,
                client.createChatTag(true),
                channel_from ? channel_from.generate_tag(true) : undefined,
                channel_to.generate_tag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"])
            );
            if(self)
                sound.play(Sound.USER_MOVED_SELF);
            else if(own_channel == channel_to)
                sound.play(Sound.USER_ENTERED_MOVED);
            else if(own_channel == channel_from)
                sound.play(Sound.USER_LEFT_MOVED);
        } else if(json["reasonid"] == ViewReasonId.VREASON_USER_ACTION) {
            chat.serverChat().appendMessage(self ? tr("You switched from channel {1} to {2}") : tr("{0} switched from channel {1} to {2}"), true,
                client.createChatTag(true),
                channel_from ? channel_from.generate_tag(true) : undefined,
                channel_to.generate_tag(true)
            );
            if(self) {} //If we do an action we wait for the error response
            else if(own_channel == channel_to)
                sound.play(Sound.USER_ENTERED);
            else if(own_channel == channel_from)
                sound.play(Sound.USER_LEFT);
        } else if(json["reasonid"] == ViewReasonId.VREASON_CHANNEL_KICK) {
            chat.serverChat().appendMessage(self ? tr("You got kicked out of the channel {1} to channel {2} by {3}{4}") : tr("{0} got kicked from channel {1} to {2} by {3}{4}"), true,
                client.createChatTag(true),
                channel_from ? channel_from.generate_tag(true) : undefined,
                channel_to.generate_tag(true),
                ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"]),
                json["reasonmsg"] ? " (" + json["reasonmsg"] + ")" : ""
            );
            if(self) {
                sound.play(Sound.CHANNEL_KICKED);
            } else if(own_channel == channel_to)
                sound.play(Sound.USER_ENTERED_KICKED);
            else if(own_channel == channel_from)
                sound.play(Sound.USER_LEFT_KICKED_CHANNEL);
        } else {
            console.warn(tr("Unknown reason id %o"), json["reasonid"]);
        }
    }

    handleNotifyChannelMoved(json) {
        json = json[0]; //Only one bulk
        for(let key in json)
            console.log("Key: " + key + " Value: " + json[key]);

        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            console.error(tr("Unknown channel move (Channel)!"));
            return 0;
        }

        let prev = tree.findChannel(json["order"]);
        if(!prev && json["order"] != 0) {
            console.error(tr("Unknown channel move (prev)!"));
            return 0;
        }

        let parent = tree.findChannel(json["cpid"]);
        if(!parent && json["cpid"] != 0) {
            console.error(tr("Unknown channel move (parent)!"));
            return 0;
        }

        tree.moveChannel(channel, prev, parent);
    }

    handleNotifyChannelEdited(json) {
        json = json[0]; //Only one bulk

        let tree = this.connection._client.channelTree;
        let channel = tree.findChannel(json["cid"]);
        if(!channel) {
            console.error(tr("Unknown channel edit (Channel)!"));
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
                console.error(tr("Got private message from invalid client!"));
                return;
            }
            if(!target) { //TODO spawn chat (Client is may invisible)
                console.error(tr("Got private message from invalid client!"));
                return;
            }
            if(invoker == this.connection._client.getClient()) {
                sound.play(Sound.MESSAGE_SEND, { background_notification: true });
                target.chat(true).appendMessage("{0}: {1}", true, this.connection._client.getClient().createChatTag(true), MessageHelper.bbcode_chat(json["msg"]));
            } else {
                sound.play(Sound.MESSAGE_RECEIVED, { background_notification: true });
                invoker.chat(true).appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
            }
        } else if(mode == 2) {
            if(json["invokerid"] == this.connection._client.clientId)
                sound.play(Sound.MESSAGE_SEND, { background_notification: true });
            else
                sound.play(Sound.MESSAGE_RECEIVED, { background_notification: true });
            chat.channelChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]))
        } else if(mode == 3) {
            chat.serverChat().appendMessage("{0}: {1}", true, ClientEntry.chatTag(json["invokerid"], json["invokername"], json["invokeruid"], true), MessageHelper.bbcode_chat(json["msg"]));
        }
    }

    handleNotifyClientUpdated(json) {
        json = json[0]; //Only one bulk

        let client = this.connection._client.channelTree.findClient(json["clid"]);
        if(!client) {
            console.error(tr("Tried to update an non existing client"));
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

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection._client.channelTree.server.updateVariables(false, ...updates);
        if(this.connection._client.selectInfo.currentSelected == this.connection._client.channelTree.server)
            this.connection._client.selectInfo.update();
    }

    handleNotifyServerUpdated(json) {
        json = json[0];

        let updates: {
            key: string,
            value: string
        }[] = [];
        for(let key in json) {
            if(key === "invokerid") continue;
            if(key === "invokername") continue;
            if(key === "invokeruid") continue;
            if(key === "reasonid") continue;

            updates.push({key: key, value: json[key]});
        }
        this.connection._client.channelTree.server.updateVariables(true, ...updates);
        let info = this.connection._client.selectInfo;
        if(info.currentSelected instanceof ServerEntry)
            info.update();
    }

    handleNotifyMusicPlayerInfo(json) {
        json = json[0];

        let bot = this.connection._client.channelTree.find_client_by_dbid(json["bot_id"]);
        if(!bot || !(bot instanceof MusicClientEntry)) {
            log.warn(LogCategory.CLIENT, tr("Got music player info for unknown or invalid bot! (ID: %i, Entry: %o)"), json["bot_id"], bot);
            return;
        }

        bot.handlePlayerInfo(json);
    }

    handleNotifyClientPoke(json) {
        json = json[0];
        Modals.spawnPoke({
            id: parseInt(json["invokerid"]),
            name: json["invokername"],
            unique_id: json["invokeruid"]
        }, json["msg"]);

        sound.play(Sound.USER_POKED_SELF);
    }

    //TODO server chat message
    handleNotifyServerGroupClientAdd(json) {
        json = json[0];

        const self = this.connection._client.getClient();
        if(json["clid"] == self.clientId())
            sound.play(Sound.GROUP_SERVER_ASSIGNED_SELF);
    }

    //TODO server chat message
    handleNotifyServerGroupClientRemove(json) {
        json = json[0];

        const self = this.connection._client.getClient();
        if(json["clid"] == self.clientId()) {
            sound.play(Sound.GROUP_SERVER_REVOKED_SELF);
        } else {
        }
    }

    //TODO server chat message
    handleNotifyClientChannelGroupChanged(json) {
        json = json[0];

        const self = this.connection._client.getClient();
        if(json["clid"] == self.clientId()) {
            sound.play(Sound.GROUP_CHANNEL_CHANGED_SELF);
        }
    }
}