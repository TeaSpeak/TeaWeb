/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../i18n/localize.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnPlaylistManage(client: ConnectionHandler) {
        {
            createErrorModal(tr("Not implemented"), tr("Playlist management hasn't yet been implemented")).open();
            return;
        }


        let modal: Modal;
        let selected_playlist: Playlist;
        let available_playlists: Playlist[];
        let highlight_own = settings.global("playlist-list-highlight-own", true);

        const update_selected = () => {
            const buttons = modal.htmlTag.find(".header .buttons");

            buttons.find(".button-playlist-edit").prop(
                "disabled",
                !selected_playlist
            );
            buttons.find(".button-playlist-delete").prop(
                "disabled",
                !selected_playlist || !( /* not owner or permission */
                    client.permissions.neededPermission(PermissionType.I_PLAYLIST_DELETE_POWER).granted(selected_playlist.needed_power_delete) || /* client has permissions */
                    client.getClient().properties.client_database_id == selected_playlist.playlist_owner_dbid /* client is playlist owner */
                )
            );
            buttons.find(".button-playlist-create").prop(
                "disabled",
                !client.permissions.neededPermission(PermissionType.B_PLAYLIST_CREATE).granted(1)
            );
            if(selected_playlist) {
                buttons.find(".button-playlist-edit").prop(
                    "disabled",
                    false
                );
            }
        };

        const update_list = async () => {
            const info_tag = modal.htmlTag.find(".footer .info a");
            info_tag.text("loading...");

            selected_playlist = undefined;
            update_selected();

            try {
                available_playlists = await client.serverConnection.command_helper.request_playlist_list();
            } catch(error) {
                info_tag.text("failed to query playlist list.");
                //FIXME error handling?
                return;
            }

            const entries_tag = modal.htmlTag.find(".playlist-list-entries");
            const entry_template = $("#tmpl_playlist_list-list_entry");
            entries_tag.empty();

            const owndbid = client.getClient().properties.client_database_id;
            for(const query of available_playlists) {
                const tag = entry_template.renderTag(query).on('click', event => {
                    entries_tag.find(".entry.selected").removeClass("selected");
                    $(event.target).parent(".entry").addClass("selected");
                    selected_playlist = query;
                    update_selected();
                });

                if(highlight_own && query.playlist_owner_dbid == owndbid)
                    tag.addClass("highlighted");

                entries_tag.append(tag);
            }

            const entry_container = modal.htmlTag.find(".playlist-list-entries-container");
            if(entry_container.hasScrollBar())
                entry_container.addClass("scrollbar");

            info_tag.text("Showing " + available_playlists.length + " entries");
            update_selected();
        };

        modal = createModal({
            header: tr("Manage playlists"),
            body: () => {
                let template = $("#tmpl_playlist_list").renderTag();

                /* first open the modal */
                setTimeout(() => {
                    const entry_container = template.find(".playlist-list-entries-container");
                    if(entry_container.hasScrollBar())
                        entry_container.addClass("scrollbar");
                }, 100);

                template.find(".footer .buttons .button-refresh").on('click', update_list);

                template.find(".button-playlist-create").on('click', event => {
                    const single_handler: connection.SingleCommandHandler = {
                        function: command => {
                            const json = command.arguments;
                            update_list().then(() => {
                                spawnYesNo(tr("Playlist created successful"), tr("The playlist has been successfully created.<br>Should we open the editor?"), result => {
                                    if(result) {
                                        for(const playlist of available_playlists) {
                                            if(playlist.playlist_id == json[0]["playlist_id"]) {
                                                spawnPlaylistEdit(client, playlist).close_listener.push(update_list);
                                                return;
                                            }
                                        }
                                    }
                                });
                            });

                            return true;
                        },
                        command: "notifyplaylistcreated"
                    };
                    client.serverConnection.command_handler_boss().register_single_handler(single_handler);
                    client.serverConnection.send_command("playlistcreate").catch(error => {
                        client.serverConnection.command_handler_boss().remove_single_handler(single_handler);
                        if(error instanceof CommandResult)
                            error = error.extra_message || error.message;
                        createErrorModal(tr("Unable to create playlist"), tr("Failed to create playlist<br>Message: ") + error).open();
                    });
                });

                template.find(".button-playlist-edit").on('click', event => {
                    if(!selected_playlist) return;
                    spawnPlaylistEdit(client, selected_playlist).close_listener.push(update_list);
                });

                template.find(".button-playlist-delete").on('click', () => {
                    if(!selected_playlist) return;

                    Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this playlist?"), result => {
                        if(result) {
                            client.serverConnection.send_command("playlistdelete", {playlist_id: selected_playlist.playlist_id}).then(() => {
                                createInfoModal(tr("Playlist deleted successful"), tr("This playlist has been deleted successfully.")).open();
                                update_list();
                            }).catch(error => {
                                if(error instanceof CommandResult) {
                                    /* TODO extra handling here */
                                    //if(error.id == ErrorID.PLAYLIST_IS_IN_USE) { }
                                    error = error.extra_message || error.message;
                                }
                                createErrorModal(tr("Unable to delete playlist"), tr("Failed to delete playlist<br>Message: ") + error).open();
                            });
                        }
                    });
                });

                template.find(".input-search").on('change keyup', () => {
                    const text = (template.find(".input-search").val() as string || "").toLowerCase();
                    if(text.length == 0) {
                        template.find(".playlist-list-entries .entry").show();
                    } else {
                        template.find(".playlist-list-entries .entry").each((_, e) => {
                            const element = $(e);
                            if(element.text().toLowerCase().indexOf(text) == -1)
                                element.hide();
                            else
                                element.show();
                        })
                    }
                });

                template.find(".button-highlight-own").on('change', event => {
                    const flag = (<HTMLInputElement>event.target).checked;
                    settings.changeGlobal("playlist-list-highlight-own", flag);
                    if(flag) {
                        const owndbid = client.getClient().properties.client_database_id;
                        template.find(".playlist-list-entries .entry").each((index, _element) => {
                            const element = $(_element);
                            if(parseInt(element.attr("playlist-owner-dbid")) == owndbid)
                                element.addClass("highlighted");
                        })
                    } else {
                        template.find(".playlist-list-entries .highlighted").removeClass("highlighted");
                    }
                }).prop("checked", highlight_own);
                return template;
            },
            footer: undefined,
            width: 750
        });

        update_list();
        modal.open();
    }
}