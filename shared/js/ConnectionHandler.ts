import {AbstractServerConnection} from "./connection/ConnectionBase";
import {PermissionManager} from "./permission/PermissionManager";
import {GroupManager} from "./permission/GroupManager";
import {ServerSettings, Settings, settings, StaticSettings} from "./settings";
import {Sound, SoundManager} from "./sound/Sounds";
import {ConnectionProfile} from "./profiles/ConnectionProfile";
import * as log from "./log";
import {LogCategory, logError, logInfo, logWarn} from "./log";
import {createErrorModal, createInfoModal, createInputModal, Modal} from "./ui/elements/Modal";
import {hashPassword} from "./utils/helpers";
import {HandshakeHandler} from "./connection/HandshakeHandler";
import * as htmltags from "./ui/htmltags";
import {FilterMode, InputStartResult, InputState} from "./voice/RecorderBase";
import {CommandResult} from "./connection/ServerConnectionDeclaration";
import {defaultRecorder, RecorderProfile} from "./voice/RecorderProfile";
import {Frame} from "./ui/frames/chat_frame";
import {Hostbanner} from "./ui/frames/hostbanner";
import {connection_log, Regex} from "./ui/modal/ModalConnect";
import {formatMessage} from "./ui/frames/chat";
import {spawnAvatarUpload} from "./ui/modal/ModalAvatar";
import * as dns from "tc-backend/dns";
import {EventHandler, Registry} from "./events";
import {FileManager} from "./file/FileManager";
import {FileTransferState, TransferProvider} from "./file/Transfer";
import {traj} from "./i18n/localize";
import {md5} from "./crypto/md5";
import {guid} from "./crypto/uid";
import {ServerEventLog} from "./ui/frames/log/ServerEventLog";
import {EventType} from "./ui/frames/log/Definitions";
import {PluginCmdRegistry} from "./connection/PluginCmdHandler";
import {W2GPluginCmdHandler} from "./video-viewer/W2GPlugin";
import {VoiceConnectionStatus, WhisperSessionInitializeData} from "./connection/VoiceConnection";
import {getServerConnectionFactory} from "./connection/ConnectionFactory";
import {WhisperSession} from "./voice/VoiceWhisper";
import {spawnEchoTestModal} from "./ui/modal/echo-test/Controller";
import {ServerFeature, ServerFeatures} from "./connection/ServerFeatures";
import {ChannelTree} from "./tree/ChannelTree";
import {LocalClientEntry} from "./tree/Client";
import {ServerAddress} from "./tree/Server";
import {server_connections} from "tc-shared/ConnectionManager";

export enum InputHardwareState {
    MISSING,
    START_FAILED,
    VALID
}

export enum DisconnectReason {
    HANDLER_DESTROYED,
    REQUESTED,
    DNS_FAILED,
    CONNECT_FAILURE,
    CONNECTION_CLOSED,
    CONNECTION_FATAL_ERROR,
    CONNECTION_PING_TIMEOUT,
    CLIENT_KICKED,
    CLIENT_BANNED,
    HANDSHAKE_FAILED,
    HANDSHAKE_TEAMSPEAK_REQUIRED,
    HANDSHAKE_BANNED,
    SERVER_CLOSED,
    SERVER_REQUIRES_PASSWORD,
    SERVER_HOSTMESSAGE,
    IDENTITY_TOO_LOW,
    UNKNOWN
}

export enum ConnectionState {
    UNCONNECTED, /* no connection is currenting running */
    CONNECTING, /* we try to establish a connection to the target server */
    INITIALISING, /* we're setting up the connection encryption */
    AUTHENTICATING, /* we're authenticating our self so we get a unique ID */
    CONNECTED, /* we're connected to the server. Server init has been done, may not everything is initialized */
    DISCONNECTING/* we're curently disconnecting from the server and awaiting disconnect acknowledge */
}

export namespace ConnectionState {
    export function socketConnected(state: ConnectionState) {
        switch (state) {
            case ConnectionState.CONNECTED:
            case ConnectionState.AUTHENTICATING:
            //case ConnectionState.INITIALISING: /* its not yet possible to send any data */
                return true;
            default:
                return false;
        }
    }

    export function fullyConnected(state: ConnectionState) {
        return state === ConnectionState.CONNECTED;
    }
}

export enum ViewReasonId {
    VREASON_USER_ACTION = 0,
    VREASON_MOVED = 1,
    VREASON_SYSTEM = 2,
    VREASON_TIMEOUT = 3,
    VREASON_CHANNEL_KICK = 4,
    VREASON_SERVER_KICK = 5,
    VREASON_BAN = 6,
    VREASON_SERVER_STOPPED = 7,
    VREASON_SERVER_LEFT = 8,
    VREASON_CHANNEL_UPDATED = 9,
    VREASON_EDITED = 10,
    VREASON_SERVER_SHUTDOWN = 11
}

export interface LocalClientStatus {
    input_muted: boolean;
    output_muted: boolean;

    lastChannelCodecWarned: number,
    away: boolean | string;

    channel_subscribe_all: boolean;
    queries_visible: boolean;
}

export interface ConnectParameters {
    nickname?: string;
    channel?: {
        target: string | number;
        password?: string;
    };
    token?: string;
    password?: {password: string, hashed: boolean};
    auto_reconnect_attempt?: boolean;
}

export class ConnectionHandler {
    readonly handlerId: string;

    private readonly event_registry: Registry<ConnectionEvents>;
    channelTree: ChannelTree;

    connection_state: ConnectionState = ConnectionState.UNCONNECTED;
    serverConnection: AbstractServerConnection;

    fileManager: FileManager;

    permissions: PermissionManager;
    groups: GroupManager;

    side_bar: Frame;

    settings: ServerSettings;
    sound: SoundManager;

    hostbanner: Hostbanner;

    tag_connection_handler: JQuery;

    serverFeatures: ServerFeatures;

    private _clientId: number = 0;
    private _local_client: LocalClientEntry;

    private _reconnect_timer: number;
    private _reconnect_attempt: boolean = false;

    private _connect_initialize_id: number = 1;
    private echoTestRunning = false;

    private pluginCmdRegistry: PluginCmdRegistry;

    private client_status: LocalClientStatus = {
        input_muted: false,

        output_muted: false,
        away: false,
        channel_subscribe_all: true,
        queries_visible: false,

        lastChannelCodecWarned: -1
    };

    private inputHardwareState: InputHardwareState = InputHardwareState.MISSING;

    log: ServerEventLog;

    constructor() {
        this.handlerId = guid();
        this.event_registry = new Registry<ConnectionEvents>();
        this.event_registry.enableDebug("connection-handler");

        this.settings = new ServerSettings();

        this.serverConnection = getServerConnectionFactory().create(this);
        this.serverConnection.events.on("notify_connection_state_changed", event => this.on_connection_state_changed(event.oldState, event.newState));

        this.serverConnection.getVoiceConnection().events.on("notify_recorder_changed", () => {
            this.setInputHardwareState(this.getVoiceRecorder() ? InputHardwareState.VALID : InputHardwareState.MISSING);
            this.update_voice_status();
        });
        this.serverConnection.getVoiceConnection().events.on("notify_connection_status_changed", () => this.update_voice_status());
        this.serverConnection.getVoiceConnection().setWhisperSessionInitializer(this.initializeWhisperSession.bind(this));

        this.serverFeatures = new ServerFeatures(this);

        this.channelTree = new ChannelTree(this);
        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);

        this.pluginCmdRegistry = new PluginCmdRegistry(this);

        this.log = new ServerEventLog(this);
        this.side_bar = new Frame(this);
        this.sound = new SoundManager(this);
        this.hostbanner = new Hostbanner(this);

        this.groups = new GroupManager(this);
        this._local_client = new LocalClientEntry(this);

        /* initialize connection handler tab entry */
        {
            this.tag_connection_handler = $.spawn("div").addClass("connection-container");
            $.spawn("div").addClass("server-icon icon client-server_green").appendTo(this.tag_connection_handler);
            $.spawn("div").addClass("server-name").appendTo(this.tag_connection_handler);
            $.spawn("div").addClass("button-close icon client-tab_close_button").appendTo(this.tag_connection_handler);
            this.tag_connection_handler.on('click', event => {
                if(event.isDefaultPrevented())
                    return;

                server_connections.set_active_connection(this);
            });
            this.tag_connection_handler.find(".button-close").on('click', event => {
                server_connections.destroy_server_connection(this);
                event.preventDefault();
            });
            this.tab_set_name(tr("Not connected"));
        }

        this.event_registry.register_handler(this);
        this.events().fire("notify_handler_initialized");

        this.pluginCmdRegistry.registerHandler(new W2GPluginCmdHandler());
    }

    initialize_client_state(source?: ConnectionHandler) {
        this.client_status.input_muted = source ? source.client_status.input_muted : settings.global(Settings.KEY_CLIENT_STATE_MICROPHONE_MUTED);
        this.client_status.output_muted = source ? source.client_status.output_muted : settings.global(Settings.KEY_CLIENT_STATE_SPEAKER_MUTED);
        this.update_voice_status();

        this.setSubscribeToAllChannels(source ? source.client_status.channel_subscribe_all : settings.global(Settings.KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS));
        this.doSetAway(source ? source.client_status.away : (settings.global(Settings.KEY_CLIENT_STATE_AWAY) ? settings.global(Settings.KEY_CLIENT_AWAY_MESSAGE) : false), false);
        this.setQueriesShown(source ? source.client_status.queries_visible : settings.global(Settings.KEY_CLIENT_STATE_QUERY_SHOWN));
    }

    events() : Registry<ConnectionEvents> {
        return this.event_registry;
    }

    tab_set_name(name: string) {
        this.tag_connection_handler.toggleClass('cutoff-name', name.length > 30);
        this.tag_connection_handler.find(".server-name").text(name);
    }

    async startConnection(addr: string, profile: ConnectionProfile, user_action: boolean, parameters: ConnectParameters) {
        this.cancel_reconnect(false);
        this._reconnect_attempt = parameters.auto_reconnect_attempt || false;
        this.handleDisconnect(DisconnectReason.REQUESTED);
        this.tab_set_name(tr("Connecting"));

        let server_address: ServerAddress = {
            host: "",
            port: -1
        };
        {
            let _v6_end = addr.indexOf(']');
            let idx = addr.lastIndexOf(':');
            if(idx != -1 && idx > _v6_end) {
                server_address.port = parseInt(addr.substr(idx + 1));
                server_address.host = addr.substr(0, idx);
            } else {
                server_address.host = addr;
                server_address.port = 9987;
            }
        }
        log.info(LogCategory.CLIENT, tr("Start connection to %s:%d"), server_address.host, server_address.port);
        this.log.log(EventType.CONNECTION_BEGIN, {
            address: {
                server_hostname: server_address.host,
                server_port: server_address.port
            },
            client_nickname: parameters.nickname
        });
        this.channelTree.initialiseHead(addr, server_address);

        if(parameters.password && !parameters.password.hashed){
            try {
                const password = await hashPassword(parameters.password.password);
                parameters.password = {
                    hashed: true,
                    password: password
                }
            } catch(error) {
                log.error(LogCategory.CLIENT, tr("Failed to hash connect password: %o"), error);
                createErrorModal(tr("Error while hashing password"), tr("Failed to hash server password!<br>") + error).open();
            }
        }
        if(parameters.password) {
            connection_log.update_address_password({
                hostname: server_address.host,
                port: server_address.port
            }, parameters.password.password);
        }

        const original_address = {host: server_address.host, port: server_address.port};
        if(server_address.host === "localhost") {
            server_address.host = "127.0.0.1";
        } else if(dns.supported() && !server_address.host.match(Regex.IP_V4) && !server_address.host.match(Regex.IP_V6)) {
            const id = ++this._connect_initialize_id;
            this.log.log(EventType.CONNECTION_HOSTNAME_RESOLVE, {});
            try {
                const resolved = await dns.resolve_address(server_address, { timeout: 5000 }) || {} as any;
                if(id != this._connect_initialize_id)
                    return; /* we're old */

                server_address.host = typeof(resolved.target_ip) === "string" ? resolved.target_ip : server_address.host;
                server_address.port = typeof(resolved.target_port) === "number" ? resolved.target_port : server_address.port;
                this.log.log(EventType.CONNECTION_HOSTNAME_RESOLVED, {
                    address: {
                        server_port: server_address.port,
                        server_hostname: server_address.host
                    }
                });
            } catch(error) {
                if(id != this._connect_initialize_id)
                    return; /* we're old */

                this.handleDisconnect(DisconnectReason.DNS_FAILED, error);
            }
        }

        await this.serverConnection.connect(server_address, new HandshakeHandler(profile, parameters));
        setTimeout(() => {
            const connected = this.serverConnection.connected();
            if(user_action && connected) {
                connection_log.log_connect({
                    hostname: original_address.host,
                    port: original_address.port
                });
            }
        }, 50);
    }

    async disconnectFromServer(reason?: string) {
        this.cancel_reconnect(true);
        if(!this.connected) return;

        this.handleDisconnect(DisconnectReason.REQUESTED);
        try {
            await this.serverConnection.disconnect();
        } catch (error) {
            log.warn(LogCategory.CLIENT, tr("Failed to successfully disconnect from server: {}"), error);
        }
        this.sound.play(Sound.CONNECTION_DISCONNECTED);
        this.log.log(EventType.DISCONNECTED, {});
    }

    getClient() : LocalClientEntry { return this._local_client; }
    getClientId() { return this._clientId; }

    initializeLocalClient(clientId: number, acceptedName: string) {
        this._clientId = clientId;
        this._local_client["_clientId"] = clientId;

        this.channelTree.registerClient(this._local_client);
        this._local_client.updateVariables( { key: "client_nickname", value: acceptedName });
    }

    getServerConnection() : AbstractServerConnection { return this.serverConnection; }


    @EventHandler<ConnectionEvents>("notify_connection_state_changed")
    private handleConnectionStateChanged(event: ConnectionEvents["notify_connection_state_changed"]) {
        this.connection_state = event.new_state;
        if(event.new_state === ConnectionState.CONNECTED) {
            log.info(LogCategory.CLIENT, tr("Client connected"));
            this.log.log(EventType.CONNECTION_CONNECTED, {
                serverAddress: {
                    server_port: this.channelTree.server.remote_address.port,
                    server_hostname: this.channelTree.server.remote_address.host
                },
                serverName: this.channelTree.server.properties.virtualserver_name,
                own_client: this.getClient().log_data()
            });
            this.sound.play(Sound.CONNECTION_CONNECTED);

            this.permissions.requestPermissionList();
            if(this.groups.serverGroups.length == 0)
                this.groups.requestGroups();

            this.settings.setServer(this.channelTree.server.properties.virtualserver_unique_identifier);

            /* apply the server settings */
            if(this.client_status.channel_subscribe_all)
                this.channelTree.subscribe_all_channels();
            else
                this.channelTree.unsubscribe_all_channels();
            this.channelTree.toggle_server_queries(this.client_status.queries_visible);

            this.sync_status_with_server();
            this.channelTree.server.updateProperties();
            /*
            No need to update the voice stuff because as soon we see ourself we're doing it
            this.update_voice_status();
            if(control_bar.current_connection_handler() === this)
                control_bar.apply_server_voice_state();
            */

            /*
            this.serverConnection.getVoiceConnection().startWhisper({ target: "echo" }).catch(error => {
                logError(LogCategory.CLIENT, tr("Failed to start local echo: %o"), error);
            });
             */
            if(__build.target === "web") {
                this.serverFeatures.awaitFeatures().then(result => {
                    if(!result) {
                        return;
                    }
                    if(this.serverFeatures.supportsFeature(ServerFeature.WHISPER_ECHO)) {
                        spawnEchoTestModal(this);
                    }
                });
            }
        } else {
            this.setInputHardwareState(this.getVoiceRecorder() ? InputHardwareState.VALID : InputHardwareState.MISSING);
        }
    }

    get connected() : boolean {
        return this.serverConnection && this.serverConnection.connected();
    }

    private generate_ssl_certificate_accept() : JQuery {
        const properties = {
            connect_default: true,
            connect_profile: this.serverConnection.handshake_handler().profile.id,
            connect_address: this.serverConnection.remote_address().host + (this.serverConnection.remote_address().port !== 9987 ? ":" + this.serverConnection.remote_address().port : "")
        };

        const build_url = (base: string, search: string, props: any) => {
            const parameters: string[] = [];
            for(const key of Object.keys(props))
                parameters.push(key + "=" + encodeURIComponent(props[key]));

            let callback = base + search; /* don't use document.URL because it may contains a #! */
            if(!search)
                callback += "?" + parameters.join("&");
            else
                callback += "&" + parameters.join("&");

            return "https://" + this.serverConnection.remote_address().host + ":" + this.serverConnection.remote_address().port + "/?forward_url=" + encodeURIComponent(callback);
        };

        /* generate the tag */
        const tag = $.spawn("a").text(tr("here"));

        let pathname = document.location.pathname;
        if(pathname.endsWith(".php"))
            pathname = pathname.substring(0, pathname.lastIndexOf("/"));

        tag.attr('href', build_url(document.location.origin + pathname, document.location.search, properties));
        return tag;
    }

    private _certificate_modal: Modal;
    handleDisconnect(type: DisconnectReason, data: any = {}) {
        this._connect_initialize_id++;

        this.tab_set_name(tr("Not connected"));
        let auto_reconnect = false;
        switch (type) {
            case DisconnectReason.REQUESTED:
            case DisconnectReason.SERVER_HOSTMESSAGE: /* already handled */
                break;
            case DisconnectReason.HANDLER_DESTROYED:
                if(data) {
                    this.sound.play(Sound.CONNECTION_DISCONNECTED);
                    this.log.log(EventType.DISCONNECTED, {});
                }
                break;
            case DisconnectReason.DNS_FAILED:
                log.error(LogCategory.CLIENT, tr("Failed to resolve hostname: %o"), data);
                this.log.log(EventType.CONNECTION_HOSTNAME_RESOLVE_ERROR, {
                    message: data as any
                });
                this.sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.CONNECT_FAILURE:
                if(this._reconnect_attempt) {
                    auto_reconnect = true;
                    this.log.log(EventType.CONNECTION_FAILED, { serverAddress: {
                        server_port: this.channelTree.server.remote_address.port,
                        server_hostname: this.channelTree.server.remote_address.host
                    } });
                    break;
                }

                if(data)
                    log.error(LogCategory.CLIENT, tr("Could not connect to remote host! Extra data: %o"), data);
                else
                    log.error(LogCategory.CLIENT, tr("Could not connect to remote host!"), data);

                if(__build.target === "client" || !dns.resolve_address_ipv4) {
                    createErrorModal(
                        tr("Could not connect"),
                        tr("Could not connect to remote host (Connection refused)")
                    ).open();
                } else {
                    const generateAddressPart = () => Math.floor(Math.random() * 256);
                    const addressParts = [generateAddressPart(), generateAddressPart(), generateAddressPart(), generateAddressPart()];
                    dns.resolve_address_ipv4(addressParts.join("-") + ".con-gate.work").then(async result => {
                        if(result !== addressParts.join("."))
                            throw "miss matching address";

                        createErrorModal(
                            tr("Could not connect"),
                            tr("Could not connect to remote host (Connection refused)")
                        ).open();
                    }).catch(() => {
                        const error_message_format =
                            "Could not connect to remote host (Connection refused)\n" +
                            "If you're sure that the remote host is up, than you may not allow unsigned certificates or that con-gate.work works properly.\n" +
                            "Click {0} to accept the remote certificate";

                        this._certificate_modal = createErrorModal(
                            tr("Could not connect"),
                            formatMessage(/* @tr-ignore */ tr(error_message_format), this.generate_ssl_certificate_accept())
                        );
                        this._certificate_modal.close_listener.push(() => this._certificate_modal = undefined);
                        this._certificate_modal.open();
                    });
                }
                this.log.log(EventType.CONNECTION_FAILED, { serverAddress: {
                    server_hostname: this.serverConnection.remote_address().host,
                    server_port: this.serverConnection.remote_address().port
                } });
                this.sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.HANDSHAKE_FAILED:
                //TODO sound
                log.error(LogCategory.CLIENT, tr("Failed to process handshake: %o"), data);
                createErrorModal(
                    tr("Could not connect"),
                    tr("Failed to process handshake: ") + data as string
                ).open();
                break;
            case DisconnectReason.HANDSHAKE_TEAMSPEAK_REQUIRED:
                createErrorModal(
                    tr("Target server is a TeamSpeak server"),
                    formatMessage(tr("The target server is a TeamSpeak 3 server!{:br:}Only TeamSpeak 3 based identities are able to connect.{:br:}Please select another profile or change the identify type."))
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);
                auto_reconnect = false;
                break;
            case DisconnectReason.IDENTITY_TOO_LOW:
                createErrorModal(
                    tr("Identity level is too low"),
                    formatMessage(tr("You've been disconnected, because your Identity level is too low.{:br:}You need at least a level of {0}"), data["extra_message"])
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = false;
                break;
            case DisconnectReason.CONNECTION_CLOSED:
                log.error(LogCategory.CLIENT, tr("Lost connection to remote server!"));
                if(!this._reconnect_attempt) {
                    createErrorModal(
                        tr("Connection closed"),
                        tr("The connection was closed by remote host")
                    ).open();
                }
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = true;
                break;
            case DisconnectReason.CONNECTION_PING_TIMEOUT:
                log.error(LogCategory.CLIENT, tr("Connection ping timeout"));
                this.sound.play(Sound.CONNECTION_DISCONNECTED_TIMEOUT);
                createErrorModal(
                    tr("Connection lost"),
                    tr("Lost connection to remote host (Ping timeout)<br>Even possible?")
                ).open();

                break;
            case DisconnectReason.SERVER_CLOSED:
                this.log.log(EventType.SERVER_CLOSED, {message: data.reasonmsg});

                createErrorModal(
                    tr("Server closed"),
                    "The server is closed.<br>" + //TODO tr
                            "Reason: " + data.reasonmsg
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = true;
                break;
            case DisconnectReason.SERVER_REQUIRES_PASSWORD:
                this.log.log(EventType.SERVER_REQUIRES_PASSWORD, {});

                createInputModal(tr("Server password"), tr("Enter server password:"), password => password.length != 0, password => {
                    if(!(typeof password === "string")) return;

                    const profile = this.serverConnection.handshake_handler().profile;
                    const cprops = this.reconnect_properties(profile);
                    cprops.password = {password: password as string, hashed: false};

                    connection_log.update_address_info({
                        port: this.channelTree.server.remote_address.port,
                        hostname: this.channelTree.server.remote_address.host
                    }, {
                        flag_password: true
                    } as any);
                    this.startConnection(this.channelTree.server.remote_address.host + ":" + this.channelTree.server.remote_address.port, profile, false, cprops);
                }).open();
                break;
            case DisconnectReason.CLIENT_KICKED:
                const have_invoker = typeof(data["invokerid"]) !== "undefined" && parseInt(data["invokerid"]) !== 0;
                const modal = createErrorModal(
                    tr("You've been kicked"),
                    formatMessage(
                        have_invoker ? tr("You've been kicked from the server by {0}:{:br:}{1}") : tr("You've been kicked from the server:{:br:}{1}"),
                        have_invoker ?
                            htmltags.generate_client_object({ client_id: parseInt(data["invokerid"]), client_unique_id: data["invokeruid"], client_name: data["invokername"]}) :
                            "",
                        data["extra_message"] || data["reasonmsg"] || ""
                    )
                );

                modal.htmlTag.find(".modal-body").addClass("modal-disconnect-kick");
                modal.open();
                this.sound.play(Sound.SERVER_KICKED);
                auto_reconnect = false;
                break;
            case DisconnectReason.HANDSHAKE_BANNED:
                //Reason message already printed because of the command error handling
                this.sound.play(Sound.CONNECTION_BANNED);
                break;
            case DisconnectReason.CLIENT_BANNED:
                this.log.log(EventType.SERVER_BANNED, {
                    invoker: {
                        client_name: data["invokername"],
                        client_id: parseInt(data["invokerid"]),
                        client_unique_id: data["invokeruid"]
                    },

                    message: data["reasonmsg"],
                    time: parseInt(data["time"])
                });
                this.sound.play(Sound.CONNECTION_BANNED);
                break;
            default:
                log.error(LogCategory.CLIENT, tr("Got uncaught disconnect!"));
                log.error(LogCategory.CLIENT, tr("Type: %o Data: %o"), type, data);
                break;
        }

        this.channelTree.unregisterClient(this._local_client); /* if we dont unregister our client here the client will be destroyed */
        this.channelTree.reset();
        if(this.serverConnection)
            this.serverConnection.disconnect();

        this.hostbanner.update();
        this.client_status.lastChannelCodecWarned = 0;

        if(auto_reconnect) {
            if(!this.serverConnection) {
                log.info(LogCategory.NETWORKING, tr("Allowed to auto reconnect but cant reconnect because we dont have any information left..."));
                return;
            }
            this.log.log(EventType.RECONNECT_SCHEDULED, {timeout: 5000});

            log.info(LogCategory.NETWORKING, tr("Allowed to auto reconnect. Reconnecting in 5000ms"));
            const server_address = this.serverConnection.remote_address();
            const profile = this.serverConnection.handshake_handler().profile;

            this._reconnect_timer = setTimeout(() => {
                this._reconnect_timer = undefined;
                this.log.log(EventType.RECONNECT_EXECUTE, {});
                log.info(LogCategory.NETWORKING, tr("Reconnecting..."));

                this.startConnection(server_address.host + ":" + server_address.port, profile, false, Object.assign(this.reconnect_properties(profile), {auto_reconnect_attempt: true}));
            }, 5000);
        }

        this.serverConnection.updateConnectionState(ConnectionState.UNCONNECTED); /* Fix for the native client... */
    }

    cancel_reconnect(log_event: boolean) {
        if(this._reconnect_timer) {
            if(log_event) this.log.log(EventType.RECONNECT_CANCELED, {});
            clearTimeout(this._reconnect_timer);
            this._reconnect_timer = undefined;
        }
    }

    private on_connection_state_changed(old_state: ConnectionState, new_state: ConnectionState) {
        console.log("From %s to %s", ConnectionState[old_state], ConnectionState[new_state]);
        this.event_registry.fire("notify_connection_state_changed", {
            old_state: old_state,
            new_state: new_state
        });
    }

    private updateVoiceStatus() {
        if(!this._local_client) {
            /* we've been destroyed */
            return;
        }

        let shouldRecord = false;

        const voiceConnection = this.serverConnection.getVoiceConnection();
        if(this.serverConnection.connected()) {
            let localClientUpdates: {
                client_output_hardware?: boolean,
                client_input_hardware?: boolean,
                client_input_muted?: boolean,
                client_output_muted?: boolean
            } = {};

            const currentChannel = this.getClient().currentChannel();

            if(!currentChannel) {
                /* Don't update the voice state, firstly await for us to be fully connected */
            } else if(voiceConnection.getConnectionState() !== VoiceConnectionStatus.Connected) {
                /* We're currently not having a valid voice connection. We need to await that. */
                localClientUpdates.client_input_hardware = false;
                localClientUpdates.client_output_hardware = false;
            } else {
                let codecSupportEncode = voiceConnection.encodingSupported(currentChannel.properties.channel_codec);
                let codecSupportDecode = voiceConnection.decodingSupported(currentChannel.properties.channel_codec);

                localClientUpdates.client_input_hardware = codecSupportEncode;
                localClientUpdates.client_output_hardware = codecSupportDecode;

                if(this.client_status.lastChannelCodecWarned !== currentChannel.getChannelId()) {
                    this.client_status.lastChannelCodecWarned = currentChannel.getChannelId();

                    if(!codecSupportEncode || !codecSupportDecode) {
                        let message;
                        if(!codecSupportEncode && !codecSupportDecode) {
                            message = tr("This channel has an unsupported codec.<br>You cant speak or listen to anybody within this channel!");
                        } else if(!codecSupportEncode) {
                            message = tr("This channel has an unsupported codec.<br>You cant speak within this channel!");
                        } else if(!codecSupportDecode) {
                            message = tr("This channel has an unsupported codec.<br>You cant listen to anybody within this channel!");
                        }

                        createErrorModal(tr("Channel codec unsupported"), message).open();
                    }
                }

                shouldRecord = codecSupportEncode && !!voiceConnection.voiceRecorder()?.input;
            }

            localClientUpdates.client_input_hardware = localClientUpdates.client_input_hardware && this.inputHardwareState === InputHardwareState.VALID;
            localClientUpdates.client_output_muted = this.client_status.output_muted;
            localClientUpdates.client_input_muted = this.client_status.input_muted;
            if(localClientUpdates.client_input_muted || localClientUpdates.client_output_muted) {
                shouldRecord = false;
            }

            /* update our owns client properties */
            {
                const currentClientProperties = this.getClient().properties;
                for(const key of Object.keys(localClientUpdates)) {
                    if(currentClientProperties[key] === localClientUpdates[key])
                        delete localClientUpdates[key];
                }

                if(Object.keys(localClientUpdates).length > 0) {
                    this.serverConnection.send_command("clientupdate", localClientUpdates).catch(error => {
                        log.warn(LogCategory.GENERAL, tr("Failed to update client audio hardware properties. Error: %o"), error);
                        this.log.log(EventType.ERROR_CUSTOM, { message: tr("Failed to update audio hardware properties.") });

                        /* Update these properties anyways (for case the server fails to handle the command) */
                        const updates = [];
                        for(const key of Object.keys(localClientUpdates))
                            updates.push({ key: key, value: localClientUpdates[key] ? "1" : "0" });
                        this.getClient().updateVariables(...updates);
                    });
                }
            }
        } else {
            /* we're not connect, so we should not record either */
        }

        /* update the recorder state */
        const currentInput = voiceConnection.voiceRecorder()?.input;
        if(currentInput) {
            if(shouldRecord || this.echoTestRunning) {
                if(this.getInputHardwareState() !== InputHardwareState.START_FAILED) {
                    this.startVoiceRecorder(Date.now() - this._last_record_error_popup > 10 * 1000).then(() => {
                        this.event_registry.fire("notify_state_updated", { state: "microphone" });
                    });
                }
            } else {
                currentInput.stop().catch(error => {
                    logWarn(LogCategory.AUDIO, tr("Failed to stop the microphone input recorder: %o"), error);
                }).then(() => {
                    this.event_registry.fire("notify_state_updated", { state: "microphone" });
                });
            }
        }
    }

    private _last_record_error_popup: number = 0;
    update_voice_status() {
        this.updateVoiceStatus();
        return;
    }

    sync_status_with_server() {
        if(this.serverConnection.connected())
            this.serverConnection.send_command("clientupdate", {
                client_input_muted: this.client_status.input_muted,
                client_output_muted: this.client_status.output_muted,
                client_away: typeof(this.client_status.away) === "string" || this.client_status.away,
                client_away_message: typeof(this.client_status.away) === "string" ? this.client_status.away : "",
                /* TODO: Somehow store this? */
                //client_input_hardware: this.client_status.sound_record_supported && this.getInputHardwareState() === InputHardwareState.VALID,
                //client_output_hardware: this.client_status.sound_playback_supported
            }).catch(error => {
                log.warn(LogCategory.GENERAL, tr("Failed to sync handler state with server. Error: %o"), error);
                this.log.log(EventType.ERROR_CUSTOM, {message: tr("Failed to sync handler state with server.")});
            });
    }

    /* can be called as much as you want, does nothing if nothing changed */
    async acquireInputHardware() {
        /* if we're having multiple recorders, try to get the right one */
        let recorder: RecorderProfile = defaultRecorder;

        try {
            await this.serverConnection.getVoiceConnection().acquireVoiceRecorder(recorder);
        } catch (error) {
            logError(LogCategory.AUDIO, tr("Failed to acquire recorder: %o"), error);
            createErrorModal(tr("Failed to acquire recorder"), tr("Failed to acquire recorder.\nLookup the console for more details.")).open();
            return;
        }

        if(this.connection_state === ConnectionState.CONNECTED) {
            await this.startVoiceRecorder(true);
        } else {
            this.setInputHardwareState(InputHardwareState.VALID);
        }
    }

    async startVoiceRecorder(notifyError: boolean) : Promise<{ state: "success" | "no-input" } | { state: "error", message: string }> {
        const input = this.getVoiceRecorder()?.input;
        if(!input) {
            return { state: "no-input" };
        }

        if(input.currentState() === InputState.PAUSED && this.connection_state === ConnectionState.CONNECTED) {
            try {
                const result = await input.start();
                if(result !== InputStartResult.EOK) {
                    throw result;
                }

                this.setInputHardwareState(InputHardwareState.VALID);
                this.update_voice_status();
                return { state: "success" };
            } catch (error) {
                this.setInputHardwareState(InputHardwareState.START_FAILED);
                this.update_voice_status();

                let errorMessage;
                if(error === InputStartResult.ENOTSUPPORTED) {
                    errorMessage = tr("Your browser does not support voice recording");
                } else if(error === InputStartResult.EBUSY) {
                    errorMessage = tr("The input device is busy");
                } else if(error === InputStartResult.EDEVICEUNKNOWN) {
                    errorMessage = tr("Invalid input device");
                } else if(error === InputStartResult.ENOTALLOWED) {
                    errorMessage = tr("No permissions");
                } else if(error instanceof Error) {
                    errorMessage = error.message;
                } else if(typeof error === "string") {
                    errorMessage = error;
                } else {
                    errorMessage = tr("lookup the console");
                }

                log.warn(LogCategory.VOICE, tr("Failed to start microphone input (%s)."), error);
                if(notifyError) {
                    this._last_record_error_popup = Date.now();
                    createErrorModal(tr("Failed to start recording"), tra("Microphone start failed.\nError: {}", errorMessage)).open();
                }
                return { state: "error", message: errorMessage };
            }
        } else {
            this.setInputHardwareState(InputHardwareState.VALID);
            return { state: "success" };
        }
    }

    getVoiceRecorder() : RecorderProfile | undefined { return this.serverConnection.getVoiceConnection().voiceRecorder(); }

    reconnect_properties(profile?: ConnectionProfile) : ConnectParameters {
        const name = (this.getClient() ? this.getClient().clientNickName() : "") ||
                        (this.serverConnection && this.serverConnection.handshake_handler() ? this.serverConnection.handshake_handler().parameters.nickname : "") ||
                        StaticSettings.instance.static(Settings.KEY_CONNECT_USERNAME, profile ? profile.defaultUsername : undefined) ||
                        "Another TeaSpeak user";
        const channel = (this.getClient() && this.getClient().currentChannel() ? this.getClient().currentChannel().channelId : 0) ||
                        (this.serverConnection && this.serverConnection.handshake_handler() ? (this.serverConnection.handshake_handler().parameters.channel || {} as any).target : "");
        const channel_password = (this.getClient() && this.getClient().currentChannel() ? this.getClient().currentChannel().cached_password() : "") ||
                                 (this.serverConnection && this.serverConnection.handshake_handler() ? (this.serverConnection.handshake_handler().parameters.channel || {} as any).password : "");
        return {
            channel: channel ? {target: "/" + channel, password: channel_password} : undefined,
            nickname: name,
            password: this.serverConnection && this.serverConnection.handshake_handler() ? this.serverConnection.handshake_handler().parameters.password : undefined
        }
    }

    update_avatar() {
        spawnAvatarUpload(data => {
            if(typeof(data) === "undefined")
                return;
            if(data === null) {
                log.info(LogCategory.CLIENT, tr("Deleting existing avatar"));
                this.serverConnection.send_command('ftdeletefile', {
                    name: "/avatar_", /* delete own avatar */
                    path: "",
                    cid: 0
                }).then(() => {
                    createInfoModal(tr("Avatar deleted"), tr("Avatar successfully deleted")).open();
                }).catch(error => {
                    log.error(LogCategory.GENERAL, tr("Failed to reset avatar flag: %o"), error);

                    let message;
                    if(error instanceof CommandResult)
                        message = formatMessage(tr("Failed to delete avatar.{:br:}Error: {0}"), error.extra_message || error.message);
                    if(!message)
                        message = formatMessage(tr("Failed to delete avatar.{:br:}Lookup the console for more details"));
                    createErrorModal(tr("Failed to delete avatar"), message).open();
                    return;
                });
            } else {
                log.info(LogCategory.CLIENT, tr("Uploading new avatar"));
                (async () => {
                    const transfer = this.fileManager.initializeFileUpload({
                        name: "/avatar",
                        path: "",

                        channel: 0,
                        channelPassword: undefined,

                        source: async () => await TransferProvider.provider().createBufferSource(data)
                    });

                    await transfer.awaitFinished();

                    if(transfer.transferState() !== FileTransferState.FINISHED) {
                        if(transfer.transferState() === FileTransferState.ERRORED) {
                            log.warn(LogCategory.FILE_TRANSFER, tr("Failed to upload clients avatar: %o"), transfer.currentError());
                            createErrorModal(tr("Failed to upload avatar"), traj("Failed to upload avatar:{:br:}{0}", transfer.currentErrorMessage())).open();
                            return;
                        } else if(transfer.transferState() === FileTransferState.CANCELED) {
                            createErrorModal(tr("Failed to upload avatar"), tr("Your avatar upload has been canceled.")).open();
                            return;
                        } else {
                            createErrorModal(tr("Failed to upload avatar"), tr("Avatar upload finished with an unknown finished state.")).open();
                            return;
                        }
                    }

                    try {
                        await this.serverConnection.send_command('clientupdate', {
                            client_flag_avatar: md5(new Uint8Array(data))
                        });
                    } catch(error) {
                        log.error(LogCategory.GENERAL, tr("Failed to update avatar flag: %o"), error);

                        let message;
                        if(error instanceof CommandResult)
                            message = formatMessage(tr("Failed to update avatar flag.{:br:}Error: {0}"), error.extra_message || error.message);
                        if(!message)
                            message = formatMessage(tr("Failed to update avatar flag.{:br:}Lookup the console for more details"));
                        createErrorModal(tr("Failed to set avatar"), message).open();
                        return;
                    }

                    createInfoModal(tr("Avatar successfully uploaded"), tr("Your avatar has been uploaded successfully!")).open();
                })();

            }
        });
    }

    private async initializeWhisperSession(session: WhisperSession) : Promise<WhisperSessionInitializeData> {
        /* TODO: Try to load the clients unique via a clientgetuidfromclid */
        if(!session.getClientUniqueId())
            throw "missing clients unique id";

        logInfo(LogCategory.CLIENT, tr("Initializing a whisper session for client %d (%s | %s)"), session.getClientId(), session.getClientUniqueId(), session.getClientName());
        return {
            clientName: session.getClientName(),
            clientUniqueId: session.getClientUniqueId(),

            blocked: session.getClientId() !== this.getClient().clientId(),
            volume: 1,

            sessionTimeout: 5 * 1000
        }
    }

    destroy() {
        this.event_registry.unregister_handler(this);
        this.cancel_reconnect(true);

        this.tag_connection_handler?.remove();
        this.tag_connection_handler = undefined;

        this.hostbanner?.destroy();
        this.hostbanner = undefined;

        this.pluginCmdRegistry?.destroy();
        this.pluginCmdRegistry = undefined;

        this._local_client?.destroy();
        this._local_client = undefined;

        this.channelTree?.destroy();
        this.channelTree = undefined;

        this.side_bar?.destroy();
        this.side_bar = undefined;

        this.log?.destroy();
        this.log = undefined;

        this.permissions?.destroy();
        this.permissions = undefined;

        this.groups?.destroy();
        this.groups = undefined;

        this.fileManager?.destroy();
        this.fileManager = undefined;

        this.serverFeatures?.destroy();
        this.serverFeatures = undefined;

        this.settings && this.settings.destroy();
        this.settings = undefined;

        if(this.serverConnection) {
            getServerConnectionFactory().destroy(this.serverConnection);
        }
        this.serverConnection = undefined;

        this.sound = undefined;
        this._local_client = undefined;
    }

    /* state changing methods */
    setMicrophoneMuted(muted: boolean) {
        if(this.client_status.input_muted === muted) return;
        this.client_status.input_muted = muted;
        this.sound.play(muted ? Sound.MICROPHONE_MUTED : Sound.MICROPHONE_ACTIVATED);
        this.update_voice_status();
        this.event_registry.fire("notify_state_updated", { state: "microphone" });
    }
    toggleMicrophone() { this.setMicrophoneMuted(!this.isMicrophoneMuted()); }

    isMicrophoneMuted() { return this.client_status.input_muted; }
    isMicrophoneDisabled() { return this.inputHardwareState !== InputHardwareState.VALID; }

    setSpeakerMuted(muted: boolean) {
        if(this.client_status.output_muted === muted) return;
        if(muted) this.sound.play(Sound.SOUND_MUTED); /* play the sound *before* we're setting the muted state */
        this.client_status.output_muted = muted;
        this.event_registry.fire("notify_state_updated", { state: "speaker" });
        if(!muted) this.sound.play(Sound.SOUND_ACTIVATED); /* play the sound *after* we're setting we've unmuted the sound */
        this.update_voice_status();
        this.serverConnection.getVoiceConnection().stopAllVoiceReplays();
    }

    toggleSpeakerMuted() { this.setSpeakerMuted(!this.isSpeakerMuted()); }
    isSpeakerMuted() { return this.client_status.output_muted; }

    /*
     * Returns whatever the client is able to playback sound (voice). Reasons for returning true could be:
     * - Channel codec isn't supported
     * - Voice bridge hasn't been set upped yet
     */
    //TODO: This currently returns false
    isSpeakerDisabled() : boolean { return false; }

    setSubscribeToAllChannels(flag: boolean) {
        if(this.client_status.channel_subscribe_all === flag) return;
        this.client_status.channel_subscribe_all = flag;
        if(flag)
            this.channelTree.subscribe_all_channels();
        else
            this.channelTree.unsubscribe_all_channels();
        this.event_registry.fire("notify_state_updated", { state: "subscribe" });
    }

    isSubscribeToAllChannels() : boolean { return this.client_status.channel_subscribe_all; }

    setAway(state: boolean | string) {
        this.doSetAway(state, true);
    }

    private doSetAway(state: boolean | string, play_sound: boolean) {
        if(this.client_status.away === state)
            return;

        const was_away = this.isAway();
        const will_away = typeof state === "boolean" ? state : true;
        if(was_away != will_away && play_sound)
            this.sound.play(will_away ? Sound.AWAY_ACTIVATED : Sound.AWAY_DEACTIVATED);

        this.client_status.away = state;
        this.serverConnection.send_command("clientupdate", {
            client_away: typeof(this.client_status.away) === "string" || this.client_status.away,
            client_away_message: typeof(this.client_status.away) === "string" ? this.client_status.away : "",
        }).catch(error => {
            log.warn(LogCategory.GENERAL, tr("Failed to update away status. Error: %o"), error);
            this.log.log(EventType.ERROR_CUSTOM, {message: tr("Failed to update away status.")});
        });

        this.event_registry.fire("notify_state_updated", {
            state: "away"
        });
    }
    toggleAway() { this.setAway(!this.isAway()); }
    isAway() : boolean { return typeof this.client_status.away !== "boolean" || this.client_status.away; }

    setQueriesShown(flag: boolean) {
        if(this.client_status.queries_visible === flag) return;
        this.client_status.queries_visible = flag;
        this.channelTree.toggle_server_queries(flag);

        this.event_registry.fire("notify_state_updated", {
            state: "query"
        });
    }

    areQueriesShown() : boolean {
        return this.client_status.queries_visible;
    }

    getInputHardwareState() : InputHardwareState { return this.inputHardwareState; }
    private setInputHardwareState(state: InputHardwareState) {
        if(this.inputHardwareState === state)
            return;

        this.inputHardwareState = state;
        this.event_registry.fire("notify_state_updated", { state: "microphone" });
    }

    hasOutputHardware() : boolean { return true; }

    getPluginCmdRegistry() : PluginCmdRegistry { return this.pluginCmdRegistry; }

    async startEchoTest() : Promise<void> {
        await this.serverConnection.getVoiceConnection().startWhisper({ target: "echo" });

        this.update_voice_status();
        try {
            this.echoTestRunning = true;
            const startResult = await this.startVoiceRecorder(false);

            /* FIXME: Don't do it like that! */
            this.getVoiceRecorder()?.input?.setFilterMode(FilterMode.Bypass);

            if(startResult.state === "error") {
                throw startResult.message;
            }
        } catch (error) {
            this.echoTestRunning = false;
            /* TODO: Restore voice recorder state! */
            throw error;
        }
    }

    stopEchoTest() {
        this.echoTestRunning = false;
        this.serverConnection.getVoiceConnection().stopWhisper();
        this.getVoiceRecorder()?.input?.setFilterMode(FilterMode.Filter);
        this.update_voice_status();
    }
}

export type ConnectionStateUpdateType = "microphone" | "speaker" | "away" | "subscribe" | "query";
export interface ConnectionEvents {
    notify_state_updated: {
        state: ConnectionStateUpdateType;
    }

    notify_connection_state_changed: {
        old_state: ConnectionState,
        new_state: ConnectionState
    },

    /* the handler has become visible/invisible for the client */
    notify_visibility_changed: {
        visible: boolean
    },

    /* fill only trigger once, after everything has been constructed */
    notify_handler_initialized: {}
}