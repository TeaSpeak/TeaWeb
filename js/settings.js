/// <reference path="client.ts" />
if (typeof (customElements) !== "undefined") {
    class X_Properties extends HTMLElement {
    }
    class X_Property extends HTMLElement {
    }
    customElements.define('x-properties', X_Properties, { extends: 'div' });
    customElements.define('x-property', X_Property, { extends: 'div' });
}
class Settings {
    constructor() {
        this.cacheGlobal = {};
        this.cacheServer = {};
        this.updated = false;
        this._staticPropsTag = $("#properties");
        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if (!this.cacheGlobal)
            this.cacheGlobal = {};
        const _this = this;
        this.saveWorker = setInterval(() => {
            if (_this.updated)
                _this.save();
        }, 5 * 1000);
        this.initializeStatic();
    }
    initializeStatic() {
        location.search.substr(1).split("&").forEach(part => {
            let item = part.split("=");
            $.spawn("div")
                .attr("key", item[0])
                .attr("value", item[1])
                .appendTo(this._staticPropsTag);
        });
    }
    static transformStO(input, _default) {
        if (typeof _default === "string")
            return input;
        else if (typeof _default === "number")
            return parseInt(input);
        else if (typeof _default === "boolean")
            return (input == "1" || input == "true");
        else if (typeof _default == "undefined")
            return input;
        return JSON.parse(input);
    }
    static transformOtS(input) {
        if (typeof input === "string")
            return input;
        else if (typeof input === "number")
            return input.toString();
        else if (typeof input === "boolean")
            return input ? "1" : "0";
        else if (typeof input == "undefined")
            return undefined;
        return JSON.stringify(input);
    }
    global(key, _default) {
        let result = this.cacheGlobal[key];
        return Settings.transformStO(result, _default);
    }
    server(key, _default) {
        let result = this.cacheServer[key];
        return Settings.transformStO(result, _default);
    }
    static(key, _default) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        return Settings.transformStO(result.length > 0 ? decodeURIComponent(result.attr("value")) : undefined, _default);
    }
    changeGlobal(key, value) {
        if (this.cacheGlobal[key] == value)
            return;
        this.updated = true;
        this.cacheGlobal[key] = Settings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    changeServer(key, value) {
        if (this.cacheServer[key] == value)
            return;
        this.updated = true;
        this.cacheServer[key] = Settings.transformOtS(value);
        if (Settings.UPDATE_DIRECT)
            this.save();
    }
    setServer(server) {
        if (this.currentServer) {
            this.save();
            this.cacheServer = {};
            this.currentServer = undefined;
        }
        this.currentServer = server;
        if (this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + serverId));
            if (!this.cacheServer)
                this.cacheServer = {};
        }
    }
    save() {
        this.updated = false;
        if (this.currentServer) {
            let serverId = this.currentServer.properties.virtualserver_unique_identifier;
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + serverId, server);
        }
        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
    }
    deleteStatic(key) {
        let result = this._staticPropsTag.find("[key='" + key + "']");
        if (result.length != 0)
            result.detach();
    }
}
Settings.KEY_DISABLE_CONTEXT_MENU = "disableContextMenu";
Settings.KEY_DISABLE_UNLOAD_DIALOG = "disableUnloadDialog";
Settings.UPDATE_DIRECT = true;
//# sourceMappingURL=settings.js.map