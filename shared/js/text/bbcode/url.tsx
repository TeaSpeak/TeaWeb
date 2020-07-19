import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import * as loader from "tc-loader";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement} from "vendor/xbbcode/elements";
import * as React from "react";
import ReactRenderer from "vendor/xbbcode/renderer/react";
import {rendererReact, rendererText} from "tc-shared/text/bbcode/renderer";

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

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode code tag init",
    function: async () => {
        let reactId = 0;

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
    },
    priority: 10
});


export function fixupJQueryUrlTags(container: JQuery) {
    container.find("a").on('contextmenu', event => {
        if(event.isDefaultPrevented())
            return;

        event.preventDefault();
        spawnUrlContextMenu(event.pageX, event.pageY, $(event.target).attr("href"));
    });
}