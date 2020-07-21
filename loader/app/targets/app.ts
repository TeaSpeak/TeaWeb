import "./shared";
import * as loader from "../loader/loader";
import {ApplicationLoader, config, SourcePath} from "../loader/loader";
import {script_name} from "../loader/utils";
import {loadManifest, loadManifestTarget} from "../maifest";

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

const LoaderTaskCallback = taskId => (script: SourcePath, state) => {
    if(state !== "loading")
        return;

    loader.setCurrentTaskName(taskId, script_name(script, false));
};

/* all javascript loaders */
const loader_javascript = {
    load_scripts: async taskId => {
        loader.setCurrentTaskName(taskId, "manifest");
        await loadManifest();
        await loadManifestTarget(__build.entry_chunk_name, taskId);
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
    load_style: async taskId => {
        if(__build.mode === "debug") {
            await loader_style.load_style_debug(taskId);
        } else {
            await loader_style.load_style_release(taskId);
        }
    },

    load_style_debug: async taskId => {
        await loader.style.load_multiple([
            "css/static/main.css",
            "css/static/main-layout.css",
            "css/static/scroll.css",
            "css/static/channel-tree.css",
            "css/static/ts/tab.css",
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
        }, LoaderTaskCallback(taskId));
    },

    load_style_release: async taskId => {
        await loader.style.load_multiple([
            "css/static/base.css",
            "css/static/main.css",
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        }, LoaderTaskCallback(taskId));
    }
};

loader.register_task(loader.Stage.INITIALIZING, {
    name: "secure tester",
    function: async () => {
        /* we need https or localhost to use some things like the storage API */
        if(typeof isSecureContext === "undefined")
            (<any>window)["isSecureContext"] = location.protocol !== 'https:' || location.hostname === 'localhost';

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
    name: "scripts",
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
    function: async taskId => {
        await loader.templates.load_multiple([
            "templates.html",
            "templates/modal/musicmanage.html",
            "templates/modal/newcomer.html",
        ], {
            cache_tag: cache_tag(),
            max_parallel_requests: -1
        }, LoaderTaskCallback(taskId));
    },
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

export default class implements ApplicationLoader {
    execute() {
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

        loader.execute_managed();
    }
}