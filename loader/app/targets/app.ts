import * as loader from "../loader/loader";
import {config} from "../loader/loader";

declare global {
    interface Window {
        native_client: boolean;
    }
}

const node_require: typeof require = window.require;

function cache_tag() {
    const ui = ui_version();
    return "?_ts=" + (!!ui && ui !== "unknown" ? ui : Date.now());
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

interface Manifest {
    version: number;

    chunks: {[key: string]: {
        files: {
            hash: string,
            file: string
        }[],
        modules: {
            id: string,
            context: string,
            resource: string
        }[]
    }};
}

/* all javascript loaders */
const loader_javascript = {
    load_scripts: async () => {
        if(!window.require) {
            await loader.scripts.load(["vendor/jquery/jquery.min.js"], { cache_tag: cache_tag() });
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

        await loader.scripts.load_multiple([
            ["vendor/jsrender/jsrender.min.js"],
            ["vendor/xbbcode/src/parser.js"],
            ["vendor/emoji-picker/src/jquery.lsxemojipicker.js"],
            ["vendor/twemoji/twemoji.min.js", ""], /* empty string means not required */
            ["vendor/highlight/highlight.pack.js", ""], /* empty string means not required */
            ["vendor/remarkable/remarkable.min.js", ""], /* empty string means not required */
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        });

        let manifest: Manifest;
        try {
            const response = await fetch(config.baseUrl + "js/manifest.json");
            if(!response.ok) throw response.status + " " + response.statusText;

            manifest = await response.json();
        } catch(error) {
            console.error("Failed to load javascript manifest: %o", error);
            loader.critical_error("Failed to load manifest.json", error);
            throw "failed to load manifest.json";
        }
        if(manifest.version !== 2)
            throw "invalid manifest version";

        const chunk_name = __build.entry_chunk_name;
        if(typeof manifest.chunks[chunk_name] !== "object") {
            loader.critical_error("Missing entry chunk in manifest.json", "Chunk " + chunk_name + " is missing.");
            throw "missing entry chunk";
        }
        loader.module_mapping().push({
            application: chunk_name,
            modules: manifest.chunks[chunk_name].modules
        });
        await loader.scripts.load_multiple(manifest.chunks[chunk_name].files.map(e => "js/" + e.file), {
            cache_tag: undefined,
            max_parallel_requests: -1
        });
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
        const options = {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        };

        await loader.style.load_multiple([
            "vendor/xbbcode/src/xbbcode.css"
        ], options);
        await loader.style.load_multiple([
            "vendor/emoji-picker/src/jquery.lsxemojipicker.css"
        ], options);
        await loader.style.load_multiple([
            ["vendor/highlight/styles/darcula.css", ""], /* empty string means not required */
        ], options);

        if(__build.mode === "debug") {
            await loader_style.load_style_debug();
        } else {
            await loader_style.load_style_release();
        }
    },

    load_style_debug: async () => {
        await loader.style.load_multiple([
            "css/static/main.css",
            "css/static/main-layout.css",
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
            "css/static/context_menu.css",
            "css/static/frame-chat.css",
            "css/static/connection_handlers.css",
            "css/static/server-log.css",
            "css/static/htmltags.css",
            "css/static/hostbanner.css",
            "css/static/menu-bar.css"
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        });
    },

    load_style_release: async () => {
        await loader.style.load_multiple([
            "css/static/base.css",
            "css/static/main.css",
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        });
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
        await loader.templates.load_multiple([
            "templates.html",
            "templates/modal/musicmanage.html",
            "templates/modal/newcomer.html",
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        });
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
    window["Module"] = (window["Module"] || {}) as any; /* Why? */

    /* TeaClient */
    if(node_require) {
        if(__build.target !== "client") {
            loader.critical_error("App seems not to be compiled for the client.", "This app has been compiled for " + __build.target);
            return;
        }
        window.native_client = true;

        const path = node_require("path");
        const remote = node_require('electron').remote;

        const render_entry = path.join(remote.app.getAppPath(), "/modules/", "renderer");
        const render = node_require(render_entry);

        loader.register_task(loader.Stage.INITIALIZING, {
            name: "teaclient initialize",
            function: render.initialize,
            priority: 40
        });
    } else {
        if(__build.target !== "web") {
            loader.critical_error("App seems not to be compiled for the web.", "This app has been compiled for " + __build.target);
            return;
        }

        window.native_client = false;
    }

    if(!loader.running()) {
        /* we know that we want to load the app */
        loader.execute_managed();
    }
}