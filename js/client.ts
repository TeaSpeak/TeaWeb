/// <reference path="voice/AudioController.ts" />
/// <reference path="proto.ts" />
/// <reference path="ui/view.ts" />
/// <reference path="connection.ts" />
/// <reference path="settings.ts" />
/// <reference path="InfoBar.ts" />
/// <reference path="FileManager.ts" />
/// <reference path="permission/PermissionManager.ts" />
/// <reference path="permission/GroupManager.ts" />
/// <reference path="ui/ControlBar.ts" />

enum DisconnectReason {
    REQUESTED,
    CONNECT_FAILURE,
    CONNECTION_CLOSED,
    CONNECTION_FATAL_ERROR,
    CONNECTION_PING_TIMEOUT,
    CLIENT_KICKED,
    CLIENT_BANNED,
    SERVER_CLOSED,
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
    settings: Settings;

    private _clientId: number = 0;
    private _ownEntry: LocalClientEntry;

    constructor() {
        this.settings = new Settings(this);
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

    startConnection(addr: string, identity: Identity, name?: string) {
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
            port = 19974;
        }
        console.log("Start connection to " + host + ":" + port);
        this.channelTree.initialiseHead(addr);
        this.serverConnection.startConnection(host, port, new HandshakeHandler(identity, name));
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
        this.settings.loadServer();
        this.serverConnection.sendCommand("channelsubscribeall");
        this.permissions.requestPermissionList();
        if(this.groups.serverGroups.length == 0)
            this.groups.requestGroups();
        this.controlBar.updateProperties();
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
                    "Could not connect to remote host (Connection refused)"
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
            default:
                console.error("Got uncaught disconnect!");
                console.error("Type: " + type + " Data:");
                console.error(data);
                break;
        }

        this.selectInfo.currentSelected = null;
        this.channelTree.reset();
        this.voiceConnection.dropSession();
        if(this.serverConnection) this.serverConnection.disconnect();
    }
}