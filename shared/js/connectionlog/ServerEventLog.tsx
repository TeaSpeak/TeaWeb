import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {Settings, settings} from "tc-shared/settings";
import {LogMessage, TypeInfo} from "tc-shared/connectionlog/Definitions";
import {findNotificationDispatcher, isNotificationEnabled} from "tc-shared/connectionlog/DispatcherNotifications";
import {isFocusRequestEnabled, requestWindowFocus} from "tc-shared/connectionlog/DispatcherFocus";

let uniqueLogEventId = 0;
export interface ServerEventLogEvents {
    notify_log_add: { event: LogMessage }
}

export class ServerEventLog {
    readonly events: Registry<ServerEventLogEvents>;
    private readonly connection: ConnectionHandler;

    private maxHistoryLength: number = 100;
    private eventLog: LogMessage[] = [];

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.events = new Registry<ServerEventLogEvents>();
    }

    log<T extends keyof TypeInfo>(type: T, data: TypeInfo[T]) {
        const event = {
            data: data,
            timestamp: Date.now(),
            type: type as any,
            uniqueId: "log-" + Date.now() + "-" + (++uniqueLogEventId)
        };

        if(settings.getValue(Settings.FN_EVENTS_LOG_ENABLED(type), true)) {
            this.eventLog.push(event);
            while(this.eventLog.length > this.maxHistoryLength) {
                this.eventLog.pop_front();
            }

            this.events.fire("notify_log_add", { event: event });
        }

        if(isNotificationEnabled(type as any)) {
            const notification = findNotificationDispatcher(type);
            if(notification) notification(data, this.connection.handlerId, type);
        }

        if(isFocusRequestEnabled(type as any)) {
            requestWindowFocus();
        }
    }

    getHistory() : LogMessage[] {
        return this.eventLog;
    }

    destroy() {
        this.events.destroy();
        this.eventLog = undefined;
    }
}