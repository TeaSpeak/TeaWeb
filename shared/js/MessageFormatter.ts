import {Settings, settings} from "tc-shared/settings";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import {guid} from "tc-shared/crypto/uid";
import * as loader from "tc-loader";
import * as image_preview from "./ui/frames/image_preview"
import * as DOMPurify from "dompurify";

declare const xbbcode;
export namespace bbcode {
    const sanitizer_escaped = (key: string) => "[-- sescaped: " + key + " --]";
    const sanitizer_escaped_regex = /\[-- sescaped: ([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}) --]/;
    const sanitizer_escaped_map: {[key: string]: string} = {};

    const yt_url_regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

    export interface FormatSettings {
        is_chat_message?: boolean
    }

    export function format(message: string, fsettings?: FormatSettings) : JQuery[] {
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

                return format("[yt]https://www.youtube.com/watch?v=" + result[5] + "[/yt]");
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

                return format("[img]" + message + "[/img]");
            }
        }

        const result = xbbcode.parse(message, {
            tag_whitelist: [
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

                "ul", "ol", "list",
                "li",

                "table",
                "tr", "td", "th",

                "yt", "youtube",
                "img"
            ]
        });
        let html = result.build_html();
        if(typeof(window.twemoji) !== "undefined" && settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES))
            html = twemoji.parse(html);

        const container = $.spawn("div");
        let sanitized = DOMPurify.sanitize(html, {
            ADD_ATTR: [
                "x-highlight-type",
                "x-code-type",
                "x-image-url"
            ]
        });

        sanitized = sanitized.replace(sanitizer_escaped_regex, data => {
            const uid = data.match(sanitizer_escaped_regex)[1];
            const value = sanitizer_escaped_map[uid];
            if(!value) return data;
            delete sanitizer_escaped_map[uid];

            return value;
        });

        container[0].innerHTML = sanitized;


        container.find("a")
            .attr('target', "_blank")
            .on('contextmenu', event => {
                if(event.isDefaultPrevented()) return;
                event.preventDefault();

                const url = $(event.target).attr("href");
                contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                    callback: () => {
                        const win = window.open(url, '_blank');
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
                    callback: () => copy_to_clipboard(url),
                    name: tr("Copy URL to clipboard"),
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-copy"
                });
            });

        return [container.contents() as JQuery];
        //return result.root_tag.content.map(e => e.build_html()).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry));
    }

    export function load_image(entry: HTMLImageElement) {
        const url = decodeURIComponent(entry.getAttribute("x-image-url") || "");
        const proxy_url = "https://images.weserv.nl/?url=" + encodeURIComponent(url);

        entry.onload = undefined;
        entry.src = proxy_url;

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
        parent.css("cursor", "pointer").on('click', event => image_preview.preview_image(proxy_url, url));
    }

    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "XBBCode code tag init",
        function: async () => {
            /* override default parser */
            xbbcode.register.register_parser({
                tag: ["code", "icode", "i-code"],
                content_tags_whitelist: [],

                build_html(layer) : string {
                    const klass = layer.tag_normalized != 'code' ? "tag-hljs-inline-code" : "tag-hljs-code";
                    const language = (layer.options || "").replace("\"", "'").toLowerCase();

                    /* remove heading empty lines */
                    let text = layer.content.map(e => e.build_text())
                        .reduce((a, b) => a.length == 0 && b.replace(/[ \n\r\t]+/g, "").length == 0 ? "" : a + b, "")
                        .replace(/^([ \n\r\t]*)(?=\n)+/g, "");
                    if(text.startsWith("\r") || text.startsWith("\n"))
                        text = text.substr(1);

                    let result: HighlightJSResult;
                    if(window.hljs.getLanguage(language))
                        result = window.hljs.highlight(language, text, true);
                    else
                        result = window.hljs.highlightAuto(text);

                    let html = '<pre class="' + klass + '">';
                    html += '<code class="hljs" x-code-type="' + language + '" x-highlight-type="' + result.language + '">';
                    html += result.value;
                    return html + "</code></pre>";
                }
            });

            /* override the yt parser */
            const original_parser = xbbcode.register.find_parser("yt");
            if(original_parser)
                xbbcode.register.register_parser({
                    tag: ["yt", "youtube"],
                    build_html(layer): string {
                        const result = original_parser.build_html(layer);
                        if(!result.startsWith("<iframe")) return result;

                        const url = result.match(/src="(\S+)" /)[1];
                        const uid = guid();

                        sanitizer_escaped_map[uid] = "<iframe class=\"xbbcode-tag xbbcode-tag-video\" src=\"" + url + "\" frameborder=\"0\" allow=\"autoplay; encrypted-media\" allowfullscreen></iframe>";
                        return sanitizer_escaped(uid);
                    }
                });

            /* the image parse & displayer */
            xbbcode.register.register_parser({
                tag: ["img", "image"],
                build_html(layer): string {
                    const uid = guid();
                    const fallback_value = "[img]" + layer.build_text() + "[/img]";

                    let target;
                    let content = layer.content.map(e => e.build_text()).join("");
                    if (!layer.options) {
                        target = content;
                    } else
                        target = layer.options;

                    let url: URL;
                    try {
                        url = new URL(target);
                        if(!url.hostname) throw "";
                    } catch(error) {
                        return fallback_value;
                    }

                    sanitizer_escaped_map[uid] = "<div class='xbbcode-tag-img'><img src='img/loading_image.svg' onload='messages.formatter.bbcode.load_image(this)' x-image-url='" + encodeURIComponent(target) + "' title='" + sanitize_text(target) + "' /></div>";
                    return sanitizer_escaped(uid);
                }
            })
        },
        priority: 10
    });
}

export function sanitize_text(text: string) : string {
    return $(DOMPurify.sanitize("<a>" + text + "</a>", {
        ADD_ATTR: [
            "x-highlight-type",
            "x-code-type",
            "x-image-url"
        ]
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