import * as script_loader from "./script_loader";
import * as style_loader from "./style_loader";
import * as template_loader from "./template_loader";
import * as Animation from "../animation";

declare global {
    interface Window {
        tr(message: string) : string;
        tra(message: string, ...args: (string | number | boolean)[]) : string;
        tra(message: string, ...args: any[]) : JQuery[];

        log: any;
        StaticSettings: any;
    }

    const tr: typeof window.tr;
    const tra: typeof window.tra;
}

export interface ApplicationLoader {
    execute();
}

export interface Config {
    loader_groups: boolean;
    verbose: boolean;
    error: boolean;

    baseUrl: string;
}

export let config: Config = {
    loader_groups: false,
    verbose: false,
    error: true,
    baseUrl: "./"
};

export type Task = {
    name: string,
    priority: number, /* tasks with the same priority will be executed in sync */
    function: (taskId?: number) => Promise<void>
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
let currentStage: Stage = undefined;
const tasks: {[key:number]:Task[]} = {};

/* test if all files shall be load from cache or fetch again */
function loader_cache_tag() {
    if(__build.mode === "debug") {
        cache_tag = "?_ts=" + Date.now();
        return;
    }

    const cached_version = localStorage.getItem("cached_version");
    if(!cached_version || cached_version !== __build.version) {
        register_task(Stage.LOADED, {
            priority: 0,
            name: "cached version updater",
            function: async () => {
                localStorage.setItem("cached_version", __build.version);
            }
        });
    }
    cache_tag = "?_version=" + __build.version;
}

export type ModuleMapping = {
    application: string,
    modules: {
        "id": string,
        "context": string,
        "resource": string
    }[]
};
const module_mapping_: ModuleMapping[] = [];
export function module_mapping() : ModuleMapping[] { return module_mapping_; }

export function get_cache_version() { return cache_tag; }

export function finished() {
    return currentStage == Stage.DONE;
}
export function running() { return typeof(currentStage) !== "undefined"; }

export function register_task(stage: Stage, task: Task) {
    if(currentStage > stage) {
        if(config.error)
            console.warn("Register loading task, but it had already been finished. Executing task anyways!");

        const promise = task.function();
        if(!promise) {
            console.error("Loading task %s hasn't returned a promise!", task.name);
            return;
        }
        promise.catch(error => {
            if(config.error) {
                console.error("Failed to execute delayed loader task!");
                console.log(" - %s: %o", task.name, error);
            }

            critical_error(error);
        });
        return;
    }

    const task_array = tasks[stage] || [];
    task_array.push(task);
    tasks[stage] = task_array.sort((a, b) => a.priority - b.priority);
}

type RunningTask = {
    taskId: number,
    name: string,
    promise: Promise<void> | undefined
};
let runningTasks: RunningTask[] = [];
let runningTaskIdIndex = 1;

export function setCurrentTaskName(taskId: number, name: string) {
    const task = runningTasks.find(e => e.taskId === taskId);
    if(!task) {
        console.warn("Tried to set task name of unknown task %d", taskId);
        return;
    }

    task.name = name;
    Animation.updateState(currentStage, runningTasks.map(e => e.name));
}

export async function execute() {
    if(!await Animation.initialize())
        return;

    loader_cache_tag();

    const load_begin = Date.now();

    let begin: number = 0;
    let end: number = Date.now();
    while(currentStage <= Stage.LOADED || typeof(currentStage) === "undefined") {

        let pendingTasks: Task[] = [];
        while((tasks[currentStage] || []).length > 0) {
            if(pendingTasks.length == 0 || pendingTasks[0].priority == tasks[currentStage][0].priority) {
                pendingTasks.push(tasks[currentStage].pop());
            } else break;
        }

        const errors: {
            error: any,
            task: Task
        }[] = [];

        for(const task of pendingTasks) {
            const rTask = {
                taskId: ++runningTaskIdIndex,
                name: task.name,
                promise: undefined
            } as RunningTask;

           try {
               if(config.verbose)
                   console.debug("Executing loader %s (%d)", task.name, task.priority);

               runningTasks.push(rTask);
               const promise = task.function(rTask.taskId);
               if(!promise) {
                   runningTasks.splice(runningTasks.indexOf(rTask), 1);
                   console.error("Loading task %s hasn't returned a promise!", task.name);
                   continue;
               }

               rTask.promise = promise.catch(error => {
                   errors.push({
                       task: task,
                       error: error
                   });

                   return Promise.resolve();
               }).then(() => {
                   const index = runningTasks.indexOf(rTask);
                   if(index === -1) {
                       console.warn("Running task (%s) finished, but it has been unregistered already!", task.name);
                       return;
                   }
                   runningTasks.splice(index, 1);
               });
           } catch(error) {
               const index = runningTasks.indexOf(rTask);
               if(index !== -1)
                   runningTasks.splice(index, 1);

               errors.push({
                   task: task,
                   error: error
               });
           }
        }

        if(runningTasks.length > 0) {
            Animation.updateState(currentStage, runningTasks.map(e => e.name));
            await Promise.all(runningTasks.map(e => e.promise));
        }

        if(errors.length > 0) {
           if(config.loader_groups)
               console.groupEnd();
           console.error("Failed to execute loader. The following tasks failed (%d):", errors.length);
           for(const error of errors)
               console.error("  - %s: %o", error.task.name, error.error);

           throw "failed to process step " + Stage[currentStage];
        }

        if(pendingTasks.length == 0) {
            if(typeof(currentStage) === "undefined") {
                currentStage = -1;
                if(config.verbose) console.debug("[loader] Booting app");
            } else if(currentStage < Stage.INITIALIZING) {
                if(config.loader_groups) console.groupEnd();
                if(config.verbose) console.debug("[loader] Entering next state (%s). Last state took %dms", Stage[currentStage + 1], (end = Date.now()) - begin);
            } else {
                if(config.loader_groups) console.groupEnd();
                if(config.verbose) console.debug("[loader] Finish invoke took %dms", (end = Date.now()) - begin);
            }

            begin = end;
            currentStage += 1;

            if(currentStage != Stage.DONE && config.loader_groups)
                console.groupCollapsed("Executing loading stage %s", Stage[currentStage]);
        }
    }

    if(config.verbose)
        console.debug("[loader] finished loader. (Total time: %dms)", Date.now() - load_begin);

    Animation.finalize();
}

export function execute_managed() {
    execute().then(() => {
        if(config.verbose) {
            let message;
            if(typeof(window.tr) !== "undefined")
                message = tr("App loaded successfully!");
            else
                message = "App loaded successfully!";

            if(typeof(window.log) !== "undefined") {
                /* We're having our log module */
                window.log.info(window.log.LogCategory.GENERAL, message);
            } else {
                console.log(message);
            }
        }
    }).catch(error => {
        console.error("App loading failed: %o", error);
        critical_error("Failed to execute loader", "Lookup the console for more detail");
    });
}

/* critical error handler */
export type ErrorHandler = (message: string, detail: string) => void;
let _callback_critical_error: ErrorHandler;
let _callback_critical_called: boolean = false;
export function critical_error(message: string, detail?: string) {
    Animation.abort();

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

/* loaders */
export type DependSource = {
    url: string;
    depends: string[];
}
export type SourcePath = string | DependSource | string[];

export const scripts = script_loader;
export const style = style_loader;
export const templates = template_loader;

/* Hello World message */
{
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

        clog("%cLovely to see you using and debugging the TeaSpeak-Web client.", css);
        clog("%cIf you have some good ideas or already done some incredible changes,", css);
        clog("%cyou'll be may interested to share them here: %chttps://github.com/TeaSpeak/TeaWeb", css, css_2);
        clog("%c ", display_detect);
    }
}
