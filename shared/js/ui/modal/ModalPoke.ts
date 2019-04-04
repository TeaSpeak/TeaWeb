/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnPoke(invoker: {
        name: string,
        id: number,
        unique_id: string
    }, message) {
        let modal;
        modal = createModal({
            header: tr("You have been poked!"),
            body: () => {
                let template = $("#tmpl_poke_popup").renderTag({
                    "invoker": ClientEntry.chatTag(invoker.id, invoker.name, invoker.unique_id, true),
                    "message": message
                });
                template = $.spawn("div").append(template);

                template.find(".button-close").on('click', event => modal.close());

                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.open();
    }
}