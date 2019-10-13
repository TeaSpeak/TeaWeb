/// <reference path="loader.ts" />

interface Window {
    $: JQuery;
}

namespace app {
    export enum Type {
        UNKNOWN,
        CLIENT_RELEASE,
        CLIENT_DEBUG,
        WEB_DEBUG,
        WEB_RELEASE
    }
    export let type: Type = Type.UNKNOWN;

    export function is_web() {
        return type == Type.WEB_RELEASE || type == Type.WEB_DEBUG;
    }

    let _ui_version;
    export function ui_version() {
        if(typeof(_ui_version) !== "string") {
            const version_node = document.getElementById("app_version");
            if(!version_node) return undefined;

            const version = version_node.hasAttribute("value") ? version_node.getAttribute("value") : undefined;
            if(!version) return undefined;

            return (_ui_version = version);
        }
        return _ui_version;
    }
}

/* all javascript loaders */
const loader_javascript = {
    detect_type: async () => {
        if(window.require) {
            const request = new Request("js/proto.js");
            let file_path = request.url;
            if(!file_path.startsWith("file://"))
                throw "Invalid file path (" + file_path + ")";
            file_path = file_path.substring(process.platform === "win32" ? 8 : 7);

            const fs = require('fs');
            if(fs.existsSync(file_path)) {
                app.type = app.Type.CLIENT_DEBUG;
            } else {
                app.type = app.Type.CLIENT_RELEASE;
            }
        } else {
            /* test if js/proto.js is available. If so we're in debug mode */
            const request = new XMLHttpRequest();
            request.open('GET', "js/proto.js?_ts=" + Date.now(), true);

            await new Promise((resolve, reject) => {
                request.onreadystatechange = () => {
                    if (request.readyState === 4){
                        if (request.status === 404) {
                            app.type = app.Type.WEB_RELEASE;
                        } else {
                            app.type = app.Type.WEB_DEBUG;
                        }
                        resolve();
                    }
                };
                request.onerror = () => {
                    reject("Failed to detect app type");
                };
                request.send();
            });
        }
    },
    load_scripts: async () => {
        if(!window.require) {
            await loader.load_script(["vendor/jquery/jquery.min.js"]);
        } else {
            /*
            loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
                name: "forum sync",
                priority: 10,
                function: async () => {
                    forum.sync_main();
                }
            });
            */
        }
        await loader.load_script(["vendor/DOMPurify/purify.min.js"]);

        await loader.load_script("vendor/jsrender/jsrender.min.js");
        await loader.load_scripts([
            ["vendor/xbbcode/src/parser.js"],
            ["vendor/moment/moment.js"],
            ["vendor/twemoji/twemoji.min.js", ""], /* empty string means not required */
            ["vendor/highlight/highlight.pack.js", ""], /* empty string means not required */
            ["vendor/remarkable/remarkable.min.js", ""], /* empty string means not required */
            ["adapter/adapter-latest.js", "https://webrtc.github.io/adapter/adapter-latest.js"]
        ]);
        await loader.load_scripts([
            ["vendor/emoji-picker/src/jquery.lsxemojipicker.js"]
        ]);

        if(app.type == app.Type.WEB_RELEASE || app.type == app.Type.CLIENT_RELEASE) {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "scripts release",
                priority: 20,
                function: loader_javascript.load_release
            });
        } else {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "scripts debug",
                priority: 20,
                function: loader_javascript.load_scripts_debug
            });
        }
    },
    load_scripts_debug: async () => {
        /* test if we're loading as TeaClient or WebClient */
        if(!window.require) {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "javascript web",
                priority: 10,
                function: loader_javascript.load_scripts_debug_web
            });
        } else {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "javascript client",
                priority: 10,
                function: loader_javascript.load_scripts_debug_client
            });
        }

        /* load some extends classes */
        await loader.load_scripts([
            ["js/connection/ConnectionBase.js"]
        ]);

        /* load the main app */
        await loader.load_scripts([
            //Load general API's
            "js/proto.js",
            "js/i18n/localize.js",
            "js/i18n/country.js",
            "js/log.js",

            "js/sound/Sounds.js",

            "js/utils/helpers.js",

            "js/crypto/sha.js",
            "js/crypto/hex.js",
            "js/crypto/asn1.js",
            "js/crypto/crc32.js",

            //load the profiles
            "js/profiles/ConnectionProfile.js",
            "js/profiles/Identity.js",
            "js/profiles/identities/teaspeak-forum.js",

            //Basic UI elements
            "js/ui/elements/context_divider.js",
            "js/ui/elements/context_menu.js",
            "js/ui/elements/modal.js",
            "js/ui/elements/tab.js",
            "js/ui/elements/slider.js",
            "js/ui/elements/tooltip.js",
            "js/ui/elements/net_graph.js",

            //Load UI
            "js/ui/modal/ModalAbout.js",
            "js/ui/modal/ModalAvatar.js",
            "js/ui/modal/ModalAvatarList.js",
            "js/ui/modal/ModalClientInfo.js",
            "js/ui/modal/ModalChannelInfo.js",
            "js/ui/modal/ModalServerInfo.js",
            "js/ui/modal/ModalServerInfoBandwidth.js",
            "js/ui/modal/ModalQuery.js",
            "js/ui/modal/ModalQueryManage.js",
            "js/ui/modal/ModalPlaylistList.js",
            "js/ui/modal/ModalPlaylistEdit.js",
            "js/ui/modal/ModalBookmarks.js",
            "js/ui/modal/ModalConnect.js",
            "js/ui/modal/ModalSettings.js",
            "js/ui/modal/ModalCreateChannel.js",
            "js/ui/modal/ModalServerEdit.js",
            "js/ui/modal/ModalChangeVolume.js",
            "js/ui/modal/ModalBanClient.js",
            "js/ui/modal/ModalIconSelect.js",
            "js/ui/modal/ModalInvite.js",
            "js/ui/modal/ModalIdentity.js",
            "js/ui/modal/ModalBanList.js",
            "js/ui/modal/ModalYesNo.js",
            "js/ui/modal/ModalPoke.js",
            "js/ui/modal/ModalKeySelect.js",
            "js/ui/modal/ModalGroupAssignment.js",
            "js/ui/modal/permission/ModalPermissionEdit.js",
            {url: "js/ui/modal/permission/CanvasPermissionEditor.js", depends: ["js/ui/modal/permission/ModalPermissionEdit.js"]},
            {url: "js/ui/modal/permission/HTMLPermissionEditor.js", depends: ["js/ui/modal/permission/ModalPermissionEdit.js"]},

            "js/ui/channel.js",
            "js/ui/client.js",
            "js/ui/server.js",
            "js/ui/view.js",
            "js/ui/client_move.js",
            "js/ui/htmltags.js",

            "js/ui/frames/ControlBar.js",
            "js/ui/frames/chat.js",
            "js/ui/frames/chat_frame.js",
            "js/ui/frames/connection_handlers.js",
            "js/ui/frames/server_log.js",
            "js/ui/frames/hostbanner.js",
            "js/ui/frames/MenuBar.js",

            //Load permissions
            "js/permission/PermissionManager.js",
            "js/permission/GroupManager.js",

            //Load audio
            "js/voice/RecorderBase.js",
            "js/voice/RecorderProfile.js",

            //Load general stuff
            "js/settings.js",
            "js/bookmarks.js",
            "js/FileManager.js",
            "js/ConnectionHandler.js",
            "js/BrowserIPC.js",
            "js/dns.js",

            //Connection
            "js/connection/CommandHandler.js",
            "js/connection/CommandHelper.js",
            "js/connection/HandshakeHandler.js",
            "js/connection/ServerConnectionDeclaration.js",

            "js/stats.js",
            "js/PPTListener.js",

            "js/profiles/identities/NameIdentity.js", //Depends on Identity
            "js/profiles/identities/TeaForumIdentity.js", //Depends on Identity
            "js/profiles/identities/TeamSpeakIdentity.js", //Depends on Identity
        ]);

        await loader.load_script("js/main.js");
    },
    load_scripts_debug_web: async () => {
        await loader.load_scripts([
            ["js/audio/AudioPlayer.js"],
            ["js/audio/WebCodec.js"],
            ["js/WebPPTListener.js"],

            "js/voice/AudioResampler.js",
            "js/voice/JavascriptRecorder.js",
            "js/voice/VoiceHandler.js",
            "js/voice/VoiceClient.js",

            //Connection
            "js/connection/ServerConnection.js",

            //Load codec
            "js/codec/Codec.js",
            "js/codec/BasicCodec.js",
            {url: "js/codec/CodecWrapperWorker.js", depends: ["js/codec/BasicCodec.js"]},
        ]);
    },
    load_scripts_debug_client: async () => {
        await loader.load_scripts([
        ]);
    },

    load_release: async () => {
        console.log("Load for release!");

        await loader.load_scripts([
            //Load general API's
            ["js/client.min.js", "js/client.js"]
        ]);
    }
};

const loader_webassembly = {
    test_webassembly: async () => {
        /* We dont required WebAssembly anymore for fundamental functions, only for auto decoding
        if(typeof (WebAssembly) === "undefined" || typeof (WebAssembly.compile) === "undefined") {
            console.log(navigator.browserSpecs);
            if (navigator.browserSpecs.name == 'Safari') {
                if (parseInt(navigator.browserSpecs.version) < 11) {
                    displayCriticalError("You require Safari 11 or higher to use the web client!<br>Safari " + navigator.browserSpecs.version + " does not support WebAssambly!");
                    return;
                }
            }
            else {
                // Do something for all other browsers.
            }
            displayCriticalError("You require WebAssembly for TeaSpeak-Web!");
            throw "Missing web assembly";
        }
        */
    }
};

const loader_style = {
    load_style: async () => {
        await loader.load_styles([
            "vendor/xbbcode/src/xbbcode.css"
        ]);
        await loader.load_styles([
            "vendor/emoji-picker/src/jquery.lsxemojipicker.css"
        ]);
        await loader.load_styles([
            ["vendor/highlight/styles/darcula.css", ""], /* empty string means not required */
        ]);

        if(app.type == app.Type.WEB_DEBUG || app.type == app.Type.CLIENT_DEBUG) {
            await loader_style.load_style_debug();
        } else {
            await loader_style.load_style_release();
        }
    },

    load_style_debug: async () => {
        await loader.load_styles([
            "css/static/main.css",
            "css/static/main-layout.css",
            "css/static/helptag.css",
            "css/static/scroll.css",
            "css/static/channel-tree.css",
            "css/static/ts/tab.css",
            "css/static/ts/chat.css",
            "css/static/ts/icons.css",
            "css/static/ts/icons_em.css",
            "css/static/ts/country.css",
            "css/static/general.css",
            "css/static/modal.css",
            "css/static/modals.css",
            "css/static/modal-about.css",
            "css/static/modal-avatar.css",
            "css/static/modal-icons.css",
            "css/static/modal-bookmarks.css",
            "css/static/modal-connect.css",
            "css/static/modal-channel.css",
            "css/static/modal-query.css",
            "css/static/modal-volume.css",
            "css/static/modal-invite.css",
            "css/static/modal-playlist.css",
            "css/static/modal-banlist.css",
            "css/static/modal-banclient.css",
            "css/static/modal-channelinfo.css",
            "css/static/modal-clientinfo.css",
            "css/static/modal-serverinfo.css",
            "css/static/modal-serverinfobandwidth.css",
            "css/static/modal-identity.css",
            "css/static/modal-settings.css",
            "css/static/modal-poke.css",
            "css/static/modal-server.css",
            "css/static/modal-keyselect.css",
            "css/static/modal-permissions.css",
            "css/static/modal-group-assignment.css",
            "css/static/music/info_plate.css",
            "css/static/frame/SelectInfo.css",
            "css/static/control_bar.css",
            "css/static/context_menu.css",
            "css/static/frame-chat.css",
            "css/static/connection_handlers.css",
            "css/static/server-log.css",
            "css/static/htmltags.css",
            "css/static/hostbanner.css",
            "css/static/menu-bar.css"
        ]);
    },

    load_style_release: async () => {
        await loader.load_styles([
            "css/static/base.css",
            "css/static/main.css",
        ]);
    }
};

async function load_templates() {
    try {
        const response = await $.ajax("templates.html" + loader.get_cache_version());

        let node = document.createElement("html");
        node.innerHTML = response;
        let tags: HTMLCollection;
        if(node.getElementsByTagName("body").length > 0)
            tags = node.getElementsByTagName("body")[0].children;
        else
            tags = node.children;

        let root = document.getElementById("templates");
        if(!root) {
            loader.critical_error("Failed to find template tag!");
            return;
        }
        while(tags.length > 0){
            let tag = tags.item(0);
            root.appendChild(tag);

        }
    } catch(error) {
        loader.critical_error("Failed to find template tag!");
        throw "template error";
    }
}

/* register tasks */
loader.register_task(loader.Stage.INITIALIZING, {
    name: "safari fix",
    function: async () => {
        /* safari remove "fix" */
        if(Element.prototype.remove === undefined)
            Object.defineProperty(Element.prototype, "remove", {
                enumerable: false,
                configurable: false,
                writable: false,
                value: function(){
                    this.parentElement.removeChild(this);
                }
            });
    },
    priority: 50
});

loader.register_task(loader.Stage.INITIALIZING, {
    name: "Browser detection",
    function: async () => {
        navigator.browserSpecs = (function(){
            let ua = navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return {name:'IE',version:(tem[1] || '')};
            }
            if(M[1]=== 'Chrome'){
                tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
                if(tem != null) return {name:tem[1].replace('OPR', 'Opera'),version:tem[2]};
            }
            M = M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem = ua.match(/version\/(\d+)/i))!= null)
                M.splice(1, 1, tem[1]);
            return {name:M[0], version:M[1]};
        })();

        console.log("Resolved browser manufacturer to \"%s\" version \"%s\"", navigator.browserSpecs.name, navigator.browserSpecs.version);
    },
    priority: 30
});

loader.register_task(loader.Stage.INITIALIZING, {
    name: "secure tester",
    function: async () => {
        /* we need https or localhost to use some things like the storage API */
        if(typeof isSecureContext === "undefined")
            (<any>window)["isSecureContext"] = location.protocol !== 'https:' && location.hostname !== 'localhost';

        if(!isSecureContext) {
            loader.critical_error("TeaWeb cant run on unsecured sides.", "App requires to be loaded via HTTPS!");
            throw "App requires a secure context!"
        }
    },
    priority: 20
});

loader.register_task(loader.Stage.INITIALIZING, {
    name: "webassembly tester",
    function: loader_webassembly.test_webassembly,
    priority: 20
});

loader.register_task(loader.Stage.INITIALIZING, {
    name: "app type test",
    function: loader_javascript.detect_type,
    priority: 20
});

loader.register_task(loader.Stage.JAVASCRIPT, {
    name: "javascript",
    function: loader_javascript.load_scripts,
    priority: 10
});

loader.register_task(loader.Stage.STYLE, {
    name: "style",
    function: loader_style.load_style,
    priority: 10
});

loader.register_task(loader.Stage.TEMPLATES, {
    name: "templates",
    function: load_templates,
    priority: 10
});

loader.register_task(loader.Stage.LOADED, {
    name: "loaded handler",
    function: async () => {
        fadeoutLoader();
    },
    priority: 5
});

loader.register_task(loader.Stage.LOADED, {
    name: "error task",
    function: async () => {
        if(Settings.instance.static(Settings.KEY_LOAD_DUMMY_ERROR, false)) {
            loader.critical_error("The tea is cold!", "Argh, this is evil! Cold tea dosn't taste good.");
            throw "The tea is cold!";
        }
    },
    priority: 20
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "lsx emoji picker setup",
    function: async () => await (window as any).setup_lsx_emoji_picker({twemoji: typeof(window.twemoji) !== "undefined"}),
    priority: 10
});

loader.register_task(loader.Stage.SETUP, {
    name: "page setup",
    function: async () => {
        const body = document.body;
        /* top menu */
        {
            const container = document.createElement("div");
            container.setAttribute('id', "top-menu-bar");
            body.append(container);
        }
        /* template containers */
        {
            const container = document.createElement("div");
            container.setAttribute('id', "templates");
            body.append(container);
        }
        /* sounds container */
        {
            const container = document.createElement("div");
            container.setAttribute('id', "sounds");
            body.append(container);
        }
        /* mouse move container */
        {
            const container = document.createElement("div");
            container.setAttribute('id', "mouse-move");

            const inner_container = document.createElement("div");
            inner_container.classList.add("container");
            container.append(inner_container);

            body.append(container);
        }
        /* tooltip container */
        {
            const container = document.createElement("div");
            container.setAttribute('id', "global-tooltip");

            container.append(document.createElement("a"));

            body.append(container);
        }
    },
    priority: 10
});

/* test if we're getting loaded within a TeaClient preview window */
loader.register_task(loader.Stage.SETUP, {
    name: "TeaClient tester",
    function: async () => {
        //@ts-ignore
        if(typeof __teaclient_preview_notice !== "undefined" && typeof __teaclient_preview_error !== "undefined") {
            loader.critical_error("Why you're opening TeaWeb within the TeaSpeak client?!");
            throw "we're already a TeaClient!";
        }
    },
    priority: 100
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "log enabled initialisation",
    function: async () => log.initialize(app.type === app.Type.CLIENT_DEBUG || app.type === app.Type.WEB_DEBUG ? log.LogType.TRACE : log.LogType.INFO),
    priority: 150
});

window["Module"] = (window["Module"] || {}) as any;
/* TeaClient */
if(window.require) {
    const path = require("path");
    const remote = require('electron').remote;
    module.paths.push(path.join(remote.app.getAppPath(), "/modules"));
    module.paths.push(path.join(path.dirname(remote.getGlobal("browser-root")), "js"));

    const connector = require("renderer");
    console.log(connector);

    loader.register_task(loader.Stage.INITIALIZING, {
        name: "teaclient initialize",
        function: connector.initialize,
        priority: 40
    });
}

if(!loader.running()) {
    /* we know that we want to load the app */
    loader.execute_managed();
}