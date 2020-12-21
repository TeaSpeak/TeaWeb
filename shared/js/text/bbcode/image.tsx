import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement} from "vendor/xbbcode/elements";
import * as React from "react";
import * as loader from "tc-loader";
import {rendererReact, rendererText} from "tc-shared/text/bbcode/renderer";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import * as image_preview from "tc-shared/ui/frames/image_preview";

export const regexImage = /^(?:https?):(?:\/{1,3}|\\)[-a-zA-Z0-9:;,@#%&()~_?+=\/\\.]*$/g;

function loadImageForElement(element: HTMLImageElement) {
    if(!element.hasAttribute("x-image-url")) {
        return;
    }

    const url = decodeURIComponent(element.getAttribute("x-image-url") || "");
    element.removeAttribute("x-image-url");

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

    element.onload = undefined;
    element.src = proxiedURL;

    const parent = $(element.parentElement);
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
    name: "XBBCode emoji init",
    function: async () => {
        let reactId = 0;

        rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
            tags(): string | string[] {
                return ["img", "image"];
            }

            render(element: TagElement): React.ReactNode {
                let target;
                let content = rendererText.render(element);
                if (!element.options) {
                    target = content?.trim();
                } else {
                    target = element.options?.trim();
                }

                regexImage.lastIndex = 0;
                if (!regexImage.test(target)) {
                    return <React.Fragment key={"er-" + ++reactId}>{"[img]" + content + "[/img]"}</React.Fragment>;
                }

                return (
                    <div key={"irc-" + ++reactId} className={"xbbcode-tag xbbcode-tag-img"}>
                        <img src={"img/loading_image.svg"} onLoad={event => loadImageForElement(event.currentTarget)} x-image-url={encodeURIComponent(target)} title={target} alt={target} />
                    </div>
                );
            }
        });
    },
    priority: 10
});

export function fixupJQueryImageTags(container: JQuery) {
    container.find("img").on('load', event => loadImageForElement(event.target as HTMLImageElement));
}