/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function createChannelModal(channel?: ChannelEntry) {
        const modal = createModal({
            header: "Create channel",
            body: () => {
                let template = $("#tmpl_channel_edit").tmpl({
                    channel_name: "Hello World",
                    myArray: [
                        "A",
                        "B",
                        "C"
                    ]
                });
                template = $.spawn("div").append(template);
                let tag = template.tabify();

                return tag;
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin-top", "5px");

                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel");

                let buttonOk = $.spawn("button");
                buttonOk.text("Ok");

                footer.append(buttonCancel);
                footer.append(buttonOk);

                return footer;
            },
            width: 500
        });
    }
}