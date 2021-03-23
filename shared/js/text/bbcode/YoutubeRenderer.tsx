import * as React from "react";
import * as loader from "tc-loader";
import {BBCodeHandlerContext, rendererReact, rendererText} from "tc-shared/text/bbcode/renderer";
import {ElementRenderer} from "vendor/xbbcode/renderer/base";
import {TagElement} from "vendor/xbbcode/elements";
import {BBCodeRenderer} from "tc-shared/text/bbcode";
import {HTMLRenderer} from "tc-shared/ui/react-elements/HTMLRenderer";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copyToClipboard} from "tc-shared/utils/helpers";
import {getIpcInstance, IPCChannel} from "tc-shared/ipc/BrowserIPC";
import {useContext} from "react";

import IconPlay from "./YoutubePlayButton.svg";
const cssStyle = require("./YoutubeRenderer.scss");

const patternYtVideoId = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/))([^?&"'>]{10,11})$/;
let reactId = 0;

export const isYoutubeLink = (text: string) => {
    const result = text.match(patternYtVideoId);
    return !(!result || !result[1]);
}

export const YoutubeRenderer = (props: { children?: React.ReactElement | React.ReactElement[], url: string }) => {
    const result = props.url.match(patternYtVideoId);
    if(!result || !result[1]) {
        if(props.children) {
            return (
                <React.Fragment key={"fallback"}>
                    {props.children}
                </React.Fragment>
            )
        } else {
            return <BBCodeRenderer key={"cyt-" + ++reactId} settings={{ convertSingleUrls: false }} message={"[url]" + props.url + "[/url]"} />;
        }
    }

    const handlerId = useContext(BBCodeHandlerContext);

    return (
        <div
            className={cssStyle.container}
            onContextMenu={event => {
                event.preventDefault();

                spawn_context_menu(event.pageX, event.pageY, {
                    callback: () => ipcChannel.sendMessage("w2g", { videoUrl: props.url, handlerId: handlerId }),
                    name: tr("Watch video"),
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: ""
                }, {
                    callback: () => {
                        const win = window.open(props.url, '_blank');
                        win.focus();
                    },
                    name: tr("Open video URL"),
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-browse-addon-online"
                }, contextmenu.Entry.HR(), {
                    callback: () => copyToClipboard(props.url),
                    name: tr("Copy video URL to clipboard"),
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-copy"
                })
            }}
        >
            <img draggable={false} src={"https://img.youtube.com/vi/" + result[1] + "/hqdefault.jpg"} alt={"Video thumbnail"} title={tra("Youtube video {}", result[1])} />
            <button className={cssStyle.playButton} onClick={() => ipcChannel.sendMessage("w2g", { videoUrl: props.url, handlerId: handlerId })}>
                <IconPlay />
            </button>
        </div>
    );
}

let ipcChannel: IPCChannel;
loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "XBBCode code tag init",
    function: async () => {
        ipcChannel = getIpcInstance().createCoreControlChannel("bbcode-youtube");
        rendererReact.registerCustomRenderer(new class extends ElementRenderer<TagElement, React.ReactNode> {
            render(element: TagElement): React.ReactNode {
                const text = rendererText.render(element);
                return <YoutubeRenderer url={text} />;
            }

            tags(): string | string[] {
                return ["youtube", "yt"];
            }
        });
    },
    priority: 10
});