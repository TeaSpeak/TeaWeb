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

    startConnection(addr: string, identity: Identity, name?: string, password?: {password: string, hashed: boolean}) {
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
        console.log("Start connection to " + host + ":" + port);
        this.channelTree.initialiseHead(addr, {host, port});

        if(password && !password.hashed) {
            helpers.hashPassword(password.password).then(password => {
                this.serverConnection.startConnection({host, port}, new HandshakeHandler(identity, name, password));
            }).catch(error => {
                createErrorModal("Error while hasing password", "Faield to hash server password!").open();
            })
        } else
            this.serverConnection.startConnection({host, port}, new HandshakeHandler(identity, name, password ? password.password : undefined));
    }


    getClient() : LocalClientEntry { return this._ownEntry; }
    getClientId(){ return this._clientId; } //TODO here

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
            createErrorModal("Codec encode type not supported!", "Codec encode type " + VoiceConnectionType[this.voiceConnection.type] + " not supported by this browser!<br>Choose another one!").open();
    }

    get connected() : boolean {
        return !!this.serverConnection && this.serverConnection.connected;
    }

    private certAcceptUrl() {
        // document.URL
        let callback = document.URL;
        if(document.location.search.length == 0)
            callback += "?default_connect_url=true";
        else
            callback += "&default_connect_url=true";
        //
        switch (this.serverConnection._handshakeHandler.identity.type()) {
            case IdentitifyType.TEAFORO:
                callback += "&default_connect_type=teaforo";
                break;
            case IdentitifyType.TEAMSPEAK:
                callback += "&default_connect_type=teamspeak";
                break;
        }
        callback += "&default_connect_url=" + encodeURIComponent(this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port);

        return "https://" + this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port + "/?forward_url=" + encodeURIComponent(callback);
    }

    handleDisconnect(type: DisconnectReason, data: any = {}) {
        switch (type) {
            case DisconnectReason.REQUESTED:
                break;
            case DisconnectReason.CONNECT_FAILURE:
                console.error("Could not connect to remote host! Exception");
                console.error(data);

                createErrorModal(
                    "Could not connect",
                    "Could not connect to remote host (Connection refused)<br>" +
                    "If you're sure that the remote host is up, than you may not allow unsigned certificates.<br>" +
                    "Click <a href='" + this.certAcceptUrl() + "'>here</a> to accept the remote certificate"
                ).open();
                break;
            case DisconnectReason.CONNECTION_CLOSED:
                console.error("Lost connection to remote server!");
                createErrorModal(
                    "Connection closed",
                    "The connection was closed by remote host"
                ).open();
                break;
            case DisconnectReason.CONNECTION_PING_TIMEOUT:
                console.error("Connection ping timeout");
                createErrorModal(
                    "Connection lost",
                    "Lost connection to remote host (Ping timeout)<br>Even possible?"
                ).open();
                break;
            case DisconnectReason.SERVER_CLOSED:
                chat.serverChat().appendError("Server closed ({0})", data.reasonmsg);
                createErrorModal(
                    "Server closed",
                    "The server is closed.<br>" +
                            "Reason: " + data.reasonmsg
                ).open();
                break;
            case DisconnectReason.SERVER_REQUIRES_PASSWORD:
                chat.serverChat().appendError("Server requires password");
                createInputModal("Server password", "Enter server password:", password => password.length != 0, password => {
                    if(!(typeof password === "string")) return;
                    this.startConnection(this.serverConnection._remote_address.host + ":" + this.serverConnection._remote_address.port,
                        this.serverConnection._handshakeHandler.identity,
                        this.serverConnection._handshakeHandler.name,
                        {password: password as string, hashed: false});
                }).open();
            default:
                console.error("Got uncaught disconnect!");
                console.error("Type: " + type + " Data:");
                console.error(data);
                break;
        }

        this.selectInfo.setCurrentSelected(null);
        this.channelTree.reset();
        this.voiceConnection.dropSession();
        if(this.serverConnection) this.serverConnection.disconnect();
        this.controlBar.update_connection_state();
    }
}