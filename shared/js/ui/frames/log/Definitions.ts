import {LogMessage} from "tc-shared/connectionlog/Definitions";

export interface ServerEventLogUiEvents {
    query_handler_id: {},
    query_log: {},

    notify_log_add: {
        event: LogMessage
    },
    notify_log: {
        events: LogMessage[]
    },
    notify_handler_id: {
        handlerId: string | undefined
    }
}