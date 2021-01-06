import * as log from "./log";
import {LogCategory, logTrace} from "./log";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {Registry} from "./events";
import { tr } from "./i18n/localize";

export type ConfigValueTypes = boolean | number | string | object;
export type ConfigValueTypeNames = "boolean" | "number" | "string" | "object";

export type ValueTypeMapping<T> = T extends boolean ? "boolean" :
                                   T extends number ? "number" :
                                   T extends string ? "string" :
                                   T extends object ? "object" : never;

export interface SettingsKey<ValueType extends ConfigValueTypes> {
    key: string;
    valueType: ValueTypeMapping<ValueType>;

    defaultValue?: ValueType;

    fallbackKeys?: string | string[];
    fallbackImports?: {[key: string]:(value: string) => ValueType};

    description?: string;

    requireRestart?: boolean;
}

export interface ValuedSettingsKey<ValueType extends ConfigValueTypes> extends SettingsKey<ValueType> {
    defaultValue: ValueType;
}

const kNoValuePresent = "--- no value present ---";

export class SettingsBase {
    protected static readonly UPDATE_DIRECT: boolean = true;

    protected static decodeValueFromString<T extends ConfigValueTypes, DT>(input: string | undefined, type: ConfigValueTypeNames, defaultValue: DT) : T | DT {
        if(input === undefined || input === null)
            return defaultValue;

        switch (type) {
            case "string":
                return input as any;

            case "boolean":
                return (input === "1" || input === "true") as any;

            case "number":
                return parseFloat(input) as any;

            case "object":
                try {
                    return JSON.parse(input);
                } catch (error) {
                    return {} as any;
                }

            default:
                return defaultValue;
        }
    }
    protected static encodeValueToString<T extends ConfigValueTypes>(input: T | undefined) : string | undefined {
        if(input === undefined || input === null)
            return undefined;

        switch (typeof input) {
            case "string":
                return input;

            case "boolean":
                return input ? "1" : "0";

            case "number":
                return input.toString();

            case "object":
                return JSON.stringify(input);

            default:
                return undefined;
        }
    }

    protected static resolveKey<ValueType extends ConfigValueTypes,
                                DefaultType>(key: SettingsKey<ValueType>,
                                                                    resolver: (key: string) => string | undefined,
                                                                    defaultValueType: ConfigValueTypeNames,
                                                                    defaultValue: DefaultType) : ValueType | DefaultType {
        let value = resolver(key.key);
        if(value === undefined && key.fallbackKeys) {
            /* trying fallback values */
            for(const fallback of key.fallbackKeys) {
                value = resolver(fallback);
                if(value === undefined)
                    continue;

                if(!key.fallbackImports)
                    break;

                /* fallback key succeeded */
                const fallbackValueImporter = key.fallbackImports[fallback];
                if(fallbackValueImporter)
                    return fallbackValueImporter(value);
                break;
            }
        }

        return this.decodeValueFromString(value, defaultValueType, defaultValue) as any;
    }
}

export class StaticSettings extends SettingsBase {
    private static _instance: StaticSettings;
    static get instance() : StaticSettings {
        if(!this._instance)
            this._instance = new StaticSettings(true);
        return this._instance;
    }

    protected _handle: StaticSettings;
    protected staticValues = {};

    protected constructor(_reserved = undefined) {
        super();
        if(_reserved && !StaticSettings._instance) {
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
            this.staticValues[item[0]] = decodeURIComponent(item[1]);
        });
    }

    static<V extends ConfigValueTypes, DV>(key: SettingsKey<V>, defaultValue: DV) : V | DV;
    static<V extends ConfigValueTypes>(key: ValuedSettingsKey<V>, defaultValue?: V) : V;

    static<V extends ConfigValueTypes, DV>(key: SettingsKey<V>, defaultValue: DV) : V | DV {
        if(this._handle) {
            return this._handle.static<V, DV>(key, defaultValue);
        }

        return StaticSettings.resolveKey(key, key => this.staticValues[key], key.valueType, arguments.length > 1 ? defaultValue : key.defaultValue);
    }
}

export interface SettingsEvents {
    notify_setting_changed: {
        setting: string,
        mode: "global" | "server",

        oldValue: string,
        newValue: string,

        newCastedValue: any
    }
}

export class Settings extends StaticSettings {
    static readonly KEY_USER_IS_NEW: ValuedSettingsKey<boolean> = {
        key: 'user_is_new_user',
        valueType: "boolean",
        defaultValue: true
    };

    static readonly KEY_LOG_LEVEL: SettingsKey<number> = {
        key: 'log.level',
        valueType: "number"
    };

    static readonly KEY_DISABLE_COSMETIC_SLOWDOWN: ValuedSettingsKey<boolean> = {
        key: 'disable_cosmetic_slowdown',
        description: 'Disable the cosmetic slowdows in some processes, like icon upload.',
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_DISABLE_CONTEXT_MENU: ValuedSettingsKey<boolean> = {
        key: 'disableContextMenu',
        description: 'Disable the context menu for the channel tree which allows to debug the DOM easier',
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_DISABLE_GLOBAL_CONTEXT_MENU: ValuedSettingsKey<boolean> = {
        key: 'disableGlobalContextMenu',
        description: 'Disable the general context menu',
        defaultValue: true,
        valueType: "boolean",
    };

    static readonly KEY_DISABLE_UNLOAD_DIALOG: ValuedSettingsKey<boolean> = {
        key: 'disableUnloadDialog',
        description: 'Disables the unload popup on side closing',
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_DISABLE_VOICE: ValuedSettingsKey<boolean> = {
        key: 'disableVoice',
        description: 'Disables the voice bridge. If disabled, the audio and codec workers aren\'t required anymore',
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_DISABLE_MULTI_SESSION: ValuedSettingsKey<boolean> = {
        key: 'disableMultiSession',
        defaultValue: false,
        requireRestart: true,
        valueType: "boolean",
    };

    static readonly KEY_LOAD_DUMMY_ERROR: ValuedSettingsKey<boolean> = {
        key: 'dummy_load_error',
        description: 'Triggers a loading error at the end of the loading process.',
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_I18N_DEFAULT_REPOSITORY: ValuedSettingsKey<string> = {
        key: 'i18n.default_repository',
        valueType: "string",
        defaultValue: "https://web.teaspeak.de/i18n/"
    };

    /* Default client states */
    static readonly KEY_CLIENT_STATE_MICROPHONE_MUTED: ValuedSettingsKey<boolean> = {
        key: 'client_state_microphone_muted',
        defaultValue: false,
        fallbackKeys: ["mute_input"],
        valueType: "boolean",
    };

    static readonly KEY_CLIENT_STATE_SPEAKER_MUTED: ValuedSettingsKey<boolean> = {
        key: 'client_state_speaker_muted',
        defaultValue: false,
        fallbackKeys: ["mute_output"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_QUERY_SHOWN: ValuedSettingsKey<boolean> = {
        key: 'client_state_query_shown',
        defaultValue: false,
        fallbackKeys: ["show_server_queries"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS: ValuedSettingsKey<boolean> = {
        key: 'client_state_subscribe_all_channels',
        defaultValue: true,
        fallbackKeys: ["channel_subscribe_all"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_AWAY: ValuedSettingsKey<boolean> = {
        key: 'client_state_away',
        defaultValue: false,
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_AWAY_MESSAGE: ValuedSettingsKey<string> = {
        key: 'client_away_message',
        defaultValue: "",
        valueType: "string"
    };

    /* Connect parameters */
    static readonly KEY_FLAG_CONNECT_DEFAULT: ValuedSettingsKey<boolean> = {
        key: 'connect_default',
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_CONNECT_ADDRESS: ValuedSettingsKey<string> = {
        key: 'connect_address',
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_CONNECT_PROFILE: ValuedSettingsKey<string> = {
        key: 'connect_profile',
        defaultValue: 'default',
        valueType: "string",
    };
    static readonly KEY_CONNECT_USERNAME: ValuedSettingsKey<string> = {
        key: 'connect_username',
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_CONNECT_PASSWORD: ValuedSettingsKey<string> = {
        key: 'connect_password',
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_FLAG_CONNECT_PASSWORD: ValuedSettingsKey<boolean> = {
        key: 'connect_password_hashed',
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_CONNECT_HISTORY: ValuedSettingsKey<string> = {
        key: 'connect_history',
        valueType: "string",
        defaultValue: ""
    };
    static readonly KEY_CONNECT_SHOW_HISTORY: ValuedSettingsKey<boolean> = {
        key: 'connect_show_last_servers',
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_CONNECT_NO_SINGLE_INSTANCE: ValuedSettingsKey<boolean> = {
        key: 'connect_no_single_instance',
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_CONNECT_NO_DNSPROXY: ValuedSettingsKey<boolean> = {
        key: 'connect_no_dnsproxy',
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_CERTIFICATE_CALLBACK: ValuedSettingsKey<string> = {
        key: 'certificate_callback',
        valueType: "string",
        defaultValue: undefined
    };

    /* sounds */
    static readonly KEY_SOUND_MASTER: ValuedSettingsKey<number> = {
        key: 'audio_master_volume',
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_SOUND_MASTER_SOUNDS: ValuedSettingsKey<number> = {
        key: 'audio_master_volume_sounds',
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_SOUND_VOLUMES: SettingsKey<string> = {
        key: 'sound_volume',
        valueType: "string",
    };

    static readonly KEY_CHAT_FIXED_TIMESTAMPS: ValuedSettingsKey<boolean> = {
        key: 'chat_fixed_timestamps',
        defaultValue: false,
        description: 'Enables fixed timestamps for chat messages and disabled the updating once (2 seconds ago... etc)',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_COLLOQUIAL_TIMESTAMPS: ValuedSettingsKey<boolean> = {
        key: 'chat_colloquial_timestamps',
        defaultValue: true,
        description: 'Enabled colloquial timestamp formatting like "Yesterday at ..." or "Today at ..."',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_COLORED_EMOJIES: ValuedSettingsKey<boolean> = {
        key: 'chat_colored_emojies',
        defaultValue: true,
        description: 'Enables colored emojies powered by Twemoji',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_HIGHLIGHT_CODE: ValuedSettingsKey<boolean> = {
        key: 'chat_highlight_code',
        defaultValue: true,
        description: 'Enables code highlighting within the chat (Client restart required)',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_TAG_URLS: ValuedSettingsKey<boolean> = {
        key: 'chat_tag_urls',
        defaultValue: true,
        description: 'Automatically link urls with [url]',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_ENABLE_MARKDOWN: ValuedSettingsKey<boolean> = {
        key: 'chat_enable_markdown',
        defaultValue: true,
        description: 'Enabled markdown chat support.',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_ENABLE_BBCODE: ValuedSettingsKey<boolean> = {
        key: 'chat_enable_bbcode',
        defaultValue: false,
        description: 'Enabled bbcode support in chat.',
        valueType: "boolean",
    };

    static readonly KEY_CHAT_IMAGE_WHITELIST_REGEX: ValuedSettingsKey<string> = {
        key: 'chat_image_whitelist_regex',
        defaultValue: JSON.stringify([]),
        valueType: "string",
    };

    static readonly KEY_SWITCH_INSTANT_CHAT: ValuedSettingsKey<boolean> = {
        key: 'switch_instant_chat',
        defaultValue: true,
        description: 'Directly switch to channel chat on channel select',
        valueType: "boolean",
    };

    static readonly KEY_SWITCH_INSTANT_CLIENT: ValuedSettingsKey<boolean> = {
        key: 'switch_instant_client',
        defaultValue: true,
        description: 'Directly switch to client info on client select',
        valueType: "boolean",
    };

    static readonly KEY_HOSTBANNER_BACKGROUND: ValuedSettingsKey<boolean> = {
        key: 'hostbanner_background',
        defaultValue: false,
        description: 'Enables a default background begind the hostbanner',
        valueType: "boolean",
    };

    static readonly KEY_CHANNEL_EDIT_ADVANCED: ValuedSettingsKey<boolean> = {
        key: 'channel_edit_advanced',
        defaultValue: false,
        description: 'Edit channels in advanced mode with a lot more settings',
        valueType: "boolean",
    };

    static readonly KEY_PERMISSIONS_SHOW_ALL: ValuedSettingsKey<boolean> = {
        key: 'permissions_show_all',
        defaultValue: false,
        description: 'Show all permissions even thou they dont make sense for the server/channel group',
        valueType: "boolean",
    };

    static readonly KEY_TEAFORO_URL: ValuedSettingsKey<string> = {
        key: "teaforo_url",
        defaultValue: "https://forum.teaspeak.de/",
        valueType: "string",
    };

    static readonly KEY_FONT_SIZE: ValuedSettingsKey<number> = {
        key: "font_size",
        valueType: "number",
        defaultValue: 14  //parseInt(getComputedStyle(document.body).fontSize)
    };

    static readonly KEY_ICON_SIZE: ValuedSettingsKey<number> = {
        key: "icon_size",
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_KEYCONTROL_DATA: ValuedSettingsKey<string> = {
        key: "keycontrol_data",
        defaultValue: "{}",
        valueType: "string",
    };

    static readonly KEY_LAST_INVITE_LINK_TYPE: ValuedSettingsKey<string> = {
        key: "last_invite_link_type",
        defaultValue: "tea-web",
        valueType: "string",
    };

    static readonly KEY_TRANSFERS_SHOW_FINISHED: ValuedSettingsKey<boolean> = {
        key: 'transfers_show_finished',
        defaultValue: true,
        description: "Show finished file transfers in the file transfer list",
        valueType: "boolean",
    };

    static readonly KEY_TRANSFER_DOWNLOAD_FOLDER: SettingsKey<string> = {
        key: "transfer_download_folder",
        description: "The download folder for the file transfer downloads",
        valueType: "string",
        /* defaultValue: <users download directory> */
    };

    static readonly  KEY_IPC_REMOTE_ADDRESS: SettingsKey<string> = {
        key: "ipc-address",
        valueType: "string"
    };

    static readonly KEY_W2G_SIDEBAR_COLLAPSED: ValuedSettingsKey<boolean> = {
        key: 'w2g_sidebar_collapsed',
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_VOICE_ECHO_TEST_ENABLED: ValuedSettingsKey<boolean> = {
        key: 'voice_echo_test_enabled',
        defaultValue: true,
        valueType: "boolean",
    };

    static readonly KEY_RNNOISE_FILTER: ValuedSettingsKey<boolean> = {
        key: 'rnnoise_filter',
        defaultValue: true,
        description: 'Enable the rnnoise filter for supressing background noise',
        valueType: "boolean",
    };

    static readonly KEY_LOADER_ANIMATION_ABORT: ValuedSettingsKey<boolean> = {
        key: 'loader_animation_abort',
        defaultValue: false,
        description: 'Abort the loader animation when the app has been finished loading',
        valueType: "boolean",
    };

    static readonly KEY_STOP_VIDEO_ON_SWITCH: ValuedSettingsKey<boolean> = {
        key: 'stop_video_on_channel_switch',
        defaultValue: true,
        description: 'Stop video broadcasting on channel switch',
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_SHOW_ALL_CLIENTS: ValuedSettingsKey<boolean> = {
        key: 'video_show_all_clients',
        defaultValue: false,
        description: "Show all clients within the video frame, even if they're not broadcasting video",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_FORCE_SHOW_OWN_VIDEO: ValuedSettingsKey<boolean> = {
        key: 'video_force_show_own_video',
        defaultValue: true,
        description: "Show own video preview even if you're not broadcasting any video",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_AUTO_SUBSCRIBE_MODE: ValuedSettingsKey<number> = {
        key: 'video_auto_subscribe_mode',
        defaultValue: 1,
        description: "Auto subscribe to incoming videos.\n0 := Do not auto subscribe.\n1 := Auto subscribe to the first video.\n2 := Subscribe to all incoming videos.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_MAX_WIDTH: ValuedSettingsKey<number> = {
        key: 'video_default_max_width',
        defaultValue: 1280,
        description: "The default maximal width of the video being crated.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_MAX_HEIGHT: ValuedSettingsKey<number> = {
        key: 'video_default_max_height',
        defaultValue: 720,
        description: "The default maximal height of the video being crated.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DYNAMIC_QUALITY: ValuedSettingsKey<boolean> = {
        key: 'video_dynamic_quality',
        defaultValue: true,
        description: "Dynamically decrease video quality in order to archive a higher framerate.",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_DYNAMIC_FRAME_RATE: ValuedSettingsKey<boolean> = {
        key: 'video_dynamic_frame_rate',
        defaultValue: true,
        description: "Dynamically decrease video framerate to allow higher video resolutions.",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_QUICK_SETUP: ValuedSettingsKey<boolean> = {
        key: 'video_quick_setup',
        defaultValue: true,
        description: "Automatically select the default video device and start broadcasting without the video configure dialog.",
        valueType: "boolean",
    };

    static readonly FN_LOG_ENABLED: (category: string) => SettingsKey<boolean> = category => {
        return {
            key: "log." + category.toLowerCase() + ".enabled",
            valueType: "boolean",
        }
    };

    static readonly FN_SEPARATOR_STATE: (separator: string) => SettingsKey<string> = separator => {
        return {
            key: "separator-settings-" + separator,
            valueType: "string",
            fallbackKeys: ["seperator-settings-" + separator]
        }
    };

    static readonly FN_LOG_LEVEL_ENABLED: (category: string) => SettingsKey<boolean> = category => {
        return {
            key: "log.level." + category.toLowerCase() + ".enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_INVITE_LINK_SETTING: (name: string) => SettingsKey<string> = name => {
        return {
            key: 'invite_link_setting_' + name,
            valueType: "string",
        }
    };

    static readonly FN_SERVER_CHANNEL_SUBSCRIBE_MODE: (channel_id: number) => SettingsKey<number> = channel => {
        return {
            key: 'channel_subscribe_mode_' + channel,
            valueType: "number",
        }
    };

    static readonly FN_SERVER_CHANNEL_COLLAPSED: (channel_id: number) => ValuedSettingsKey<boolean> = channel => {
        return {
            key: 'channel_collapsed_' + channel,
            defaultValue: false,
            valueType: "boolean",
        }
    };

    static readonly FN_PROFILE_RECORD: (name: string) => SettingsKey<object> = name => {
        return {
            key: 'profile_record' + name,
            valueType: "object",
        }
    };

    static readonly FN_CHANNEL_CHAT_READ: (id: number) => SettingsKey<number> = id => {
        return {
            key: 'channel_chat_read_' + id,
            valueType: "number",
        }
    };

    static readonly FN_CLIENT_MUTED: (clientUniqueId: string) => SettingsKey<boolean> = clientUniqueId => {
        return {
            key: "client_" + clientUniqueId + "_muted",
            valueType: "boolean",
            fallbackKeys: ["mute_client_" + clientUniqueId]
        }
    };

    static readonly FN_CLIENT_VOLUME: (clientUniqueId: string) => SettingsKey<number> = clientUniqueId => {
        return {
            key: "client_" + clientUniqueId + "_volume",
            valueType: "number",
            fallbackKeys: ["volume_client_" + clientUniqueId]
        }
    };

    static readonly FN_EVENTS_NOTIFICATION_ENABLED: (event: string) => SettingsKey<boolean> = event => {
        return {
            key: "event_notification_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_EVENTS_LOG_ENABLED: (event: string) => SettingsKey<boolean> = event => {
        return {
            key: "event_log_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_EVENTS_FOCUS_ENABLED: (event: string) => SettingsKey<boolean> = event => {
        return {
            key: "event_focus_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly KEYS = (() => {
        const result = [];

        for(const key of Object.keys(Settings)) {
            if(!key.toUpperCase().startsWith("KEY_"))
                continue;

            result.push(key);
        }

        return result;
    })();

    static initialize() {
        settings = new Settings();
        (window as any).settings = settings;
        (window as any).Settings = Settings;
    }

    readonly events: Registry<SettingsEvents>;
    private readonly cacheGlobal = {};
    private saveWorker: number;
    private updated: boolean = false;

    constructor() {
        super();

        this.events = new Registry<SettingsEvents>();
        const json = localStorage.getItem("settings.global");
        try {
            this.cacheGlobal = JSON.parse(json);
        } catch(error) {
            log.error(LogCategory.GENERAL, tr("Failed to load global settings!\nJson: %s\nError: %o"), json, error);

            const show_popup = () => {
                //FIXME: Readd this
                //createErrorModal(tr("Failed to load global settings"), tr("Failed to load global client settings!\nLookup console for more information.")).open();
            };
            if(!loader.finished())
                loader.register_task(loader.Stage.LOADED, {
                    priority: 0,
                    name: "Settings error",
                    function: async () => show_popup()
                });
            else
                show_popup();
        }
        if(!this.cacheGlobal) this.cacheGlobal = {};
        this.saveWorker = setInterval(() => {
            if(this.updated)
                this.save();
        }, 5 * 1000);
    }

    static_global<V extends ConfigValueTypes>(key: ValuedSettingsKey<V>, defaultValue?: V) : V;
    static_global<V extends ConfigValueTypes, DV>(key: SettingsKey<V>, defaultValue: DV) : V | DV;
    static_global<V extends ConfigValueTypes, DV>(key: SettingsKey<V> | ValuedSettingsKey<V>, defaultValue: DV) : V | DV {
        const staticValue = this.static(key, kNoValuePresent);
        if(staticValue !== kNoValuePresent)
            return staticValue;

        if(arguments.length > 1)
            return this.global(key, defaultValue);
        return this.global(key as ValuedSettingsKey<V>);
    }

    global<V extends ConfigValueTypes, DV>(key: SettingsKey<V>, defaultValue: DV) : V | DV;
    global<V extends ConfigValueTypes>(key: ValuedSettingsKey<V>, defaultValue?: V) : V;
    global<V extends ConfigValueTypes, DV>(key: SettingsKey<V>, defaultValue: DV) : V | DV {
        return StaticSettings.resolveKey(key, key => this.cacheGlobal[key], key.valueType, arguments.length > 1 ? defaultValue : key.defaultValue);
    }

    changeGlobal<T extends ConfigValueTypes>(key: SettingsKey<T>, value?: T){
        if(this.cacheGlobal[key.key] === value)
            return;

        this.updated = true;
        const oldValue = this.cacheGlobal[key.key];
        this.cacheGlobal[key.key] = StaticSettings.encodeValueToString(value);
        this.events.fire("notify_setting_changed", {
            mode: "global",
            newValue: this.cacheGlobal[key.key],
            oldValue: oldValue,
            setting: key.key,
            newCastedValue: value
        });
        logTrace(LogCategory.GENERAL, tr("Changing global setting %s to %o"), key.key, value);

        if(Settings.UPDATE_DIRECT)
            this.save();
    }

    globalChangeListener<T extends ConfigValueTypes>(key: SettingsKey<T>, listener: (newValue: T) => void) : () => void {
        return this.events.on("notify_setting_changed", event => {
            if(event.setting === key.key && event.mode === "global") {
                listener(event.newCastedValue);
            }
        })
    }

    save() {
        this.updated = false;
        let global = JSON.stringify(this.cacheGlobal);
        localStorage.setItem("settings.global", global);
        if(localStorage.save)
            localStorage.save();
    }
}

export class ServerSettings extends SettingsBase {
    private cacheServer = {};
    private _server_unique_id: string;
    private _server_save_worker: number;
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

    server<V extends ConfigValueTypes, DV extends V | undefined = undefined>(key: SettingsKey<V>, defaultValue?: DV) : V | DV {
        if(this._destroyed)
            throw "destroyed";

        return StaticSettings.resolveKey(key, key => this.cacheServer[key], key.valueType, arguments.length > 1 ? defaultValue : key.defaultValue);
    }

    changeServer<T extends ConfigValueTypes>(key: SettingsKey<T>, value?: T) {
        if(this._destroyed) throw "destroyed";

        if(this.cacheServer[key.key] === value)
            return;

        this._server_settings_updated = true;
        this.cacheServer[key.key] = StaticSettings.encodeValueToString(value);

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

            const json = localStorage.getItem("settings.server_" + server_unique_id);
            try {
                this.cacheServer = JSON.parse(json);
            } catch(error) {
                log.error(LogCategory.GENERAL, tr("Failed to load server settings for server %s!\nJson: %s\nError: %o"), server_unique_id, json, error);
            }
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

export let settings: Settings = null;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 1000,
    name: "Settings initialize",
    function: async () => Settings.initialize()
})