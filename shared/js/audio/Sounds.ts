import {LogCategory, logError, logInfo, logWarn} from "../log";
import {Settings, settings} from "../settings";
import {ConnectionHandler} from "../ConnectionHandler";
import { tr } from "tc-shared/i18n/localize";

export enum Sound {
    SOUND_TEST = "sound.test",
    SOUND_EGG = "sound.egg",

    AWAY_ACTIVATED = "away_activated",
    AWAY_DEACTIVATED = "away_deactivated",

    MICROPHONE_MUTED = "microphone.muted",
    MICROPHONE_ACTIVATED = "microphone.activated",

    SOUND_MUTED = "sound.muted",
    SOUND_ACTIVATED = "sound.activated",

    CONNECTION_CONNECTED = "connection.connected",
    CONNECTION_DISCONNECTED = "connection.disconnected",
    CONNECTION_BANNED = "connection.banned",
    CONNECTION_DISCONNECTED_TIMEOUT = "connection.disconnected.timeout",
    CONNECTION_REFUSED = "connection.refused",

    SERVER_EDITED = "server.edited",
    SERVER_EDITED_SELF = "server.edited.self",
    SERVER_KICKED = "server.kicked",

    CHANNEL_CREATED = "channel.created",
    CHANNEL_MOVED = "channel.moved",
    CHANNEL_EDITED = "channel.edited",
    CHANNEL_EDITED_SELF = "channel.edited.self",
    CHANNEL_DELETED = "channel.deleted",

    CHANNEL_JOINED = "channel.joined",
    CHANNEL_KICKED = "channel.kicked", //You got kicked from the channel

    USER_MOVED = "user.moved", //User moved
    USER_MOVED_SELF = "user.moved.self", //You were moved
    USER_POKED_SELF = "user.poked.self", //Hey wakeup
    USER_BANNED = "user.banned",

    USER_ENTERED = "user.joined", //User joined your channel
    USER_ENTERED_MOVED = "user.joined.moved", //User was moved to your channel
    USER_ENTERED_KICKED = "user.joined.kicked", //User was kicked to your channel
    USER_ENTERED_CONNECT = "user.joined.connect",

    USER_LEFT = "user.left", //User left your channel
    USER_LEFT_MOVED = "user.left.moved", //User was move out of your channel
    USER_LEFT_KICKED_CHANNEL = "user.left.kicked.server", //User was kicked out of your channel
    USER_LEFT_KICKED_SERVER = "user.left.kicked.channel", //User is your channel was kicked from the server
    USER_LEFT_DISCONNECT = "user.left.disconnect",
    USER_LEFT_BANNED  = "user.left.banned",
    USER_LEFT_TIMEOUT = "user.left.timeout",

    ERROR_INSUFFICIENT_PERMISSIONS = "error.insufficient_permissions",

    MESSAGE_SEND = "message.send",
    MESSAGE_RECEIVED = "message.received",

    GROUP_SERVER_ASSIGNED = "group.server.assigned",
    GROUP_SERVER_REVOKED = "group.server.revoked",
    GROUP_CHANNEL_CHANGED = "group.channel.changed",
    GROUP_SERVER_ASSIGNED_SELF = "group.server.assigned.self",
    GROUP_SERVER_REVOKED_SELF = "group.server.revoked.self",
    GROUP_CHANNEL_CHANGED_SELF = "group.channel.changed.self"
}

export interface SoundHandle {
    key: string;
    filename: string;
}

export interface SoundFile {
    path: string;
    volume?: number;
}

let speech_mapping: {[key: string]:SoundHandle} = {};

let volume_require_save = false;
let speech_volume: {[key: string]:number} = {};
let master_volume: number;

let overlap_sounds: boolean;
let ignore_muted: boolean;

let master_mixed: GainNode;

function register_sound(key: string, file: string) {
    speech_mapping[key] = {key: key, filename: file} as SoundHandle;
}

export function get_sound_volume(sound: Sound, default_volume?: number) : number {
    let result = speech_volume[sound];
    if(typeof(result) === "undefined") {
        if(typeof(default_volume) !== "undefined")
            result = default_volume;
        else
            result = 1;
    }
    return result;
}

export function set_sound_volume(sound: Sound, volume: number) {
    volume_require_save = volume_require_save || speech_volume[sound] != volume;
    speech_volume[sound] = volume == 1 ? undefined : volume;
}

export function get_master_volume() : number {
    return master_volume;
}

export function setSoundMasterVolume(volume: number) {
    volume_require_save = volume_require_save || master_volume != volume;
    master_volume = volume;
    if(master_mixed) {
        if(master_mixed.gain.setValueAtTime)
            master_mixed.gain.setValueAtTime(volume, 0);
        else
            master_mixed.gain.value = volume;
    }
}

export function overlap_activated() : boolean {
    return overlap_sounds;
}

export function set_overlap_activated(flag: boolean) {
    volume_require_save = volume_require_save || overlap_sounds != flag;
    overlap_sounds = flag;
}

export function ignore_output_muted() : boolean {
    return ignore_muted;
}

export function set_ignore_output_muted(flag: boolean) {
    volume_require_save = volume_require_save || ignore_muted != flag;
    ignore_muted = flag;
}

export function save() {
    if(volume_require_save) {
        volume_require_save = false;

        const data: any = {};
        data.version = 1;

        for(const key of Object.keys(Sound)) {
            if(typeof(speech_volume[Sound[key]]) !== "undefined")
                data[Sound[key]] = speech_volume[Sound[key]];
        }
        data.master = master_volume;
        data.overlap = overlap_sounds;
        data.ignore_muted = ignore_muted;

        settings.setValue(Settings.KEY_SOUND_VOLUMES, JSON.stringify(data));
    }
}

export function initializeSounds() : Promise<void> {
    $.ajaxSetup({
        beforeSend: function(jqXHR,settings){
            if (settings.dataType === 'binary') {
                settings.xhr().responseType = 'arraybuffer';
                settings.processData = false;
            }
        }
    });

    /* volumes */
    {
        const data = JSON.parse(settings.getValue(Settings.KEY_SOUND_VOLUMES, "{}"));
        for(const sound_key of Object.keys(Sound)) {
            if(typeof(data[Sound[sound_key]]) !== "undefined")
                speech_volume[Sound[sound_key]] = data[Sound[sound_key]];
        }

        master_volume = typeof(data.master) === "number" ? data.master : 1;
        overlap_sounds = typeof(data.overlap) === "boolean" ? data.overlap : true;
        ignore_muted = typeof(data.ignore_muted) === "boolean" ? data.ignore_muted : false;
    }

    register_sound("message.received", "effects/message_received.wav");
    register_sound("message.send", "effects/message_send.wav");

    manager = new SoundManager(undefined);
    return new Promise<void>((resolve, reject) => {
        $.ajax({
            url: "audio/speech/mapping.json",
            success: response => {
                if(typeof(response) === "string")
                    response = JSON.parse(response);
                for(const entry of response)
                    register_sound(entry.key, "speech/" + entry.file);
                resolve();
            },
            error: error => {
                logError(LogCategory.AUDIO, "error: %o", error);
                reject();
            },
            timeout: 5000,
            async: true,
            type: 'GET'
        });
    });
}

export interface PlaybackOptions {
    ignore_muted?: boolean;
    ignore_overlap?: boolean;

    default_volume?: number;

    callback?: (flag: boolean) => any;
}

export async function resolve_sound(sound: Sound) : Promise<SoundHandle> {
    const file: SoundHandle = speech_mapping[sound];
    if(!file) throw tr("Missing sound handle");

    return file;
}

export let manager: SoundManager;
export class SoundManager {
    private readonly _handle: ConnectionHandler;
    private _playing_sounds: {[key: string]:number} = {};

    constructor(handle: ConnectionHandler) {
        this._handle = handle;
    }

    play(_sound: Sound, options?: PlaybackOptions) {
        options = options || {};

        const volume = get_sound_volume(_sound, options.default_volume);
        logInfo(LogCategory.AUDIO, tr("Replaying sound %s (Sound volume: %o | Master volume %o)"), _sound, volume, master_volume);

        if(volume == 0 || master_volume == 0)
            return;

        if(this._handle && !options.ignore_muted && !ignore_output_muted() && this._handle.isSpeakerMuted())
            return;

        resolve_sound(_sound).then(handle => {
            if(!handle) return;

            if(!options.ignore_overlap && (this._playing_sounds[handle.filename] > 0) && !overlap_activated()) {
                logInfo(LogCategory.AUDIO, tr("Dropping requested playback for sound %s because it would overlap."), _sound);
                return;
            }

            this._playing_sounds[handle.filename] = (this._playing_sounds[handle.filename] || 0) + 1;
            getSoundBackend().playSound({
                path: "audio/" + handle.filename,
                volume: volume * master_volume
            }).then(() => {
                if(options.callback)
                    options.callback(true);
            }).catch(error => {
                logWarn(LogCategory.AUDIO, tr("Failed to replay sound %s: %o"), handle.filename, error);
                if(options.callback)
                    options.callback(false);
            }).then(() => {
                this._playing_sounds[handle.filename]--;
            });
        }).catch(error => {
            logWarn(LogCategory.AUDIO, tr("Failed to replay sound %o because it could not be resolved: %o"), _sound, error);
            if(options.callback)
                options.callback(false);
        });
    }
}

export interface SoundBackend {
    playSound(sound: SoundFile) : Promise<void>;
}
let soundBackend: SoundBackend;

export function getSoundBackend() {
    return soundBackend;
}

export function setSoundBackend(newSoundBackend: SoundBackend) {
    soundBackend = newSoundBackend;
}