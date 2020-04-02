import {SourcePath} from "./loader";
import {Options} from "./script_loader";

export class LoadSyntaxError {
    readonly source: any;
    constructor(source: any) {
        this.source = source;
    }
}

export function script_name(path: SourcePath, html: boolean) {
    if(Array.isArray(path)) {
        let buffer = "";
        let _or = " or ";
        for(let entry of path)
            buffer += _or + script_name(entry, html);
        return buffer.slice(_or.length);
    } else if(typeof(path) === "string")
        return html ? "<code>" + path + "</code>" : path;
    else
        return html ? "<code>" + path.url + "</code>" : path.url;
}

export interface ParallelOptions extends Options {
    max_parallel_requests?: number
}

export interface ParallelResult<T> {
    succeeded: T[];
    failed: {
        request: T,
        error: T
    }[],

    skipped: T[];
}

export async function load_parallel<T>(requests: T[], executor: (_: T) => Promise<void>, stringify: (_: T) => string, options: ParallelOptions) : Promise<ParallelResult<T>> {
    const result: ParallelResult<T> = { failed: [], succeeded: [], skipped: [] };
    const pending_requests = requests.slice(0).reverse(); /* we're only able to pop from the back */
    const current_requests = {};

    while (pending_requests.length > 0) {
        while(typeof options.max_parallel_requests !== "number" || options.max_parallel_requests <= 0 || Object.keys(current_requests).length < options.max_parallel_requests) {
            const script = pending_requests.pop();
            const name = stringify(script);

            current_requests[name] = executor(script).catch(e => result.failed.push({ request: script, error: e })).then(() => {
                delete current_requests[name];
            });
            if(pending_requests.length == 0) break;
        }

        /*
         * Wait 'till a new "slot" for downloading is free.
         * This should also not throw because any errors will be caught before.
         */
        await Promise.race(Object.keys(current_requests).map(e => current_requests[e]));
        if(result.failed.length > 0)
            break; /* finish loading the other requests and than show the error */
    }
    await Promise.all(Object.keys(current_requests).map(e => current_requests[e]));
    result.skipped.push(...pending_requests);
    return result;
}