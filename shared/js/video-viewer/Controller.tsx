import {spawnExternalModal} from "tc-shared/ui/react-elements/external-modal";
import {Registry} from "tc-shared/events";
import {VideoViewerEvents} from "./Definitions";
import {Modal, spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import * as React from "react";
import {useState} from "react";

const NumberRenderer = (props: { events: Registry<VideoViewerEvents> }) => {
    const [ value, setValue ] = useState("unset");

    props.events.reactUse("notify_value", event => setValue(event.value + ""));

    return <>{value}</>;
};

export function spawnVideoPopout() {
    const registry = new Registry<VideoViewerEvents>();
    const modalController = spawnExternalModal("video-viewer", registry, {});
    modalController.open().then(() => {
        const url = URL.createObjectURL(new Blob(["Hello World"], { type: "plain/text" }));
        registry.fire("notify_data_url", { url: url });
    });

    spawnReactModal(class extends Modal {
        constructor() {
            super();
        }

        title() {
            return "Hello World";
        }
        renderBody() {
            return <h1>Hello World: <NumberRenderer events={registry} /></h1>;
        }
    }).show();
}