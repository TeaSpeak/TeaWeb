import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {useState} from "react";
import * as ReactDOM from "react-dom";
import {server_connections} from "tc-shared/ConnectionManager";

import {
    ClientIcon,
    spriteEntries as kClientSpriteEntries,
    spriteUrl as kClientSpriteUrl
} from "svg-sprites/client-icons";
import {Registry} from "tc-shared/events";

interface FaviconEvents {
    query_icon: {},
    notify_icon: { icon: ClientIcon | undefined }
}

let iconImage: HTMLImageElement;
async function initializeFaviconRenderer() {
    const events = new Registry<FaviconEvents>();
    initializeFaviconController(events);

    iconImage = new Image();
    iconImage.src = kClientSpriteUrl;
    await new Promise((resolve, reject) => {
        iconImage.onload = resolve;
        iconImage.onerror = () => reject("failed to load client icon sprite");
    });

    let container = document.createElement("span");
    ReactDOM.render(ReactDOM.createPortal(<FaviconRenderer events={events} />, document.head), container, () => {
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

function initializeFaviconController(events: Registry<FaviconEvents>) {
    let currentHandler: ConnectionHandler;
    let currentEvents: (() => void)[] = [];

    server_connections.events().on("notify_active_handler_changed", event => setCurrentHandler(event.newHandler));

    const setCurrentHandler = (handler: ConnectionHandler) => {
        finalizeCurrentHandler();
        if(handler) {
            initializeCurrentHandler(handler);
        }
        currentHandler = handler;
        sendFavicon();
    }

    const initializeCurrentHandler = (handler: ConnectionHandler) => {
        currentEvents.push(handler.events().on("notify_connection_state_changed", () => sendFavicon()));
        currentEvents.push(handler.getClient().events.on("notify_status_icon_changed", () => sendFavicon()));
    };

    const finalizeCurrentHandler = () => {
        currentEvents.forEach(callback => callback());
        currentEvents = [];
    }

    const sendFavicon = () => {
        let icon: ClientIcon;

        if(currentHandler?.connection_state === ConnectionState.CONNECTED) {
            icon = currentHandler.getClient().getStatusIcon();
        }

        events.fire_async("notify_icon", { icon: icon })
    };

    setCurrentHandler(server_connections.active_connection());
    events.on("query_icon", () => sendFavicon());
}

const DefaultFaviconRenderer = () => <link key={"normal"} rel={"shortcut icon"} href={"img/favicon/teacup.png"} type={"image/x-icon"} />;
const ClientIconFaviconRenderer = (props: { icon: ClientIcon }) => {
    const url = clientIconToDataUrl(props.icon);
    if(!url) {
        return <DefaultFaviconRenderer key={"broken"} />;
    } else {
        return <link key={"status"} rel={"shortcut icon"} href={url} type={"image/x-icon"}/>;
    }
};

const FaviconRenderer = (props: { events: Registry<FaviconEvents> }) => {
    const [ favicon, setFavicon ] = useState<ClientIcon>(() => {
        props.events.fire("query_icon");
        return undefined;
    });
    props.events.reactUse("notify_icon", event => setFavicon(event.icon));

    if(!favicon) {
        return <DefaultFaviconRenderer key={"default"} />;
    } else {
        return <ClientIconFaviconRenderer icon={favicon} key={"icon-" + favicon} />;
    }
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "favicon renderer",
    function: initializeFaviconRenderer,
    priority: 10
});