/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export type BanEntry = {
        name?: string;
        unique_id: string;
    }
    export function spawnBanClient(client: ConnectionHandler, entries: BanEntry | BanEntry[], callback: (data: {
        length: number,
        reason: string,
        no_name: boolean,
        no_ip: boolean,
        no_hwid: boolean
    }) => void) {
        const max_ban_time = client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).value;

        const permission_criteria_hwid = client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_HWID).granted(1);
        const permission_criteria_ip = client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_IP).granted(1);
        const permission_criteria_name = client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_NAME).granted(1);

        const modal = createModal({
            header: Array.isArray(entries) ? tr("Ban clients") : tr("Ban client"),
            body: function () {
                let template = $("#tmpl_client_ban").renderTag({entries: entries});

                let update_duration;
                let update_button_ok;
                const button_ok = template.find(".button-apply");
                const button_cancel = template.find(".button-cancel");

                const input_duration_value = template.find(".container-duration input").on('change keyup', () => update_duration());
                const input_duration_type = template.find(".container-duration select").on('change keyup', () => update_duration());

                const container_reason = template.find(".container-reason");

                const criteria_nickname = template.find(".criteria.nickname input")
                    .prop('checked', permission_criteria_name).prop("disabled", !permission_criteria_name)
                    .firstParent(".checkbox").toggleClass("disabled", !permission_criteria_name);

                const criteria_ip_address = template.find(".criteria.ip-address input")
                    .prop('checked', permission_criteria_ip).prop("disabled", !permission_criteria_ip)
                    .firstParent(".checkbox").toggleClass("disabled", !permission_criteria_ip);

                const criteria_hardware_id = template.find(".criteria.hardware-id input")
                    .prop('checked', permission_criteria_hwid).prop("disabled", !permission_criteria_hwid)
                    .firstParent(".checkbox").toggleClass("disabled", !permission_criteria_hwid);

                /* duration input handler */
                {
                    const tooltip_duration_max = template.find(".tooltip-max-time a.max");

                    update_duration = () => {
                        const type = input_duration_type.val() as string;
                        const value = parseInt(input_duration_value.val() as string);
                        const disabled = input_duration_type.prop("disabled");

                        input_duration_value.prop("disabled", type === "perm" || disabled).firstParent(".input-boxed").toggleClass("disabled", type === "perm" || disabled);
                        if(type !== "perm") {
                            if(input_duration_value.attr("x-saved-value")) {
                                input_duration_value.val(parseInt(input_duration_value.attr("x-saved-value")));
                                input_duration_value.attr("x-saved-value", null);
                            }

                            const selected_option = input_duration_type.find("option[value='" + type + "']");
                            const max = parseInt(selected_option.attr("duration-max"));

                            input_duration_value.attr("max", max);
                            if((value > max && max != -1) || value < 1) {
                                input_duration_value.firstParent(".input-boxed").addClass("is-invalid");
                            } else {
                                input_duration_value.firstParent(".input-boxed").removeClass("is-invalid");
                            }

                            if(max != -1)
                                tooltip_duration_max.html(tr("You're allowed to ban a maximum of ") + "<b>" + max + " " + duration_data[type][max == 1 ? "1-text" : "text"] + "</b>");
                            else
                                tooltip_duration_max.html(tr("You're allowed to ban <b>permanent</b>."));
                        } else {
                            if(value && !Number.isNaN(value))
                                input_duration_value.attr("x-saved-value", value);
                            input_duration_value.attr("placeholder", tr("for ever")).val(null);
                            tooltip_duration_max.html(tr("You're allowed to ban <b>permanent</b>."));
                        }
                        update_button_ok && update_button_ok();
                    };

                    /* initialize ban time */
                    Promise.resolve(max_ban_time).catch(error => { /* TODO: Error handling? */ return 0; }).then(max_time => {
                        let unlimited = max_time == 0 || max_time == -1;
                        if(unlimited || typeof(max_time) === "undefined") max_time = 0;

                        for(const value of Object.keys(duration_data)) {
                            input_duration_type.find("option[value='" + value + "']")
                                .prop("disabled", !unlimited && max_time >= duration_data[value].scale)
                                .attr("duration-scale", duration_data[value].scale)
                                .attr("duration-max", unlimited ? -1 : Math.floor(max_time  / duration_data[value].scale));
                        }

                        input_duration_type.find("option[value='perm']")
                            .prop("disabled", !unlimited)
                            .attr("duration-scale", 0)
                            .attr("duration-max", -1);
                        update_duration();
                    });

                    update_duration();
                }

                /* ban reason */
                {
                    const input = container_reason.find("textarea");

                    const insert_tag = (open: string, close: string) => {
                        if(input.prop("disabled"))
                            return;

                        const node = input[0] as HTMLTextAreaElement;
                        if (node.selectionStart || node.selectionStart == 0) {
                            const startPos = node.selectionStart;
                            const endPos = node.selectionEnd;
                            node.value = node.value.substring(0, startPos) + open + node.value.substring(startPos, endPos) + close + node.value.substring(endPos);
                            node.selectionEnd = endPos + open.length;
                            node.selectionStart = node.selectionEnd;
                        } else {
                            node.value += open + close;
                            node.selectionEnd = node.value.length - close.length;
                            node.selectionStart = node.selectionEnd;
                        }

                        input.focus().trigger('change');
                    };

                    container_reason.find(".button-bold").on('click', () => insert_tag('[b]', '[/b]'));
                    container_reason.find(".button-italic").on('click', () => insert_tag('[i]', '[/i]'));
                    container_reason.find(".button-underline").on('click', () => insert_tag('[u]', '[/u]'));
                    container_reason.find(".button-color input").on('change', event => {
                        insert_tag('[color=' + (event.target as HTMLInputElement).value + ']', '[/color]')
                    });
                }

                /* buttons */
                {
                    button_cancel.on('click', event => modal.close());
                    button_ok.on('click', event => {
                        const duration = input_duration_type.val() === "perm" ? 0 : (1000 * parseInt(input_duration_type.find("option[value='" +  input_duration_type.val() + "']").attr("duration-scale")) * parseInt(input_duration_value.val() as string));

                        modal.close();
                        callback({
                            length: Math.floor(duration / 1000),
                            reason: container_reason.find("textarea").val() as string,

                            no_hwid: !criteria_hardware_id.find("input").prop("checked"),
                            no_ip: !criteria_ip_address.find("input").prop("checked"),
                            no_name: !criteria_nickname.find("input").prop("checked")
                        });
                    });

                    const inputs = template.find(".input-boxed");
                    update_button_ok = () => {
                        const invalid = [...inputs].find(e => $(e).hasClass("is-invalid"));
                        button_ok.prop('disabled', !!invalid);
                    };
                    update_button_ok();
                }

                tooltip(template);
                return template.children();
            },
            footer: null,

            min_width: "10em",
            width: "30em"
        });
        modal.open();

        modal.htmlTag.find(".modal-body").addClass("modal-ban-client");
    }
}