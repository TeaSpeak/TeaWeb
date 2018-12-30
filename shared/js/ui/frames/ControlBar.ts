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
import openBanList = Modals.openBanList;
import spawnConnectModal = Modals.spawnConnectModal;

class ControlBar {
    private _muteInput: boolean;
    private _muteOutput: boolean;
    private _away: boolean;
    private _query_visible: boolean;
    private _awayMessage: string;

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
        {
            let tokens = this.htmlTag.find(".btn_token");
            tokens.find(".button-dropdown").on('click', () => {
                tokens.find(".dropdown").addClass("displayed");
            });
            tokens.on('mouseleave', () => {
                tokens.find(".dropdown").removeClass("displayed");
            });

            tokens.find(".btn_token_use").on('click', this.on_token_use.bind(this));
            tokens.find(".btn_token_list").on('click', this.on_token_list.bind(this));
        }
        {
            let away = this.htmlTag.find(".btn_away");
            away.find(".button-dropdown").on('click', () => {
                away.find(".dropdown").addClass("displayed");
            });
            away.on('mouseleave', () => {
                away.find(".dropdown").removeClass("displayed");
            });

            away.find(".btn_away_toggle").on('click', this.on_away_toggle.bind(this));
            away.find(".btn_away_message").on('click', this.on_away_set_message.bind(this));
        }
        {
            let bookmark = this.htmlTag.find(".btn_bookmark");
            bookmark.find(".button-dropdown").on('click', () => {
                bookmark.find("> .dropdown").addClass("displayed");
            });
            bookmark.on('mouseleave', () => {
                bookmark.find("> .dropdown").removeClass("displayed");
            });
            bookmark.find(".btn_bookmark_list").on('click', this.on_bookmark_manage.bind(this));
            bookmark.find(".btn_bookmark_add").on('click', this.on_bookmark_server_add.bind(this));

            this.update_bookmarks();
            this.update_bookmark_status();
        }
        {
            let query = this.htmlTag.find(".btn_query");
            query.find(".button-dropdown").on('click', () => {
                query.find(".dropdown").addClass("displayed");
            });
            query.on('mouseleave', () => {
                query.find(".dropdown").removeClass("displayed");
            });

            query.find(".btn_query_toggle").on('click', this.on_query_visibility_toggle.bind(this));
            query.find(".btn_query_create").on('click', this.on_query_create.bind(this));
            query.find(".btn_query_manage").on('click', this.on_query_manage.bind(this));
        }

        //Need an initialise
        this.muteInput = settings.global("mute_input") == "1";
        this.muteOutput = settings.global("mute_output") == "1";
        this.query_visibility = settings.global("show_server_queries") == "1";
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
        if(flag) {
            if(!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-input_muted");
        } else {
            if(tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-capture");
        }


        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput
            });
        settings.changeGlobal("mute_input", this._muteInput);
        this.updateMicrophoneRecordState();
    }

    get muteOutput() : boolean { return this._muteOutput; }

    set muteOutput(flag: boolean) {
        if(this._muteOutput == flag) return;
        this._muteOutput = flag;

        let tag = this.htmlTag.find(".btn_mute_output");
        if(flag) {
            if(!tag.hasClass("activated"))
                tag.addClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-output_muted");
        } else {
            if(tag.hasClass("activated"))
                tag.removeClass("activated");
            tag.find(".icon_x32").attr("class", "icon_x32 client-volume");
        }

        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_output_muted: this._muteOutput
            });
        settings.changeGlobal("mute_output", this._muteOutput);
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
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_away: this._away,
                client_away_message: this._awayMessage
            });
        this.updateMicrophoneRecordState();
    }

    private updateMicrophoneRecordState() {
        let enabled = !this._muteInput && !this._muteOutput && !this._away;
        this.handle.voiceConnection.voiceRecorder.update(enabled);
    }

    updateProperties() {
        if(this.handle.serverConnection.connected)
            this.handle.serverConnection.sendCommand("clientupdate", {
                client_input_muted: this._muteInput,
                client_output_muted: this._muteOutput,
                client_away: this._away,
                client_away_message: this._awayMessage,
                client_input_hardware: this.codec_supported && this.support_record,
                client_output_hardware: this.codec_supported && this.support_playback
            });
    }

    updateVoice(targetChannel?: ChannelEntry) {
        if(!targetChannel) targetChannel = this.handle.getClient().currentChannel();
        let client = this.handle.getClient();

        this.codec_supported = targetChannel ? this.handle.voiceConnection.codecSupported(targetChannel.properties.channel_codec) : true;
        this.support_record = this.handle.voiceConnection.voice_send_support();
        this.support_playback = this.handle.voiceConnection.voice_playback_support();

        this.htmlTag.find(".btn_mute_input").prop("disabled", !this.codec_supported|| !this.support_playback || !this.support_record);
        this.htmlTag.find(".btn_mute_output").prop("disabled", !this.codec_supported || !this.support_playback);
        this.handle.serverConnection.sendCommand("clientupdate", {
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
        this.handle.handleDisconnect(DisconnectReason.REQUESTED); //TODO message?
        this.update_connection_state();
        sound.play(Sound.CONNECTION_DISCONNECTED);
    }

    private on_token_use() {
        createInputModal(tr("Use token"), tr("Please enter your token/priviledge key"), message => message.length > 0, result => {
            if(!result) return;
            if(this.handle.serverConnection.connected)
                this.handle.serverConnection.sendCommand("tokenuse", {
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
            openBanList(this.handle);
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

    get query_visibility() {
        return this._query_visible;
    }

    set query_visibility(flag: boolean) {
        if(this._query_visible == flag) return;

        this._query_visible = flag;
        settings.global("show_server_queries", flag);
        this.update_query_visibility_button();
        this.handle.channelTree.toggle_server_queries(flag);
    }

    private on_query_visibility_toggle() {
        this.query_visibility = !this._query_visible;
        this.update_query_visibility_button();
    }

    private update_query_visibility_button() {
        let tag = this.htmlTag.find(".btn_query_toggle");
        if(this._query_visible) {
            tag.addClass("activated");
        } else {
            tag.removeClass("activated");
        }
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
}