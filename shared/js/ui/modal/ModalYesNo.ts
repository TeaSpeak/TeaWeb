/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function spawnYesNo(header: BodyCreator, body: BodyCreator, callback: (_: boolean) => any) {
        let modal;
        modal = createModal({
            header: header,
            body: body,
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin-top", "5px");
                footer.css("margin-bottom", "5px");
                footer.css("text-align", "right");

                let button_yes = $.spawn("button");
                button_yes.text("Yes");
                button_yes.click(() => {
                    modal.close();
                    callback(true);
                });
                footer.append(button_yes);

                let button_no = $.spawn("button");
                button_no.text("No");
                button_no.click(() => {
                    modal.close();
                    callback(false);
                });
                footer.append(button_no);

                return footer;
            },
            width: 750
        });
        modal.open();
    }
}