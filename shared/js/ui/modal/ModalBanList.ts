/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../i18n/localize.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function openBanList(client: ConnectionHandler) {
        let modal: Modal;

        let _callback_bans;
        let _callback_triggers;
        const single_ban_handler: connection.SingleCommandHandler = {
            command: "notifybanlist",
            function: command => {
                const json = command.arguments;

                let bans: BanEntry[] = [];
                for(const entry of json) {
                    bans.push({
                        server_id: parseInt(entry["sid"]),
                        banid: parseInt(entry["banid"]),
                        ip: entry["ip"],
                        name: entry["name"],
                        unique_id: entry["uid"],
                        hardware_id: entry["hwid"],

                        timestamp_created: (parseInt(entry["created"]) * 1000),
                        timestamp_expire: (parseInt(entry["duration"]) > 0 ? parseInt(entry["created"]) * 1000 + parseInt(entry["duration"]) * 1000 : 0),

                        invoker_name: entry["invokername"],
                        invoker_database_id: parseInt(entry["invokercldbid"]),
                        invoker_unique_id: entry["invokeruid"],
                        reason: entry["reason"],

                        enforcements: parseInt(entry["enforcements"]),
                        flag_own: entry["invokeruid"] == client.getClient().properties.client_unique_identifier
                    });
                }

                _callback_bans(bans);
                return false; /* do not remove me */
            }
        };
        const single_trigger_handler: connection.SingleCommandHandler = {
            command: "notifybantriggerlist",
            function: command => {
                //TODO: Test the server id in the response?
                const json = command.arguments;

                let triggers: TriggerEntry[] = [];
                for(const entry of json) {
                    triggers.push({
                        unique_id: entry["client_unique_identifier"],
                        client_nickname: entry["client_nickname"],
                        hardware_id: entry["client_hardware_identifier"],
                        connection_ip: entry["connection_client_ip"],

                        timestamp: parseInt(entry["timestamp"])
                    });
                }

                _callback_triggers(triggers);
                return false; /* do not remove me */
            }
        };

        const controller: BanListController = {
            request_list(_callback): Promise<void> {
                _callback_bans = _callback;
                return new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        cleanup();
                        reject("timeout");
                    }, 2500);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        _callback_bans = undefined;
                    };

                    Promise.all([
                        client.serverConnection.send_command("banlist", { sid: 0 }, {process_result: false}).catch(error => {
                            //TODO: May lookup for permissions
                        }),
                        client.serverConnection.send_command("banlist").catch(async error => {
                            if(error instanceof CommandResult)
                                if(error.id === ErrorID.EMPTY_RESULT)
                                    return;
                            throw error;
                        })
                    ]).then(() => {
                        if(_callback_bans) resolve();
                        cleanup();
                    }).catch(error => {
                        if(_callback_bans) reject(error);
                        cleanup();
                    });
                });
            },
            request_trigger_list(ban, _callback): Promise<void> {
                _callback_triggers = _callback;
                return new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        cleanup();
                        reject("timeout");
                    }, 2500);

                    const cleanup = () => {
                        clearTimeout(timeout);
                        _callback_triggers = undefined;
                    };

                    const data = {banid: ban.ban_id};
                    if(typeof ban.server_id !== "undefined")
                        data["sid"] = ban.server_id;
                    client.serverConnection.send_command("bantriggerlist", data).catch(async error => {
                        if(error instanceof CommandResult)
                            if(error.id === ErrorID.EMPTY_RESULT)
                                return;
                        throw error;
                    }).then(() => {
                        if(_callback_triggers) resolve();
                        cleanup();
                    }).catch(error => {
                        if(_callback_triggers) reject(error);
                        cleanup();
                    });
                });
            },
            async max_bantime(): Promise<number> {
                const value = client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).value || 0;
                return value == -2 ? 0 : value;
            },
            async permission_add(): Promise<boolean[]> {
                return [
                    client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_CREATE).granted(1),
                    client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_CREATE_GLOBAL).granted(1)
                ];
            },
            async permission_edit(): Promise<boolean[]> {
                return [
                    client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_EDIT).granted(1),
                    client.permissions.neededPermission(PermissionType.B_CLIENT_BAN_EDIT_GLOBAL).granted(1) && false
                ];
            },
            add_ban(entry: BanEntry): Promise<void> {
                const data = {};

                if(entry.ip) data["ip"] = entry.ip;
                if(entry.name) data["name"] = entry.name;
                if(entry.unique_id) data["uid"] = entry.unique_id;
                if(entry.hardware_id) data["hwid"] = entry.hardware_id;
                if(entry.reason) data["banreason"] = entry.reason;
                if(entry.timestamp_expire) data["time"] = Math.floor((entry.timestamp_expire - entry.timestamp_created) / 1000);
                if(typeof(entry.server_id) === "number") data["sid"] = entry.server_id;

                return client.serverConnection.send_command("banadd", data).then(e => { if(!e.success) throw e; });
            },
            edit_ban(data: any): Promise<void> {
                return client.serverConnection.send_command("banedit", data).then(e => { if(!e.success) throw e; });
            },
            delete_ban(entry_id, server_id): Promise<void> {
                const data = {
                    banid: entry_id
                };
                if(typeof(server_id) === "number")
                    data["sid"] = server_id;

                return client.serverConnection.send_command("bandel", data).then(e => { if(!e.success) throw e; });
            }
        };

        modal = createModal({
            header: tr("Server Banlist"),
            body: () => generate_dom(controller),
            footer: null,

            width: '60em'
        });

        client.serverConnection.command_handler_boss().register_single_handler(single_ban_handler);
        client.serverConnection.command_handler_boss().register_single_handler(single_trigger_handler);
        modal.close_listener.push(() => {
            client.serverConnection.command_handler_boss().remove_single_handler(single_ban_handler);
            client.serverConnection.command_handler_boss().remove_single_handler(single_trigger_handler);
        });

        //TODO: Test without dividerfy!
        modal.htmlTag.dividerfy();
        modal.htmlTag.find(".modal-body").addClass("modal-ban-list");
        modal.open();
    }

    interface BanEntry {
        server_id: number;
        banid: number;

        name?: string;
        name_type?: number;

        unique_id?: string;
        ip?: string;
        hardware_id?: string;

        reason: string;
        invoker_name: string;
        invoker_unique_id?: string;
        invoker_database_id?: number;

        timestamp_created: number;
        timestamp_expire: number;

        enforcements: number;

        flag_own?: boolean;
    }

    interface TriggerEntry {
        unique_id?: string;
        client_nickname?: string;
        hardware_id?: string;
        connection_ip: string;

        timestamp: number;
    }

    interface BanListController {
        request_list(callback_bans: (entries: BanEntry[]) => any) : Promise<void>;
        request_trigger_list(ban: {ban_id: number, server_id: number | undefined}, callback_triggers: (entries: TriggerEntry[]) => any) : Promise<void>;

        max_bantime() : Promise<number>;
        permission_edit() : Promise<boolean[]>;
        permission_add() : Promise<boolean[]>;

        add_ban(entry: BanEntry) : Promise<void>;
        edit_ban(data: any) : Promise<void>;
        delete_ban(entry_id: number, server_id: number | undefined) : Promise<void>;
    }

    //Note: This object must be sorted (from shortest to longest)!
    export const duration_data = {
        "sec": {
            "text": tr("Seconds"),
            "1-text": tr("Second"),

            scale: 1
        },
        "min": {
            "text": tr("Minutes"),
            "1-text": tr("Minute"),

            scale: 60
        },
        "hours": {
            "text": tr("Hours"),
            "1-text": tr("Hour"),

            scale: 3600
        },
        "days": {
            "text": tr("Days"),
            "1-text": tr("Day"),

            scale: 86400
        },
    };

    function generate_dom(controller: BanListController) : JQuery {
        const template = $("#tmpl_ban_list").renderTag();

        let callback_ban_filter: ((text: string, flag_own: boolean, highlight_own: boolean) => boolean)[] = [];
        let callback_trigger_filter: ((text: string) => boolean)[] = [];
        let selected_ban: BanEntry | undefined;
        let update_edit_window: (switch_to: boolean) => any;
        let update_ban_filter: () => any;
        let update_trigger_filter: () => any;

        const container_ban = template.find(".container-banlist");
        const container_ban_entries = container_ban.find(".container-list .body");
        const container_ban_entries_empty = container_ban.find(".container-list .container-empty");
        const container_ban_entries_error = container_ban.find(".container-list .container-error");

        const container_trigger = template.find(".container-triggerlist").hide();
        const container_trigger_entries = container_trigger.find(".container-list .body");
        const container_trigger_entries_empty = container_trigger.find(".container-list .container-empty");
        const container_trigger_entries_error = container_trigger.find(".container-list .container-error");

        const button_apply = template.find(".button-apply");
        let button_apply_state = [false, false]; /* first index is add; second index is edit */
        let update_category_inputs: (() => any)[] = [undefined, undefined];
        let button_apply_state_index = 1;

        const category_add = template.find(".left .head .category-add");
        const category_edit = template.find(".left .head .category-edit");
        const container_add = template.find(".left .container-add");
        const container_add_no_permissions = template.find(".left .container-add .container-no-permissions");
        const container_edit = template.find(".left .container-edit");

        const seperator_top = template.find(".container-seperator .top");

        /* [local; global] */
        let permission_edit: boolean[] = [false, false], permission_add: boolean[] = [false, false];

        container_add_no_permissions.hide();
        controller.permission_add().then(result => permission_add = result).catch(error => {
            log.error(LogCategory.CLIENT, tr("Failed to query ban add permissions: %o"), error);
        }).then(() => {
            if(permission_add[0] !== permission_add[1]) {
                const input_global = container_add.find(".group-global input");
                input_global.prop("checked", permission_add[1]).prop("disabled", true).firstParent(".checkbox").addClass("disabled");
            } else if(!permission_add[0])
                container_add_no_permissions.show();
        });

        controller.permission_edit().then(result => permission_edit = result).catch(error => {
            log.error(LogCategory.CLIENT, tr("Failed to query ban edit permissions: %o"), error);
        }).then(() => {
            if(selected_ban) update_edit_window(false);
        });

        /* category switch */
        {
            category_add.on('click', event => {
                container_add.removeClass("hidden");
                category_add.addClass("selected");

                container_edit.addClass("hidden");
                category_edit.removeClass("selected");

                seperator_top.css({opacity: 1});

                button_apply_state_index = 0;
                button_apply.prop("disabled", !button_apply_state[0]).text(tr("Add ban"));
                update_category_inputs[button_apply_state_index]();
            });

            category_edit.on('click', event => {
                if(!selected_ban) return;

                container_add.addClass("hidden");
                category_add.removeClass("selected");

                container_edit.removeClass("hidden");
                category_edit.addClass("selected");

                seperator_top.css({opacity: 0});

                button_apply_state_index = 1;
                button_apply.prop("disabled", !button_apply_state[1]).text(tr("Save ban"));
                update_category_inputs[button_apply_state_index]();
            });
        }

        const build_ban_entry = (entry: BanEntry, selected: boolean) => {
            let button_delete;
            const tag = $.spawn("div").addClass("entry" + (entry.server_id > 0 ? "" : " global") + (selected ? " selected" : "")).append(
                $.spawn("div").addClass("column column-key").append(
                    entry.name ? $.spawn("div").append(entry.name) : undefined,
                    entry.ip ? $.spawn("div").append(entry.ip) : undefined,
                    entry.unique_id ? $.spawn("div").append(entry.unique_id) : undefined,
                    entry.hardware_id ? $.spawn("div").append(entry.hardware_id) : undefined
                ),
                $.spawn("div").addClass("column column-reason").text(entry.reason),
                $.spawn("div").addClass("column column-expires").text(entry.timestamp_expire ? moment(entry.timestamp_expire).format('DD.MM.YYYY hh:mm') : tr("Never")),
                $.spawn("div").addClass("column column-delete").append(
                    button_delete = $.spawn("div").addClass("button-delete").append(
                        $.spawn("div").addClass("icon_em client-delete")
                    )
                )
            );

            tag.on('click', event => {
                if(selected_ban === entry || event.isDefaultPrevented()) return;
                selected_ban = entry;

                container_ban_entries.find(".entry.selected").removeClass("selected");
                tag.addClass("selected");

                update_edit_window(true);
            });

            button_delete.on('click', event => {
                event.preventDefault();

                controller.delete_ban(entry.banid, entry.server_id).then(() => {
                    tag.css({opacity: 1}).animate({opacity: 0}, 250, () => tag.animate({"max-height": 0}, 250, () => tag.remove()));
                    if(entry === selected_ban) {
                        selected_ban = undefined;
                        update_edit_window(false);
                    }
                }).catch(error => {
                    log.error(LogCategory.CLIENT, tr("Failed to delete ban: %o"), error);
                    if(error instanceof CommandResult)
                        error = error.id === ErrorID.PERMISSION_ERROR ? "no permissions" : error.extra_message || error.message;
                    createErrorModal(tr("Failed to delete ban"), MessageHelper.formatMessage(tr("Failed to delete ban. {:br:}Error: {}"), error)).open();
                });
            });

            if(selected) {
                selected_ban = entry;
                update_edit_window(false);
            }

            const lower_mesh =
                (entry.reason || "").toLowerCase() + " " +
                (entry.unique_id || "").toLowerCase() + " " +
                (entry.name || "").toLowerCase() + " " +
                (entry.ip || "").toLowerCase() + " " +
                (entry.hardware_id || "").toLowerCase();
            callback_ban_filter.push((text, flag_own, highlight_own) => {
                if(text && lower_mesh.indexOf(text) == -1) {
                    tag.hide();
                    return false;
                }

                if(flag_own && !entry.flag_own) {
                    tag.hide();
                    return false;
                }

                tag.show().toggleClass(
                    "highlight",
                    highlight_own &&
                    entry.flag_own
                );
                return true;
            });

            return tag;
        };

        const update_banlist = (selected_ban?: number) => {
            callback_ban_filter = [];

            container_ban_entries.find(".entry").remove();
            container_ban_entries_error.hide();
            container_ban_entries_empty.show().find("a").text(tr("Loading..."));

            let bans = [];
            controller.request_list(_bans => bans.push(..._bans)).then(() => {
                if(bans.length) {
                    container_ban_entries.append(...bans.map(e => build_ban_entry(e, e.banid === selected_ban)));
                    container_ban_entries_empty.hide();
                } else {
                    container_ban_entries_empty.find("a").text(tr("No bans registered"));
                }
                update_ban_filter();
            }).catch(error => {
                log.info(LogCategory.CLIENT, tr("Failed to update ban list: %o"), error);
                if(error instanceof CommandResult)
                    error = error.id === ErrorID.PERMISSION_ERROR ? tr("no permissions") : error.extra_message || error.message;
                container_ban_entries_error.show().find("a").text(tr("Failed to receive banlist: ") + error);
                container_ban_entries_empty.hide();
            });
        };

        const build_trigger_entry = (entry: TriggerEntry) => {
            const spawn_key_value = (key, value, reason) => {
                return $.spawn("div").addClass("property").toggleClass("highlighted", reason).append(
                    $.spawn("div").addClass("key").text(key + ": "),
                    $.spawn("div").addClass("value").text(value)
                );
            };

            let cause_name = !!selected_ban.name && !!entry.client_nickname.match(selected_ban.name);
            let cause_uid = !cause_name && !!selected_ban.unique_id && selected_ban.unique_id.toLowerCase() === (entry.unique_id || "").toLowerCase();
            let cause_ip = !cause_uid && !!selected_ban.ip && selected_ban.ip.toLowerCase() === (entry.connection_ip || "").toLowerCase();
            let cause_hwid = !cause_ip && !!selected_ban.hardware_id && selected_ban.hardware_id.toLowerCase() === (entry.hardware_id || "").toLowerCase();

            /* we guess that IP is the cause because we dont see the IP and there is no other reason */
            if(!cause_name && !cause_uid && !cause_ip && !cause_hwid && entry.connection_ip === "hidden")
                cause_ip = true;

            const time_str = moment(entry.timestamp).format('DD.MM.YYYY hh:mm');

            const tag = $.spawn("div").addClass("entry").append(
                $.spawn("div").addClass("column column-properties").append(
                    entry.client_nickname ? spawn_key_value(tr("Nickname"), entry.client_nickname, cause_name) : undefined,
                    entry.connection_ip ? spawn_key_value(tr("IP"), entry.connection_ip, cause_ip) : undefined,
                    entry.unique_id ? spawn_key_value(tr("Unique ID"), entry.unique_id, cause_uid) : undefined,
                    entry.hardware_id ? spawn_key_value(tr("Hardware ID"), entry.hardware_id, cause_hwid) : undefined
                ),
                $.spawn("div").addClass("column column-timestamp").text(time_str)
            );

            const lower_mesh =
                (entry.unique_id || "").toLowerCase() + " " +
                (entry.client_nickname || "").toLowerCase() + " " +
                (entry.connection_ip || "").toLowerCase() + " " +
                (entry.hardware_id || "").toLowerCase() + " " +
                time_str + " " +
                entry.timestamp;
            callback_trigger_filter.push(text => {
                if(text && lower_mesh.indexOf(text) == -1) {
                    tag.hide();
                    return false;
                }

                tag.show();
                return true;
            });

            return tag;
        };

        const update_triggerlist = () => {
            callback_trigger_filter = [];

            container_trigger_entries.find(".entry").remove();
            container_trigger_entries_error.hide();
            container_trigger_entries_empty.show().find("a").text(tr("Loading..."));

            let triggers = [];
            controller.request_trigger_list({
                ban_id: selected_ban.banid,
                server_id: selected_ban.server_id
            }, _triggers => triggers.push(..._triggers)).then(() => {
                if(triggers.length) {
                    container_trigger_entries.append(...triggers.sort((a, b) => b.timestamp - a.timestamp).map(e => build_trigger_entry(e)));
                    container_trigger_entries_empty.hide();
                } else {
                    container_trigger_entries_empty.find("a").text(tr("No triggers logged"));
                }

                update_trigger_filter();
            }).catch(error => {
                log.info(LogCategory.CLIENT, tr("Failed to update trigger list: %o"), error);
                if(error instanceof CommandResult)
                    error = error.id === ErrorID.PERMISSION_ERROR ? tr("no permissions") : error.extra_message || error.message;
                container_trigger_entries_error.show().find("a").text(tr("Failed to receive trigger list: ") + error);
                container_trigger_entries_empty.hide();
            });
        };

        const show_triggerlist = () => {
            container_trigger.show();
        };

        /* general input field rules */
        const initialize_fields = (tag: JQuery, index: number) => {
            const input_name = tag.find(".group-name input").on('change keyup', () => update_category_inputs[index]());
            const input_ip = tag.find(".group-ip input").on('change keyup', () => update_category_inputs[index]());
            const input_uid = tag.find(".group-unique-id input").on('change keyup', () => update_category_inputs[index]());
            const input_hwid = tag.find(".group-hwid input").on('change keyup', () => update_category_inputs[index]());
            const input_reason = tag.find(".group-reason textarea").on('change keyup', () => update_category_inputs[index]());
            //const input_global = tag.find(".group-global input");
            const input_duration_value = tag.find(".group-duration input").on('change keyup', () => update_category_inputs[index]());
            const input_duration_type = tag.find(".group-duration select").on('change keyup', () => update_category_inputs[index]());
            const tooltip_duration_max = tag.find(".tooltip-max-time a.max");

            update_category_inputs[index] = () => {
                let _criteria_set = false;
                let _input_invalid = false;

                {
                    //TODO: Check if in regex mode or not
                    const value = input_name.val() as string || "";
                    if(value.length > 255) {
                        _input_invalid = true;
                        input_name.firstParent(".input-boxed").addClass("is-invalid");
                    } else {
                        _criteria_set = _criteria_set || !!value;
                        input_name.firstParent(".input-boxed").removeClass("is-invalid");
                    }
                }

                {
                    //TODO: Check if in regex mode or not
                    const value = input_ip.val() as string || "";
                    if(value.length > 255) {
                        _input_invalid = true;
                        input_ip.firstParent(".input-boxed").addClass("is-invalid");
                    } else {
                        _criteria_set = _criteria_set || !!value;
                        input_ip.firstParent(".input-boxed").removeClass("is-invalid");
                    }
                }

                {
                    const value = input_uid.val() as string || "";
                    try {
                        if(value && atob(value).length != 20) throw "";

                        _criteria_set = _criteria_set || !!value;
                        input_uid.firstParent(".input-boxed").removeClass("is-invalid");
                    } catch(e) {
                        _input_invalid = true;
                        input_uid.firstParent(".input-boxed").addClass("is-invalid");
                    }
                }

                {
                    const value = input_hwid.val() as string || "";
                    if(value.length > 255) {
                        _input_invalid = true;
                        input_hwid.firstParent(".input-boxed").addClass("is-invalid");
                    } else {
                        _criteria_set = _criteria_set || !!value;
                        input_hwid.firstParent(".input-boxed").removeClass("is-invalid");
                    }
                }

                {
                    const value = input_reason.val() as string || "";
                    if(value.length > 512) {
                        _input_invalid = true;
                        input_reason.firstParent(".input-boxed").addClass("is-invalid");
                    } else {
                        input_reason.firstParent(".input-boxed").removeClass("is-invalid");
                    }
                }

                {
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
                            _input_invalid = true;
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
                }

                button_apply.prop("disabled", !(button_apply_state[button_apply_state_index] = _criteria_set && !_input_invalid));
            };

            /* initialize ban time */
            controller.max_bantime().catch(error => { /* TODO: Error handling? */ return 0; }).then(max_time => {
                let unlimited = max_time == 0 || max_time == -1;
                if(unlimited) max_time = 0;

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
            });
        };
        initialize_fields(container_add, 0);
        initialize_fields(container_edit, 1);

        /* the edit "handler" */
        {
            const tag = container_edit;
            const input_name = tag.find(".group-name input");
            const input_ip = tag.find(".group-ip input");
            const input_interpret = tag.find(".group-interpret select");
            const input_uid = tag.find(".group-unique-id input");
            const input_hwid = tag.find(".group-hwid input");
            const input_reason = tag.find(".group-reason textarea");
            const input_global = tag.find(".group-global input");
            const input_duration_value = tag.find(".group-duration input");
            const input_duration_type = tag.find(".group-duration select");
            const tooltip_duration_detailed = tag.find(".tooltip-max-time a.detailed");

            const label_enforcement_count = tag.find(".group-enforcements .value a");
            const button_enforcement_list = tag.find(".button-enforcement-list");

            const container_creator = tag.find(".group-creator .value");

            update_edit_window = (switch_to: boolean) => {
                category_edit.toggleClass("disabled", !selected_ban);

                const editable = selected_ban && selected_ban.server_id === 0 ? permission_edit[1] : permission_edit[0];

                input_name.val(selected_ban ? selected_ban.name : null).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                input_ip.val(selected_ban ? selected_ban.ip : null).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                input_uid.val(selected_ban ? selected_ban.unique_id : null).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                input_hwid.val(selected_ban ? selected_ban.hardware_id : null).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                input_reason.val(selected_ban ? selected_ban.reason : null).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);

                input_interpret.find("option").eq(selected_ban && typeof(selected_ban.name_type) === "number" ? selected_ban.name_type : 2).prop("selected", true).prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                label_enforcement_count.text((selected_ban ? selected_ban.enforcements : 0) || 0);
                button_enforcement_list.prop("disabled", !selected_ban || selected_ban.enforcements == 0);

                input_global.prop("checked", selected_ban && selected_ban.server_id == 0);

                input_duration_type.prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);
                input_duration_value.prop("disabled", !editable).firstParent(".input-boxed").toggleClass("disabled", !editable);

                if(selected_ban) {
                    if(selected_ban.timestamp_expire > selected_ban.timestamp_created) {
                        const duration = Math.ceil((selected_ban.timestamp_expire - selected_ban.timestamp_created) / 1000);

                        const periods = Object.keys(duration_data);
                        let index;
                        for(index = 0; index < periods.length; index++) {
                            if(duration_data[periods[index]].scale > duration + 1 || ((duration + 1) % duration_data[periods[index]].scale) > 1.9)
                                break;
                        }
                        if(index > 0) index--;
                        input_duration_type.find("option[value='" + periods[index] + "']").prop("selected", true);
                        input_duration_value.val(Math.ceil(duration / duration_data[periods[index]].scale));
                        tooltip_duration_detailed.text($.spawn("div").append(...MessageHelper.formatMessage(tr("The ban lasts for exact {}."), MessageHelper.format_time(duration * 1000, "never"))).text());
                    } else {
                        tooltip_duration_detailed.text(tr("The ban is forever."));
                        input_duration_value.attr("placeholder", tr("for ever")).val(null).prop('disabled', true);
                        input_duration_type.find("option[value='perm']").prop("selected", true);
                    }
                }

                container_creator.empty();
                if(selected_ban) {
                    container_creator.append(
                        htmltags.generate_client_object({
                            client_id: 0,
                            client_unique_id: selected_ban.invoker_unique_id,
                            client_name: selected_ban.invoker_name,
                            add_braces: false
                        })
                    );
                }

                if(switch_to)
                    category_edit.trigger('click');
            };

            button_apply.on('click', event => {
                if (!button_apply_state[1] || button_apply_state_index != 1) return;

                const data = {banid: selected_ban.banid};

                if(input_ip.val() != selected_ban.ip)
                    data["ip"] = input_ip.val();

                if(input_name.val() != selected_ban.name)
                    data["name"] = input_name.val();

                if(input_uid.val() != selected_ban.unique_id)
                    data["uid"] = input_uid.val();

                if(input_hwid.val() != selected_ban.hardware_id)
                    data["hwid"] = input_hwid.val();

                if(input_reason.val() != selected_ban.reason)
                    data["banreason"] = input_reason.val();

                if(input_reason.val() != selected_ban.reason)
                    data["reason"] = input_reason.val();

                const duration = input_duration_type.val() === "perm" ? 0 : (1000 * parseInt(input_duration_type.find("option[value='" +  input_duration_type.val() + "']").attr("duration-scale")) * parseInt(input_duration_value.val() as string));
                if(selected_ban.timestamp_expire > 0 ? (selected_ban.timestamp_expire - selected_ban.timestamp_created != duration) : duration != 0)
                    data["time"] = Math.floor(duration / 1000);

                controller.edit_ban(data).then(() => {
                    update_banlist(selected_ban ? selected_ban.banid : undefined);

                    selected_ban = undefined;
                    update_edit_window(false);

                    createInfoModal(tr("Ban successfully edited"), tr("Your ban has been successfully edited.")).open();
                }).catch(error => {
                    log.error(LogCategory.CLIENT, tr("Failed to edited ban: %o"), error);
                    if(error instanceof CommandResult)
                        error = error.id === ErrorID.PERMISSION_ERROR ? "no permissions" : error.extra_message || error.message;
                    createErrorModal(tr("Failed to edited ban"), MessageHelper.formatMessage(tr("Failed to edited ban. {:br:}Error: {}"), error)).open();
                });
            });

            button_enforcement_list.on('click', () => {
                update_triggerlist();
                show_triggerlist();
            });
        }

        /* the create "handler" */
        {
            const tag = container_add;
            const input_name = tag.find(".group-name input");
            const input_ip = tag.find(".group-ip input");
            const input_interpret = tag.find(".group-interpret select");
            const input_uid = tag.find(".group-unique-id input");
            const input_hwid = tag.find(".group-hwid input");
            const input_reason = tag.find(".group-reason textarea");
            const input_global = tag.find(".group-global input");
            const input_duration_value = tag.find(".group-duration input");
            const input_duration_type = tag.find(".group-duration select");

            button_apply.on('click', event => {
                if(!button_apply_state[0] || button_apply_state_index != 0) return;

                const data: BanEntry = {
                    banid: 0,
                    enforcements: 0,
                } as any;

                if(input_global.prop('checked'))
                    data.server_id = 0;

                if(input_ip.val())
                    data.ip = input_ip.val() as any;

                if(input_name.val())
                    data.name = input_name.val() as any;

                if(input_uid.val())
                    data.unique_id = input_uid.val() as any;

                if(input_hwid.val())
                    data.hardware_id = input_hwid.val() as any;

                if(input_reason.val())
                    data.reason = input_reason.val() as any;

                data.timestamp_created = Date.now();

                data.timestamp_expire = input_duration_type.val() === "perm" ? 0 : (data.timestamp_created + 1000 * parseInt(input_duration_type.find("option[value='" +  input_duration_type.val() + "']").attr("duration-scale")) * parseInt(input_duration_value.val() as string));
                //TODO: input_interpret (Currently not supported by TeaSpeak)

                controller.add_ban(data).then(() => {
                    input_name.val(null);
                    input_ip.val(null);
                    input_uid.val(null);
                    input_hwid.val(null);
                    input_reason.val(null);
                    input_duration_value.val(1);
                    update_banlist();

                    createInfoModal(tr("Ban successfully added"), tr("Your ban has been successfully added.")).open();
                }).catch(error => {
                    log.error(LogCategory.CLIENT, tr("Failed to add ban: %o"), error);
                    if(error instanceof CommandResult)
                        error = error.id === ErrorID.PERMISSION_ERROR ? "no permissions" : error.extra_message || error.message;
                    createErrorModal(tr("Failed to add ban"), MessageHelper.formatMessage(tr("Failed to add ban. {:br:}Error: {}"), error)).open();
                });
            });
        }

        /* the banlist filter */
        {
            const input_filter = container_ban.find(".container-filter input").on('change keyup', () => update_ban_filter());
            const option_show_own = container_ban.find(".option-show-own").on('change keyup', () => update_ban_filter());
            const option_hightlight_own = container_ban.find(".option-highlight-own").on('change keyup', () => update_ban_filter());

            update_ban_filter = () => {
                const text = (input_filter.val() as string || "").toLowerCase();
                const flag_show_own = option_show_own.prop('checked');
                const flag_hightlight_own = option_hightlight_own.prop('checked');

                let count = 0;
                for(const entry of callback_ban_filter)
                    if(entry(text, flag_show_own, flag_hightlight_own))
                        count++;
                if(callback_ban_filter.length != 0) {
                    if(count > 0)
                        container_ban_entries_empty.hide();
                    else
                        container_ban_entries_empty.show().find("a").text(tr("No bans found"));
                }
            };
        }

        /* the trigger list filter */
        {
            const input_filter = container_trigger.find(".container-filter input").on('change keyup', () => update_trigger_filter());
            const option_hightlight_cause = container_trigger.find(".option-highlight-cause").on('change keyup', () => update_trigger_filter());
            const button_close = container_trigger.find(".container-close");

            update_trigger_filter = () => {
                const text = (input_filter.val() as string || "").toLowerCase();

                let count = 0;
                for(const entry of callback_trigger_filter)
                    if(entry(text))
                        count++;
                if(callback_trigger_filter.length != 0) {
                    if(count > 0)
                        container_trigger_entries_empty.hide();
                    else
                        container_trigger_entries_empty.show().find("a").text(tr("No trigger events found"));
                }
                container_trigger.find(".container-list").toggleClass('highlight', option_hightlight_cause.prop('checked'));
            };

            button_close.on('click', () => container_trigger.hide());
        }

        template.find(".button-refresh-banlist").on('click', event => update_banlist(selected_ban ? selected_ban.banid : undefined));
        template.find(".button-refresh-triggerlist").on('click', event => update_triggerlist());

        /* initialize */
        category_add.trigger('click');
        update_edit_window(false);
        update_banlist();

        tooltip(template);
        return template.children();
    }
}

//container-triggerlist