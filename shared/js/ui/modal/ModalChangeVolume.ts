/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnChangeVolume(current: number, callback: (number) => void) {
        let updateCallback: (number) => void;
        const connectModal = createModal({
            header: function() {
                let header = $.spawn("div");
                header.text(tr("Change volume"));
                return header;
            },
            body: function () {
                let tag = $("#tmpl_change_volume").renderTag({
                    max_volume: 200
                });
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
                buttonReset.text(tr("Reset"));
                buttonReset.on("click", function () {
                    updateCallback(100);
                });
                tag.append(buttonReset);


                let buttonCancel = $.spawn("button");
                buttonCancel.text(tr("Cancel"));
                buttonCancel.on("click", function () {
                    updateCallback(current * 100);
                    connectModal.close();
                });
                tag.append(buttonCancel);


                let buttonOk = $.spawn("button");
                buttonOk.text(tr("OK"));
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

    /* Units are between 0 and 1 */
    export function spawnChangeRemoteVolume(current: number, max_value: number, callback: (value: number) => void) {
        let update_volume: (number) => void;
        let current_value = current; /* between 0 and 100! */

        const modal = createModal({
            header: function() {
                let header = $.spawn("div");
                header.text(tr("Change volume"));
                return header;
            },
            body: function () {
                let tag = $("#tmpl_change_volume").renderTag({
                    max_volume: Math.ceil(max_value * 100)
                });
                tag.find(".volume_slider").on("change",_ => update_volume(tag.find(".volume_slider").val()));
                tag.find(".volume_slider").on("input",_ => update_volume(tag.find(".volume_slider").val()));
                //connect_address
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");

                {
                    let button_apply = $.spawn("button");
                    button_apply.text(tr("Apply"));
                    button_apply.on("click", () => {
                        callback(current_value / 100);
                    });
                    tag.append(button_apply);
                }

                {
                    let button_reset = $.spawn("button");
                    button_reset.text(tr("Reset"));
                    button_reset.on("click", () => update_volume(max_value * 100));
                    tag.append(button_reset);
                }


                {
                    let button_cancel = $.spawn("button");
                    button_cancel.text(tr("Cancel"));
                    button_cancel.on("click", () => modal.close());
                    tag.append(button_cancel);
                }


                {
                    let button_ok = $.spawn("button");
                    button_ok.text(tr("OK"));
                    button_ok.on("click", () => {
                        callback(current_value / 100);
                        modal.close();
                    });
                    tag.append(button_ok);
                }
                return tag;
            },

            width: 600
        });
        update_volume = value => {
            modal.htmlTag.find(".volume_slider").val(value);

            const tag_display = modal.htmlTag.find(".display_volume");
            tag_display.html(value + " %");
            current_value = value;
        };

        modal.open();
        update_volume(current * 100);
    }
}