import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";

declare const xbbcode;
export namespace helpers {
    //https://regex101.com/r/YQbfcX/2
    //static readonly URL_REGEX = /^(?<hostname>([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/(?<path>(?:[^\s?]+)?)(?:\?(?<query>\S+))?)?$/gm;
    const URL_REGEX = /^(([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/((?:[^\s?]+)?)(?:\?(\S+))?)?$/gm;
    function process_urls(message: string) : string {
        const words = message.split(/[ \n]/);
        for(let index = 0; index < words.length; index++) {
            const flag_escaped = words[index].startsWith('!');
            const unescaped = flag_escaped ? words[index].substr(1) : words[index];

            _try:
                try {
                    const url = new URL(unescaped);
                    log.debug(LogCategory.GENERAL, tr("Chat message contains URL: %o"), url);
                    if(url.protocol !== 'http:' && url.protocol !== 'https:')
                        break _try;
                    if(flag_escaped) {
                        message = undefined;
                        words[index] = unescaped;
                    } else {
                        message = undefined;
                        words[index] = "[url=" + url.toString() + "]" + url.toString() + "[/url]";
                    }
                } catch(e) { /* word isn't an url */ }

            if(unescaped.match(URL_REGEX)) {
                if(flag_escaped) {
                    message = undefined;
                    words[index] = unescaped;
                } else {
                    message = undefined;
                    words[index] = "[url=" + unescaped + "]" + unescaped + "[/url]";
                }
            }
        }

        return message || words.join(" ");
    }

    namespace md2bbc {
        export type RemarkToken = {
            type: string;
            tight: boolean;
            lines: number[];
            level: number;

            /* img */
            alt?: string;
            src?: string;

            /* link */
            href?: string;

            /* table */
            align?: string;

            /* code  */
            params?: string;

            content?: string;
            hLevel?: number;
            children?: RemarkToken[];
        }

        export class Renderer {
            private static renderers = {
                "text": (renderer: Renderer, token: RemarkToken) => renderer.options().process_url ? process_urls(renderer.maybe_escape_bb(token.content)) : renderer.maybe_escape_bb(token.content),
                "softbreak": () => "\n",
                "hardbreak": () => "\n",

                "paragraph_open": (renderer: Renderer, token: RemarkToken) => {
                    const last_line = !renderer.last_paragraph || !renderer.last_paragraph.lines ? 0 : renderer.last_paragraph.lines[1];
                    const lines = token.lines[0] - last_line;
                    return [...new Array(lines)].map(e => "[br]").join("");
                },
                "paragraph_close": () => "",

                "strong_open": (renderer: Renderer, token: RemarkToken) => "[b]",
                "strong_close": (renderer: Renderer, token: RemarkToken) => "[/b]",

                "em_open": (renderer: Renderer, token: RemarkToken) => "[i]",
                "em_close": (renderer: Renderer, token: RemarkToken) => "[/i]",

                "del_open": () => "[s]",
                "del_close": () => "[/s]",

                "sup": (renderer: Renderer, token: RemarkToken) => "[sup]" + renderer.maybe_escape_bb(token.content) + "[/sup]",
                "sub": (renderer: Renderer, token: RemarkToken) => "[sub]" + renderer.maybe_escape_bb(token.content) + "[/sub]",

                "bullet_list_open": () => "[ul]",
                "bullet_list_close": () => "[/ul]",

                "ordered_list_open": () => "[ol]",
                "ordered_list_close": () => "[/ol]",

                "list_item_open": () => "[li]",
                "list_item_close": () => "[/li]",

                "table_open": () => "[table]",
                "table_close": () => "[/table]",

                "thead_open": () => "",
                "thead_close": () => "",

                "tbody_open": () => "",
                "tbody_close": () => "",

                "tr_open": () => "[tr]",
                "tr_close": () => "[/tr]",

                "th_open": (renderer: Renderer, token: RemarkToken) => "[th" + (token.align ? ("=" + token.align) : "") + "]",
                "th_close": () => "[/th]",

                "td_open": () => "[td]",
                "td_close": () => "[/td]",

                "link_open": (renderer: Renderer, token: RemarkToken) => "[url" + (token.href ? ("=" + token.href) : "") + "]",
                "link_close": () => "[/url]",

                "image": (renderer: Renderer, token: RemarkToken) => "[img=" + (token.src) + "]" + (token.alt || token.src) + "[/img]",

                //footnote_ref

                //"content": "==Marked text==",
                //mark_open
                //mark_close

                //++Inserted text++
                "ins_open": () => "[u]",
                "ins_close": () => "[/u]",

                /*
```
test
[/code]
test
```
                 */

                "code": (renderer: Renderer, token: RemarkToken) => "[i-code]" + xbbcode.escape(token.content) + "[/i-code]",
                "fence": (renderer: Renderer, token: RemarkToken) => "[code" + (token.params ? ("=" + token.params) : "") + "]" + xbbcode.escape(token.content) + "[/code]",

                "heading_open": (renderer: Renderer, token: RemarkToken) => "[size=" + (9 - Math.min(4, token.hLevel)) + "]",
                "heading_close": (renderer: Renderer, token: RemarkToken) => "[/size][hr]",

                "hr": () => "[hr]",

                //> Experience real-time editing with Remarkable!
                //blockquote_open,
                //blockquote_close
            };

            private _options;
            last_paragraph: RemarkToken;

            render(tokens: RemarkToken[], options: any, env: any) {
                this.last_paragraph = undefined;
                this._options = options;
                let result = '';

                //TODO: Escape BB-Codes
                for(let index = 0; index < tokens.length; index++) {
                    if (tokens[index].type === 'inline') {
                        result += this.render_inline(tokens[index].children, index);
                    } else {
                        result += this.render_token(tokens[index], index);
                    }
                }

                this._options = undefined;
                return result;
            }

            private render_token(token: RemarkToken, index: number) {
                log.debug(LogCategory.GENERAL, tr("Render Markdown token: %o"), token);
                const renderer = Renderer.renderers[token.type];
                if(typeof(renderer) === "undefined") {
                    log.warn(LogCategory.CHAT, tr("Missing markdown to bbcode renderer for token %s: %o"), token.type, token);
                    return token.content || "";
                }

                const result = renderer(this, token, index);
                if(token.type === "paragraph_open") this.last_paragraph = token;
                return result;
            }

            private render_inline(tokens: RemarkToken[], index: number) {
                let result = '';

                for(let index = 0; index < tokens.length; index++) {
                    result += this.render_token(tokens[index], index);
                }

                return result;
            }

            options() : any {
                return this._options;
            }

            maybe_escape_bb(text: string) {
                if(this._options.escape_bb)
                    return xbbcode.escape(text);
                return text;
            }
        }
    }

    let _renderer: any;
    function process_markdown(message: string, options: {
        process_url?: boolean,
        escape_bb?: boolean
    }) : string {
        if(typeof(window.remarkable) === "undefined")
            return (options.process_url ? process_urls(message) : message);

        if(!_renderer) {
            _renderer = new window.remarkable.Remarkable('full');
            _renderer.set({
                typographer: true
            });
            _renderer.renderer = new md2bbc.Renderer();
            _renderer.inline.ruler.disable([ 'newline', 'autolink' ]);
        }
        _renderer.set({
            process_url: !!options.process_url,
            escape_bb: !!options.escape_bb
        });
        let result: string = _renderer.render(message);
        if(result.endsWith("\n"))
            result = result.substr(0, result.length - 1);
        return result;
    }

    export function preprocess_chat_message(message: string) : string {
        const process_url = settings.static_global(Settings.KEY_CHAT_TAG_URLS);
        const parse_markdown = settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN);
        const escape_bb = !settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE);

        if(parse_markdown)
            return process_markdown(message, {
                process_url: process_url,
                escape_bb: escape_bb
            });

        if(escape_bb)
            message = xbbcode.escape(message);
        return process_url ? process_urls(message) : message;
    }

    export namespace history {
        let _local_cache: Cache;

        async function get_cache() {
            if(_local_cache)
                return _local_cache;

            if(!('caches' in window))
                throw "missing cache extension!";

            return (_local_cache = await caches.open('chat_history'));
        }

        export async function load_history(key: string) : Promise<any | undefined> {
            const cache = await get_cache();
            const request = new Request("https://_local_cache/cache_request_" + key);
            const cached_response = await cache.match(request);
            if(!cached_response)
                return undefined;

            return await cached_response.json();
        }

        export async function save_history(key: string, value: any) {
            const cache = await get_cache();
            const request = new Request("https://_local_cache/cache_request_" + key);
            const data = JSON.stringify(value);

            const new_headers = new Headers();
            new_headers.set("Content-type", "application/json");
            new_headers.set("Content-length", data.length.toString());


            await cache.put(request, new Response(data, {
                headers: new_headers
            }));
        }
    }

    export namespace date {
        export function same_day(a: number | Date, b: number | Date) {
            a = a instanceof Date ? a : new Date(a);
            b = b instanceof Date ? b : new Date(b);

            if(a.getDate() !== b.getDate())
                return false;
            if(a.getMonth() !== b.getMonth())
                return false;
            return a.getFullYear() === b.getFullYear();
        }
    }
}

export namespace format {
    export namespace date {
        export enum ColloquialFormat {
            YESTERDAY,
            TODAY,
            GENERAL
        }

        export function date_format(date: Date, now: Date, ignore_settings?: boolean) : ColloquialFormat {
            if(!ignore_settings && !settings.static_global(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS))
                return ColloquialFormat.GENERAL;

            let delta_day = now.getDate() - date.getDate();
            if(delta_day < 1)   /* month change? */
                delta_day = date.getDate() - now.getDate();
            if(delta_day == 0)
                return ColloquialFormat.TODAY;
            else if(delta_day == 1)
                return ColloquialFormat.YESTERDAY;
            return ColloquialFormat.GENERAL;
        }

        export function format_date_general(date: Date, hours?: boolean) : string {
            return ('00' + date.getDate()).substr(-2) + "."
                + ('00' + date.getMonth()).substr(-2) + "."
                + date.getFullYear() +
                (typeof(hours) === "undefined" || hours ? " at "
                    + ('00' + date.getHours()).substr(-2) + ":"
                    + ('00' + date.getMinutes()).substr(-2)
                    : "");
        }

        export function format_date_colloquial(date: Date, current_timestamp: Date) : { result: string; format: ColloquialFormat } {
            const format = date_format(date, current_timestamp);
            if(format == ColloquialFormat.GENERAL) {
                return {
                    result: format_date_general(date),
                    format: format
                };
            } else {
                let hrs = date.getHours();
                let time = "AM";
                if(hrs > 12) {
                    hrs -= 12;
                    time = "PM";
                }
                return {
                    result: (format == ColloquialFormat.YESTERDAY ? tr("Yesterday at") : tr("Today at")) + " " + hrs + ":" + date.getMinutes() + " " + time,
                    format: format
                };
            }
        }

        export function format_chat_time(date: Date) : {
            result: string,
            next_update: number /* in MS */
        } {
            const timestamp = date.getTime();
            const current_timestamp = new Date();

            const result = {
                result: "",
                next_update: 0
            };

            if(settings.static_global(Settings.KEY_CHAT_FIXED_TIMESTAMPS)) {
                const format = format_date_colloquial(date, current_timestamp);
                result.result = format.result;
                result.next_update = 0; /* TODO: Update on day change? */
            } else {
                const delta = current_timestamp.getTime() - timestamp;
                if(delta < 2000) {
                    result.result = "now";
                    result.next_update = 2500 - delta; /* update after two seconds */
                } else if(delta < 30000) { /* 30 seconds */
                    result.result = Math.floor(delta / 1000) + " " + tr("seconds ago");
                    result.next_update = 1000; /* update every second */
                } else if(delta < 30 * 60 * 1000) { /* 30 minutes */
                    if(delta < 120 * 1000)
                        result.result = tr("one minute ago");
                    else
                        result.result = Math.floor(delta / (1000 * 60)) + " " + tr("minutes ago");
                    result.next_update = 60000; /* updater after a minute */
                } else {
                    result.result = format_date_colloquial(date, current_timestamp).result;
                    result.next_update = 0; /* TODO: Update on day change? */
                }
            }

            return result;
        }
    }
    export namespace time {
        export function format_online_time(secs: number) : string {
            let years   = Math.floor(secs  / (60 * 60 * 24 * 365));
            let days    = Math.floor(secs  / (60 * 60 * 24)) % 365;
            let hours   = Math.floor(secs / (60 * 60)) % 24;
            let minutes = Math.floor(secs / 60) % 60;
            let seconds = Math.floor(secs % 60);

            let result = "";
            if(years > 0)
                result += years + " " + tr("years") + " ";
            if(years > 0 || days > 0)
                result += days + " " + tr("days") + " ";
            if(years > 0 || days > 0 || hours > 0)
                result += hours + " " + tr("hours") + " ";
            if(years > 0 || days > 0 || hours > 0 || minutes > 0)
                result += minutes + " " + tr("minutes") + " ";
            if(years > 0 || days > 0 || hours > 0 || minutes > 0 || seconds > 0)
                result += seconds + " " + tr("seconds") + " ";
            else
                result = tr("now") + " ";

            return result.substr(0, result.length - 1);
        }
    }
}