import {Registry} from "tc-shared/events";
import {ServerEventLogUiEvents} from "tc-shared/ui/frames/log/Definitions";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";

export class ServerEventLogController {
    readonly events: Registry<ServerEventLogUiEvents>;

    private currentConnection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    constructor() {
        this.events = new Registry<ServerEventLogUiEvents>();

        this.events.on("query_handler_id", () => this.events.fire_react("notify_handler_id", { handlerId: this.currentConnection?.handlerId }));
        this.events.on("query_log", () => this.sendLogs());
    }

    destroy() {
        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];

        this.events.destroy();
    }

    setConnectionHandler(handler: ConnectionHandler) {
        if(this.currentConnection === handler) {
            return;
        }

        this.listenerConnection?.forEach(callback => callback());
        this.listenerConnection = [];

        this.currentConnection = handler;

        if(this.currentConnection) {
            this.listenerConnection.push(this.currentConnection.log.events.on("notify_log_add", event => {
                this.events.fire_react("notify_log_add", { event: event.event });
            }));
        }

        this.events.fire_react("notify_handler_id", { handlerId: handler?.handlerId });
    }


    private sendLogs() {
        const logs = this.currentConnection?.log.getHistory() || [];
        this.events.fire_react("notify_log", { events: logs });
    }
}