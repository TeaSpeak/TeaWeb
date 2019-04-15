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
        this.id = parseInt(json["id"]);
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

namespace connection {
    export class ServerConnection extends AbstractServerConnection {
        _socket: WebSocket;
        _connectionState: ConnectionState = ConnectionState.UNCONNECTED;

        private _remote_address: ServerAddress;
        private _handshakeHandler: HandshakeHandler;

        private _command_boss: ServerConnectionCommandBoss;
        private _command_handler_default: ConnectionCommandHandler;
        private _command_handler_handshake: AbstractCommandHandler; //The new handshake handler :)

        private _connect_timeout_timer: NodeJS.Timer = undefined;
        private _connected: boolean = false;
        private _retCodeIdx: number;
        private _retListener: ReturnListener<CommandResult>[];

        private _connection_state_listener: connection.ConnectionStateListener;
        private _voice_connection: audio.js.VoiceConnection;

        constructor(client : ConnectionHandler) {
            super(client);

            this._socket = null;
            this._retCodeIdx = 0;
            this._retListener = [];

            this._command_boss = new ServerConnectionCommandBoss(this);
            this._command_handler_default = new ConnectionCommandHandler(this);

            this._command_boss.register_handler(this._command_handler_default);
            this.command_helper.initialize();

            if(!settings.static_global(Settings.KEY_DISABLE_VOICE, false))
                this._voice_connection = new audio.js.VoiceConnection(this);
        }

        on_connect: () => void = () => {
            console.log(tr("Socket connected"));
            this.client.chat.serverChat().appendMessage(tr("Logging in..."));
            this._handshakeHandler.initialize();
            this._handshakeHandler.startHandshake();
        };

        private generateReturnCode() : string {
            return (this._retCodeIdx++).toString();
        }

        async connect(address : ServerAddress, handshake: HandshakeHandler, timeout?: number) : Promise<void> {
            timeout = typeof(timeout) === "number" ? timeout : 0;

            if(this._connect_timeout_timer) {
                clearTimeout(this._connect_timeout_timer);
                this._connect_timeout_timer = null;
                try {
                    await this.disconnect()
                } catch(error) {
                    console.error(tr("Failed to close old connection properly. Error: %o"), error);
                    throw "failed to cleanup old connection";
                }
            }
            this.updateConnectionState(ConnectionState.CONNECTING);
            this._remote_address = address;
            this._handshakeHandler = handshake;
            this._handshakeHandler.setConnection(this);
            this._connected = false;

            const self = this;
            let local_socket: WebSocket;
            let local_timeout_timer: NodeJS.Timer;
            try {

                local_timeout_timer = setTimeout(async () => {
                    console.log(tr("Connect timeout triggered!"));
                    try {
                        await this.disconnect();
                    } catch(error) {
                        log.warn(LogCategory.NETWORKING, tr("Failed to close connection after timeout had been triggered! (%o)"), error);
                    }
                    this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
                }, timeout);
                this._connect_timeout_timer = local_timeout_timer;

                this._socket = (local_socket = new WebSocket('wss://' + address.host + ":" + address.port)); /* this may hangs */
                clearTimeout(local_timeout_timer);
                if(this._connect_timeout_timer == local_timeout_timer)
                    this._connect_timeout_timer = undefined;

                if(this._socket != local_socket) return; /* something had changed and we dont use this connection anymore! */
                local_socket.onopen = () => {
                    if(this._socket != local_socket) return; /* this socket isn't from interest anymore */

                    this._connected = true;
                    this.on_connect();
                };

                local_socket.onclose = event => {
                    if(this._socket != local_socket) return; /* this socket isn't from interest anymore */

                    this.client.handleDisconnect(this._connected ? DisconnectReason.CONNECTION_CLOSED : DisconnectReason.CONNECT_FAILURE, {
                        code: event.code,
                        reason: event.reason,
                        event: event
                    });
                };

                local_socket.onerror = e => {
                    if(this._socket != local_socket) return; /* this socket isn't from interest anymore */

                    console.log(tr("Received web socket error: (%o)"), e);
                };

                local_socket.onmessage = msg => {
                    if(this._socket != local_socket) return; /* this socket isn't from interest anymore */

                    self.handle_socket_message(msg.data);
                };
                this.updateConnectionState(ConnectionState.INITIALISING);
            } catch (e) {
                clearTimeout(local_timeout_timer);
                try {
                    await this.disconnect();
                } catch(error) {
                    log.warn(LogCategory.NETWORKING, tr("Failed to close connection after connect attempt failed (%o)"), error);
                }
                this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE, e);
            }
        }

        updateConnectionState(state: ConnectionState) {
            const old_state = this._connectionState;
            this._connectionState = state;
            if(this._connection_state_listener)
                this._connection_state_listener(old_state, state);
        }

        async disconnect(reason?: string) : Promise<void> {
            if(typeof(reason) === "string") {
                //TODO send disconnect reason
            }

            if(this._connectionState == ConnectionState.UNCONNECTED)
                return;

            this.updateConnectionState(ConnectionState.UNCONNECTED);

            if(this._socket)
                this._socket.close(3000 + 0xFF, tr("request disconnect"));
            this._socket = null;
            for(let future of this._retListener)
                future.reject(tr("Connection closed"));
            this._retListener = [];
            this._retCodeIdx = 0;
            this._connected = false;

            if(this._voice_connection)
                this._voice_connection.dropSession();
        }

        private handle_socket_message(data) {
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
                if(json["type"] === "command") {
                    let group = log.group(log.LogType.DEBUG, LogCategory.NETWORKING, tr("Handling command '%s'"), json["command"]);
                    group.log(tr("Handling command '%s'"), json["command"]);
                    group.group(log.LogType.TRACE, tr("Json:")).collapsed(true).log("%o", json).end();

                    this._command_boss.invoke_handle({
                        command: json["command"],
                        arguments: json["data"]
                    });
                    group.end();
                } else if(json["type"] === "WebRTC") {
                    if(this._voice_connection)
                        this._voice_connection.handleControlPacket(json);
                    else
                        console.log(tr("Dropping WebRTC command packet, because we haven't a bridge."))
                }
                else {
                    console.log(tr("Unknown command type %o"), json["type"]);
                }
            } else {
                log.warn(LogCategory.NETWORKING, tr("Received unknown message of type %s. Dropping message"), typeof(data));
            }
        }

        sendData(data: any) {
            if(!this._socket || this._socket.readyState != 1) {
                log.warn(LogCategory.NETWORKING, tr("Tried to send on a invalid socket (%s)"), this._socket ? "invalid state (" + this._socket.readyState + ")" : "invalid socket");
                return;
            }
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

        send_command(command: string, data?: any | any[], _options?: CommandOptions) : Promise<CommandResult> {
            if(!this._socket || !this.connected()) {
                console.warn(tr("Tried to send a command without a valid connection."));
                return Promise.reject(tr("not connected"));
            }

            const options: CommandOptions = {};
            Object.assign(options, CommandOptionDefaults);
            Object.assign(options, _options);

            data = $.isArray(data) ? data : [data || {}];
            if(data.length == 0) /* we require min one arg to append return_code */
                data.push({});

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
                    "flags": options.flagset.filter(entry => entry.length != 0)
                }));
            });
            return new Promise<CommandResult>((resolve, failed) => {
                result.then(resolve).catch(ex => {
                    if(options.process_result) {
                        if(ex instanceof CommandResult) {
                            let res = ex;
                            if(!res.success) {
                                if(res.id == 2568) { //Permission error
                                    res.message = tr("Insufficient client permissions. Failed on permission ") + this.client.permissions.resolveInfo(res.json["failed_permid"] as number).name;
                                    this.client.chat.serverChat().appendError(tr("Insufficient client permissions. Failed on permission {}"), this.client.permissions.resolveInfo(res.json["failed_permid"] as number).name);
                                    this.client.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                                } else {
                                    this.client.chat.serverChat().appendError(res.extra_message.length == 0 ? res.message : res.extra_message);
                                }
                            }
                        } else if(typeof(ex) === "string") {
                            this.client.chat.serverChat().appendError(tr("Command execution results in ") + ex);
                        } else {
                            console.error(tr("Invalid promise result type: %o. Result:"), typeof (ex));
                            console.error(ex);
                        }
                    }
                    failed(ex);
                })
            });
        }

        connected() : boolean {
            return this._socket && this._socket.readyState == WebSocket.OPEN;
        }

        support_voice(): boolean {
            return this._voice_connection !== undefined;
        }

        voice_connection(): connection.voice.AbstractVoiceConnection | undefined {
            return this._voice_connection;
        }

        command_handler_boss(): connection.AbstractCommandHandlerBoss {
            return this._command_boss;
        }


        get onconnectionstatechanged() : connection.ConnectionStateListener {
            return this._connection_state_listener;
        }
        set onconnectionstatechanged(listener: connection.ConnectionStateListener) {
            this._connection_state_listener = listener;
        }

        handshake_handler(): connection.HandshakeHandler {
            return this._handshakeHandler;
        }

        remote_address(): ServerAddress {
            return this._remote_address;
        }
    }

    export function spawn_server_connection(handle: ConnectionHandler) : AbstractServerConnection {
        return new ServerConnection(handle); /* will be overridden by the client */
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