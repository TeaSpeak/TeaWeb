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

        private _connect_timeout_timer: NodeJS.Timer = undefined;
        private _connected: boolean = false;
        private _retCodeIdx: number;
        private _retListener: ReturnListener<CommandResult>[];

        private _connection_state_listener: connection.ConnectionStateListener;
        private _voice_connection: audio.js.VoiceConnection;

        private _ping = {
            thread_id: 0,

            last_request: 0,
            last_response: 0,

            request_id: 0,
            interval: 5000,
            timeout: 7500,

            value: 0,
            value_native: 0 /* ping value for native (WS)  */
        };

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

        destroy() {
            this.disconnect("handle destroyed").catch(error => {
                log.warn(LogCategory.NETWORKING, tr("Failed to disconnect on server connection destroy: %o"), error);
            }).then(() => {
                clearInterval(this._ping.thread_id);
                clearTimeout(this._connect_timeout_timer);

                for(const listener of this._retListener) {
                    try {
                        listener.reject("handler destroyed");
                    } catch(error) {
                        log.warn(LogCategory.NETWORKING, tr("Failed to reject command promise: %o"), error);
                    }
                }
                this._retListener = undefined;

                this.command_helper.destroy();

                this._command_handler_default && this._command_boss.unregister_handler(this._command_handler_default);
                this._command_handler_default = undefined;

                this._voice_connection && this._voice_connection.destroy();
                this._voice_connection = undefined;

                this._command_boss && this._command_boss.destroy();
                this._command_boss = undefined;
            });
        }

        on_connect: () => void = () => {
            log.info(LogCategory.NETWORKING, tr("Socket connected"));
            this.client.log.log(log.server.Type.CONNECTION_LOGIN, {});
            this._handshakeHandler.initialize();
            this._handshakeHandler.startHandshake();
        };

        private generateReturnCode() : string {
            return (this._retCodeIdx++).toString();
        }

        async connect(address : ServerAddress, handshake: HandshakeHandler, timeout?: number) : Promise<void> {
            timeout = typeof(timeout) === "number" ? timeout : 5000;

            if(this._connect_timeout_timer) {
                clearTimeout(this._connect_timeout_timer);
                this._connect_timeout_timer = null;
                try {
                    await this.disconnect()
                } catch(error) {
                    log.error(LogCategory.NETWORKING, tr("Failed to close old connection properly. Error: %o"), error);
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
                    log.error(LogCategory.NETWORKING, tr("Connect timeout triggered!"));
                    try {
                        await this.disconnect();
                    } catch(error) {
                        log.warn(LogCategory.NETWORKING, tr("Failed to close connection after timeout had been triggered! (%o)"), error);
                    }
                    this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
                }, timeout);
                this._connect_timeout_timer = local_timeout_timer;

                this._socket = (local_socket = new WebSocket('wss://' + address.host + ":" + address.port)); /* this may hangs */

                if(this._socket != local_socket)
                    return; /* something had changed and we dont use this connection anymore! */

                try {
                    await new Promise((resolve, reject) => {
                        local_socket.onopen = resolve;
                        local_socket.onerror = event => reject(event);
                        local_socket.onclose = event => reject(event);
                        if(local_socket.readyState == WebSocket.OPEN)
                            resolve();
                    });
                } catch(error) {
                    log.error(LogCategory.NETWORKING, tr("Failed to wait for connected (%o)"), error);
                    try {
                        await this.disconnect();
                    } catch(error) {
                        log.warn(LogCategory.NETWORKING, tr("Failed to close connection after timeout had been triggered! (%o)"), error);
                    }
                    this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
                    return;
                }
                clearTimeout(local_timeout_timer);
                if(this._connect_timeout_timer == local_timeout_timer)
                    this._connect_timeout_timer = undefined;

                if(this._socket != local_socket)
                    return; /* this socket isn't from interest anymore */

                this._connected = true;
                this.on_connect();

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

                    log.warn(LogCategory.NETWORKING, tr("Received web socket error: (%o)"), e);
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
            clearTimeout(this._connect_timeout_timer);
            this._connect_timeout_timer = undefined;

            clearTimeout(this._ping.thread_id);
            this._ping.thread_id = undefined;

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
                this._voice_connection.drop_rtp_session();
        }

        private handle_socket_message(data) {
            if(typeof(data) === "string") {
                let json;
                try {
                    json = JSON.parse(data);
                } catch(e) {
                    log.warn(LogCategory.NETWORKING, tr("Could not parse message json!"));
                    alert(e); // error in the above string (in this case, yes)!
                    return;
                }
                if(json["type"] === undefined) {
                    log.warn(LogCategory.NETWORKING, tr("Missing data type in message!"));
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

                    if(json["command"] === "initserver") {
                        this._ping.thread_id = setInterval(() => this.do_ping(), this._ping.interval) as any;
                        this.do_ping();
                        this.updateConnectionState(ConnectionState.CONNECTED);
                        if(this._voice_connection)
                            this._voice_connection.start_rtc_session(); /* FIXME: Move it to a handler boss and not here! */
                    }
                    group.end();
                } else if(json["type"] === "WebRTC") {
                    if(this._voice_connection)
                        this._voice_connection.handleControlPacket(json);
                    else
                        log.warn(LogCategory.NETWORKING, tr("Dropping WebRTC command packet, because we haven't a bridge."))
                } else if(json["type"] === "ping") {
                  this.sendData(JSON.stringify({
                      type: 'pong',
                      payload: json["payload"]
                  }));
                } else if(json["type"] === "pong") {
                    const id = parseInt(json["payload"]);
                    if(id != this._ping.request_id) {
                        log.warn(LogCategory.NETWORKING, tr("Received pong which is older than the last request. Delay may over %oms? (Index: %o, Current index: %o)"), this._ping.timeout, id, this._ping.request_id);
                    } else {
                        this._ping.last_response = 'now' in performance ? performance.now() : Date.now();
                        this._ping.value = this._ping.last_response - this._ping.last_request;
                        this._ping.value_native = parseInt(json["ping_native"]) / 1000; /* we're getting it in microseconds and not milliseconds */
                        log.debug(LogCategory.NETWORKING, tr("Received new pong. Updating ping to: JS: %o Native: %o"), this._ping.value.toFixed(3), this._ping.value_native.toFixed(3));
                    }
                } else {
                    log.warn(LogCategory.NETWORKING, tr("Unknown command type %o"), json["type"]);
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
                log.warn(LogCategory.NETWORKING, tr("Tried to send a command without a valid connection."));
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

            return this._command_handler_default.proxy_command_promise(result, options);
        }

        connected() : boolean {
            return !!this._socket && this._socket.readyState == WebSocket.OPEN;
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

        private do_ping() {
            if(this._ping.last_request + this._ping.timeout < Date.now()) {
                this._ping.value = this._ping.timeout;
                this._ping.last_response = this._ping.last_request + 1;
            }
            if(this._ping.last_response > this._ping.last_request) {
                this._ping.last_request = 'now' in performance ? performance.now() : Date.now();
                this.sendData(JSON.stringify({
                    type: 'ping',
                    payload: (++this._ping.request_id).toString()
                }));
            }
        }

        ping(): { native: number; javascript?: number } {
            return {
                javascript: this._ping.value,
                native: this._ping.value_native
            };
        }
    }

    export function spawn_server_connection(handle: ConnectionHandler) : AbstractServerConnection {
        return new ServerConnection(handle); /* will be overridden by the client */
    }

    export function destroy_server_connection(handle: AbstractServerConnection) {
        if(!(handle instanceof ServerConnection))
            throw "invalid handle";
        handle.destroy();
    }
}