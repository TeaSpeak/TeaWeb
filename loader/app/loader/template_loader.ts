import {config, critical_error, SourcePath} from "./loader";
import {load_parallel, LoadSyntaxError, ParallelOptions, script_name} from "./utils";

let _template_promises: {[key: string]: Promise<void>} = {};

function load_template_url(url: string) : Promise<void> {
    if(typeof _template_promises[url] === "object")
        return _template_promises[url];

    return (_template_promises[url] = (async () => {
        const response = await $.ajax(config.baseUrl + url);

        let node = document.createElement("html");
        node.innerHTML = response;
        let tags: HTMLCollection;
        if(node.getElementsByTagName("body").length > 0)
            tags = node.getElementsByTagName("body")[0].children;
        else
            tags = node.children;

        let root = document.getElementById("templates");
        if(!root) {
            critical_error("Failed to find template tag!");
            throw "Failed to find template tag";
        }
        while(tags.length > 0){
            let tag = tags.item(0);
            root.appendChild(tag);

        }
    })()).then(result => {
        /* cleanup memory */
        _template_promises[url] = Promise.resolve(); /* this promise does not holds the whole script tag and other memory */
        return _template_promises[url];
    }).catch(error => {
        /* cleanup memory */
        _template_promises[url] = Promise.reject(error); /* this promise does not holds the whole script tag and other memory */
        return _template_promises[url];
    });
}

export interface Options {
    cache_tag?: string;
}

export async function load(path: SourcePath, options: Options) : Promise<void> {
    if(Array.isArray(path)) { //We have fallback scripts
        return load(path[0], options).catch(error => {
            if(error instanceof LoadSyntaxError)
                return Promise.reject(error);

            if(path.length > 1)
                return load(path.slice(1), options);

            return Promise.reject(error);
        });
    } else {
        const source = typeof(path) === "string" ? {url: path, depends: []} : path;
        if(source.url.length == 0) return Promise.resolve();

        /* await depends */
        for(const depend of source.depends) {
            if(!_template_promises[depend])
                throw "Missing dependency " + depend;
            await _template_promises[depend];
        }
        await load_template_url(source.url + (options.cache_tag || ""));
    }
}

export type MultipleOptions = Options | ParallelOptions;
export async function load_multiple(paths: SourcePath[], options: MultipleOptions) : Promise<void> {
    const result = await load_parallel<SourcePath>(paths, e => load(e, options), e => script_name(e, false), options);
    if(result.failed.length > 0) {
        if(config.error) {
            console.error("Failed to load the following template files:");
            for(const style of result.failed) {
                const sname = script_name(style.request, false);
                if(style.error instanceof LoadSyntaxError) {
                    console.log(" - %s: %o", sname, style.error.source);
                } else {
                    console.log(" - %s: %o", sname, style.error);
                }
            }
        }

        critical_error("Failed to load template file " + script_name(result.failed[0].request, true) + " <br>" + "View the browser console for more information!");
        throw "failed to load template file " + script_name(result.failed[0].request, false);
    }
}