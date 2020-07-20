import {ConnectionHandler, DisconnectReason} from "tc-shared/ConnectionHandler";
import {Settings, settings} from "tc-shared/settings";
import * as top_menu from "./MenuBar";
import {Registry} from "tc-shared/events";

export let server_connections: ConnectionManager;
export function initialize() {
    if(server_connections) throw tr("Connection manager has already been initialized");
    server_connections = new ConnectionManager($("#connection-handlers"));
}
export class ConnectionManager {
    private readonly event_registry: Registry<ConnectionManagerEvents>;
    private connection_handlers: ConnectionHandler[] = [];
    private active_handler: ConnectionHandler | undefined;

    private _container_log_server: JQuery;
    private _container_channel_tree: JQuery;
    private _container_hostbanner: JQuery;
    private _container_chat: JQuery;

    private _tag: JQuery;
    private _tag_connection_entries: JQuery;
    private _tag_buttons_scoll: JQuery;
    private _tag_button_scoll_right: JQuery;
    private _tag_button_scoll_left: JQuery;

    constructor(tag: JQuery) {
        this.event_registry = new Registry<ConnectionManagerEvents>();
        this.event_registry.enableDebug("connection-manager");

        this._tag = tag;

        if(settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION, false))
            this._tag.hide();

        this._tag_connection_entries = this._tag.find(".connection-handlers");
        this._tag_buttons_scoll = this._tag.find(".container-scroll");
        this._tag_button_scoll_left = this._tag_buttons_scoll.find(".button-scroll-left");
        this._tag_button_scoll_right = this._tag_buttons_scoll.find(".button-scroll-right");

        this._tag_button_scoll_left.on('click', this._button_scroll_left_clicked.bind(this));
        this._tag_button_scoll_right.on('click', this._button_scroll_right_clicked.bind(this));

        this._container_log_server = $("#server-log");
        this._container_channel_tree = $("#channelTree");
        this._container_hostbanner = $("#hostbanner");
        this._container_chat = $("#chat");

        this.set_active_connection(undefined);
    }

    events() : Registry<ConnectionManagerEvents> {
        return this.event_registry;
    }

    spawn_server_connection() : ConnectionHandler {
        const handler = new ConnectionHandler();
        handler.initialize_client_state(this.active_handler);
        this.connection_handlers.push(handler);

        handler.tag_connection_handler.appendTo(this._tag_connection_entries);
        this._tag.toggleClass("shown", this.connection_handlers.length > 1);
        this._update_scroll();

        this.event_registry.fire("notify_handler_created", { handler: handler });
        return handler;
    }

    destroy_server_connection(handler: ConnectionHandler) {
        if(this.connection_handlers.length <= 1)
            throw "cannot deleted the last connection handler";

        if(!this.connection_handlers.remove(handler))
            throw "unknown connection handler";

        handler.tag_connection_handler.remove();
        this._update_scroll();
        this._tag.toggleClass("shown", this.connection_handlers.length > 1);

        if(handler.serverConnection) {
            const connected = handler.connected;
            handler.serverConnection.disconnect("handler destroyed");
            handler.handleDisconnect(DisconnectReason.HANDLER_DESTROYED, connected);
        }

        if(handler === this.active_handler)
            this.set_active_connection_(this.connection_handlers[0]);
        this.event_registry.fire("notify_handler_deleted", { handler: handler });

        /* destroy all elements */
        handler.destroy();
    }

    set_active_connection(handler: ConnectionHandler) {
        if(handler && this.connection_handlers.indexOf(handler) == -1)
            throw "Handler hasn't been registered or is already obsolete!";
        if(handler === this.active_handler)
            return;
        this.set_active_connection_(handler);
    }

    private set_active_connection_(handler: ConnectionHandler) {
        this._tag_connection_entries.find(".active").removeClass("active");
        this._container_channel_tree.children().detach();
        this._container_chat.children().detach();
        this._container_log_server.children().detach();
        this._container_hostbanner.children().detach();

        if(handler) {
            handler.tag_connection_handler.addClass("active");

            this._container_hostbanner.append(handler.hostbanner.html_tag);
            this._container_channel_tree.append(handler.channelTree.tag_tree());
            this._container_chat.append(handler.side_bar.html_tag());
            this._container_log_server.append(handler.log.html_tag());

            if(handler.invoke_resized_on_activate)
                handler.resize_elements();
        }
        const old_handler = this.active_handler;
        this.active_handler = handler;
        this.event_registry.fire("notify_active_handler_changed", {
            old_handler: old_handler,
            new_handler: handler
        });
        old_handler?.events().fire("notify_visibility_changed", { visible: false });
        handler?.events().fire("notify_visibility_changed", { visible: true });

        top_menu.update_state(); //FIXME: Top menu should listen to our events!
    }

    findConnection(handlerId: string) : ConnectionHandler | undefined {
        return this.connection_handlers.find(e => e.handlerId === handlerId);
    }

    active_connection() : ConnectionHandler | undefined {
        return this.active_handler;
    }

    all_connections() : ConnectionHandler[] {
        return this.connection_handlers;
    }

    update_ui() {
        this._update_scroll();
    }

    private _update_scroll() {
        const has_scroll = this._tag_connection_entries.hasScrollBar("width")
            && this._tag_connection_entries.width() + 10 >= this._tag_connection_entries.parent().width();

        this._tag_buttons_scoll.toggleClass("enabled", has_scroll);
        this._tag.toggleClass("scrollbar", has_scroll);

        if(has_scroll)
            this._update_scroll_buttons();
    }

    private _button_scroll_right_clicked() {
        this._tag_connection_entries.scrollLeft((this._tag_connection_entries.scrollLeft() || 0) + 50);
        this._update_scroll_buttons();
    }

    private _button_scroll_left_clicked() {
        this._tag_connection_entries.scrollLeft((this._tag_connection_entries.scrollLeft() || 0) - 50);
        this._update_scroll_buttons();
    }

    private _update_scroll_buttons() {
        const scroll = this._tag_connection_entries.scrollLeft() || 0;
        this._tag_button_scoll_left.toggleClass("disabled", scroll <= 0);
        this._tag_button_scoll_right.toggleClass("disabled", scroll + this._tag_connection_entries.width() + 2 >= this._tag_connection_entries[0].scrollWidth);
    }
}

export interface ConnectionManagerEvents {
    notify_handler_created: {
        handler: ConnectionHandler
    },

    /* This will also trigger when a connection gets deleted. So if you're just interested to connect event handler to the active connection,
        unregister them from the old handler and register them for the new handler every time */
    notify_active_handler_changed: {
        old_handler: ConnectionHandler | undefined,
        new_handler: ConnectionHandler | undefined
    },

    /* Will never fire on an active connection handler! */
    notify_handler_deleted: {
        handler: ConnectionHandler
    }
}