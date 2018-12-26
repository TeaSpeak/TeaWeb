/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../client.ts" />

namespace Modals {
    export function spawnQueryManage(client: TSClient) {
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
            client.serverConnection.helper.current_virtual_server_id().then(server_id => {
                client.serverConnection.helper.request_query_list(server_id).then(result => {
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

                /* first open the modal */
                setTimeout(() => {
                    const entry_container = template.find(".query-list-entries-container");
                    if(entry_container.hasScrollBar())
                        entry_container.addClass("scrollbar");
                }, 100);

                template.find(".footer .buttons .button-refresh").on('click', update_list);
                template.find(".button-query-create").on('click', () => {
                    Modals.spawnQueryCreate((user, pass) => update_list());
                });
                template.find(".button-query-rename").on('click', () => {
                    if(!selected_query) return;

                    createInputModal(tr("Change account name"), tr("Enter the new name for the login:<br>"), text => text.length >= 3, result => {
                        if(result) {
                            client.serverConnection.sendCommand("queryrename", {
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
                            client.serverConnection.sendCommand("querychangepassword", {
                                client_login_name: selected_query.username,
                                client_login_password: result
                            }).catch(error => {
                                if(error instanceof CommandResult)
                                    error = error.extra_message || error.message;
                                createErrorModal(tr("Unable to change password"), tr("Failed to change password<br>Message: ") + error).open();
                            });

                            client.serverConnection.commandHandler["notifyquerypasswordchanges"] = json => {
                                Modals.spawnQueryCreated({
                                    username: json[0]["client_login_name"],
                                    password: json[0]["client_login_password"]
                                }, false);

                                client.serverConnection.commandHandler["notifyquerypasswordchanges"] = undefined;
                            };
                        }
                    }).open();
                });
                template.find(".button-query-delete").on('click', () => {
                    if(!selected_query) return;

                    Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this account?"), result => {
                        if(result) {
                            client.serverConnection.sendCommand("querydelete", {
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
}