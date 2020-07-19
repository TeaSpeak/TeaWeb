//https://regex101.com/r/YQbfcX/2
//static readonly URL_REGEX = /^(?<hostname>([a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{2,63})(?:\/(?<path>(?:[^\s?]+)?)(?:\?(?<query>\S+))?)?$/gm;
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {renderMarkdownAsBBCode} from "tc-shared/text/markdown";
import {escapeBBCode} from "tc-shared/text/bbcode";

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

export function preprocessChatMessageForSend(message: string) : string {
    const process_url = settings.static_global(Settings.KEY_CHAT_TAG_URLS);
    const parse_markdown = settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN);
    const escape_bb = !settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE);

    if(parse_markdown) {
        return renderMarkdownAsBBCode(message, text => {
            if(escape_bb)
                text = escapeBBCode(text);

            if(process_url)
                text = process_urls(text);

            return text;
        });
    }

    if(escape_bb)
        message = escapeBBCode(message);

    if(process_url)
        message = process_urls(message);

    return message;
}