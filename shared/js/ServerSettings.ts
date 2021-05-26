import {tr} from "tc-shared/i18n/localize";
import {LogCategory, logError} from "tc-shared/log";
import {
    encodeSettingValueToString,
    RegistryKey,
    RegistryValueType,
    resolveSettingKey,
    ValuedRegistryKey
} from "tc-shared/settings";
import {assertMainApplication} from "tc-shared/ui/utils";

assertMainApplication();

export class ServerSettings {
    private cacheServer;
    private settingsDestroyed;

    private serverUniqueId: string;
    private serverSaveWorker: number;
    private serverSettingsUpdated: boolean;

    constructor() {
        this.cacheServer = {};
        this.serverSettingsUpdated = false;
        this.settingsDestroyed = false;

        this.serverSaveWorker = setInterval(() => {
            if(this.serverSettingsUpdated) {
                this.save();
            }
        }, 5 * 1000);
    }

    destroy() {
        this.settingsDestroyed = true;

        this.serverUniqueId = undefined;
        this.cacheServer = undefined;

        clearInterval(this.serverSaveWorker);
        this.serverSaveWorker = undefined;
    }

    getValue<V extends RegistryValueType, DV>(key: RegistryKey<V>, defaultValue: DV) : V | DV;
    getValue<V extends RegistryValueType>(key: ValuedRegistryKey<V>, defaultValue?: V) : V;
    getValue(key, defaultValue) {
        if(this.settingsDestroyed) {
            throw "destroyed";
        }

        if(arguments.length > 1) {
            return resolveSettingKey(key, key => this.cacheServer[key], defaultValue);
        } else if("defaultValue" in key) {
            return resolveSettingKey(key, key => this.cacheServer[key], key.defaultValue);
        } else {
            debugger;
            throw tr("missing default value");
        }
    }

    setValue<T extends RegistryValueType>(key: RegistryKey<T>, value?: T) {
        if(this.settingsDestroyed) {
            throw "destroyed";
        }

        if(this.cacheServer[key.key] === value) {
            return;
        }

        this.serverSettingsUpdated = true;
        if(value === undefined || value === null) {
            delete this.cacheServer[key.key];
        } else {
            this.cacheServer[key.key] = encodeSettingValueToString(value);
        }

        this.save();
    }

    setServerUniqueId(serverUniqueId: string) {
        if(this.settingsDestroyed) {
            throw "destroyed";
        }

        if(this.serverUniqueId === serverUniqueId) {
            return;
        }

        if(this.serverUniqueId) {
            this.save();
            this.cacheServer = {};
            this.serverUniqueId = undefined;
        }
        this.serverUniqueId = serverUniqueId;

        if(this.serverUniqueId) {
            const json = settingsStorage.get(serverUniqueId);
            try {
                this.cacheServer = JSON.parse(json);
            } catch(error) {
                logError(LogCategory.GENERAL, tr("Failed to load server settings for server %s!\nJson: %s\nError: %o"), serverUniqueId, json, error);
            }
            if(!this.cacheServer) {
                this.cacheServer = {};
            }
        }
    }

    save() {
        if(this.settingsDestroyed) {
            throw "destroyed";
        }
        this.serverSettingsUpdated = false;

        if(this.serverUniqueId) {
            settingsStorage.set(this.serverUniqueId, JSON.stringify(this.cacheServer));
        }
    }
}

let settingsStorage: ServerSettingsStorage = new class implements ServerSettingsStorage {
    get(serverUniqueId: string): string {
        return localStorage.getItem("settings.server_" + serverUniqueId);
    }

    set(serverUniqueId: string, value: string) {
        localStorage.setItem("settings.server_" + serverUniqueId, value);
    }
};

export interface ServerSettingsStorage {
    get(serverUniqueId: string) : string;
    set(serverUniqueId: string, value: string);
}

export function setServerSettingsStorage(storage: ServerSettingsStorage) {
    settingsStorage = storage;
}