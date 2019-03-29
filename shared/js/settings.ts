/// <reference path="client.ts" />

if(typeof(customElements) !== "undefined") {
    try {
        class X_Properties extends HTMLElement {}
        class X_Property extends HTMLElement {}

        customElements.define('x-properties', X_Properties, { extends: 'div' });
        customElements.define('x-property', X_Property, { extends: 'div' });
    } catch(error) {
        console.warn("failed to define costum elements");
    }
}

/* T = value type */
interface SettingsKey<T> {
    key: string;

    fallback_keys?: string | string[];
    fallback_imports?: {[key: string]:(value: string) => T};
    description?: string;
}

class StaticSettings {
    private static _instance: StaticSettings;
    static get instance() : StaticSettings {
        if(!this._instance)
            this._instance = new StaticSettings(true);
        return this._instance;
    }

    protected static transformStO?<T>(input?: string, _default?: T, default_type?: string) : T {
        default_type = default_type || typeof _default;

        if      (typeof input === "undefined") return _default;
        if      (default_type === "string")     return input as any;
        else if (default_type === "number")     return parseInt(input) as any;
        else if (default_type === "boolean")    return (input == "1" || input == "true") as any;
        else if (default_type === "undefined")   return input as any;
        return JSON.parse(input) as any;
    }

    protected static transformOtS?<T>(input: T) : string {
        if      (typeof input === "string")     return input as string;
        else if (typeof input === "number")     return input.toString();
        else if (typeof input === "boolean")    return input ? "1" : "0";
        else if (typeof input === "undefined")  return undefined;
        return JSON.stringify(input);
    }

    protected static resolveKey<T>(key: SettingsKey<T>, _default: T, resolver: (key: string) => string | boolean, default_type?: string) : T {
        let value = resolver(key.key);
        if(!value) {
            /* trying fallbacks */
            for(const fallback of key.fallback_keys || []) {
                value = resolver(fallback);
                if(typeof(value) === "string") {
                    /* fallback key succeeded */
                    const importer = (key.fallback_imports || {})[fallback];
                    if(importer)
                        return importer(value);
                    break;
                }
            }
        }
        if(typeof(value) !== 'string')
            return _default;

        return StaticSettings.transformStO(value as string, _default, default_type);
    }

    protected static keyify<T>(key: string | SettingsKey<T>) : SettingsKey<T> {
        if(typeof(key) === "string")
            return {key: key};
        if(typeof(key) === "object" && key.key)
            return key;
        throw "key is not a key";
    }

    protected _handle: StaticSettings;
    protected _staticPropsTag: JQuery;

    protected constructor(_reserved = undefined) {
        if(_reserved && !StaticSettings._instance) {
            this._staticPropsTag = $("#properties");
            this.initializeStatic();
        } else {
            this._handle = StaticSettings.instance;
        }
    }

    private initializeStatic() {
        location.search.substr(1).split("&").forEach(part => {
            let item = part.split("=");
            $("<x-property></x-property>")
                .attr("key", item[0])
                .attr("value", item[1])
                .appendTo(this._staticPropsTag);
        });
    }

    static?<T>(key: string | SettingsKey<T>, _default?: T, default_type?: string) : T {
        if(this._handle) return this._handle.static<T>(key, _default, default_type);

        key = StaticSettings.keyify(key);
        return StaticSettings.resolveKey(key, _default, key => {
            let result = this._staticPropsTag.find("[key='" + key + "']");
            if(result.length > 0)
                return decodeURIComponent(result.last().attr('value'));
            return false;
        }, default_type);
    }

    deleteStatic<T>(key: string | SettingsKey<T>) {
        if(this._handle) {
            this._handle.deleteStatic<T>(key);
            return;
        }

        key = StaticSettings.keyify(key);
        let result = this._staticPropsTag.find("[key='" + key.key + "']");
        if(result.length != 0) result.detach();
    }
}

class Settings extends StaticSettings {
    static readonly KEY_DISABLE_CONTEXT_MENU: SettingsKey<boolean> = {
        key: 'disableContextMenu',
        description: 'Disable the context menu for the channel tree which allows to debug the DOM easier'
    };
    static readonly KEY_DISABLE_UNLOAD_DIALOG: SettingsKey<boolean> = {
        key: 'disableUnloadDialog',
        description: 'Disables the unload popup on side closing'
    };
    static readonly KEY_DISABLE_VOICE: SettingsKey<boolean> = {
        key: 'disableVoice',
        description: 'Disables the voice bridge. If disabled, the audio and codec workers aren\'t required anymore'
    };

    static readonly KEY_LOAD_DUMMY_ERROR: SettingsKey<boolean> = {
        key: 'dummy_load_error',
        description: 'Triggers a loading error at the end of the loading process.'
    };

    /* Control bar */
    static readonly KEY_CONTROL_MUTE_INPUT: SettingsKey<boolean> = {
        key: 'mute_input'
    };
    static readonly KEY_CONTROL_MUTE_OUTPUT: SettingsKey<boolean> = {
        key: 'mute_output'
    };
    static readonly KEY_CONTROL_SHOW_QUERIES: SettingsKey<boolean> = {
        key: 'show_server_queries'
    };
    static readonly KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL: SettingsKey<boolean> = {
        key: 'channel_subscribe_all'
    };

    /* Connect parameters */
    static readonly KEY_FLAG_CONNECT_DEFAULT: SettingsKey<boolean> = {
        key: 'connect_default'
    };
    static readonly KEY_CONNECT_ADDRESS: SettingsKey<string> = {
        key: 'connect_address'
    };
    static readonly KEY_CONNECT_PROFILE: SettingsKey<string> = {
        key: 'connect_profile'
    };
    static readonly KEY_CONNECT_USERNAME: SettingsKey<string> = {
        key: 'connect_username'
    };
    static readonly KEY_CONNECT_PASSWORD: SettingsKey<string> = {
        key: 'connect_password'
    };
    static readonly KEY_FLAG_CONNECT_PASSWORD: SettingsKey<boolean> = {
        key: 'connect_password_hashed'
    };

    static readonly FN_SERVER_CHANNEL_SUBSCRIBE_MODE: (channel: ChannelEntry) => SettingsKey<ChannelSubscribeMode> = channel => {
        return {
            key: 'channel_subscribe_mode_' + channel.getChannelId()
        }
    };

    static readonly KEYS = (() => {
        const result = [];

        for(const key in Settings) {
            if(!key.toUpperCase().startsWith("KEY_"))
                continue;
            if(key.toUpperCase() == "KEYS")
                continue;

            result.push(key);
        }

        return result;
    })();

    private static readonly UPDATE_DIRECT: boolean = true;
    private cacheGlobal = {};
    private cacheServer = {};
    private currentServer: ServerEntry;
    private saveWorker: NodeJS.Timer;
    private updated: boolean = false;

    constructor() {
        super();
        this.cacheGlobal = JSON.parse(localStorage.getItem("settings.global"));
        if(!this.cacheGlobal) this.cacheGlobal = {};
        this.saveWorker = setInterval(() => {
            if(this.updated)
                this.save();
        }, 5 * 1000);
    }

    static_global?<T>(key: string | SettingsKey<T>, _default?: T) : T {
        const default_object = { seed: Math.random() } as any;
        let _static = this.static(key, default_object, typeof _default);
        if(_static !== default_object) return StaticSettings.transformStO(_static, _default);
        return this.global<T>(key, _default);
    }

    global?<T>(key: string | SettingsKey<T>, _default?: T) : T {
        return StaticSettings.resolveKey(Settings.keyify(key), _default, key => this.cacheGlobal[key]);
    }

    server?<T>(key: string | SettingsKey<T>, _default?: T) : T {
        return StaticSettings.resolveKey(Settings.keyify(key), _default, key => this.cacheServer[key]);
    }

    changeGlobal<T>(key: string | SettingsKey<T>, value?: T){
        key = Settings.keyify(key);


        if(this.cacheGlobal[key.key] == value) return;

        this.updated = true;
        this.cacheGlobal[key.key] = StaticSettings.transformOtS(value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    changeServer<T>(key: string | SettingsKey<T>, value?: T) {
        key = Settings.keyify(key);

        if(this.cacheServer[key.key] == value) return;

        this.updated = true;
        this.cacheServer[key.key] = StaticSettings.transformOtS(value);

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
}