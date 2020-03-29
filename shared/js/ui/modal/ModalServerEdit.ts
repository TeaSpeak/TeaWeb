namespace Modals {
    export function createServerModal(server: ServerEntry, callback: (properties?: ServerProperties) => Promise<void>) {
        const properties = Object.assign({}, server.properties);

        let _valid_states: {[key: string]:boolean} = {
            general: false
        };

        let _toggle_valid = (key: string | undefined, value?: boolean) => {
            if(typeof(key) === "string") {
                _valid_states[key] = value;
            }

            let flag = true;
            for(const key of Object.keys(_valid_states))
                if(!_valid_states[key]) {
                    flag = false;
                    break;
                }

            if(flag) {
                flag = false;
                for(const property_name of Object.keys(properties)) {
                    if(server.properties[property_name] !== properties[property_name]) {
                        flag = true;
                        break;
                    }
                }
            }

            button_save.prop("disabled", !flag);
        };

        const modal = createModal({
            header: tr("Manage the Virtual Server"),
            body: () => {
                const template = $("#tmpl_server_edit").renderTag(Object.assign(Object.assign({}, server.properties), {
                        server_icon: server.channelTree.client.fileManager.icons.generateTag(server.properties.virtualserver_icon_id)
                }));

                /* the tab functionality */
                {
                    const container_tabs = template.find(".container-categories");
                    container_tabs.find(".categories .entry").on('click', event => {
                        const entry = $(event.target);

                        container_tabs.find(".bodies > .body").addClass("hidden");
                        container_tabs.find(".categories > .selected").removeClass("selected");

                        entry.addClass("selected");
                        container_tabs.find(".bodies > .body." + entry.attr("container")).removeClass("hidden");
                    });

                    container_tabs.find(".entry").first().trigger('click');
                }

                apply_general_listener(template.find(".container-general"), server, properties, _toggle_valid);
                apply_host_listener(template.find(".container-host"), server, properties, _toggle_valid);
                apply_network_listener(template.find(".container-network"), server, properties, _toggle_valid, modal);
                apply_security_listener(template.find(".container-security"), server, properties, _toggle_valid);
                apply_messages_listener(template.find(".container-messages"), server, properties, _toggle_valid);
                apply_misc_listener(template.find(".container-misc"), server, properties, _toggle_valid);

                return template.contents();
            },
            footer: null,
            min_width: "35em"
        });

        tooltip(modal.htmlTag);

        const button_save = modal.htmlTag.find(".button-save");
        button_save.on('click', event => {
            const changed = {} as ServerProperties;
            for(const property_name of Object.keys(properties))
                if(server.properties[property_name] !== properties[property_name])
                    changed[property_name] = properties[property_name];
            callback(changed).then(() => {
                _toggle_valid(undefined);
            });
        });

        modal.htmlTag.find(".button-cancel").on('click', event => {
            modal.close();
            callback();
        });

        _toggle_valid("general", true);
        modal.htmlTag.find(".modal-body").addClass("modal-server-edit modal-blue");
        modal.open();
    }


    function apply_general_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void) {
        /* name */
        {
            const container = tag.find(".virtualserver_name");
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_NAME).granted(1);

            container.on('change', event => {
                properties.virtualserver_name = container.val() as string;

                const invalid = properties.virtualserver_name.length > 70 || properties.virtualserver_name.length < 1;
                container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                callback_valid("virtualserver_name", !invalid);
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
        }

        /* icon */
        {
            tag.find(".button-select-icon").on('click', event => {
                Modals.spawnIconSelect(server.channelTree.client, id => {
                    const icon_node = tag.find(".icon-preview");
                    icon_node.children().remove();
                    icon_node.append(server.channelTree.client.fileManager.icons.generateTag(id));

                    console.log("Selected icon ID: %d", id);
                    properties.virtualserver_icon_id = id;
                    callback_valid(undefined); //Toggle save button update
                },  properties.virtualserver_icon_id);
            });

            tag.find(".button-icon-remove").on('click', event => {
                const icon_node = tag.find(".icon-preview");
                icon_node.children().remove();
                icon_node.append(server.channelTree.client.fileManager.icons.generateTag(0));

                console.log("Remove server icon");
                properties.virtualserver_icon_id = 0;
                callback_valid(undefined); //Toggle save button update
            });
        }

        /* password */
        {
            //TODO: On save let the user retype his password?
            const container = tag.find(".virtualserver_password");
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_PASSWORD).granted(1);

            container.on('change', event => {
                const password = container.val() as string;
                properties.virtualserver_flag_password = !!password;
                if(properties.virtualserver_flag_password) {
                    helpers.hashPassword(password).then(pass => properties.virtualserver_password = pass);
                }
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
        }

        /* slots */
        {
            const container_max = tag.find(".virtualserver_maxclients");
            const container_reserved = tag.find(".virtualserver_reserved_slots");

            /* max users */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_MAXCLIENTS).granted(1);

                container_max.on('change', event => {
                    properties.virtualserver_maxclients = parseInt(container_max.val() as string);

                    const invalid = properties.virtualserver_maxclients < 1 || properties.virtualserver_maxclients > 1024;
                    container_max.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_maxclients", !invalid);

                    container_reserved.trigger('change'); /* update the flag */
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* reserved */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS).granted(1);

                container_reserved.on('change', event => {
                    properties.virtualserver_reserved_slots = parseInt(container_reserved.val() as string);

                    const invalid = properties.virtualserver_reserved_slots > properties.virtualserver_maxclients;
                    container_reserved.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_reserved_slots", !invalid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }
        }

        /* Welcome message */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE).granted(1);
            const container = tag.find(".container-welcome-message");
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
                console.log(tr("Welcome message edited: %o"), input.val());
                properties.virtualserver_welcomemessage = input.val() as string;
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

            container.find(".button-bold").on('click', () => insert_tag('[b]', '[/b]'));
            container.find(".button-italic").on('click', () => insert_tag('[i]', '[/i]'));
            container.find(".button-underline").on('click', () => insert_tag('[u]', '[/u]'));
            container.find(".button-color input").on('change', event => {
                insert_tag('[color=' + (event.target as HTMLInputElement).value + ']', '[/color]')
            });
        }
    }

    function apply_network_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void, modal: Modal) {
        /* binding */
        {
            /* host */
            {
                const container = tag.find(".virtualserver_host");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOST).granted(1);

                container.on('change', event => {
                    properties.virtualserver_host = container.val() as string;
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_host));
            }

            /* port */
            {
                const container = tag.find(".virtualserver_port");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_PORT).granted(1);

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_port = value;

                    const valid = value >= 1 && value < 65536;
                    callback_valid("virtualserver_port", valid);
                    container.firstParent(".input-boxed").toggleClass("is-invalid", !valid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_port));
            }

            /* TeamSpeak server list */
            {
                const container = tag.find(".virtualserver_weblist_enabled");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_WEBLIST).granted(1);

                container.on('change', event => {
                    properties.virtualserver_weblist_enabled = container.prop("checked");
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".checkbox").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.prop("checked", server.properties.virtualserver_weblist_enabled));
            }
        }

        /* file download */
        {
            /* bandwidth */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_SETTINGS).granted(1);
                const container = tag.find(".virtualserver_max_download_total_bandwidth");

                container.on('change', event => {
                    properties.virtualserver_max_download_total_bandwidth = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_max_download_total_bandwidth));
            }

            /* Quota */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_QUOTAS).granted(1);
                const container = tag.find(".virtualserver_download_quota");

                container.on('change', event => {
                    properties.virtualserver_download_quota = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_download_quota));
            }
        }

        /* file upload */
        {
            /* bandwidth */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_SETTINGS).granted(1);
                const container = tag.find(".virtualserver_max_upload_total_bandwidth");

                container.on('change', event => {
                    properties.virtualserver_max_upload_total_bandwidth = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_max_upload_total_bandwidth));
            }

            /* Quota */
            {
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_QUOTAS).granted(1);
                const container = tag.find(".virtualserver_upload_quota");

                container.on('change', event => {
                    properties.virtualserver_upload_quota = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_upload_quota));
            }
        }

        /* quota info */
        {
            server.updateProperties().then(() => {
                tag.find(".value.virtualserver_month_bytes_downloaded").text(MessageHelper.network.format_bytes(server.properties.virtualserver_month_bytes_downloaded));
                tag.find(".value.virtualserver_month_bytes_uploaded").text(MessageHelper.network.format_bytes(server.properties.virtualserver_month_bytes_uploaded));

                tag.find(".value.virtualserver_total_bytes_downloaded").text(MessageHelper.network.format_bytes(server.properties.virtualserver_total_bytes_downloaded));
                tag.find(".value.virtualserver_total_bytes_uploaded").text(MessageHelper.network.format_bytes(server.properties.virtualserver_total_bytes_uploaded));
            });
        }

        /* quota update task */
        if(server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CONNECTIONINFO_VIEW).granted(1)) {
            const month_bytes_downloaded = tag.find(".value.virtualserver_month_bytes_downloaded")[0];
            const month_bytes_uploaded = tag.find(".value.virtualserver_month_bytes_uploaded")[0];
            const total_bytes_downloaded = tag.find(".value.virtualserver_total_bytes_downloaded")[0];
            const total_bytes_uploaded = tag.find(".value.virtualserver_total_bytes_uploaded")[0];

            let id = setInterval(() => {
                if(!modal.shown) {
                    clearInterval(id);
                    return;
                }

                server.request_connection_info().then(info => {
                    if(info.connection_filetransfer_bytes_sent_month && month_bytes_downloaded)
                        month_bytes_downloaded.innerText = MessageHelper.network.format_bytes(info.connection_filetransfer_bytes_sent_month);
                    if(info.connection_filetransfer_bytes_received_month && month_bytes_uploaded)
                        month_bytes_uploaded.innerText = MessageHelper.network.format_bytes(info.connection_filetransfer_bytes_received_month);

                    if(info.connection_filetransfer_bytes_sent_total && total_bytes_downloaded)
                        total_bytes_downloaded.innerText = MessageHelper.network.format_bytes(info.connection_filetransfer_bytes_sent_total);
                    if(info.connection_filetransfer_bytes_received_total && total_bytes_uploaded)
                        total_bytes_uploaded.innerText = MessageHelper.network.format_bytes(info.connection_filetransfer_bytes_received_total);
                });
            }, 1000);
            modal.close_listener.push(() => clearInterval(id));
        }
    }

    function apply_host_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void) {
        /* host message */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTMESSAGE).granted(1);

            /* message */
            {
                const container = tag.find(".virtualserver_hostmessage");

                container.on('change', event => {
                    properties.virtualserver_hostmessage = container.val() as string;
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* mode */
            {
                const container = tag.find(".virtualserver_hostmessage_mode");

                container.on('change', event => {
                    properties.virtualserver_hostmessage_mode = Math.min(3, Math.max(0, parseInt(container.val() as string)));
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }
        }

        /* host banner */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBANNER).granted(1);

            /* URL */
            {
                const container = tag.find(".virtualserver_hostbanner_url");

                container.on('change', event => {
                    properties.virtualserver_hostbanner_url = container.val() as string;
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* Image URL/Image Preview */
            {
                const container = tag.find(".virtualserver_hostbanner_gfx_url");
                const container_preview = tag.find(".container-host-message .container-gfx-preview img");

                container.on('change', event => {
                    properties.virtualserver_hostbanner_gfx_url = container.val() as string;
                    container_preview.attr("src", properties.virtualserver_hostbanner_gfx_url).toggle(!!properties.virtualserver_hostbanner_gfx_url);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* Image Refresh */
            {
                const container = tag.find(".virtualserver_hostbanner_gfx_interval");

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_hostbanner_gfx_interval = value;

                    const invalid = value < 60 && value != 0;
                    container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_hostbanner_gfx_interval", !invalid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* mode */
            {
                const container = tag.find(".virtualserver_hostbanner_mode");

                container.on('change', event => {
                    properties.virtualserver_hostbanner_mode = Math.min(2, Math.max(0, parseInt(container.val() as string)));
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }
        }

        /* host button */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBUTTON).granted(1);

            /* URL */
            {
                const container = tag.find(".virtualserver_hostbutton_url");

                container.on('change', event => {
                    properties.virtualserver_hostbutton_url = container.val() as string;
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* Tooltip */
            {
                const container = tag.find(".virtualserver_hostbutton_tooltip");

                container.on('change', event => {
                    properties.virtualserver_hostbutton_tooltip = container.val() as string;
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* Icon URL/Icon Preview */
            {
                const container = tag.find(".virtualserver_hostbutton_gfx_url");
                const container_preview = tag.find(".container-host-button .container-gfx-preview img");

                container.on('change', event => {
                    properties.virtualserver_hostbutton_gfx_url = container.val() as string;
                    container_preview.attr("src", properties.virtualserver_hostbutton_gfx_url).toggle(!!properties.virtualserver_hostbutton_gfx_url);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }
        }
    }

    function apply_security_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void) {
        /* Anti flood */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1);

            /* reduce */
            {
                const container = tag.find(".virtualserver_antiflood_points_tick_reduce");

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_antiflood_points_tick_reduce = value;

                    const invalid = value < 1 || value > 999999;
                    container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_antiflood_points_tick_reduce", !invalid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_antiflood_points_tick_reduce));
            }

            /* block commands */
            {
                const container = tag.find(".virtualserver_antiflood_points_needed_command_block");

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_antiflood_points_needed_command_block = value;

                    const invalid = value < 1 || value > 999999;
                    container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_antiflood_points_needed_command_block", !invalid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_antiflood_points_needed_command_block));
            }

            /* block ip */
            {
                const container = tag.find(".virtualserver_antiflood_points_needed_ip_block");

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_antiflood_points_needed_ip_block = value;

                    const invalid = value < 1 || value > 999999;
                    container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                    callback_valid("virtualserver_antiflood_points_needed_ip_block", !invalid);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_antiflood_points_needed_ip_block));
            }
        }

        /* encryption */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_CODEC_ENCRYPTION_MODE).granted(1);
            const container = tag.find(".virtualserver_codec_encryption_mode");

            container.on('change', event => {
                properties.virtualserver_codec_encryption_mode = Math.min(2, Math.max(0, parseInt(container.val() as string)));
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
        }

        /* security level */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL).granted(1);
            const container = tag.find(".virtualserver_needed_identity_security_level");

            container.on('change', event => {
                const value = parseInt(container.val() as string);
                properties.virtualserver_needed_identity_security_level = value;

                const invalid = value < 8 || value > 99;
                container.firstParent(".input-boxed").toggleClass("is-invalid", invalid);
                callback_valid("virtualserver_needed_identity_security_level", !invalid);
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

            server.updateProperties().then(() => container.val(server.properties.virtualserver_needed_identity_security_level));
        }
    }

    function apply_messages_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void) {
        const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES).granted(1);

        /* channel topic */
        {
            const container = tag.find(".virtualserver_default_channel_topic");

            container.on('change', event => {
                properties.virtualserver_default_channel_topic = container.val() as string;
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
        }

        /* channel description */
        {
            const container = tag.find(".virtualserver_default_channel_description");

            container.on('change', event => {
                properties.virtualserver_default_channel_description = container.val() as string;
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

            server.updateProperties().then(() => container.val(server.properties.virtualserver_default_channel_description));
        }

        /* client description */
        {
            const container = tag.find(".virtualserver_default_client_description");

            container.on('change', event => {
                properties.virtualserver_default_client_description = container.val() as string;
                callback_valid(undefined); //Toggle save button update
            }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

            server.updateProperties().then(() => container.val(server.properties.virtualserver_default_client_description));
        }
    }

    function apply_misc_listener(tag: JQuery, server: ServerEntry, properties: ServerProperties, callback_valid: (key: string | undefined, flag?: boolean) => void) {
        /* default groups */
        {
            /* Server Group */
            {
                const container = tag.find(".virtualserver_default_server_group");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_SERVERGROUP).granted(1);

                container.on('change', event => {
                    properties.virtualserver_default_server_group = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                for(const group of server.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_server_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(container);
                }
            }

            /* Music Group */
            {
                const container = tag.find(".virtualserver_default_music_group");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_MUSICGROUP).granted(1);

                container.on('change', event => {
                    properties.virtualserver_default_music_group = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                for(const group of server.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_music_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(container);
                }
            }

            /* Channel Admin Group */
            {
                const container = tag.find(".virtualserver_default_channel_admin_group");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELADMINGROUP).granted(1);

                container.on('change', event => {
                    properties.virtualserver_default_channel_admin_group = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                for(const group of server.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_channel_admin_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(container);
                }
            }

            /* Channel Guest Group */
            {
                const container = tag.find(".virtualserver_default_channel_group");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_CHANNELGROUP).granted(1);

                container.on('change', event => {
                    properties.virtualserver_default_channel_group = parseInt(container.val() as string);
                    callback_valid(undefined); //Toggle save button update
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                for(const group of server.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_channel_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(container);
                }
            }
        }

        /* complains */
        {
            const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_COMPLAIN).granted(1);

            /* ban threshold */
            {
                const container = tag.find(".virtualserver_complain_autoban_count");

                container.on('change', event => {
                    properties.virtualserver_complain_autoban_count = parseInt(container.val() as string);
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_complain_autoban_count));
            }

            /* ban time */
            {
                const container = tag.find(".virtualserver_complain_autoban_time");

                container.on('change', event => {
                    properties.virtualserver_complain_autoban_time = parseInt(container.val() as string);
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_complain_autoban_time));
            }

            /* auto remove time */
            {
                const container = tag.find(".virtualserver_complain_remove_time");

                container.on('change', event => {
                    properties.virtualserver_complain_remove_time = parseInt(container.val() as string);
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_complain_remove_time));
            }
        }

        /* others */
        {
            /* clients before silence */
            {
                const container = tag.find(".virtualserver_min_clients_in_channel_before_forced_silence");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_CHANNEL_FORCED_SILENCE).granted(1);

                container.on('change', event => {
                    const value = parseInt(container.val() as string);
                    properties.virtualserver_min_clients_in_channel_before_forced_silence = value;
                    callback_valid("virtualserver_min_clients_in_channel_before_forced_silence", value > 1);
                    container.firstParent(".input-boxed").toggleClass("is-invalid", value <= 1);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);

                server.updateProperties().then(() => container.val(server.properties.virtualserver_min_clients_in_channel_before_forced_silence));
            }

            /* priority speaker dim factor */
            {
                const container = tag.find(".virtualserver_priority_speaker_dimm_modificator");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_PRIORITY_SPEAKER_DIMM_MODIFICATOR).granted(1);

                container.on('change', event => {
                    properties.virtualserver_priority_speaker_dimm_modificator = parseInt(container.val() as string);
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }

            /* channel delete delay */
            {
                const container = tag.find(".virtualserver_channel_temp_delete_delay_default");
                const permission = server.channelTree.client.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_CHANNEL_TEMP_DELETE_DELAY_DEFAULT).granted(1);

                container.on('change', event => {
                    properties.virtualserver_channel_temp_delete_delay_default = parseInt(container.val() as string);
                    callback_valid(undefined);
                }).prop("disabled", !permission).firstParent(".input-boxed").toggleClass("disabled", !permission);
            }
        }
    }
}