namespace app {
    export enum Type {
        UNKNOWN,
        CLIENT_RELEASE,
        CLIENT_DEBUG,
        WEB_DEBUG,
        WEB_RELEASE
    }
    export let type: Type = Type.UNKNOWN;
}

namespace loader {
    type Task = {
        name: string,
        priority: number, /* tasks with the same priority will be executed in sync */
        function: () => Promise<void>
    };

    export enum Stage {
        /*
            loading loader required files (incl this)
         */
        INITIALIZING,
        /*
            setting up the loading process
         */
        SETUP,
        /*
            loading all style sheet files
         */
        STYLE,
        /*
            loading all javascript files
         */
        JAVASCRIPT,
        /*
            loading all template files
         */
        TEMPLATES,
        /*
            initializing static/global stuff
         */
        JAVASCRIPT_INITIALIZING,
        /*
            finalizing load process
         */
        FINALIZING,
        /*
            invoking main task
         */
        LOADED,

        DONE
    }

    export let allow_cached_files: boolean = false;
    let current_stage: Stage = Stage.INITIALIZING;
    const tasks: {[key:number]:Task[]} = {};

    export function finished() {
        return current_stage == Stage.DONE;
    }

    export function register_task(stage: Stage, task: Task) {
        if(current_stage > stage) {
            console.warn("Register loading task, but it had already been finished. Executing task anyways!");
            task.function().catch(error => {
                console.error("Failed to execute delayed loader task!");
                console.log(" - %s: %o", task.name, error);

                displayCriticalError(error);
            });
            return;
        }
        const task_array = tasks[stage] || [];
        task_array.push(task);
        tasks[stage] = task_array.sort((a, b) => a.priority > b.priority ? 1 : 0);
    }

    export async function execute() {
        const load_begin = Date.now();

        let begin: number = Date.now();
        let end: number;
        while(current_stage <= Stage.LOADED) {

            let current_tasks: Task[] = [];
            while((tasks[current_stage] || []).length > 0) {
                if(current_tasks.length == 0 || current_tasks[0].priority == tasks[current_stage][0].priority) {
                    current_tasks.push(tasks[current_stage].pop());
                } else break;
            }

            const errors: {
                error: any,
                task: Task
            }[] = [];

            const promises: Promise<void>[] = [];
            for(const task of current_tasks) {
                try {
                    console.debug("Executing loader %s (%d)", task.name, task.priority);
                    promises.push(task.function().catch(error => {
                        errors.push({
                            task: task,
                            error: error
                        });
                        return Promise.resolve();
                    }));
                } catch(error) {
                    errors.push({
                        task: task,
                        error: error
                    });
                }
            }

            await Promise.all([...promises]);

            if(errors.length > 0) {
                console.error("Failed to execute loader. The following tasks failed (%d):", errors.length);
                for(const error of errors)
                    console.error("  - %s: %o", error.task.name, error.error);

                throw "failed to process step " + Stage[current_stage];
            }

            if(current_tasks.length == 0) {
                if(current_stage < Stage.LOADED)
                    console.debug("[loader] entering next state (%s). Last state took %dms", Stage[current_stage + 1], (end = Date.now()) - begin);
                else
                    console.debug("[loader] Finish invoke took %dms", (end = Date.now()) - begin);
                begin = end;
                current_stage += 1;
            }
        }
        console.debug("[loader] finished loader. (Total time: %dms)", Date.now() - load_begin);
    }

    type SourcePath = string | string[];

    function script_name(path: string | string[]) {
        if(Array.isArray(path)) {
            let buffer = "";
            let _or = " or ";
            for(let entry of path)
                buffer += _or + script_name(entry);
            return buffer.slice(_or.length);
        } else return "<code>" + path + "</code>";
    }

    class SyntaxError {
        source: any;

        constructor(source: any) {
            this.source = source;
        }
    }

    export async function load_script(path: SourcePath) : Promise<void> {
        if(Array.isArray(path)) { //We have some fallback
            return load_script(path[0]).catch(error => {
                if(error instanceof SyntaxError)
                    return Promise.reject(error.source);

                if(path.length > 1)
                    return load_script(path.slice(1));

                return Promise.reject(error);
            });
        } else {
            return new Promise<void>((resolve, reject) =>  {
                const tag: HTMLScriptElement = document.createElement("script");

                let error = false;
                const error_handler = (event: ErrorEvent) => {
                    if(event.filename == tag.src && event.message.indexOf("Illegal constructor") == -1) { //Our tag throw an uncaught error
                        //console.log("msg: %o, url: %o, line: %o, col: %o, error: %o", event.message, event.filename, event.lineno, event.colno, event.error);
                        window.removeEventListener('error', error_handler as any);

                        reject(new SyntaxError(event.error));
                        event.preventDefault();
                        error = true;
                    }
                };
                window.addEventListener('error', error_handler as any);

                const timeout_handle = setTimeout(() => {
                    reject("timeout");
                }, 5000);
                tag.type = "application/javascript";
                tag.async = true;
                tag.defer = true;
                tag.onerror = error => {
                    clearTimeout(timeout_handle);
                    window.removeEventListener('error', error_handler as any);
                    tag.remove();
                    reject(error);
                };
                tag.onload = () => {
                    clearTimeout(timeout_handle);
                    window.removeEventListener('error', error_handler as any);
                    console.debug("Script %o loaded", path);
                    setTimeout(resolve, 100);
                };

                document.getElementById("scripts").appendChild(tag);

                tag.src = path + (allow_cached_files ? "" : "?_ts=" + Date.now());
            });
        }
    }

    export async function load_scripts(paths: SourcePath[]) : Promise<void> {
        const promises: Promise<void>[] = [];
        const errors: {
           script: SourcePath,
           error: any
        }[] = [];

        for(const script of paths)
            promises.push(load_script(script).catch(error => {
                errors.push({
                    script: script,
                    error: error
                });
                return Promise.resolve();
            }));

        await Promise.all([...promises]);

        if(errors.length > 0) {
            console.error("Failed to load the following scripts:");
            for(const script of errors)
                console.log(" - %o: %o", script.script, script.error);

            displayCriticalError("Failed to load script " + script_name(errors[0].script) + " <br>" + "View the browser console for more information!");
            throw "failed to load script " + script_name(errors[0].script);
        }
    }

    export async function load_style(path: SourcePath) : Promise<void> {
        if(Array.isArray(path)) { //We have some fallback
            return load_script(path[0]).catch(error => {
                if(error instanceof SyntaxError)
                    return Promise.reject(error.source);

                if(path.length > 1)
                    return load_script(path.slice(1));

                return Promise.reject(error);
            });
        } else {
            return new Promise<void>((resolve, reject) =>  {
                const tag: HTMLLinkElement = document.createElement("link");

                let error = false;
                const error_handler = (event: ErrorEvent) => {
                    console.log("msg: %o, url: %o, line: %o, col: %o, error: %o", event.message, event.filename, event.lineno, event.colno, event.error);
                    if(event.filename == tag.href) { //FIXME!
                        window.removeEventListener('error', error_handler as any);

                        reject(new SyntaxError(event.error));
                        event.preventDefault();
                        error = true;
                    }
                };
                window.addEventListener('error', error_handler as any);

                const timeout_handle = setTimeout(() => {
                    reject("timeout");
                }, 5000);

                tag.type = "text/css";
                tag.rel="stylesheet";

                tag.onerror = error => {
                    clearTimeout(timeout_handle);
                    window.removeEventListener('error', error_handler as any);
                    tag.remove();
                    console.error("File load error for file %s: %o", path, error);
                    reject("failed to load file " + path);
                };
                tag.onload = () => {
                    {
                        const css: CSSStyleSheet = tag.sheet as CSSStyleSheet;
                        const rules = css.cssRules;
                        const rules_remove: number[] = [];
                        const rules_add: string[] = [];

                        for(let index = 0; index < rules.length; index++) {
                            const rule = rules.item(index);
                            let rule_text = rule.cssText;

                            if(rule.cssText.indexOf("%%base_path%%") != -1) {
                                rules_remove.push(index);
                                rules_add.push(rule_text.replace("%%base_path%%", document.location.origin + document.location.pathname));
                            }
                        }

                        for(const index of rules_remove.sort((a, b) => b > a ? 1 : 0))
                            css.deleteRule(index);
                        for(const rule of rules_add)
                            css.insertRule(rule);
                    }

                    clearTimeout(timeout_handle);
                    window.removeEventListener('error', error_handler as any);
                    console.debug("Style sheet %o loaded", path);
                    setTimeout(resolve, 100);
                };

                document.getElementById("style").appendChild(tag);
                tag.href = path + (allow_cached_files ? "" : "?_ts=" + Date.now());
            });
        }
    }

    export async function load_styles(paths: SourcePath[]) : Promise<void> {
        const promises: Promise<void>[] = [];
        const errors: {
            sheet: SourcePath,
            error: any
        }[] = [];

        for(const sheet of paths)
            promises.push(load_style(sheet).catch(error => {
                errors.push({
                    sheet: sheet,
                    error: error
                });
                return Promise.resolve();
            }));

        await Promise.all([...promises]);

        if(errors.length > 0) {
            console.error("Failed to load the following style sheet:");
            for(const sheet of errors)
                console.log(" - %o: %o", sheet.sheet, sheet.error);

            displayCriticalError("Failed to load style sheet " + script_name(errors[0].sheet) + " <br>" + "View the browser console for more information!");
            throw "failed to load style sheet " + script_name(errors[0].sheet);
        }
    }
}

/* define that here */
let _critical_triggered = false;
const display_critical_load = message => {
    if(_critical_triggered) return; /* only show the first error */
    _critical_triggered = true;

    let tag = document.getElementById("critical-load");
    let detail = tag.getElementsByClassName("detail")[0];
    detail.innerHTML = message;

    tag.style.display = "block";
    fadeoutLoader();
};

const loader_impl_display_critical_error = message => {
    if(typeof(createErrorModal) !== 'undefined' && typeof((<any>window).ModalFunctions) !== 'undefined') {
        createErrorModal("A critical error occurred while loading the page!", message, {closeable: false}).open();
    } else {
        display_critical_load(message);
    }
    fadeoutLoader();
};

interface Window {
    impl_display_critical_error: (_: string) => any;
}

if(!window.impl_display_critical_error) { /* default impl */
    window.impl_display_critical_error = loader_impl_display_critical_error;
}
function displayCriticalError(message: string) {
    if(window.impl_display_critical_error)
        window.impl_display_critical_error(message);
    else
        loader_impl_display_critical_error(message);
}

/* all javascript loaders */
const loader_javascript = {
    detect_type: async () => {
        /* test if js/proto.js is available. If so we're in debug mode */
        const request = new XMLHttpRequest();
        request.open('GET', 'js/proto.js', true);

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
    },
    load_scripts: async () => {
        /*
      if(window.require !== undefined) {
          console.log("Loading node specific things");
          const remote = require('electron').remote;
          module.paths.push(remote.app.getAppPath() + "/node_modules");
          module.paths.push(remote.app.getAppPath() + "/app");
          module.paths.push(remote.getGlobal("browser-root") + "js/");
          window.$ = require("assets/jquery.min.js");
          require("native/loader_adapter.js");
      }
    */

        if(!window.require) {
            await loader.load_script(["vendor/jquery/jquery.min.js"]);
        }

        /* bootstrap material design and libs */
        await loader.load_script(["vendor/popper/popper.js"]);

        //depends on popper
        await loader.load_script(["vendor/bootstrap-material/bootstrap-material-design.js"]);

        loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
            name: "materialize body",
            priority: 10,
            function: async () => { $(document).ready(function() { $('body').bootstrapMaterialDesign(); }); }
        });

        await loader.load_script("vendor/jsrender/jsrender.min.js");
        await loader.load_scripts([
            ["vendor/bbcode/xbbcode.js"],
            ["vendor/moment/moment.js"],
            ["https://webrtc.github.io/adapter/adapter-latest.js"]
        ]);

        if(app.type == app.Type.WEB_RELEASE || app.type == app.Type.CLIENT_RELEASE) {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "scripts release",
                priority: 20,
                function: loader_javascript.loadRelease
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
            })
        }

        /* load the main app */
        await loader.load_scripts([
            //Load general API's
            "js/proto.js",
            "js/i18n/localize.js",
            "js/log.js",

            "js/sound/Sounds.js",

            "js/utils/modal.js",
            "js/utils/tab.js",
            "js/utils/helpers.js",

            "js/crypto/sha.js",
            "js/crypto/hex.js",
            "js/crypto/asn1.js",

            //load the profiles
            "js/profiles/ConnectionProfile.js",
            "js/profiles/Identity.js",

            //Load UI
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
            "js/ui/modal/ModalBanCreate.js",
            "js/ui/modal/ModalBanList.js",
            "js/ui/modal/ModalYesNo.js",
            "js/ui/modal/ModalPoke.js",
            "js/ui/modal/ModalPermissionEdit.js",
            "js/ui/modal/ModalServerGroupDialog.js",

            "js/ui/channel.js",
            "js/ui/client.js",
            "js/ui/server.js",
            "js/ui/view.js",
            "js/ui/client_move.js",
            "js/ui/context_divider.js",
            "js/ui/htmltags.js",

            "js/ui/frames/SelectedItemInfo.js",
            "js/ui/frames/ControlBar.js",

            //Load permissions
            "js/permission/PermissionManager.js",
            "js/permission/GroupManager.js",

            //Load audio
            "js/voice/VoiceHandler.js",
            "js/voice/VoiceRecorder.js",
            "js/voice/AudioResampler.js",
            "js/voice/AudioController.js",

            //Load codec
            "js/codec/Codec.js",
            "js/codec/BasicCodec.js",

            //Load general stuff
            "js/settings.js",
            "js/bookmarks.js",
            "js/contextMenu.js",
            "js/connection.js",
            "js/FileManager.js",
            "js/client.js",
            "js/chat.js",

            "js/PPTListener.js",


            "js/codec/CodecWrapperWorker.js",
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
            ["js/WebPPTListener.js"]
        ]);
    },

    loadRelease: async () => {
        console.log("Load for release!");

        await loader.load_scripts([
            //Load general API's
            ["js/client.min.js", "js/client.js"]
        ]);
    }
};

const loader_webassembly = {
    test_webassembly: async () => {
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
    }
};

const loader_style = {
    load_style: async () => {
        await loader.load_styles([
            "vendor/bbcode/xbbcode.css"
        ]);

        if(app.type == app.Type.WEB_DEBUG || app.type == app.Type.CLIENT_DEBUG) {
            await loader_style.load_style_debug();
        } else {
            await loader_style.load_style_release();
        }

        /* the material design */
        await loader.load_style("css/theme/bootstrap-material-design.css");
    },

    load_style_debug: async () => {
        await loader.load_styles([
            "css/static/main.css",
            "css/static/helptag.css",
            "css/static/scroll.css",
            "css/static/ts/tab.css",
            "css/static/ts/chat.css",
            "css/static/ts/client.css",
            "css/static/ts/icons.css",
            "css/static/general.css",
            "css/static/modals.css",
            "css/static/modal-bookmarks.css",
            "css/static/modal-connect.css",
            "css/static/modal-channel.css",
            "css/static/modal-query.css",
            "css/static/modal-playlist.css",
            "css/static/modal-banlist.css",
            "css/static/modal-bancreate.css",
            "css/static/modal-settings.css",
            "css/static/modal-poke.css",
            "css/static/modal-server.css",
            "css/static/modal-permissions.css",
            "css/static/music/info_plate.css",
            "css/static/frame/SelectInfo.css",
            "css/static/control_bar.css",
            "css/static/context_menu.css",
            "css/static/htmltags.css"
        ]);
    },

    load_style_release: async () => {
        await loader.load_styles([
            "css/static/base.css",
            "css/static/main.css",
        ]);
    }
}

async function load_templates() {
    try {
        const response = await $.ajax("templates.html" + (loader.allow_cached_files ? "" : "?_ts" + Date.now()));

        let node = document.createElement("html");
        node.innerHTML = response;
        let tags: HTMLCollection;
        if(node.getElementsByTagName("body").length > 0)
            tags = node.getElementsByTagName("body")[0].children;
        else
            tags = node.children;

        let root = document.getElementById("templates");
        if(!root) {
            displayCriticalError("Failed to find template tag!");
            return;
        }
        while(tags.length > 0){
            let tag = tags.item(0);
            root.appendChild(tag);

        }
    } catch(error) {
        displayCriticalError("Failed to find template tag!");
        throw "template error";
    }
}

/* test if all files shall be load from cache or fetch again */
async function check_updates() {
    const app_version = (() => {
        const version_node = document.getElementById("app_version");
        if(!version_node) return undefined;

        const version = version_node.hasAttribute("value") ? version_node.getAttribute("value") : undefined;
        if(!version) return undefined;

        if(version == "unknown" || version.replace("0", "").length == 0)
            return undefined;

        return version;
    })();

    if(!app_version) {
        /* TODO add warning */
        loader.allow_cached_files = false;
        return;
    }
    const cached_version = localStorage.getItem("cached_version");
    if(!cached_version || cached_version != app_version) {
        loader.allow_cached_files = false;
        /* loading screen */
        return;
    }

    loader.allow_cached_files = true;
    console.error(app_version);
}

interface Window {
    $: JQuery;
}

//FUN: loader_ignore_age=0&loader_default_duration=1500&loader_default_age=5000
let _fadeout_warned = false;
function fadeoutLoader(duration = undefined, minAge = undefined, ignoreAge = undefined) {
    if(typeof($) === "undefined") {
        if(!_fadeout_warned)
            console.warn("Could not fadeout loader screen. Missing jquery functions.");
        _fadeout_warned = true;
        return;
    }

    let settingsDefined = typeof(StaticSettings) !== "undefined";
    if(!duration) {
        if(settingsDefined)
            duration = StaticSettings.instance.static("loader_default_duration", 750);
        else duration = 750;
    }
    if(!minAge) {
        if(settingsDefined)
            minAge = StaticSettings.instance.static("loader_default_age", 1750);
        else minAge = 750;
    }
    if(!ignoreAge) {
        if(settingsDefined)
            ignoreAge = StaticSettings.instance.static("loader_ignore_age", false);
        else ignoreAge = false;
    }

    /*
    let age = Date.now() - app.appLoaded;
    if(age < minAge && !ignoreAge) {
        setTimeout(() => fadeoutLoader(duration, 0, true), minAge - age);
        return;
    }
    */

    $(".loader .bookshelf_wrapper").animate({top: 0, opacity: 0}, duration);
    $(".loader .half").animate({width: 0}, duration, () => {
        $(".loader").detach();
    });
}


window["Module"] = window["Module"] || {};
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

console.log(navigator.browserSpecs); //Object { name: "Firefox", version: "42" }

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

loader.register_task(loader.Stage.INITIALIZING, {
    name: "update tester",
    priority: 60,
    function: check_updates
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
    priority: 10
});

loader.register_task(loader.Stage.LOADED, {
    name: "error task",
    function: async () => {
        if(Settings.instance.static("dummy_load_error", false)) {
            displayCriticalError("The tea is cold!");
            throw "The tea is cold!";
        }
    },
    priority: 20
});

loader.execute().then(() => {
    console.log("app successfully loaded!");
}).catch(error => {
    displayCriticalError("failed to load app!<br>Please lookup the browser console for more details");
    console.error("Failed to load app!\nError: %o", error);
});