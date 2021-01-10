import {Registry} from "tc-shared/events";
import {ConnectionListUIEvents, HandlerConnectionState} from "tc-shared/ui/frames/connection-handler-list/Definitions";
import {server_connections} from "tc-shared/ConnectionManager";
import {LogCategory, logWarn} from "tc-shared/log";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import {tr} from "tc-shared/i18n/localize";

export function initializeConnectionListController(events: Registry<ConnectionListUIEvents>) {
    let registeredHandlerEvents: {[key: string]:(() => void)[]} = {};

    events.on("notify_destroy", () => {
        Object.keys(registeredHandlerEvents).forEach(handlerId => registeredHandlerEvents[handlerId].forEach(callback => callback()));
        registeredHandlerEvents = {};
    });

    events.on("query_handler_list", () => {
        events.fire_react("notify_handler_list", { handlerIds: server_connections.getAllConnectionHandlers().map(e => e.handlerId), activeHandlerId: server_connections.getActiveConnectionHandler()?.handlerId });
    });
    events.on("notify_destroy", server_connections.events().on("notify_handler_created", event => {
        let listeners = [];

        const handlerId = event.handlerId;
        listeners.push(event.handler.events().on("notify_connection_state_changed", () => events.fire_react("query_handler_status", { handlerId: handlerId })));

        /* register to icon and name change updates */
        listeners.push(event.handler.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_name" in event.updated_properties || "virtualserver_icon_id" in event.updated_properties) {
                events.fire_react("query_handler_status", { handlerId: handlerId });
            }
        }));

        /* register to voice playback change events */
        listeners.push(event.handler.getServerConnection().getVoiceConnection().events.on("notify_voice_replay_state_change", () => {
            events.fire_react("query_handler_status", { handlerId: handlerId });
        }));

        registeredHandlerEvents[event.handlerId] = listeners;

        events.fire_react("query_handler_list");
    }));
    events.on("notify_destroy", server_connections.events().on("notify_handler_deleted", event => {
        (registeredHandlerEvents[event.handlerId] || []).forEach(callback => callback());
        delete registeredHandlerEvents[event.handlerId];

        events.fire_react("query_handler_list");
    }));

    events.on("notify_destroy", server_connections.events().on("notify_handler_order_changed", () => events.fire_react("query_handler_list")));
    events.on("action_swap_handler", event => {
        const handlerA = server_connections.findConnection(event.handlerIdOne);
        const handlerB = server_connections.findConnection(event.handlerIdTwo);

        if(!handlerA || !handlerB) {
            logWarn(LogCategory.CLIENT, tr("Tried to switch handler %s with %s, but one of them does not exists"), event.handlerIdOne, event.handlerIdTwo);
            return;
        }

        server_connections.swapHandlerOrder(handlerA, handlerB);
    });


    events.on("action_set_active_handler", event => {
        const handler = server_connections.findConnection(event.handlerId);
        if(!handler) {
            logWarn(LogCategory.CLIENT, tr("Tried to activate an invalid server connection handler with id %s"), event.handlerId);
            return;
        }

        server_connections.setActiveConnectionHandler(handler);
    });
    events.on("notify_destroy", server_connections.events().on("notify_active_handler_changed", event => {
        events.fire_react("notify_active_handler", { handlerId: event.newHandlerId });
    }));

    events.on("action_destroy_handler", event => {
        const handler = server_connections.findConnection(event.handlerId);
        if(!handler) {
            logWarn(LogCategory.CLIENT, tr("Tried to destroy an invalid server connection handler with id %s"), event.handlerId);
            return;
        }

        server_connections.destroyConnectionHandler(handler);
    });


    events.on("query_handler_status", event => {
        const handler = server_connections.findConnection(event.handlerId);
        if(!handler) {
            logWarn(LogCategory.CLIENT, tr("Tried to query a status for an invalid server connection handler with id %s"), event.handlerId);
            return;
        }

        let state: HandlerConnectionState;
        switch (handler.connection_state) {
            case ConnectionState.CONNECTED:
                state = "connected";
                break;

            case ConnectionState.AUTHENTICATING:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                state = "connecting";
                break;

            default:
                state = "disconnected";
                break;
        }

        events.fire_react("notify_handler_status", {
            handlerId: event.handlerId,
            status: {
                handlerName: handler.channelTree.server.properties.virtualserver_name,
                connectionState: state,
                voiceReplaying: handler.getServerConnection().getVoiceConnection().isReplayingVoice(),
                serverIcon: { iconId: handler.channelTree.server.properties.virtualserver_icon_id, serverUniqueId: handler.getCurrentServerUniqueId() }
            }
        });
    });
}