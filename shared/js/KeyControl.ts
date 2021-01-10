import * as ppt from "tc-backend/ppt";
import * as log from "./log";
import {LogCategory, logError, logWarn} from "./log";
import {KeyDescriptor, KeyHook} from "./PPTListener";
import {Settings, settings} from "./settings";
import {server_connections} from "tc-shared/ConnectionManager";
import {tr} from "./i18n/localize";

export interface KeyControl {
    category: string;
    description: string;
    handler: () => void;

    icon: string;
}

export const TypeCategories: {[key: string]: { name: string }} = {
    "connection": {
        name: "Server connection"
    },
    "microphone": {
        name: "Microphone"
    },
    "speaker": {
        name: "Speaker"
    },
    "away": {
        name: "Away"
    }
};

export const KeyTypes: {[key: string]:KeyControl} = {
    "disconnect-current": {
        category: "connection",
        description: "Disconnect from the current server",
        handler: () => server_connections.getActiveConnectionHandler()?.disconnectFromServer(),
        icon: "client-disconnect"
    },
    "disconnect-all": {
        category: "connection",
        description: "Disconnect from all connected servers",
        handler: () => server_connections.getAllConnectionHandlers().forEach(e => e.disconnectFromServer()),
        icon: "client-disconnect"
    },

    "toggle-microphone": {
        category: "microphone",
        description: "Toggle your microphone status",
        handler: () => server_connections.getActiveConnectionHandler()?.toggleMicrophone(),
        icon: "client-input_muted"
    },
    "enable-microphone": {
        category: "microphone",
        description: "Enable your microphone",
        handler: () => server_connections.getActiveConnectionHandler()?.setMicrophoneMuted(false),
        icon: "client-input_muted"
    },
    "disable-microphone": {
        category: "microphone",
        description: "Disable your microphone",
        handler: () => server_connections.getActiveConnectionHandler()?.setMicrophoneMuted(true),
        icon: "client-input_muted"
    },

    "toggle-speaker": {
        category: "speaker",
        description: "Toggle your speaker status",
        handler: () => server_connections.getActiveConnectionHandler()?.toggleSpeakerMuted(),
        icon: "client-output_muted"
    },
    "enable-speaker": {
        category: "speaker",
        description: "Enable your speakers",
        handler: () => server_connections.getActiveConnectionHandler()?.setSpeakerMuted(false),
        icon: "client-output_muted"
    },
    "disable-speaker": {
        category: "speaker",
        description: "Disable your speakers",
        handler: () => server_connections.getActiveConnectionHandler()?.setSpeakerMuted(true),
        icon: "client-output_muted"
    },

    /* toggle away */
    "toggle-away-state": {
        category: "away",
        description: "Toggle your away state",
        handler: () => server_connections.getActiveConnectionHandler()?.toggleAway(),
        icon: "client-away"
    },
    "enable-away-state": {
        category: "away",
        description: "Enable away for the current server",
        handler: () => server_connections.getActiveConnectionHandler()?.setAway(true),
        icon: "client-away"
    },
    "disable-away-state": {
        category: "away",
        description: "Disable away for the current server",
        handler: () => server_connections.getActiveConnectionHandler()?.setAway(false),
        icon: "client-present"
    },
    "toggle-away-state-globally": {
        category: "away",
        description: "Toggle your away state for every server",
        handler: () => server_connections.getAllConnectionHandlers().forEach(e => e.toggleAway()),
        icon: "client-away"
    },
    "enable-away-state-globally": {
        category: "away",
        description: "Enable away for every server",
        handler: () => server_connections.getAllConnectionHandlers().forEach(e => e.setAway(true)),
        icon: "client-away"
    },
    "disable-away-state-globally": {
        category: "away",
        description: "Disable away for every server",
        handler: () => server_connections.getAllConnectionHandlers().forEach(e => e.setAway(false)),
        icon: "client-present"
    },
};

let keyBindings: {[key: string]: {
    binding: KeyDescriptor,
    hook: KeyHook
}} = {};

interface Config {
    version?: number;

    keys?: {[key: string]: KeyDescriptor};
}

let config: Config;
export function initializeKeyControl() {
    let cfg: Config;
    try {
        cfg = JSON.parse(settings.getValue(Settings.KEY_KEYCONTROL_DATA));
    } catch (e) {
        logError(LogCategory.GENERAL, tr("Failed to parse old key control data."));
        cfg = {};
    }

    if(typeof cfg.version !== "number") {
        /* new config */
        cfg.version = 0;
    }
    switch (cfg.version) {
        case 0:
            cfg.version = 1;
            cfg.keys = {};

            /* fall though wanted */
        case 1:
            /* config up to date */
            break;

        default:
            logWarn(LogCategory.GENERAL, tr("Key control config has an invalid version:%o"), cfg.version);
            break;
    }
    config = cfg;

    for(const key of Object.keys(config.keys)) {
        if(typeof KeyTypes[key] !== "object")
            continue;

        bindKey(key, config.keys[key]);
    }
}

function saveConfig() {
    settings.setValue(Settings.KEY_KEYCONTROL_DATA, JSON.stringify(config));
}

function bindKey(action: string, key: KeyDescriptor) {
    const control = KeyTypes[action];
    if(typeof control === "undefined") {
        throw "missing control event";
    }

    keyBindings[action] = {
        hook: Object.assign({
            callback_press: () => control.handler(),
            callback_release: () => {},
            cancel: false
        }, key),
        binding: key
    };
    ppt.register_key_hook(keyBindings[action].hook);
}

export function setKey(action: string, key?: KeyDescriptor) {
    if(typeof keyBindings[action] !== "undefined") {
        ppt.unregister_key_hook(keyBindings[action].hook);
        delete keyBindings[action];
    }

    if(key) {
        bindKey(action, key);
        config.keys[action] = key;
    } else {
        delete config.keys[action];
    }

    saveConfig();
}

export function key(action: string) : KeyDescriptor | undefined { return keyBindings[action]?.binding; }