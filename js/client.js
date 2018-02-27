/// <reference path="proto.ts" />
/// <reference path="ui/view.ts" />
/// <reference path="connection.ts" />
/// <reference path="settings.ts" />
/// <reference path="InfoBar.ts" />
/// <reference path="FileManager.ts" />
/// <reference path="permission/PermissionManager.ts" />
/// <reference path="permission/GroupManager.ts" />
/// <reference path="ui/ControlBar.ts" />
var ViewReasonId;
(function (ViewReasonId) {
    ViewReasonId[ViewReasonId["VREASON_USER_ACTION"] = 0] = "VREASON_USER_ACTION";
    ViewReasonId[ViewReasonId["VREASON_MOVED"] = 1] = "VREASON_MOVED";
    ViewReasonId[ViewReasonId["VREASON_SYSTEM"] = 2] = "VREASON_SYSTEM";
    ViewReasonId[ViewReasonId["VREASON_TIMEOUT"] = 3] = "VREASON_TIMEOUT";
    ViewReasonId[ViewReasonId["VREASON_CHANNEL_KICK"] = 4] = "VREASON_CHANNEL_KICK";
    ViewReasonId[ViewReasonId["VREASON_SERVER_KICK"] = 5] = "VREASON_SERVER_KICK";
    ViewReasonId[ViewReasonId["VREASON_BAN"] = 6] = "VREASON_BAN";
    ViewReasonId[ViewReasonId["VREASON_SERVER_STOPPED"] = 7] = "VREASON_SERVER_STOPPED";
    ViewReasonId[ViewReasonId["VREASON_SERVER_LEFT"] = 8] = "VREASON_SERVER_LEFT";
    ViewReasonId[ViewReasonId["VREASON_CHANNEL_UPDATED"] = 9] = "VREASON_CHANNEL_UPDATED";
    ViewReasonId[ViewReasonId["VREASON_EDITED"] = 10] = "VREASON_EDITED";
    ViewReasonId[ViewReasonId["VREASON_SERVER_SHUTDOWN"] = 11] = "VREASON_SERVER_SHUTDOWN";
})(ViewReasonId || (ViewReasonId = {}));
class TSClient {
    constructor() {
        this._clientId = 0;
        this.settings = new Settings(this);
        this.selectInfo = new InfoBar(this, $("#select_info"));
        this.channelTree = new ChannelTree(this, $("#channelTree"));
        this.serverConnection = new ServerConnection(this); //87.106.252.164
        this.fileManager = new FileManager(this);
        this.permissions = new PermissionManager(this);
        this.groups = new GroupManager(this);
        this.voiceConnection = new VoiceConnection(this);
        this._ownEntry = new LocalClientEntry(this);
        this.controlBar = new ControlBar(this, $("#control_bar"));
        this.channelTree.registerClient(this._ownEntry);
    }
    setup() {
        const self = this;
        this.serverConnection.on_connected = function () {
            console.log("Client connected!");
            self.settings.loadServer();
            chat.serverChat().appendMessage("Connected");
            self.serverConnection.sendCommand("channelsubscribeall");
            self.permissions.requestPermissionList();
            if (self.groups.serverGroups.length == 0)
                self.groups.requestGroups();
        };
        this.controlBar.initialise();
    }
    startConnection(addr) {
        let idx = addr.lastIndexOf(':');
        let port;
        let host;
        if (idx != -1) {
            port = Number.parseInt(addr.substr(idx + 1));
            host = addr.substr(0, idx);
        }
        else {
            host = addr;
            port = 19978;
        }
        this.serverConnection.startConnection(host, port);
    }
    getClient() { return this._ownEntry; }
    getClientId() { return this._clientId; } //TODO here
    set clientId(id) {
        this._clientId = id;
        this._ownEntry["_clientId"] = id;
    }
    getServerConnection() { return this.serverConnection; }
    /**
     * LISTENER
     */
    onConnected() {
    }
    //Sould be triggered by `notifyclientleftview`
    handleOwnDisconnect(json) {
    }
}
//# sourceMappingURL=client.js.map