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

    }
    let warned = false
    let speech_mapping: {[key: string]:SpeechFile} = {};

    function register_sound(key: string, file: string) {
        speech_mapping[key] = {key: key, filename: file} as SpeechFile;
    }

    export function initialize() : Promise<void> {
        $.ajaxSetup({
            beforeSend: function(jqXHR,settings){
                if (settings.dataType === 'binary'){
                    console.log("Settins binary");
                    settings.xhr().responseType = 'arraybuffer';
                    settings.processData = false;
                }
            }
        });

        register_sound("message.received", "effects/message_received.wav");
        register_sound("message.send", "effects/message_send.wav");

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

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
        var bufView = new Uint16Array(buf);
        for (var i = 0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    export function play(sound: Sound, options?: {
        background_notification?: boolean
    }) {
        console.log("playback sound " + sound);
        const file: SpeechFile = speech_mapping[sound];
        if(!file) {
            console.warn("Missing sound " + sound);
            return;
        }
        if(file.not_supported) {
            if(!file.not_supported_timeout || Date.now() < file.not_supported_timeout) //Test if the not supported isnt may timeouted
                return;
            file.not_supported = false;
            file.not_supported_timeout = undefined;
        }

        const path = "audio/" + file.filename;
        const context = audio.player.context();
        const volume = options && options.background_notification ? .5 : 1;

        if(context.decodeAudioData) {
            if(file.cached) {
                console.log("Using cached buffer: %o", file.cached);
                const player = context.createBufferSource();
                player.buffer = file.cached;
                player.start(0);

                if(volume != 1 && context.createGain) {
                    const gain = context.createGain();
                    if(gain.gain.setValueAtTime)
                        gain.gain.setValueAtTime(volume, 0);
                    else
                        gain.gain.value = volume;

                    player.connect(gain);
                    gain.connect(audio.player.destination());
                } else
                    player.connect(audio.player.destination());
            } else {
                const decode_data = buffer => {
                    console.log(buffer);
                    try {
                        console.log("Decoding data");
                        context.decodeAudioData(buffer, result => {
                            console.log("Got decoded data");
                            file.cached = result;
                            play(sound, options);
                        }, error => {
                            console.error("Failed to decode audio data for " + sound);
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
                        console.error("Failed to load audio file. (Response code " + this.status + ")");
                        file.not_supported = true;
                        file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                    }
                };

                xhr.onerror = error => {
                    console.error("Failed to load audio file " + sound);
                    console.error(error);
                    file.not_supported = true;
                    file.not_supported_timeout = Date.now() + 1000 * 60 * 60; //Try in 2min again!
                };

                xhr.send();
            }
        } else {
            console.log("Replaying " + path);
            if(file.node) {
                file.node.currentTime = 0;
                file.node.play();
            } else {
                if(!warned) {
                    warned = true;
                    console.warn("Your browser does not support decodeAudioData! Using a node to playback! This bypasses the audio output and volume regulation!");
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