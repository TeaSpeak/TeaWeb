import * as loader from "./loader";

declare global {
    interface Window {
        native_client: boolean;
    }
}

const node_require: typeof require = window.require;

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

/* all javascript loaders */
const loader_javascript = {
    detect_type: async () => {
        //TODO: Detect real version!
        loader.set_version({
            backend: "-",
            ui: ui_version(),
            debug_mode: true,
            type: "web"
        });
        window.native_client = false;
        return;
        if(window.require) {
            const request = new Request("js/proto.js");
            let file_path = request.url;
            if(!file_path.startsWith("file://"))
                throw "Invalid file path (" + file_path + ")";
            file_path = file_path.substring(process.platform === "win32" ? 8 : 7);

            const fs = node_require('fs');
            if(fs.existsSync(file_path)) {
                //type = Type.CLIENT_DEBUG;
            } else {
                //type = Type.CLIENT_RELEASE;
            }
        } else {
            /* test if js/proto.js is available. If so we're in debug mode */
            const request = new XMLHttpRequest();
            request.open('GET', "js/proto.js?_ts=" + Date.now(), true);

            await new Promise((resolve, reject) => {
                request.onreadystatechange = () => {
                    if (request.readyState === 4){
                        if (request.status === 404) {
                            //type = Type.WEB_RELEASE;
                        } else {
                            //type = Type.WEB_DEBUG;
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

        if(!loader.version().debug_mode) {
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
        await loader.load_scripts(["js/shared-app.js"])
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

        if(loader.version().debug_mode) {
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
            "css/static/modal-latency.css",
            "css/static/modal-invite.css",
            "css/static/modal-playlist.css",
            "css/static/modal-banlist.css",
            "css/static/modal-banclient.css",
            "css/static/modal-channelinfo.css",
            "css/static/modal-clientinfo.css",
            "css/static/modal-serverinfo.css",
            "css/static/modal-musicmanage.css",
            "css/static/modal-serverinfobandwidth.css",
            "css/static/modal-identity.css",
            "css/static/modal-newcomer.css",
            "css/static/modal-settings.css",
            "css/static/modal-poke.css",
            "css/static/modal-server.css",
            "css/static/modal-keyselect.css",
            "css/static/modal-permissions.css",
            "css/static/modal-group-assignment.css",
            "css/static/overlay-image-preview.css",
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
    function: async () => {
        await loader.load_templates([
            "templates.html",
            "templates/modal/musicmanage.html",
            "templates/modal/newcomer.html",
        ]);
    },
    priority: 10
});

loader.register_task(loader.Stage.LOADED, {
    name: "loaded handler",
    function: async () => loader.hide_overlay(),
    priority: 5
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

export function run() {
    window["Module"] = (window["Module"] || {}) as any;
    /* TeaClient */
    if(node_require) {
        const path = node_require("path");
        const remote = node_require('electron').remote;
        module.paths.push(path.join(remote.app.getAppPath(), "/modules"));
        module.paths.push(path.join(path.dirname(remote.getGlobal("browser-root")), "js"));

        //TODO: HERE!
        const connector = node_require("renderer");
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
}