namespace Modals {
    export function spawnBanCreate(base?: BanEntry, callback?: (entry?: BanEntry) => any) {
        let result: BanEntry = {} as any;
        result.banid = base ? base.banid : 0;

        let modal: Modal;
        modal = createModal({
            header: base && base.banid > 0 ? "Edit ban" : "Add ban",
            body: () => {
                let template = $("#tmpl_ban_create").renderTag();
                template = $.spawn("div").append(template);

                const input_name = template.find(".input-name");
                const input_name_type = template.find(".input-name-type");
                const input_ip = template.find(".input-ip");
                const input_uid = template.find(".input-uid");
                const input_reason = template.find(".input-reason");
                const input_time = template.find(".input-time");
                const input_time_type = template.find(".input-time-unit");
                const input_hwid = template.find(".input-hwid");
                const input_global = template.find(".input-global");

                {
                    let maxTime = 0; //globalClient.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).value;
                    let unlimited = maxTime == 0 || maxTime == -1;
                    if(unlimited) maxTime = 0;

                    input_time_type.find("option[value=\"sec\"]").prop("disabled", !unlimited && 1 > maxTime)
                        .attr("duration-scale", 1)
                        .attr("duration-max", maxTime);
                    input_time_type.find("option[value=\"min\"]").prop("disabled", !unlimited && 60 > maxTime)
                        .attr("duration-scale", 60)
                        .attr("duration-max", maxTime  / 60);
                    input_time_type.find("option[value=\"hours\"]").prop("disabled", !unlimited && 60 * 60 > maxTime)
                        .attr("duration-scale", 60 * 60)
                        .attr("duration-max", maxTime / (60 * 60));
                    input_time_type.find("option[value=\"days\"]").prop("disabled", !unlimited && 60 * 60  * 24 > maxTime)
                        .attr("duration-scale", 60 * 60 * 24)
                        .attr("duration-max", maxTime / (60 * 60 * 24));
                    input_time_type.find("option[value=\"perm\"]").prop("disabled", !unlimited)
                        .attr("duration-scale", 0);

                    input_time_type.change(event => {
                        let element = $((event.target as HTMLSelectElement).selectedOptions.item(0));
                        if(element.val() !== "perm") {
                            input_time.prop("disabled", false);

                            let current = input_time.val() as number;
                            let max = parseInt(element.attr("duration-max"));
                            if (max > 0 && current > max)
                                input_time.val(max);
                            else if(current <= 0)
                                input_time.val(1);
                            input_time.attr("max", max);
                        } else {
                            input_time.prop("disabled", true);
                        }
                    });
                }

                template.find('input, textarea').on('keyup change', event => {
                    let valid = false;

                    if(input_name.val() || input_ip.val() || input_uid.val())
                        valid = true;

                    modal.htmlTag.find(".button-success").prop("disabled", !valid);
                });

                if(base) {
                    input_ip.val(base.ip);
                    input_uid.val(base.unique_id);
                    input_name.val(base.name);
                    input_hwid.val(base.hardware_id);

                    (input_name_type[0] as HTMLSelectElement).selectedIndex = base.name_type || 0;
                    input_reason.val(base.reason);

                    if(base.timestamp_expire.getTime() == 0) {
                        input_time_type.find("option[value=\"perm\"]").prop("selected", true);
                    } else {
                        const time = (base.timestamp_expire.getTime() - base.timestamp_created.getTime()) / 1000;
                        if(time % (60 * 60 * 24) === 0) {
                            input_time_type.find("option[value=\"days\"]").prop("selected", true);
                            input_time.val(time / (60 * 60 * 24));
                        } else if(time % (60 * 60) === 0) {
                            input_time_type.find("option[value=\"hours\"]").prop("selected", true);
                            input_time.val(time / (60 * 60));
                        } else if(time % (60) === 0) {
                            input_time_type.find("option[value=\"min\"]").prop("selected", true);
                            input_time.val(time / (60));
                        } else {
                            input_time_type.find("option[value=\"sec\"]").prop("selected", true);
                            input_time.val(time);
                        }
                    }

                    template.find(".container-global").detach(); //We cant edit this
                    input_global.prop("checked", base.server_id == 0);
                }

                if(globalClient && globalClient.permissions)
                    input_global.prop("disabled", !globalClient.permissions.neededPermission(base ? PermissionType.B_CLIENT_BAN_EDIT_GLOBAL : PermissionType.B_CLIENT_BAN_CREATE_GLOBAL));

                return template;
            },
            footer: undefined
        });

        modal.htmlTag.find(".button-close").on('click', () => modal.close());
        modal.htmlTag.find(".button-success").on('click', () => {
            {
                let length = modal.htmlTag.find(".input-time").val() as number;
                let duration = modal.htmlTag.find(".input-time-unit option:selected");

                console.log(duration);
                console.log(length + "*" + duration.attr("duration-scale"));
                const time = length * parseInt(duration.attr("duration-scale"));

                if(!result.timestamp_created)
                    result.timestamp_created = new Date();
                if(time > 0)
                    result.timestamp_expire = new Date(result.timestamp_created.getTime() + time * 1000);
                else
                    result.timestamp_expire = new Date(0);
            }
            {
                result.name = modal.htmlTag.find(".input-name").val() as string;
                {
                    const name_type = modal.htmlTag.find(".input-name-type") as JQuery<HTMLSelectElement>;
                    result.name_type = name_type[0].selectedIndex;
                }
                result.ip = modal.htmlTag.find(".input-ip").val() as string;
                result.unique_id = modal.htmlTag.find(".input-uid").val() as string;
                result.reason = modal.htmlTag.find(".input-reason").val() as string;
                result.hardware_id = modal.htmlTag.find(".input-hwid").val() as string;
                result.server_id = modal.htmlTag.find(".input-global").prop("checked") ? 0 : -1;
            }

            modal.close();
            if(callback) callback(result);
        });

        modal.htmlTag.find("input").trigger("change");

        modal.open();
    }
}