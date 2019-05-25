/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnInviteEditor(connection: ConnectionHandler) {
        let modal: Modal;
        modal = createModal({
            header: tr("Invalid URL creator"),
            body: () => {
                let template = $("#tmpl_invite").renderTag();

                template.find(".button-close").on('click', event => modal.close());
                return template;
            },
            footer: undefined
        });

        const container_url = modal.htmlTag.find(".text-output");
        const button_copy = modal.htmlTag.find(".button-copy");
        button_copy.on('click', event => {
            container_url.select();
            document.execCommand('copy');
        });

        let flag_direct_connect = true;
        let flag_resolved_address = false;
        const update_link = () => {
            const address = flag_resolved_address ? this.channelTree.client.serverConnection.remote_address() : connection.channelTree.server.remote_address;
            const parameter = "connect_default=" + (flag_direct_connect ? 1 : 0) + "&connect_address=" + encodeURIComponent(address.host + (address.port === 9987 ? "" : address.port));
            const url =  document.location.origin +  document.location.pathname + "?" + parameter;
            container_url.text(url);
        };

        {
            const input_direct_connect = modal.htmlTag.find(".flag-direct-connect input") as JQuery<HTMLInputElement>;
            input_direct_connect.on('change', event => {
                flag_direct_connect = input_direct_connect[0].checked;
                update_link();
            });
            input_direct_connect[0].checked = flag_direct_connect;
        }
        {
            const input = modal.htmlTag.find(".flag-resolved-address input") as JQuery<HTMLInputElement>;
            input.on('change', event => {
                flag_resolved_address = input[0].checked;
                update_link();
            });
            input[0].checked = flag_direct_connect;
        }

        update_link();
        modal.open();
    }
}