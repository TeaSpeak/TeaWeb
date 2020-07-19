import {XBBCodeRenderer} from "vendor/xbbcode/react";
import * as React from "react";
import {rendererHTML, rendererReact} from "tc-shared/text/bbcode/renderer";
import {parse as parseBBCode} from "vendor/xbbcode/parser";
import {fixupJQueryUrlTags} from "tc-shared/text/bbcode/url";
import {fixupJQueryImageTags} from "tc-shared/text/bbcode/image";

export const escapeBBCode = (text: string) => text.replace(/([\[\]])/g, "\\$1");

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

export interface BBCodeRenderOptions {
    convertSingleUrls: boolean;
}

const yt_url_regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;

function preprocessMessage(message: string, settings: BBCodeRenderOptions) : string {
    /* try if its only one url */
    single_url_parse:
    if(settings.convertSingleUrls) {
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

export const BBCodeRenderer = (props: { message: string, settings: BBCodeRenderOptions }) => (
    <XBBCodeRenderer options={{ tag_whitelist: allowedBBCodes }} renderer={rendererReact}>
        {preprocessMessage(props.message, props.settings)}
    </XBBCodeRenderer>
);


export function renderBBCodeAsJQuery(message: string, settings: BBCodeRenderOptions) : JQuery[] {
    const result = parseBBCode(preprocessMessage(message, settings), {
        tag_whitelist: allowedBBCodes
    });

    let html = result.map(e => rendererHTML.render(e)).join("");

    const container = $.spawn("div") as JQuery;
    container[0].innerHTML = html;

    /* fixup some listeners */
    fixupJQueryUrlTags(container);
    fixupJQueryImageTags(container);

    return [container.contents() as JQuery];
}