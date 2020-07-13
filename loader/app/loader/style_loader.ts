import {config, critical_error, SourcePath} from "./loader";
import {load_parallel, LoadCallback, LoadSyntaxError, ParallelOptions, script_name} from "./utils";

let _style_promises: {[key: string]: Promise<void>} = {};

function load_style_url(url: string) : Promise<void> {
    if(typeof _style_promises[url] === "object")
        return _style_promises[url];

    return (_style_promises[url] = new Promise((resolve, reject) => {
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
                console.error("File load error for file %s: %o", url, error);
            reject("failed to load file " + url);
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

            if(config.verbose) console.debug("Style sheet %o loaded", url);
            setTimeout(resolve, 100);
        };

        document.getElementById("style").appendChild(tag);
        tag.href = config.baseUrl + url;
    })).then(result => {
        /* cleanup memory */
        _style_promises[url] = Promise.resolve(); /* this promise does not holds the whole script tag and other memory */
        return _style_promises[url];
    }).catch(error => {
        /* cleanup memory */
        _style_promises[url] = Promise.reject(error); /* this promise does not holds the whole script tag and other memory */
        return _style_promises[url];
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
            if(!_style_promises[depend])
                throw "Missing dependency " + depend;
            await _style_promises[depend];
        }
        await load_style_url(source.url + (options.cache_tag || ""));
    }
}

export type MultipleOptions = Options | ParallelOptions;
export async function load_multiple(paths: SourcePath[], options: MultipleOptions, callback?: LoadCallback<SourcePath>) : Promise<void> {
    const result = await load_parallel<SourcePath>(paths, e => load(e, options), e => script_name(e, false), options, callback);
    if(result.failed.length > 0) {
        if(config.error) {
            console.error("Failed to load the following style sheets:");
            for(const style of result.failed) {
                const sname = script_name(style.request, false);
                if(style.error instanceof LoadSyntaxError) {
                    console.log(" - %s: %o", sname, style.error.source);
                } else {
                    console.log(" - %s: %o", sname, style.error);
                }
            }
        }

        critical_error("Failed to load style " + script_name(result.failed[0].request, true) + " <br>" + "View the browser console for more information!");
        throw "failed to load style " + script_name(result.failed[0].request, false);
    }
}