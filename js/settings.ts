/// <reference path="client.ts" />

class Settings {
    handle: TSClient;

    private static readonly UPDATE_DIRECT: boolean = true;
    private cacheGlobal = {};
    private cacheServer = {};
    private saveWorker: NodeJS.Timer;
    private updated: boolean = false;

    constructor(handle: TSClient) {
        this.handle = handle;

        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if(!this.cacheGlobal) this.cacheGlobal = {};
        const _this = this;
        this.saveWorker = setInterval(() => {
            if(_this.updated)
                _this.save();
        }, 5 * 1000);
    }

    global?(key: string) : string {
        return this.cacheGlobal[key];
    }

    server?(key: string) : string {
        return this.cacheServer[key];
    }

    changeGlobal(key: string, value?: string){
        this.updated = true;
        this.cacheGlobal[key] = value;

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    changeServer(key: string, value?: string) {
        this.updated = true;
        this.cacheServer[key] = value;

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    loadServer() {
        let serverId = this.handle.channelTree.server.properties.virtualserver_unique_identifier;
        this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + serverId));
        if(!this.cacheServer)
            this.cacheServer = {};
    }

    save() {
        this.updated = false;
        let serverId = this.handle.channelTree.server.properties.virtualserver_unique_identifier;
        let global = JSON.stringify(this.cacheGlobal);
        let server = JSON.stringify(this.cacheServer);

        localStorage.setItem("settings.global", global);
        localStorage.setItem("settings.server_" + serverId, server);
    }
}