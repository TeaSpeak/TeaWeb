/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnPlaylistSongInfo(song: PlaylistSong) {
        let modal: Modal;

        modal = createModal({
            header: tr("Song info"),
            body: () => {
                try {
                    (<any>song).metadata = JSON.parse(song.song_metadata);
                } catch(e) {}

                let template = $("#tmpl_playlist_edit-song_info").renderTag(song);
                template = $.spawn("div").append(template);
                const text_area = template.find(".property-metadata-raw textarea");

                template.find(".toggle-metadata").on('click', event => {
                    if(text_area.is(":visible")) {
                        template.find(".toggle-metadata").text("show");
                    } else {
                        template.find(".toggle-metadata").text("hide");
                    }
                    text_area.slideToggle({duration: 250});
                });
                text_area.hide();

                return template;
            },
            footer: undefined,
            width: 750
        });

        modal.open();
    }

    export function spawnSongAdd(playlist: Playlist, callback_add: (url: string, loader: string) => any) {
        let modal: Modal;

        modal = createModal({
            header: tr("Add a song"),
            body: () => {
                let template = $("#tmpl_playlist_edit-song_add").renderTag();
                template = $.spawn("div").append(template);

                const url = template.find(".property-url .value");
                const url_loader = template.find(".property-loader .value");
                const button_add = template.find(".container-buttons .button-add");
                const button_cancel = template.find(".container-buttons .button-cancel");

                url.on('change keyup', event => {
                    button_add.prop("disabled", url.val().toString().length == 0);
                }).trigger('change');

                button_cancel.on('click', event => modal.close());
                button_add.on('click', event => {
                    callback_add(url.val() as string, url_loader.val() as string);
                    modal.close();
                });
                return template;
            },
            footer: undefined,
            width: 750
        });

        modal.open();
    }

    export function spawnPlaylistEdit(client: ConnectionHandler, playlist: Playlist) {
        {
            createErrorModal(tr("Not implemented"), tr("Playlist editing hasn't yet been implemented")).open();
            return;
        }

        let modal: Modal;
        let changed_properties = {};
        let changed_permissions = {};
        let callback_permission_update: () => any;

        const update_save = () => {
            const save_button = modal.htmlTag.find(".buttons .button-save");
            save_button.prop("disabled", (Object.keys(changed_properties).length + Object.keys(changed_permissions).length) == 0);
        };

        modal = createModal({
            header: tr("Edit playlist"),
            body: () => {
                let template = $("#tmpl_playlist_edit").renderTag().tabify();

                callback_permission_update = apply_permissions(template, client, playlist, (key, value) => {
                    console.log("Change permission %o => %o", key, value);
                    changed_permissions[key] = value;
                    update_save();
                });
                const callback_song_id = apply_songs(template, client, playlist);
                apply_properties(template, client, playlist, (key, value) => {
                    console.log("Change property %o => %o", key, value);
                    changed_properties[key] = value;
                    update_save();
                }, callback_song_id);

                template.find(".buttons .button-save").on('click', event => {
                    if(Object.keys(changed_properties).length != 0) {
                        changed_properties["playlist_id"] = playlist.playlist_id;
                        client.serverConnection.send_command("playlistedit", changed_properties).then(() => {
                            changed_properties = {};
                            update_save();
                        }).catch(error => {
                            if(error instanceof CommandResult)
                                error = error.extra_message || error.message;
                            createErrorModal(tr("Failed to change properties."), tr("Failed to change playlist properties.<br>Error: ") + error).open();
                        });
                    }
                    if(Object.keys(changed_permissions).length != 0) {
                        const array: any[] = [];

                        for(const permission_key of Object.keys(changed_permissions)) {
                            array.push({
                                permvalue: changed_permissions[permission_key],
                                permnegated: false,
                                permskip: false,
                                permsid: permission_key
                            });
                        }

                        array[0]["playlist_id"] = playlist.playlist_id;
                        client.serverConnection.send_command("playlistaddperm", array).then(() => {
                            changed_permissions = {};
                            update_save();
                        }).catch(error => {
                            if(error instanceof CommandResult)
                                error = error.extra_message || error.message;
                            createErrorModal(tr("Failed to change permission."), tr("Failed to change playlist permissions.<br>Error: ") + error).open();
                        });
                    }
                });

                template.find(".buttons .button-close").on('click', event => {
                    if((Object.keys(changed_properties).length + Object.keys(changed_permissions).length) != 0) {
                        spawnYesNo(tr("Are you sure?"), tr("Do you really want to discard all your changes?"), result => {
                            if(result)
                                modal.close();
                        });
                        return;
                    }
                    modal.close();
                });
                return template;
            },
            footer: undefined,
            width: 750
        });
        update_save();

        modal.open();
        return modal;
    }

    function apply_songs(tag: JQuery, client: ConnectionHandler, playlist: Playlist) {
        const owns_playlist = playlist.playlist_owner_dbid == client.getClient().properties.client_database_id;
        const song_tag = tag.find(".container-songs");

        let replaying_song_id: number = 0;
        let selected_song: PlaylistSong;

        const set_song_info = (text: string) => {
            const tag = song_tag.find(".info-message");
            if(text && text.length > 0) {
                tag.text(text).show();
            } else
                tag.hide();
        };

        const set_current_song = (id: number) => {
            /* this method shall enforce an update */
            replaying_song_id = id;
            update_songs();
        };

        const update_songs = () => {
            set_song_info(tr("loading song list"));
            client.serverConnection.command_helper.request_playlist_songs(playlist.playlist_id).then(result => {
                const entries_tag = song_tag.find(".song-list-entries");
                const entry_template = $("#tmpl_playlist_edit-song_entry");
                entries_tag.empty();

                for(const song of result) {
                    const rendered = entry_template.renderTag(song);

                    rendered.find(".button-info").on('click', event => {
                        spawnPlaylistSongInfo(song);
                    });

                    const button_delete = rendered.find(".button-delete");
                    if(!owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_SONG_REMOVE_POWER).granted(playlist.needed_power_song_remove))
                        button_delete.detach();
                    else
                        button_delete.on('click', event => {
                            client.serverConnection.send_command("playlistsongremove", {
                                playlist_id: playlist.playlist_id,
                                song_id: song.song_id
                            }).then(() => {
                                rendered.slideToggle({duration: 250, done(animation: JQuery.Promise<any>, jumpedToEnd: boolean): void {
                                    rendered.detach();
                                }});
                                rendered.hide(250);
                            }).catch(error => {
                                if(error instanceof CommandResult)
                                    error = error.extra_message || error.message;
                                createErrorModal(tr("Failed to remove song."), tr("Failed to remove song/url from the playlist.<br>Error: ") + error).open();
                            });
                        });

                    if(song.song_id == replaying_song_id)
                        rendered.addClass("playing");

                    rendered.on('click', event => {
                        selected_song = song;
                        entries_tag.find(".selected").removeClass("selected");
                        rendered.addClass("selected");
                    });

                    entries_tag.append(rendered);
                }

                const entry_container = song_tag.find(".song-list-entries-container");
                if(entry_container.hasScrollBar())
                    entry_container.addClass("scrollbar");

                set_song_info("displaying " + result.length + " songs");
            }).catch(error => {
                console.error(error);
                set_song_info(tr("failed to load song list"));
                //TODO improve error handling!
            });
        };

        song_tag.find(".button-refresh").on('click', event => update_songs());
        song_tag.find(".button-song-add").on('click', event => {
            spawnSongAdd(playlist, (url, loader) => {
                //playlist_id invoker previous url
                client.serverConnection.send_command("playlistsongadd", {
                    playlist_id: playlist.playlist_id,
                    invoker: loader,
                    url: url
                }).then(() => {
                    update_songs();
                }).catch(error => {
                    if(error instanceof CommandResult)
                        error = error.extra_message || error.message;
                    createErrorModal(tr("Failed to add song."), tr("Failed to add song/url to the playlist.<br>Error: ") + error).open();
                });
            });
        }).prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_SONG_ADD_POWER).granted(playlist.needed_power_song_add));
        /* setTimeout(update_songs, 100); */ /* We dont have to call that here because it will get called over set_current_song when we received the current song id */

        return set_current_song;
    }

    function apply_permissions(tag: JQuery, client: ConnectionHandler, playlist: Playlist, change_permission: (key: string, value: number) => any) {
        const owns_playlist = playlist.playlist_owner_dbid == client.getClient().properties.client_database_id;
        const permission_tag = tag.find(".container-permissions");
        const nopermission_tag = tag.find(".container-no-permissions");

        const update_permissions = () => {
            if(!client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_PLAYLIST_PERMISSION_LIST).granted(1)) {
                nopermission_tag.show();
                permission_tag.hide();
            } else {
                nopermission_tag.hide();
                permission_tag.show();

                permission_tag.find(".permission input").prop("disabled", true);
                client.permissions.requestPlaylistPermissions(playlist.playlist_id).then(permissions => {
                    permission_tag.find(".permission input")
                        .val(0)
                        .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_PERMISSION_MODIFY_POWER).granted(playlist.needed_power_permission_modify));

                    for(const permission of permissions) {
                        const tag = permission_tag.find(".permission[permission='" + permission.type.name + "']");
                        if(permission.value != -2)
                            tag.find("input").val(permission.value);
                    }
                });
            }
        };

        permission_tag.find(".permission").each((index, _element) => {
            const element = $(_element);
            element.find("input").on('change', event => {
                console.log(element.find("input").val());
                change_permission(element.attr("permission"), parseInt(element.find("input").val().toString()));
            });
        });

        update_permissions();
        return update_permissions;
    }

    function apply_properties(tag: JQuery, client: ConnectionHandler, playlist: Playlist, change_property: (key: string, value: string) => any, callback_current_song: (id: number) => any) {
        const owns_playlist = playlist.playlist_owner_dbid == client.getClient().properties.client_database_id;

        client.serverConnection.command_helper.request_playlist_info(playlist.playlist_id).then(info => {
            tag.find(".property-owner input")
                .val(info.playlist_owner_name + " (" + info.playlist_owner_dbid + ")");

            tag.find(".property-title input")
                .val(info.playlist_title)
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_title", (<HTMLInputElement>event.target).value);
                });

            tag.find(".property-description textarea")
                .val(info.playlist_description)
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_description", (<HTMLInputElement>event.target).value);
                });

            tag.find(".property-type select")
                .val(info.playlist_type.toString())
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_description", (<HTMLSelectElement>event.target).selectedIndex.toString());
                });

            tag.find(".property-replay-mode select")
                .val(info.playlist_replay_mode.toString())
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_replay_mode", (<HTMLSelectElement>event.target).selectedIndex.toString());
                });

            tag.find(".property-flag-delete-played input")
                .prop("checked", info.playlist_flag_delete_played)
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_flag_delete_played", (<HTMLInputElement>event.target).checked ? "1" : "0");
                });

            tag.find(".property-current-song input")
                .val(info.playlist_current_song_id);
            callback_current_song(info.playlist_current_song_id);

            tag.find(".property-flag-finished input")
                .prop("checked", info.playlist_flag_finished)
                .prop("disabled", !owns_playlist && !client.permissions.neededPermission(PermissionType.I_PLAYLIST_MODIFY_POWER).granted(playlist.needed_power_modify))
                .on('change', event => {
                    change_property("playlist_flag_finished", (<HTMLInputElement>event.target).checked ? "1" : "0");
                });
        }).catch(error => {
            if(error instanceof CommandResult)
                error = error.extra_message || error.message;
            createErrorModal(tr("Failed to query playlist info"), tr("Failed to query playlist info.<br>Error:") + error).open();
        });
    }
}