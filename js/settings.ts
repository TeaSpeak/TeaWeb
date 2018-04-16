/// <reference path="client.ts" />

if(typeof(customElements) !== "undefined") {
    class X_Properties extends HTMLElement {}
    class X_Property extends HTMLElement {}

    customElements.define('x-properties', X_Properties, { extends: 'div' });
    customElements.define('x-property', X_Property, { extends: 'div' });
}

class Settings {
    static readonly KEY_DISABLE_CONTEXT_MENU = "disableContextMenu";
    static readonly KEY_DISABLE_UNLOAD_DIALOG = "disableUnloadDialog";

    private static readonly UPDATE_DIRECT: boolean = true;
    private cacheGlobal = {};
    private cacheServer = {};
    private currentServer: ServerEntry;
    private saveWorker: NodeJS.Timer;
    private updated: boolean = false;
    private _staticPropsTag: JQuery;

    constructor() {
        this._staticPropsTag = $("#properties");

        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if(!this.cacheGlobal) this.cacheGlobal = {};
        const _this = this;
        this.saveWorker = setInterval(() => {
            if(_this.updated)
                _this.save();
        }, 5 * 1000);

        this.initializeStatic();
    }

    private initializeStatic() {
        location.search.substr(1).split("&").forEach(part => {
            let item = part.split("=");
            $.spawn("div")
                .attr("key", item[0])
                .attr("value", item[1])
                .appendTo(this._staticPropsTag);
        });
    }

    private static transformStO?<T>(input: string, _default?: T) : T {
        if      (typeof _default === "string")     return input as any;
        else if (typeof _default === "number")     return parseInt(input) as any;
        else if (typeof _default === "boolean")    return (input == "1" || input == "true") as any;
        else if (typeof _default == "undefined")   return input as any;
        return JSON.parse(input) as any;
    }

    private static transformOtS?<T>(input: T) : string {
        if      (typeof input === "string")     return input as string;
        else if (typeof input === "number")     return input.toString();
        else if (typeof input === "boolean")    return input ? "1" : "0";
        else if (typeof input == "undefined")   return undefined;
        return JSON.stringify(input);
    }

    global?<T>(key: string, _default?: T) : T {
        let result = this.cacheGlobal[key];
        return Settings.transformStO(result, _default);
    }

    server?<T>(key: string, _default?: T) : T {
        let result = this.cacheServer[key];
        return Settings.transformStO(result, _default);
    }

    static?<T>(key: string, _default?: T) : T {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        return Settings.transformStO(result.length > 0 ? decodeURIComponent(result.attr("value")) : undefined, _default);
    }


    changeGlobal<T>(key: string, value?: T){
        if(this.cacheGlobal[key] == value) return;

        this.updated = true;
        this.cacheGlobal[key] = Settings.transformOtS(value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    changeServer<T>(key: string, value?: T) {
        if(this.cacheServer[key] == value) return;

        this.updated = true;
        this.cacheServer[key] = Settings.transformOtS(value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    setServer(server: ServerEntry) {
        if(this.currentServer) {
            this.save();
            this.cacheServer = {};
            this.currentServer = undefined;
        }
        this.currentServer = server;

        if(this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + serverId));
            if(!this.cacheServer)
                this.cacheServer = {};
        }
    }

    save() {
        this.updated = false;

        if(this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + serverId, server);
        }

        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
    }

    deleteStatic(key: string) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        if(result.length != 0) result.detach();
    }
}