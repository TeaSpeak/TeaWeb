/// <reference path="client.ts" />

class X_Properties extends HTMLElement {}
class X_Property extends HTMLElement {}

customElements.define('x-properties', X_Properties, { extends: 'div' });
customElements.define('x-property', X_Property, { extends: 'div' });

class Settings {
    handle: TSClient;

    private static readonly UPDATE_DIRECT: boolean = true;
    private cacheGlobal = {};
    private cacheServer = {};
    private saveWorker: NodeJS.Timer;
    private updated: boolean = false;
    private _staticPropsTag: JQuery;

    constructor(handle: TSClient) {
        this.handle = handle;
        this._staticPropsTag = $("#properties");

        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if(!this.cacheGlobal) this.cacheGlobal = {};
        const _this = this;
        this.saveWorker = setInterval(() => {
            if(_this.updated)
                _this.save();
        }, 5 * 1000);
    }

    global?(key: string, _default?: string) : string {
        let result = this.cacheGlobal[key];
        return result ? result : _default;
    }

    server?(key: string, _default?: string) : string {
        let result = this.cacheServer[key];
        return result ? result : _default;
    }

    changeGlobal(key: string, value?: string){
        if(this.cacheGlobal[key] == value) return;

        this.updated = true;
        this.cacheGlobal[key] = value;

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    changeServer(key: string, value?: string) {
        if(this.cacheServer[key] == value) return;

        this.updated = true;
        this.cacheServer[key] = value;

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    loadServer() {
        if(!this.handle.channelTree.server) {
            this.cacheServer = {};
            console.warn("[Settings] tried to load settings for unknown server");
            return;
        }
        let serverId = this.handle.channelTree.server.properties.virtualserver_unique_identifier;
        this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + serverId));
        if(!this.cacheServer)
            this.cacheServer = {};
    }

    save() {
        this.updated = false;

        if(this.handle.channelTree.server) {
            let serverId = this.handle.channelTree.server.properties.virtualserver_unique_identifier;
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + serverId, server);
        }

        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
    }

    static?(key: string, _default: string = undefined) : string {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        if(result.length == 0) return _default;
        return decodeURIComponent(result.attr("value"));
    }

    deleteStatic(key: string) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        if(result.length != 0) result.detach();
    }
}