import {config, critical_error, SourcePath} from "./loader";
import {executeParallelLoad, LoadCallback, LoadSyntaxError, ParallelOptions} from "./Utils";

let _script_promises: {[key: string]: Promise<void>} = {};

function load_script_url(url: string) : Promise<void> {
    if(typeof _script_promises[url] === "object") {
        return _script_promises[url];
    }

    return (_script_promises[url] = new Promise((resolve, reject) => {
        const script_tag: HTMLScriptElement = document.createElement("script");

        let error = false;
        const error_handler = (event: ErrorEvent) => {
            if(event.filename == script_tag.src && event.message.indexOf("Illegal constructor") == -1) { //Our tag throw an uncaught error
                if(config.verbose) console.log("msg: %o, url: %o, line: %o, col: %o, error: %o", event.message, event.filename, event.lineno, event.colno, event.error);
                window.removeEventListener('error', error_handler as any);

                reject(new LoadSyntaxError(event.error));
                event.preventDefault();
                error = true;
            }
        };
        window.addEventListener('error', error_handler as any);

        const cleanup = () => {
            script_tag.onerror = undefined;
            script_tag.onload = undefined;

            clearTimeout(timeout_handle);
            window.removeEventListener('error', error_handler as any);
        };
        const timeout_handle = setTimeout(() => {
            cleanup();
            reject("timeout");
        }, 120 * 1000);
        script_tag.type = "application/javascript";
        script_tag.async = true;
        script_tag.defer = true;
        script_tag.onerror = error => {
            cleanup();
            script_tag.remove();
            reject(error);
        };
        script_tag.onload = () => {
            cleanup();

            if(config.verbose) console.debug("Script %o loaded", url);
            setTimeout(resolve, 100);
        };

        document.getElementById("scripts").appendChild(script_tag);

        script_tag.src = config.baseUrl + url;
    })).then(() => {
        /* cleanup memory */
        _script_promises[url] = Promise.resolve(); /* this promise does not holds the whole script tag and other memory */
        return _script_promises[url];
    }).catch(error => {
        /* cleanup memory */
        _script_promises[url] = Promise.reject(error); /* this promise does not holds the whole script tag and other memory */
        return _script_promises[url];
    });
}

export interface Options {
    cache_tag?: string;
}

export async function loadScript(path: SourcePath, options: Options) : Promise<void> {
    await load_script_url(path + (options.cache_tag || ""));
}

type MultipleOptions = Options | ParallelOptions;
export async function loadScripts(paths: SourcePath[], options: MultipleOptions, callback?: LoadCallback<SourcePath>) : Promise<void> {
    const result = await executeParallelLoad<SourcePath>(paths, e => loadScript(e, options), e => e, options, callback);
    if(result.failed.length > 0) {
        if(config.error) {
            console.error("Failed to load the following scripts:");
            for(const script of result.failed) {
                const sname = script.request;
                if(script.error instanceof LoadSyntaxError) {
                    const source = script.error.source as Error;
                    if(source.name === "TypeError") {
                        let prefix = "";
                        while(prefix.length < sname.length + 7) prefix += " ";
                        console.log(" - %s: %s:\n%s", sname, source.message, source.stack.split("\n").map(e => prefix + e.trim()).slice(1).join("\n"));
                    } else if(typeof source === "string") {
                        console.log(" - %s: %s", sname, source);
                    } else {
                        console.log(" - %s: %o", sname, source);
                    }
                } else {
                    console.log(" - %s: %o", sname, script.error);
                }
            }
        }

        let errorMessage;
        {
            const error = result.failed[0].error;
            if(error instanceof LoadSyntaxError) {
                errorMessage = error.source.message;
            } else if(typeof error === "string") {
                errorMessage = error;
            } else {
                console.error("Script %s loading error: %o", result.failed[0].request, error);
                errorMessage = "View the browser console for more information!";
            }
            critical_error("Failed to load script " + result.failed[0].request, errorMessage);
        }
        throw "failed to load script " + result.failed[0].request + " (" + errorMessage + ")";
    }
}