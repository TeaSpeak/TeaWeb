import UrlKnife from 'url-knife';
import {Settings, settings} from "../settings";
import {renderMarkdownAsBBCode} from "../text/markdown";
import {escapeBBCode} from "../text/bbcode";
import {parse as parseBBCode} from "vendor/xbbcode/parser";
import {TagElement} from "vendor/xbbcode/elements";
import {regexImage} from "tc-shared/text/bbcode/image";

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

function bbcodeLinkUrls(message: string, ignore: { start: number, end: number }[]) : string {
    const urls: UrlKnifeUrl[] = UrlKnife.TextArea.extractAllUrls(message, {
        'ip_v4' : true,
        'ip_v6' : false,
        'localhost' : false,
        'intranet' : true
    });

    /* we want to go through the urls from the back to the front */
    urls.sort((a, b) => b.index.start - a.index.start);
    outerLoop:
    for(const url of urls) {
        if(ignore.findIndex(range => range.start <= url.index.start && range.end >= url.index.end) !== -1) {
            continue;
        }

        const prefix = message.substr(0, url.index.start);
        const suffix = message.substr(url.index.end);
        const urlPath = message.substring(url.index.start, url.index.end);
        let bbcodeUrl;

        regexImage.lastIndex = 0;
        if (regexImage.test(urlPath)) {
            for(const suffix of [
                ".jpeg", ".jpg",
                ".png", ".gif", ".tiff",
                ".bmp",
                ".webp",
                ".svg"
            ]) {
                if(urlPath.endsWith(suffix)) {
                    /* It's an image. Images will be rendered by the client automatically. */
                    continue outerLoop;
                }
            }
        }


        let colonIndex = urlPath.indexOf(":");
        if(colonIndex === -1 || colonIndex + 2 >= urlPath.length || urlPath[colonIndex + 1] !== "/" || urlPath[colonIndex + 2] !== "/") {
            bbcodeUrl = "[url=https://" + urlPath + "]" + urlPath + "[/url]";
        } else {
            bbcodeUrl = "[url]" + urlPath + "[/url]";
        }

        message = prefix + bbcodeUrl + suffix;
    }

    return message;
}

export function preprocessChatMessageForSend(message: string) : string {
    const parseMarkdown = settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN);
    const escapeBBCodes = !settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE);

    if(parseMarkdown) {
        message = renderMarkdownAsBBCode(message, text => escapeBBCodes ? escapeBBCode(text) : text);
    } else if(escapeBBCodes) {
        message = escapeBBCode(message);
    }

    if(settings.static_global(Settings.KEY_CHAT_TAG_URLS)) {
        const bbcodeElements = parseBBCode(message, {});
        const noParseRanges: { start: number, end: number }[] = [];

        while(true) {
            const element = bbcodeElements.pop();
            if(!element) {
                break;
            }

            if(!(element instanceof TagElement)) {
                continue;
            }

            switch(element.tagType?.tag) {
                case "code":
                case "i-code":
                case "url":
                case "img":
                case "no-parse":
                case "youtube":
                case "quote":
                    noParseRanges.push(element.textPosition);
                    break;

                default:
                    bbcodeElements.push(...element.content);
                    break;
            }
        }
        console.error("Message: %s; No Parse: %s", message, noParseRanges);

        message = bbcodeLinkUrls(message, noParseRanges);
    }

    return message;
}