import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {LogCategory, logDebug, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import {Registry} from "tc-shared/events";
import {
    CommandSessionInitializeAgent, CommandSessionUpdateLocale,
    Message,
    MessageCommand,
    MessageCommandResult,
    MessageNotify,
    NotifyClientsOnline
} from "./Messages";
import {config, tr} from "tc-shared/i18n/localize";
import {geoLocationProvider} from "tc-shared/clientservice/GeoLocation";
import translation_config = config.translation_config;
import {getBackend} from "tc-shared/backend";

const kApiVersion = 1;
const kVerbose = true;

type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnect-pending";
type PendingCommand = {
    resolve: (result: MessageCommandResult) => void,
    timeout: number
};

interface ClientServiceConnectionEvents {
    notify_state_changed: { oldState: ConnectionState, newState: ConnectionState },
    notify_notify_received: { notify: MessageNotify }
}

let tokenIndex = 0;
class ClientServiceConnection {
    readonly events: Registry<ClientServiceConnectionEvents>;
    readonly verbose: boolean;
    readonly reconnectInterval: number;

    private reconnectTimeout: number;
    private connectionState: ConnectionState;
    private connection: WebSocket;

    private pendingCommands: {[key: string]: PendingCommand} = {};

    constructor(reconnectInterval: number, verbose: boolean) {
        this.events = new Registry<ClientServiceConnectionEvents>();
        this.reconnectInterval = reconnectInterval;
        this.verbose = verbose;
    }

    destroy() {
        this.disconnect();
        this.events.destroy();
    }

    getState() : ConnectionState {
        return this.connectionState;
    }

    private setState(newState: ConnectionState) {
        if(this.connectionState === newState) {
            return;
        }

        const oldState = this.connectionState;
        this.connectionState = newState;
        this.events.fire("notify_state_changed", { oldState, newState })
    }

    connect() {
        this.disconnect();

        this.setState("connecting");

        let address;
        address = "client-services.teaspeak.de:27791";
        //address = "localhost:1244";

        this.connection = new WebSocket(`wss://${address}/ws-api/v${kApiVersion}`);
        this.connection.onclose = event => {
            if(this.verbose) {
                logInfo(LogCategory.STATISTICS, tr("Lost connection to statistics server (Connection closed). Reason: %s"), event.reason ? `${event.reason} (${event.code})` : event.code);
            }

            this.handleConnectionLost();
        };

        this.connection.onopen = () => {
            if(this.verbose) {
                logDebug(LogCategory.STATISTICS, tr("Connection established."));
            }

            this.setState("connected");
        }

        this.connection.onerror = () => {
            if(this.connectionState === "connecting") {
                if(this.verbose) {
                    logDebug(LogCategory.STATISTICS, tr("Failed to connect to target server."));
                }

                this.handleConnectFail();
            } else {
                if(this.verbose) {
                    logWarn(LogCategory.STATISTICS, tr("Received web socket error which indicates that the connection has been closed."));
                }

                this.handleConnectionLost();
            }
        };

        this.connection.onmessage = event => {
            if(typeof event.data !== "string") {
                if(this.verbose) {
                    logWarn(LogCategory.STATISTICS, tr("Receved non text message: %o"), event.data);
                }

                return;
            }

            this.handleServerMessage(event.data);
        };
    }

    disconnect() {
        if(this.connection) {
            this.connection.onclose = undefined;
            this.connection.onopen = undefined;
            this.connection.onmessage = undefined;
            this.connection.onerror = undefined;

            this.connection.close();
            this.connection = undefined;
        }

        for(const command of Object.values(this.pendingCommands)) {
            command.resolve({ type: "ConnectionClosed" });
        }
        this.pendingCommands = {};

        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;

        this.setState("disconnected");
    }

    cancelReconnect() {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;

        if(this.connectionState === "reconnect-pending") {
            this.setState("disconnected");
        }
    }

    async executeCommand(command: MessageCommand) : Promise<MessageCommandResult> {
        if(this.connectionState !== "connected") {
            return { type: "ConnectionClosed" };
        }

        const token = "tk-" + ++tokenIndex;
        try {
            this.connection.send(JSON.stringify({
                type: "Command",
                token: token,
                command: command
            } as Message));
        } catch (error) {
            if(this.verbose) {
                logError(LogCategory.STATISTICS, tr("Failed to send command: %o"), error);
            }

            return { type: "GenericError", error: tr("Failed to send command") };
        }

        return await new Promise(resolve => {
            const proxiedResolve = (result: MessageCommandResult) => {
                clearTimeout(this.pendingCommands[token]?.timeout);
                delete this.pendingCommands[token];
                resolve(result);
            };

            this.pendingCommands[token] = {
                resolve: proxiedResolve,
                timeout: setTimeout(() => proxiedResolve({ type: "ConnectionTimeout" }), 5000)
            };
        });
    }

    private handleConnectFail() {
        this.disconnect();
        this.executeReconnect();
    }

    private handleConnectionLost() {
        this.disconnect();
        this.executeReconnect();
    }

    private executeReconnect() {
        if(!this.reconnectInterval) {
            return;
        }

        if(this.verbose) {
            logInfo(LogCategory.STATISTICS, tr("Scheduling reconnect in %dms"), this.reconnectInterval);
        }

        this.reconnectTimeout = setTimeout(() => this.connect(), this.reconnectInterval);
        this.setState("reconnect-pending");
    }

    private handleServerMessage(message: string) {
        let data: Message;
        try {
            data = JSON.parse(message);
        } catch (_error) {
            if(this.verbose) {
                logWarn(LogCategory.STATISTICS, tr("Received message which isn't parsable as JSON."));
            }
            return;
        }

        if(data.type === "Command") {
            if(this.verbose) {
                logWarn(LogCategory.STATISTICS, tr("Received message of type command. The server should not send these. Message: %o"), data);
            }

            /* Well this is odd. We should never receive such */
        } else if(data.type === "CommandResult") {
            if(data.token === null) {
                if(this.verbose) {
                    logWarn(LogCategory.STATISTICS, tr("Received general error: %o"), data.result);
                }
            } else if(this.pendingCommands[data.token]) {
                /* The entry itself will be cleaned up by the resolve callback */
                this.pendingCommands[data.token].resolve(data.result);
            } else if(this.verbose) {
                logWarn(LogCategory.STATISTICS, tr("Received command result for unknown token: %o"), data.token);
            }
        } else if(data.type === "Notify") {
            this.events.fire("notify_notify_received", { notify: data.notify });
        } else if(this.verbose) {
            logWarn(LogCategory.STATISTICS, tr("Received message with invalid type: %o"), (data as any).type);
        }
    }
}

export class ClientServices {
    private connection: ClientServiceConnection;

    private sessionInitialized: boolean;
    private retryTimer: number;

    private initializeAgentId: number;
    private initializeLocaleId: number;

    constructor() {
        this.initializeAgentId = 0;
        this.initializeLocaleId = 0;

        this.sessionInitialized = false;
        this.connection = new ClientServiceConnection(5000, kVerbose);
        this.connection.events.on("notify_state_changed", event => {
            if(event.newState !== "connected") {
                this.sessionInitialized = false;
                return;
            }

            logInfo(LogCategory.STATISTICS, tr("Connected successfully. Initializing session."));
            this.executeCommandWithRetry({ type: "SessionInitialize", payload: { anonymize_ip: false }}, 2500).then(result => {
                if(result.type !== "Success") {
                    if(result.type === "ConnectionClosed") {
                        return;
                    }

                    if(kVerbose) {
                        logError(LogCategory.STATISTICS, tr("Failed to initialize session. Retrying in 120 seconds. Result: %o"), result);
                    }

                    this.scheduleRetry(120 * 1000);
                    return;
                }

                this.sendInitializeAgent().then(undefined);
                this.sendLocaleUpdate();
            });
        });

        this.connection.events.on("notify_notify_received", event => {
            switch (event.notify.type) {
                case "NotifyClientsOnline":
                    this.handleNotifyClientsOnline(event.notify.payload);
                    break;

                default:
                    return;
            }
        });
    }

    start() {
        this.connection.connect();
    }

    stop() {
        this.connection.disconnect();
        clearTimeout(this.retryTimer);

        this.initializeAgentId++;
        this.initializeLocaleId++;
    }

    private scheduleRetry(time: number) {
        this.stop();

        this.retryTimer = setTimeout(() => this.connection.connect(), time);
    }

    /**
     * Returns as soon the result indicates that something else went wrong rather than transmitting.
     * @param command
     * @param retryInterval
     */
    private async executeCommandWithRetry(command: MessageCommand, retryInterval: number) : Promise<MessageCommandResult> {
        while(true) {
            const result = await this.connection.executeCommand(command);
            switch (result.type) {
                case "ServerInternalError":
                case "CommandEnqueueError":
                case "ClientSessionUninitialized":
                    const shouldRetry = await new Promise<boolean>(resolve => {
                        const timeout = setTimeout(() => {
                            listener();
                            resolve(true);
                        }, 2500);

                        const listener = this.connection.events.on("notify_state_changed", event => {
                            if(event.newState !== "connected") {
                                resolve(false);
                                clearTimeout(timeout);
                            }
                        })
                    });

                    if(shouldRetry) {
                        continue;
                    } else {
                        return result;
                    }

                default:
                    return result;
            }
        }
    }

    private async sendInitializeAgent() {
        const taskId = ++this.initializeAgentId;
        const payload: CommandSessionInitializeAgent = {
            session_type: __build.target === "web" ? 0 : 1,
            architecture: null,
            platform_version: null,
            platform: null,
            client_version: null,
            ui_version: __build.version
        };

        if(__build.target === "client") {
            const info = getBackend("native").getVersionInfo();

            payload.client_version = info.version;
            payload.architecture = info.os_architecture;
            payload.platform = info.os_platform;
            payload.platform_version = info.os_platform_version;
        } else {
            const os = window.detectedBrowser.os;
            const osParts = os.split(" ");
            if(osParts.last().match(/^[0-9]+$/)) {
                payload.platform_version = osParts.last();
                osParts.splice(osParts.length - 1, 1);
            }

            payload.platform = osParts.join(" ");
            payload.architecture = window.detectedBrowser.name;
            payload.client_version = window.detectedBrowser.version;
        }

        if(this.initializeAgentId !== taskId) {
            /* We don't want to send that stuff any more */
            return;
        }

        this.executeCommandWithRetry({ type: "SessionInitializeAgent", payload }, 2500).then(result => {
            if(kVerbose) {
                logTrace(LogCategory.STATISTICS, tr("Agent initialize result: %o"), result);
            }
        });
    }

    private async sendLocaleUpdate() {
        const taskId = ++this.initializeLocaleId;

        const payload: CommandSessionUpdateLocale = {
            ip_country: null,
            selected_locale: null,
            local_timestamp: Date.now()
        };

        const geoInfo = await geoLocationProvider.queryInfo(2500);
        payload.ip_country = geoInfo?.country?.toLowerCase() || null;

        const trConfig = translation_config();
        payload.selected_locale = trConfig?.current_translation_url || null;

        if(this.initializeLocaleId !== taskId) {
            return;
        }

        this.connection.executeCommand({ type: "SessionUpdateLocale", payload }).then(result => {
            if(kVerbose) {
                logTrace(LogCategory.STATISTICS, tr("Agent local update result: %o"), result);
            }
        });
    }

    private handleNotifyClientsOnline(notify: NotifyClientsOnline) {
        logInfo(LogCategory.GENERAL, tr("Received user count update: %o"), notify);
    }
}

export let clientServices: ClientServices;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 30,
    function: async () => {
        clientServices = new ClientServices();
        clientServices.start();

        (window as any).clientServices = clientServices;
    },
    name: "client services"
});