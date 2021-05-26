export const getUrlParameter = key => {
    const match = location.search.match(new RegExp("(.*[?&]|^)" + key + "=([^&]+)($|&.*)"));
    if(!match) {
        return undefined;
    }

    return match[2];
};

export class LoadSyntaxError {
    readonly source: any;
    constructor(source: any) {
        this.source = source;
    }
}

export interface ParallelOptions {
    maxParallelRequests?: number
}

export interface ParallelResult<T> {
    succeeded: T[];
    failed: {
        request: T,
        error: any
    }[],

    skipped: T[];
}

export type LoadCallback<T> = (entry: T, state: "loading" | "loaded") => void;

export async function executeParallelLoad<T>(
    requests: T[],
    executor: (_: T) => Promise<void>,
    stringify: (_: T) => string,
    options: ParallelOptions,
    callback?: LoadCallback<T>
) : Promise<ParallelResult<T>> {
    const result: ParallelResult<T> = { failed: [], succeeded: [], skipped: [] };
    const pendingRequests = requests.slice(0).reverse(); /* we're only able to pop from the back */
    const currentRequests = {};

    if(typeof callback === "undefined") {
        callback = () => {};
    }

    const maxParallelRequests = typeof options.maxParallelRequests === "number" && options.maxParallelRequests > 0 ? options.maxParallelRequests : Number.MAX_SAFE_INTEGER;
    while (pendingRequests.length > 0) {
        while(Object.keys(currentRequests).length < maxParallelRequests) {
            const element = pendingRequests.pop();
            const name = stringify(element);

            callback(element, "loading");
            currentRequests[name] = executor(element).catch(e => result.failed.push({ request: element, error: e })).then(() => {
                delete currentRequests[name];
                callback(element, "loaded");
            });

            if(pendingRequests.length == 0) {
                break;
            }
        }

        /*
         * Wait 'till a new "slot" for downloading is free.
         * This should also not throw because any errors will be caught before.
         */
        await Promise.race(Object.keys(currentRequests).map(e => currentRequests[e]));
        if(result.failed.length > 0) {
            break; /* finish loading the other requests and than show the error */
        }
    }
    await Promise.all(Object.keys(currentRequests).map(e => currentRequests[e]));
    result.skipped.push(...pendingRequests);
    return result;
}