import {AbstractModal} from "tc-shared/ui/react-elements/Modal";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {VideoViewerEvents} from "./Definitions";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {Slider} from "tc-shared/ui/react-elements/Slider";

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
        return <div style={{ padding: "10em" }}>
            <Slider value={100} minValue={0} maxValue={100} stepSize={1} onInput={value => this.events.fire("notify_value", { value: value })} />
        </div>;
    }
}

export = ModalVideoPopout;

console.error("Hello World from video popout");