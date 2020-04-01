export interface Config {
    loader_groups: boolean;
    verbose: boolean;
    error: boolean;
}

export enum BackendType {
    WEB,
    NATIVE
}

export interface AppVersion {
    ui: string;
    backend: string;

    type: "web" | "native";
    debug_mode: boolean;
}

export let config: Config;

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

export type ModuleMapping = {
    application: string,
    modules: {
        "id": string,
        "context": string,
        "resource": string
    }[]
};
export function module_mapping() : ModuleMapping;

export function finished();
export function running();
export function register_task(stage: Stage, task: Task);
export function execute() : Promise<void>;
export function execute_managed();
export type DependSource = {
    url: string;
    depends: string[];
}
export type SourcePath = string | DependSource | string[];
export type ErrorHandler = (message: string, detail: string) => void;
export function critical_error(message: string, detail?: string);
export function critical_error_handler(handler?: ErrorHandler, override?: boolean);
export function hide_overlay();