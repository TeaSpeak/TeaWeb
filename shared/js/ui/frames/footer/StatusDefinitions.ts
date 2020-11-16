export type ConnectionStatus = {
    type: "healthy",
    /* only for component stati */
    bytesReceived?: number,
    bytesSend?: number
} | {
    type: "unhealthy",
    reason: string,
    /* try reconnect attribute */
} | {
    type: "connecting-signalling",
    state: "initializing" | "connecting" | "authentication"
} | {
    type: "connecting-voice"
} | {
    type: "connecting-video"
} | {
    type: "disconnected"
} | {
    type: "unsupported",
    side: "server" | "client"
}

export type ConnectionComponent = "signaling" | "video" | "voice";

export interface ConnectionStatusEvents {
    action_toggle_component_detail: { shown: boolean | undefined },

    query_component_detail_state: {},
    query_component_status: { component: ConnectionComponent },
    query_connection_status: {},

    notify_component_detail_state: {
        shown: boolean
    },
    notify_component_status: {
        component: ConnectionComponent,
        status: ConnectionStatus
    },
    notify_connection_status: {
        status: ConnectionStatus,
    }
}