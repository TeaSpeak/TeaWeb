
let server_connections: ServerConnectionManager;

class ServerConnectionManager {
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

        this.set_active_connection_handler(undefined);
    }

    spawn_server_connection_handler() : ConnectionHandler {
        const handler = new ConnectionHandler();
        this.connection_handlers.push(handler);
        control_bar.update_button_away();
        control_bar.initialize_connection_handler_state(handler);

        handler.tag_connection_handler.appendTo(this._tag_connection_entries);
        this._tag.toggleClass("shown", this.connection_handlers.length > 1);
        this._update_scroll();
        return handler;
    }

    destroy_server_connection_handler(handler: ConnectionHandler) {
        this.connection_handlers.remove(handler);
        handler.tag_connection_handler.remove();
        this._update_scroll();
        this._tag.toggleClass("shown", this.connection_handlers.length > 1);

        if(handler.serverConnection) {
            const connected = handler.connected;
            handler.serverConnection.disconnect("handler destroyed");
            handler.handleDisconnect(DisconnectReason.HANDLER_DESTROYED, connected);
        }

        if(handler === this.active_handler)
            this.set_active_connection_handler(this.connection_handlers[0]);

        /* destroy all elements */
        handler.destroy();
    }

    set_active_connection_handler(handler: ConnectionHandler) {
        if(handler && this.connection_handlers.indexOf(handler) == -1)
            throw "Handler hasn't been registered or is already obsolete!";

        this._tag_connection_entries.find(".active").removeClass("active");
        this._container_channel_tree.children().detach();
        this._container_chat.children().detach();
        this._container_log_server.children().detach();
        this._container_hostbanner.children().detach();

        control_bar.set_connection_handler(handler);
        if(handler) {
            handler.tag_connection_handler.addClass("active");

            this._container_hostbanner.append(handler.hostbanner.html_tag);
            this._container_channel_tree.append(handler.channelTree.tag_tree());
            this._container_chat.append(handler.side_bar.html_tag());
            this._container_log_server.append(handler.log.html_tag());

            if(handler.invoke_resized_on_activate)
                handler.resize_elements();
        }
        top_menu.update_state();
        this.active_handler = handler;
    }

    active_connection_handler() : ConnectionHandler | undefined {
        return this.active_handler;
    }

    server_connection_handlers() : ConnectionHandler[] {
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