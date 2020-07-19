import * as loader from "tc-loader";
import { rendererReact } from "tc-shared/text/bbcode/renderer";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TextElement} from "vendor/xbbcode/elements";
import * as React from "react";
import ReactRenderer from "vendor/xbbcode/renderer/react";
import {Settings, settings} from "tc-shared/settings";

import * as emojiRegex from "emoji-regex";

const emojiRegexInstance = (emojiRegex as any)() as RegExp;

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode emoji init",
    function: async () => {
        let reactId = 0;

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