enum Sound {
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

namespace sound {
    export interface SoundHandle {
        key: string;
        filename: string;

        not_supported?: boolean;
        not_supported_timeout?: number;
        cached?: AudioBuffer;
        node?: HTMLAudioElement;

        replaying: boolean;
    }

    let warned = false;
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

    export function set_master_volume(volume: number) {
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

    export function reinitialisize_audio() {
        const context = audio.player.context();
        const destination = audio.player.destination();

        if(master_mixed)
            master_mixed.disconnect();

        master_mixed = context.createGain();
        if(master_mixed.gain.setValueAtTime)
            master_mixed.gain.setValueAtTime(master_volume, 0);
        else
            master_mixed.gain.value = master_volume;
        master_mixed.connect(destination);
    }

    export function save() {
        if(volume_require_save) {
            volume_require_save = false;

            const data: any = {};
            data.version = 1;

            for(const key in Sound) {
                if(typeof(speech_volume[Sound[key]]) !== "undefined")
                    data[Sound[key]] = speech_volume[Sound[key]];
            }
            data.master = master_volume;
            data.overlap = overlap_sounds;
            data.ignore_muted = ignore_muted;

            settings.changeGlobal("sound_volume", JSON.stringify(data));
        }
    }

    export function initialize() : Promise<void> {
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
            const data = JSON.parse(settings.static_global("sound_volume", "{}"));
            for(const sound_key in Sound) {
                if(typeof(data[Sound[sound_key]]) !== "undefined")
                    speech_volume[Sound[sound_key]] = data[Sound[sound_key]];
            }

            master_volume = data.master || 1;
            overlap_sounds = data.overlap || true;
            ignore_muted = data.ignore_muted || true;
        }

        register_sound("message.received", "effects/message_received.wav");
        register_sound("message.send", "effects/message_send.wav");

        manager = new SoundManager(undefined);
        audio.player.on_ready(reinitialisize_audio);
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
                    log.error(LogCategory.AUDIO, "error: %o", error);
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
        if(!file)
            throw tr("Missing sound handle");


        if(file.not_supported) {
            if(!file.not_supported_timeout || Date.now() < file.not_supported_timeout) //Test if the not supported flag has been expired
                return file;

            file.not_supported = false;
            file.not_supported_timeout = undefined;
        }


        const context = audio.player.context();
        if(!context)
            return file;

        const path = "audio/" + file.filename;
        if(context.decodeAudioData) {
            if(!file.cached) {
                const decode_data = buffer => {
                    try {
                        log.info(LogCategory.AUDIO, tr("Decoding data"));
                        context.decodeAudioData(buffer, result => {
                            file.cached = result;
                        }, error => {
                            log.error(LogCategory.AUDIO, tr("Failed to decode audio data for %o: %o"), sound, error);
                            file.not_supported = true;
                            file.not_supported_timeout = Date.now() + 1000 * 60 * 2; //Try in 2min again!
                        })
                    } catch (error) {
                        log.error(LogCategory.AUDIO, error);
                        file.not_supported = true;
                        file.not_supported_timeout = Date.now() + 1000 * 60 * 2; //Try in 2min again!
                    }
                };

                const xhr = new XMLHttpRequest();
                xhr.open('GET', path, true);
                xhr.responseType = 'arraybuffer';

                try {
                    const result = new Promise((resolve, reject) => {
                        xhr.onload = resolve;
                        xhr.onerror = reject;
                    });

                    xhr.send();
                    await result;

                    if (xhr.status != 200)
                        throw "invalid response code (" + xhr.status + ")";

                    log.debug(LogCategory.AUDIO, tr("Decoding data"));
                    try {
                        file.cached = await context.decodeAudioData(xhr.response);
                    } catch(error) {
                        log.error(LogCategory.AUDIO, error);
                        throw "failed to decode audio data";
                    }
                } catch(error) {
                    log.error(LogCategory.AUDIO, tr("Failed to load audio file %s. Error: %o"), sound, error);
                    file.not_supported = true;
                    file.not_supported_timeout = Date.now() + 1000 * 60 * 2; //Try in 2min again!
                }
            }
        } else {
            if(!file.node) {
                if(!warned) {
                    warned = true;
                    log.warn(LogCategory.AUDIO, tr("Your browser does not support decodeAudioData! Using a node to playback! This bypasses the audio output and volume regulation!"));
                }
                const container = $("#sounds");
                const node = $.spawn("audio").attr("src", path);
                node.appendTo(container);

                file.node = node[0];
            }
        }

        return file;
    }

    export let manager: SoundManager;

    export class SoundManager {
        private _handle: ConnectionHandler;
        private _playing_sounds: {[key: string]:number} = {};

        constructor(handle: ConnectionHandler) {
            this._handle = handle;
        }

        play(_sound: Sound, options?: PlaybackOptions) {
            options = options || {};

            const volume = get_sound_volume(_sound, options.default_volume);
            log.info(LogCategory.AUDIO, tr("Replaying sound %s (Sound volume: %o | Master volume %o)"), _sound, volume, master_volume);

            if(volume == 0 || master_volume == 0)
                return;

            if(this._handle && !options.ignore_muted && !sound.ignore_output_muted() && this._handle.client_status.output_muted)
                return;

            const context = audio.player.context();
            if(!context) {
                log.warn(LogCategory.AUDIO, tr("Tried to replay a sound without an audio context (Sound: %o). Dropping playback"), _sound);
                return;
            }

            sound.resolve_sound(_sound).then(handle => {
                if(!handle)
                    return;

                if(!options.ignore_overlap && (this._playing_sounds[_sound] > 0) && !sound.overlap_activated()) {
                    log.info(LogCategory.AUDIO, tr("Dropping requested playback for sound %s because it would overlap."), _sound);
                    return;
                }

                if(handle.cached) {
                    this._playing_sounds[_sound] = Date.now();

                    const player = context.createBufferSource();
                    player.buffer = handle.cached;
                    player.start(0);

                    handle.replaying = true;
                    player.onended = event => {
                        if(options.callback)
                            options.callback(true);
                        delete this._playing_sounds[_sound];
                    };

                    if(volume != 1 && context.createGain) {
                        const gain = context.createGain();
                        if(gain.gain.setValueAtTime)
                            gain.gain.setValueAtTime(volume, 0);
                        else
                            gain.gain.value = volume;

                        player.connect(gain);
                        gain.connect(master_mixed);
                    } else {
                        player.connect(master_mixed);
                    }
                } else if(handle.node) {
                    handle.node.currentTime = 0;
                    handle.node.play().then(() => {
                        if(options.callback)
                            options.callback(true);
                    }).catch(error => {
                        log.warn(LogCategory.AUDIO, tr("Sound playback for sound %o resulted in an error: %o"), sound, error);
                        if(options.callback)
                            options.callback(false);
                    });
                } else {
                    log.warn(LogCategory.AUDIO, tr("Failed to replay sound %o because of missing handles."), sound);
                    if(options.callback)
                        options.callback(false);
                    return;
                }
            }).catch(error => {
                log.warn(LogCategory.AUDIO, tr("Failed to replay sound %o because it could not be resolved: %o"), sound, error);
                if(options.callback)
                    options.callback(false);
            });
        }
    }
}