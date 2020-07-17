import {Settings, settings} from "tc-shared/settings";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import * as loader from "tc-loader";
import * as image_preview from "./ui/frames/image_preview"
import * as DOMPurify from "dompurify";

import {parse as parseBBCode} from "vendor/xbbcode/parser";

import ReactRenderer from "vendor/xbbcode/renderer/react";
import HTMLRenderer from "vendor/xbbcode/renderer/html";
import TextRenderer from "vendor/xbbcode/renderer/text";

import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement, TextElement} from "vendor/xbbcode/elements";
import * as React from "react";
import {XBBCodeRenderer} from "vendor/xbbcode/react";

import * as emojiRegex from "emoji-regex";
import * as hljs from 'highlight.js/lib/core';
import '!style-loader!css-loader!highlight.js/styles/darcula.css';
import {tra} from "tc-shared/i18n/localize";

const emojiRegexInstance = (emojiRegex as any)() as RegExp;

const registerLanguage = (name, language: Promise<any>) => {
    language.then(lan => hljs.registerLanguage(name, lan)).catch(error => {
        console.warn("Failed to load language %s (%o)", name, error);
    });
};

registerLanguage("javascript", import("highlight.js/lib/languages/javascript"));
registerLanguage("actionscript", import("highlight.js/lib/languages/actionscript"));
registerLanguage("armasm", import("highlight.js/lib/languages/armasm"));
registerLanguage("basic", import("highlight.js/lib/languages/basic"));
registerLanguage("c-like", import("highlight.js/lib/languages/c-like"));
registerLanguage("c", import("highlight.js/lib/languages/c"));
registerLanguage("cmake", import("highlight.js/lib/languages/cmake"));
registerLanguage("coffeescript", import("highlight.js/lib/languages/coffeescript"));
registerLanguage("cpp", import("highlight.js/lib/languages/cpp"));
registerLanguage("csharp", import("highlight.js/lib/languages/csharp"));
registerLanguage("css", import("highlight.js/lib/languages/css"));
registerLanguage("dart", import("highlight.js/lib/languages/dart"));
registerLanguage("delphi", import("highlight.js/lib/languages/delphi"));
registerLanguage("dockerfile", import("highlight.js/lib/languages/dockerfile"));
registerLanguage("elixir", import("highlight.js/lib/languages/elixir"));
registerLanguage("erlang", import("highlight.js/lib/languages/erlang"));
registerLanguage("fortran", import("highlight.js/lib/languages/fortran"));
registerLanguage("go", import("highlight.js/lib/languages/go"));
registerLanguage("groovy", import("highlight.js/lib/languages/groovy"));
registerLanguage("ini", import("highlight.js/lib/languages/ini"));
registerLanguage("java", import("highlight.js/lib/languages/java"));
registerLanguage("javascript", import("highlight.js/lib/languages/javascript"));
registerLanguage("json", import("highlight.js/lib/languages/json"));
registerLanguage("kotlin", import("highlight.js/lib/languages/kotlin"));
registerLanguage("latex", import("highlight.js/lib/languages/latex"));
registerLanguage("lua", import("highlight.js/lib/languages/lua"));
registerLanguage("makefile", import("highlight.js/lib/languages/makefile"));
registerLanguage("markdown", import("highlight.js/lib/languages/markdown"));
registerLanguage("mathematica", import("highlight.js/lib/languages/mathematica"));
registerLanguage("matlab", import("highlight.js/lib/languages/matlab"));
registerLanguage("objectivec", import("highlight.js/lib/languages/objectivec"));
registerLanguage("perl", import("highlight.js/lib/languages/perl"));
registerLanguage("php", import("highlight.js/lib/languages/php"));
registerLanguage("plaintext", import("highlight.js/lib/languages/plaintext"));
registerLanguage("powershell", import("highlight.js/lib/languages/powershell"));
registerLanguage("protobuf", import("highlight.js/lib/languages/protobuf"));
registerLanguage("python", import("highlight.js/lib/languages/python"));
registerLanguage("ruby", import("highlight.js/lib/languages/ruby"));
registerLanguage("rust", import("highlight.js/lib/languages/rust"));
registerLanguage("scala", import("highlight.js/lib/languages/scala"));
registerLanguage("shell", import("highlight.js/lib/languages/shell"));
registerLanguage("sql", import("highlight.js/lib/languages/sql"));
registerLanguage("swift", import("highlight.js/lib/languages/swift"));
registerLanguage("typescript", import("highlight.js/lib/languages/typescript"));
registerLanguage("vbnet", import("highlight.js/lib/languages/vbnet"));
registerLanguage("vbscript", import("highlight.js/lib/languages/vbscript"));
registerLanguage("x86asm", import("highlight.js/lib/languages/x86asm"));
registerLanguage("xml", import("highlight.js/lib/languages/xml"));
registerLanguage("yaml", import("highlight.js/lib/languages/yaml"));

const rendererText = new TextRenderer();
const rendererReact = new ReactRenderer();
const rendererHTML = new HTMLRenderer(rendererReact);

export namespace bbcode {
    const yt_url_regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

    export const allowedBBCodes = [
        "b", "big",
        "i", "italic",
        "u", "underlined",
        "s", "strikethrough",
        "color",
        "url",
        "code",
        "i-code", "icode",
        "sub", "sup",
        "size",
        "hr", "br",
        "left", "l", "center", "c", "right", "r",

        "ul", "ol", "list",
        "li",

        "table",
        "tr", "td", "th",

        "yt", "youtube",
        "img",

        "quote"
    ];

    export interface FormatSettings {
        is_chat_message?: boolean
    }

    export function preprocessMessage(message: string, fsettings?: FormatSettings) {
        fsettings = fsettings || {};

        single_url_parse:
        if(fsettings.is_chat_message) {
            /* try if its only one url */
            const raw_url = message.replace(/\[url(=\S+)?](\S+)\[\/url]/, "$2");
            let url: URL;
            try {
                url = new URL(raw_url);
            } catch(error) {
                break single_url_parse;
            }

            single_url_yt:
            {
                const result = raw_url.match(yt_url_regex);
                if(!result) break single_url_yt;

                return "[yt]https://www.youtube.com/watch?v=" + result[5] + "[/yt]";
            }

            single_url_image:
            {
                const ext_index = url.pathname.lastIndexOf(".");
                if(ext_index == -1) break single_url_image;

                const ext_name = url.pathname.substr(ext_index + 1).toLowerCase();
                if([
                    "jpeg", "jpg",
                    "png", "bmp", "gif",
                    "tiff", "pdf", "svg"
                ].findIndex(e => e === ext_name) == -1) break single_url_image;

                return "[img]" + message + "[/img]";
            }
        }

        return message;
    }

    export function format(message: string, fsettings?: FormatSettings) : JQuery[] {
        message = preprocessMessage(message, fsettings);
        const result = parseBBCode(message, {
            tag_whitelist: allowedBBCodes
        });

        let html = result.map(e => rendererHTML.render(e)).join("");
        /* FIXME: TODO or remove JQuery renderer
        if(settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES))
            html = twemoji.parse(html);
        */

        const container = $.spawn("div") as JQuery;
        container[0].innerHTML = html;

        /* fixup some listeners */
        container.find("a")
            .attr('target', "_blank")
            .on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;

                event.preventDefault();
                spawnUrlContextMenu(event.pageX, event.pageY, $(event.target).attr("href"));
            });

        container.find("img").on('load', event => load_image(event.target as HTMLImageElement));

        return [container.contents() as JQuery];
        //return result.root_tag.content.map(e => e.build_html()).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry));
    }

    function spawnUrlContextMenu(pageX: number, pageY: number, target: string) {
        contextmenu.spawn_context_menu(pageX, pageY, {
            callback: () => {
                const win = window.open(target, '_blank');
                win.focus();
            },
            name: tr("Open URL"),
            type: contextmenu.MenuEntryType.ENTRY,
            icon_class: "client-browse-addon-online"
        }, {
            callback: () => {
                //TODO
            },
            name: tr("Open URL in Browser"),
            type: contextmenu.MenuEntryType.ENTRY,
            visible: __build.target === "client" && false // Currently not possible
        }, contextmenu.Entry.HR(), {
            callback: () => copy_to_clipboard(target),
            name: tr("Copy URL to clipboard"),
            type: contextmenu.MenuEntryType.ENTRY,
            icon_class: "client-copy"
        });
    }

    function load_image(entry: HTMLImageElement) {
        if(!entry.hasAttribute("x-image-url"))
            return;

        const url = decodeURIComponent(entry.getAttribute("x-image-url") || "");
        entry.removeAttribute("x-image-url");

        let proxiedURL;
        try {
            const parsedURL = new URL(url);
            if(parsedURL.hostname === "cdn.discordapp.com") {
                proxiedURL = url;
            }
        } catch (e) { }

        if(!proxiedURL) {
            proxiedURL = "https://images.weserv.nl/?url=" + encodeURIComponent(url);
        }

        entry.onload = undefined;
        entry.src = proxiedURL;

        const parent = $(entry.parentElement);
        parent.on('contextmenu', event => {
            contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                callback: () => {
                    const win = window.open(url, '_blank');
                    win.focus();
                },
                name: tr("Open image in browser"),
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-browse-addon-online"
            }, contextmenu.Entry.HR(), {
                callback: () => copy_to_clipboard(url),
                name: tr("Copy image URL to clipboard"),
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-copy"
            })
        });
        parent.css("cursor", "pointer").on('click', () => image_preview.preview_image(proxiedURL, url));
    }

    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "XBBCode code tag init",
        function: async () => {
            let reactId = 0;

            /* override default parser */
            rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
                tags(): string | string[] {
                    return ["code", "icode", "i-code"];
                }

                render(element: TagElement): React.ReactNode {
                    const klass = element.tagNormalized != 'code' ? "tag-hljs-inline-code" : "tag-hljs-code";
                    const language = (element.options || "").replace("\"", "'").toLowerCase();

                    let lines = rendererText.renderContent(element).join("").split("\n");
                    if(lines.length > 1) {
                        if(lines[0].length === 0)
                            lines = lines.slice(1);

                        if(lines[lines.length - 1]?.length === 0)
                            lines = lines.slice(0, lines.length - 1);
                    }

                    let result: HighlightJSResult;

                    const detectedLanguage = hljs.getLanguage(language);
                    if(detectedLanguage)
                        result = hljs.highlight(detectedLanguage.name, lines.join("\n"), true);
                    else
                        result = hljs.highlightAuto(lines.join("\n"));

                    return (
                        <pre key={"er-" + ++reactId} className={klass}>
                            <code
                                className={"hljs"}
                                title={tra("{} code", result.language || tr("general"))}
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(result.value)
                                }}
                                onContextMenu={event => {
                                    event.preventDefault();
                                    spawn_context_menu(event.pageX, event.pageY, {
                                        callback: () => copy_to_clipboard(lines.join("\n")),
                                        name: tr("Copy code"),
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        icon_class: "client-copy"
                                    });
                                }}
                            />
                        </pre>
                    );
                }
            });

            const regexUrl = /^(?:[a-zA-Z]{1,16}):(?:\/{1,3}|\\)[-a-zA-Z0-9:;,@#%&()~_?+=\/\\.]*$/g;
            rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
                render(element: TagElement, renderer: ReactRenderer): React.ReactNode {
                    let target;
                    if (!element.options)
                        target = rendererText.render(element);
                    else
                        target = element.options;

                    regexUrl.lastIndex = 0;
                    if (!regexUrl.test(target))
                        target = '#';

                    /* TODO: Implement client URLs */
                    return <a key={"er-" + ++reactId} className={"xbbcode xbbcode-tag-url"} href={target} target={"_blank"} onContextMenu={event => {
                        event.preventDefault();
                        spawnUrlContextMenu(event.pageX, event.pageY, target);
                    }}>
                        {renderer.renderContent(element)}
                    </a>;
                }

                tags(): string | string[] {
                    return "url";
                }
            });

            const regexImage = /^(?:https?):(?:\/{1,3}|\\)[-a-zA-Z0-9:;,@#%&()~_?+=\/\\.]*$/g;
            rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
                tags(): string | string[] {
                    return ["img", "image"];
                }

                render(element: TagElement): React.ReactNode {
                    let target;
                    let content = rendererText.render(element);
                    if (!element.options) {
                        target = content;
                    } else
                        target = element.options;

                    regexImage.lastIndex = 0;
                    if (!regexImage.test(target))
                        return <React.Fragment key={"er-" + ++reactId}>{"[img]" + content + "[/img]"}</React.Fragment>;

                    return (
                        <div key={"er-" + ++reactId} className={"xbbcode-tag-img"}>
                            <img src={"img/loading_image.svg"} onLoad={event => load_image(event.currentTarget)} x-image-url={encodeURIComponent(target)} title={target} alt={target} />
                        </div>
                    );
                }
            });

            function toCodePoint(unicodeSurrogates) {
                let r = [],
                    c = 0,
                    p = 0,
                    i = 0;
                while (i < unicodeSurrogates.length) {
                    c = unicodeSurrogates.charCodeAt(i++);
                    if (p) {
                        r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16));
                        p = 0;
                    } else if (0xD800 <= c && c <= 0xDBFF) {
                        p = c;
                    } else {
                        r.push(c.toString(16));
                    }
                }
                return r.join("-");
            }

            const U200D = String.fromCharCode(0x200D);
            const UFE0Fg = /\uFE0F/g;
            function grabTheRightIcon(rawText) {
                // if variant is present as \uFE0F
                return toCodePoint(rawText.indexOf(U200D) < 0 ?
                    rawText.replace(UFE0Fg, '') :
                    rawText
                );
            }

            rendererReact.setTextRenderer(new class extends ElementRenderer<TextElement, React.ReactNode> {
                render(element: TextElement, renderer: ReactRenderer): React.ReactNode {
                    if(!settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES))
                        return element.text();

                    let text = element.text();
                    emojiRegexInstance.lastIndex = 0;

                    const result = [];

                    let lastIndex = 0;
                    while(true) {
                        let match = emojiRegexInstance.exec(text);

                        const rawText = text.substring(lastIndex, match?.index);
                        if(rawText)
                            result.push(renderer.renderAsText(rawText, false));

                        if(!match)
                            break;

                        let hash = grabTheRightIcon(match[0]);
                        result.push(<img key={"er-" + ++reactId} draggable={false} src={"https://twemoji.maxcdn.com/v/12.1.2/72x72/" + hash + ".png"} alt={match[0]} className={"chat-emoji"} />);
                        lastIndex = match.index + match[0].length;
                    }

                    return result;
                }

                tags(): string | string[] { return undefined; }
            });
        },
        priority: 10
    });
}

export const BBCodeChatMessage = (props: { message: string }) => (
    <XBBCodeRenderer options={{ tag_whitelist: bbcode.allowedBBCodes }} renderer={rendererReact}>
        {bbcode.preprocessMessage(props.message, { is_chat_message: true })}
    </XBBCodeRenderer>
);

export function sanitize_text(text: string) : string {
    return $(DOMPurify.sanitize("<a>" + text + "</a>", {
    })).text();
}

export function formatDate(secs: number) : string {
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