import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {useState} from "react";
import * as ReactDOM from "react-dom";
import {ClientStatusIndicator} from "tc-shared/ui/tree/Client";
import {server_connections} from "tc-shared/ConnectionManager";

import {
    ClientIcon,
    spriteEntries as kClientSpriteEntries,
    spriteUrl as kClientSpriteUrl
} from "svg-sprites/client-icons";

let iconImage: HTMLImageElement;
async function initializeFaviconRenderer() {
    iconImage = new Image();
    iconImage.src = kClientSpriteUrl;
    await new Promise((resolve, reject) => {
        iconImage.onload = resolve;
        iconImage.onerror = () => reject("failed to load client icon sprite");
    });

    let container = document.createElement("span");
    ReactDOM.render(ReactDOM.createPortal(<FaviconRenderer />, document.head), container, () => {
        document.getElementById("favicon").remove();
    });
    //container.remove();
}

function clientIconToDataUrl(icon: ClientIcon) : string | undefined {
    const sprite = kClientSpriteEntries.find(e => e.className === icon);
    if(!sprite) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = sprite.width;
    canvas.height = sprite.height;

    const context = canvas.getContext("2d");
    context.drawImage(iconImage, sprite.xOffset, sprite.yOffset, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);

    return canvas.toDataURL();
}

const FaviconRenderer = () => {
    const [ handler, setHandler ] = useState<ConnectionHandler>(server_connections.active_connection());

    server_connections.events().reactUse("notify_active_handler_changed", event => setHandler(event.newHandler));

    return handler ? <HandlerFaviconRenderer connection={handler} key={"handler-" + handler.handlerId} /> : <DefaultFaviconRenderer key={"default"} />;
};

const DefaultFaviconRenderer = () => <link key={"normal"} rel={"shortcut icon"} href={"img/favicon/teacup.png"} type={"image/x-icon"} />;
const ClientIconFaviconRenderer = (props: { icon: ClientIcon }) => {
    const url = clientIconToDataUrl(props.icon);
    if(!url) {
        return <DefaultFaviconRenderer key={"broken"} />;
    } else {
        return <link key={"status"} rel={"shortcut icon"} href={url} type={"image/x-icon"}/>;
    }
};

const HandlerFaviconRenderer = (props: { connection: ConnectionHandler }) => {
    const [ showClientStatus, setShowClientStatus ] = useState(props.connection.connection_state === ConnectionState.CONNECTED);
    props.connection.events().reactUse("notify_connection_state_changed", event => setShowClientStatus(event.new_state === ConnectionState.CONNECTED));

    if(showClientStatus) {
        return <ClientStatusIndicator
            client={props.connection.getClient()}
            renderer={icon => <ClientIconFaviconRenderer icon={icon} key={icon} />}
            key={"server"}
        />;
    } else {
        return <DefaultFaviconRenderer key={"default"} />;
    }
}


loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "favicon renderer",
    function: initializeFaviconRenderer,
    priority: 10
});