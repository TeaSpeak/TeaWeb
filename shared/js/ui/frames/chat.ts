enum ChatType {
    GENERAL,
    SERVER,
    CHANNEL,
    CLIENT
}

namespace MessageHelper {
    export function htmlEscape(message: string) : string[] {
        const div = document.createElement('div');
        div.innerText = message;
        message =  div.innerHTML;
        return message.replace(/ /g, '&nbsp;').split(/<br>/);
    }

    export function formatElement(object: any, escape_html: boolean = true) : JQuery[] {
        if($.isArray(object)) {
            let result = [];
            for(let element of object)
                result.push(...formatElement(element, escape_html));
            return result;
        } else if(typeof(object) == "string") {
            if(object.length == 0) return [];

            return escape_html ?
                htmlEscape(object).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 || idx + 1 == array.length ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry)) :
                [$.spawn("div").css("display", "inline-block").html(object)];
        } else if(typeof(object) === "object") {
            if(object instanceof $)
                return [object as any];
            return formatElement("<unknwon object>");
        } else if(typeof(object) === "function") return formatElement(object(), escape_html);
        else if(typeof(object) === "undefined") return formatElement("<undefined>");
        else if(typeof(object) === "number") return [$.spawn("a").text(object)];
        return formatElement("<unknown object type " + typeof object + ">");
    }

    export function formatMessage(pattern: string, ...objects: any[]) : JQuery[] {
        let begin = 0, found = 0;

        let result: JQuery[] = [];
        do {
            found = pattern.indexOf('{', found);
            if(found == -1 || pattern.length <= found + 1) {
                result.push(...formatElement(pattern.substr(begin)));
                break;
            }

            if(found > 0 && pattern[found - 1] == '\\') {
                //TODO remove the escape!
                found++;
                continue;
            }

            result.push(...formatElement(pattern.substr(begin, found - begin))); //Append the text

            let offset = 0;
            if(pattern[found + 1] == ':') {
                offset++; /* the beginning : */
                while (pattern[found + 1 + offset] != ':' && found + 1 + offset < pattern.length) offset++;
                const tag = pattern.substr(found + 2, offset - 1);

                offset++; /* the ending : */
                if(pattern[found + offset + 1] != '}' && found + 1 + offset < pattern.length) {
                    found++;
                    continue;
                }

                result.push($.spawn(tag as any));
            } else {
                let number;
                while ("0123456789".includes(pattern[found + 1 + offset])) offset++;
                number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");
                if(pattern[found + offset + 1] != '}') {
                    found++;
                    continue;
                }

                if(objects.length < number)
                    log.warn(LogCategory.GENERAL, tr("Message to format contains invalid index (%o)"), number);

                result.push(...formatElement(objects[number]));
            }

            found = found + 1 + offset;
            begin = found + 1;
        } while(found++);

        return result;
    }

    export function bbcode_chat(message: string) : JQuery[] {
        const result: xbbcode.Result = xbbcode.parse(message, {
            /* TODO make this configurable and allow IMG */
            tag_whitelist: [
                "b", "big",
                "i", "italic",
                "u", "underlined",
                "color",
                "url",
                "code",
                "icode",
                "i-code",

                "ul", "ol", "list",
                "li",
                /* "img" */
            ] //[img]https://i.ytimg.com/vi/kgeSTkZssPg/maxresdefault.jpg[/img]
        });
        /*
        if(result.error) {
            log.error(LogCategory.GENERAL, tr("BBCode parse error: %o"), result.errorQueue);
            return formatElement(message);
        }
        */

        let html = result.build_html();

        if(typeof(window.twemoji) !== "undefined" && settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES))
            html = twemoji.parse(html);

        const container = $.spawn("div");
        container[0].innerHTML = DOMPurify.sanitize(html, {
            ADD_ATTR: [
                "x-highlight-type",
                "x-code-type"
            ]
        });

        container.find("a").attr('target', "_blank");

        return [container.contents() as JQuery];
        //return result.root_tag.content.map(e => e.build_html()).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry));
    }

    loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
        name: "XBBCode code tag init",
        function: async () => {
            /* override default parser */
            xbbcode.register.register_parser( {
                tag: ["code", "icode", "i-code"],
                content_tags_whitelist: [],

                build_html(layer: xbbcode.TagLayer) : string {
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
        },
        priority: 10
    })
}