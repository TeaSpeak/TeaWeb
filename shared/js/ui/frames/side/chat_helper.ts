import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
const { Remarkable } = require("remarkable");
console.error(Remarkable);

const escapeBBCode = (text: string) => text.replace(/([\[\]])/g, "\\$1");

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

    export class MD2BBCodeRenderer {
        private static renderers: {[key: string]:(renderer: MD2BBCodeRenderer, token: Remarkable.Token) => string} = {
            "text": (renderer: MD2BBCodeRenderer, token: Remarkable.TextToken) => renderer.options().process_url ? process_urls(renderer.maybe_escape_bb(token.content)) : renderer.maybe_escape_bb(token.content),
            "softbreak": () => "\n",
            "hardbreak": () => "\n",

            "paragraph_open": (renderer: MD2BBCodeRenderer, token: Remarkable.ParagraphOpenToken) => {
                const last_line = !renderer.last_paragraph || !renderer.last_paragraph.lines ? 0 : renderer.last_paragraph.lines[1];
                const lines = token.lines[0] - last_line;
                return [...new Array(lines)].map(() => "[br]").join("");
            },
            "paragraph_close": () => "",

            "strong_open": () => "[b]",
            "strong_close": () => "[/b]",

            "em_open": () => "[i]",
            "em_close": () => "[/i]",

            "del_open": () => "[s]",
            "del_close": () => "[/s]",

            "sup": (renderer: MD2BBCodeRenderer, token: Remarkable.SupToken) => "[sup]" + renderer.maybe_escape_bb(token.content) + "[/sup]",
            "sub": (renderer: MD2BBCodeRenderer, token: Remarkable.SubToken) => "[sub]" + renderer.maybe_escape_bb(token.content) + "[/sub]",

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

            "th_open": (renderer: MD2BBCodeRenderer, token: any) => "[th" + (token.align ? ("=" + token.align) : "") + "]",
            "th_close": () => "[/th]",

            "td_open": () => "[td]",
            "td_close": () => "[/td]",

            "link_open": (renderer: MD2BBCodeRenderer, token: Remarkable.LinkOpenToken) => "[url" + (token.href ? ("=" + token.href) : "") + "]",
            "link_close": () => "[/url]",

            "image": (renderer: MD2BBCodeRenderer, token: Remarkable.ImageToken) => "[img=" + (token.src) + "]" + (token.alt || token.src) + "[/img]",

            //footnote_ref

            //"content": "==Marked text==",
            //mark_open
            //mark_close

            //++Inserted text++
            "ins_open": () => "[u]",
            "ins_close": () => "[/u]",

            "code": (renderer: MD2BBCodeRenderer, token: Remarkable.CodeToken) => "[i-code]" + escapeBBCode(token.content) + "[/i-code]",
            "fence": (renderer: MD2BBCodeRenderer, token: Remarkable.FenceToken) => "[code" + (token.params ? ("=" + token.params) : "") + "]" + escapeBBCode(token.content) + "[/code]",

            "heading_open": (renderer: MD2BBCodeRenderer, token: Remarkable.HeadingOpenToken) => "[size=" + (9 - Math.min(4, token.hLevel)) + "]",
            "heading_close": () => "[/size][hr]",

            "hr": () => "[hr]",

            //> Experience real-time editing with Remarkable!
            "blockquote_open": () => "[quote]",
            "blockquote_close": () => "[/quote]"
        };

        private _options;
        last_paragraph: Remarkable.Token;

        render(tokens: Remarkable.Token[], options: Remarkable.Options, env: Remarkable.Env): string {
            this.last_paragraph = undefined;
            this._options = options;
            let result = '';

            //TODO: Escape BB-Codes
            for(let index = 0; index < tokens.length; index++) {
                if (tokens[index].type === 'inline') {
                    /* we're just ignoring the inline fact */
                    result += this.render((tokens[index] as any).children, options, env);
                } else {
                    result += this.renderToken(tokens[index], index);
                }
            }

            this._options = undefined;
            return result;
        }

        private renderToken(token: Remarkable.Token, index: number) {
            log.debug(LogCategory.GENERAL, tr("Render Markdown token: %o"), token);
            const renderer = MD2BBCodeRenderer.renderers[token.type];
            if(typeof(renderer) === "undefined") {
                log.warn(LogCategory.CHAT, tr("Missing markdown to bbcode renderer for token %s: %o"), token.type, token);
                return 'content' in token ? token.content : "";
            }

            const result = renderer(this, token);
            if(token.type === "paragraph_open")
                this.last_paragraph = token;
            return result;
        }

        options() : any {
            return this._options;
        }

        maybe_escape_bb(text: string) {
            if(this._options.escape_bb)
                return escapeBBCode(text);
            return text;
        }
    }

    const remarkableRenderer = new Remarkable("full", {
        typographer: true
    });
    remarkableRenderer.renderer = new MD2BBCodeRenderer() as any;
    remarkableRenderer.inline.ruler.disable([ 'newline', 'autolink' ]);

    function process_markdown(message: string, options: {
        process_url?: boolean,
        escape_bb?: boolean
    }) : string {

        remarkableRenderer.set({
            process_url: !!options.process_url,
            escape_bb: !!options.escape_bb
        } as any);

        let result: string = remarkableRenderer.render(message);
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
            message = escapeBBCode(message);
        return process_url ? process_urls(message) : message;
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

        function dateEqual(a: Date, b: Date) {
            return  a.getUTCFullYear() === b.getUTCFullYear() &&
                    a.getUTCMonth() === b.getUTCMonth() &&
                    a.getUTCDate() === b.getUTCDate();
        }

        export function date_format(date: Date, now: Date, ignore_settings?: boolean) : ColloquialFormat {
            if(!ignore_settings && !settings.static_global(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS))
                return ColloquialFormat.GENERAL;

            if(dateEqual(date, now))
                return ColloquialFormat.TODAY;

            date = new Date(date.getTime());
            date.setDate(date.getDate() + 1);

            if(dateEqual(date, now))
                return ColloquialFormat.YESTERDAY;

            return ColloquialFormat.GENERAL;
        }

        export function formatDayTime(date: Date) {
            return ("0" + date.getHours()).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2);
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
                    result: (format == ColloquialFormat.YESTERDAY ? tr("Yesterday at") : tr("Today at")) + " " + ("0" + hrs).substr(-2) + ":" + ("0" + date.getMinutes()).substr(-2) + " " + time,
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