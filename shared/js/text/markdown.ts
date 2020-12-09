import * as log from "../log";
import {LogCategory, logTrace} from "../log";
import {
    CodeToken,
    Env,
    FenceToken,
    HeadingOpenToken,
    ImageToken,
    LinkOpenToken,
    Options,
    ParagraphCloseToken,
    SubToken,
    SupToken,
    TextToken,
    Token
} from "remarkable/lib";
import {tr} from "tc-shared/i18n/localize";

const { Remarkable } = require("remarkable");

export class MD2BBCodeRenderer {
    private static renderers: {[key: string]:(renderer: MD2BBCodeRenderer, token: Token) => string} = {
        "text": (renderer: MD2BBCodeRenderer, token: TextToken) => {
            renderer.currentLineCount += token.content.split("\n").length;
            return renderer.options().textProcessor(token.content);
        },
        "softbreak": () => "\n",
        "hardbreak": () => "\n",

        "paragraph_open": () => "",
        "paragraph_close": (_, token: ParagraphCloseToken) => token.tight ? "" : "\n",

        "strong_open": () => "[b]",
        "strong_close": () => "[/b]",

        "em_open": () => "[i]",
        "em_close": () => "[/i]",

        "del_open": () => "[s]",
        "del_close": () => "[/s]",

        "sup": (renderer: MD2BBCodeRenderer, token: SupToken) => "[sup]" + renderer.options().textProcessor(token.content) + "[/sup]",
        "sub": (renderer: MD2BBCodeRenderer, token: SubToken) => "[sub]" + renderer.options().textProcessor(token.content) + "[/sub]",

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

        "link_open": (renderer: MD2BBCodeRenderer, token: LinkOpenToken) => "[url" + (token.href ? ("=" + token.href) : "") + "]",
        "link_close": () => "[/url]",

        "image": (renderer: MD2BBCodeRenderer, token: ImageToken) => {
            renderer.currentLineCount += 1;
            return "[img=" + (token.src) + "]" + (token.alt || token.src) + "[/img]";
        },

        //footnote_ref

        //"content": "==Marked text==",
        //mark_open
        //mark_close

        //++Inserted text++
        "ins_open": () => "[u]",
        "ins_close": () => "[/u]",

        //[code]teaspeak.de[/code]
        "code": (renderer: MD2BBCodeRenderer, token: CodeToken) => "[i-code]" + token.content + "[/i-code]",
        "fence": (renderer: MD2BBCodeRenderer, token: FenceToken) => "[code" + (token.params ? ("=" + token.params) : "") + "]" + token.content + "[/code]",

        "heading_open": (renderer: MD2BBCodeRenderer, token: HeadingOpenToken) => "[size=" + (9 - Math.min(4, token.hLevel)) + "]",
        "heading_close": () => "[/size][hr]",

        "hr": () => "[hr]",

        //> Experience real-time editing with Remarkable!
        "blockquote_open": () => "[quote]",
        "blockquote_close": () => "[/quote]"
    };

    private _options;
    currentLineCount: number;

    reset() {
        this._options = undefined;
        this.currentLineCount = 0;
    }

    render(tokens: Token[], options: Options, env: Env): string {
        this._options = options;

        let result = '';

        for(let index = 0; index < tokens.length; index++) {
            if(tokens[index].lines?.length) {
                while(this.currentLineCount < tokens[index].lines[0]) {
                    this.currentLineCount += 1;
                    result += "\n";
                }
            }

            if (tokens[index].type === 'inline') {
                /* we're just ignoring the inline fact */
                result += this.render((tokens[index] as any).children, options, env);
            } else {
                result += this.renderToken(tokens[index]);
            }
        }

        this._options = undefined;
        return result;
    }

    private renderToken(token: Token) {
        log.debug(LogCategory.GENERAL, tr("Render Markdown token: %o"), token);
        const renderer = MD2BBCodeRenderer.renderers[token.type];
        if(typeof(renderer) === "undefined") {
            log.warn(LogCategory.CHAT, tr("Missing markdown to bbcode renderer for token %s: %o"), token.type, token);
            return 'content' in token ? this.options().textProcessor(token.content) : "";
        }

        return renderer(this, token);
    }

    options() : any {
        return this._options;
    }
}

const md2bbCodeRenderer = new MD2BBCodeRenderer();
const remarkableRenderer = new Remarkable("full", {
    typographer: true
});
remarkableRenderer.renderer = md2bbCodeRenderer as any;
remarkableRenderer.inline.ruler.disable([ 'newline', 'autolink' ]);

export function renderMarkdownAsBBCode(message: string, textProcessor: (text: string) => string) : string {
    remarkableRenderer.set({ textProcessor: textProcessor } as any);

    md2bbCodeRenderer.reset();

    let result = remarkableRenderer.render(message);
    logTrace(LogCategory.CHAT, tr("Markdown render result:\n%s"), result);
    return result;
}