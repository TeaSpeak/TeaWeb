import * as React from "react";
import * as loader from "tc-loader";
import {rendererReact, rendererText} from "tc-shared/text/bbcode/renderer";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement} from "vendor/xbbcode/elements";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {HTMLRenderer} from "tc-shared/ui/react-elements/HTMLRenderer";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {global_client_actions} from "tc-shared/events/GlobalEvents";

const playIcon = require("./yt-play-button.svg");
const cssStyle = require("./youtube.scss");

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode code tag init",
    function: async () => {
        let reactId = 0;

        const patternYtVideoId = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/))([^?&"'>]{10,11})$/;
        rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
            render(element: TagElement): React.ReactNode {
                const text = rendererText.render(element);
                const result = text.match(patternYtVideoId);
                if(!result || !result[1]) {
                    return <BBCodeRenderer key={"cyt-" + ++reactId} settings={{ convertSingleUrls: false }} message={"[url]" + text + "[/url]"} />;
                }

                return (
                    <div
                        className={cssStyle.container}
                        onContextMenu={event => {
                            event.preventDefault();

                            spawn_context_menu(event.pageX, event.pageY, {
                                callback: () => {
                                    global_client_actions.fire("action_w2g", {
                                        videoUrl: text,
                                        handlerId: server_connections.active_connection().handlerId
                                    });
                                },
                                name: tr("Watch video"),
                                type: contextmenu.MenuEntryType.ENTRY,
                                icon_class: ""
                            }, {
                                callback: () => {
                                    const win = window.open(text, '_blank');
                                    win.focus();
                                },
                                name: tr("Open video URL"),
                                type: contextmenu.MenuEntryType.ENTRY,
                                icon_class: "client-browse-addon-online"
                            }, contextmenu.Entry.HR(), {
                                callback: () => copy_to_clipboard(text),
                                name: tr("Copy video URL to clipboard"),
                                type: contextmenu.MenuEntryType.ENTRY,
                                icon_class: "client-copy"
                            })
                        }}
                    >
                        <img draggable={false} src={"https://img.youtube.com/vi/" + result[1] + "/hqdefault.jpg"} alt={"Video thumbnail"} title={tra("Youtube video {}", result[1])} />
                        <button className={cssStyle.playButton} onClick={() => {
                            global_client_actions.fire("action_w2g", {
                                videoUrl: text,
                                handlerId: server_connections.active_connection().handlerId
                            });
                        }}>
                            <HTMLRenderer purify={false}>{playIcon}</HTMLRenderer>
                        </button>
                    </div>
                );
            }

            tags(): string | string[] {
                return ["youtube", "yt"];
            }
        });
    },
    priority: 10
});