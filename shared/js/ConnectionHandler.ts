/// <reference path="log.ts" />
/// <reference path="proto.ts" />
/// <reference path="ui/view.ts" />
/// <reference path="settings.ts" />
/// <reference path="FileManager.ts" />
/// <reference path="permission/PermissionManager.ts" />
/// <reference path="permission/GroupManager.ts" />
/// <reference path="ui/frames/ControlBar.ts" />
/// <reference path="connection/ConnectionBase.ts" />

enum DisconnectReason {
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

enum ConnectionState {
    UNCONNECTED,
    CONNECTING,
    INITIALISING,
    CONNECTED,
    DISCONNECTING
}

enum ViewReasonId {
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

interface VoiceStatus {
    input_hardware: boolean;
    input_muted: boolean;
    output_muted: boolean;

    channel_codec_encoding_supported: boolean;
    channel_codec_decoding_supported: boolean;
    sound_playback_supported: boolean;

    sound_record_supported;

    away: boolean | string;

    channel_subscribe_all: boolean;
    queries_visible: boolean;
}

interface ConnectParameters {
    nickname?: string;
    channel?: {
        target: string | number;
        password?: string;
    };
    token?: string;
    password?: {password: string, hashed: boolean};
    auto_reconnect_attempt?: boolean;
}

class ConnectionHandler {
    channelTree: ChannelTree;

    serverConnection: connection.AbstractServerConnection;

    fileManager: FileManager;

    permissions: PermissionManager;
    groups: GroupManager;

    side_bar: chat.Frame;

    settings: ServerSettings;
    sound: sound.SoundManager;

    hostbanner: Hostbanner;

    tag_connection_handler: JQuery;

    private _clientId: number = 0;
    private _local_client: LocalClientEntry;

    private _reconnect_timer: NodeJS.Timer;
    private _reconnect_attempt: boolean = false;

    private _connect_initialize_id: number = 1;

    client_status: VoiceStatus = {
        input_hardware: false,
        input_muted: false,
        output_muted: false,
        away: false,
        channel_subscribe_all: true,
        queries_visible: false,

        sound_playback_supported: undefined,
        sound_record_supported: undefined,
        channel_codec_encoding_supported: undefined,
        channel_codec_decoding_supported: undefined
    };

    invoke_resized_on_activate: boolean = false;
    log: log.ServerLog;

    constructor() {
        this.settings = new ServerSettings();

        this.log = new log.ServerLog(this);
        this.channelTree = new ChannelTree(this);
        this.side_bar = new chat.Frame(this);
        this.sound = new sound.SoundManager(this);
        this.hostbanner = new Hostbanner(this);

        this.serverConnection = connection.spawn_server_connection(this);
        this.serverConnection.onconnectionstatechanged = this.on_connection_state_changed.bind(this);

        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);
        this.side_bar.channel_conversations().initialize_needed_listener();

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

                server_connections.set_active_connection_handler(this);
            });
            this.tag_connection_handler.find(".button-close").on('click', event => {
                server_connections.destroy_server_connection_handler(this);
                event.preventDefault();
            });
            this.tab_set_name(tr("Not connected"));
        }
    }

    tab_set_name(name: string) {
        this.tag_connection_handler.toggleClass('cutoff-name', name.length > 30);
        this.tag_connection_handler.find(".server-name").text(name);
    }

    setup() { }

    async startConnection(addr: string, profile: profiles.ConnectionProfile, user_action: boolean, parameters: ConnectParameters) {
        this.tab_set_name(tr("Connecting"));
        this.cancel_reconnect(false);
        this._reconnect_attempt = parameters.auto_reconnect_attempt || false;
        if(this.serverConnection)
            this.handleDisconnect(DisconnectReason.REQUESTED);

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
        this.log.log(log.server.Type.CONNECTION_BEGIN, {
            address: {
                server_hostname: server_address.host,
                server_port: server_address.port
            },
            client_nickname: parameters.nickname
        });
        this.channelTree.initialiseHead(addr, server_address);

        if(parameters.password && !parameters.password.hashed){
            try {
                const password = await helpers.hashPassword(parameters.password.password);
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
        if(dns.supported() && !server_address.host.match(Modals.Regex.IP_V4) && !server_address.host.match(Modals.Regex.IP_V6)) {
            const id = ++this._connect_initialize_id;
            this.log.log(log.server.Type.CONNECTION_HOSTNAME_RESOLVE, {});
            try {
                const resolved = await dns.resolve_address(server_address.host, { timeout: 5000 }) || {} as any;
                if(id != this._connect_initialize_id)
                    return; /* we're old */

                server_address.port = resolved.target_port || server_address.port;
                server_address.host = resolved.target_ip || server_address.host;
                this.log.log(log.server.Type.CONNECTION_HOSTNAME_RESOLVED, {
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

        await this.serverConnection.connect(server_address, new connection.HandshakeHandler(profile, parameters));
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


    getClient() : LocalClientEntry { return this._local_client; }
    getClientId() { return this._clientId; }

    set clientId(id: number) {
        this._clientId = id;
        this._local_client["_clientId"] = id;
    }

    get clientId() {
        return this._clientId;
    }

    getServerConnection() : connection.AbstractServerConnection { return this.serverConnection; }


    /**
     * LISTENER
     */
    onConnected() {
        log.info(LogCategory.CLIENT, tr("Client connected"));
        this.permissions.requestPermissionList();
        if(this.groups.serverGroups.length == 0)
            this.groups.requestGroups();

        this.initialize_server_settings();

        /* apply the server settings */
        if(this.client_status.channel_subscribe_all)
            this.channelTree.subscribe_all_channels();
        else
            this.channelTree.unsubscribe_all_channels();
        this.channelTree.toggle_server_queries(this.client_status.queries_visible);

        this.sync_status_with_server();
        /*
        No need to update the voice stuff because as soon we see ourself we're doing it
        this.update_voice_status();
        if(control_bar.current_connection_handler() === this)
            control_bar.apply_server_voice_state();
        */
    }

    private initialize_server_settings() {
        let update_control = false;
        this.settings.setServer(this.channelTree.server.properties.virtualserver_unique_identifier);
        {
            const flag_subscribe = this.settings.server(Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL, true);
            if(this.client_status.channel_subscribe_all != flag_subscribe) {
                this.client_status.channel_subscribe_all = flag_subscribe;
                update_control = true;
            }
        }
        {
            const flag_query = this.settings.server(Settings.KEY_CONTROL_SHOW_QUERIES, false);
            if(this.client_status.queries_visible != flag_query) {
                this.client_status.queries_visible = flag_query;
                update_control = true;
            }
        }

        if(update_control && server_connections.active_connection_handler() === this) {
            control_bar.apply_server_state();
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

        if(bipc.supported()) {
            tag.attr('href', "#");
            let popup: Window;
            tag.on('click', event => {
                const features = {
                    status: "no",
                    location: "no",
                    toolbar: "no",
                    menubar: "no",
                    width: 600,
                    height: 400
                };

                if(popup)
                    popup.close();

                properties["certificate_callback"] = bipc.get_handler().register_certificate_accept_callback(() => {
                    log.info(LogCategory.GENERAL, tr("Received notification that the certificate has been accepted! Attempting reconnect!"));
                    if(this._certificate_modal)
                        this._certificate_modal.close();

                    popup.close(); /* no need, but nicer */

                    const profile = profiles.find_profile(properties.connect_profile) || profiles.default_profile();
                    const cprops = this.reconnect_properties(profile);
                    this.startConnection(properties.connect_address, profile, true, cprops);
                });

                const url = build_url(document.location.origin + document.location.pathname + "/popup/certaccept/", "", properties);
                const features_string = [...Object.keys(features)].map(e => e + "=" + features[e]).reduce((a, b) => a + "," + b);
                popup = window.open(url, "TeaWeb certificate accept", features_string);
                try {
                    popup.focus();
                } catch(e) {
                    log.warn(LogCategory.GENERAL, tr("Certificate accept popup has been blocked. Trying a blank page and replacing href"));

                    window.open(url, "TeaWeb certificate accept"); /* trying without features */
                    tag.attr("target", "_blank");
                    tag.attr("href", url);
                    tag.unbind('click');
                }
            });
        } else {
            tag.attr('href', build_url(document.location.origin + document.location.pathname, document.location.search, properties));
        }
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
                    this.log.log(log.server.Type.DISCONNECTED, {});
                }
                break;
            case DisconnectReason.DNS_FAILED:
                log.error(LogCategory.CLIENT, tr("Failed to resolve hostname: %o"), data);
                this.log.log(log.server.Type.CONNECTION_HOSTNAME_RESOLVE_ERROR, {
                    message: data as any
                });
                this.sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.CONNECT_FAILURE:
                if(this._reconnect_attempt) {
                    auto_reconnect = true;
                    this.log.log(log.server.Type.CONNECTION_FAILED, {});
                    break;
                }
                log.error(LogCategory.CLIENT, tr("Could not connect to remote host! Error: %o"), data);

                if(native_client) {
                    createErrorModal(
                        tr("Could not connect"),
                        tr("Could not connect to remote host (Connection refused)")
                    ).open();
                } else {
                    const error_message_format =
                        "Could not connect to remote host (Connection refused)\n" +
                        "If you're sure that the remote host is up, than you may not allow unsigned certificates.\n" +
                        "Click {0} to accept the remote certificate";

                    this._certificate_modal = createErrorModal(
                        tr("Could not connect"),
                        MessageHelper.formatMessage(tr(error_message_format), this.generate_ssl_certificate_accept())
                    );
                    this._certificate_modal.close_listener.push(() => this._certificate_modal = undefined);
                    this._certificate_modal.open();
                }
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
                    MessageHelper.formatMessage(tr("The target server is a TeamSpeak 3 server!{:br:}Only TeamSpeak 3 based identities are able to connect.{:br:}Please select another profile or change the identify type."))
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);
                auto_reconnect = false;
                break;
            case DisconnectReason.IDENTITY_TOO_LOW:
                createErrorModal(
                    tr("Identity level is too low"),
                    MessageHelper.formatMessage(tr("You've been disconnected, because your Identity level is too low.{:br:}You need at least a level of {0}"), data["extra_message"])
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
                this.log.log(log.server.Type.SERVER_CLOSED, {message: data.reasonmsg});

                createErrorModal(
                    tr("Server closed"),
                    "The server is closed.<br>" + //TODO tr
                            "Reason: " + data.reasonmsg
                ).open();
                this.sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = true;
                break;
            case DisconnectReason.SERVER_REQUIRES_PASSWORD:
                this.log.log(log.server.Type.SERVER_REQUIRES_PASSWORD, {});

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
                createErrorModal(
                    tr("You've been kicked"),
                    MessageHelper.formatMessage(tr("You've been kicked from this server.{:br:}{0}"), data["extra_message"])
                ).open();
                this.sound.play(Sound.SERVER_KICKED);
                auto_reconnect = false;
                break;
            case DisconnectReason.HANDSHAKE_BANNED:
                this.log.log(log.server.Type.SERVER_BANNED, {
                    invoker: {
                        client_name: data["invokername"],
                        client_id: parseInt(data["invokerid"]),
                        client_unique_id: data["invokeruid"]
                    },

                    message: data["reasonmsg"],
                    time: parseInt(data["time"])
                });
                this.sound.play(Sound.CONNECTION_BANNED); //TODO findout if it was a disconnect or a connect refuse
                break;
            case DisconnectReason.CLIENT_BANNED:
                this.log.log(log.server.Type.SERVER_BANNED, {
                    invoker: {
                        client_name: data["invokername"],
                        client_id: parseInt(data["invokerid"]),
                        client_unique_id: data["invokeruid"]
                    },

                    message: data["reasonmsg"],
                    time: parseInt(data["time"])
                });
                this.sound.play(Sound.CONNECTION_BANNED); //TODO findout if it was a disconnect or a connect refuse
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

        if(control_bar.current_connection_handler() == this)
            control_bar.update_connection_state();
        this.side_bar.private_conversations().clear_client_ids();
        this.hostbanner.update();

        if(auto_reconnect) {
            if(!this.serverConnection) {
                log.info(LogCategory.NETWORKING, tr("Allowed to auto reconnect but cant reconnect because we dont have any information left..."));
                return;
            }
            this.log.log(log.server.Type.RECONNECT_SCHEDULED, {timeout: 50000});

            log.info(LogCategory.NETWORKING, tr("Allowed to auto reconnect. Reconnecting in 5000ms"));
            const server_address = this.serverConnection.remote_address();
            const profile = this.serverConnection.handshake_handler().profile;

            this._reconnect_timer = setTimeout(() => {
                this._reconnect_timer = undefined;
                this.log.log(log.server.Type.RECONNECT_CANCELED, {});
                log.info(LogCategory.NETWORKING, tr("Reconnecting..."));

                this.startConnection(server_address.host + ":" + server_address.port, profile, false, Object.assign(this.reconnect_properties(profile), {auto_reconnect_attempt: true}));
            }, 5000);
        }
    }

    cancel_reconnect(log_event: boolean) {
        if(this._reconnect_timer) {
            if(log_event) this.log.log(log.server.Type.RECONNECT_CANCELED, {});
            clearTimeout(this._reconnect_timer);
            this._reconnect_timer = undefined;
        }
    }

    private on_connection_state_changed() {
        if(control_bar.current_connection_handler() == this)
            control_bar.update_connection_state();
    }

    update_voice_status(targetChannel?: ChannelEntry) {
        if(!this._local_client) return; /* we've been destroyed */

        targetChannel = targetChannel || this.getClient().currentChannel();

        const vconnection = this.serverConnection.voice_connection();
        const basic_voice_support = this.serverConnection.support_voice() && vconnection.connected() && targetChannel;
        const support_record = basic_voice_support && (!targetChannel || vconnection.encoding_supported(targetChannel.properties.channel_codec));
        const support_playback = basic_voice_support && (!targetChannel || vconnection.decoding_supported(targetChannel.properties.channel_codec));

        const property_update = {
            client_input_muted: this.client_status.input_muted,
            client_output_muted: this.client_status.output_muted
        };

        if(support_record && basic_voice_support)
            vconnection.set_encoder_codec(targetChannel.properties.channel_codec);

        if(!this.serverConnection.support_voice() || !vconnection.connected()) {
            property_update["client_input_hardware"] = false;
            property_update["client_output_hardware"] = false;
            this.client_status.input_hardware = true; /* IDK if we have input hardware or not, but it dosn't matter at all so */
        } else {
            const audio_source = vconnection.voice_recorder();
            const recording_supported = typeof(audio_source) !== "undefined" && audio_source.record_supported && (!targetChannel || vconnection.encoding_supported(targetChannel.properties.channel_codec));
            const playback_supported = !targetChannel || vconnection.decoding_supported(targetChannel.properties.channel_codec);

            property_update["client_input_hardware"] = recording_supported;
            property_update["client_output_hardware"] = playback_supported;
            this.client_status.input_hardware = recording_supported;
        }

        if(this.serverConnection && this.serverConnection.connected()) {
            const client_properties = this.getClient().properties;
            for(const key of Object.keys(property_update)) {
                if(client_properties[key] === property_update[key])
                    delete property_update[key];
            }

            if(Object.keys(property_update).length > 0) {
                this.serverConnection.send_command("clientupdate", property_update).catch(error => {
                    log.warn(LogCategory.GENERAL, tr("Failed to update client audio hardware properties. Error: %o"), error);
                    this.log.log(log.server.Type.ERROR_CUSTOM, {message: tr("Failed to update audio hardware properties.")});

                    /* Update these properties anyways (for case the server fails to handle the command) */
                    const updates = [];
                    for(const key of Object.keys(property_update))
                        updates.push({key: key, value: (property_update[key]) + ""});
                    this.getClient().updateVariables(...updates);
                });
            }
        } else { /* no icons are shown so no update at all */ }


        if(targetChannel && (!vconnection || vconnection.connected())) {
            const encoding_supported = vconnection && vconnection.encoding_supported(targetChannel.properties.channel_codec);
            const decoding_supported = vconnection && vconnection.decoding_supported(targetChannel.properties.channel_codec);

            if(this.client_status.channel_codec_decoding_supported !== decoding_supported || this.client_status.channel_codec_encoding_supported !== encoding_supported) {
                this.client_status.channel_codec_decoding_supported = decoding_supported;
                this.client_status.channel_codec_encoding_supported = encoding_supported;

                let message;
                if(!encoding_supported && !decoding_supported)
                    message = tr("This channel has an unsupported codec.<br>You cant speak or listen to anybody within this channel!");
                else if(!encoding_supported)
                    message = tr("This channel has an unsupported codec.<br>You cant speak within this channel!");
                else if(!decoding_supported)
                    message = tr("This channel has an unsupported codec.<br>You listen to anybody within this channel!"); /* implies speaking does not work as well */
                if(message)
                    createErrorModal(tr("Channel codec unsupported"), message).open();
            }
        }

        this.client_status = this.client_status || {} as any;
        this.client_status.sound_record_supported = support_record;
        this.client_status.sound_playback_supported = support_playback;

        if(vconnection && vconnection.voice_recorder() && vconnection.voice_recorder().record_supported) {
            const active = !this.client_status.input_muted && !this.client_status.output_muted;
            /* No need to start the microphone when we're not even connected */
            if(active && this.serverConnection.connected()) {
                if(vconnection.voice_recorder().input.current_state() === audio.recorder.InputState.PAUSED) {
                    vconnection.voice_recorder().input.start().then(result => {
                        if(result != audio.recorder.InputStartResult.EOK) {
                            log.warn(LogCategory.VOICE, tr("Failed to start microphone input (%s)."), result);
                            createErrorModal(tr("Failed to start recording"), MessageHelper.formatMessage(tr("Microphone start failed.{:br:}Error: {}"), result)).open();
                        }
                    }).catch(error => {
                        log.warn(LogCategory.VOICE, tr("Failed to start microphone input (%s)."), error);
                        createErrorModal(tr("Failed to start recording"), MessageHelper.formatMessage(tr("Microphone start failed.{:br:}Error: {}"), error)).open();
                    });
                }
            } else {
                vconnection.voice_recorder().input.stop();
            }
        }

        if(control_bar.current_connection_handler() === this)
            control_bar.apply_server_voice_state();
    }

    sync_status_with_server() {
        if(this.serverConnection.connected())
            this.serverConnection.send_command("clientupdate", {
                client_input_muted: this.client_status.input_muted,
                client_output_muted: this.client_status.output_muted,
                client_away: typeof(this.client_status.away) === "string" || this.client_status.away,
                client_away_message: typeof(this.client_status.away) === "string" ? this.client_status.away : "",
                client_input_hardware: this.client_status.sound_record_supported && this.client_status.input_hardware,
                client_output_hardware: this.client_status.sound_playback_supported
            }).catch(error => {
                log.warn(LogCategory.GENERAL, tr("Failed to sync handler state with server. Error: %o"), error);
                this.log.log(log.server.Type.ERROR_CUSTOM, {message: tr("Failed to sync handler state with server.")});
            });
    }

    set_away_status(state: boolean | string) {
        if(this.client_status.away === state)
            return;

        if(state) {
            this.sound.play(Sound.AWAY_ACTIVATED);
        } else {
            this.sound.play(Sound.AWAY_DEACTIVATED);
        }

        this.client_status.away = state;
        this.serverConnection.send_command("clientupdate", {
            client_away: typeof(this.client_status.away) === "string" || this.client_status.away,
            client_away_message: typeof(this.client_status.away) === "string" ? this.client_status.away : "",
        }).catch(error => {
            log.warn(LogCategory.GENERAL, tr("Failed to update away status. Error: %o"), error);
            this.log.log(log.server.Type.ERROR_CUSTOM, {message: tr("Failed to update away status.")});
        });

        control_bar.update_button_away();
    }

    resize_elements() {
        this.channelTree.handle_resized();
        this.invoke_resized_on_activate = false;
    }

    acquire_recorder(voice_recoder: RecorderProfile, update_control_bar: boolean) {
        const vconnection = this.serverConnection.voice_connection();
        (vconnection ? vconnection.acquire_voice_recorder(voice_recoder) : Promise.resolve()).catch(error => {
            log.warn(LogCategory.VOICE, tr("Failed to acquire recorder (%o)"), error);
        }).then(() => {
            this.update_voice_status(undefined);
        });
    }

    reconnect_properties(profile?: profiles.ConnectionProfile) : ConnectParameters {
        const name = (this.getClient() ? this.getClient().clientNickName() : "") ||
                        (this.serverConnection && this.serverConnection.handshake_handler() ? this.serverConnection.handshake_handler().parameters.nickname : "") ||
                        settings.static_global(Settings.KEY_CONNECT_USERNAME, profile ? profile.default_username : undefined) ||
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
        Modals.spawnAvatarUpload(data => {
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
                        message = MessageHelper.formatMessage(tr("Failed to delete avatar.{:br:}Error: {0}"), error.extra_message || error.message);
                    if(!message)
                        message = MessageHelper.formatMessage(tr("Failed to delete avatar.{:br:}Lookup the console for more details"));
                    createErrorModal(tr("Failed to delete avatar"), message).open();
                    return;
                });
            } else {
                log.info(LogCategory.CLIENT, tr("Uploading new avatar"));
                (async () => {
                    let key: transfer.UploadKey;
                    try {
                        key = await this.fileManager.upload_file({
                            size: data.byteLength,
                            path: '',
                            name: '/avatar',
                            overwrite: true,
                            channel: undefined,
                            channel_password: undefined
                        });
                    } catch(error) {
                        log.error(LogCategory.GENERAL, tr("Failed to initialize avatar upload: %o"), error);
                        let message;
                        if(error instanceof CommandResult) {
                            //TODO: Resolve permission name
                            //i_client_max_avatar_filesize
                            if(error.id == ErrorID.PERMISSION_ERROR) {
                                message = MessageHelper.formatMessage(tr("Failed to initialize avatar upload.{:br:}Missing permission {0}"), error["failed_permid"]);
                            } else {
                                message = MessageHelper.formatMessage(tr("Failed to initialize avatar upload.{:br:}Error: {0}"), error.extra_message || error.message);
                            }
                        }
                        if(!message)
                            message = MessageHelper.formatMessage(tr("Failed to initialize avatar upload.{:br:}Lookup the console for more details"));
                        createErrorModal(tr("Failed to upload avatar"), message).open();
                        return;
                    }

                    try {
                        await transfer.spawn_upload_transfer(key).put_data(data);
                    } catch(error) {
                        log.error(LogCategory.GENERAL, tr("Failed to upload avatar: %o"), error);

                        let message;
                        if(typeof(error) === "string")
                            message = MessageHelper.formatMessage(tr("Failed to upload avatar.{:br:}Error: {0}"), error);

                        if(!message)
                            message = MessageHelper.formatMessage(tr("Failed to initialize avatar upload.{:br:}Lookup the console for more details"));
                        createErrorModal(tr("Failed to upload avatar"), message).open();
                        return;
                    }
                    try {
                        await this.serverConnection.send_command('clientupdate', {
                            client_flag_avatar: guid()
                        });
                    } catch(error) {
                        log.error(LogCategory.GENERAL, tr("Failed to update avatar flag: %o"), error);

                        let message;
                        if(error instanceof CommandResult)
                            message = MessageHelper.formatMessage(tr("Failed to update avatar flag.{:br:}Error: {0}"), error.extra_message || error.message);
                        if(!message)
                            message = MessageHelper.formatMessage(tr("Failed to update avatar flag.{:br:}Lookup the console for more details"));
                        createErrorModal(tr("Failed to set avatar"), message).open();
                        return;
                    }

                    createInfoModal(tr("Avatar successfully uploaded"), tr("Your avatar has been uploaded successfully!")).open();
                })();

            }
        });
    }

    destroy() {
        this.cancel_reconnect(true);

        this.tag_connection_handler && this.tag_connection_handler.remove();
        this.tag_connection_handler = undefined;

        this.hostbanner && this.hostbanner.destroy();
        this.hostbanner = undefined;

        this._local_client && this._local_client.destroy();
        this._local_client = undefined;

        this.channelTree && this.channelTree.destroy();
        this.channelTree = undefined;

        this.side_bar && this.side_bar.destroy();
        this.side_bar = undefined;

        this.log && this.log.destroy();
        this.log = undefined;

        this.permissions && this.permissions.destroy();
        this.permissions = undefined;

        this.groups && this.groups.destroy();
        this.groups = undefined;

        this.fileManager && this.fileManager.destroy();
        this.fileManager = undefined;

        this.settings && this.settings.destroy();
        this.settings = undefined;

        if(this.serverConnection) {
            this.serverConnection.onconnectionstatechanged = undefined;
            connection.destroy_server_connection(this.serverConnection);
        }
        this.serverConnection = undefined;

        this.sound = undefined;
        this._local_client = undefined;
    }
}