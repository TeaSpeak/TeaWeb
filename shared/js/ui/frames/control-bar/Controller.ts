import {Registry} from "tc-shared/events";
import {
    Bookmark,
    ControlBarEvents,
    ControlBarMode,
    HostButtonInfo
} from "tc-shared/ui/frames/control-bar/Definitions";
import {server_connections} from "tc-shared/ConnectionManager";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {Settings, settings} from "tc-shared/settings";
import {global_client_actions} from "tc-shared/events/GlobalEvents";
import {
    add_server_to_bookmarks,
    Bookmark as ServerBookmark, bookmarkEvents,
    bookmarks,
    bookmarks_flat,
    BookmarkType,
    boorkmak_connect,
    DirectoryBookmark
} from "tc-shared/bookmarks";
import {LogCategory, logWarn} from "tc-shared/log";
import {createInputModal} from "tc-shared/ui/elements/Modal";

class InfoController {
    private readonly mode: ControlBarMode;
    private readonly events: Registry<ControlBarEvents>;
    private currentHandler: ConnectionHandler;

    private globalEvents: (() => void)[] = [];
    private globalHandlerRegisteredEvents: {[key: string]: (() => void)[]} = {};
    private handlerRegisteredEvents: (() => void)[] = [];

    constructor(events: Registry<ControlBarEvents>, mode: ControlBarMode) {
        this.events = events;
        this.mode = mode;
    }

    public getCurrentHandler() : ConnectionHandler { return this.currentHandler; }
    public getMode() : ControlBarMode { return this.mode; }

    public initialize() {
        server_connections.all_connections().forEach(handler => this.registerGlobalHandlerEvents(handler));

        const events = this.globalEvents;
        events.push(server_connections.events().on("notify_handler_created", event => {
            this.registerGlobalHandlerEvents(event.handler);
            this.sendConnectionState();
            this.sendAwayState();
        }));
        events.push(server_connections.events().on("notify_handler_deleted", event => {
            this.unregisterGlobalHandlerEvents(event.handler);
            this.sendConnectionState();
            this.sendAwayState();
        }));
        events.push(bookmarkEvents.on("notify_bookmarks_updated", () => this.sendBookmarks()));

        if(this.mode === "main") {
            events.push(server_connections.events().on("notify_active_handler_changed", event => this.setConnectionHandler(event.newHandler)));
        }

        this.setConnectionHandler(server_connections.active_connection());
    }

    public destroy() {
        server_connections.all_connections().forEach(handler => this.unregisterGlobalHandlerEvents(handler));
        this.unregisterCurrentHandlerEvents();

        this.globalEvents.forEach(callback => callback());
        this.globalEvents = [];
    }

    private registerGlobalHandlerEvents(handler: ConnectionHandler) {
        const events = this.globalHandlerRegisteredEvents[handler.handlerId] = [];

        events.push(handler.events().on("notify_connection_state_changed", () => this.sendConnectionState()));
        events.push(handler.events().on("notify_state_updated", event => {
            if(event.state === "away") { this.sendAwayState(); }
        }));
    }

    private unregisterGlobalHandlerEvents(handler: ConnectionHandler) {
        const callbacks = this.globalHandlerRegisteredEvents[handler.handlerId];
        if(!callbacks) { return; }

        delete this.globalHandlerRegisteredEvents[handler.handlerId];
        callbacks.forEach(callback => callback());
    }

    private registerCurrentHandlerEvents(handler: ConnectionHandler) {
        const events = this.handlerRegisteredEvents;

        events.push(handler.events().on("notify_connection_state_changed", event => {
            if(event.old_state === ConnectionState.CONNECTED || event.new_state === ConnectionState.CONNECTED) {
                this.sendHostButton();
            }
        }));

        events.push(handler.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_hostbutton_gfx_url" in event.updated_properties ||
                "virtualserver_hostbutton_url" in event.updated_properties ||
                "virtualserver_hostbutton_tooltip" in event.updated_properties) {
                this.sendHostButton();
            }
        }));

        events.push(handler.events().on("notify_state_updated", event => {
            if(event.state === "microphone") {
                this.sendMicrophoneState();
            } else if(event.state === "speaker") {
                this.sendSpeakerState();
            } else if(event.state === "query") {
                this.sendQueryState();
            } else if(event.state === "subscribe") {
                this.sendSubscribeState();
            }
        }));
    }

    private unregisterCurrentHandlerEvents() {
        this.handlerRegisteredEvents.forEach(callback => callback());
        this.handlerRegisteredEvents = [];
    }


    public setConnectionHandler(handler: ConnectionHandler) {
        if(handler === this.currentHandler) { return; }

        this.currentHandler = handler;
        this.unregisterCurrentHandlerEvents();
        this.registerCurrentHandlerEvents(handler);

        /* update all states */
        this.sendConnectionState();
        this.sendBookmarks(); /* not really required, not directly related to the connection handler */
        this.sendAwayState();
        this.sendMicrophoneState();
        this.sendSpeakerState();
        this.sendSubscribeState();
        this.sendQueryState();
        this.sendHostButton();
    }

    public sendConnectionState() {
        const globallyConnected = server_connections.all_connections().findIndex(e => e.connected) !== -1;
        const locallyConnected = this.currentHandler?.connected;
        const multisession = !settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION);

        this.events.fire_async("notify_connection_state", {
            state: {
                currentlyConnected: locallyConnected,
                generallyConnected: globallyConnected,
                multisession: multisession
            }
        });
    }

    public sendBookmarks() {
        const buildInfo = (bookmark: DirectoryBookmark | ServerBookmark) => {
            if(bookmark.type === BookmarkType.DIRECTORY) {
                return {
                    uniqueId: bookmark.unique_id,
                    label: bookmark.display_name,
                    children: bookmark.content.map(buildInfo)
                } as Bookmark;
            } else {
                return {
                    uniqueId: bookmark.unique_id,
                    label: bookmark.display_name,
                    icon: bookmark.last_icon_id ? { iconId: bookmark.last_icon_id, serverUniqueId: bookmark.last_icon_server_id } : undefined
                } as Bookmark;
            }
        };

        this.events.fire_async("notify_bookmarks", {
            marks: bookmarks().content.map(buildInfo)
        });
    }

    public sendAwayState() {
        const globalAwayCount = server_connections.all_connections().filter(handler => handler.isAway()).length;
        const awayLocally = !!this.currentHandler?.isAway();

        this.events.fire_async("notify_away_state", {
            state: {
                globallyAway: globalAwayCount === server_connections.all_connections().length ? "full" : globalAwayCount > 0 ? "partial" : "none",
                locallyAway: awayLocally
            }
        });
    }

    public sendMicrophoneState() {
        this.events.fire_async("notify_microphone_state", {
            state: this.currentHandler?.isMicrophoneDisabled() ? "disabled" : this.currentHandler?.isMicrophoneMuted() ? "muted" : "enabled"
        });
    }

    public sendSpeakerState() {
        this.events.fire_async("notify_speaker_state", {
            enabled: !this.currentHandler?.isSpeakerMuted()
        });
    }

    public sendSubscribeState() {
        this.events.fire_async("notify_subscribe_state", {
            subscribe: !!this.currentHandler?.isSubscribeToAllChannels()
        });
    }

    public sendQueryState() {
        this.events.fire_async("notify_query_state", {
            shown: !!this.currentHandler?.areQueriesShown()
        });
    }

    public sendHostButton() {
        let info: HostButtonInfo;

        if(this.currentHandler?.connected) {
            const properties = this.currentHandler.channelTree.server.properties;
            info = properties.virtualserver_hostbutton_gfx_url ? {
                url: properties.virtualserver_hostbutton_gfx_url,
                target: properties.virtualserver_hostbutton_url,
                title: properties.virtualserver_hostbutton_tooltip
            } : undefined;
        }

        this.events.fire_async("notify_host_button", {
            button: info
        });
    }
}

export function initializePopoutControlBarController(events: Registry<ControlBarEvents>, handler: ConnectionHandler) {
    const infoHandler = initializeControlBarController(events, "channel-popout");
    infoHandler.setConnectionHandler(handler);
}

export function initializeClientControlBarController(events: Registry<ControlBarEvents>) {
    initializeControlBarController(events, "main");
}

export function initializeControlBarController(events: Registry<ControlBarEvents>, mode: ControlBarMode) : InfoController {
    const infoHandler = new InfoController(events, mode);
    infoHandler.initialize();

    events.on("notify_destroy", () => infoHandler.destroy());

    events.on("query_mode", () => events.fire_async("notify_mode", { mode: infoHandler.getMode() }));
    events.on("query_connection_state", () => infoHandler.sendConnectionState());
    events.on("query_bookmarks", () => infoHandler.sendBookmarks());
    events.on("query_away_state", () => infoHandler.sendAwayState());
    events.on("query_microphone_state", () => infoHandler.sendMicrophoneState());
    events.on("query_speaker_state", () => infoHandler.sendSpeakerState());
    events.on("query_subscribe_state", () => infoHandler.sendSubscribeState());
    events.on("query_host_button", () => infoHandler.sendHostButton());

    events.on("action_connection_connect", event => global_client_actions.fire("action_open_window_connect", { newTab: event.newTab }));
    events.on("action_connection_disconnect", event => {
        (event.generally ? server_connections.all_connections() : [infoHandler.getCurrentHandler()]).filter(e => !!e).forEach(connection => {
            connection.disconnectFromServer().then(() => {});
        });
    });

    events.on("action_bookmark_manage", () => global_client_actions.fire("action_open_window", { window: "bookmark-manage" }));
    events.on("action_bookmark_add_current_server", () => add_server_to_bookmarks(infoHandler.getCurrentHandler()));
    events.on("action_bookmark_connect", event => {
        const bookmark = bookmarks_flat().find(mark => mark.unique_id === event.bookmarkUniqueId);
        if(!bookmark) {
            logWarn(LogCategory.BOOKMARKS, tr("Tried to connect to a non existing bookmark with id %s"), event.bookmarkUniqueId);
            return;
        }

        boorkmak_connect(bookmark, event.newTab);
    });

    events.on("action_toggle_away", event => {
        if(event.away) {
            const setAway = message => {
                const value = typeof message === "string" ? message : true;
                (event.globally ? server_connections.all_connections() : [server_connections.active_connection()]).filter(e => !!e).forEach(connection => {
                    connection.setAway(value);
                });
                settings.changeGlobal(Settings.KEY_CLIENT_STATE_AWAY, true);
                settings.changeGlobal(Settings.KEY_CLIENT_AWAY_MESSAGE, typeof value === "boolean" ? "" : value);
            };

            if(event.promptMessage) {
                createInputModal(tr("Set away message"), tr("Please enter your away message"), () => true, message => {
                    if(typeof(message) === "string")
                        setAway(message);
                }).open();
            } else {
                setAway(undefined);
            }
        } else {
            for(const connection of event.globally ? server_connections.all_connections() : [server_connections.active_connection()]) {
                if(!connection) continue;

                connection.setAway(false);
            }

            settings.changeGlobal(Settings.KEY_CLIENT_STATE_AWAY, false);
        }
    });

    events.on("action_toggle_microphone", event => {
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_MICROPHONE_MUTED,  !event.enabled);

        const current_connection_handler = infoHandler.getCurrentHandler();
        if(current_connection_handler) {
            current_connection_handler.setMicrophoneMuted(!event.enabled);
            current_connection_handler.acquireInputHardware().then(() => {});
        }
    });

    events.on("action_toggle_speaker", event => {
        /* change the default global setting */
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_SPEAKER_MUTED, !event.enabled);

        infoHandler.getCurrentHandler()?.setSpeakerMuted(!event.enabled);
    });

    events.on("action_toggle_subscribe", event => {
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_SUBSCRIBE_ALL_CHANNELS, event.subscribe);

        infoHandler.getCurrentHandler()?.setSubscribeToAllChannels(event.subscribe);
    });

    events.on("action_toggle_query", event => {
        settings.changeGlobal(Settings.KEY_CLIENT_STATE_QUERY_SHOWN, event.show);

        infoHandler.getCurrentHandler()?.setQueriesShown(event.show);
    });
    events.on("action_query_manage", () => {
        global_client_actions.fire("action_open_window", { window: "query-manage" });
    });

    return infoHandler;
}