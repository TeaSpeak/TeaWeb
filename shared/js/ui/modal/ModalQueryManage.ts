/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    /*
    export function spawnQueryManage(client: ConnectionHandler) {
        let modal: Modal;
        let selected_query: QueryListEntry;

        const update_selected = () => {
            const buttons = modal.htmlTag.find(".header .buttons");

            //TODO gray out if no permissions (Server needs to send that... :D)
            buttons.find(".button-query-delete").prop("disabled", selected_query === undefined);
            buttons.find(".button-query-rename").prop("disabled", selected_query === undefined);
            buttons.find(".button-query-change-password").prop("disabled", selected_query === undefined);
        };

        const update_list = () => {
            const info_tag = modal.htmlTag.find(".footer .info a");
            info_tag.text("loading...");
            client.serverConnection.command_helper.current_virtual_server_id().then(server_id => {
                client.serverConnection.command_helper.request_query_list(server_id).then(result => {
                    selected_query = undefined;

                    const entries_tag = modal.htmlTag.find(".query-list-entries");
                    const entry_template = $("#tmpl_query_manager-list_entry");
                    entries_tag.empty();

                    for(const query of result.queries || []) {
                        entries_tag.append(entry_template.renderTag(query).on('click', event => {
                            entries_tag.find(".entry.selected").removeClass("selected");
                            $(event.target).parent(".entry").addClass("selected");
                            selected_query = query;
                            update_selected();
                        }));
                    }

                    const entry_container = modal.htmlTag.find(".query-list-entries-container");
                    if(entry_container.hasScrollBar())
                        entry_container.addClass("scrollbar");

                    if(!result || result.flag_all) {
                        info_tag.text("Showing all server queries");
                    } else {
                        info_tag.text("Showing your server queries")
                    }
                    update_selected();
                });
            });
            //TODO error handling
        };

        modal = createModal({
            header: tr("Manage query accounts"),
            body: () => {
                let template = $("#tmpl_query_manager").renderTag();
                template = $.spawn("div").append(template);

                /* first open the modal
                setTimeout(() => {
                    const entry_container = template.find(".query-list-entries-container");
                    if(entry_container.hasScrollBar())
                        entry_container.addClass("scrollbar");
                }, 100);

                template.find(".footer .buttons .button-refresh").on('click', update_list);
                template.find(".button-query-create").on('click', () => {
                    Modals.spawnQueryCreate(client, (user, pass) => update_list());
                });
                template.find(".button-query-rename").on('click', () => {
                    if(!selected_query) return;

                    createInputModal(tr("Change account name"), tr("Enter the new name for the login:<br>"), text => text.length >= 3, result => {
                        if(result) {
                            client.serverConnection.send_command("queryrename", {
                                client_login_name: selected_query.username,
                                client_new_login_name: result
                            }).catch(error => {
                                if(error instanceof CommandResult)
                                    error = error.extra_message || error.message;
                                createErrorModal(tr("Unable to rename account"), tr("Failed to rename account<br>Message: ") + error).open();
                            }).then(() => {
                                createInfoModal(tr("Account successfully renamed"), tr("The query account has been renamed!")).open();
                                update_list();
                            });
                        }
                    }).open();
                });
                template.find(".button-query-change-password").on('click', () => {
                    if(!selected_query) return;

                    createInputModal(tr("Change account's password"), tr("Enter a new password (leave blank for auto generation):<br>"), text => true, result => {
                        if(result !== false) {
                            const single_handler: connection.SingleCommandHandler = {
                                command: "notifyquerypasswordchanges",
                                function: command => {
                                    Modals.spawnQueryCreated({
                                        username: command.arguments[0]["client_login_name"],
                                        password: command.arguments[0]["client_login_password"]
                                    }, false);

                                    return true;
                                }
                            };
                            client.serverConnection.command_handler_boss().register_single_handler(single_handler);

                            client.serverConnection.send_command("querychangepassword", {
                                client_login_name: selected_query.username,
                                client_login_password: result
                            }).catch(error => {
                                client.serverConnection.command_handler_boss().remove_single_handler(single_handler);
                                if(error instanceof CommandResult)
                                    error = error.extra_message || error.message;
                                createErrorModal(tr("Unable to change password"), tr("Failed to change password<br>Message: ") + error).open();
                            });
                        }
                    }).open();
                });
                template.find(".button-query-delete").on('click', () => {
                    if(!selected_query) return;

                    Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this account?"), result => {
                        if(result) {
                            client.serverConnection.send_command("querydelete", {
                                client_login_name: selected_query.username
                            }).catch(error => {
                                if(error instanceof CommandResult)
                                    error = error.extra_message || error.message;
                                createErrorModal(tr("Unable to delete account"), tr("Failed to delete account<br>Message: ") + error).open();
                            }).then(() => {
                                createInfoModal(tr("Account successfully deleted"), tr("The query account has been successfully deleted!")).open();
                                update_list();
                            });
                        }
                    });
                });
                template.find(".input-search").on('change keyup', () => {
                    const text = (template.find(".input-search").val() as string || "").toLowerCase();
                    if(text.length == 0) {
                        template.find(".query-list-entries .entry").show();
                    } else {
                        template.find(".query-list-entries .entry").each((_, e) => {
                            const element = $(e);
                            if(element.text().toLowerCase().indexOf(text) == -1)
                                element.hide();
                            else
                                element.show();
                        })
                    }
                });
                return template;
            },
            footer: undefined,
            width: 750
        });

        update_list();
        modal.open();
    }
     */

    //tmpl_query_manager
    export function spawnQueryManage(client: ConnectionHandler) {
        let modal: Modal;

        modal = createModal({
            header: tr("Manage query accounts"),
            body: () => {
                let template = $("#tmpl_query_manager").renderTag();

                let current_server: number;
                let selected_query: QueryListEntry;
                let filter_callbacks: ((text: string) => boolean)[] = [];
                const container_list = template.find(".container-list .container-entries");
                const container_list_empty = container_list.find(".container-empty");
                const container_list_error = container_list.find(".container-error");

                const detail_name = template.find(".detail.login-name .value");
                const detail_unique_id = template.find(".detail.unique-id .value");
                const detail_bound_server = template.find(".detail.bound-server .value");

                const detail_unique_id_copy = template.find(".detail.unique-id .button-copy");

                const input_filter = template.find(".filter-input");

                const button_create = template.find(".button-create");
                const button_delete = template.find(".button-delete");
                const button_rename = template.find(".button-rename");
                const button_change_password = template.find(".button-change-password");
                const button_update = template.find(".button-update");

                const permission_create = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_CREATE).granted(1);
                const permission_delete = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_DELETE).granted(1);
                const permission_delete_own = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_DELETE_OWN).granted(1);
                const permission_rename = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_RENAME).granted(1);
                const permission_rename_own = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_RENAME_OWN).granted(1);
                const permission_password = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_CHANGE_PASSWORD).granted(1);
                const permission_password_own = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_CHANGE_OWN_PASSWORD).granted(1);
                const permission_password_global = client.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_CHANGE_PASSWORD_GLOBAL).granted(1);
                button_create.prop('disabled', !permission_create);

                const set_error = (error: string | undefined) => {
                    if(typeof(error) === "string")
                        container_list_error.text(error).show();
                    else
                        container_list_error.hide();
                };

                const update_list = (selected_entry: string | undefined) => {
                    button_update.prop('disabled', true);
                    container_list_empty.text(tr("loading...")).show();
                    set_error(undefined);
                    set_selected(undefined, false);
                    filter_callbacks = [];
                    container_list.find(".entry").remove();

                    client.serverConnection.command_helper.current_virtual_server_id().then(server_id => {
                        current_server = server_id;

                        client.serverConnection.command_helper.request_query_list(server_id).then(result => {
                            if(!result || !result.queries.length) {
                                container_list_empty.text(tr("No queries available"));
                                return;
                            }

                            for(const entry of result.queries) {
                                const tag = $.spawn("div").addClass("entry").text(entry.username + " (" + entry.unique_id + ")");
                                tag.on('click', event => {
                                    container_list.find(".selected").removeClass("selected");
                                    tag.addClass("selected");
                                    set_selected(entry, false);
                                });
                                container_list.append(tag);
                                if(entry.username === selected_entry) tag.trigger('click');

                                const text_mesh = (entry.username + " " + entry.unique_id + " " + entry.bounded_server).toLowerCase();
                                filter_callbacks.push(text => {
                                    if(typeof(text) === "undefined" || text_mesh.indexOf(text) != -1) {
                                        tag.show();
                                        return true;
                                    } else {
                                        tag.hide();
                                        return false;
                                    }
                                });
                            }

                            update_filter();
                            container_list_empty.hide();
                            button_update.prop('disabled', false);
                        }).catch(error => {
                            button_update.prop('disabled', false);
                            if(error instanceof CommandResult && error.id === ErrorID.PERMISSION_ERROR) {
                                set_error(tr("No permissions"));
                                return;
                            }
                            log.error(LogCategory.CLIENT, tr("Failed to request the query list: %o"), error);
                            set_error(tr("Failed to request list"));
                        });
                    }).catch(error => {
                        button_update.prop('disabled', false);
                        log.error(LogCategory.CLIENT, tr("Failed to get own virtual server id: %o"), error);
                        set_error(tr("Failed to query server id"));
                    });
                };

                const set_selected = (entry: QueryListEntry | undefined, force: boolean) => {
                    if(entry === selected_query && !force) return;
                    selected_query = entry;

                    if(!selected_query) {
                        detail_name.text("-");
                        detail_unique_id.text("-");
                        detail_bound_server.text("-");

                        button_delete.prop('disabled', true);
                        button_rename.prop('disabled', true);
                        button_change_password.prop('disabled', true);
                    } else {
                        detail_name.text(selected_query.username);
                        detail_unique_id.text(selected_query.unique_id);
                        if(selected_query.bounded_server == 0)
                            detail_bound_server.text(tr("On the instance"));
                        else if(selected_query.bounded_server === current_server)
                            detail_bound_server.text(tr("On the current server"));
                        else
                            detail_bound_server.text(selected_query.bounded_server.toString());

                        button_delete.prop('disabled', !permission_delete && !(selected_query.unique_id === client.getClient().properties.client_unique_identifier && permission_delete_own));
                        button_rename.prop('disabled', !permission_rename && !(selected_query.unique_id === client.getClient().properties.client_unique_identifier && permission_rename_own));
                        if(selected_query.bounded_server != 0) {
                            button_change_password.prop('disabled', !permission_password && !(selected_query.unique_id === client.getClient().properties.client_unique_identifier && permission_password_own));
                        } else {
                            button_change_password.prop('disabled', !permission_password_global && !(selected_query.unique_id === client.getClient().properties.client_unique_identifier && permission_password_own));
                        }
                    }
                };

                const update_filter = () => {
                    let value = input_filter.val() as string;
                    if(!value) value = undefined;
                    else value = value.toLowerCase();

                    const shown = filter_callbacks.filter(e => e(value)).length;
                    if(shown > 0) {
                        container_list_empty.hide();
                    } else {
                        container_list_empty.text(tr("No accounts found")).show();
                    }
                };
                input_filter.on('change keyup', update_filter);

                /* all buttons */
                {
                    detail_unique_id_copy.on('click', event => {
                        if(!selected_query) return;

                        copy_to_clipboard(selected_query.unique_id);
                        createInfoModal(tr("Unique ID copied"), tr("The unique id has been successfully copied to your clipboard.")).open();
                    });

                    button_create.on('click', event => {
                        Modals.spawnQueryCreate(client, (user, pass) => update_list(user));
                    });

                    button_delete.on('click', event => {
                        if(!selected_query) return;

                        Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this account?"), result => {
                            if(result) {
                                client.serverConnection.send_command("querydelete", {
                                    client_login_name: selected_query.username
                                }).then(() => {
                                    createInfoModal(tr("Account successfully deleted"), tr("The query account has been successfully deleted!")).open();
                                    update_list(undefined);
                                }).catch(error => {
                                    if(error instanceof CommandResult)
                                        error = error.extra_message || error.message;
                                    createErrorModal(tr("Unable to delete account"), MessageHelper.formatMessage(tr("Failed to delete account{:br:}Message: {}"), error)).open();
                                });
                            }
                        });
                    });

                    button_rename.on('click', () => {
                        if(!selected_query) return;

                        createInputModal(tr("Change account name"), tr("Enter the new name for the login:"), text => text.length >= 3, result => {
                            if(result) {
                                client.serverConnection.send_command("queryrename", {
                                    client_login_name: selected_query.username,
                                    client_new_login_name: result
                                }).then(() => {
                                    createInfoModal(tr("Account successfully renamed"), tr("The query account has been renamed!")).open();
                                    update_list(result as string);
                                }).catch(error => {
                                    if(error instanceof CommandResult)
                                        error = error.extra_message || error.message;
                                    createErrorModal(tr("Unable to rename account"), MessageHelper.formatMessage(tr("Failed to rename account{:br:}Message: {}"), error)).open();
                                });
                            }
                        }).open();
                    });

                    button_change_password.on('click', () => {
                        if(!selected_query) return;

                        createInputModal(tr("Change account's password"), tr("Enter a new password (leave blank for auto generation):"), text => true, result => {
                            if(result !== false) {
                                const single_handler: connection.SingleCommandHandler = {
                                    command: "notifyquerypasswordchanges",
                                    function: command => {
                                        Modals.spawnQueryCreated({
                                            username: command.arguments[0]["client_login_name"],
                                            password: command.arguments[0]["client_login_password"]
                                        }, false);

                                        return true;
                                    }
                                };
                                client.serverConnection.command_handler_boss().register_single_handler(single_handler);

                                client.serverConnection.send_command("querychangepassword", {
                                    client_login_name: selected_query.username,
                                    client_login_password: result
                                }).catch(error => {
                                    client.serverConnection.command_handler_boss().remove_single_handler(single_handler);
                                    if(error instanceof CommandResult)
                                        error = error.extra_message || error.message;
                                    createErrorModal(tr("Unable to change password"), MessageHelper.formatMessage(tr("Failed to change password{:br:}Message: {}"), error)).open();
                                });
                            }
                        }).open();
                    });

                    button_update.on('click', event => update_list(selected_query ? selected_query.username : undefined));
                }

                modal.close_listener.push(() => filter_callbacks = undefined);

                set_selected(undefined, true);
                update_list(undefined);
                template.dividerfy();
                return template;
            },
            footer: null,

            min_width: "25em"
        });

        modal.htmlTag.find(".modal-body").addClass("modal-query-manage");
        modal.open();
    }
}