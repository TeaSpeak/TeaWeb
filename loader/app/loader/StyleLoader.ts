import {config, critical_error, loaderPerformance, SourcePath} from "./loader";
import {executeParallelLoad, LoadCallback, LoadSyntaxError, ParallelOptions} from "./Utils";

export function loadStyle(path: SourcePath) : Promise<void> {
    const givenTimeout = 120 * 1000;

    const resourceRequest = loaderPerformance.logResourceRequest("script", path);
    resourceRequest.markEnqueue();

    return new Promise((resolve, reject) => {
        const linkTag = document.createElement("link");

        linkTag.type = "text/css";
        linkTag.rel = "stylesheet";
        linkTag.href = config.baseUrl + path;

        const cleanup = () => {
            linkTag.onerror = undefined;
            linkTag.onload = undefined;

            clearTimeout(timeoutHandle);
        };

        const errorCleanup = () => {
            linkTag.remove();
            cleanup();
        };

        const timeoutHandle = setTimeout(() => {
            resourceRequest.markExecuted({ status: "timeout", givenTimeout: givenTimeout });
            cleanup();
            reject("timeout");
        }, givenTimeout);

        /* TODO: Test if on syntax error the parameters contain extra info */
        linkTag.onerror = () => {
            resourceRequest.markExecuted({ status: "error-event" });
            errorCleanup();
            reject();
        };

        linkTag.onload = () => {
            resourceRequest.markExecuted({ status: "success" });
            cleanup();
            resolve();
        };

        document.head.appendChild(linkTag);
        resourceRequest.markExecuting();
    });
}

export type MultipleOptions = ParallelOptions;
export async function loadStyles(paths: SourcePath[], options: MultipleOptions, callback?: LoadCallback<SourcePath>) : Promise<void> {
    const result = await executeParallelLoad<SourcePath>(paths, e => loadStyle(e), e => e, options, callback);
    if(result.failed.length > 0) {
        if(config.error) {
            console.error("Failed to load the following style sheets:");
            for(const style of result.failed) {
                const sname = style.request;
                if(style.error instanceof LoadSyntaxError) {
                    console.log(" - %s: %o", sname, style.error.source);
                } else {
                    console.log(" - %s: %o", sname, style.error);
                }
            }
        }

        critical_error("Failed to load style <code>" + result.failed[0].request + "</code><br>" + "View the browser console for more information!");
        throw "failed to load style " + result.failed[0].request;
    }
}