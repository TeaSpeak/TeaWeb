import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {LogMessage, ServerLogUIEvents, TypeInfo} from "tc-shared/ui/frames/log/Definitions";
import {Registry} from "tc-shared/events";
import * as ReactDOM from "react-dom";
import {ServerLogRenderer} from "tc-shared/ui/frames/log/Renderer";
import {findNotificationDispatcher, isNotificationEnabled} from "tc-shared/ui/frames/log/DispatcherNotifications";
import {Settings, settings} from "tc-shared/settings";
import {isFocusRequestEnabled, requestWindowFocus} from "tc-shared/ui/frames/log/DispatcherFocus";

const cssStyle = require("./Renderer.scss");

let uniqueLogEventId = 0;
export class ServerEventLog {
    private readonly connection: ConnectionHandler;
    private readonly uiEvents: Registry<ServerLogUIEvents>;
    private readonly listenerHandlerVisibilityChanged;

    private htmlTag: HTMLDivElement;

    private maxHistoryLength: number = 100;

    private eventLog: LogMessage[] = [];

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.uiEvents = new Registry<ServerLogUIEvents>();
        this.htmlTag = document.createElement("div");
        this.htmlTag.classList.add(cssStyle.htmlTag);

        this.uiEvents.on("query_log", () => {
            this.uiEvents.fire_react("notify_log", { log: this.eventLog.slice() });
        });

        ReactDOM.render(<ServerLogRenderer events={this.uiEvents} handlerId={this.connection.handlerId} />, this.htmlTag);

        this.connection.events().on("notify_visibility_changed",  this.listenerHandlerVisibilityChanged =event => {
            if(event.visible) {
                this.uiEvents.fire("notify_show");
            }
        });
    }

    log<T extends keyof TypeInfo>(type: T, data: TypeInfo[T]) {
        const event = {
            data: data,
            timestamp: Date.now(),
            type: type as any,
            uniqueId: "log-" + Date.now() + "-" + (++uniqueLogEventId)
        };

        if(settings.global(Settings.FN_EVENTS_LOG_ENABLED(type), true)) {
            this.eventLog.push(event);
            while(this.eventLog.length > this.maxHistoryLength)
                this.eventLog.pop_front();

            this.uiEvents.fire_react("notify_log_add", { event: event });
        }

        if(isNotificationEnabled(type as any)) {
            const notification = findNotificationDispatcher(type);
            if(notification) notification(data, this.connection.handlerId, type);
        }

        if(isFocusRequestEnabled(type as any)) {
            requestWindowFocus();
        }
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

        this.connection.events().off(this.listenerHandlerVisibilityChanged);
        this.eventLog = undefined;

        this.uiEvents.destroy();
    }
}