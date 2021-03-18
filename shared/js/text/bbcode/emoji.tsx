import * as loader from "tc-loader";
import * as React from "react";
import { rendererReact } from "tc-shared/text/bbcode/renderer";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TextElement} from "vendor/xbbcode/elements";
import ReactRenderer from "vendor/xbbcode/renderer/react";
import {Settings, settings} from "tc-shared/settings";

import emojiRegex from "emoji-regex";
import {getTwenmojiHashFromNativeEmoji} from "tc-shared/text/bbcode/EmojiUtil";

const emojiRegexInstance = emojiRegex();

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode emoji init",
    function: async () => {
        let reactId = 0;

        rendererReact.setTextRenderer(new class extends ElementRenderer<TextElement, React.ReactNode> {
            render(element: TextElement, renderer: ReactRenderer): React.ReactNode {
                if(!settings.getValue(Settings.KEY_CHAT_COLORED_EMOJIES)) {
                    return element.text();
                }

                let text = element.text();
                emojiRegexInstance.lastIndex = 0;

                const result = [];

                let lastIndex = 0;
                while(true) {
                    let match = emojiRegexInstance.exec(text);

                    const rawText = text.substring(lastIndex, match?.index);
                    if(rawText) {
                        result.push(renderer.renderAsText(rawText, false));
                    }

                    if(!match) {
                        break;
                    }

                    let hash = getTwenmojiHashFromNativeEmoji(match[0]);
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