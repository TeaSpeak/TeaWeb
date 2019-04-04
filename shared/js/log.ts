enum LogCategory {
    CHANNEL,
    CHANNEL_PROPERTIES, /* separating channel and channel properties because on channel init logging is a big bottleneck */
    CLIENT,
    SERVER,
    PERMISSIONS,
    GENERAL,
    NETWORKING,
    VOICE,
    I18N,
    IPC,
    IDENTITIES
}

namespace log {
    export enum LogType {
        TRACE,
        DEBUG,
        INFO,
        WARNING,
        ERROR
    }

    let category_mapping = new Map<number, string>([
        [LogCategory.CHANNEL,                   "Channel    "],
        [LogCategory.CHANNEL_PROPERTIES,        "Channel    "],
        [LogCategory.CLIENT,                    "Client     "],
        [LogCategory.SERVER,                    "Server     "],
        [LogCategory.PERMISSIONS,               "Permission "],
        [LogCategory.GENERAL,                   "General    "],
        [LogCategory.NETWORKING,                "Network    "],
        [LogCategory.VOICE,                     "Voice      "],
        [LogCategory.I18N,                      "I18N       "],
        [LogCategory.IDENTITIES,                "IDENTITIES "],
        [LogCategory.IPC,                       "IPC        "]
    ]);

    export let enabled_mapping = new Map<number, boolean>([
        [LogCategory.CHANNEL,               true],
        [LogCategory.CHANNEL_PROPERTIES,    false],
        [LogCategory.CLIENT,                true],
        [LogCategory.SERVER,                true],
        [LogCategory.PERMISSIONS,           true],
        [LogCategory.GENERAL,               true],
        [LogCategory.NETWORKING,            true],
        [LogCategory.VOICE,                 true],
        [LogCategory.I18N,                  false],
        [LogCategory.IDENTITIES,            true],
        [LogCategory.IPC,                   true]
    ]);

    enum GroupMode {
        NATIVE,
        PREFIX
    }
    const group_mode: GroupMode = GroupMode.NATIVE;

    loader.register_task(loader.Stage.LOADED, {
        name: "log enabled initialisation",
        function: async () => initialize(),
        priority: 10
    });

    //Example: <url>?log.i18n.enabled=0
    export function initialize() {
        for(const category of Object.keys(LogCategory).map(e => parseInt(e))) {
            if(isNaN(category)) continue;
            const category_name = LogCategory[category];
            enabled_mapping[category] = settings.static_global<boolean>("log." + category_name.toLowerCase() + ".enabled", enabled_mapping.get(category));
        }
    }

    function logDirect(type: LogType, message: string, ...optionalParams: any[]) {
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
        //console.log("This is %cMy stylish message", "color: yellow; font-style: italic; background-color: blue;padding: 2px");
    }

    export function log(type: LogType, category: LogCategory, message: string, ...optionalParams: any[]) {
        if(!enabled_mapping[category]) return;

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

    export function group(level: LogType, category: LogCategory, name: string, ...optionalParams: any[]) : Group {
        name = "[%s] " + name;
        optionalParams.unshift(category_mapping.get(category));

        return new Group(group_mode, level, category, name, optionalParams);
    }

    export function table(title: string, arguments: any) {
        if(group_mode == GroupMode.NATIVE) {
            console.groupCollapsed(title);
            console.table(arguments);
            console.groupEnd();
        } else {
            console.log("Snipped table %s", title);
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
            this.enabled = enabled_mapping[category];
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
            else
                logDirect(this.level, this._log_prefix + message, ...optionalParams);
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
}