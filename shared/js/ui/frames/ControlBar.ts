/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../modal/ModalSettings.ts" />
/// <reference path="../modal/ModalBanList.ts" />
/*
        client_output_hardware Value: '1'
        client_output_muted Value: '0'
        client_outputonly_muted Value: '0'

        client_input_hardware Value: '1'
        client_input_muted Value: '0'

        client_away Value: '0'
        client_away_message Value: ''
 */

let control_bar: ControlBar; /* global variable to access the control bar */

type MicrophoneState = "disabled" | "muted" | "enabled";
type HeadphoneState = "muted" | "enabled";
type AwayState = "away-global" | "away" | "online";
class ControlBar {
    private _button_away_active: AwayState;
    private _button_microphone: MicrophoneState;
    private _button_speakers: HeadphoneState;
    private _button_subscribe_all: boolean;
    private _button_query_visible: boolean;

    private connection_handler: ConnectionHandler | undefined;

    htmlTag: JQuery;
    constructor(htmlTag: JQuery) {
        this.htmlTag = htmlTag;
    }

    initialize_connection_handler_state(handler?: ConnectionHandler) {
        /* setup the state like the last displayed one */
        handler.client_status.output_muted = this._button_speakers === "muted";
        handler.client_status.input_muted = this._button_microphone === "muted";

        handler.client_status.channel_subscribe_all = this._button_subscribe_all;
        handler.client_status.queries_visible = this._button_query_visible;
    }

    set_connection_handler(handler?: ConnectionHandler) {
        if(this.connection_handler == handler)
            return;

        this.connection_handler = handler;
        this.apply_server_state();
    }

    apply_server_state() {
        if(!this.connection_handler)
            return;


        const flag_away = typeof(this.connection_handler.client_status.away) === "string" || this.connection_handler.client_status.away;
        if(!flag_away)
            this.button_away_active = "online";
        else if(flag_away && this._button_away_active === "online")
            this.button_away_active = "away";

        this.button_query_visible = this.connection_handler.client_status.queries_visible;
        this.button_subscribe_all = this.connection_handler.client_status.channel_subscribe_all;

        this.apply_server_voice_state();
    }

    apply_server_voice_state() {
        if(!this.connection_handler)
            return;

        this.button_microphone = !this.connection_handler.client_status.input_hardware ? "disabled" : this.connection_handler.client_status.input_muted ? "muted" : "enabled";
        this.button_speaker = this.connection_handler.client_status.output_muted ? "muted" : "enabled";
    }

    current_connection_handler() {
        return this.connection_handler;
    }

    initialise() {
        let dropdownify = (tag: JQuery) => {
            tag.find(".button-dropdown").on('click', () => {
                tag.addClass("displayed");
            }).hover(() => {
                tag.addClass("displayed");
            }, () => {
                if(tag.find(".dropdown:hover").length > 0)
                    return;
                tag.removeClass("displayed");
            });
            tag.on('mouseleave', () => {
                tag.removeClass("displayed");
            });
        };

        this.htmlTag.find(".btn_connect").on('click', this.on_open_connect.bind(this));
        this.htmlTag.find(".btn_disconnect").on('click', this.on_execute_disconnect.bind(this));

        this.htmlTag.find(".btn_mute_input").on('click', this.on_toggle_microphone.bind(this));
        this.htmlTag.find(".btn_mute_output").on('click', this.on_toggle_sound.bind(this));
        this.htmlTag.find(".button-subscribe-mode").on('click', this.on_toggle_channel_subscribe.bind(this));
        this.htmlTag.find(".btn_query_toggle").on('click', this.on_toggle_query_view.bind(this));

        this.htmlTag.find(".btn_open_settings").on('click', this.on_open_settings.bind(this));
        this.htmlTag.find(".btn_permissions").on('click', this.on_open_permissions.bind(this));
        this.htmlTag.find(".btn_banlist").on('click', this.on_open_banslist.bind(this));
        this.htmlTag.find(".button-playlist-manage").on('click', this.on_open_playlist_manage.bind(this));

        this.htmlTag.find(".btn_token_use").on('click', this.on_token_use.bind(this));
        this.htmlTag.find(".btn_token_list").on('click', this.on_token_list.bind(this));


        {
            this.htmlTag.find(".btn_away_disable").on('click', this.on_away_disable.bind(this));
            this.htmlTag.find(".btn_away_disable_global").on('click', this.on_away_disable_global.bind(this));

            this.htmlTag.find(".btn_away_enable").on('click', this.on_away_enable.bind(this));
            this.htmlTag.find(".btn_away_enable_global").on('click', this.on_away_enable_global.bind(this));

            this.htmlTag.find(".btn_away_message").on('click', this.on_away_set_message.bind(this));
            this.htmlTag.find(".btn_away_message_global").on('click', this.on_away_set_message_global.bind(this));

            this.htmlTag.find(".btn_away_toggle").on('click', this.on_away_toggle.bind(this));
        }

        dropdownify(this.htmlTag.find(".container-disconnect"));
        dropdownify(this.htmlTag.find(".btn_token"));
        dropdownify(this.htmlTag.find(".btn_away"));
        dropdownify(this.htmlTag.find(".btn_bookmark"));
        dropdownify(this.htmlTag.find(".btn_query"));
        dropdownify(this.htmlTag.find(".dropdown-audio"));
        dropdownify(this.htmlTag.find(".dropdown-servertools"));

        {

        }
        {

            this.htmlTag.find(".btn_bookmark_list").on('click', this.on_bookmark_manage.bind(this));
            this.htmlTag.find(".btn_bookmark_add").on('click', this.on_bookmark_server_add.bind(this));

        }
        {

            /* search for query buttons not only on the large device button */
            this.htmlTag.find(".btn_query_create").on('click', this.on_open_query_create.bind(this));
            this.htmlTag.find(".btn_query_manage").on('click', this.on_open_query_manage.bind(this));
        }


        this.update_bookmarks();
        this.update_bookmark_status();

        //Need an initialise
        this.button_speaker = settings.static_global(Settings.KEY_CONTROL_MUTE_OUTPUT, false) ? "muted" : "enabled";
        this.button_microphone = settings.static_global(Settings.KEY_CONTROL_MUTE_INPUT, false) ? "muted" : "enabled";
        this.button_subscribe_all = true;
        this.button_query_visible = false;
    }



    /* Update the UI */
    set button_away_active(flag: AwayState) {
        if(this._button_away_active === flag)
            return;
        this._button_away_active = flag;
        this.update_button_away();
    }
    update_button_away() {
        const button_away_enable = this.htmlTag.find(".btn_away_enable");
        const button_away_disable = this.htmlTag.find(".btn_away_disable");
        const button_away_toggle = this.htmlTag.find(".btn_away_toggle");

        const button_away_disable_global = this.htmlTag.find(".btn_away_disable_global");
        const button_away_enable_global = this.htmlTag.find(".btn_away_enable_global");
        const button_away_message_global = this.htmlTag.find(".btn_away_message_global");

        button_away_toggle.toggleClass("activated", this._button_away_active !== "online");
        button_away_enable.toggle(this._button_away_active === "online");
        button_away_disable.toggle(this._button_away_active !== "online");

        const connections = server_connections.server_connection_handlers();
        if(connections.length <= 1) {
            button_away_disable_global.hide();
            button_away_enable_global.hide();
            button_away_message_global.hide();
        } else {
            button_away_message_global.show();
            button_away_enable_global.toggle(server_connections.server_connection_handlers().filter(e => !e.client_status.away).length > 0);
            button_away_disable_global.toggle(
                this._button_away_active === "away-global" ||
                server_connections.server_connection_handlers().filter(e => typeof(e.client_status.away) === "string" || e.client_status.away).length > 0
            )
        }
    }

    set button_microphone(state: MicrophoneState) {
        if(this._button_microphone === state)
            return;
        this._button_microphone = state;

        let tag = this.htmlTag.find(".btn_mute_input");
        const tag_icon = tag.find(".icon_x32, .icon");
        tag.toggleClass('activated', state === "muted");

        tag_icon
            .toggleClass('client-input_muted', state === "muted")
            .toggleClass('client-capture', state === "enabled")
            .toggleClass('client-activate_microphone', state === "disabled");

        if(state === "disabled")
            tag_icon.attr('title', tr("Enable your microphone on this server"));
        else if(state === "enabled")
            tag_icon.attr('title', tr("Mute microphone"));
        else
            tag_icon.attr('title', tr("Unmute microphone"));
    }

    set button_speaker(state: HeadphoneState) {
        if(this._button_speakers === state)
            return;
        this._button_speakers = state;

        let tag = this.htmlTag.find(".btn_mute_output");
        const tag_icon = tag.find(".icon_x32, .icon");

        tag.toggleClass('activated', state === "muted");
        tag_icon
            .toggleClass('client-output_muted', state !== "enabled")
            .toggleClass('client-volume', state === "enabled");

        if(state === "enabled")
            tag_icon.attr('title', tr("Mute sound"));
        else
            tag_icon.attr('title', tr("Unmute sound"));
    }

    set button_subscribe_all(state: boolean) {
        if(this._button_subscribe_all === state)
            return;
        this._button_subscribe_all = state;

        this.htmlTag
            .find(".button-subscribe-mode")
            .toggleClass('activated', this._button_subscribe_all)
            .find('.icon_x32')
            .toggleClass('client-unsubscribe_from_all_channels', !this._button_subscribe_all)
            .toggleClass('client-subscribe_to_all_channels', this._button_subscribe_all);
    }

    set button_query_visible(state: boolean) {
        if(this._button_query_visible === state)
            return;
        this._button_query_visible = state;

        const button = this.htmlTag.find(".btn_query_toggle");
        button.toggleClass('activated', this._button_query_visible);
        if(this._button_query_visible)
            button.find(".query-text").text(tr("Hide server queries"));
        else
            button.find(".query-text").text(tr("Show server queries"));
    }

    /* UI listener */
    private on_away_toggle() {
        if(this._button_away_active === "away" || this._button_away_active === "away-global")
            this.button_away_active = "online";
        else
            this.button_away_active = "away";
        if(this.connection_handler)
            this.connection_handler.set_away_status(this._button_away_active !== "online");
    }

    private on_away_enable() {
        this.button_away_active = "away";
        if(this.connection_handler)
            this.connection_handler.set_away_status(true);
    }

    private on_away_disable() {
        this.button_away_active = "online";
        if(this.connection_handler)
            this.connection_handler.set_away_status(false);
    }

    private on_away_set_message() {
        createInputModal(tr("Set away message"), tr("Please enter your away message"), message => true, message => {
            if(typeof(message) === "string") {
                this.button_away_active = "away";
                if(this.connection_handler)
                    this.connection_handler.set_away_status(message);
            }
        }).open();
    }

    private on_away_enable_global() {
        this.button_away_active = "away-global";
        for(const connection of server_connections.server_connection_handlers())
            connection.set_away_status(true);
    }

    private on_away_disable_global() {
        this.button_away_active = "online";
        for(const connection of server_connections.server_connection_handlers())
            connection.set_away_status(false);
    }

    private on_away_set_message_global() {
        createInputModal(tr("Set global away message"), tr("Please enter your global away message"), message => true, message => {
            if(typeof(message) === "string") {
                this.button_away_active = "away";
                for(const connection of server_connections.server_connection_handlers())
                    connection.set_away_status(message);
            }
        }).open();
    }



    private on_toggle_microphone() {
        if(this._button_microphone === "disabled" || this._button_microphone === "muted")
            this.button_microphone = "enabled";
        else
            this.button_microphone = "muted";

        if(this.connection_handler) {
            this.connection_handler.client_status.input_muted = this._button_microphone !== "enabled";
            if(!this.connection_handler.client_status.input_hardware)
                this.connection_handler.acquire_recorder(default_recorder, true); /* acquire_recorder already updates the voice status */
            else
                this.connection_handler.update_voice_status(undefined);

            /* just update the last changed value */
            settings.changeGlobal(Settings.KEY_CONTROL_MUTE_INPUT,  this.connection_handler.client_status.input_muted)
        }
    }

    private on_toggle_sound() {
        if(this._button_speakers === "muted")
            this.button_speaker = "enabled";
        else
            this.button_speaker = "muted";

        if(this.connection_handler) {
            this.connection_handler.client_status.output_muted = this._button_speakers !== "enabled";
            this.connection_handler.update_voice_status(undefined);

            /* just update the last changed value */
            settings.changeGlobal(Settings.KEY_CONTROL_MUTE_OUTPUT,  this.connection_handler.client_status.output_muted)
        }
    }

    private on_toggle_channel_subscribe() {
        this.button_subscribe_all = !this._button_subscribe_all;
        if(this.connection_handler) {
            this.connection_handler.client_status.channel_subscribe_all = this._button_subscribe_all;
            if(this._button_subscribe_all)
                this.connection_handler.channelTree.subscribe_all_channels();
            else
                this.connection_handler.channelTree.unsubscribe_all_channels(true);
            this.connection_handler.settings.changeServer(Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL, this._button_subscribe_all);
        }
    }

    private on_toggle_query_view() {
        this.button_query_visible = !this._button_query_visible;
        if(this.connection_handler) {
            this.connection_handler.client_status.queries_visible = this._button_query_visible;
            this.connection_handler.channelTree.toggle_server_queries(this._button_query_visible);
            this.connection_handler.settings.changeServer(Settings.KEY_CONTROL_SHOW_QUERIES, this._button_subscribe_all);
        }
    }

    private on_open_settings() {
        Modals.spawnSettingsModal();
    }

    private on_open_connect() {
        if(this.connection_handler)
            this.connection_handler.cancel_reconnect();
        Modals.spawnConnectModal({
            url: "ts.TeaSpeak.de",
            enforce: false
        });
    }

    update_connection_state() {
        if(this.connection_handler.serverConnection && this.connection_handler.serverConnection.connected()) {
            this.htmlTag.find(".container-disconnect").show();
            this.htmlTag.find(".container-connect").hide();
        } else {
            this.htmlTag.find(".container-disconnect").hide();
            this.htmlTag.find(".container-connect").show();
        }
        /*
        switch (this.connection_handler.serverConnection ? this.connection_handler.serverConnection.connected() : ConnectionState.UNCONNECTED) {
            case ConnectionState.CONNECTED:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                this.htmlTag.find(".container-disconnect").show();
                this.htmlTag.find(".container-connect").hide();
                break;
            default:
                this.htmlTag.find(".container-disconnect").hide();
                this.htmlTag.find(".container-connect").show();
        }
        */
    }

    private on_execute_disconnect() {
        this.connection_handler.cancel_reconnect();
        this.connection_handler.handleDisconnect(DisconnectReason.REQUESTED); //TODO message?
        this.update_connection_state();
        this.connection_handler.sound.play(Sound.CONNECTION_DISCONNECTED);
    }

    private on_token_use() {
        createInputModal(tr("Use token"), tr("Please enter your token/priviledge key"), message => message.length > 0, result => {
            if(!result) return;
            if(this.connection_handler.serverConnection.connected)
                this.connection_handler.serverConnection.send_command("tokenuse", {
                    token: result
                }).then(() => {
                    createInfoModal(tr("Use token"), tr("Toke successfully used!")).open();
                }).catch(error => {
                    //TODO tr
                    createErrorModal(tr("Use token"), "Failed to use token: " + (error instanceof CommandResult ? error.message : error)).open();
                });
        }).open();
    }

    private on_token_list() {
        createErrorModal(tr("Not implemented"), tr("Token list is not implemented yet!")).open();
    }

    private on_open_permissions() {
        let button = this.htmlTag.find(".btn_permissions");
        button.addClass("activated");
        setTimeout(() => {
            if(this.connection_handler)
                Modals.spawnPermissionEdit(this.connection_handler).open();
            else
                createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
            button.removeClass("activated");
        }, 0);
    }

    private on_open_banslist() {
        if(!this.connection_handler.serverConnection) return;

        if(this.connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_BAN_LIST).granted(1)) {
            Modals.openBanList(this.connection_handler);
        } else {
            createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to view the ban list")).open();
            this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
        }
    }

    private on_bookmark_server_add() {
        if(this.connection_handler && this.connection_handler.connected) {
            createInputModal(tr("Enter bookmarks name"), tr("Please enter the bookmarks name:<br>"), text => true, result => {
                if(result) {
                    const bookmark = bookmarks.create_bookmark(result as string, bookmarks.bookmarks(), {
                        server_port: this.connection_handler.serverConnection.remote_address().port,
                        server_address: this.connection_handler.serverConnection.remote_address().host,

                        server_password: "",
                        server_password_hash: ""
                    }, this.connection_handler.getClient().clientNickName());
                    bookmarks.save_bookmark(bookmark);
                    this.update_bookmarks()
                }
            }).open();
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
        }
    }

    update_bookmark_status() {
        this.htmlTag.find(".btn_bookmark_add").removeClass("hidden").addClass("disabled");
        this.htmlTag.find(".btn_bookmark_remove").addClass("hidden");
    }


    update_bookmarks() {
        //<div class="btn_bookmark_connect" target="localhost"><a>Localhost</a></div>
        let tag_bookmark = this.htmlTag.find(".btn_bookmark .dropdown");
        tag_bookmark.find(".bookmark, .directory").detach();

        const build_entry = (bookmark: bookmarks.DirectoryBookmark | bookmarks.Bookmark) => {
            if(bookmark.type == bookmarks.BookmarkType.ENTRY) {
                const mark = <bookmarks.Bookmark>bookmark;

                const bookmark_connect = (new_tab: boolean) => {
                    this.htmlTag.find(".btn_bookmark").find(".dropdown").removeClass("displayed"); //FIXME Not working

                    const profile = profiles.find_profile(mark.connect_profile) || profiles.default_profile();
                    if(profile.valid()) {
                        const connection = this.connection_handler && !new_tab ? this.connection_handler : server_connections.spawn_server_connection_handler();
                        server_connections.set_active_connection_handler(connection);
                        connection.startConnection(
                            mark.server_properties.server_address + ":" + mark.server_properties.server_port,
                            profile,
                            {
                                nickname: mark.nickname,
                                password: {
                                    password: mark.server_properties.server_password_hash,
                                    hashed: true
                                }
                            }
                        );
                    } else {
                        Modals.spawnConnectModal({
                            url: mark.server_properties.server_address + ":" + mark.server_properties.server_port,
                            enforce: true
                        }, {
                            profile: profile,
                            enforce: true
                        })
                    }
                };

                return $.spawn("div")
                        .addClass("bookmark")
                        .append(
                            $.spawn("div").addClass("icon client-server")
                        )
                        .append(
                            $.spawn("div")
                                .addClass("name")
                                .text(bookmark.display_name)
                                .on('click', event => {
                                    if(event.isDefaultPrevented())
                                        return;
                                    bookmark_connect(false);
                                })
                                .on('contextmenu', event => {
                                    if(event.isDefaultPrevented())
                                        return;
                                    event.preventDefault();

                                    contextmenu.spawn_context_menu(event.pageX,  event.pageY, {
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Connect"),
                                        icon_class: 'client-connect',
                                        callback: () => bookmark_connect(false)
                                    }, {
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Connect in a new tab"),
                                        icon_class: 'client-connect',
                                        callback: () => bookmark_connect(true)
                                    }, contextmenu.Entry.CLOSE(() => {
                                        setTimeout(() => {
                                            this.htmlTag.find(".btn_bookmark.button-dropdown").removeClass("force-show")
                                        }, 250);
                                    }));

                                    this.htmlTag.find(".btn_bookmark.button-dropdown").addClass("force-show");
                                })
                        )
            } else {
                const mark = <bookmarks.DirectoryBookmark>bookmark;
                const container = $.spawn("div").addClass("sub-menu dropdown");

                for(const member of mark.content)
                    container.append(build_entry(member));

                return $.spawn("div")
                        .addClass("directory")
                        .append(
                            $.spawn("div").addClass("icon client-folder")
                        )
                        .append(
                            $.spawn("div")
                                .addClass("name")
                                .text(bookmark.display_name)
                        )
                        .append(
                            $.spawn("div").addClass("arrow right")
                        )
                        .append(
                            $.spawn("div").addClass("sub-container")
                                .append(container)
                        )
            }
        };

        for(const bookmark of bookmarks.bookmarks().content) {
            const entry = build_entry(bookmark);
            tag_bookmark.append(entry);
        }
    }

    private on_bookmark_manage() {
        Modals.spawnBookmarkModal();
    }

    private on_open_query_create() {
        if(this.connection_handler.permissions.neededPermission(PermissionType.B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN).granted(1)) {
            Modals.spawnQueryCreate(this.connection_handler);
        } else {
            createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to create a server query login")).open();
            this.connection_handler.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
        }
    }

    private on_open_query_manage() {
        if(this.connection_handler && this.connection_handler.connected) {
            Modals.spawnQueryManage(this.connection_handler);
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
        }
    }

    private on_open_playlist_manage() {
        if(this.connection_handler && this.connection_handler.connected) {
            Modals.spawnPlaylistManage(this.connection_handler);
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
        }
    }
}