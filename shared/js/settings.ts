import {LogCategory, logError, logInfo, logTrace} from "./log";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {Registry} from "./events";
import {tr} from "./i18n/localize";
import {CallOnce, ignorePromise} from "tc-shared/proto";
import {getStorageAdapter} from "tc-shared/StorageAdapter";

/*
 * TODO: Sync settings across renderer instances
 */

export type RegistryValueType = boolean | number | string | object;
export type RegistryValueTypeNames = "boolean" | "number" | "string" | "object";

export type RegistryValueTypeMapping<T> = T extends boolean ? "boolean" :
                                  T extends number ? "number" :
                                  T extends string ? "string" :
                                  T extends object ? "object" :
                                  never;

export interface RegistryKey<ValueType extends RegistryValueType> {
    key: string;
    valueType: RegistryValueTypeMapping<ValueType>;

    fallbackKeys?: string | string[];
    fallbackImports?: {[key: string]:(value: string) => ValueType};

    description?: string;

    requireRestart?: boolean;
}

export interface ValuedRegistryKey<ValueType extends RegistryValueType> extends RegistryKey<ValueType> {
    defaultValue: ValueType;
}

const UPDATE_DIRECT: boolean = true;

function decodeValueFromString<T extends RegistryValueType>(input: string, type: RegistryValueTypeMapping<T>) : T {
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
            throw "value not decodable";
    }
}

export function encodeSettingValueToString<T extends RegistryValueType>(input: T) : string {
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
            throw "value has invalid type";
    }
}

export function resolveSettingKey<ValueType extends RegistryValueType, DefaultType>(
    key: RegistryKey<ValueType>,
    resolver: (key: string) => string | undefined | null,
    defaultValue: DefaultType
) : ValueType | DefaultType {
    let value = resolver(key.key);

    const keys = [key.key];
    if(Array.isArray(key.fallbackKeys)) {
        keys.push(...key.fallbackKeys);
    }

    for(const resolveKey of keys) {
        value = resolver(resolveKey);
        if(typeof value !== "string") {
            continue;
        }

        switch (key.valueType) {
            case "number":
            case "boolean":
                if(value.length === 0) {
                    continue;
                }
                break;

            default:
                break;
        }

        if(key.fallbackImports) {
            const fallbackValueImporter = key.fallbackImports[resolveKey];
            if(fallbackValueImporter) {
                return fallbackValueImporter(value);
            }
        }

        return decodeValueFromString(value, key.valueType);
    }

    return defaultValue;
}

export class UrlParameterParser {
    private readonly url: URL;

    constructor(url: URL) {
        this.url = url;
    }

    private getParameter(key: string) : string | undefined {
        const value = this.url.searchParams.get(key);
        if(value === null) {
            return undefined;
        }

        return decodeURIComponent(value);
    }

    getValue<V extends RegistryValueType, DV>(key: RegistryKey<V>, defaultValue: DV) : V | DV;
    getValue<V extends RegistryValueType>(key: ValuedRegistryKey<V>, defaultValue?: V) : V;
    getValue<V extends RegistryValueType, DV>(key: RegistryKey<V> | ValuedRegistryKey<V>, defaultValue: DV) : V | DV {
        if(arguments.length > 1) {
            return resolveSettingKey(key, key => this.getParameter(key), defaultValue);
        } else if("defaultValue" in key) {
            return resolveSettingKey(key, key => this.getParameter(key), key.defaultValue);
        } else {
            throw tr("missing value");
        }
    }
}

export class UrlParameterBuilder {
    private parameters = {};

    setValue<V extends RegistryValueType>(key: RegistryKey<V>, value: V) {
        if(value === undefined) {
            delete this.parameters[key.key];
        } else {
            this.parameters[key.key] = encodeURIComponent(encodeSettingValueToString(value));
        }
    }

    build() : string {
        return Object.keys(this.parameters).map(key => `${key}=${this.parameters[key]}`).join("&");
    }
}

/**
 * Switched appended to the application via the URL.
 * TODO: Passing native client switches
 */
export namespace AppParameters {
    export const Instance = new UrlParameterParser(new URL(window.location.href));

    export function getValue<V extends RegistryValueType, DV>(key: RegistryKey<V>, defaultValue: DV) : V | DV;
    export function getValue<V extends RegistryValueType>(key: ValuedRegistryKey<V>, defaultValue?: V) : V;
    export function getValue<V extends RegistryValueType, DV>(key: RegistryKey<V> | ValuedRegistryKey<V>, defaultValue: DV) : V | DV {
        if(arguments.length > 1) {
            return Instance.getValue(key, defaultValue);
        } else if("defaultValue" in key) {
            return Instance.getValue(key);
        } else {
            throw tr("missing value");
        }
    }
}

(window as any).AppParameters = AppParameters;

export namespace AppParameters {
    export const KEY_CONNECT_ADDRESS: RegistryKey<string> = {
        key: "ca",
        fallbackKeys: ["connect_address"],
        valueType: "string",
        description: "A target address to automatically connect to."
    };

    export const KEY_CONNECT_INVITE_REFERENCE: RegistryKey<string> = {
        key: "cir",
        fallbackKeys: ["connect-invite-reference"],
        valueType: "string",
        description: "The invite link used to generate the connect parameters"
    };

    export const KEY_CONNECT_NO_SINGLE_INSTANCE: ValuedRegistryKey<boolean> = {
        key: "cnsi",
        fallbackKeys: ["connect_no_single_instance"],
        defaultValue: false,
        valueType: "boolean",
    };

    export const KEY_CONNECT_TYPE: ValuedRegistryKey<number> = {
        key: "ct",
        fallbackKeys: ["connect_type"],
        valueType: "number",
        defaultValue: 0,
        description: "Connection establish type for automatic connect attempts.\n0 = Connect directly\n1 = Open connect modal"
    };

    export const KEY_CONNECT_NICKNAME: RegistryKey<string> = {
        key: "cn",
        fallbackKeys: ["connect_username", "nickname"],
        valueType: "string"
    };

    export const KEY_CONNECT_TOKEN: RegistryKey<string> = {
        key: "ctk",
        fallbackKeys: ["connect_token", "connect-token", "token"],
        valueType: "string",
        description: "Token which will be used by default if the connection attempt succeeded."
    };

    export const KEY_CONNECT_PROFILE: RegistryKey<string> = {
        key: "cp",
        fallbackKeys: ["connect_profile"],
        valueType: "string",
        description: "The profile which should be used upon connect attempt."
    };

    export const KEY_CONNECT_SERVER_PASSWORD: RegistryKey<string> = {
        key: "csp",
        fallbackKeys: ["connect_server_password", "server-password"],
        valueType: "string",
        description: "The password for the auto connect attempt."
    };

    export const KEY_CONNECT_PASSWORDS_HASHED: ValuedRegistryKey<boolean> = {
        key: "cph",
        fallbackKeys: ["connect_passwords_hashed", "passwords-hashed"],
        valueType: "boolean",
        description: "Indicate whatever all passwords are hashed or not",
        defaultValue: false
    };

    export const KEY_CONNECT_CHANNEL: RegistryKey<string> = {
        key: "cc",
        fallbackKeys: ["connect_channel"],
        valueType: "string",
        description: "The target channel for the connect attempt."
    };

    export const KEY_CONNECT_CHANNEL_PASSWORD: RegistryKey<string> = {
        key: "ccp",
        fallbackKeys: ["connect_channel_password", "channel-password"],
        valueType: "string",
        description: "The target channel password (hashed) for the connect attempt."
    };


    export const KEY_IPC_APP_ADDRESS: RegistryKey<string> = {
        key: "ipc-address",
        valueType: "string",
        description: "Address of the apps IPC channel"
    };

    export const KEY_IPC_CORE_PEER_ADDRESS: RegistryKey<string> = {
        key: "ipc-core-peer",
        valueType: "string",
        description: "Peer address of the apps core",
    };

    export const KEY_MODAL_IPC_CHANNEL: RegistryKey<string> = {
        key: "modal-channel",
        valueType: "string",
        description: "The modal IPC channel id for communication with the controller"
    };

    export const KEY_LOAD_DUMMY_ERROR: ValuedRegistryKey<boolean> = {
        key: "dummy_load_error",
        description: "Triggers a loading error at the end of the loading process.",
        valueType: "boolean",
        defaultValue: false
    };
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

export class Settings {
    static readonly KEY_USER_IS_NEW: ValuedRegistryKey<boolean> = {
        key: "user_is_new_user",
        valueType: "boolean",
        defaultValue: true
    };

    static readonly KEY_LOG_LEVEL: RegistryKey<number> = {
        key: "log.level",
        valueType: "number"
    };

    static readonly KEY_DISABLE_COSMETIC_SLOWDOWN: ValuedRegistryKey<boolean> = {
        key: "disable_cosmetic_slowdown",
        description: "Disable the cosmetic slowdows in some processes, like icon upload.",
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_DISABLE_CONTEXT_MENU: ValuedRegistryKey<boolean> = {
        key: "disableContextMenu",
        description: "Disable the context menu for the channel tree which allows to debug the DOM easier",
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_DISABLE_GLOBAL_CONTEXT_MENU: ValuedRegistryKey<boolean> = {
        key: "disableGlobalContextMenu",
        description: "Disable the general context menu",
        defaultValue: true,
        valueType: "boolean",
    };

    static readonly KEY_DISABLE_UNLOAD_DIALOG: ValuedRegistryKey<boolean> = {
        key: "disableUnloadDialog",
        description: "Disables the unload popup on side closing",
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_DISABLE_VOICE: ValuedRegistryKey<boolean> = {
        key: "disableVoice",
        description: "Disables the voice bridge. If disabled, the audio and codec workers aren\'t required anymore",
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_DISABLE_MULTI_SESSION: ValuedRegistryKey<boolean> = {
        key: "disableMultiSession",
        defaultValue: false,
        requireRestart: true,
        valueType: "boolean",
    };

    static readonly KEY_I18N_DEFAULT_REPOSITORY: ValuedRegistryKey<string> = {
        key: "i18n.default_repository",
        valueType: "string",
        defaultValue: "https://web.teaspeak.de/i18n/"
    };

    /* Default client states */
    static readonly KEY_CLIENT_STATE_MICROPHONE_MUTED: ValuedRegistryKey<boolean> = {
        key: "client_state_microphone_muted",
        defaultValue: false,
        fallbackKeys: ["mute_input"],
        valueType: "boolean",
    };

    static readonly KEY_CLIENT_STATE_SPEAKER_MUTED: ValuedRegistryKey<boolean> = {
        key: "client_state_speaker_muted",
        defaultValue: false,
        fallbackKeys: ["mute_output"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_QUERY_SHOWN: ValuedRegistryKey<boolean> = {
        key: "client_state_query_shown",
        defaultValue: false,
        fallbackKeys: ["show_server_queries"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS: ValuedRegistryKey<boolean> = {
        key: "client_state_subscribe_all_channels",
        defaultValue: true,
        fallbackKeys: ["channel_subscribe_all"],
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_STATE_AWAY: ValuedRegistryKey<boolean> = {
        key: "client_state_away",
        defaultValue: false,
        valueType: "boolean",
    };
    static readonly KEY_CLIENT_AWAY_MESSAGE: ValuedRegistryKey<string> = {
        key: "client_away_message",
        defaultValue: "",
        valueType: "string"
    };

    /* Connect parameters */
    static readonly KEY_FLAG_CONNECT_DEFAULT: ValuedRegistryKey<boolean> = {
        key: "connect_default",
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_CONNECT_ADDRESS: ValuedRegistryKey<string> = {
        key: "connect_address",
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_CONNECT_PROFILE: ValuedRegistryKey<string> = {
        key: "connect_profile",
        defaultValue: "default",
        valueType: "string",
    };
    static readonly KEY_CONNECT_USERNAME: ValuedRegistryKey<string> = {
        key: "connect_username",
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_CONNECT_PASSWORD: ValuedRegistryKey<string> = {
        key: "connect_password",
        valueType: "string",
        defaultValue: undefined
    };
    static readonly KEY_FLAG_CONNECT_PASSWORD: ValuedRegistryKey<boolean> = {
        key: "connect_password_hashed",
        valueType: "boolean",
        defaultValue: false
    };
    static readonly KEY_CONNECT_HISTORY: ValuedRegistryKey<string> = {
        key: "connect_history",
        valueType: "string",
        defaultValue: ""
    };
    static readonly KEY_CONNECT_SHOW_HISTORY: ValuedRegistryKey<boolean> = {
        key: "connect_show_last_servers",
        valueType: "boolean",
        defaultValue: false
    };

    static readonly KEY_CONNECT_NO_DNSPROXY: ValuedRegistryKey<boolean> = {
        key: "connect_no_dnsproxy",
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_CERTIFICATE_CALLBACK: ValuedRegistryKey<string> = {
        key: "certificate_callback",
        valueType: "string",
        defaultValue: undefined
    };

    /* sounds */
    static readonly KEY_SOUND_MASTER: ValuedRegistryKey<number> = {
        key: "audio_master_volume",
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_SOUND_MASTER_SOUNDS: ValuedRegistryKey<number> = {
        key: "audio_master_volume_sounds",
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_SOUND_VOLUMES: RegistryKey<string> = {
        key: "sound_volume",
        valueType: "string",
    };

    static readonly KEY_CHAT_FIXED_TIMESTAMPS: ValuedRegistryKey<boolean> = {
        key: "chat_fixed_timestamps",
        defaultValue: false,
        description: "Enables fixed timestamps for chat messages and disabled the updating once (2 seconds ago... etc)",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_COLLOQUIAL_TIMESTAMPS: ValuedRegistryKey<boolean> = {
        key: "chat_colloquial_timestamps",
        defaultValue: true,
        description: "Enabled colloquial timestamp formatting like \"Yesterday at ...\" or \"Today at ...\"",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_COLORED_EMOJIES: ValuedRegistryKey<boolean> = {
        key: "chat_colored_emojies",
        defaultValue: true,
        description: "Enables colored emojies powered by Twemoji",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_HIGHLIGHT_CODE: ValuedRegistryKey<boolean> = {
        key: "chat_highlight_code",
        defaultValue: true,
        description: "Enables code highlighting within the chat (Client restart required)",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_TAG_URLS: ValuedRegistryKey<boolean> = {
        key: "chat_tag_urls",
        defaultValue: true,
        description: "Automatically link urls with [url]",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_ENABLE_MARKDOWN: ValuedRegistryKey<boolean> = {
        key: "chat_enable_markdown",
        defaultValue: true,
        description: "Enabled markdown chat support.",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_ENABLE_BBCODE: ValuedRegistryKey<boolean> = {
        key: "chat_enable_bbcode",
        defaultValue: false,
        description: "Enabled bbcode support in chat.",
        valueType: "boolean",
    };

    static readonly KEY_CHAT_IMAGE_WHITELIST_REGEX: ValuedRegistryKey<string> = {
        key: "chat_image_whitelist_regex",
        defaultValue: JSON.stringify([]),
        valueType: "string",
    };

    static readonly KEY_CHAT_LAST_USED_EMOJI: ValuedRegistryKey<string> = {
        key: "chat_last_used_emoji",
        defaultValue: ":joy:",
        valueType: "string",
    };

    static readonly KEY_SWITCH_INSTANT_CHAT: ValuedRegistryKey<boolean> = {
        key: "switch_instant_chat",
        defaultValue: true,
        description: "Directly switch to channel chat on channel select",
        valueType: "boolean",
    };

    static readonly KEY_SWITCH_INSTANT_CLIENT: ValuedRegistryKey<boolean> = {
        key: "switch_instant_client",
        defaultValue: true,
        description: "Directly switch to client info on client select",
        valueType: "boolean",
    };

    static readonly KEY_HOSTBANNER_BACKGROUND: ValuedRegistryKey<boolean> = {
        key: "hostbanner_background",
        defaultValue: false,
        description: "Enables a default background begind the hostbanner",
        valueType: "boolean",
    };

    static readonly KEY_CHANNEL_EDIT_ADVANCED: ValuedRegistryKey<boolean> = {
        key: "channel_edit_advanced",
        defaultValue: false,
        description: "Edit channels in advanced mode with a lot more settings",
        valueType: "boolean",
    };

    static readonly KEY_PERMISSIONS_SHOW_ALL: ValuedRegistryKey<boolean> = {
        key: "permissions_show_all",
        defaultValue: false,
        description: "Show all permissions even thou they dont make sense for the server/channel group",
        valueType: "boolean",
    };

    static readonly KEY_TEAFORO_URL: ValuedRegistryKey<string> = {
        key: "teaforo_url",
        defaultValue: "https://forum.teaspeak.de/",
        valueType: "string",
    };

    static readonly KEY_FONT_SIZE: ValuedRegistryKey<number> = {
        key: "font_size",
        valueType: "number",
        defaultValue: 14  //parseInt(getComputedStyle(document.body).fontSize)
    };

    static readonly KEY_ICON_SIZE: ValuedRegistryKey<number> = {
        key: "icon_size",
        defaultValue: 100,
        valueType: "number",
    };

    static readonly KEY_KEYCONTROL_DATA: ValuedRegistryKey<string> = {
        key: "keycontrol_data",
        defaultValue: "{}",
        valueType: "string",
    };

    static readonly KEY_LAST_INVITE_LINK_TYPE: ValuedRegistryKey<string> = {
        key: "last_invite_link_type",
        defaultValue: "tea-web",
        valueType: "string",
    };

    static readonly KEY_TRANSFERS_SHOW_FINISHED: ValuedRegistryKey<boolean> = {
        key: "transfers_show_finished",
        defaultValue: true,
        description: "Show finished file transfers in the file transfer list",
        valueType: "boolean",
    };

    static readonly KEY_TRANSFER_DOWNLOAD_FOLDER: RegistryKey<string> = {
        key: "transfer_download_folder",
        description: "The download folder for the file transfer downloads",
        valueType: "string",
        /* defaultValue: <users download directory> */
    };

    static readonly  KEY_IPC_REMOTE_ADDRESS: RegistryKey<string> = {
        key: "ipc-address",
        valueType: "string"
    };

    static readonly KEY_W2G_SIDEBAR_COLLAPSED: ValuedRegistryKey<boolean> = {
        key: "w2g_sidebar_collapsed",
        defaultValue: false,
        valueType: "boolean",
    };

    static readonly KEY_VOICE_ECHO_TEST_ENABLED: ValuedRegistryKey<boolean> = {
        key: "voice_echo_test_enabled",
        defaultValue: true,
        valueType: "boolean",
    };

    static readonly KEY_RTC_EXTRA_VIDEO_CHANNELS: ValuedRegistryKey<number> = {
        key: "rtc_extra_video_channels",
        defaultValue: 0,
        requireRestart: true,
        valueType: "number",
        description: "Extra video channels within the initial WebRTC sdp offer.\n" +
            "Note: By default the screen/camera share channels are already present"
    };

    static readonly KEY_RTC_EXTRA_AUDIO_CHANNELS: ValuedRegistryKey<number> = {
        key: "rtc_extra_audio_channels",
        defaultValue: 6,
        requireRestart: true,
        valueType: "number",
        description: "Extra audio channels within the initial WebRTC sdp offer.\n" +
            "Note:\n" +
            "1. By default the voice/whisper channels are already present.\n" +
            "2. This setting does not work for Firefox."
    };

    static readonly KEY_RNNOISE_FILTER: ValuedRegistryKey<boolean> = {
        key: "rnnoise_filter",
        defaultValue: true,
        description: "Enable the rnnoise filter for suppressing background noise",
        valueType: "boolean",
    };

    static readonly KEY_LOADER_ANIMATION_ABORT: ValuedRegistryKey<boolean> = {
        key: "loader_animation_abort",
        defaultValue: false,
        description: "Abort the loader animation when the app has been finished loading",
        valueType: "boolean",
    };

    static readonly KEY_STOP_VIDEO_ON_SWITCH: ValuedRegistryKey<boolean> = {
        key: "stop_video_on_channel_switch",
        defaultValue: true,
        description: "Stop video broadcasting on channel switch",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_SHOW_ALL_CLIENTS: ValuedRegistryKey<boolean> = {
        key: "video_show_all_clients",
        defaultValue: false,
        description: "Show all clients within the video frame, even if they're not broadcasting video",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_FORCE_SHOW_OWN_VIDEO: ValuedRegistryKey<boolean> = {
        key: "video_force_show_own_video",
        defaultValue: true,
        description: "Show own video preview even if you're not broadcasting any video",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_AUTO_SUBSCRIBE_MODE: ValuedRegistryKey<number> = {
        key: "video_auto_subscribe_mode",
        defaultValue: 1,
        description: "Auto subscribe to incoming videos.\n0 := Do not auto subscribe.\n1 := Auto subscribe to the first video.\n2 := Subscribe to all incoming videos.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_MAX_WIDTH: ValuedRegistryKey<number> = {
        key: "video_default_max_width",
        defaultValue: 1280,
        description: "The default maximal width of the video being crated.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_MAX_HEIGHT: ValuedRegistryKey<number> = {
        key: "video_default_max_height",
        defaultValue: 720,
        description: "The default maximal height of the video being crated.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_MAX_BANDWIDTH: ValuedRegistryKey<number> = {
        key: "video_default_max_bandwidth",
        defaultValue: 1_600_000,
        description: "The default video bandwidth to use in bits/seconds.\nA too high value might not be allowed by all server permissions.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DEFAULT_KEYFRAME_INTERVAL: ValuedRegistryKey<number> = {
        key: "video_default_keyframe_interval",
        defaultValue: 0,
        description: "The default interval to forcibly request a keyframe from ourself in seconds. A value of zero means no such interval.",
        valueType: "number",
    };

    static readonly KEY_VIDEO_DYNAMIC_QUALITY: ValuedRegistryKey<boolean> = {
        key: "video_dynamic_quality",
        defaultValue: true,
        description: "Dynamically decrease video quality in order to archive a higher framerate.",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_DYNAMIC_FRAME_RATE: ValuedRegistryKey<boolean> = {
        key: "video_dynamic_frame_rate",
        defaultValue: true,
        description: "Dynamically decrease video framerate to allow higher video resolutions.",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_QUICK_SETUP: ValuedRegistryKey<boolean> = {
        key: "video_quick_setup",
        defaultValue: true,
        description: "Automatically select the default video device and start broadcasting without the video configure dialog.",
        valueType: "boolean",
    };

    static readonly KEY_VIDEO_SPOTLIGHT_MODE: ValuedRegistryKey<number> = {
        key: "video_spotlight_mode",
        defaultValue: 1,
        description: "Select the video spotlight mode.\n0: Single video\n1: Video grid",
        valueType: "number",
    };

    static readonly KEY_INVITE_SHORT_URL: ValuedRegistryKey<boolean> = {
        key: "invite_short_url",
        defaultValue: true,
        description: "Enable/disable the short url for the invite menu",
        valueType: "boolean",
    };

    static readonly KEY_INVITE_ADVANCED_ENABLED: ValuedRegistryKey<boolean> = {
        key: "invite_advanced_enabled",
        defaultValue: false,
        description: "Enable/disable the advanced menu for the invite menu",
        valueType: "boolean",
    };

    static readonly KEY_MICROPHONE_LEVEL_INDICATOR: RegistryKey<boolean> = {
        key: "microphone_level_indicator",
        description: "Enable/disable the microphone level indicator when opening the microphone settings. The default is true, except for the linux native client.",
        valueType: "boolean",
    };

    static readonly KEY_MICROPHONE_THRESHOLD_ATTACK_SMOOTH: ValuedRegistryKey<number> = {
        key: "microphone_threshold_attack_smooth",
        valueType: "number",
        defaultValue: .25
    };

    static readonly KEY_MICROPHONE_THRESHOLD_RELEASE_SMOOTH: ValuedRegistryKey<number> = {
        key: "microphone_threshold_release_smooth",
        valueType: "number",
        defaultValue: .9

    };
    static readonly KEY_MICROPHONE_THRESHOLD_RELEASE_DELAY: ValuedRegistryKey<number> = {
        key: "microphone_threshold_release_delay",
        valueType: "number",
        description: "Delay for the client to cut of the audio in ms.",
        defaultValue: 500
    };

    static readonly KEY_SPEAKER_DEVICE_ID: RegistryKey<string> = {
        key: "speaker_device_id",
        valueType: "string",
        description: "The target speaker device id",
    }

    static readonly KEY_UPDATER_LAST_USED_UI: RegistryKey<string> = {
        key: "updater_last_used_ui",
        valueType: "string",
        description: "Last used TeaSpeak UI version",
    }

    static readonly KEY_UPDATER_LAST_USED_CLIENT: RegistryKey<string> = {
        key: "updater_last_used_client",
        valueType: "string",
        description: "Last used TeaSpeak Client version (TeaClient only)",
    }

    /* When using a higher number clients crash due to a bug in NodeJS */
    static readonly KEY_IPC_EVENT_BUNDLE_MAX_SIZE: ValuedRegistryKey<number> = {
        key: "ipc_event_bundle_max_size",
        valueType: "number",
        defaultValue: 0
    }

    static readonly FN_LOG_ENABLED: (category: string) => RegistryKey<boolean> = category => {
        return {
            key: "log." + category.toLowerCase() + ".enabled",
            valueType: "boolean",
        }
    };

    static readonly FN_SEPARATOR_STATE: (separator: string) => RegistryKey<string> = separator => {
        return {
            key: "separator-settings-" + separator,
            valueType: "string",
            fallbackKeys: ["seperator-settings-" + separator]
        }
    };

    static readonly FN_LOG_LEVEL_ENABLED: (category: string) => RegistryKey<boolean> = category => {
        return {
            key: "log.level." + category.toLowerCase() + ".enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_INVITE_LINK_SETTING: (name: string) => RegistryKey<string> = name => {
        return {
            key: "invite_link_setting_" + name,
            valueType: "string",
        }
    };

    static readonly FN_SERVER_CHANNEL_SUBSCRIBE_MODE: (channel_id: number) => RegistryKey<number> = channel => {
        return {
            key: "channel_subscribe_mode_" + channel,
            valueType: "number",
        }
    };

    static readonly FN_SERVER_CHANNEL_COLLAPSED: (channel_id: number) => ValuedRegistryKey<boolean> = channel => {
        return {
            key: "channel_collapsed_" + channel,
            defaultValue: false,
            valueType: "boolean",
        }
    };

    static readonly FN_PROFILE_RECORD: (name: string) => RegistryKey<object> = name => {
        return {
            key: "profile_record" + name,
            valueType: "object",
        }
    };

    static readonly FN_CHANNEL_CHAT_READ: (id: number) => RegistryKey<number> = id => {
        return {
            key: "channel_chat_read_" + id,
            valueType: "number",
        }
    };

    static readonly FN_CLIENT_MUTED: (clientUniqueId: string) => RegistryKey<boolean> = clientUniqueId => {
        return {
            key: "client_" + clientUniqueId + "_muted",
            valueType: "boolean",
            fallbackKeys: ["mute_client_" + clientUniqueId]
        }
    };

    static readonly FN_CLIENT_VOLUME: (clientUniqueId: string) => RegistryKey<number> = clientUniqueId => {
        return {
            key: "client_" + clientUniqueId + "_volume",
            valueType: "number",
            fallbackKeys: ["volume_client_" + clientUniqueId]
        }
    };

    static readonly FN_EVENTS_NOTIFICATION_ENABLED: (event: string) => RegistryKey<boolean> = event => {
        return {
            key: "event_notification_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_EVENTS_LOG_ENABLED: (event: string) => RegistryKey<boolean> = event => {
        return {
            key: "event_log_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly FN_EVENTS_FOCUS_ENABLED: (event: string) => RegistryKey<boolean> = event => {
        return {
            key: "event_focus_" + event + "_enabled",
            valueType: "boolean"
        }
    };

    static readonly KEYS = (() => {
        const result = [];

        for(const key of Object.keys(Settings)) {
            if(!key.toUpperCase().startsWith("KEY_")) {
                continue;
            }

            result.push(key);
        }

        return result;
    })();

    readonly events: Registry<SettingsEvents>;

    private settingsCache: any;
    private saveWorker: number;
    private updated: boolean;

    private saveState: "none" | "saving" | "saving-changed";

    constructor() {
        this.events = new Registry<SettingsEvents>();
        this.updated = false;
        this.saveState = "none";
    }

    @CallOnce
    async initialize() {
        const json = await getStorageAdapter().get("settings.global");

        try {
            if(json === null) {
                logInfo(LogCategory.GENERAL, tr("Found no settings. Creating new client settings."));
                this.settingsCache = {};
            } else {
                this.settingsCache = JSON.parse(json);
            }
        } catch(error) {
            this.settingsCache = {};
            logError(LogCategory.GENERAL, tr("Failed to load global settings!\nJson: %s\nError: %o"), json, error);

            const show_popup = () => {
                //FIXME: Readd this
                //createErrorModal(tr("Failed to load global settings"), tr("Failed to load global client settings!\nLookup console for more information.")).open();
            };
            if(!loader.finished()) {
                loader.register_task(loader.Stage.LOADED, {
                    priority: 0,
                    name: "Settings error",
                    function: async () => show_popup()
                });
            } else {
                show_popup();
            }
        }

        this.saveWorker = setInterval(() => {
            if(this.updated) {
                this.save();
            }
        }, 5 * 1000);
    }

    getValue<V extends RegistryValueType, DV>(key: RegistryKey<V>, defaultValue: DV) : V | DV;
    getValue<V extends RegistryValueType>(key: ValuedRegistryKey<V>, defaultValue?: V) : V;
    getValue<V extends RegistryValueType, DV>(key: RegistryKey<V> | ValuedRegistryKey<V>, defaultValue: DV) : V | DV {
        if(arguments.length > 1) {
            return resolveSettingKey(key, key => this.settingsCache[key], defaultValue);
        } else if("defaultValue" in key) {
            return resolveSettingKey(key, key => this.settingsCache[key], key.defaultValue);
        } else {
            debugger;
            throw tr("missing default value");
        }
    }

    setValue<T extends RegistryValueType>(key: RegistryKey<T>, value?: T){
        if(value === null) {
            value = undefined;
        }

        if(this.settingsCache[key.key] === value) {
            return;
        }

        const oldValue = this.settingsCache[key.key];
        if(value === undefined) {
            delete this.settingsCache[key.key];
        } else {
            this.settingsCache[key.key] = encodeSettingValueToString(value);
        }

        this.updated = true;
        this.events.fire("notify_setting_changed", {
            mode: "global",
            newValue: this.settingsCache[key.key],
            oldValue: oldValue,
            setting: key.key,
            newCastedValue: value
        });
        logTrace(LogCategory.GENERAL, tr("Changing global setting %s to %o"), key.key, value);

        if(UPDATE_DIRECT) {
            this.save();
        }
    }

    globalChangeListener<T extends RegistryValueType>(key: RegistryKey<T>, listener: (newValue: T) => void) : () => void {
        return this.events.on("notify_setting_changed", event => {
            if(event.setting === key.key && event.mode === "global") {
                listener(event.newCastedValue);
            }
        })
    }

    private async doSave() {
        if(this.saveState === "none") {
            return;
        }

        do {
            this.saveState = "saving";

            try {
                await getStorageAdapter().set("settings.global", JSON.stringify(this.settingsCache));
            } catch (error) {
                logError(LogCategory.GENERAL, tr("Failed to save global settings: %o"), error);
            }
        } while(this.saveState !== "saving");

        this.saveState = "none";
    }

    save() {
        switch (this.saveState) {
            case "saving":
            case "saving-changed":
                this.saveState = "saving-changed";
                return;

            default:
            case "none":
                this.saveState = "saving";
                break;
        }

        ignorePromise(this.doSave());
    }
}

export let settings: Settings;
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 1100,
    name: "Settings initialize",
    function: async () => {
        settings = new Settings();
        await settings.initialize();
        (window as any).settings = settings;
        (window as any).Settings = Settings;
    }
})