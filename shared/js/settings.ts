//Used by CertAccept popup

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
    default_value?: T;

    require_restart?: boolean;
}

class SettingsBase {
    protected static readonly UPDATE_DIRECT: boolean = true;

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

        return SettingsBase.transformStO(value as string, _default, default_type);
    }

    protected static keyify<T>(key: string | SettingsKey<T>) : SettingsKey<T> {
        if(typeof(key) === "string")
            return {key: key};
        if(typeof(key) === "object" && key.key)
            return key;
        throw "key is not a key";
    }
}

class StaticSettings extends SettingsBase {
    private static _instance: StaticSettings;
    static get instance() : StaticSettings {
        if(!this._instance)
            this._instance = new StaticSettings(true);
        return this._instance;
    }

    protected _handle: StaticSettings;
    protected _staticPropsTag: JQuery;

    protected constructor(_reserved = undefined) {
        super();
        if(_reserved && !StaticSettings._instance) {
            this._staticPropsTag = $("#properties");
            this.initializeStatic();
        } else {
            this._handle = StaticSettings.instance;
        }
    }

    private initializeStatic() {
        let search;
        if(window.opener && window.opener !== window) {
            search = new URL(window.location.href).search;
        } else {
            search = location.search;
        }

        search.substr(1).split("&").forEach(part => {
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
    static readonly KEY_DISABLE_COSMETIC_SLOWDOWN: SettingsKey<boolean> = {
        key: 'disable_cosmetic_slowdown',
        description: 'Disable the cosmetic slowdows in some processes, like icon upload.'
    };

    static readonly KEY_DISABLE_CONTEXT_MENU: SettingsKey<boolean> = {
        key: 'disableContextMenu',
        description: 'Disable the context menu for the channel tree which allows to debug the DOM easier'
    };

    static readonly KEY_DISABLE_GLOBAL_CONTEXT_MENU: SettingsKey<boolean> = {
        key: 'disableGlobalContextMenu',
        description: 'Disable the general context menu prevention',
        default_value: false
    };

    static readonly KEY_DISABLE_UNLOAD_DIALOG: SettingsKey<boolean> = {
        key: 'disableUnloadDialog',
        description: 'Disables the unload popup on side closing'
    };
    static readonly KEY_DISABLE_VOICE: SettingsKey<boolean> = {
        key: 'disableVoice',
        description: 'Disables the voice bridge. If disabled, the audio and codec workers aren\'t required anymore'
    };
    static readonly KEY_DISABLE_MULTI_SESSION: SettingsKey<boolean> = {
        key: 'disableMultiSession',
        default_value: false,
        require_restart: true
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
    static readonly KEY_CONNECT_HISTORY: SettingsKey<string> = {
        key: 'connect_history'
    };

    static readonly KEY_CERTIFICATE_CALLBACK: SettingsKey<string> = {
        key: 'certificate_callback'
    };

    /* sounds */
    static readonly KEY_SOUND_MASTER: SettingsKey<number> = {
        key: 'audio_master_volume',
        default_value: 100
    };

    static readonly KEY_SOUND_MASTER_SOUNDS: SettingsKey<number> = {
        key: 'audio_master_volume_sounds',
        default_value: 100
    };

    static readonly KEY_CHAT_FIXED_TIMESTAMPS: SettingsKey<boolean> = {
        key: 'chat_fixed_timestamps',
        default_value: false,
        description: 'Enables fixed timestamps for chat messages and disabled the updating once (2 seconds ago... etc)'
    };

    static readonly KEY_CHAT_COLLOQUIAL_TIMESTAMPS: SettingsKey<boolean> = {
        key: 'chat_colloquial_timestamps',
        default_value: true,
        description: 'Enabled colloquial timestamp formatting like "Yesterday at ..." or "Today at ..."'
    };

    static readonly KEY_CHAT_COLORED_EMOJIES: SettingsKey<boolean> = {
        key: 'chat_colored_emojies',
        default_value: true,
        description: 'Enables colored emojies powered by Twemoji'
    };

    static readonly KEY_CHAT_TAG_URLS: SettingsKey<boolean> = {
        key: 'chat_tag_urls',
        default_value: true,
        description: 'Automatically link urls with [url]'
    };

    static readonly KEY_CHAT_ENABLE_MARKDOWN: SettingsKey<boolean> = {
        key: 'chat_enable_markdown',
        default_value: true,
        description: 'Enabled markdown chat support.'
    };

    static readonly KEY_CHAT_ENABLE_BBCODE: SettingsKey<boolean> = {
        key: 'chat_enable_bbcode',
        default_value: true,
        description: 'Enabled bbcode support in chat.'
    };

    static readonly KEY_SWITCH_INSTANT_CHAT: SettingsKey<boolean> = {
        key: 'switch_instant_chat',
        default_value: true,
        description: 'Directly switch to channel chat on channel select'
    };

    static readonly KEY_SWITCH_INSTANT_CLIENT: SettingsKey<boolean> = {
        key: 'switch_instant_client',
        default_value: true,
        description: 'Directly switch to client info on client select'
    };

    static readonly KEY_HOSTBANNER_BACKGROUND: SettingsKey<boolean> = {
        key: 'hostbanner_background',
        default_value: false,
        description: 'Enables a default background begind the hostbanner'
    };

    static readonly KEY_CHANNEL_EDIT_ADVANCED: SettingsKey<boolean> = {
        key: 'channel_edit_advanced',
        default_value: false,
        description: 'Edit channels in advanced mode with a lot more settings'
    };

    static readonly KEY_TEAFORO_URL: SettingsKey<string> = {
        key: "teaforo_url",
        default_value: "https://forum.teaspeak.de/"
    };

    static readonly KEY_FONT_SIZE: SettingsKey<number> = {
        key: "font_size"
    };

    static readonly KEY_ICON_SIZE: SettingsKey<number> = {
        key: "icon_size",
        default_value: 100
    };

    static readonly KEY_LAST_INVITE_LINK_TYPE: SettingsKey<string> = {
        key: "last_invite_link_type",
        default_value: "tea-web"
    };

    static readonly FN_INVITE_LINK_SETTING: (name: string) => SettingsKey<string> = name => {
        return {
            key: 'invite_link_setting_' + name
        }
    };

    static readonly FN_SERVER_CHANNEL_SUBSCRIBE_MODE: (channel_id: number) => SettingsKey<number> = channel => {
        return {
            key: 'channel_subscribe_mode_' + channel
        }
    };

    static readonly FN_PROFILE_RECORD: (name: string) => SettingsKey<any> = name => {
        return {
            key: 'profile_record' + name
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

    static initialize() {
        settings = new Settings();
    }

    private cacheGlobal = {};
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
        const actual_default = typeof(_default) === "undefined" && typeof(key) === "object" && 'default_value' in key ? key.default_value : _default;

        const default_object = { seed: Math.random() } as any;
        let _static = this.static(key, default_object, typeof _default);
        if(_static !== default_object) return StaticSettings.transformStO(_static, actual_default);
        return this.global<T>(key, actual_default);
    }

    global?<T>(key: string | SettingsKey<T>, _default?: T) : T {
        const actual_default = typeof(_default) === "undefined" && typeof(key) === "object" && 'default_value' in key ? key.default_value : _default;
        return StaticSettings.resolveKey(Settings.keyify(key), actual_default, key => this.cacheGlobal[key]);
    }

    changeGlobal<T>(key: string | SettingsKey<T>, value?: T){
        key = Settings.keyify(key);


        if(this.cacheGlobal[key.key] == value) return;

        this.updated = true;
        this.cacheGlobal[key.key] = StaticSettings.transformOtS(value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    save() {
        this.updated = false;
        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
        if(localStorage.save)
            localStorage.save();
    }
}

class ServerSettings extends SettingsBase {
    private cacheServer = {};
    private _server_unique_id: string;
    private _server_save_worker: NodeJS.Timer;
    private _server_settings_updated: boolean = false;
    private _destroyed = false;

    constructor() {
        super();
        this._server_save_worker = setInterval(() => {
            if(this._server_settings_updated)
                this.save();
        }, 5 * 1000);
    }

    destroy() {
        this._destroyed = true;

        this._server_unique_id = undefined;
        this.cacheServer = undefined;

        clearInterval(this._server_save_worker);
        this._server_save_worker = undefined;
    }

    server?<T>(key: string | SettingsKey<T>, _default?: T) : T {
        if(this._destroyed) throw "destroyed";
        return StaticSettings.resolveKey(Settings.keyify(key), _default, key => this.cacheServer[key]);
    }

    changeServer<T>(key: string | SettingsKey<T>, value?: T) {
        if(this._destroyed) throw "destroyed";
        key = Settings.keyify(key);

        if(this.cacheServer[key.key] == value) return;

        this._server_settings_updated = true;
        this.cacheServer[key.key] = StaticSettings.transformOtS(value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    setServer(server_unique_id: string) {
        if(this._destroyed) throw "destroyed";
        if(this._server_unique_id) {
            this.save();
            this.cacheServer = {};
            this._server_unique_id = undefined;
        }
        this._server_unique_id = server_unique_id;

        if(this._server_unique_id) {
            this.cacheServer = JSON.parse(localStorage.getItem("settings.server_" + server_unique_id));
            if(!this.cacheServer)
                this.cacheServer = {};
        }
    }

    save() {
        if(this._destroyed) throw "destroyed";
        this._server_settings_updated = false;

        if(this._server_unique_id) {
            let server = JSON.stringify(this.cacheServer);
            localStorage.setItem("settings.server_" + this._server_unique_id, server);
            if(localStorage.save)
                localStorage.save();
        }
    }
}

let settings: Settings;