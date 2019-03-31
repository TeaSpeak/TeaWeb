/// <reference path="chat.ts" />
/// <reference path="client.ts" />
/// <reference path="utils/modal.ts" />
/// <reference path="ui/modal/ModalConnect.ts" />
/// <reference path="ui/modal/ModalCreateChannel.ts" />
/// <reference path="ui/modal/ModalBanCreate.ts" />
/// <reference path="ui/modal/ModalBanClient.ts" />
/// <reference path="ui/modal/ModalYesNo.ts" />
/// <reference path="ui/modal/ModalBanList.ts" />
/// <reference path="settings.ts" />
/// <reference path="log.ts" />

let settings: Settings;
let globalClient: TSClient;
let chat: ChatBox;

const js_render = window.jsrender || $;
const native_client = window.require !== undefined;

function getUserMediaFunction() {
    if((navigator as any).mediaDevices && (navigator as any).mediaDevices.getUserMedia)
        return (settings, success, fail) => { (navigator as any).mediaDevices.getUserMedia(settings).then(success).catch(fail); };
    return (navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia;
}

interface Window {
    open_connected_question: () => Promise<boolean>;
}


function setup_close() {
    window.onbeforeunload = event => {
        if(profiles.requires_save())
            profiles.save();

        if(!settings.static(Settings.KEY_DISABLE_UNLOAD_DIALOG, false)) {
            if(!globalClient.serverConnection || !globalClient.serverConnection.connected) return;

            if(!native_client) {
                event.returnValue = "Are you really sure?<br>You're still connected!";
            } else {
                if(window.open_connected_question) {
                    event.preventDefault();
                    event.returnValue = "question";
                    window.open_connected_question().then(result => {
                        if(result) {
                            window.onbeforeunload = undefined;

                            const {remote} = require('electron');
                            remote.getCurrentWindow().close();
                        }
                    });
                } else { /* we're in debugging mode */ }
            }
        }
    };
}

declare function moment(...arguments) : any;
function setup_jsrender() : boolean {
    if(!js_render) {
        displayCriticalError("Missing jsrender extension!");
        return false;
    }
    if(!js_render.views) {
        displayCriticalError("Missing jsrender viewer extension!");
        return false;
    }
    js_render.views.settings.allowCode(true);
    js_render.views.tags("rnd", (argument) => {
        let min = parseInt(argument.substr(0, argument.indexOf('~')));
        let max = parseInt(argument.substr(argument.indexOf('~') + 1));

        return (Math.round(Math.random() * (min + max + 1) - min)).toString();
    });

    js_render.views.tags("fmt_date", (...args) => {
        return moment(args[0]).format(args[1]);
    });

    js_render.views.tags("tr", (...args) => {
        return tr(args[0]);
    });

    $(".jsrender-template").each((idx, _entry) => {
        if(!js_render.templates(_entry.id, _entry.innerHTML)) { //, _entry.innerHTML
            console.error("Failed to cache template " + _entry.id + " for js render!");
        } else
            console.debug("Successfully loaded jsrender template " + _entry.id);
    });
    return true;
}

async function initialize() {
    const display_load_error = message => {
        if(typeof(display_critical_load) !== "undefined")
            display_critical_load(message);
        else
            displayCriticalError(message);
    };

    settings = new Settings();

    try {
        await i18n.initialize();
    } catch(error) {
        console.error(tr("Failed to initialized the translation system!\nError: %o"), error);
        displayCriticalError("Failed to setup the translation system");
        return;
    }

    try {
        if(!setup_jsrender())
            throw "invalid load";
    } catch (error) {
        display_load_error(tr("Failed to setup jsrender"));
        console.error(tr("Failed to load jsrender! %o"), error);
        return;
    }

    try { //Initialize main template
        const main = $("#tmpl_main").renderTag().dividerfy();

        $("body").append(main);
    } catch(error) {
        console.error(error);
        display_load_error(tr("Failed to setup main page!"));
        return;
    }

    AudioController.initializeAudioController();
    await profiles.load();

    try {
        await ppt.initialize();
    } catch(error) {
        console.error(tr("Failed to initialize ppt!\nError: %o"), error);
        displayCriticalError(tr("Failed to initialize ppt!"));
        return;
    }

    setup_close();
}

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab8(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

/* FIXME Dont use atob, because it sucks for non UTF-8 tings */
function arrayBufferBase64(base64: string) {
    base64 = atob(base64);
    const buf = new ArrayBuffer(base64.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = base64.length; i < strLen; i++) {
        bufView[i] = base64.charCodeAt(i);
    }
    return buf;
}

function base64ArrayBuffer(arrayBuffer) {
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder

    var a, b, c, d
    var chunk

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength]

        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4 // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

        a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
}

function Base64EncodeUrl(str){
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
}

function Base64DecodeUrl(str: string, pad?: boolean){
    if(typeof(pad) === 'undefined' || pad)
        str = (str + '===').slice(0, str.length + (str.length % 4));
    return str.replace(/-/g, '+').replace(/_/g, '/');
}

function main() {
    //http://localhost:63343/Web-Client/index.php?_ijt=omcpmt8b9hnjlfguh8ajgrgolr&default_connect_url=true&default_connect_type=teamspeak&default_connect_url=localhost%3A9987&disableUnloadDialog=1&loader_ignore_age=1

    globalClient = new TSClient();
    /** Setup the XF forum identity **/
    profiles.identities.setup_forum();

    chat = new ChatBox($("#chat"));
    globalClient.setup();

    if(settings.static(Settings.KEY_FLAG_CONNECT_DEFAULT, false) && settings.static(Settings.KEY_CONNECT_ADDRESS, "")) {
        const profile_uuid = settings.static(Settings.KEY_CONNECT_PROFILE, (profiles.default_profile() || {id: 'default'}).id);
        console.log("UUID: %s", profile_uuid);
        const profile = profiles.find_profile(profile_uuid) || profiles.default_profile();
        const address = settings.static(Settings.KEY_CONNECT_ADDRESS, "");
        const username = settings.static(Settings.KEY_CONNECT_USERNAME, "Another TeaSpeak user");

        const password = settings.static(Settings.KEY_CONNECT_PASSWORD, "");
        const password_hashed = settings.static(Settings.KEY_FLAG_CONNECT_PASSWORD, false);

        if(profile && profile.valid()) {
            globalClient.startConnection(address, profile, username, password.length > 0 ? {
                password: password,
                hashed: password_hashed
            } : undefined);
        } else {
            Modals.spawnConnectModal({
                url: address,
                enforce: true
            }, {
                profile: profile,
                enforce: true
            });
        }
    }

    let _resize_timeout: NodeJS.Timer;
    $(window).on('resize', () => {
        if(_resize_timeout)
            clearTimeout(_resize_timeout);
        _resize_timeout = setTimeout(() => {
            globalClient.channelTree.handle_resized();
            globalClient.selectInfo.handle_resize();
        }, 1000);
    });

    stats.initialize({
        verbose: true,
        anonymize_ip_addresses: true,
        volatile_collection_only: false
    });
    stats.register_user_count_listener(status => {
        console.log("Received user count update: %o", status);
    });

    /*
    setTimeout(() => {
        Modals.spawnAvatarList(globalClient);
    }, 1000);
    */
    (<any>window).test_upload = () => {
        const data = "Hello World";
        globalClient.fileManager.upload_file({
            size: data.length,
            overwrite: true,
            channel: globalClient.getClient().currentChannel(),
            name: '/HelloWorld.txt',
            path: ''
        }).then(key => {
            console.log("Got key: %o", key);
            const upload = new RequestFileUpload(key);

            const buffer = new Uint8Array(data.length);
            {
                for(let index = 0; index < data.length; index++)
                    buffer[index] = data.charCodeAt(index);
            }

            upload.put_data(buffer).catch(error => {
                console.error(error);
            });
        })
    };
}

loader.register_task(loader.Stage.LOADED, {
    name: "async main invoke",
    function: async () => {
        try {
            await initialize();
            main();
            if(!audio.player.initialized()) {
                log.info(LogCategory.VOICE, tr("Initialize audio controller later!"));
                if(!audio.player.initializeFromGesture) {
                    console.error(tr("Missing audio.player.initializeFromGesture"));
                } else
                    $(document).one('click', event => audio.player.initializeFromGesture());
            }
        } catch (ex) {
            console.error(ex.stack);
            if(ex instanceof ReferenceError || ex instanceof TypeError)
                ex = ex.name + ": " + ex.message;
            displayCriticalError("Failed to invoke main function:<br>" + ex);
        }
    },
    priority: 10
});

