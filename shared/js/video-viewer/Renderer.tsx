import {AbstractModal} from "tc-shared/ui/react-elements/Modal";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {VideoViewerEvents} from "./Definitions";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import ReactPlayer from 'react-player'

const cssStyle = require("./Renderer.scss");

class ModalVideoPopout extends AbstractModal {
    readonly events: Registry<VideoViewerEvents>;

    constructor(registry: Registry<VideoViewerEvents>, userData: any) {
        super();

        this.events = registry;
        this.events.on("notify_show", () => {
            console.log("Showed!");
        });

        this.events.on("notify_data_url", async event => {
            console.log(event.url);
            console.log(await (await fetch(event.url)).text());
        });
    }

    title(): string | React.ReactElement<Translatable> {
        return <>Hello World <LoadingDots textOnly={true} /></>;
    }

    renderBody(): React.ReactElement {
        return <div className={cssStyle.container} >
            <ReactPlayer
                url={"https://www.youtube.com/watch?v=u_TuibFg-GA"}
                height={"100%"}
                width={"100%"}

                onError={(error, data, hlsInstance, hlsGlobal) => console.log("onError(%o, %o, %o, %o)", error, data, hlsInstance, hlsGlobal)}
                onBuffer={() => console.log("onBuffer()")}
                onBufferEnd={() => console.log("onBufferEnd()")}
                onDisablePIP={() => console.log("onDisabledPIP()")}
                onEnablePIP={() => console.log("onEnablePIP()")}
                onDuration={duration => console.log("onDuration(%o)", duration)}
                onEnded={() => console.log("onEnded()")}
                onPause={() => console.log("onPause()")}
                onPlay={() => console.log("onPlay()")}
                onProgress={state => console.log("onProgress(%o)", state)}
                onReady={() => console.log("onReady()")}
                onSeek={seconds => console.log("onSeek(%o)", seconds)}
                onStart={() => console.log("onStart()")}

                controls={true}

                loop={false}
                light={false}
            />
        </div>;
    }
}

export = ModalVideoPopout;

console.error("Hello World from video popout");