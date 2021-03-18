import {config, critical_error, loaderPerformance, SourcePath} from "./loader";
import {executeParallelLoad, LoadCallback, LoadSyntaxError, ParallelOptions} from "./Utils";

export function loadScript(url: SourcePath) : Promise<void> {
    const givenTimeout = 120 * 1000;

    const resourceRequest = loaderPerformance.logResourceRequest("script", url);
    resourceRequest.markEnqueue();

    return new Promise((resolve, reject) => {
        const scriptTag = document.createElement("script");
        scriptTag.type = "application/javascript";
        scriptTag.async = true;
        scriptTag.defer = true;

        const cleanup = () => {
            scriptTag.onerror = undefined;
            scriptTag.onload = undefined;

            clearTimeout(timeoutHandle);
        };

        const timeoutHandle = setTimeout(() => {
            resourceRequest.markExecuted({ status: "timeout", givenTimeout: givenTimeout });
            cleanup();
            reject("timeout");
        }, givenTimeout);

        /* TODO: Test if on syntax error the parameters contain extra info */
        scriptTag.onerror = () => {
            resourceRequest.markExecuted({ status: "error-event" });
            scriptTag.remove();
            cleanup();
            reject();
        };

        scriptTag.onload = () => {
            resourceRequest.markExecuted({ status: "success" });
            cleanup();
            resolve();
        };

        scriptTag.onloadstart = () => {
        }

        scriptTag.src = config.baseUrl + url;
        document.getElementById("scripts").appendChild(scriptTag);
        resourceRequest.markExecuting();
    });
}

type MultipleOptions = ParallelOptions;
export async function loadScripts(paths: SourcePath[], options: MultipleOptions, callback?: LoadCallback<SourcePath>) : Promise<void> {
    const result = await executeParallelLoad<SourcePath>(paths, e => loadScript(e), e => e, options, callback);
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