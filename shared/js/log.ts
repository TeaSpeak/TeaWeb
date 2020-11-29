import {Settings, settings} from "./settings";
import * as loader from "tc-loader";
import { tr } from "./i18n/localize";

export enum LogCategory {
    CHANNEL,
    CHANNEL_PROPERTIES, /* separating channel and channel properties because on channel init logging is a big bottleneck */
    CLIENT,
    BOOKMARKS,
    SERVER,
    PERMISSIONS,
    GENERAL,
    NETWORKING,
    VOICE,
    CHAT,
    AUDIO,
    I18N,
    IPC,
    IDENTITIES,
    STATISTICS,
    DNS,
    FILE_TRANSFER,
    EVENT_REGISTRY,
    WEBRTC,
    VIDEO
}

export enum LogType {
    TRACE,
    DEBUG,
    INFO,
    WARNING,
    ERROR
}

let category_mapping = new Map<number, string>([
    [LogCategory.CHANNEL,                   "Channel       "],
    [LogCategory.CHANNEL_PROPERTIES,        "Channel       "],
    [LogCategory.CLIENT,                    "Client        "],
    [LogCategory.SERVER,                    "Server        "],
    [LogCategory.BOOKMARKS,                 "Bookmark      "],
    [LogCategory.PERMISSIONS,               "Permission    "],
    [LogCategory.GENERAL,                   "General       "],
    [LogCategory.NETWORKING,                "Network       "],
    [LogCategory.VOICE,                     "Voice         "],
    [LogCategory.AUDIO,                     "Audio         "],
    [LogCategory.CHAT,                      "Chat          "],
    [LogCategory.I18N,                      "I18N          "],
    [LogCategory.IDENTITIES,                "Identities    "],
    [LogCategory.IPC,                       "IPC           "],
    [LogCategory.STATISTICS,                "Statistics    "],
    [LogCategory.DNS,                       "DNS           "],
    [LogCategory.FILE_TRANSFER,             "File transfer "],
    [LogCategory.EVENT_REGISTRY,            "Event registry"],
    [LogCategory.WEBRTC,                    "WebRTC        "],
    [LogCategory.VIDEO,                     "Video        "],
]);

export let enabled_mapping = new Map<number, boolean>([
    [LogCategory.CHANNEL,               true],
    [LogCategory.CHANNEL_PROPERTIES,    false],
    [LogCategory.CLIENT,                true],
    [LogCategory.SERVER,                true],
    [LogCategory.BOOKMARKS,             true],
    [LogCategory.PERMISSIONS,           true],
    [LogCategory.GENERAL,               true],
    [LogCategory.NETWORKING,            true],
    [LogCategory.VOICE,                 true],
    [LogCategory.AUDIO,                 true],
    [LogCategory.CHAT,                  true],
    [LogCategory.I18N,                  false],
    [LogCategory.IDENTITIES,            true],
    [LogCategory.IPC,                   true],
    [LogCategory.STATISTICS,            true],
    [LogCategory.DNS,                   true],
    [LogCategory.FILE_TRANSFER,         true],
    [LogCategory.EVENT_REGISTRY,        true],
    [LogCategory.WEBRTC,                true],
    [LogCategory.VIDEO,                 true],
]);

//Values will be overridden by initialize()
export let level_mapping = new Map<LogType, boolean>([
    [LogType.TRACE,         true],
    [LogType.DEBUG,         true],
    [LogType.INFO,          true],
    [LogType.WARNING,       true],
    [LogType.ERROR,         true]
]);

enum GroupMode {
    NATIVE,
    PREFIX
}
const group_mode: GroupMode = GroupMode.PREFIX;

//Category Example: <url>?log.i18n.enabled=0
//Level Example A: <url>?log.level.trace.enabled=0
//Level Example B: <url>?log.level=0
export function initialize(defaultLogLevel: LogType) {
    for(const category of Object.keys(LogCategory).map(e => parseInt(e)).filter(e => !isNaN(e))) {
        const categoryName = LogCategory[category].toLowerCase();
        enabled_mapping.set(category, settings.static_global(Settings.FN_LOG_ENABLED(categoryName), enabled_mapping.get(category)));
    }

    const baseLogLevel = settings.static_global(Settings.KEY_LOG_LEVEL, defaultLogLevel);
    for(const level of Object.keys(LogType).map(e => parseInt(e)).filter(e => !isNaN(e))) {
        const levelName = LogType[level].toLowerCase();
        level_mapping.set(level, settings.static_global(Settings.FN_LOG_LEVEL_ENABLED(levelName), level >= baseLogLevel));
    }
}

function logDirect(type: LogType, message: string, ...optionalParams: any[]) {
    if(!level_mapping.get(type))
        return;

    switch (type) {
        case LogType.TRACE:
        case LogType.DEBUG:
            console.debug(message, ...optionalParams);
            break;
        case LogType.INFO:
            console.log(message, ...optionalParams);
            break;
        case LogType.WARNING:
            console.warn(message, ...optionalParams);
            break;
        case LogType.ERROR:
            console.error(message, ...optionalParams);
            break;
    }
}

export function log(type: LogType, category: LogCategory, message: string, ...optionalParams: any[]) {
    if(!enabled_mapping.get(category)) return;

    optionalParams.unshift(category_mapping.get(category));
    message = "[%s] " + message;
    logDirect(type, message, ...optionalParams);
}

export function trace(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.TRACE, category, message, ...optionalParams);
}

export function debug(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.DEBUG, category, message, ...optionalParams);
}

export function info(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.INFO, category, message, ...optionalParams);
}

export function warn(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.WARNING, category, message, ...optionalParams);
}

export function error(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.ERROR, category, message, ...optionalParams);
}

/* methods for direct import */
export function logTrace(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.TRACE, category, message, ...optionalParams);
}

export function logDebug(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.DEBUG, category, message, ...optionalParams);
}

export function logInfo(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.INFO, category, message, ...optionalParams);
}

export function logWarn(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.WARNING, category, message, ...optionalParams);
}

export function logError(category: LogCategory, message: string, ...optionalParams: any[]) {
    log(LogType.ERROR, category, message, ...optionalParams);
}

export function group(level: LogType, category: LogCategory, name: string, ...optionalParams: any[]) : Group {
    name = "[%s] " + name;
    optionalParams.unshift(category_mapping.get(category));

    return new Group(group_mode, level, category, name, optionalParams);
}

export function table(level: LogType, category: LogCategory, title: string, args: any) {
    if(group_mode == GroupMode.NATIVE) {
        console.groupCollapsed(title);
        console.table(args);
        console.groupEnd();
    } else {
        if(!enabled_mapping.get(category) || !level_mapping.get(level))
            return;
        logDirect(level, tr("Snipped table \"%s\""), title);
    }
}

export class Group {
    readonly mode: GroupMode;
    readonly level: LogType;
    readonly category: LogCategory;
    readonly enabled: boolean;

    owner: Group = undefined;

    private readonly name: string;
    private readonly optionalParams: any[][];
    private _collapsed: boolean = false;
    private initialized = false;
    private _log_prefix: string;

    constructor(mode: GroupMode, level: LogType, category: LogCategory, name: string, optionalParams: any[][], owner: Group = undefined) {
        this.level = level;
        this.mode = mode;
        this.category = category;
        this.name = name;
        this.optionalParams = optionalParams;
        this.enabled = enabled_mapping.get(category);
    }

    group(level: LogType, name: string, ...optionalParams: any[]) : Group {
        return new Group(this.mode, level, this.category, name, optionalParams, this);
    }

    collapsed(flag: boolean = true) : this {
        this._collapsed = flag;
        return this;
    }

    log(message: string, ...optionalParams: any[]) : this {
        if(!this.enabled)
            return this;

        if(!this.initialized) {
            if(this.mode == GroupMode.NATIVE) {
                if(this._collapsed && console.groupCollapsed)
                    console.groupCollapsed(this.name, ...this.optionalParams);
                else
                    console.group(this.name, ...this.optionalParams);
            } else {
                this._log_prefix = "  ";
                let parent = this.owner;
                while(parent) {
                    if(parent.mode == GroupMode.PREFIX)
                        this._log_prefix = this._log_prefix + parent._log_prefix;
                    else
                        break;
                }
            }
            this.initialized = true;
        }
        if(this.mode == GroupMode.NATIVE)
            logDirect(this.level, message, ...optionalParams);
        else {
            logDirect(this.level, "[%s] " + this._log_prefix + message, category_mapping.get(this.category), ...optionalParams);
        }
        return this;
    }

    end() {
        if(this.initialized) {
            if(this.mode == GroupMode.NATIVE)
                console.groupEnd();
        }
    }

    get prefix() : string {
        return this._log_prefix;
    }

    set prefix(prefix: string) {
        this._log_prefix = prefix;
    }
}

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "log enabled initialisation",
    function: async () => initialize(__build.mode === "debug" ? LogType.TRACE : LogType.INFO),
    priority: 150
});

/* initialize global logging system, use by the loader for example */
window.log = module.exports;