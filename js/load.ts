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
            displayCriticalError("Could not load webassembly files!<br>Message: <code>" + message + "</code>", false);
        };

        Module['locateFile'] = file => {
            console.log(file + "|" + type);
            switch (type) {
                case Type.RELEASE:
                    return "js/assembly/" + file;
                case Type.DEBUG:
                    return "asm/generated/" + file;
            }
        };
    }

    function testInitialisation() {
        if(moduleInitialized && applicationLoaded)
            for(let l of loadedListener)
                l();
    }
}
if(typeof Module === "undefined")
    this["Module"] = {};
app.initialize();


function loadScripts(paths: (string | string[])[]) : {path: string, promise: Promise<Boolean>}[] {
    let result = [];
    for(let path of paths)
        result.push({path: path, promise: loadScript(path)});
    return result;
}

function loadScript(path: string | string[]) : Promise<Boolean> {
    if(Array.isArray(path)) { //Having fallbacks
        return new Promise<Boolean>((resolve, reject) => {
            loadScript(path[0]).then(resolve).catch(error => {
                if(path.length >= 2) {
                    loadScript(path.slice(1)).then(resolve).catch(() => reject("could not load file " + formatPath(path)));
                } else {
                    reject("could not load file (event fallback's)");
                }
            });
        });
    } else {
        return new Promise<Boolean>((resolve, reject) => {
            const tag = document.createElement("script");
            tag.type = "text\/javascript";
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
    awaitLoad(loadScripts([
        //Load general API's
        ["js/assembly/TeaWeb-Identity.js"],
        ["js/client.min.js", "js/client.js", "generated/js/client.min.js", "generated/js/client.js"]
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

    awaitLoad(loadScripts([
        ["asm/generated/TeaWeb-Identity.js"],

        //Load general API's
        "js/log.js",

        "js/utils/modal.js",
        "js/utils/tab.js",
        "js/utils/helpers.js",

        "js/crypto/sha.js",
        "js/crypto/hex.js",

        //Load UI
        "js/ui/modal/ModalConnect.js",
        "js/ui/modal/ModalSettings.js",
        "js/ui/modal/ModalCreateChannel.js",
        "js/ui/modal/ModalConnect.js",
        "js/ui/modal/ModalChangeVolume.js",
        "js/ui/channel.js",
        "js/ui/client.js",
        "js/ui/server.js",
        "js/ui/view.js",
        "js/ui/ControlBar.js",

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
        "js/codec/CodecWrapper.js",

        //Load general stuff
        "js/settings.js",
        "js/contextMenu.js",
        "js/connection.js",
        "js/FileManager.js",
        "js/client.js",
        "js/chat.js",
        "js/InfoBar.js",
        "js/Identity.js"
    ])).then(() => {
        awaitLoad(loadScripts(["js/main.js"])).then(() => {
            console.log("Loaded successfully all scripts!");
            app.callbackApp();
        });
    });
}

function awaitLoad(promises: {path: string, promise: Promise<Boolean>}[]) : Promise<Boolean> {
    return new Promise<Boolean>((resolve, reject) => {
        let awaiting = promises.length;
        for(let entry of promises) {
            entry.promise.then(() => {
                awaiting--;
                if(awaiting == 0) resolve();
            }).catch(error => {
                if(error instanceof TypeError) {
                    console.error(error);
                    let name = (error as any).fileName + "@" + (error as any).lineNumber + ":" + (error as any).columnNumber;
                    displayCriticalError("Failed to execute script <code>" + name + "</code>.<hr>If you believe that it isn't you're mistake<br>then please contact an administrator!", false);
                    return;
                } else {
                    console.error("Failed to load script " + entry.path);
                }
                displayCriticalError("Failed to load script " + formatPath(entry.path) + ".<hr>If you believe that it isn't you're mistake<br>then please contact an administrator!", false);
            })
        }
    });
}

function displayCriticalError(message: string, closeable: boolean = true) {
    if(typeof(createErrorModal) !== 'undefined') {
        createErrorModal("A critical error occurred while loading the page!", message, {closeable: closeable}).open();
    } else {
        let tag = document.getElementById("critical-load");
        let detail = tag.getElementsByClassName("detail")[0];
        detail.innerHTML = message;

        tag.style.display = "block";
    }
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
        while(tags.length > 0)
            root.appendChild(tags.item(0));
    }).catch(error => {
        console.error("Could not load templates!");
        console.log(error);
        displayCriticalError("Could not load HTML templates!", false);
    });
}

//TODO release config!
function loadSide() {
    //Load the general scripts and required scripts
    awaitLoad(loadScripts([
        ["vendor/jquery/jquery.min.js", /*"https://code.jquery.com/jquery-latest.min.js"*/],
        ["https://webrtc.github.io/adapter/adapter-latest.js"]
    ])).then(() => awaitLoad(loadScripts([
        ["https://ajax.microsoft.com/ajax/jquery.templates/beta1/jquery.tmpl.min.js"]
    ]))).then(() => {
        //Load the teaweb scripts
        loadScript("js/proto.js").then(loadDebug).catch(loadRelease);
        //Load the teaweb templates
        loadTemplates();
    });
}

loadSide();