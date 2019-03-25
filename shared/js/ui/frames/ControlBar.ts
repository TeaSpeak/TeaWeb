/// <reference path="../../client.ts" />
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

class ControlBar {
    private _muteInput: boolean;
    private _muteOutput: boolean;
    private _away: boolean;
    private _query_visible: boolean;
    private _awayMessage: string;
    private _channel_subscribe_all: boolean;

    private codec_supported: boolean = false;
    private support_playback: boolean = false;
    private support_record: boolean = false;

    readonly handle: TSClient;
    htmlTag: JQuery;

    constructor(handle: TSClient, htmlTag: JQuery) {
        this.handle = handle;
        this.htmlTag = htmlTag;
    }

    initialise() {
        this.htmlTag.find(".btn_connect").on('click', this.onConnect.bind(this));
        this.htmlTag.find(".btn_disconnect").on('click', this.onDisconnect.bind(this));
        this.htmlTag.find(".btn_mute_input").on('click', this.onInputMute.bind(this));
        this.htmlTag.find(".btn_mute_output").on('click', this.onOutputMute.bind(this));
        this.htmlTag.find(".btn_open_settings").on('click', this.onOpenSettings.bind(this));
        this.htmlTag.find(".btn_permissions").on('click', this.onPermission.bind(this));
        this.htmlTag.find(".btn_banlist").on('click', this.onBanlist.bind(this));
        this.htmlTag.find(".button-subscribe-mode").on('click', this.on_toggle_channel_subscribe_all.bind(this));
        this.htmlTag.find(".button-playlist-manage").on('click', this.on_playlist_manage.bind(this));

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
        {
            let tokens = this.htmlTag.find(".btn_token");
            dropdownify(tokens);

            tokens.find(".btn_token_use").on('click', this.on_token_use.bind(this));
            tokens.find(".btn_token_list").on('click', this.on_token_list.bind(this));
        }
        {
            let away = this.htmlTag.find(".btn_away");
            dropdownify(away);

            away.find(".btn_away_toggle").on('click', this.on_away_toggle.bind(this));
            away.find(".btn_away_message").on('click', this.on_away_set_message.bind(this));
        }
        {
            let bookmark = this.htmlTag.find(".btn_bookmark");
            dropdownify(bookmark);

            bookmark.find(".btn_bookmark_list").on('click', this.on_bookmark_manage.bind(this));
            bookmark.find(".btn_bookmark_add").on('click', this.on_bookmark_server_add.bind(this));

            this.update_bookmarks();
            this.update_bookmark_status();
        }
        {
            let query = this.htmlTag.find(".btn_query");
            dropdownify(query);

            /* search for query buttons not only on the large device button */
            this.htmlTag.find(".btn_query_toggle").on('click', this.on_query_visibility_toggle.bind(this));
            this.htmlTag.find(".btn_query_create").on('click', this.on_query_create.bind(this));
            this.htmlTag.find(".btn_query_manage").on('click', this.on_query_manage.bind(this));
        }

        /* Mobile dropdowns */
        {
            const dropdown = this.htmlTag.find(".dropdown-audio");
            dropdownify(dropdown);
            dropdown.find(".button-display").on('click', () => dropdown.addClass("displayed"));
        }
        {
            const dropdown = this.htmlTag.find(".dropdown-servertools");
            dropdownify(dropdown);
            dropdown.find(".button-display").on('click', () => dropdown.addClass("displayed"));
        }

        //Need an initialise
        this.muteInput = settings.static_global(Settings.KEY_CONTROL_MUTE_INPUT, false);
        this.muteOutput = settings.static_global(Settings.KEY_CONTROL_MUTE_OUTPUT, false);
        this.query_visible = settings.static_global(Settings.KEY_CONTROL_SHOW_QUERIES, false);
        this.channel_subscribe_all = settings.static_global(Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL, true);
    }


    on_away_toggle() {
        this._awayMessage = "";
        this.away = !this._away;
    }

    on_away_set_message() {
        createInputModal(tr("Set away message"), tr("Please enter the away message"), message => true, message => {
            if(message)
                this.away = message;
        }).open();
    }

    onInputMute() {
        this.muteInput = !this._muteInput;
    }

    onOutputMute() {
        this.muteOutput = !this._muteOutput;
    }

    set muteInput(flag: boolean) {
        if(this._muteInput == flag) return;
        this._muteInput = flag;

        let tag = this.htmlTag.find(".btn_mute_input");
        const tag_icon = tag.find(".icon_x32, .icon");

        tag.toggleClass('activated', flag)

        tag_icon
            .toggleClass('client-input_muted', flag)
            .toggleClass('client-capture', !flag);


        if(this.handle.serverConnection.connected())
            this.handle.serverConnection.send_command("clientupdate", {
                client_input_muted: this._muteInput
            });
        settings.changeGlobal(Settings.KEY_CONTROL_MUTE_INPUT, this._muteInput);
        this.updateMicrophoneRecordState();
    }

    get muteOutput() : boolean { return this._muteOutput; }

    set muteOutput(flag: boolean) {
        if(this._muteOutput == flag) return;
        this._muteOutput = flag;


        let tag = this.htmlTag.find(".btn_mute_output");
        const tag_icon = tag.find(".icon_x32, .icon");

        tag.toggleClass('activated', flag)

        tag_icon
            .toggleClass('client-output_muted', flag)
            .toggleClass('client-volume', !flag);

        if(this.handle.serverConnection.connected())
            this.handle.serverConnection.send_command("clientupdate", {
                client_output_muted: this._muteOutput
            });
        settings.changeGlobal(Settings.KEY_CONTROL_MUTE_OUTPUT, this._muteOutput);
        this.updateMicrophoneRecordState();
    }

    set away(value: boolean | string) {
        if(typeof(value) == "boolean") {
            if(this._away == value) return;
            this._away = value;
            this._awayMessage = "";
        } else {
            this._awayMessage = value;
            this._away = true;
        }

        let tag = this.htmlTag.find(".btn_away_toggle");
        if( this._away) {
            tag.addClass("activated");
        } else {
            tag.removeClass("activated");
        }

        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.send_command("clientupdate", {
                client_away: this._away,
                client_away_message: this._awayMessage
            });
        this.updateMicrophoneRecordState();
    }

    private updateMicrophoneRecordState() {
        let enabled = !this._muteInput && !this._muteOutput && !this._away;
        if(this.handle.voiceConnection)
            this.handle.voiceConnection.voiceRecorder.update(enabled);
    }

    updateProperties() {
        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.send_command("clientupdate", {
                client_input_muted: this._muteInput,
                client_output_muted: this._muteOutput,
                client_away: this._away,
                client_away_message: this._awayMessage,
                client_input_hardware: this.codec_supported && this.support_record,
                client_output_hardware: this.codec_supported && this.support_playback
            });
    }

    updateVoice(targetChannel?: ChannelEntry) {
        if(!targetChannel)
            targetChannel = this.handle.getClient().currentChannel();
        let client = this.handle.getClient();

        this.codec_supported = targetChannel ? this.handle.voiceConnection && this.handle.voiceConnection.codecSupported(targetChannel.properties.channel_codec) : true;
        this.support_record = this.handle.voiceConnection && this.handle.voiceConnection.voice_send_support();
        this.support_playback = this.handle.voiceConnection && this.handle.voiceConnection.voice_playback_support();

        this.htmlTag.find(".btn_mute_input").prop("disabled", !this.codec_supported|| !this.support_playback || !this.support_record);
        this.htmlTag.find(".btn_mute_output").prop("disabled", !this.codec_supported || !this.support_playback);
        this.handle.serverConnection.send_command("clientupdate", {
            client_input_hardware: this.codec_supported && this.support_record,
            client_output_hardware: this.codec_supported && this.support_playback
        });

        if(!this.codec_supported)
            createErrorModal(tr("Channel codec unsupported"), tr("This channel has an unsupported codec.<br>You cant speak or listen to anybody within this channel!")).open();

        /* Update these properties anyways (for case the server fails to handle the command) */
        client.updateVariables(
            {key: "client_input_hardware", value: (this.codec_supported && this.support_record) + ""},
            {key: "client_output_hardware", value: (this.codec_supported && this.support_playback) + ""}
        );
    }

    private onOpenSettings() {
        Modals.spawnSettingsModal();
    }

    private onConnect() {
        this.handle.cancel_reconnect();
        Modals.spawnConnectModal({
            url: "ts.TeaSpeak.de",
            enforce: false
        });
    }

    update_connection_state() {
        switch (this.handle.serverConnection ? this.handle.serverConnection._connectionState : ConnectionState.UNCONNECTED) {
            case ConnectionState.CONNECTED:
            case ConnectionState.CONNECTING:
            case ConnectionState.INITIALISING:
                this.htmlTag.find(".btn_disconnect").show();
                this.htmlTag.find(".btn_connect").hide();
                break;
            default:
                this.htmlTag.find(".btn_disconnect").hide();
                this.htmlTag.find(".btn_connect").show();
        }
    }

    private onDisconnect() {
        this.handle.cancel_reconnect();
        this.handle.handleDisconnect(DisconnectReason.REQUESTED); //TODO message?
        this.update_connection_state();
        sound.play(Sound.CONNECTION_DISCONNECTED);
    }

    private on_token_use() {
        createInputModal(tr("Use token"), tr("Please enter your token/priviledge key"), message => message.length > 0, result => {
            if(!result) return;
            if(this.handle.serverConnection.connected)
                this.handle.serverConnection.send_command("tokenuse", {
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

    private onPermission() {
        let button = this.htmlTag.find(".btn_permissions");
        button.addClass("activated");
        setTimeout(() => {
            Modals.spawnPermissionEdit().open();
            button.removeClass("activated");
        }, 0);
    }

    private onBanlist() {
        if(!this.handle.serverConnection) return;

        if(this.handle.permissions.neededPermission(PermissionType.B_CLIENT_BAN_LIST).granted(1)) {
            Modals.openBanList(this.handle);
        } else {
            createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to view the ban list")).open();
            sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
        }
    }

    private on_bookmark_server_add() {
        if(globalClient && globalClient.connected) {
            createInputModal(tr("Enter bookmarks name"), tr("Please enter the bookmarks name:<br>"), text => true, result => {
                if(result) {
                    const bookmark = bookmarks.create_bookmark(result as string, bookmarks.bookmarks(), {
                        server_port: globalClient.serverConnection._remote_address.port,
                        server_address: globalClient.serverConnection._remote_address.host,

                        server_password: "",
                        server_password_hash: ""
                    }, globalClient.getClient().clientNickName());
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
                                    this.htmlTag.find(".btn_bookmark").find(".dropdown").removeClass("displayed");
                                    const profile = profiles.find_profile(mark.connect_profile) || profiles.default_profile();
                                    if(profile.valid()) {
                                        this.handle.startConnection(
                                            mark.server_properties.server_address + ":" + mark.server_properties.server_port,
                                            profile,
                                            mark.nickname,
                                            {
                                                password: mark.server_properties.server_password_hash,
                                                hashed: true
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

    get query_visible() {
        return this._query_visible;
    }

    set query_visible(flag: boolean) {
        if(this._query_visible == flag) return;

        this._query_visible = flag;
        settings.changeGlobal(Settings.KEY_CONTROL_SHOW_QUERIES, flag);
        this.update_query_visibility_button();
        this.handle.channelTree.toggle_server_queries(flag);
    }

    private on_query_visibility_toggle() {
        this.query_visible = !this._query_visible;
        this.update_query_visibility_button();
    }

    private update_query_visibility_button() {
        const button = this.htmlTag.find(".btn_query_toggle");
        button.toggleClass('activated', this._query_visible);
        if(this._query_visible)
            button.find(".query-text").text(tr("Hide server queries"));
        else
            button.find(".query-text").text(tr("Show server queries"));
    }

    private on_query_create() {
        if(this.handle.permissions.neededPermission(PermissionType.B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN).granted(1)) {
            Modals.spawnQueryCreate();
        } else {
            createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to create a server query login")).open();
            sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
        }
    }

    private on_query_manage() {
        if(globalClient && globalClient.connected) {
            Modals.spawnQueryManage(globalClient);
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
        }
    }

    private on_playlist_manage() {
        if(this.handle && this.handle.connected) {
            Modals.spawnPlaylistManage(this.handle);
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
        }
    }

    get channel_subscribe_all() : boolean {
        return this._channel_subscribe_all;
    }

    set channel_subscribe_all(flag: boolean) {
        if(this._channel_subscribe_all == flag)
            return;

        this._channel_subscribe_all = flag;

        this.htmlTag
        .find(".button-subscribe-mode")
            .toggleClass('activated', this._channel_subscribe_all)
        .find('.icon_x32')
            .toggleClass('client-unsubscribe_from_all_channels', !this._channel_subscribe_all)
            .toggleClass('client-subscribe_to_all_channels', this._channel_subscribe_all);

        settings.changeGlobal(Settings.KEY_CONTROL_CHANNEL_SUBSCRIBE_ALL, flag);

        if(flag)
            this.handle.channelTree.subscribe_all_channels();
        else
            this.handle.channelTree.unsubscribe_all_channels();
    }

    private on_toggle_channel_subscribe_all() {
        this.channel_subscribe_all = !this.channel_subscribe_all;
    }
}