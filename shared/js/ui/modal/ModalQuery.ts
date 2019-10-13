/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnQueryCreate(connection: ConnectionHandler, callback_created?: (user, pass) => any) {
        let modal;
        modal = createModal({
            header: tr("Create a server query login"),
            body: () => {
                let template = $("#tmpl_query_create").renderTag();
                template = $.spawn("div").append(template);

                template.find(".button-close").on('click', event => modal.close());
                template.find(".button-create").on('click', event => {
                    const name = template.find(".input-name").val() as string;
                        if(name.length < 3 || name.length > 64) {
                        createErrorModal(tr("Invalid username"), tr("Please enter a valid name!")).open();
                        return;
                    }

                    const single_handler: connection.SingleCommandHandler = {
                        function: command => {
                            const json = command.arguments[0];

                            spawnQueryCreated({
                                username: name,
                                password: json.client_login_password
                            }, true);

                            if(callback_created)
                                callback_created(name, json.client_login_password);
                            return true;
                        },
                        command: "notifyquerycreated"
                    };
                    connection.serverConnection.command_handler_boss().register_single_handler(single_handler);
                    connection.serverConnection.send_command("querycreate", {
                        client_login_name: name
                    }).catch(error => {
                        if(error instanceof CommandResult)
                            error = error.extra_message || error.message;
                        createErrorModal(tr("Unable to create account"), tr("Failed to create account<br>Message: ") + error).open();
                    }).then(() => connection.serverConnection.command_handler_boss().remove_single_handler(single_handler));

                    modal.close();
                });
                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.open();
    }

    export function spawnQueryCreated(credentials: {
        username: string,
        password: string
    }, just_created: boolean) {
        let modal;
        modal = createModal({
            header: just_created ? tr("Server query credentials") : tr("New server query credentials"),
            body: () => {
                let template = $("#tmpl_query_created").renderTag(credentials);
                template = $.spawn("div").append(template);

                template.find(".button-close").on('click', event => modal.close());
                template.find(".query_name").text(credentials.username);
                template.find(".query_password").text(credentials.password);

                template.find(".btn_copy_name").on('click', () => {
                    template.find(".query_name").select();
                    document.execCommand("copy");
                });
                template.find(".btn_copy_password").on('click', () => {
                    template.find(".query_password").select();
                    document.execCommand("copy");
                });
                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.open();
    }
}