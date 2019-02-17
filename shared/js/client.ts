/// <reference path="log.ts" />
/// <reference path="voice/AudioController.ts" />
/// <reference path="proto.ts" />
/// <reference path="ui/view.ts" />
/// <reference path="connection.ts" />
/// <reference path="settings.ts" />
/// <reference path="ui/frames/SelectedItemInfo.ts" />
/// <reference path="FileManager.ts" />
/// <reference path="permission/PermissionManager.ts" />
/// <reference path="permission/GroupManager.ts" />
/// <reference path="ui/frames/ControlBar.ts" />

enum DisconnectReason {
    REQUESTED,
    CONNECT_FAILURE,
    CONNECTION_CLOSED,
    CONNECTION_FATAL_ERROR,
    CONNECTION_PING_TIMEOUT,
    CLIENT_KICKED,
    CLIENT_BANNED,
    HANDSHAKE_FAILED,
    SERVER_CLOSED,
    SERVER_REQUIRES_PASSWORD,
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

class TSClient {
    channelTree: ChannelTree;
    serverConnection: ServerConnection;
    voiceConnection: VoiceConnection;
    fileManager: FileManager;
    selectInfo: InfoBar;
    permissions: PermissionManager;
    groups: GroupManager;
    controlBar: ControlBar;

    private _clientId: number = 0;
    private _ownEntry: LocalClientEntry;
    private _reconnect_timer: NodeJS.Timer;
    private _reconnect_attempt: boolean = false;

    constructor() {
        this.selectInfo = new InfoBar(this, $("#select_info"));
        this.channelTree = new ChannelTree(this, $("#channelTree"));
        this.serverConnection = new ServerConnection(this);
        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);
        this.groups = new GroupManager(this);
        this.voiceConnection = new VoiceConnection(this);
        this._ownEntry = new LocalClientEntry(this);
        this.controlBar = new ControlBar(this, $("#control_bar"));
        this.channelTree.registerClient(this._ownEntry);
    }

    setup() {
        this.controlBar.initialise();
    }

    startConnection(addr: string, profile: profiles.ConnectionProfile, name?: string, password?: {password: string, hashed: boolean}) {
        this.cancel_reconnect();
        this._reconnect_attempt = false;
        if(this.serverConnection)
            this.handleDisconnect(DisconnectReason.REQUESTED);

        let idx = addr.lastIndexOf(':');

        let port: number;
        let host: string;
        if(idx != -1) {
            port = parseInt(addr.substr(idx + 1));
            host = addr.substr(0, idx);
        } else {
            host = addr;
            port = 9987;
        }
        console.log(tr("Start connection to %s:%d"), host, port);
        this.channelTree.initialiseHead(addr, {host, port});

        if(password && !password.hashed) {
            helpers.hashPassword(password.password).then(password => {
                this.serverConnection.startConnection({host, port}, new HandshakeHandler(profile, name, password));
            }).catch(error => {
                createErrorModal(tr("Error while hashing password"), tr("Failed to hash server password!<br>") + error).open();
            })
        } else
            this.serverConnection.startConnection({host, port}, new HandshakeHandler(profile, name, password ? password.password : undefined));
    }


    getClient() : LocalClientEntry { return this._ownEntry; }
    getClientId() { return this._clientId; } //TODO here

    set clientId(id: number) {
        this._clientId = id;
        this._ownEntry["_clientId"] = id;
    }

    get clientId() {
        return this._clientId;
    }

    getServerConnection() : ServerConnection { return this.serverConnection; }


    /**
     * LISTENER
     */
    onConnected() {
        console.log("Client connected!");
        this.channelTree.registerClient(this._ownEntry);
        settings.setServer(this.channelTree.server);
        this.permissions.requestPermissionList();
        this.serverConnection.sendCommand("channelsubscribeall");
        if(this.groups.serverGroups.length == 0)
            this.groups.requestGroups();
        this.controlBar.updateProperties();
        if(!this.voiceConnection.current_encoding_supported())
            createErrorModal(tr("Codec encode type not supported!"), tr("Codec encode type " + VoiceConnectionType[this.voiceConnection.type] + " not supported by this browser!<br>Choose another one!")).open(); //TODO tr
    }

    get connected() : boolean {
        return !!this.serverConnection && this.serverConnection.connected;
    }

    private certAcceptUrl() {
        const properties = {
            connect_default: true,
            connect_profile: this.serverConnection._handshakeHandler.profile.id,
            connect_address: this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port
        };


        const parameters: string[] = [];
        for(const key in properties)
            parameters.push(key + "=" + encodeURIComponent(properties[key]));



        // document.URL
        let callback = document.URL;
        if(document.location.search.length == 0)
            callback += "?" + parameters.join("&");
        else
            callback += "&" + parameters.join("&");

        return "https://" + this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port + "/?forward_url=" + encodeURIComponent(callback);
    }

    handleDisconnect(type: DisconnectReason, data: any = {}) {
        let auto_reconnect = false;
        switch (type) {
            case DisconnectReason.REQUESTED:
                break;
            case DisconnectReason.CONNECT_FAILURE:
                if(this._reconnect_attempt) {
                    auto_reconnect = true;
                    chat.serverChat().appendError(tr("Connect failed"));
                    break;
                }
                console.error(tr("Could not connect to remote host! Exception: %o"), data);

                if(native_client) {
                    createErrorModal(
                        tr("Could not connect"),
                        tr("Could not connect to remote host (Connection refused)")
                    ).open();
                } else {
                    //TODO tr
                    createErrorModal(
                        tr("Could not connect"),
                        "Could not connect to remote host (Connection refused)<br>" +
                        "If you're sure that the remote host is up, than you may not allow unsigned certificates.<br>" +
                        "Click <a href='" + this.certAcceptUrl() + "'>here</a> to accept the remote certificate"
                    ).open();
                }
                sound.play(Sound.CONNECTION_REFUSED);
                break;
            case DisconnectReason.HANDSHAKE_FAILED:
                //TODO sound
                console.error(tr("Failed to process handshake: %o"), data);
                createErrorModal(
                    tr("Could not connect"),
                    tr("Failed to process handshake: ") + data as string
                ).open();
                break;
            case DisconnectReason.CONNECTION_CLOSED:
                console.error(tr("Lost connection to remote server!"));
                createErrorModal(
                    tr("Connection closed"),
                    tr("The connection was closed by remote host")
                ).open();
                sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = true;
                break;
            case DisconnectReason.CONNECTION_PING_TIMEOUT:
                console.error(tr("Connection ping timeout"));
                sound.play(Sound.CONNECTION_DISCONNECTED_TIMEOUT);
                createErrorModal(
                    tr("Connection lost"),
                    tr("Lost connection to remote host (Ping timeout)<br>Even possible?")
                ).open();

                break;
            case DisconnectReason.SERVER_CLOSED:
                chat.serverChat().appendError(tr("Server closed ({0})"), data.reasonmsg);
                createErrorModal(
                    tr("Server closed"),
                    "The server is closed.<br>" + //TODO tr
                            "Reason: " + data.reasonmsg
                ).open();
                sound.play(Sound.CONNECTION_DISCONNECTED);

                auto_reconnect = true;
                break;
            case DisconnectReason.SERVER_REQUIRES_PASSWORD:
                chat.serverChat().appendError(tr("Server requires password"));
                createInputModal(tr("Server password"), tr("Enter server password:"), password => password.length != 0, password => {
                    if(!(typeof password === "string")) return;
                    this.startConnection(this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port,
                        this.serverConnection._handshakeHandler.profile,
                        this.serverConnection._handshakeHandler.name,
                        {password: password as string, hashed: false});
                }).open();
                break;
            case DisconnectReason.CLIENT_KICKED:
                chat.serverChat().appendError(tr("You got kicked from the server by {0}{1}"),
                    ClientEntry.chatTag(data["invokerid"], data["invokername"], data["invokeruid"]),
                    data["reasonmsg"] ? " (" + data["reasonmsg"] + ")" : "");
                sound.play(Sound.SERVER_KICKED);
                auto_reconnect = true;
                break;
            case DisconnectReason.CLIENT_BANNED:
                chat.serverChat().appendError(tr("You got banned from the server by {0}{1}"),
                    ClientEntry.chatTag(data["invokerid"], data["invokername"], data["invokeruid"]),
                    data["reasonmsg"] ? " (" + data["reasonmsg"] + ")" : "");
                sound.play(Sound.CONNECTION_BANNED); //TODO findout if it was a disconnect or a connect refuse
                break;
            default:
                console.error(tr("Got uncaught disconnect!"));
                console.error(tr("Type: %o Data:"), type);
                console.error(data);
                break;
        }

        this.channelTree.reset();
        this.voiceConnection.dropSession();
        if(this.serverConnection) this.serverConnection.disconnect();
        this.controlBar.update_connection_state();
        this.selectInfo.setCurrentSelected(null);
        this.selectInfo.update_banner();

        if(auto_reconnect) {
            if(!this.serverConnection) {
                console.log(tr("Allowed to auto reconnect but cant reconnect because we dont have any information left..."));
                return;
            }
            chat.serverChat().appendMessage(tr("Reconnecting in 5 seconds"));

            console.log(tr("Allowed to auto reconnect. Reconnecting in 5000ms"));
            const server_address = this.serverConnection._remote_address;
            const profile = this.serverConnection._handshakeHandler.profile;
            const name = this.serverConnection._handshakeHandler.name;
            const password = this.serverConnection._handshakeHandler.server_password;

            this._reconnect_timer = setTimeout(() => {
                this._reconnect_timer = undefined;
                chat.serverChat().appendMessage(tr("Reconnecting..."));
                console.log(tr("Reconnecting..."));
                this.startConnection(server_address.host + ":" + server_address.port, profile, name, password ? { password: password, hashed: true} : undefined);
                this._reconnect_attempt = true;
            }, 5000);
        }
    }

    cancel_reconnect() {
        if(this._reconnect_timer) {
            chat.serverChat().appendMessage(tr("Reconnect canceled"));
            clearTimeout(this._reconnect_timer);
            this._reconnect_timer = undefined;
        }
    }
}