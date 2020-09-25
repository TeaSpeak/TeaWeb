import {RemoteIconInfo} from "tc-shared/file/Icons";

export type MouseMoveCoordinates = { x: number, y: number, xOffset: number };
export type HandlerConnectionState = "disconnected" | "connecting" | "connected";

export type HandlerStatus = {
    connectionState: HandlerConnectionState,
    handlerName: string,
    voiceReplaying: boolean,
    serverIcon: RemoteIconInfo | undefined
}

export interface ConnectionListUIEvents {
    action_set_active_handler: { handlerId: string },
    action_destroy_handler: { handlerId: string },
    action_scroll: { direction: "left" | "right" },
    action_move_handler: {
        handlerId: string | undefined,
        mouse?: MouseMoveCoordinates
    },
    action_set_moving_position: {
        offsetX: number,
        width: number
    },
    action_swap_handler: {
        handlerIdOne: string,
        handlerIdTwo: string
    }

    query_handler_status: { handlerId: string },
    query_handler_list: {},

    notify_handler_list: {
        handlerIds: string[],
        activeHandlerId: string | undefined
    },
    notify_active_handler: {
        handlerId: string
    },
    notify_handler_status: {
        handlerId: string,
        status: HandlerStatus
    },
    notify_scroll_status: {
        left: boolean,
        right: boolean
    },
    notify_destroy: {}
}