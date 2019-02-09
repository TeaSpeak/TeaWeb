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
                    console.debug("[loader] entering next state (%s)", Stage[current_stage + 1]);
                current_stage += 1;
            }
        }
        console.debug("[loader] finished loader.");
    }

    type Script = string | string[];

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

    export async function load_script(path: Script) : Promise<void> {
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

                tag.type = "application/javascript";
                tag.async = true;
                tag.onerror = error => {
                    window.removeEventListener('error', error_handler as any);
                    tag.remove();
                    reject(error);
                };
                tag.onload = () => {
                    window.removeEventListener('error', error_handler as any);
                    console.debug("Script %o loaded", path);
                    setTimeout(resolve, 100);
                };
                document.getElementById("scripts").appendChild(tag);
                tag.src = path;
            });
        }
    }

    export async function load_scripts(paths: Script[]) : Promise<void> {
        const promises: Promise<void>[] = [];
        const errors: {
           script: Script,
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
            //await loader.load_script(["vendor/jquery/jquery.min.js"]);
        }
        await loader.load_script("vendor/jsrender/jsrender.min.js");
        await loader.load_scripts([
            ["vendor/bbcode/xbbcode.js"],
            ["vendor/moment/moment.js"],
            ["https://webrtc.github.io/adapter/adapter-latest.js"]
        ]);

        try {
            await loader.load_script("js/proto.js");
            //we're loading for debug

            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "scripts debug",
                priority: 20,
                function: loader_javascript.load_scripts_debug
            });
        } catch(error) {
            loader.register_task(loader.Stage.JAVASCRIPT, {
                name: "scripts release",
                priority: 20,
                function: loader_javascript.loadRelease
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

        await loader.load_scripts([
            ["wasm/TeaWeb-Identity.js"],

            //Load general API's
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
            "js/ui/modal/ModalConnect.js",
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

            "js/PPTListener.js"
        ]);

        await loader.load_scripts([
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
            ["wasm/TeaWeb-Identity.js"],
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
    },
    setup_awaiter: async () => {
        Module['_initialized'] = false;
        Module['_initialized_callback'] = undefined;

        Module['onRuntimeInitialized'] = () => {
            Module['_initialized'] = true;
            if(Module['_initialized_callback'])
                Module['_initialized_callback']();
        };

        Module['onAbort'] = message => {
            if(!loader.finished()) {
                Module['onAbort'] = undefined;
                Module['_initialized'] = false;
                displayCriticalError("Could not load webassembly files!<br>Message: <code>" + message + "</code>");
            }
        };

        Module['locateFile'] = file => "wasm/" + file;
    },
    awaiter: () => new Promise<void>((resolve, reject) => {
        if(!Module['onAbort']) /* an error has been already encountered */
            reject();
        else if(!Module['_initialized'])
            Module['_initialized_callback'] = resolve;
        else
            resolve();
    })
};


async function load_templates() {
    try {
        const response = await $.ajax("templates.html", {
            cache: false, //Change this when in release mode
        });

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


if(typeof Module === "undefined")
    this["Module"] = {};

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
    name: "webassembly setup",
    function: loader_webassembly.setup_awaiter,
    priority: 10
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "javascript webassembly",
    function: loader_webassembly.awaiter,
    priority: 10
});


loader.register_task(loader.Stage.JAVASCRIPT, {
    name: "javascript",
    function: loader_javascript.load_scripts,
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

loader.execute().then(() => {
    console.log("app successfully loaded!");
}).catch(error => {
    displayCriticalError("failed to load app!<br>Please lookup the browser console for more details");
    console.error("Failed to load app!\nError: %o", error);
});