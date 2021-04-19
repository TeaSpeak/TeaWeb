import {AbstractServerConnection} from "./connection/ConnectionBase";
import {PermissionManager} from "./permission/PermissionManager";
import {GroupManager} from "./permission/GroupManager";
import {ServerSettings, Settings, settings, StaticSettings} from "./settings";
import {Sound, SoundManager} from "./audio/Sounds";
import {ConnectionProfile} from "./profiles/ConnectionProfile";
import {LogCategory, logError, logInfo, logTrace, logWarn} from "./log";
import {createErrorModal, createInputModal, Modal} from "./ui/elements/Modal";
import {hashPassword} from "./utils/helpers";
import {HandshakeHandler} from "./connection/HandshakeHandler";
import {FilterMode, InputStartError, InputState} from "./voice/RecorderBase";
import {defaultRecorder, RecorderProfile} from "./voice/RecorderProfile";
import {formatMessage} from "./ui/frames/chat";
import {EventHandler, Registry} from "./events";
import {FileManager} from "./file/FileManager";
import {tr} from "./i18n/localize";
import {guid} from "./crypto/uid";
import {PluginCmdRegistry} from "./connection/PluginCmdHandler";
import {VoiceConnectionStatus, WhisperSessionInitializeData} from "./connection/VoiceConnection";
import {getServerConnectionFactory} from "./connection/ConnectionFactory";
import {WhisperSession} from "./voice/VoiceWhisper";
import {ServerFeature, ServerFeatures} from "./connection/ServerFeatures";
import {ChannelTree} from "./tree/ChannelTree";
import {LocalClientEntry} from "./tree/Client";
import {parseServerAddress} from "./tree/Server";
import {ChannelVideoFrame} from "tc-shared/ui/frames/video/Controller";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {ChannelConversationManager} from "./conversations/ChannelConversationManager";
import {PrivateConversationManager} from "tc-shared/conversations/PrivateConversationManager";
import {SelectedClientInfo} from "./SelectedClientInfo";
import {SideBarManager} from "tc-shared/SideBarManager";
import {ServerEventLog} from "tc-shared/connectionlog/ServerEventLog";
import {PlaylistManager} from "tc-shared/music/PlaylistManager";
import {connectionHistory} from "tc-shared/connectionlog/History";
import {ConnectParameters} from "tc-shared/ui/modal/connect/Controller";
import {assertMainApplication} from "tc-shared/ui/utils";
import {getDNSProvider} from "tc-shared/dns";
import {W2GPluginCmdHandler} from "tc-shared/ui/modal/video-viewer/W2GPlugin";
import ipRegex from "ip-regex";
import * as htmltags from "./ui/htmltags";

assertMainApplication();

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

export interface ConnectParametersOld {
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

    private readonly events_: Registry<ConnectionEvents>;
    channelTree: ChannelTree;

    connection_state: ConnectionState = ConnectionState.UNCONNECTED;
    serverConnection: AbstractServerConnection;
    currentConnectId: number; /* Id used for the connection history */

    fileManager: FileManager;

    permissions: PermissionManager;
    groups: GroupManager;

    video_frame: ChannelVideoFrame;

    settings: ServerSettings;
    sound: SoundManager;

    serverFeatures: ServerFeatures;
    log: ServerEventLog;

    private sideBar: SideBarManager;
    private playlistManager: PlaylistManager;

    private channelConversations: ChannelConversationManager;
    private privateConversations: PrivateConversationManager;

    private clientInfoManager: SelectedClientInfo;

    private localClientId: number = 0;
    private localClient: LocalClientEntry;

    private autoReconnectTimer: number;
    private autoReconnectAttempt: boolean = false;

    private connectAttemptId: number = 1;
    private echoTestRunning = false;

    private pluginCmdRegistry: PluginCmdRegistry;

    private handlerState: LocalClientStatus = {
        input_muted: false,

        output_muted: false,
        away: false,
        channel_subscribe_all: true,
        queries_visible: false,

        lastChannelCodecWarned: -1
    };
    private clientStatusSync = false;

    private inputHardwareState: InputHardwareState = InputHardwareState.MISSING;
    private listenerRecorderInputDeviceChanged: (() => void);

    constructor() {
        this.handlerId = guid();
        this.events_ = new Registry<ConnectionEvents>();
        this.events_.enableDebug("connection-handler");

        this.settings = new ServerSettings();

        this.serverConnection = getServerConnectionFactory().create(this);
        this.serverConnection.events.on("notify_connection_state_changed", event => {
            logTrace(LogCategory.CLIENT, tr("From %s to %s"), ConnectionState[event.oldState], ConnectionState[event.newState]);
            this.events_.fire("notify_connection_state_changed", {
                oldState: event.oldState,
                newState: event.newState
            });
        });

        this.serverConnection.getVoiceConnection().events.on("notify_recorder_changed", event => {
            this.setInputHardwareState(this.getVoiceRecorder() ? InputHardwareState.VALID : InputHardwareState.MISSING);
            this.updateVoiceStatus();

            if(this.listenerRecorderInputDeviceChanged) {
                this.listenerRecorderInputDeviceChanged();
                this.listenerRecorderInputDeviceChanged = undefined;
            }

            if(event.newRecorder) {
                this.listenerRecorderInputDeviceChanged = event.newRecorder.input?.events.on("notify_device_changed", () => {
                    this.setInputHardwareState(InputHardwareState.VALID);
                    this.updateVoiceStatus();
                });
            }
        });
        this.serverConnection.getVoiceConnection().events.on("notify_connection_status_changed", () => this.update_voice_status());
        this.serverConnection.getVoiceConnection().setWhisperSessionInitializer(this.initializeWhisperSession.bind(this));

        this.serverFeatures = new ServerFeatures(this);
        this.groups = new GroupManager(this);

        this.channelTree = new ChannelTree(this);
        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);
        this.playlistManager = new PlaylistManager(this);

        this.sideBar = new SideBarManager(this);
        this.privateConversations = new PrivateConversationManager(this);
        this.channelConversations = new ChannelConversationManager(this);
        this.clientInfoManager = new SelectedClientInfo(this);

        this.pluginCmdRegistry = new PluginCmdRegistry(this);
        this.video_frame = new ChannelVideoFrame(this);

        this.log = new ServerEventLog(this);
        this.sound = new SoundManager(this);

        this.localClient = new LocalClientEntry(this);
        this.localClient.channelTree = this.channelTree;

        this.events_.registerHandler(this);
        this.pluginCmdRegistry.registerHandler(new W2GPluginCmdHandler());

        this.events_.fire("notify_handler_initialized");
    }

    initializeHandlerState(source?: ConnectionHandler) {
        if(source) {
            this.handlerState.input_muted = source.handlerState.input_muted;
            this.handlerState.output_muted = source.handlerState.output_muted;
            this.update_voice_status();

            this.setAway(source.handlerState.away);
            this.setQueriesShown(source.handlerState.queries_visible);
            this.setSubscribeToAllChannels(source.handlerState.channel_subscribe_all);
            /* Ignore lastChannelCodecWarned */
        } else {
            this.handlerState.input_muted = settings.getValue(Settings.KEY_CLIENT_STATE_MICROPHONE_MUTED);
            this.handlerState.output_muted = settings.getValue(Settings.KEY_CLIENT_STATE_SPEAKER_MUTED);
            this.update_voice_status();

            this.setSubscribeToAllChannels(settings.getValue(Settings.KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS));
            this.doSetAway(settings.getValue(Settings.KEY_CLIENT_STATE_AWAY) ? settings.getValue(Settings.KEY_CLIENT_AWAY_MESSAGE) : false, false);
            this.setQueriesShown(settings.getValue(Settings.KEY_CLIENT_STATE_QUERY_SHOWN));
        }
    }

    events() : Registry<ConnectionEvents> {
        return this.events_;
    }

    async startConnectionNew(parameters: ConnectParameters, autoReconnectAttempt: boolean) {
        this.cancelAutoReconnect(true);
        this.autoReconnectAttempt = autoReconnectAttempt;
        this.handleDisconnect(DisconnectReason.REQUESTED);

        const localConnectionAttemptId = ++this.connectAttemptId;

        const parsedAddress = parseServerAddress(parameters.targetAddress);
        const resolvedAddress = Object.assign({}, parsedAddress);

        this.log.log("connection.begin", {
            address: {
                server_hostname: parsedAddress.host,
                server_port: parsedAddress.port
            },
            client_nickname: parameters.nickname
        });

        this.channelTree.initialiseHead(parameters.targetAddress, parsedAddress);

        /* hash the password if not already hashed */
        if(parameters.serverPassword && !parameters.serverPasswordHashed) {
            try {
                parameters.serverPassword = await hashPassword(parameters.serverPassword);
                parameters.serverPasswordHashed = true;
            } catch(error) {
                logError(LogCategory.CLIENT, tr("Failed to hash connect password: %o"), error);
                createErrorModal(tr("Error while hashing password"), tr("Failed to hash server password!<br>") + error).open();
                /* FIXME: Abort connection attempt */
            }

            if(this.connectAttemptId !== localConnectionAttemptId) {
                /* Our attempt has been aborted */
                return;
            }
        }

        if(parameters.defaultChannelPassword && !parameters.defaultChannelPasswordHashed) {
            try {
                parameters.defaultChannelPassword = await hashPassword(parameters.defaultChannelPassword);
                parameters.defaultChannelPasswordHashed = true;
            } catch(error) {
                logError(LogCategory.CLIENT, tr("Failed to hash channel password: %o"), error);
                createErrorModal(tr("Error while hashing password"), tr("Failed to hash channel password!<br>") + error).open();
                /* FIXME: Abort connection attempt */
            }

            if(this.connectAttemptId !== localConnectionAttemptId) {
                /* Our attempt has been aborted */
                return;
            }
        }

        if(ipRegex({ exact: true }).test(resolvedAddress.host)) {
            /* We don't have to resolve the target host */
        } else {
            this.log.log("connection.hostname.resolve", {});
            try {
                const resolved = await getDNSProvider().resolveAddress({ hostname: parsedAddress.host, port: parsedAddress.port }, { timeout: 5000 });
                if(this.connectAttemptId !== localConnectionAttemptId) {
                    /* Our attempt has been aborted */
                    return;
                }

                if(resolved.status === "empty-result") {
                    throw tr("address resolve result empty");
                } else if(resolved.status === "error") {
                    throw resolved.message;
                }

                resolvedAddress.host = resolved.resolvedAddress.hostname;
                resolvedAddress.port = resolved.resolvedAddress.port;
                if(typeof resolvedAddress.port !== "number") {
                    resolvedAddress.port = parsedAddress.port;
                }

                this.log.log("connection.hostname.resolved", {
                    address: {
                        server_port: resolvedAddress.port,
                        server_hostname: resolvedAddress.host
                    }
                });
            } catch(error) {
                if(this.connectAttemptId !== localConnectionAttemptId) {
                    /* Our attempt has been aborted */
                    return;
                }

                this.handleDisconnect(DisconnectReason.DNS_FAILED, error);
                return;
            }
        }

        if(this.autoReconnectAttempt) {
            /* this.currentConnectId = 0; */
            /* Reconnect attempts are connecting to the last server. No need to update the general attempt id */
        } else {
            this.currentConnectId = await connectionHistory.logConnectionAttempt({
                nickname: parameters.nicknameSpecified ? parameters.nickname : undefined,
                hashedPassword: parameters.serverPassword, /* Password will be hashed by now! */
                targetAddress: parameters.targetAddress,
            });
        }

        await this.serverConnection.connect(resolvedAddress, new HandshakeHandler(parameters));
    }

    async startConnection(addr: string, profile: ConnectionProfile, user_action: boolean, parameters: ConnectParametersOld) {
        await this.startConnectionNew({
            profile: profile,
            targetAddress: addr,

            nickname: parameters.nickname,
            nicknameSpecified: true,

            serverPassword: parameters.password?.password,
            serverPasswordHashed: parameters.password?.hashed,

            defaultChannel: parameters?.channel?.target,
            defaultChannelPassword: parameters?.channel?.password,

            token: parameters.token
        }, !user_action);
    }

    async disconnectFromServer(reason?: string) {
        this.cancelAutoReconnect(true);
        if(!this.connected) {
            return;
        }

        this.handleDisconnect(DisconnectReason.REQUESTED);
        try {
            await this.serverConnection.disconnect();
        } catch (error) {
            logWarn(LogCategory.CLIENT, tr("Failed to successfully disconnect from server: {}"), error);
        }
        this.sound.play(Sound.CONNECTION_DISCONNECTED);
        this.log.log("disconnected", {});
    }

    getClient() : LocalClientEntry { return this.localClient; }
    getClientId() { return this.localClientId; }

    getPrivateConversations() : PrivateConversationManager {
        return this.privateConversations;
    }

    getChannelConversations() : ChannelConversationManager {
        return this.channelConversations;
    }

    getSelectedClientInfo() : SelectedClientInfo {
        return this.clientInfoManager;
    }

    getSideBar() : SideBarManager {
        return this.sideBar;
    }

    getPlaylistManager() : PlaylistManager {
        return this.playlistManager;
    }

    initializeLocalClient(clientId: number, acceptedName: string) {
        this.localClientId = clientId;
        this.localClient["_clientId"] = clientId;

        this.channelTree.registerClient(this.localClient);
        this.localClient.updateVariables( { key: "client_nickname", value: acceptedName });
    }

    getServerConnection() : AbstractServerConnection { return this.serverConnection; }


    @EventHandler<ConnectionEvents>("notify_connection_state_changed")
    private handleConnectionStateChanged(event: ConnectionEvents["notify_connection_state_changed"]) {
        this.connection_state = event.newState;
        if(event.newState === ConnectionState.CONNECTED) {
            logInfo(LogCategory.CLIENT, tr("Client connected"));
            this.log.log("connection.connected", {
                serverAddress: {
                    server_port: this.channelTree.server.remote_address.port,
                    server_hostname: this.channelTree.server.remote_address.host
                },
                serverName: this.channelTree.server.properties.virtualserver_name,
                own_client: this.getClient().log_data()
            });
            this.sound.play(Sound.CONNECTION_CONNECTED);

            this.permissions.requestPermissionList();
            /*
            There is no need to request the server groups since they must be send by the server
            if(this.groups.serverGroups.length == 0) {
                this.groups.requestGroups();
            }
            */

            this.settings.setServer(this.channelTree.server.properties.virtualserver_unique_identifier);

            /* apply the server settings */
            if(this.handlerState.channel_subscribe_all) {
                this.channelTree.subscribe_all_channels();
            } else {
                this.channelTree.unsubscribe_all_channels();
            }
            this.channelTree.toggle_server_queries(this.handlerState.queries_visible);

            this.sync_status_with_server();
            this.channelTree.server.updateProperties();
            /*
            No need to update the voice stuff because as soon we see ourself we're doing it
            this.update_voice_status();
            if(control_bar.current_connection_handler() === this)
                control_bar.apply_server_voice_state();
            */

            if(__build.target === "web" && settings.getValue(Settings.KEY_VOICE_ECHO_TEST_ENABLED)) {
                this.serverFeatures.awaitFeatures().then(result => {
                    if(!result) {
                        return;
                    }

                    if(this.serverFeatures.supportsFeature(ServerFeature.WHISPER_ECHO)) {
                        global_client_actions.fire("action_open_window", { window: "server-echo-test", connection: this });
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

    private generate_ssl_certificate_accept() : HTMLAnchorElement {
        const properties = {
            connect_default: true,
            connect_profile: this.serverConnection.handshake_handler().parameters.profile.id,
            connect_address: this.serverConnection.remote_address().host + (this.serverConnection.remote_address().port !== 9987 ? ":" + this.serverConnection.remote_address().port : "")
        };

        const build_url = (base: string, search: string, props: any) => {
            const parameters: string[] = [];
            for(const key of Object.keys(props)) {
                parameters.push(key + "=" + encodeURIComponent(props[key]));
            }

            let callback = base + search; /* don't use document.URL because it may contains a #! */
            if(!search) {
                callback += "?" + parameters.join("&");
            } else {
                callback += "&" + parameters.join("&");
            }

            return "https://" + this.serverConnection.remote_address().host + ":" + this.serverConnection.remote_address().port + "/?forward_url=" + encodeURIComponent(callback);
        };

        /* generate the tag */
        const tag = document.createElement("a");
        tag.text = tr("here");

        let pathname = document.location.pathname;
        if(pathname.endsWith(".php"))
            pathname = pathname.substring(0, pathname.lastIndexOf("/"));

        tag.href = build_url(document.location.origin + pathname, document.location.search, properties);
        return tag;
    }

    private _certificate_modal: Modal;
    handleDisconnect(type: DisconnectReason, data: any = {}) {
        this.connectAttemptId++;

        let autoReconnect = false;
        switch (type) {
            case DisconnectReason.REQUESTED:
            case DisconnectReason.SERVER_HOSTMESSAGE: /* already handled */
                break;
            case DisconnectReason.HANDLER_DESTROYED:
                if(data) {
                    this.sound.play(Sound.CONNECTION_DISCONNECTED);
                    this.log.log("disconnected", {});
                }
                break;
            case DisconnectReason.DNS_FAILED:
                logError(LogCategory.CLIENT, tr("Failed to resolve hostname: %o"), data);
                this.log.log("connection.hostname.resolve.error", {
                    message: data as any
                });
                this.sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.CONNECT_FAILURE:
                if(this.autoReconnectAttempt) {
                    autoReconnect = true;
                    break;
                }

                if(data) {
                    logError(LogCategory.CLIENT, tr("Could not connect to remote host! Extra data: %o"), data);
                } else {
                    logError(LogCategory.CLIENT, tr("Could not connect to remote host!"), data);
                }

                if(__build.target === "client") {
                    createErrorModal(
                        tr("Could not connect"),
                        tr("Could not connect to remote host (Connection refused)")
                    ).open();
                } else {
                    const generateAddressPart = () => Math.floor(Math.random() * 256);
                    const addressParts = [generateAddressPart(), generateAddressPart(), generateAddressPart(), generateAddressPart()];
                    getDNSProvider().resolveAddressIPv4({
                        hostname: addressParts.join("-") + ".con-gate.work",
                        port: 9987
                    }, { timeout: 5000 }).then(async result => {
                        if(result.status === "empty-result") {
                            throw tr("empty result");
                        } else if(result.status === "error") {
                            throw result.message;
                        }

                        if(result.resolvedAddress.hostname !== addressParts.join(".")) {
                            throw "miss matching address";
                        }

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
                this.log.log("connection.failed", {
                    serverAddress: {
                        server_hostname: this.serverConnection.remote_address().host,
                        server_port: this.serverConnection.remote_address().port
                    }
                });
                this.sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.HANDSHAKE_FAILED:
                //TODO sound
                logError(LogCategory.CLIENT, tr("Failed to process handshake: %o"), data);
                createErrorModal(
                    tr("Could not connect"),
                    tr("Failed to process handshake: ") + data as string
                ).open();
                break;
            case DisconnectReason.HANDSHAKE_TEAMSPEAK_REQUIRED:
                createErrorModal(
                    tr("Target server is a TeamSpeak server"),
                    tr("The target server is a TeamSpeak 3 server!\nOnly TeamSpeak 3 based identities are able to connect.\nPlease select another profile or change the identify type.")
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);
                autoReconnect = false;
                break;
            case DisconnectReason.IDENTITY_TOO_LOW:
                createErrorModal(
                    tr("Identity level is too low"),
                    formatMessage(tr("You've been disconnected, because your Identity level is too low.{:br:}You need at least a level of {0}"), data["extra_message"])
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                autoReconnect = false;
                break;
            case DisconnectReason.CONNECTION_CLOSED:
                logError(LogCategory.CLIENT, tr("Lost connection to remote server!"));
                if(!this.autoReconnectAttempt) {
                    createErrorModal(
                        tr("Connection closed"),
                        tr("The connection was closed by remote host")
                    ).open();
                }
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                autoReconnect = true;
                break;
            case DisconnectReason.CONNECTION_PING_TIMEOUT:
                logError(LogCategory.CLIENT, tr("Connection ping timeout"));
                this.sound.play(Sound.CONNECTION_DISCONNECTED_TIMEOUT);
                createErrorModal(
                    tr("Connection lost"),
                    tr("Lost connection to remote host (Ping timeout)<br>Even possible?")
                ).open();

                break;
            case DisconnectReason.SERVER_CLOSED:
                this.log.log("server.closed", {message: data.reasonmsg});

                createErrorModal(
                    tr("Server closed"),
                    "The server is closed.<br>" + //TODO tr
                            "Reason: " + data.reasonmsg
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                autoReconnect = true;
                break;
            case DisconnectReason.SERVER_REQUIRES_PASSWORD:
                this.log.log("server.requires.password", {});

                createInputModal(tr("Server password"), tr("Enter server password:"), password => password.length != 0, async password => {
                    if(typeof password !== "string") {
                        return;
                    }

                    const profile = this.serverConnection.handshake_handler().parameters.profile;
                    const cprops = this.reconnect_properties(profile);
                    cprops.password = {
                        password: await hashPassword(password),
                        hashed: true
                    };

                    if(this.currentConnectId >= 0) {
                        connectionHistory.updateConnectionServerPassword(this.currentConnectId, cprops.password.password)
                            .catch(error => {
                                logWarn(LogCategory.GENERAL, tr("Failed to update the connection server password: %o"), error);
                            });
                    }
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
                autoReconnect = false;
                break;
            case DisconnectReason.HANDSHAKE_BANNED:
                //Reason message already printed because of the command error handling
                this.sound.play(Sound.CONNECTION_BANNED);
                break;
            case DisconnectReason.CLIENT_BANNED:
                this.log.log("server.banned", {
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
                logError(LogCategory.CLIENT, tr("Got uncaught disconnect!"));
                logError(LogCategory.CLIENT, tr("Type: %o Data: %o"), type, data);
                break;
        }

        this.channelTree.unregisterClient(this.localClient); /* if we dont unregister our client here the client will be destroyed */
        this.channelTree.reset();
        if(this.serverConnection) {
            this.serverConnection.disconnect();
        }

        this.handlerState.lastChannelCodecWarned = 0;

        if(autoReconnect) {
            if(!this.serverConnection) {
                logInfo(LogCategory.NETWORKING, tr("Allowed to auto reconnect but cant reconnect because we dont have any information left..."));
                return;
            }
            this.log.log("reconnect.scheduled", {timeout: 5000});

            logInfo(LogCategory.NETWORKING, tr("Allowed to auto reconnect. Reconnecting in 5000ms"));
            const server_address = this.serverConnection.remote_address();
            const profile = this.serverConnection.handshake_handler().parameters.profile;

            this.autoReconnectTimer = setTimeout(() => {
                this.autoReconnectTimer = undefined;
                this.log.log("reconnect.execute", {});
                logInfo(LogCategory.NETWORKING, tr("Reconnecting..."));

                this.startConnection(server_address.host + ":" + server_address.port, profile, false, Object.assign(this.reconnect_properties(profile), {auto_reconnect_attempt: true}));
            }, 5000);
        }

        this.serverConnection.updateConnectionState(ConnectionState.UNCONNECTED); /* Fix for the native client... */
    }

    cancelAutoReconnect(log_event: boolean) {
        if(this.autoReconnectTimer) {
            if(log_event) {
                this.log.log("reconnect.canceled", {});
            }

            clearTimeout(this.autoReconnectTimer);
            this.autoReconnectTimer = undefined;
        }
    }

    private updateVoiceStatus() {
        if(!this.localClient) {
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

                if(this.handlerState.lastChannelCodecWarned !== currentChannel.getChannelId()) {
                    this.handlerState.lastChannelCodecWarned = currentChannel.getChannelId();

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
            localClientUpdates.client_output_muted = this.handlerState.output_muted;
            localClientUpdates.client_input_muted = this.handlerState.input_muted;
            if(localClientUpdates.client_input_muted || localClientUpdates.client_output_muted) {
                shouldRecord = false;
            }

            /* update our owns client properties */
            {
                const currentClientProperties = this.getClient().properties;
                if(this.clientStatusSync) {
                    for(const key of Object.keys(localClientUpdates)) {
                        if(currentClientProperties[key] === localClientUpdates[key])
                            delete localClientUpdates[key];
                    }
                }

                if(Object.keys(localClientUpdates).length > 0) {
                    /* directly update all update locally so we don't send updates twice */
                    const updates = [];
                    for(const key of Object.keys(localClientUpdates)) {
                        updates.push({ key: key, value: localClientUpdates[key] ? "1" : "0" });
                    }

                    this.getClient().updateVariables(...updates);

                    this.clientStatusSync = true;
                    if(this.connected) {
                        this.serverConnection.send_command("clientupdate", localClientUpdates).catch(error => {
                            logWarn(LogCategory.GENERAL, tr("Failed to update client audio hardware properties. Error: %o"), error);
                            this.log.log("error.custom", { message: tr("Failed to update audio hardware properties.") });
                            this.clientStatusSync = false;
                        });
                    }
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
                    this.startVoiceRecorder(Date.now() - this.lastRecordErrorPopup > 10 * 1000).then(() => {
                        this.events_.fire("notify_state_updated", { state: "microphone" });
                    });
                }
            } else {
                currentInput.stop().catch(error => {
                    logWarn(LogCategory.AUDIO, tr("Failed to stop the microphone input recorder: %o"), error);
                }).then(() => {
                    this.events_.fire("notify_state_updated", { state: "microphone" });
                });
            }
        }
    }

    private lastRecordErrorPopup: number = 0;
    update_voice_status() {
        this.updateVoiceStatus();
        return;
    }

    sync_status_with_server() {
        if(this.serverConnection.connected())
            this.serverConnection.send_command("clientupdate", {
                client_input_muted: this.handlerState.input_muted,
                client_output_muted: this.handlerState.output_muted,
                client_away: typeof(this.handlerState.away) === "string" || this.handlerState.away,
                client_away_message: typeof(this.handlerState.away) === "string" ? this.handlerState.away : "",
                /* TODO: Somehow store this? */
                //client_input_hardware: this.client_status.sound_record_supported && this.getInputHardwareState() === InputHardwareState.VALID,
                //client_output_hardware: this.client_status.sound_playback_supported
            }).catch(error => {
                logWarn(LogCategory.GENERAL, tr("Failed to sync handler state with server. Error: %o"), error);
                this.log.log("error.custom", {message: tr("Failed to sync handler state with server.")});
            });
    }

    /* can be called as much as you want, does nothing if nothing changed */
    async acquireInputHardware() {
        try {
            await this.serverConnection.getVoiceConnection().acquireVoiceRecorder(defaultRecorder);
        } catch (error) {
            logError(LogCategory.AUDIO, tr("Failed to acquire recorder: %o"), error);
            createErrorModal(tr("Failed to acquire recorder"), tr("Failed to acquire recorder.\nLookup the console for more details.")).open();
            return;
        }

        /* our voice status will be updated automatically due to the notify_recorder_changed event which should be fired when the acquired recorder changed */
    }

    async startVoiceRecorder(notifyError: boolean) : Promise<{ state: "success" | "no-input" } | { state: "error", message: string }> {
        const input = this.getVoiceRecorder()?.input;
        if(!input) {
            return { state: "no-input" };
        }

        if(input.currentState() === InputState.PAUSED && this.connection_state === ConnectionState.CONNECTED) {
            try {
                const result = await input.start();
                if(result !== true) {
                    throw result;
                }

                this.setInputHardwareState(InputHardwareState.VALID);
                this.updateVoiceStatus();
                return { state: "success" };
            } catch (error) {
                this.setInputHardwareState(InputHardwareState.START_FAILED);
                this.updateVoiceStatus();

                let errorMessage;
                if(error === InputStartError.ENOTSUPPORTED) {
                    errorMessage = tr("Your browser does not support voice recording");
                } else if(error === InputStartError.EBUSY) {
                    errorMessage = tr("The input device is busy");
                } else if(error === InputStartError.EDEVICEUNKNOWN) {
                    errorMessage = tr("Invalid input device");
                } else if(error === InputStartError.ENOTALLOWED) {
                    errorMessage = tr("No permissions");
                } else if(error === InputStartError.ESYSTEMUNINITIALIZED) {
                    errorMessage = tr("Window audio not initialized.");
                } else if(error instanceof Error) {
                    errorMessage = error.message;
                } else if(typeof error === "string") {
                    errorMessage = error;
                } else {
                    errorMessage = tr("lookup the console");
                }

                logWarn(LogCategory.VOICE, tr("Failed to start microphone input (%o)."), error);
                if(notifyError) {
                    this.lastRecordErrorPopup = Date.now();
                    createErrorModal(tr("Failed to start recording"), tra("Microphone start failed.\nError: {}", errorMessage)).open();
                }
                return { state: "error", message: errorMessage };
            }
        } else {
            this.setInputHardwareState(InputHardwareState.VALID);
            return { state: "success" };
        }
    }

    getVoiceRecorder() : RecorderProfile | undefined { return this.serverConnection?.getVoiceConnection().voiceRecorder(); }


    reconnect_properties(profile?: ConnectionProfile) : ConnectParametersOld {
        const name = (this.getClient() ? this.getClient().clientNickName() : "") ||
                        (this.serverConnection?.handshake_handler() ? this.serverConnection.handshake_handler().parameters.nickname : "") ||
                        StaticSettings.instance.static(Settings.KEY_CONNECT_USERNAME, profile ? profile.defaultUsername : undefined) ||
                        "Another TeaSpeak user";

        const targetChannel = this.getClient().currentChannel();
        const connectParameters = this.serverConnection.handshake_handler().parameters;

        return {
            channel: targetChannel ? {target: "/" + targetChannel.channelId, password: targetChannel.getCachedPasswordHash()} : undefined,
            nickname: name,
            password: connectParameters.serverPassword ? {
                password: connectParameters.serverPassword,
                hashed: connectParameters.serverPasswordHashed
            } : undefined
        }
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
        this.events_.unregisterHandler(this);
        this.cancelAutoReconnect(true);

        this.pluginCmdRegistry?.destroy();
        this.pluginCmdRegistry = undefined;

        if(this.localClient) {
            const voiceHandle = this.localClient.getVoiceClient();
            if(voiceHandle) {
                logWarn(LogCategory.GENERAL, tr("Local voice client has received a voice handle. This should never happen!"));
                this.localClient.setVoiceClient(undefined);
                this.serverConnection.getVoiceConnection().unregisterVoiceClient(voiceHandle);
            }
            const videoHandle = this.localClient.getVideoClient();
            if(videoHandle) {
                logWarn(LogCategory.GENERAL, tr("Local voice client has received a video handle. This should never happen!"));
                this.localClient.setVoiceClient(undefined);
                this.serverConnection.getVideoConnection().unregisterVideoClient(videoHandle);
            }
            this.localClient.destroy();
        }
        this.localClient = undefined;

        this.privateConversations?.destroy();
        this.privateConversations = undefined;

        this.channelConversations?.destroy();
        this.channelConversations = undefined;

        this.channelTree?.destroy();
        this.channelTree = undefined;

        this.sideBar?.destroy();
        this.sideBar = undefined;

        this.playlistManager?.destroy();
        this.playlistManager = undefined;

        this.clientInfoManager?.destroy();
        this.clientInfoManager = undefined;

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

        this.settings?.destroy();
        this.settings = undefined;

        if(this.listenerRecorderInputDeviceChanged) {
            this.listenerRecorderInputDeviceChanged();
            this.listenerRecorderInputDeviceChanged = undefined;
        }

        if(this.serverConnection) {
            getServerConnectionFactory().destroy(this.serverConnection);
        }
        this.serverConnection = undefined;

        this.sound = undefined;
        this.localClient = undefined;
    }

    /* state changing methods */
    setMicrophoneMuted(muted: boolean, dontPlaySound?: boolean) {
        if(this.handlerState.input_muted === muted) {
            return;
        }

        this.handlerState.input_muted = muted;
        if(!dontPlaySound) {
            this.sound.play(muted ? Sound.MICROPHONE_MUTED : Sound.MICROPHONE_ACTIVATED);
        }
        this.update_voice_status();
        this.events_.fire("notify_state_updated", { state: "microphone" });
    }
    toggleMicrophone() { this.setMicrophoneMuted(!this.isMicrophoneMuted()); }

    isMicrophoneMuted() { return this.handlerState.input_muted; }
    isMicrophoneDisabled() { return this.inputHardwareState !== InputHardwareState.VALID; }

    setSpeakerMuted(muted: boolean, dontPlaySound?: boolean) {
        if(this.handlerState.output_muted === muted) {
            return;
        }

        if(muted && !dontPlaySound) {
            /* play the sound *before* we're setting the muted state */
            this.sound.play(Sound.SOUND_MUTED);
        }
        this.handlerState.output_muted = muted;
        this.events_.fire("notify_state_updated", { state: "speaker" });
        if(!muted && !dontPlaySound) {
            /* play the sound *after* we're setting we've unmuted the sound */
            this.sound.play(Sound.SOUND_ACTIVATED);
        }
        this.update_voice_status();
        this.serverConnection.getVoiceConnection().stopAllVoiceReplays();
    }

    toggleSpeakerMuted() { this.setSpeakerMuted(!this.isSpeakerMuted()); }
    isSpeakerMuted() { return this.handlerState.output_muted; }

    /*
     * Returns whatever the client is able to playback sound (voice). Reasons for returning true could be:
     * - Channel codec isn't supported
     * - Voice bridge hasn't been set upped yet
     */
    //TODO: This currently returns false
    isSpeakerDisabled() : boolean { return false; }

    setSubscribeToAllChannels(flag: boolean) {
        if(this.handlerState.channel_subscribe_all === flag) {
            return;
        }

        this.handlerState.channel_subscribe_all = flag;
        if(flag) {
            this.channelTree.subscribe_all_channels();
        } else {
            this.channelTree.unsubscribe_all_channels();
        }
        this.events_.fire("notify_state_updated", { state: "subscribe" });
    }

    isSubscribeToAllChannels() : boolean { return this.handlerState.channel_subscribe_all; }

    setAway(state: boolean | string) {
        this.doSetAway(state, true);
    }

    private doSetAway(state: boolean | string, playSound: boolean) {
        if(this.handlerState.away === state) {
            return;
        }

        const wasAway = this.isAway();
        const willAway = typeof state === "boolean" ? state : true;
        if(wasAway != willAway && playSound) {
            this.sound.play(willAway ? Sound.AWAY_ACTIVATED : Sound.AWAY_DEACTIVATED);
        }

        this.handlerState.away = state;
        this.serverConnection.send_command("clientupdate", {
            client_away: typeof(this.handlerState.away) === "string" || this.handlerState.away,
            client_away_message: typeof(this.handlerState.away) === "string" ? this.handlerState.away : "",
        }).catch(error => {
            logWarn(LogCategory.GENERAL, tr("Failed to update away status. Error: %o"), error);
            this.log.log("error.custom", {message: tr("Failed to update away status.")});
        });

        this.events_.fire("notify_state_updated", {
            state: "away"
        });
    }
    toggleAway() { this.setAway(!this.isAway()); }
    isAway() : boolean { return typeof this.handlerState.away !== "boolean" || this.handlerState.away; }

    setQueriesShown(flag: boolean) {
        if(this.handlerState.queries_visible === flag) {
            return;
        }
        this.handlerState.queries_visible = flag;
        this.channelTree.toggle_server_queries(flag);

        this.events_.fire("notify_state_updated", {
            state: "query"
        });
    }

    areQueriesShown() : boolean {
        return this.handlerState.queries_visible;
    }

    getInputHardwareState() : InputHardwareState { return this.inputHardwareState; }
    private setInputHardwareState(state: InputHardwareState) {
        if(this.inputHardwareState === state) {
            return;
        }

        this.inputHardwareState = state;
        this.events_.fire("notify_state_updated", { state: "microphone" });
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

    getCurrentServerUniqueId() {
        return this.channelTree.server.properties.virtualserver_unique_identifier;
    }
}

export type ConnectionStateUpdateType = "microphone" | "speaker" | "away" | "subscribe" | "query";
export interface ConnectionEvents {
    notify_state_updated: {
        state: ConnectionStateUpdateType;
    }

    notify_connection_state_changed: {
        oldState: ConnectionState,
        newState: ConnectionState
    },

    /* fill only trigger once, after everything has been constructed */
    notify_handler_initialized: {}
}