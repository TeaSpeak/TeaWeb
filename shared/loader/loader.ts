interface Window {
    tr(message: string) : string;
}

namespace loader {
    export namespace config {
        export const loader_groups = false;
        export const verbose = false;
        export const error = true;
    }

    export type Task = {
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

    let cache_tag: string | undefined;
    let current_stage: Stage = undefined;
    const tasks: {[key:number]:Task[]} = {};

    /* test if all files shall be load from cache or fetch again */
    function loader_cache_tag() {
        const app_version = (() => {
            const version_node = document.getElementById("app_version");
            if(!version_node) return undefined;

            const version = version_node.hasAttribute("value") ? version_node.getAttribute("value") : undefined;
            if(!version) return undefined;

            if(!version || version == "unknown" || version.replace(/0+/, "").length == 0)
                return undefined;

            return version;
        })();
        if(config.verbose) console.log("Found current app version: %o", app_version);

        if(!app_version) {
            /* TODO add warning */
            cache_tag = "?_ts=" + Date.now();
            return;
        }
        const cached_version = localStorage.getItem("cached_version");
        if(!cached_version || cached_version != app_version) {
            loader.register_task(loader.Stage.LOADED, {
                priority: 0,
                name: "cached version updater",
                function: async () => {
                    localStorage.setItem("cached_version", app_version);
                }
            });
        }
        cache_tag = "?_version=" + app_version;
    }

    export function get_cache_version() { return cache_tag; }

    export function finished() {
        return current_stage == Stage.DONE;
    }
    export function running() { return typeof(current_stage) !== "undefined"; }

    export function register_task(stage: Stage, task: Task) {
        if(current_stage > stage) {
            if(config.error)
                console.warn("Register loading task, but it had already been finished. Executing task anyways!");
            task.function().catch(error => {
                if(config.error) {
                    console.error("Failed to execute delayed loader task!");
                    console.log(" - %s: %o", task.name, error);
                }

                loader.critical_error(error);
            });
            return;
        }

        const task_array = tasks[stage] || [];
        task_array.push(task);
        tasks[stage] = task_array.sort((a, b) => a.priority - b.priority);
    }

    export async function execute() {
        document.getElementById("loader-overlay").classList.add("started");
        loader_cache_tag();

        const load_begin = Date.now();

        let begin: number = 0;
        let end: number = Date.now();
        while(current_stage <= Stage.LOADED || typeof(current_stage) === "undefined") {

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
                   if(config.verbose) console.debug("Executing loader %s (%d)", task.name, task.priority);
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

            if(promises.length > 0) {
                await Promise.all([...promises]);
            }

            if(errors.length > 0) {
               if(config.loader_groups) console.groupEnd();
               console.error("Failed to execute loader. The following tasks failed (%d):", errors.length);
               for(const error of errors)
                   console.error("  - %s: %o", error.task.name, error.error);

               throw "failed to process step " + Stage[current_stage];
            }

            if(current_tasks.length == 0) {
                if(typeof(current_stage) === "undefined") {
                    current_stage = -1;
                    if(config.verbose) console.debug("[loader] Booting app");
                } else if(current_stage < Stage.INITIALIZING) {
                    if(config.loader_groups) console.groupEnd();
                    if(config.verbose) console.debug("[loader] Entering next state (%s). Last state took %dms", Stage[current_stage + 1], (end = Date.now()) - begin);
                } else {
                    if(config.loader_groups) console.groupEnd();
                    if(config.verbose) console.debug("[loader] Finish invoke took %dms", (end = Date.now()) - begin);
                }

                begin = end;
                current_stage += 1;

                if(current_stage != Stage.DONE && config.loader_groups)
                    console.groupCollapsed("Executing loading stage %s", Stage[current_stage]);
            }
        }

        /* cleanup */
        {
            _script_promises = {};
        }
        if(config.verbose) console.debug("[loader] finished loader. (Total time: %dms)", Date.now() - load_begin);
    }
    export function execute_managed() {
        loader.execute().then(() => {
            if(config.verbose) {
                let message;
                if(typeof(window.tr) !== "undefined")
                    message = tr("App loaded successfully!");
                else
                    message = "App loaded successfully!";

                if(typeof(log) !== "undefined") {
                    /* We're having our log module */
                    log.info(LogCategory.GENERAL, message);
                } else {
                    console.log(message);
                }
            }
        }).catch(error => {
            console.error("App loading failed: %o", error);
            loader.critical_error("Failed to execute loader", "Lookup the console for more detail");
        });
    }

    export type DependSource = {
        url: string;
        depends: string[];
    }
    export type SourcePath = string | DependSource | string[];

    function script_name(path: SourcePath) {
        if(Array.isArray(path)) {
            let buffer = "";
            let _or = " or ";
            for(let entry of path)
                buffer += _or + script_name(entry);
            return buffer.slice(_or.length);
        } else if(typeof(path) === "string")
            return "<code>" + path + "</code>";
        else
            return "<code>" + path.url + "</code>";
    }

    class SyntaxError {
        source: any;

        constructor(source: any) {
            this.source = source;
        }
    }

    let _script_promises: {[key: string]: Promise<void>} = {};
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
            const source = typeof(path) === "string" ? {url: path, depends: []} : path;
            if(source.url.length == 0) return Promise.resolve();

            return _script_promises[source.url] = (async () =>  {
                /* await depends */
                for(const depend of source.depends) {
                    if(!_script_promises[depend])
                        throw "Missing dependency " + depend;
                    await _script_promises[depend];
                }

                const tag: HTMLScriptElement = document.createElement("script");

                await new Promise((resolve, reject) => {
                    let error = false;
                    const error_handler = (event: ErrorEvent) => {
                        if(event.filename == tag.src && event.message.indexOf("Illegal constructor") == -1) { //Our tag throw an uncaught error
                            if(config.verbose) console.log("msg: %o, url: %o, line: %o, col: %o, error: %o", event.message, event.filename, event.lineno, event.colno, event.error);
                            window.removeEventListener('error', error_handler as any);

                            reject(new SyntaxError(event.error));
                            event.preventDefault();
                            error = true;
                        }
                    };
                    window.addEventListener('error', error_handler as any);

                    const cleanup = () => {
                        tag.onerror = undefined;
                        tag.onload = undefined;

                        clearTimeout(timeout_handle);
                        window.removeEventListener('error', error_handler as any);
                    };
                    const timeout_handle = setTimeout(() => {
                        cleanup();
                        reject("timeout");
                    }, 5000);
                    tag.type = "application/javascript";
                    tag.async = true;
                    tag.defer = true;
                    tag.onerror = error => {
                        cleanup();
                        tag.remove();
                        reject(error);
                    };
                    tag.onload = () => {
                        cleanup();

                        if(config.verbose) console.debug("Script %o loaded", path);
                        setTimeout(resolve, 100);
                    };

                    document.getElementById("scripts").appendChild(tag);

                    tag.src = source.url + (cache_tag || "");
                });
            })();
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
            if(config.error) {
                console.error("Failed to load the following scripts:");
                for(const script of errors)
                    console.log(" - %o: %o", script.script, script.error);
            }

            loader.critical_error("Failed to load script " + script_name(errors[0].script) + " <br>" + "View the browser console for more information!");
            throw "failed to load script " + script_name(errors[0].script);
        }
    }

    export async function load_style(path: SourcePath) : Promise<void> {
        if(Array.isArray(path)) { //We have some fallback
            return load_style(path[0]).catch(error => {
                if(error instanceof SyntaxError)
                    return Promise.reject(error.source);

                if(path.length > 1)
                    return load_script(path.slice(1));

                return Promise.reject(error);
            });
        } else {
            if(!path) {
                return Promise.resolve();
            }

            return new Promise<void>((resolve, reject) =>  {
                const tag: HTMLLinkElement = document.createElement("link");

                let error = false;
                const error_handler = (event: ErrorEvent) => {
                    if(config.verbose) console.log("msg: %o, url: %o, line: %o, col: %o, error: %o", event.message, event.filename, event.lineno, event.colno, event.error);
                    if(event.filename == tag.href) { //FIXME!
                        window.removeEventListener('error', error_handler as any);

                        reject(new SyntaxError(event.error));
                        event.preventDefault();
                        error = true;
                    }
                };
                window.addEventListener('error', error_handler as any);

                tag.type = "text/css";
                tag.rel = "stylesheet";

                const cleanup = () => {
                    tag.onerror = undefined;
                    tag.onload = undefined;

                    clearTimeout(timeout_handle);
                    window.removeEventListener('error', error_handler as any);
                };

                const timeout_handle = setTimeout(() => {
                    cleanup();
                    reject("timeout");
                }, 5000);

                tag.onerror = error => {
                    cleanup();
                    tag.remove();
                    if(config.error)
                        console.error("File load error for file %s: %o", path, error);
                    reject("failed to load file " + path);
                };
                tag.onload = () => {
                    cleanup();
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

                        for(const index of rules_remove.sort((a, b) => b > a ? 1 : 0)) {
                            if(css.removeRule)
                                css.removeRule(index);
                            else
                                css.deleteRule(index);
                        }
                        for(const rule of rules_add)
                            css.insertRule(rule, rules_remove[0]);
                    }

                    if(config.verbose) console.debug("Style sheet %o loaded", path);
                    setTimeout(resolve, 100);
                };

                document.getElementById("style").appendChild(tag);
                tag.href = path + (cache_tag || "");
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
            if(loader.config.error) {
                console.error("Failed to load the following style sheet:");
                for(const sheet of errors)
                    console.log(" - %o: %o", sheet.sheet, sheet.error);
            }

            loader.critical_error("Failed to load style sheet " + script_name(errors[0].sheet) + " <br>" + "View the browser console for more information!");
            throw "failed to load style sheet " + script_name(errors[0].sheet);
        }
    }


    export type ErrorHandler = (message: string, detail: string) => void;

    let _callback_critical_error: ErrorHandler;
    let _callback_critical_called: boolean = false;

    export function critical_error(message: string, detail?: string) {
        if(_callback_critical_called) {
            console.warn("[CRITICAL] %s", message);
            if(typeof(detail) === "string")
                console.warn("[CRITICAL] %s", detail);
            return;
        }

        _callback_critical_called = true;
        if(_callback_critical_error) {
            _callback_critical_error(message, detail);
            return;
        }

        /* default handling */
        let tag = document.getElementById("critical-load");

        {
            const error_tags = tag.getElementsByClassName("error");
            error_tags[0].innerHTML = message;
        }

        if(typeof(detail) === "string") {
            let node_detail = tag.getElementsByClassName("detail")[0];
            node_detail.innerHTML = detail;
        }

        tag.classList.add("shown");
    }

    export function critical_error_handler(handler?: ErrorHandler, override?: boolean) : ErrorHandler {
        if((typeof(handler) === "object" && handler !== _callback_critical_error) || override)
            _callback_critical_error = handler;
        return _callback_critical_error;
    }
}

{

    const hello_world = () => {
        const clog = console.log;
        const print_security = () => {
            {
                const css = [
                    "display: block",
                    "text-align: center",
                    "font-size: 42px",
                    "font-weight: bold",
                    "-webkit-text-stroke: 2px black",
                    "color: red"
                ].join(";");
                clog("%c ", "font-size: 100px;");
                clog("%cSecurity warning:", css);
            }
            {
                const css = [
                    "display: block",
                    "text-align: center",
                    "font-size: 18px",
                    "font-weight: bold"
                ].join(";");

                clog("%cPasting anything in here could give attackers access to your data.", css);
                clog("%cUnless you understand exactly what you are doing, close this window and stay safe.", css);
                clog("%c ", "font-size: 100px;");
            }
        };

        /* print the hello world */
        {
            const css = [
                "display: block",
                "text-align: center",
                "font-size: 72px",
                "font-weight: bold",
                "-webkit-text-stroke: 2px black",
                "color: #18BC9C"
            ].join(";");
            clog("%cHey, hold on!", css);
        }
        {
            const css = [
                "display: block",
                "text-align: center",
                "font-size: 26px",
                "font-weight: bold"
            ].join(";");

            const css_2 = [
                "display: block",
                "text-align: center",
                "font-size: 26px",
                "font-weight: bold",
                "color: blue"
            ].join(";");

            const display_detect = /./;
            display_detect.toString = function() { print_security(); return ""; };

            clog("%cLovely to see you using and debugging the TeaSpeak Web client.", css);
            clog("%cIf you have some good ideas or already done some incredible changes,", css);
            clog("%cyou'll be may interested to share them here: %chttps://github.com/TeaSpeak/TeaWeb", css, css_2);
            clog("%c ", display_detect);
        }
    };

    try { /* lets try to print it as VM code :)*/
        let hello_world_code = hello_world.toString();
        hello_world_code = hello_world_code.substr(hello_world_code.indexOf('() => {') + 8);
        hello_world_code = hello_world_code.substring(0, hello_world_code.lastIndexOf("}"));

        //Look aheads are not possible with firefox
        //hello_world_code = hello_world_code.replace(/(?<!const|let)(?<=^([^"'/]|"[^"]*"|'[^']*'|`[^`]*`|\/[^/]*\/)*) /gm, ""); /* replace all spaces */
        hello_world_code = hello_world_code.replace(/[\n\r]/g, ""); /* replace as new lines */

        eval(hello_world_code);
    } catch(e) {
        console.error(e);
        hello_world();
    }
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


/* set a timeout here, so if this script is merged with the actual loader (like in rel mode) the actual could load this manually here */
setTimeout(() => {
    if(loader.running()) {
        if(loader.config.verbose)
            console.debug("Do not execute debug loading");
        return;
    }

    loader.register_task(loader.Stage.INITIALIZING, {
        priority: 100,
        function: async () => {
            let loader_type;
            /*
            location.search.replace(/(?:^\?|&)([a-zA-Z_]+)=([.a-zA-Z0-9]+)(?=$|&)/g, (_, key: string, value: string) => {
                if(key.toLowerCase() == "loader_target")
                    loader_type = value;
                return "";
            });
             */
            for(const node of document.head.getElementsByTagName("meta")) {
                if(node.name === "app-loader-target") {
                    loader_type = node.content;
                    if(loader_type)
                        break;
                }
            }
            loader_type = loader_type || "app";
            if(loader_type === "app") {
                try {
                    await loader.load_scripts(["loader/app.js"]);
                } catch (error) {
                    console.error("Failed to load main app script: %o", error);
                    loader.critical_error("Failed to load main app script", error);
                    throw "app loader failed";
                }
            } else if(loader_type === "certaccept") {
                try {
                    await loader.load_scripts(["loader/certaccept.js"]);
                } catch (error) {
                    console.error("Failed to load cert accept script: %o", error);
                    loader.critical_error("Failed to load cert accept script", error);
                    throw "app loader failed";
                }
            } else {
                loader.critical_error("Missing loader target: " + loader_type);
                throw "Missing loader target: " + loader_type;
            }
        },
        name: "loading target"
    });

    loader.execute_managed();
}, 0);
