import UrlKnife from 'url-knife';
import {Settings, settings} from "../settings";
import {renderMarkdownAsBBCode} from "../text/markdown";
import {escapeBBCode} from "../text/bbcode";

interface UrlKnifeUrl {
    value: {
        url: string,
    },
    area: string,
    index: {
        start: number,
        end: number
    }
}

function bbcodeLinkUrls(message: string) : string {
    const urls: UrlKnifeUrl[] = UrlKnife.TextArea.extractAllUrls(message, {
        'ip_v4' : true,
        'ip_v6' : false,
        'localhost' : false,
        'intranet' : true
    });

    /* we want to go through the urls from the back to the front */
    urls.sort((a, b) => b.index.start - a.index.start);
    for(const url of urls) {
        const prefix = message.substr(0, url.index.start);
        const suffix = message.substr(url.index.end);
        const urlPath = message.substring(url.index.start, url.index.end);
        let bbcodeUrl;

        let colonIndex = urlPath.indexOf(":");
        if(colonIndex === -1 || colonIndex + 2 < urlPath.length || urlPath[colonIndex + 1] !== "/" || urlPath[colonIndex + 2] !== "/") {
            bbcodeUrl = "[url=https://" + urlPath + "]" + urlPath + "[/url]";
        } else {
            bbcodeUrl = "[url]" + urlPath + "[/url]";
        }

        message = prefix + bbcodeUrl + suffix;
    }

    return message;
}

export function preprocessChatMessageForSend(message: string) : string {
    const processUrls = settings.static_global(Settings.KEY_CHAT_TAG_URLS);
    const parseMarkdown = settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN);
    const escapeBBCodes = !settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE);

    if(parseMarkdown) {
        return renderMarkdownAsBBCode(message, text => {
            if(escapeBBCodes) {
                text = escapeBBCode(text);
            }

            if(processUrls) {
                text = bbcodeLinkUrls(text);
            }

            return text;
        });
    } else {
        if(escapeBBCodes) {
            message = escapeBBCode(message);
        }

        if(processUrls) {
            message = bbcodeLinkUrls(message);
        }

        return message;
    }
}