/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function createServerModal(server: ServerEntry, callback: (properties?: ServerProperties) => any) {
        let properties: ServerProperties = {} as ServerProperties; //The changes properties

        const modal_template = $("#tmpl_server_edit").renderTag(server.properties);
        const modal = modal_template.modalize((header, body, footer) => {
            return {
                body: body.tabify()
            }
        });

        server_applyGeneralListener(properties, modal.htmlTag.find(".properties_general"), modal.htmlTag.find(".button_ok"));
        server_applyTransferListener(properties, server, modal.htmlTag.find('.properties_transfer'));
        server_applyHostListener(server, properties, server.properties, modal.htmlTag.find(".properties_host"), modal.htmlTag.find(".button_ok"));
        server_applyMessages(properties, server, modal.htmlTag.find(".properties_messages"));
        server_applyFlood(properties, server, modal.htmlTag.find(".properties_flood"));
        server_applySecurity(properties, server, modal.htmlTag.find(".properties_security"));
        server_applyMisc(properties, server, modal.htmlTag.find(".properties_misc"));

        modal.htmlTag.find(".button_ok").click(() => {
            modal.close();
            callback(properties); //First may create the channel
        });

        modal.htmlTag.find(".button_cancel").click(() => {
            modal.close();
            callback();
        });

        modal.open();
    }

    function server_applyGeneralListener(properties: ServerProperties, tag: JQuery, button: JQuery) {
        let updateButton = () => {
            if(tag.find(".input_error").length == 0)
                button.removeAttr("disabled");
            else button.attr("disabled", "true");
        };

        tag.find(".virtualserver_name").change(function (this: HTMLInputElement) {
            properties.virtualserver_name = this.value;

            $(this).removeClass("input_error");
            if(this.value.length < 1 || this.value.length > 70)
                $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_NAME).granted(1));

        tag.find(".virtualserver_name_phonetic").change(function (this: HTMLInputElement) {
            properties.virtualserver_name_phonetic = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_NAME).granted(1));

        tag.find(".virtualserver_password").change(function (this: HTMLInputElement) {
            properties.virtualserver_flag_password = this.value.length != 0;
            if(properties.virtualserver_flag_password)
                helpers.hashPassword(this.value).then(pass => properties.virtualserver_password = pass);

            $(this).removeClass("input_error");
            if(!properties.virtualserver_flag_password)
                if(globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1))
                    $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_PASSWORD).granted(1));



        tag.find(".virtualserver_maxclients").change(function (this: HTMLInputElement) {
            properties.virtualserver_maxclients = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_MAXCLIENTS).granted(1));

        tag.find(".virtualserver_reserved_slots").change(function (this: HTMLInputElement) {
            properties.virtualserver_reserved_slots = this.valueAsNumber;
            $(this).removeClass("input_error");
            if(this.valueAsNumber > properties.virtualserver_maxclients)
                $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_RESERVED_SLOTS).granted(1));

        tag.find(".virtualserver_welcomemessage").change(function (this: HTMLInputElement) {
            properties.virtualserver_welcomemessage = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_WELCOMEMESSAGE).granted(1));
    }


    function server_applyHostListener(server: ServerEntry, properties: ServerProperties, original_properties: ServerProperties, tag: JQuery, button: JQuery) {
        tag.find(".virtualserver_host").change(function (this: HTMLInputElement) {
            properties.virtualserver_host = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOST).granted(1));

        tag.find(".virtualserver_port").change(function (this: HTMLInputElement) {
            properties.virtualserver_port = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_PORT).granted(1));


        tag.find(".virtualserver_hostmessage").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostmessage = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTMESSAGE).granted(1));

        tag.find(".virtualserver_hostmessage_mode").change(function (this: HTMLSelectElement) {
            properties.virtualserver_hostmessage_mode = this.selectedIndex;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTMESSAGE).granted(1))
            .find("option").eq(original_properties.virtualserver_hostmessage_mode).prop('selected', true);



        tag.find(".virtualserver_hostbanner_url").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbanner_url = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBANNER).granted(1));

        tag.find(".virtualserver_hostbanner_gfx_url").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbanner_gfx_url = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBANNER).granted(1));

        tag.find(".virtualserver_hostbanner_gfx_interval").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbanner_gfx_interval = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBANNER).granted(1));

        tag.find(".virtualserver_hostbanner_mode").change(function (this: HTMLSelectElement) {
            properties.virtualserver_hostbanner_mode = this.selectedIndex;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTMESSAGE).granted(1))
            .find("option").eq(original_properties.virtualserver_hostbanner_mode).prop('selected', true);

        tag.find(".virtualserver_hostbutton_tooltip").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbutton_tooltip = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBUTTON).granted(1));

        tag.find(".virtualserver_hostbutton_url").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbutton_url = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBUTTON).granted(1));

        tag.find(".virtualserver_hostbutton_gfx_url").change(function (this: HTMLInputElement) {
            properties.virtualserver_hostbutton_gfx_url = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_HOSTBUTTON).granted(1));

        server.updateProperties().then(() => {
            tag.find(".virtualserver_host").val(server.properties.virtualserver_host);
            tag.find(".virtualserver_port").val(server.properties.virtualserver_port);
        });
    }

    function server_applyMessages(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        server.updateProperties().then(() => {
            tag.find(".virtualserver_default_client_description").val(server.properties.virtualserver_default_client_description);
            tag.find(".virtualserver_default_channel_description").val(server.properties.virtualserver_default_channel_description);
            tag.find(".virtualserver_default_channel_topic").val(server.properties.virtualserver_default_channel_topic);
        });

        tag.find(".virtualserver_default_client_description").change(function (this: HTMLInputElement) {
            properties.virtualserver_default_client_description = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES).granted(1));

        tag.find(".virtualserver_default_channel_description").change(function (this: HTMLInputElement) {
            properties.virtualserver_default_channel_description = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES).granted(1));

        tag.find(".virtualserver_default_channel_topic").change(function (this: HTMLInputElement) {
            properties.virtualserver_default_channel_topic = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_DEFAULT_MESSAGES).granted(1));
    }

    function server_applyFlood(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        server.updateProperties().then(() => {
            tag.find(".virtualserver_antiflood_points_tick_reduce").val(server.properties.virtualserver_antiflood_points_tick_reduce);
            tag.find(".virtualserver_antiflood_points_needed_command_block").val(server.properties.virtualserver_antiflood_points_needed_command_block);
            tag.find(".virtualserver_antiflood_points_needed_ip_block").val(server.properties.virtualserver_antiflood_points_needed_ip_block);
        });

        tag.find(".virtualserver_antiflood_points_tick_reduce").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_tick_reduce = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));

        tag.find(".virtualserver_antiflood_points_needed_command_block").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_needed_command_block = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));

        tag.find(".virtualserver_antiflood_points_needed_ip_block").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_needed_ip_block = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));
    }


    function server_applySecurity(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        server.updateProperties().then(() => {
            tag.find(".virtualserver_needed_identity_security_level").val(server.properties.virtualserver_needed_identity_security_level);
        });

        tag.find(".virtualserver_needed_identity_security_level").change(function (this: HTMLInputElement) {
            properties.virtualserver_needed_identity_security_level = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_NEEDED_IDENTITY_SECURITY_LEVEL).granted(1));

        tag.find(".virtualserver_codec_encryption_mode").change(function (this: HTMLSelectElement) {
            properties.virtualserver_codec_encryption_mode = this.selectedIndex;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1))
            .find("option").eq(server.properties.virtualserver_codec_encryption_mode).prop('selected', true);
    }

    function server_applyMisc(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        { //TODO notify on tmp channeladmin group and vice versa
            {
                let groups_tag = tag.find(".default_server_group");
                groups_tag.change(function (this: HTMLSelectElement) {
                    properties.virtualserver_default_server_group = parseInt($(this.item(this.selectedIndex)).attr("group-id"));
                });

                for(let group of server.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_server_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(groups_tag);
                }
            }
            {
                let groups_tag = tag.find(".default_music_group");
                groups_tag.change(function (this: HTMLSelectElement) {
                    properties.virtualserver_default_music_group = parseInt($(this.item(this.selectedIndex)).attr("group-id"));
                });

                for(let group of server.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_music_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(groups_tag);
                }
            }

            {
                let groups_tag = tag.find(".default_channel_group");
                groups_tag.change(function (this: HTMLSelectElement) {
                    properties.virtualserver_default_channel_group = parseInt($(this.item(this.selectedIndex)).attr("group-id"));
                });

                for(let group of server.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_channel_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(groups_tag);
                }
            }

            {
                let groups_tag = tag.find(".default_channel_admin_group");
                groups_tag.change(function (this: HTMLSelectElement) {
                    properties.virtualserver_default_channel_admin_group = parseInt($(this.item(this.selectedIndex)).attr("group-id"));
                });

                for(let group of server.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
                    if(group.type != 2) continue;
                    let group_tag = $.spawn("option").text(group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]").attr("group-id", group.id);
                    if(group.id == server.properties.virtualserver_default_channel_admin_group)
                        group_tag.prop("selected", true);
                    group_tag.appendTo(groups_tag);
                }
            }
        }

        server.updateProperties().then(() => {
            //virtualserver_antiflood_points_needed_ip_block
            //virtualserver_antiflood_points_needed_command_block
            //virtualserver_antiflood_points_tick_reduce

            //virtualserver_complain_autoban_count
            //virtualserver_complain_autoban_time
            //virtualserver_complain_remove_time
            tag.find(".virtualserver_antiflood_points_needed_ip_block").val(server.properties.virtualserver_antiflood_points_needed_ip_block);
            tag.find(".virtualserver_antiflood_points_needed_command_block").val(server.properties.virtualserver_antiflood_points_needed_command_block);
            tag.find(".virtualserver_antiflood_points_tick_reduce").val(server.properties.virtualserver_antiflood_points_tick_reduce);
            tag.find(".virtualserver_complain_autoban_count").val(server.properties.virtualserver_complain_autoban_count);
            tag.find(".virtualserver_complain_autoban_time").val(server.properties.virtualserver_complain_autoban_time);
            tag.find(".virtualserver_complain_remove_time").val(server.properties.virtualserver_complain_remove_time);

            tag.find(".virtualserver_weblist_enabled").prop("checked", server.properties.virtualserver_weblist_enabled);
        });

        tag.find(".virtualserver_antiflood_points_needed_ip_block").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_needed_ip_block = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));

        tag.find(".virtualserver_antiflood_points_needed_command_block").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_needed_command_block = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));

        tag.find(".virtualserver_antiflood_points_tick_reduce").change(function (this: HTMLInputElement) {
            properties.virtualserver_antiflood_points_tick_reduce = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_ANTIFLOOD).granted(1));


        tag.find(".virtualserver_complain_autoban_count").change(function (this: HTMLInputElement) {
            properties.virtualserver_complain_autoban_count = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_COMPLAIN).granted(1));

        tag.find(".virtualserver_complain_autoban_time").change(function (this: HTMLInputElement) {
            properties.virtualserver_complain_autoban_time = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_COMPLAIN).granted(1));

        tag.find(".virtualserver_complain_remove_time").change(function (this: HTMLInputElement) {
            properties.virtualserver_complain_remove_time = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_COMPLAIN).granted(1));


        tag.find(".virtualserver_weblist_enabled").change(function (this: HTMLInputElement) {
            properties.virtualserver_weblist_enabled = $(this).prop("checked");
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_WEBLIST).granted(1));
    }


    function server_applyTransferListener(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        server.updateProperties().then(() => {
            //virtualserver_max_upload_total_bandwidth
            //virtualserver_upload_quota
            //virtualserver_max_download_total_bandwidth
            //virtualserver_download_quota

            tag.find(".virtualserver_max_upload_total_bandwidth").val(server.properties.virtualserver_max_upload_total_bandwidth);
            tag.find(".virtualserver_upload_quota").val(server.properties.virtualserver_upload_quota);
            tag.find(".virtualserver_max_download_total_bandwidth").val(server.properties.virtualserver_max_download_total_bandwidth);
            tag.find(".virtualserver_download_quota").val(server.properties.virtualserver_download_quota);
        });


        tag.find(".virtualserver_max_upload_total_bandwidth").change(function (this: HTMLInputElement) {
            properties.virtualserver_max_upload_total_bandwidth = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_SETTINGS).granted(1));
        tag.find(".virtualserver_max_download_total_bandwidth").change(function (this: HTMLInputElement) {
            properties.virtualserver_max_download_total_bandwidth = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_SETTINGS).granted(1));

        tag.find(".virtualserver_upload_quota").change(function (this: HTMLInputElement) {
            properties.virtualserver_upload_quota = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_QUOTAS).granted(1));
        tag.find(".virtualserver_download_quota").change(function (this: HTMLInputElement) {
            properties.virtualserver_download_quota = this.valueAsNumber;
        }).prop("disabled", !globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_MODIFY_FT_QUOTAS).granted(1));
    }
}