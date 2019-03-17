enum Sound {
    SOUND_TEST = "sound.test",
    SOUND_EGG = "sound.egg",

    AWAY_ACTIVATED = "away_activated",
    AWAY_DEACTIVATED = "away_deactivated",

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
    interface SpeechFile {
        key: string;
        filename: string;

        not_supported?: boolean;
        not_supported_timeout?: number;
        cached?: AudioBuffer;
        node?: HTMLAudioElement;

        replaying: boolean;
    }

    let warned = false;
    let speech_mapping: {[key: string]:SpeechFile} = {};

    let volume_require_save = false;
    let speech_volume: {[key: string]:number} = {};
    let master_volume: number;

    let overlap_sounds: boolean;
    let ignore_muted: boolean;

    let master_mixed: GainNode;

    function register_sound(key: string, file: string) {
        speech_mapping[key] = {key: key, filename: file} as SpeechFile;
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
        if(master_mixed.gain.setValueAtTime)
            master_mixed.gain.setValueAtTime(volume, 0);
        else
            master_mixed.gain.value = volume;
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

            for(const sound in Sound) {
                if(typeof(speech_volume[sound]) !== "undefined")
                    data[sound] = speech_volume[sound];
            }
            data.master = master_volume;
            data.overlap = overlap_sounds;
            data.ignore_muted = ignore_muted;

            settings.changeGlobal("sound_volume", JSON.stringify(data));
            console.error(data);
        }
    }

    export function initialize() : Promise<void> {
        $.ajaxSetup({
            beforeSend: function(jqXHR,settings){
                if (settings.dataType === 'binary'){
                    settings.xhr().responseType = 'arraybuffer';
                    settings.processData = false;
                }
            }
        });

        /* volumes */
        {
            const data = JSON.parse(settings.static_global("sound_volume", "{}"));
            for(const sound in Sound) {
                if(typeof(data[sound]) !== "undefined")
                    speech_volume[sound] = data[sound];
            }

            console.error(data);
            master_volume = data.master || 1;
            overlap_sounds = data.overlap || true;
            ignore_muted = data.ignore_muted || true;
        }

        register_sound("message.received", "effects/message_received.wav");
        register_sound("message.send", "effects/message_send.wav");

        audio.player.on_ready(reinitialisize_audio);
        return new Promise<void>(resolve => {
            $.ajax({
                url: "audio/speech/mapping.json",
                success: response => {
                    if(typeof(response) === "string")
                        response = JSON.parse(response);
                    for(const entry of response)
                        register_sound(entry.key, "speech/" + entry.file);
                    resolve();
                },
                error: () => {
                    console.log("error!");
                    console.dir(...arguments);
                },
                timeout: 5000,
                async: true,
                type: 'GET'
            });
        })
    }

    export interface PlaybackOptions {
        ignore_muted?: boolean;
        ignore_overlap?: boolean;

        default_volume?: number;
    }

    export function play(sound: Sound, options?: PlaybackOptions) {
        if(!options) {
            options = {};
        }

        const file: SpeechFile = speech_mapping[sound];
        if(!file) {
            console.warn(tr("Missing sound %o"), sound);
            return;
        }
        if(file.not_supported) {
            if(!file.not_supported_timeout || Date.now() < file.not_supported_timeout) //Test if the not supported isn't may timeouted
                return;
            file.not_supported = false;
            file.not_supported_timeout = undefined;
        }

        const path = "audio/" + file.filename;
        const context = audio.player.context();
        if(!context) {
            console.warn(tr("Tried to replay a sound without an audio context (Sound: %o). Dropping playback"), sound);
            return;
        }
        const volume = get_sound_volume(sound, options.default_volume);

        console.log(tr("Replaying sound %s (Sound volume: %o | Master volume %o)"), sound, volume, master_volume);
        if(volume == 0) return;
        if(master_volume == 0) return;
        if(!options.ignore_muted && !ignore_muted && globalClient.controlBar.muteOutput) return;

        if(context.decodeAudioData) {
            if(file.cached) {
                if(!options.ignore_overlap && file.replaying && !overlap_sounds) {
                    console.log(tr("Dropping requested playback for sound %s because it would overlap."), sound);
                    return;
                }

                console.log(tr("Using cached buffer: %o"), file.cached);
                const player = context.createBufferSource();
                player.buffer = file.cached;
                player.start(0);

                file.replaying = true;
                player.onended = event => {
                    file.replaying = false;
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
            } else {
                const decode_data = buffer => {
                    console.log(buffer);
                    try {
                        console.log(tr("Decoding data"));
                        context.decodeAudioData(buffer, result => {
                            log.info(LogCategory.VOICE, tr("Got decoded data"));
                            file.cached = result;
                            play(sound, options);
                        }, error => {
                            console.error(tr("Failed to decode audio data for %o"), sound);
                            console.error(error);
                            file.not_supported = true;
                            file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                        })
                    } catch (error) {
                        console.error(error);
                        file.not_supported = true;
                        file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                    }
                };

                const xhr = new XMLHttpRequest();
                xhr.open('GET', path, true);
                xhr.responseType = 'arraybuffer';

                xhr.onload = function(e) {
                    if (this.status == 200) {
                        decode_data(this.response);
                    } else {
                        console.error(tr("Failed to load audio file. (Response code %o)"), this.status);
                        file.not_supported = true;
                        file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                    }
                };

                xhr.onerror = error => {
                    console.error(tr("Failed to load audio file "), sound);
                    console.error(error);
                    file.not_supported = true;
                    file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                };

                xhr.send();
            }
        } else {
            console.log(tr("Replaying %s"), path);
            if(file.node) {
                file.node.currentTime = 0;
                file.node.play();
            } else {
                if(!warned) {
                    warned = true;
                    console.warn(tr("Your browser does not support decodeAudioData! Using a node to playback! This bypasses the audio output and volume regulation!"));
                }
                const container = $("#sounds");
                const node = $.spawn("audio").attr("src", path);
                node.appendTo(container);

                file.node = node[0];
                file.node.play();
            }
        }
    }
}