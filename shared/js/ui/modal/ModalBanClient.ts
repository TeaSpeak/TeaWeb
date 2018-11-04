/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../client.ts" />

namespace Modals {
    export function spawnBanClient(name: string | string[], callback: (data: {
        length: number,
        reason: string,
        no_name: boolean,
        no_ip: boolean,
        no_hwid: boolean
    }) => void) {
        const connectModal = createModal({
            header: function() {
                return "Ban client";
            },
            body: function () {
                let tag = $("#tmpl_client_ban").renderTag({
                    client_name: $.isArray(name) ? '"' + name.join('", "') + '"' : name
                });

                let maxTime = 0; //globalClient.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).value;
                let unlimited = maxTime == 0 || maxTime == -1;
                if(unlimited) maxTime = 0;

                let banTag = tag.find(".ban_duration_type");
                let durationTag = tag.find(".ban_duration");
                banTag.find("option[value=\"sec\"]").prop("disabled", !unlimited && 1 > maxTime)
                    .attr("duration-scale", 1)
                    .attr("duration-max", maxTime);
                banTag.find("option[value=\"min\"]").prop("disabled", !unlimited && 60 > maxTime)
                    .attr("duration-scale", 60)
                    .attr("duration-max", maxTime  / 60);
                banTag.find("option[value=\"hours\"]").prop("disabled", !unlimited && 60 * 60 > maxTime)
                    .attr("duration-scale", 60 * 60)
                    .attr("duration-max", maxTime / (60 * 60));
                banTag.find("option[value=\"days\"]").prop("disabled", !unlimited && 60 * 60  * 24 > maxTime)
                    .attr("duration-scale", 60 * 60 * 24)
                    .attr("duration-max", maxTime / (60 * 60 * 24));
                banTag.find("option[value=\"perm\"]").prop("disabled", !unlimited)
                    .attr("duration-scale", 0);

                durationTag.change(() => banTag.trigger('change'));

                banTag.change(event => {
                    let element = $((event.target as HTMLSelectElement).selectedOptions.item(0));
                    if(element.val() !== "perm") {
                        durationTag.prop("disabled", false);

                        let current = durationTag.val() as number;
                        let max = parseInt(element.attr("duration-max"));
                        if (max > 0 && current > max)
                            durationTag.val(max);
                        else if(current <= 0)
                            durationTag.val(1);
                        durationTag.attr("max", max);
                    } else {
                        durationTag.prop("disabled", true);
                    }
                });

                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");

                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel");
                buttonCancel.on("click", () => connectModal.close());
                tag.append(buttonCancel);


                let buttonOk = $.spawn("button");
                buttonOk.text("OK").addClass("btn_success");
                tag.append(buttonOk);
                return tag;
            },

            width: 450
        });
        connectModal.open();

        connectModal.htmlTag.find(".btn_success").on('click', () => {
            connectModal.close();

            let length = connectModal.htmlTag.find(".ban_duration").val() as number;
            let duration = connectModal.htmlTag.find(".ban_duration_type option:selected");
            console.log(duration);
            console.log(length + "*" + duration.attr("duration-scale"));

            callback({
                length: length * parseInt(duration.attr("duration-scale")),
                reason: connectModal.htmlTag.find(".ban_reason").val() as string,
                no_hwid: !connectModal.htmlTag.find(".ban-type-hardware-id").prop("checked"),
                no_ip: !connectModal.htmlTag.find(".ban-type-ip").prop("checked"),
                no_name: !connectModal.htmlTag.find(".ban-type-nickname").prop("checked")
            });
        })
    }
}