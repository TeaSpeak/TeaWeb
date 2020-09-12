import {server_connections} from "./ui/frames/connection_handlers";
import {EventType, KeyDescriptor, KeyEvent, KeyHook} from "./PPTListener";
import * as ppt from "tc-backend/ppt";
import {Settings, settings} from "./settings";
import * as log from "./log";
import {LogCategory} from "./log";

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
        handler: () => server_connections.active_connection()?.disconnectFromServer(),
        icon: "client-disconnect"
    },
    "disconnect-all": {
        category: "connection",
        description: "Disconnect from all connected servers",
        handler: () => server_connections.all_connections().forEach(e => e.disconnectFromServer()),
        icon: "client-disconnect"
    },

    "toggle-microphone": {
        category: "microphone",
        description: "Toggle your microphone status",
        handler: () => server_connections.active_connection()?.toggleMicrophone(),
        icon: "client-input_muted"
    },
    "enable-microphone": {
        category: "microphone",
        description: "Enable your microphone",
        handler: () => server_connections.active_connection()?.setMicrophoneMuted(false),
        icon: "client-input_muted"
    },
    "disable-microphone": {
        category: "microphone",
        description: "Disable your microphone",
        handler: () => server_connections.active_connection()?.setMicrophoneMuted(true),
        icon: "client-input_muted"
    },

    "toggle-speaker": {
        category: "speaker",
        description: "Toggle your speaker status",
        handler: () => server_connections.active_connection()?.toggleSpeakerMuted(),
        icon: "client-output_muted"
    },
    "enable-speaker": {
        category: "speaker",
        description: "Enable your speakers",
        handler: () => server_connections.active_connection()?.setSpeakerMuted(false),
        icon: "client-output_muted"
    },
    "disable-speaker": {
        category: "speaker",
        description: "Disable your speakers",
        handler: () => server_connections.active_connection()?.setSpeakerMuted(true),
        icon: "client-output_muted"
    },

    /* toggle away */
    "toggle-away-state": {
        category: "away",
        description: "Toggle your away state",
        handler: () => server_connections.active_connection()?.toggleAway(),
        icon: "client-away"
    },
    "enable-away-state": {
        category: "away",
        description: "Enable away for the current server",
        handler: () => server_connections.active_connection()?.setAway(true),
        icon: "client-away"
    },
    "disable-away-state": {
        category: "away",
        description: "Disable away for the current server",
        handler: () => server_connections.active_connection()?.setAway(false),
        icon: "client-present"
    },
    "toggle-away-state-globally": {
        category: "away",
        description: "Toggle your away state for every server",
        handler: () => server_connections.all_connections().forEach(e => e.toggleAway()),
        icon: "client-away"
    },
    "enable-away-state-globally": {
        category: "away",
        description: "Enable away for every server",
        handler: () => server_connections.all_connections().forEach(e => e.setAway(true)),
        icon: "client-away"
    },
    "disable-away-state-globally": {
        category: "away",
        description: "Disable away for every server",
        handler: () => server_connections.all_connections().forEach(e => e.setAway(false)),
        icon: "client-present"
    },
};

let key_bindings: {[key: string]: {
    binding: KeyDescriptor,
    hook: KeyHook
}} = {};

interface Config {
    version?: number;

    keys?: {[key: string]: KeyDescriptor};
}

let config: Config;
export function initialize() {
    let cfg: Config;
    try {
        cfg = JSON.parse(settings.global(Settings.KEY_KEYCONTROL_DATA));
    } catch (e) {
        log.error(LogCategory.GENERAL, tr("Failed to parse old key control data."));
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
        default:
            break;
    }
    config = cfg;

    for(const key of Object.keys(config.keys)) {
        if(typeof KeyTypes[key] !== "object")
            continue;

        bind_key(key, config.keys[key]);
    }
}

function save_config() {
    settings.changeGlobal(Settings.KEY_KEYCONTROL_DATA, JSON.stringify(config));
}

function bind_key(action: string, key: KeyDescriptor) {
    const control = KeyTypes[action];
    if(typeof control === "undefined")
        throw "missing control event";

    key_bindings[action] = {
        hook: Object.assign({
            callback_press: () => control.handler(),
            callback_release: () => {},
            cancel: false
        }, key),
        binding: key
    };
    ppt.register_key_hook(key_bindings[action].hook);
}

export function set_key(action: string, key?: KeyDescriptor) {
    if(typeof key_bindings[action] !== "undefined") {
        ppt.unregister_key_hook(key_bindings[action].hook);
        delete key_bindings[action];
    }
    if(key) {
        bind_key(action, key);
        config.keys[action] = key;
    } else {
        delete config.keys[action];
    }

    save_config();
}

export function key(action: string) : KeyDescriptor | undefined { return key_bindings[action]?.binding; }