/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnChangeVolume(current: number, callback: (number) => void) {
        let updateCallback: (number) => void;
        const connectModal = createModal({
            header: function() {
                let header = $.spawn("div");
                header.text("Change volume");
                return header;
            },
            body: function () {
                let tag = $("#tmpl_change_volume").renderTag();
                tag.find(".volume_slider").on("change",_ => updateCallback(tag.find(".volume_slider").val()));
                tag.find(".volume_slider").on("input",_ => updateCallback(tag.find(".volume_slider").val()));
                //connect_address
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");


                let buttonReset = $.spawn("button");
                buttonReset.text("Reset");
                buttonReset.on("click", function () {
                    updateCallback(100);
                });
                tag.append(buttonReset);


                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel");
                buttonCancel.on("click", function () {
                    updateCallback(current * 100);
                    connectModal.close();
                });
                tag.append(buttonCancel);


                let buttonOk = $.spawn("button");
                buttonOk.text("OK");
                buttonOk.on("click", function () {
                    connectModal.close();
                });
                tag.append(buttonOk);
                return tag;
            },

            width: 600
        });
        updateCallback = value => {
            connectModal.htmlTag.find(".volume_slider").val(value);
            let display = connectModal.htmlTag.find(".display_volume");
            let number = (value - 100);
            display.html((number == 0 ? "&plusmn;" : number > 0 ? "+" : "") + number + " %");
            callback(value / 100);
        };
        connectModal.open();
        updateCallback(current * 100);
    }
}