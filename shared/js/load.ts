namespace app {
    export enum Type {
        UNDEFINED,
        RELEASE,
        DEBUG
    }

    let moduleInitialized: boolean;
    let applicationLoaded: boolean;
    export let type: Type = Type.UNDEFINED;
    export let loadedListener: (() => any)[];
    export const appLoaded = Date.now();

    export function initialized() : boolean {
        return moduleInitialized && applicationLoaded;
    }

    export function callbackApp(errorMessage?: string) {
        if(errorMessage) {
            console.error("Could not load application!");
        } else {
            applicationLoaded = true;
            testInitialisation();
        }
    }

    export function initialize() {
        moduleInitialized = false;
        applicationLoaded = false;
        loadedListener = [];

        Module['onRuntimeInitialized'] = function() {
            console.log("Runtime init!");
            moduleInitialized = true;
            testInitialisation();
        };

        Module['onAbort'] = message => {
            Module['onAbort'] = undefined;
            displayCriticalError("Could not load webassembly files!<br>Message: <code>" + message + "</code>");
        };

        Module['locateFile'] = file => {
            return "wasm/" + file;
        };
    }

    function testInitialisation() {
        if(moduleInitialized && applicationLoaded)
            for(let l of loadedListener)
                l();
    }
}

function load_scripts(paths: (string | string[])[]) : {path: string, promise: Promise<Boolean>}[] {
    let result = [];
    for(let path of paths)
        result.push({path: path, promise: load_script(path)});
    return result;
}

function load_script(path: string | string[]) : Promise<Boolean> {
    if(Array.isArray(path)) { //Having fallbacks
        return new Promise<Boolean>((resolve, reject) => {
            load_script(path[0]).then(resolve).catch(error => {
                if(path.length >= 2) {
                    load_script(path.slice(1)).then(resolve).catch(() => reject("could not load file " + formatPath(path)));
                } else {
                    reject("could not load file");
                }
            });
        });
    } else {
        return new Promise((resolve, reject) => {
            const tag = document.createElement("script");
            tag.type = "application/javascript";
            tag.onerror = error => {
                console.log(error);
                tag.remove();
                reject(error);
            };
            tag.onload = () => resolve();
            document.getElementById("scripts").appendChild(tag);
            tag.src = path;
        });
    }
}

function formatPath(path: string | string[]) {
    if(Array.isArray(path)) {
        let buffer = "";
        let _or = " or ";
        for(let entry of path)
            buffer += _or + formatPath(entry);
        return buffer.slice(_or.length);
    } else return "<code>" + path + "</code>";
}

function loadRelease() {
    app.type = app.Type.RELEASE;
    console.log("Load for release!");
    awaitLoad(load_scripts([
        //Load general API's
        ["wasm/TeaWeb-Identity.js"],
        ["js/client.min.js", "js/client.js"]
    ])).then(() => {
        console.log("Loaded successfully all scripts!");
        app.callbackApp();
    }).catch((error) => {
        console.error("Could not load " + error.path);
    });
}

/** Only possible for developers! **/
function loadDebug() {
    app.type = app.Type.DEBUG;
    console.log("Load for debug!");

    let custom_scripts: (string | string[])[] = [];

    if(!window.require) {
        console.log("Adding browser audio player");
        custom_scripts.push(["js/audio/AudioPlayer.js"]);
    }

    load_wait_scripts([
        ["wasm/TeaWeb-Identity.js"],

        //Load general API's
        "js/log.js",

        "js/sound/Sounds.js",

        "js/utils/modal.js",
        "js/utils/tab.js",
        "js/utils/helpers.js",

        "js/crypto/sha.js",
        "js/crypto/hex.js",

        //Load UI
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
        "js/contextMenu.js",
        "js/connection.js",
        "js/FileManager.js",
        "js/client.js",
        "js/chat.js",
        "js/Identity.js",

        ...custom_scripts
    ]).then(() => load_wait_scripts([
        "js/codec/CodecWrapperWorker.js"
    ])).then(() => load_wait_scripts([
        "js/main.js"
    ])).then(() => {
        console.log("Loaded successfully all scripts!");
        app.callbackApp();
    });
}

function awaitLoad(promises: {path: string, promise: Promise<Boolean>}[]) : Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let awaiting = promises.length;
        let success = true;

        for(let entry of promises) {
            entry.promise.then(() => {
                awaiting--;
                if(awaiting == 0) resolve();
            }).catch(error => {
                success = false;
                if(error instanceof TypeError) {
                    console.error(error);
                    let name = (error as any).fileName + "@" + (error as any).lineNumber + ":" + (error as any).columnNumber;
                    displayCriticalError("Failed to execute script <code>" + name + "</code>.<hr>If you believe that it isn't your mistake<br>then please contact an administrator!");
                    return;
                } else {
                    console.error("Failed to load script " + entry.path);
                }
                displayCriticalError("Failed to load script " + formatPath(entry.path) + ".<hr>If you believe that it isn't your mistake<br>then please contact an administrator!");
            })
        }
    });
}

function load_wait_scripts(paths: (string | string[])[]) : Promise<void> {
    return awaitLoad(load_scripts(paths));
}


function loadTemplates() {
    //Load the templates
    $.ajax("templates.html", {
        cache: false, //Change this when in release mode
    }).then((element, status) => {
        let node = document.createElement("html");
        node.innerHTML = element;
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
            if(tag.id == "tmpl_main") {
                let main_node = document.createElement("div");
                document.getElementsByTagName("body").item(0).appendChild(main_node);
                main_node.outerHTML = tag.innerHTML;
                tag.remove();
            }
            else
                root.appendChild(tag);

        }
    }).catch(error => {
        console.error("Could not load templates!");
        console.log(error);
        displayCriticalError("Could not load HTML templates!");
    });
}

interface Window {
    $: JQuery;
}

//TODO release config!
function loadSide() {
    if(window.require !== undefined) {
        console.log("Loading node specific things");
        const remote = require('electron').remote;
        module.paths.push(remote.app.getAppPath() + "/node_modules");
        module.paths.push(remote.app.getAppPath() + "/app");
        module.paths.push(remote.getGlobal("browser-root") + "js/");
        window.$ = require("assets/jquery.min.js");
        require("native/loader_adapter.js");
    }

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
        return;
    }
    //Load the general scripts and required scripts
    (window.require !== undefined ?
        Promise.resolve() :
        load_wait_scripts([
            "vendor/jquery/jquery.min.js"
        ])
    ).then(() => load_wait_scripts([
        "vendor/jsrender/jsrender.min.js"
    ])).then(() => load_wait_scripts([
        ["vendor/bbcode/xbbcode.js"],
        ["vendor/moment/moment.js"],
        ["https://webrtc.github.io/adapter/adapter-latest.js"]
    ])).then(() => {
        //Load the teaweb scripts
        load_script("js/proto.js").then(loadDebug).catch(loadRelease);
        //Load the teaweb templates
        loadTemplates();
    });
}

//FUN: loader_ignore_age=0&loader_default_duration=1500&loader_default_age=5000
function fadeoutLoader(duration = undefined, minAge = undefined, ignoreAge = undefined) {
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

    let age = Date.now() - app.appLoaded;
    if(age < minAge && !ignoreAge) {
        setTimeout(() => fadeoutLoader(duration, 0, true), minAge - age);
        return;
    }
    $(".loader .bookshelf_wrapper").animate({top: 0, opacity: 0}, duration);
    $(".loader .half").animate({width: 0}, duration, () => {
        $(".loader").detach();
    });
}

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

if(typeof Module === "undefined")
    this["Module"] = {};
app.initialize();
app.loadedListener.push(fadeoutLoader);

if(!window.displayCriticalError) { /* Declare this function here only because its required before load */
    window.displayCriticalError = function(message: string) {
        if(typeof(createErrorModal) !== 'undefined') {
            createErrorModal("A critical error occurred while loading the page!", message, {closeable: false}).open();
        } else {
            let tag = document.getElementById("critical-load");
            let detail = tag.getElementsByClassName("detail")[0];
            detail.innerHTML = message;

            tag.style.display = "block";
        }
        fadeoutLoader();
    }
}

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
loadSide();