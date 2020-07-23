import {
    AbstractServerConnection,
    CommandOptionDefaults,
    CommandOptions,
    ConnectionStateListener,
    voice
} from "tc-shared/connection/ConnectionBase";
import {ConnectionHandler, ConnectionState, DisconnectReason} from "tc-shared/ConnectionHandler";
import {ServerAddress} from "tc-shared/ui/server";
import {HandshakeHandler} from "tc-shared/connection/HandshakeHandler";
import {ConnectionCommandHandler, ServerConnectionCommandBoss} from "tc-shared/connection/CommandHandler";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {settings, Settings} from "tc-shared/settings";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Regex} from "tc-shared/ui/modal/ModalConnect";
import {AbstractCommandHandlerBoss} from "tc-shared/connection/AbstractCommandHandler";
import {VoiceConnection} from "../voice/VoiceHandler";
import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {WrappedWebSocket} from "tc-backend/web/connection/WrappedWebSocket";
import AbstractVoiceConnection = voice.AbstractVoiceConnection;

class ReturnListener<T> {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    code: string;

    timeout: number;
}

let globalReturnCodeIndex = 0;
export class ServerConnection extends AbstractServerConnection {
    private remoteServerAddress: ServerAddress;
    private handshakeHandler: HandshakeHandler;

    private commandHandlerBoss: ServerConnectionCommandBoss;
    private defaultCommandHandler: ConnectionCommandHandler;

    private socket: WrappedWebSocket;
    private connectCancelCallback: () => void;

    private returnListeners: ReturnListener<CommandResult>[] = [];

    private _connection_state_listener: ConnectionStateListener;
    private _voice_connection: VoiceConnection;

    private pingStatistics = {
        thread_id: 0,

        lastRequestTimestamp: 0,
        lastResponseTimestamp: 0,

        currentRequestId: 0,

        interval: 5000,
        timeout: 7500,

        currentJsValue: 0,
        currentNativeValue: 0 /* ping value for native (WS)  */
    };

    constructor(client : ConnectionHandler) {
        super(client);

        this.commandHandlerBoss = new ServerConnectionCommandBoss(this);
        this.defaultCommandHandler = new ConnectionCommandHandler(this);

        this.commandHandlerBoss.register_handler(this.defaultCommandHandler);
        this.command_helper.initialize();

        if(!settings.static_global(Settings.KEY_DISABLE_VOICE, false))
            this._voice_connection = new VoiceConnection(this);
    }

    destroy() {
        this.disconnect("handle destroyed").catch(error => {
            log.warn(LogCategory.NETWORKING, tr("Failed to disconnect on server connection destroy: %o"), error);
        }).then(() => {
            clearInterval(this.pingStatistics.thread_id);
            if(this.connectCancelCallback)
                this.connectCancelCallback();

            for(const listener of this.returnListeners) {
                try {
                    listener.reject("handler destroyed");
                } catch(error) {
                    log.warn(LogCategory.NETWORKING, tr("Failed to reject command promise: %o"), error);
                }
            }
            this.returnListeners = undefined;

            this.command_helper.destroy();

            this.defaultCommandHandler && this.commandHandlerBoss.unregister_handler(this.defaultCommandHandler);
            this.defaultCommandHandler = undefined;

            this._voice_connection && this._voice_connection.destroy();
            this._voice_connection = undefined;

            this.commandHandlerBoss && this.commandHandlerBoss.destroy();
            this.commandHandlerBoss = undefined;
        });
    }

    async connect(address : ServerAddress, handshake: HandshakeHandler, timeout?: number) : Promise<void> {
        const connectBeginTimestamp = Date.now();
        timeout = typeof(timeout) === "number" ? timeout : 5000;

        try {
            await this.disconnect();
        } catch(error) {
            log.error(LogCategory.NETWORKING, tr("Failed to close old connection properly. Error: %o"), error);
            throw "failed to cleanup old connection";
        }

        this.updateConnectionState(ConnectionState.CONNECTING);
        this.remoteServerAddress = address;

        this.handshakeHandler = handshake;
        this.handshakeHandler.setConnection(this);

        /* The direct one connect directly to the target address. The other via the .con-gate.work */
        let availableSockets: WrappedWebSocket[] = [];

        proxySocket:
        if(!settings.static_global(Settings.KEY_CONNECT_NO_DNSPROXY)) {
            let host;
            if(Regex.IP_V4.test(address.host)) {
                host = address.host.replace(/\./g, "-") + ".con-gate.work";
            } else if(Regex.IP_V6.test(address.host)) {
                host = address.host.replace(/\[(.*)]/, "$1").replace(/:/g, "_") + ".con-gate.work";
            } else {
                break proxySocket;
            }

            availableSockets.push(new WrappedWebSocket("wss://" + host + ":" + address.port))
        }
        availableSockets.push(new WrappedWebSocket("wss://" + address.host + ":" + address.port));

        let timeoutRaised = false;
        let timeoutPromise = new Promise(resolve => setTimeout(() => {
            timeoutRaised = true;
            resolve();
        }, timeout));

        let cancelRaised = false;
        let cancelPromise = new Promise(resolve => {
            this.connectCancelCallback = () => {
                this.connectCancelCallback = undefined;
                cancelRaised = true;
                resolve();
            };
        });

        availableSockets.forEach(e => e.doConnect());
        while (availableSockets.length > 0) {
            await Promise.race([...availableSockets.map(e => e.awaitConnectResult()), timeoutPromise, cancelPromise]);

            if(cancelRaised) {
                log.debug(LogCategory.NETWORKING, tr("Aborting connect attempt due to a cancel request."));
                availableSockets.forEach(e => e.closeConnection());
                return
            }

            if(timeoutRaised) {
                log.info(LogCategory.NETWORKING, tr("Connect timeout triggered. Aborting connect attempt!"));
                availableSockets.forEach(e => e.closeConnection());
                this.updateConnectionState(ConnectionState.UNCONNECTED); /* firstly update the state, that fire event */
                this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
                return
            }

            let finished = availableSockets.find(e => e.state !== "connecting");
            if(!finished) continue; /* should not happen, but we want to ensure it */
            availableSockets.remove(finished);

            switch (finished.state) {
                case "unconnected":
                    log.debug(LogCategory.NETWORKING, tr("Connection attempt to %s:%d via %s got aborted."), this.remoteServerAddress.host, this.remoteServerAddress.port, finished.url);
                    continue;

                case "errored":
                    const error = finished.popError();
                    log.info(LogCategory.NETWORKING, tr("Connection attempt to %s:%d via %s failed:\n%o"), this.remoteServerAddress.host, this.remoteServerAddress.port, finished.url, error);
                    continue;

                case "connected":
                    break;
            }

            this.socket = finished;

            /* abort any other ongoing connection attempts, we already succeeded */
            availableSockets.forEach(e => e.closeConnection());
            break;
        }

        if(!this.socket) {
            log.info(LogCategory.NETWORKING, tr("Failed to connect to %s:%d. No connection attempt succeeded."), this.remoteServerAddress.host, this.remoteServerAddress.port);
            this.updateConnectionState(ConnectionState.UNCONNECTED); /* firstly update the state, that fire event */
            this.client.handleDisconnect(DisconnectReason.CONNECT_FAILURE);
            return;
        }

        this.socket.callbackMessage = message => this.handleSocketMessage(message);
        this.socket.callbackDisconnect = (code, reason) => {
            try {
                this.disconnect();
            } catch (error) {
                log.warn(LogCategory.NETWORKING, tr("Failed to disconnect with an already closed socket: %o"), error);
            }

            this.client.handleDisconnect(DisconnectReason.CONNECTION_CLOSED, {
                code: code,
                reason: reason
            });
        };
        this.socket.callbackErrored = () => {
            if(this.socket.hasError()) {
                log.error(LogCategory.NETWORKING, tr("Server connection %s:%d has been terminated due to an unexpected error (%o)."),
                    this.remoteServerAddress.host,
                    this.remoteServerAddress.port,
                    this.socket.popError()
                );
            } else {
                log.error(LogCategory.NETWORKING, tr("Server connection %s:%d has been terminated due to an unexpected error."), this.remoteServerAddress.host, this.remoteServerAddress.port);
            }
            try {
                this.disconnect();
            } catch (error) {
                log.warn(LogCategory.NETWORKING, tr("Failed to disconnect with an already closed socket: %o"), error);
            }

            this.client.handleDisconnect(DisconnectReason.CONNECTION_CLOSED);
        };

        const connectEndTimestamp = Date.now();
        log.info(LogCategory.NETWORKING, tr("Successfully initialized a connection to %s:%d via %s within %d milliseconds."),
            this.remoteServerAddress.host,
            this.remoteServerAddress.port,
            this.socket.url,
            connectEndTimestamp - connectBeginTimestamp);


        this.start_handshake();
    }

    private start_handshake() {
        this.updateConnectionState(ConnectionState.INITIALISING);
        this.client.log.log(EventType.CONNECTION_LOGIN, {});
        this.handshakeHandler.initialize();
        this.handshakeHandler.startHandshake();
    }

    async disconnect(reason?: string) : Promise<void> {
        if(this.connectCancelCallback)
            this.connectCancelCallback();

        this.updateConnectionState(ConnectionState.DISCONNECTING);
        try {
            clearTimeout(this.pingStatistics.thread_id);
            this.pingStatistics.thread_id = undefined;

            if(typeof(reason) === "string") {
                //TODO send disconnect reason
            }


            if(this._voice_connection)
                this._voice_connection.drop_rtp_session();


            if(this.socket) {
                this.socket.callbackMessage = undefined;
                this.socket.callbackDisconnect = undefined;
                this.socket.callbackErrored = undefined;

                this.socket.closeConnection(); /* 3000 + 0xFF, tr("request disconnect") */
                this.socket = undefined;
            }

            for(let future of this.returnListeners)
                future.reject(tr("Connection closed"));
            this.returnListeners = [];
        } finally {
            this.updateConnectionState(ConnectionState.UNCONNECTED);
        }
    }

    private handleSocketMessage(data) {
        if(typeof(data) === "string") {
            let json;
            try {
                json = JSON.parse(data);
            } catch(e) {
                log.warn(LogCategory.NETWORKING, tr("Could not parse message json!"));
                return;
            }
            if(json["type"] === undefined) {
                log.warn(LogCategory.NETWORKING, tr("Missing data type in message!"));
                return;
            }
            if(json["type"] === "command") {
                /* devel-block(log-networking-commands) */
                let group = log.group(log.LogType.DEBUG, LogCategory.NETWORKING, tr("Handling command '%s'"), json["command"]);
                group.log(tr("Handling command '%s'"), json["command"]);
                group.group(log.LogType.TRACE, tr("Json:")).collapsed(true).log("%o", json).end();
                /* devel-block-end */

                this.commandHandlerBoss.invoke_handle({
                    command: json["command"],
                    arguments: json["data"]
                });

                if(json["command"] === "initserver") {
                    this.pingStatistics.thread_id = setInterval(() => this.doNextPing(), this.pingStatistics.interval) as any;
                    this.doNextPing();
                    this.updateConnectionState(ConnectionState.CONNECTED);
                    if(this._voice_connection)
                        this._voice_connection.start_rtc_session(); /* FIXME: Move it to a handler boss and not here! */
                }
                /* devel-block(log-networking-commands) */
                group.end();
                /* devel-block-end */
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
                if(id != this.pingStatistics.currentRequestId) {
                    log.warn(LogCategory.NETWORKING, tr("Received pong which is older than the last request. Delay may over %oms? (Index: %o, Current index: %o)"), this.pingStatistics.timeout, id, this.pingStatistics.currentRequestId);
                } else {
                    this.pingStatistics.lastResponseTimestamp = 'now' in performance ? performance.now() : Date.now();
                    this.pingStatistics.currentJsValue = this.pingStatistics.lastResponseTimestamp - this.pingStatistics.lastRequestTimestamp;
                    this.pingStatistics.currentNativeValue = parseInt(json["ping_native"]) / 1000; /* we're getting it in microseconds and not milliseconds */
                    //log.debug(LogCategory.NETWORKING, tr("Received new pong. Updating ping to: JS: %o Native: %o"), this._ping.value.toFixed(3), this._ping.value_native.toFixed(3));
                }
            } else {
                log.warn(LogCategory.NETWORKING, tr("Unknown command type %o"), json["type"]);
            }
        } else {
            log.warn(LogCategory.NETWORKING, tr("Received unknown message of type %s. Dropping message"), typeof(data));
        }
    }

    sendData(data: any) {
        if(!this.socket || this.socket.state !== "connected") {
            log.warn(LogCategory.NETWORKING, tr("Tried to send data via a non connected server socket."));
            return;
        }

        this.socket.socket.send(data);
    }

    private static commandDataToJson(input: any) : string {
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
        if(!this.socket || !this.connected()) {
            log.warn(LogCategory.NETWORKING, tr("Tried to send a command without a valid connection."));
            return Promise.reject(tr("not connected"));
        }

        const options: CommandOptions = {};
        Object.assign(options, CommandOptionDefaults);
        Object.assign(options, _options);

        data = $.isArray(data) ? data : [data || {}];
        if(data.length == 0) /* we require min one arg to append return_code */
            data.push({});

        let result = new Promise<CommandResult>((resolve, failed) => {
            let payload = $.isArray(data) ? data : [data];

            let returnCode = typeof payload[0]["return_code"] === "string" ? payload[0].return_code : ++globalReturnCodeIndex;
            payload[0].return_code = returnCode;

            let listener = new ReturnListener<CommandResult>();
            listener.resolve = resolve;
            listener.reject = failed;
            listener.code = returnCode;
            listener.timeout = setTimeout(() => {
                this.returnListeners.remove(listener);
                listener.reject("timeout");
            }, 1500);
            this.returnListeners.push(listener);

            this.sendData(ServerConnection.commandDataToJson({
                "type": "command",
                "command": command,
                "data": payload,
                "flags": options.flagset.filter(entry => entry.length != 0)
            }))
        });

        return this.defaultCommandHandler.proxy_command_promise(result, options);
    }

    connected() : boolean {
        return !!this.socket && this.socket.state === "connected";
    }

    support_voice(): boolean {
        return this._voice_connection !== undefined;
    }

    voice_connection(): AbstractVoiceConnection | undefined {
        return this._voice_connection;
    }

    command_handler_boss(): AbstractCommandHandlerBoss {
        return this.commandHandlerBoss;
    }


    get onconnectionstatechanged() : ConnectionStateListener {
        return this._connection_state_listener;
    }
    set onconnectionstatechanged(listener: ConnectionStateListener) {
        this._connection_state_listener = listener;
    }

    handshake_handler(): HandshakeHandler {
        return this.handshakeHandler;
    }

    remote_address(): ServerAddress {
        return this.remoteServerAddress;
    }

    private doNextPing() {
        if(this.pingStatistics.lastRequestTimestamp + this.pingStatistics.timeout < Date.now()) {
            this.pingStatistics.currentJsValue = this.pingStatistics.timeout;
            this.pingStatistics.lastResponseTimestamp = this.pingStatistics.lastRequestTimestamp + 1;
        }

        if(this.pingStatistics.lastResponseTimestamp > this.pingStatistics.lastRequestTimestamp) {
            this.pingStatistics.lastRequestTimestamp = 'now' in performance ? performance.now() : Date.now();
            this.sendData(JSON.stringify({
                type: 'ping',
                payload: (++this.pingStatistics.currentRequestId).toString()
            }));
        }
    }

    ping(): { native: number; javascript?: number } {
        return {
            javascript: this.pingStatistics.currentJsValue,
            native: this.pingStatistics.currentNativeValue
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