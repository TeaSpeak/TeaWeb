import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {LogMessage, ServerLogUIEvents, TypeInfo} from "tc-shared/ui/frames/log/Definitions";
import {Registry} from "tc-shared/events";
import * as ReactDOM from "react-dom";
import {ServerLogRenderer} from "tc-shared/ui/frames/log/Renderer";
import {findNotificationDispatcher} from "tc-shared/ui/frames/log/DispatcherNotifications";

const cssStyle = require("./Renderer.scss");

let uniqueLogEventId = 0;
export class ServerEventLog {
    private readonly connection: ConnectionHandler;
    private readonly uiEvents: Registry<ServerLogUIEvents>;
    private htmlTag: HTMLDivElement;

    private maxHistoryLength: number = 100;

    private eventLog: LogMessage[] = [];

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.uiEvents = new Registry<ServerLogUIEvents>();
        this.htmlTag = document.createElement("div");
        this.htmlTag.classList.add(cssStyle.htmlTag);

        this.uiEvents.on("query_log", () => {
            this.uiEvents.fire_async("notify_log", { log: this.eventLog });
        });

        ReactDOM.render(<ServerLogRenderer events={this.uiEvents} handlerId={this.connection.handlerId} />, this.htmlTag);
    }

    log<T extends keyof TypeInfo>(type: T, data: TypeInfo[T]) {
        const event = {
            data: data,
            timestamp: Date.now(),
            type: type as any,
            uniqueId: "log-" + Date.now() + "-" + (++uniqueLogEventId)
        };

        this.eventLog.push(event);
        while(this.eventLog.length > this.maxHistoryLength)
            this.eventLog.pop_front();

        this.uiEvents.fire_async("notify_log_add", { event: event });

        const notification = findNotificationDispatcher(type);
        if(notification) notification(data, this.connection.handlerId, type);
    }

    getHTMLTag() {
        return this.htmlTag;
    }

    destroy() {
        if(this.htmlTag) {
            ReactDOM.unmountComponentAtNode(this.htmlTag);
            this.htmlTag?.remove();
            this.htmlTag = undefined;
        }

        this.eventLog = undefined;
    }
}