import * as hljs from "highlight.js/lib/core";

import * as loader from "tc-loader";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement} from "vendor/xbbcode/elements";
import * as React from "react";
import {tra} from "tc-shared/i18n/localize";
import * as DOMPurify from "dompurify";
import {copyToClipboard} from "tc-shared/utils/helpers";
import {rendererReact, rendererText} from "tc-shared/text/bbcode/renderer";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";

import '!style-loader!css-loader!highlight.js/styles/darcula.css';
import {Settings, settings} from "tc-shared/settings";
import {LogCategory, logWarn} from "tc-shared/log";

const registerLanguage = (name, language: Promise<any>) => {
    language.then(lan => hljs.registerLanguage(name, lan.default)).catch(error => {
        logWarn(LogCategory.CHAT, tr("Failed to load language %s (%o)"), name, error);
    });
};

registerLanguage("javascript", import("highlight.js/lib/languages/javascript"));
registerLanguage("actionscript", import("highlight.js/lib/languages/actionscript"));
registerLanguage("armasm", import("highlight.js/lib/languages/armasm"));
registerLanguage("basic", import("highlight.js/lib/languages/basic"));
registerLanguage("c-like", import("highlight.js/lib/languages/c-like"));
registerLanguage("c", import("highlight.js/lib/languages/c"));
registerLanguage("cmake", import("highlight.js/lib/languages/cmake"));
registerLanguage("coffeescript", import("highlight.js/lib/languages/coffeescript"));
registerLanguage("cpp", import("highlight.js/lib/languages/cpp"));
registerLanguage("csharp", import("highlight.js/lib/languages/csharp"));
registerLanguage("css", import("highlight.js/lib/languages/css"));
registerLanguage("dart", import("highlight.js/lib/languages/dart"));
registerLanguage("delphi", import("highlight.js/lib/languages/delphi"));
registerLanguage("dockerfile", import("highlight.js/lib/languages/dockerfile"));
registerLanguage("elixir", import("highlight.js/lib/languages/elixir"));
registerLanguage("erlang", import("highlight.js/lib/languages/erlang"));
registerLanguage("fortran", import("highlight.js/lib/languages/fortran"));
registerLanguage("go", import("highlight.js/lib/languages/go"));
registerLanguage("groovy", import("highlight.js/lib/languages/groovy"));
registerLanguage("ini", import("highlight.js/lib/languages/ini"));
registerLanguage("java", import("highlight.js/lib/languages/java"));
registerLanguage("javascript", import("highlight.js/lib/languages/javascript"));
registerLanguage("json", import("highlight.js/lib/languages/json"));
registerLanguage("kotlin", import("highlight.js/lib/languages/kotlin"));
registerLanguage("latex", import("highlight.js/lib/languages/latex"));
registerLanguage("lua", import("highlight.js/lib/languages/lua"));
registerLanguage("makefile", import("highlight.js/lib/languages/makefile"));
registerLanguage("markdown", import("highlight.js/lib/languages/markdown"));
registerLanguage("mathematica", import("highlight.js/lib/languages/mathematica"));
registerLanguage("matlab", import("highlight.js/lib/languages/matlab"));
registerLanguage("objectivec", import("highlight.js/lib/languages/objectivec"));
registerLanguage("perl", import("highlight.js/lib/languages/perl"));
registerLanguage("php", import("highlight.js/lib/languages/php"));
registerLanguage("plaintext", import("highlight.js/lib/languages/plaintext"));
registerLanguage("powershell", import("highlight.js/lib/languages/powershell"));
registerLanguage("protobuf", import("highlight.js/lib/languages/protobuf"));
registerLanguage("python", import("highlight.js/lib/languages/python"));
registerLanguage("ruby", import("highlight.js/lib/languages/ruby"));
registerLanguage("rust", import("highlight.js/lib/languages/rust"));
registerLanguage("scala", import("highlight.js/lib/languages/scala"));
registerLanguage("shell", import("highlight.js/lib/languages/shell"));
registerLanguage("sql", import("highlight.js/lib/languages/sql"));
registerLanguage("swift", import("highlight.js/lib/languages/swift"));
registerLanguage("typescript", import("highlight.js/lib/languages/typescript"));
registerLanguage("vbnet", import("highlight.js/lib/languages/vbnet"));
registerLanguage("vbscript", import("highlight.js/lib/languages/vbscript"));
registerLanguage("x86asm", import("highlight.js/lib/languages/x86asm"));
registerLanguage("xml", import("highlight.js/lib/languages/xml"));
registerLanguage("yaml", import("highlight.js/lib/languages/yaml"));

const cssStyle = require("./highlight.scss");

interface HighlightResult {
    relevance : number
    value : string
    language? : string
    illegal : boolean
    sofar? : string
    errorRaised? : Error
    
    second_best? : Omit<HighlightResult, 'second_best'>
}

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode highlight init",
    function: async () => {
        let reactId = 0;

        if(!settings.getValue(Settings.KEY_CHAT_HIGHLIGHT_CODE)) {
            return;
        }
        /* override default parser */
        rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
            tags(): string | string[] {
                return ["code", "icode", "i-code"];
            }

            render(element: TagElement): React.ReactNode {
                const klass = element.tagNormalized != 'code' ? cssStyle.inlineCode : cssStyle.code;
                const language = (element.options || "").replace("\"", "'").toLowerCase();

                let lines = rendererText.renderContent(element).join("").split("\n");
                if(lines.length > 1) {
                    if(lines[0].length === 0)
                        lines = lines.slice(1);

                    if(lines[lines.length - 1]?.length === 0)
                        lines = lines.slice(0, lines.length - 1);
                }

                let result: HighlightResult;
                const detectedLanguage = hljs.getLanguage(language);
                if(detectedLanguage)
                    result = hljs.highlight(detectedLanguage.name, lines.join("\n"), true);
                else
                    result = hljs.highlightAuto(lines.join("\n"));

                return (
                    <pre key={"hrc-" + ++reactId} className={klass}>
                        <code
                            className={"hljs"}
                            title={tra("{} code", result.language || tr("general"))}
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(result.value)
                            }}
                            onContextMenu={event => {
                                event.preventDefault();
                                spawn_context_menu(event.pageX, event.pageY, {
                                    callback: () => copyToClipboard(lines.join("\n")),
                                    name: tr("Copy code"),
                                    type: MenuEntryType.ENTRY,
                                    icon_class: "client-copy"
                                });
                            }}
                        />
                    </pre>
                );
            }
        });
    },
    priority: 10
});