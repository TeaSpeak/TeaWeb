/// <reference path="../../ui/elements/modal.ts" />

namespace Modals {
    export function createChannelModal(connection: ConnectionHandler, channel: ChannelEntry | undefined, parent: ChannelEntry | undefined, permissions: PermissionManager, callback: (properties?: ChannelProperties, permissions?: PermissionValue[]) => any) {
        let properties: ChannelProperties = { } as ChannelProperties; //The changes properties
        const modal = createModal({
            header: channel ? tr("Edit channel") : tr("Create channel"),
            body: () => {
                const render_properties = {};
                Object.assign(render_properties, channel ? channel.properties : {
                    channel_flag_maxfamilyclients_unlimited: true,
                    channel_flag_maxclients_unlimited: true,
                });
                render_properties["channel_icon_tab"] = connection.fileManager.icons.generateTag(channel ? channel.properties.channel_icon_id : 0);
                render_properties["channel_icon_general"] = connection.fileManager.icons.generateTag(channel ? channel.properties.channel_icon_id : 0);
                render_properties["create"] = !channel;

                let template = $("#tmpl_channel_edit").renderTag(render_properties);

                /* the tab functionality */
                {
                    const container_tabs = template.find(".container-advanced");
                    container_tabs.find(".categories .entry").on('click', event => {
                        const entry = $(event.target);

                        container_tabs.find(".bodies > .body").addClass("hidden");
                        container_tabs.find(".categories > .selected").removeClass("selected");

                        entry.addClass("selected");
                        container_tabs.find(".bodies > .body." + entry.attr("container")).removeClass("hidden");
                    });

                    container_tabs.find(".entry").first().trigger('click');
                }

                /* Advanced/normal switch */
                {
                    const input = template.find(".input-advanced-mode");
                    const container_mode = template.find(".mode-container");
                    const container_advanced = container_mode.find(".container-advanced");
                    const container_simple = container_mode.find(".container-simple");
                    input.on('change', event => {
                        const advanced = input.prop("checked");
                        settings.changeGlobal(Settings.KEY_CHANNEL_EDIT_ADVANCED, advanced);

                        container_mode.css("overflow", "hidden");
                        container_advanced.show().toggleClass("hidden", !advanced);
                        container_simple.show().toggleClass("hidden", advanced);

                        setTimeout(() => {
                            container_advanced.toggle(advanced);
                            container_simple.toggle(!advanced);
                            container_mode.css("overflow", "visible");
                        }, 300);
                    }).prop("checked", settings.static_global(Settings.KEY_CHANNEL_EDIT_ADVANCED)).trigger('change');
                }

                return template.tabify().children(); /* the "render" div */
            },
            footer: null,
            width: 500
        });
        modal.htmlTag.find(".modal-body").addClass("modal-channel modal-blue");


        applyGeneralListener(connection, properties, modal.htmlTag.find(".container-general"), modal.htmlTag.find(".button_ok"), channel);
        applyStandardListener(connection, properties, modal.htmlTag.find(".container-standard"), modal.htmlTag.find(".container-simple"), parent, channel);
        applyPermissionListener(connection, properties, modal.htmlTag.find(".container-permissions"), modal.htmlTag.find(".button_ok"), permissions, channel);
        applyAudioListener(connection, properties, modal.htmlTag.find(".container-audio"), modal.htmlTag.find(".container-simple"), channel);
        applyAdvancedListener(connection, properties, modal.htmlTag.find(".container-misc"), modal.htmlTag.find(".button_ok"), channel);

        let updated: PermissionValue[] = [];
        modal.htmlTag.find(".button_ok").click(() => {
            modal.htmlTag.find(".container-permissions").find("input[permission]").each((index, _element) => {
                let element = $(_element);
                if(element.val() == element.attr("original-value")) return;
                let permission = permissions.resolveInfo(element.attr("permission"));
                if(!permission) {
                    log.error(LogCategory.PERMISSIONS, tr("Failed to resolve channel permission for name %o"), element.attr("permission"));
                    element.prop("disabled", true);
                    return;
                }

                updated.push(new PermissionValue(permission, element.val()));
            });
            console.log(tr("Updated permissions %o"), updated);
        }).click(() => {
            modal.close();
            for(const key of Object.keys(channel ? channel.properties : {}))
                if(channel.properties[key] == properties[key])
                    delete properties[key];
            callback(properties, updated); //First may create the channel
        });

        tooltip(modal.htmlTag);
        modal.htmlTag.find(".button_cancel").click(() => {
            modal.close();
            callback();
        });

        modal.open();
        if(!channel)
            modal.htmlTag.find(".channel_name").focus();
    }

    function applyGeneralListener(connection: ConnectionHandler, properties: ChannelProperties, tag: JQuery, button: JQuery, channel: ChannelEntry | undefined) {
        let updateButton = () => {
            const status = tag.find(".input_error").length != 0;
            console.log("Disabled: %o", status);
            button.prop("disabled", status);
        };

        {
            const channel_name = tag.find(".channel_name");
            tag.find(".channel_name").on('change keyup', function (this: HTMLInputElement) {
                properties.channel_name = this.value;

                channel_name.toggleClass("input_error", this.value.length < 1 || this.value.length > 40);
                updateButton();
            }).prop("disabled", channel && !connection.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1));
        }

        tag.find(".button-select-icon").on('click', event => {
            Modals.spawnIconSelect(connection, id => {
                const icon_node = tag.find(".icon-preview");
                icon_node.children().remove();
                icon_node.append(connection.fileManager.icons.generateTag(id));

                console.log("Selected icon ID: %d", id);
                properties.channel_icon_id = id;
            }, channel ? channel.properties.channel_icon_id : 0);
        });

        tag.find(".button-icon-remove").on('click', event => {
            const icon_node = tag.find(".icon-preview");
            icon_node.children().remove();
            icon_node.append(connection.fileManager.icons.generateTag(0));

            console.log("Remove channel icon");
            properties.channel_icon_id = 0;
        });

        {
            const channel_password =  tag.find(".channel_password");
            tag.find(".channel_password").change(function (this: HTMLInputElement) {
                properties.channel_flag_password = this.value.length != 0;
                if(properties.channel_flag_password)
                    helpers.hashPassword(this.value).then(pass => properties.channel_password = pass);

                channel_password.removeClass("input_error");
                if(!properties.channel_flag_password)
                    if(connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1))
                        channel_password.addClass("input_error");
                updateButton();
            }).prop("disabled", !connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD : PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1));
        }

        tag.find(".channel_topic").change(function (this: HTMLInputElement) {
            properties.channel_topic = this.value;
        }).prop("disabled", !connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_TOPIC : PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1));

        {
            const container = tag.find(".container-description");
            const input = container.find("textarea");

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

            input.on('change', event => {
                console.log(tr("Channel description edited: %o"), input.val());
                properties.channel_description = input.val() as string;
            });

            container.find(".button-bold").on('click', () => insert_tag('[b]', '[/b]'));
            container.find(".button-italic").on('click', () => insert_tag('[i]', '[/i]'));
            container.find(".button-underline").on('click', () => insert_tag('[u]', '[/u]'));
            container.find(".button-color input").on('change', event => {
                insert_tag('[color=' + (event.target as HTMLInputElement).value + ']', '[/color]')
            })
        }
        tag.find(".channel_description").change(function (this: HTMLInputElement) {
            properties.channel_description = this.value;
        }).prop("disabled", !connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_DESCRIPTION : PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1));

        if(!channel) {
            setTimeout(() => {
                tag.find(".channel_name").trigger("change");
                tag.find(".channel_password").trigger('change');
            }, 0);
        }
    }

    function applyStandardListener(connection: ConnectionHandler, properties: ChannelProperties, tag: JQuery, simple: JQuery, parent: ChannelEntry, channel: ChannelEntry) {
        /*  Channel type */
        {
            const input_advanced_type = tag.find("input[name='channel_type']");

            let _in_update = false;
            const update_simple_type = () => {
                if(_in_update)
                    return;

                let type;
                if(properties.channel_flag_default || (typeof(properties.channel_flag_default) === "undefined" && channel && channel.properties.channel_flag_default))
                    type = "def";
                else if(properties.channel_flag_permanent || (typeof(properties.channel_flag_permanent) === "undefined" && channel && channel.properties.channel_flag_permanent))
                    type = "perm";
                else if(properties.channel_flag_semi_permanent || (typeof(properties.channel_flag_semi_permanent) === "undefined" && channel && channel.properties.channel_flag_semi_permanent))
                    type = "semi";
                else
                    type = "temp";

                simple.find("option[name='channel-type'][value='" + type + "']").prop("selected", true);
            };

            input_advanced_type.on('change', event => {
                const value = [...input_advanced_type as JQuery<HTMLInputElement>].find(e => e.checked).value;
                switch(value) {
                    case "semi":
                        properties.channel_flag_permanent = false;
                        properties.channel_flag_semi_permanent = true;
                        break;
                    case "perm":
                        properties.channel_flag_permanent = true;
                        properties.channel_flag_semi_permanent = false;
                        break;
                    default:
                        properties.channel_flag_permanent = false;
                        properties.channel_flag_semi_permanent = false;
                        break;
                }
                update_simple_type();
            });

            const permission_temp = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_TEMPORARY : PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY).granted(1);
            const permission_semi = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT).granted(1);
            const permission_perm = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1);
            const permission_default = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) &&
                connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT : PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1);

            /* advanced type listeners */
            const container_types = tag.find(".container-channel-type");
            const tag_type_temp = container_types.find(".type-temp");
            const tag_type_semi = container_types.find(".type-semi");
            const tag_type_perm = container_types.find(".type-perm");
            const select_default = tag.find(".input-flag-default");

            {
                select_default.on('change', event => {
                    const node = select_default[0] as HTMLInputElement;
                    properties.channel_flag_default = node.checked;

                    if(node.checked)
                        tag_type_perm.find("input").prop("checked", true);

                    tag_type_temp
                        .toggleClass("disabled", node.checked || !permission_temp)
                        .find("input").prop("disabled", node.checked || !permission_temp);

                    tag_type_semi
                        .toggleClass("disabled", node.checked || !permission_semi)
                        .find("input").prop("disabled", node.checked || !permission_semi);

                    tag_type_perm
                        .toggleClass("disabled", node.checked || !permission_perm)
                        .find("input").prop("disabled", node.checked || !permission_perm);

                    update_simple_type();
                }).prop("disabled", !permission_default).trigger('change').parent().toggleClass("disabled", !permission_default);
            }

            /* simple */
            {
                simple.find("option[name='channel-type'][value='def']").prop("disabled", !permission_default);
                simple.find("option[name='channel-type'][value='perm']").prop("disabled", !permission_perm);
                simple.find("option[name='channel-type'][value='semi']").prop("disabled", !permission_semi);
                simple.find("option[name='channel-type'][value='temp']").prop("disabled", !permission_temp);

                simple.find("select[name='channel-type']").on('change', event => {
                    try {
                        _in_update = true;
                        switch ((event.target as HTMLSelectElement).value) {
                            case "temp":
                                properties.channel_flag_permanent = false;
                                properties.channel_flag_semi_permanent = false;
                                properties.channel_flag_default = false;
                                select_default.prop("checked", false).trigger('change');
                                tag_type_temp.trigger('click');
                                break;
                            case "semi":
                                properties.channel_flag_permanent = false;
                                properties.channel_flag_semi_permanent = true;
                                properties.channel_flag_default = false;
                                select_default.prop("checked", false).trigger('change');
                                tag_type_semi.trigger('click');
                                break;
                            case "perm":
                                properties.channel_flag_permanent = true;
                                properties.channel_flag_semi_permanent = false;
                                properties.channel_flag_default = false;
                                select_default.prop("checked", false).trigger('change');
                                tag_type_perm.trigger('click');
                                break;
                            case "def":
                                properties.channel_flag_permanent = true;
                                properties.channel_flag_semi_permanent = false;
                                properties.channel_flag_default = true;
                                select_default.prop("checked", true).trigger('change');
                                break;
                        }
                    } finally {
                        _in_update = false;
                        /* We dont need to update the simple type because we changed the advanced part to the just changed simple part */
                        //update_simple_type();
                    }
                });
            }

            /* init */
            setTimeout(() => {
                if(!channel) {
                    if(permission_perm)
                        tag_type_perm.find("input").trigger('click');
                    else if(permission_semi)
                        tag_type_semi.find("input").trigger('click');
                    else
                        tag_type_temp.find("input").trigger('click');
                } else {
                    if(channel.properties.channel_flag_permanent)
                        tag_type_perm.find("input").trigger('click');
                    else if(channel.properties.channel_flag_semi_permanent)
                        tag_type_semi.find("input").trigger('click');
                    else
                        tag_type_temp.find("input").trigger('click');
                }
            }, 0);
        }

        /* Talk power */
        {
            const permission = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER : PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1);
            const input_advanced = tag.find("input[name='talk_power']").prop("disabled", !permission);
            const input_simple = simple.find("input[name='talk_power']").prop("disabled", !permission);

            input_advanced.on('change', event => {
                properties.channel_needed_talk_power = parseInt(input_advanced.val() as string);
                input_simple.val(input_advanced.val());
            });

            input_simple.on('change', event => {
                properties.channel_needed_talk_power = parseInt(input_simple.val() as string);
                input_advanced.val(input_simple.val());
            });
        }

        /* Channel order */
        {
            const permission = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_SORTORDER : PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1);

            const advanced_order_id = tag.find(".order_id").prop("disabled", !permission) as JQuery<HTMLSelectElement>;
            const simple_order_id = simple.find(".order_id").prop("disabled", !permission) as JQuery<HTMLSelectElement>;

            for(let previous_channel of (parent ? parent.children() : connection.channelTree.rootChannel())) {
                let selected = channel && channel.properties.channel_order == previous_channel.channelId;
                $.spawn("option").attr("channelId", previous_channel.channelId.toString()).prop("selected", selected).text(previous_channel.channelName()).appendTo(advanced_order_id);
                $.spawn("option").attr("channelId", previous_channel.channelId.toString()).prop("selected", selected).text(previous_channel.channelName()).appendTo(simple_order_id);
            }

            advanced_order_id.on('change', event => {
                simple_order_id[0].selectedIndex = advanced_order_id[0].selectedIndex;
                const selected = $(advanced_order_id[0].options.item(advanced_order_id[0].selectedIndex));
                properties.channel_order = parseInt(selected.attr("channelId"));
            });

            simple_order_id.on('change', event => {
                advanced_order_id[0].selectedIndex = simple_order_id[0].selectedIndex;
                const selected = $(simple_order_id[0].options.item(simple_order_id[0].selectedIndex));
                properties.channel_order = parseInt(selected.attr("channelId"));
            });
        }


        /* Advanced only */
        {
            const container_max_users = tag.find(".container-max-users");

            const container_unlimited = container_max_users.find(".container-unlimited");
            const container_limited = container_max_users.find(".container-limited");

            const input_unlimited = container_unlimited.find("input[value='unlimited']");
            const input_limited = container_limited.find("input[value='limited']");
            const input_limit = container_limited.find(".channel_maxclients");

            const permission = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_MAXCLIENTS : PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS).granted(1);

            if(!permission) {
                input_unlimited.prop("disabled", true);
                input_limited.prop("disabled", true);
                input_limit.prop("disabled", true);

                container_limited.addClass("disabled");
                container_unlimited.addClass("disabled");
            } else {
                container_max_users.find("input[name='max_users']").on('change', event => {
                    const node = event.target as HTMLInputElement;
                    console.log(tr("Channel max user mode: %o"), node.value);

                    const flag = node.value === "unlimited";
                    input_limit
                        .prop("disabled", flag)
                        .parent().toggleClass("disabled", flag);
                    properties.channel_flag_maxclients_unlimited = flag;
                });

                input_limit.on('change', event => {
                    properties.channel_maxclients = parseInt(input_limit.val() as string);
                    console.log(tr("Changed max user limit to %o"), properties.channel_maxclients);
                });

                setTimeout(() => container_max_users.find("input:checked").trigger('change'), 100);
            }
        }

        {
            const container_max_users = tag.find(".container-max-family-users");

            const container_unlimited = container_max_users.find(".container-unlimited");
            const container_inherited = container_max_users.find(".container-inherited");
            const container_limited = container_max_users.find(".container-limited");

            const input_unlimited = container_unlimited.find("input[value='unlimited']");
            const input_inherited = container_inherited.find("input[value='inherited']");
            const input_limited = container_limited.find("input[value='limited']");
            const input_limit = container_limited.find(".channel_maxfamilyclients");

            const permission = connection.permissions.neededPermission(!channel ? PermissionType.B_CHANNEL_CREATE_WITH_MAXCLIENTS : PermissionType.B_CHANNEL_MODIFY_MAXCLIENTS).granted(1);

            if(!permission) {
                input_unlimited.prop("disabled", true);
                input_inherited.prop("disabled", true);
                input_limited.prop("disabled", true);
                input_limit.prop("disabled", true);

                container_limited.addClass("disabled");
                container_unlimited.addClass("disabled");
                container_inherited.addClass("disabled");
            } else {
                container_max_users.find("input[name='max_family_users']").on('change', event => {
                    const node = event.target as HTMLInputElement;
                    console.log(tr("Channel max family user mode: %o"), node.value);

                    const flag_unlimited = node.value === "unlimited";
                    const flag_inherited = node.value === "inherited";
                    input_limit
                        .prop("disabled", flag_unlimited || flag_inherited)
                        .parent().toggleClass("disabled", flag_unlimited || flag_inherited);
                    properties.channel_flag_maxfamilyclients_unlimited = flag_unlimited;
                    properties.channel_flag_maxfamilyclients_inherited = flag_inherited;
                });

                input_limit.on('change', event => {
                    properties.channel_maxfamilyclients = parseInt(input_limit.val() as string);
                    console.log(tr("Changed max family user limit to %o"), properties.channel_maxfamilyclients);
                });

                setTimeout(() => container_max_users.find("input:checked").trigger('change'), 100);
            }
        }
    }

    function applyPermissionListener(connection: ConnectionHandler, properties: ChannelProperties, tag: JQuery, button: JQuery, permissions: PermissionManager, channel?: ChannelEntry) {
        let apply_permissions = (channel_permissions: PermissionValue[]) => {
            log.trace(LogCategory.CHANNEL, tr("Received channel permissions: %o"), channel_permissions);

            let required_power = -2;
            for(let cperm of channel_permissions)
                if(cperm.type.name == PermissionType.I_CHANNEL_NEEDED_MODIFY_POWER) {
                    required_power = cperm.value;
                    break;
                }

            tag.find("input[permission]").each((index, _element) => {
                let element = $(_element);
                element.attr("original-value", 0);
                element.val(0);

                let permission = permissions.resolveInfo(element.attr("permission"));
                if(!permission) {
                    log.error(LogCategory.PERMISSIONS, tr("Failed to resolve channel permission for name %o"), element.attr("permission"));
                    element.prop("disabled", true);
                    return;
                }

                for(let cperm of channel_permissions)
                    if(cperm.type == permission) {
                        element.val(cperm.value);
                        element.attr("original-value", cperm.value);
                        return;
                    }
            });

            const permission = permissions.neededPermission(PermissionType.I_CHANNEL_PERMISSION_MODIFY_POWER).granted(required_power, false);
            tag.find("input[permission]").prop("disabled", !permission).parent(".input-boxed").toggleClass("disabled", !permission); //No permissions
        };

        if(channel) {
            permissions.requestChannelPermissions(channel.getChannelId()).then(apply_permissions).catch((error) => {
                tag.find("input[permission]").prop("disabled", true);
                console.log("Failed to receive channel permissions (%o)", error);
            });
        } else apply_permissions([]);
    }

    function applyAudioListener(connection: ConnectionHandler, properties: ChannelProperties, tag: JQuery, simple: JQuery, channel?: ChannelEntry) {
        const bandwidth_mapping = [
            /* SPEEX narrow */ [2.49, 2.69, 2.93, 3.17, 3.17, 3.56, 3.56, 4.05, 4.05,  4.44,  5.22],
            /* SPEEX wide */   [2.69, 2.93, 3.17, 3.42, 3.76, 4.25, 4.74, 5.13, 5.62,  6.40,  7.37],
            /* SPEEX ultra */  [2.73, 3.12, 3.37, 3.61, 4.00, 4.49, 4.93, 5.32, 5.81,  6.59,  7.57],
            /* CELT */         [6.10, 6.10, 7.08, 7.08, 7.08, 8.06, 8.06, 8.06, 8.06, 10.01, 13.92],

            /* Opus Voice */   [2.73, 3.22, 3.71, 4.20, 4.74, 5.22, 5.71, 6.20,  6.74,  7.23,  7.71],
            /* Opus Music */   [3.08, 3.96, 4.83, 5.71, 6.59, 7.47, 8.35, 9.23, 10.11, 10.99, 11.87]
        ];

        let update_template = () => {
            let codec = properties.channel_codec;
            if(!codec && channel)
                codec = channel.properties.channel_codec;
            if(!codec) return;

            let quality = properties.channel_codec_quality;
            if(!quality && channel)
                quality = channel.properties.channel_codec_quality;
            if(!quality) return;

            let template_name = "custom";

            {
                if(codec == 4 && quality == 4)
                    template_name = "voice_mobile";
                else if(codec == 4 && quality == 6)
                    template_name = "voice_desktop";
                else if(codec == 5 && quality == 6)
                    template_name = "music";
            }
            tag.find("input[name='voice_template'][value='" + template_name + "']").prop("checked", true);
            simple.find("option[name='voice_template'][value='" + template_name + "']").prop("selected", true);

            let bandwidth;
            if(codec < 0 || codec > bandwidth_mapping.length)
                bandwidth = 0;
            else
                bandwidth = bandwidth_mapping[codec][quality] || 0; /* OOB access results in undefined, but is allowed */
            tag.find(".container-needed-bandwidth").text(bandwidth.toFixed(2) + " KiB/s");
        };

        let change_codec = codec => {
            if(properties.channel_codec == codec) return;

            tag.find(".voice_codec option").prop("selected", false).eq(codec).prop("selected", true);
            properties.channel_codec = codec;
            update_template();
        };

        const container_quality = tag.find(".container-quality");
        const slider_quality = sliderfy(container_quality.find(".container-slider"), {
            initial_value: properties.channel_codec_quality || 6,
            unit: "",
            min_value: 1,
            max_value: 10,
            step: 1,
            value_field: container_quality.find(".container-value")
        });

        let change_quality = (quality: number) => {
            if(properties.channel_codec_quality == quality) return;

            properties.channel_codec_quality = quality;
            slider_quality.value(quality);
            update_template();
        };

        container_quality.find(".container-slider").on('change', event => {
            properties.channel_codec_quality = slider_quality.value();
            update_template();
        });

        tag.find("input[name='voice_template']").change(function (this: HTMLInputElement) {
            switch(this.value) {
                case "custom":
                    break;
                case "music":
                    change_codec(5);
                    change_quality(6);
                    break;
                case "voice_desktop":
                    change_codec(4);
                    change_quality(6);
                    break;
                case "voice_mobile":
                    change_codec(4);
                    change_quality(4);
                    break;
            }
        });

        simple.find("select[name='voice_template']").change(function (this: HTMLInputElement) {
            switch(this.value) {
                case "custom":
                    break;
                case "music":
                    change_codec(5);
                    change_quality(6);
                    break;
                case "voice_desktop":
                    change_codec(4);
                    change_quality(6);
                    break;
                case "voice_mobile":
                    change_codec(4);
                    change_quality(4);
                    break;
            }
        });

        /* disable not granted templates */
        {
            tag.find("input[name='voice_template'][value='voice_mobile']")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1));
            simple.find("option[name='voice_template'][value='voice_mobile']")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1));

            tag.find("input[name='voice_template'][value=\"voice_desktop\"]")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1));
            simple.find("option[name='voice_template'][value=\"voice_desktop\"]")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1));

            tag.find("input[name='voice_template'][value=\"music\"]")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC).granted(1));
            simple.find("option[name='voice_template'][value=\"music\"]")
                .prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC).granted(1));
        }

        let codecs = tag.find(".voice_codec option");
        codecs.eq(0).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX8).granted(1));
        codecs.eq(1).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX16).granted(1));
        codecs.eq(2).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_SPEEX32).granted(1));
        codecs.eq(3).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_CELTMONO48).granted(1));
        codecs.eq(4).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSVOICE).granted(1));
        codecs.eq(5).prop("disabled", !connection.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_CODEC_OPUSMUSIC).granted(1));
        tag.find(".voice_codec").change(function (this: HTMLSelectElement) {
            if($(this.item(this.selectedIndex)).prop("disabled")) return false;

            change_codec(this.selectedIndex);
        });

        if(!channel) {
            change_codec(4);
            change_quality(6);
        } else {
            change_codec(channel.properties.channel_codec);
            change_quality(channel.properties.channel_codec_quality);
        }
        update_template();
    }

    function applyAdvancedListener(connection: ConnectionHandler, properties: ChannelProperties, tag: JQuery, button: JQuery, channel?: ChannelEntry) {
        tag.find(".channel_name_phonetic").change(function (this: HTMLInputElement) {
            properties.channel_topic = this.value;
        });

        {
            const permission = connection.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_TEMP_DELETE_DELAY).granted(1);
            tag.find(".channel_delete_delay").change(function (this: HTMLInputElement) {
                properties.channel_delete_delay = parseInt(this.value);
            }).prop("disabled", !permission).parent(".input-boxed").toggleClass("disabled", !permission);
        }

        {
            tag.find(".button-delete-max").on('click', event => {
                const power = connection.permissions.neededPermission(PermissionType.I_CHANNEL_CREATE_MODIFY_WITH_TEMP_DELETE_DELAY).value;
                let value = power == -2 ? 0 : power == -1 ? (7 * 24 * 60 * 60) : power;
                tag.find(".channel_delete_delay").val(value).trigger('change');
            });
        }

        {
            const permission = connection.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_MAKE_CODEC_ENCRYPTED).granted(1);
            tag.find(".channel_codec_is_unencrypted").change(function (this: HTMLInputElement) {
                properties.channel_codec_is_unencrypted = parseInt(this.value) == 0;
            }).prop("disabled", !permission).parent(".input-boxed").toggleClass("disabled", !permission);
        }
    }
}