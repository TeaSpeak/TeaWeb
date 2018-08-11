/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function createChannelModal(channel: ChannelEntry | undefined, parent: ChannelEntry | undefined, permissions: PermissionManager, callback: (properties?: ChannelProperties, permissions?: PermissionValue[]) => any) {
        let properties: ChannelProperties = { } as ChannelProperties; //The changes properties
        const modal = createModal({
            header: channel ? "Edit channel" : "Create channel",
            body: () => {
                let template = $("#tmpl_channel_edit").renderTag(channel ? channel.properties : new ChannelProperties());
                template = $.spawn("div").append(template);
                return template.tabify();
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin", "5px");

                let buttonCancel = $.spawn("button");
                buttonCancel.text("Cancel").addClass("button_cancel");

                let buttonOk = $.spawn("button");
                buttonOk.text("Ok").addClass("button_ok");

                footer.append(buttonCancel);
                footer.append(buttonOk);

                return footer;
            },
            width: 500
        });


        applyGeneralListener(properties, modal.htmlTag.find(".general_properties"), modal.htmlTag.find(".button_ok"), !channel);
        applyStandardListener(properties, modal.htmlTag.find(".settings_standard"), modal.htmlTag.find(".button_ok"), parent, !channel);
        applyPermissionListener(properties, modal.htmlTag.find(".settings_permissions"), modal.htmlTag.find(".button_ok"), permissions, channel);

        let updated: PermissionValue[] = [];
        modal.htmlTag.find(".button_ok").click(() => {
            modal.htmlTag.find(".settings_permissions").find("input[permission]").each((index, _element) => {
                let element = $(_element);
                if(!element.prop("changed")) return;
                let permission = permissions.resolveInfo(element.attr("permission"));
                if(!permission) {
                    log.error(LogCategory.PERMISSIONS, "Failed to resolve channel permission for name %o", element.attr("permission"));
                    element.prop("disabled", true);
                    return;
                }

                updated.push(new PermissionValue(permission, element.val()));
            });
            console.log("Updated permissions %o", updated);
        }).click(() => {
            modal.close();
            callback(properties, updated); //First may create the channel
        });

        modal.htmlTag.find(".button_cancel").click(() => {
            modal.close();
            callback();
        });

        modal.open();
    }

    function applyGeneralListener(properties: ChannelProperties, tag: JQuery, button: JQuery, create: boolean) {
        let updateButton = () => {
            if(tag.find(".input_error").length == 0)
                button.removeAttr("disabled");
            else button.attr("disabled", "true");
        };

        tag.find(".channel_name").change(function (this: HTMLInputElement) {
            properties.channel_name = this.value;

            $(this).removeClass("input_error");
            if(this.value.length < 1 || this.value.length > 40)
                $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !create && !globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1));

        tag.find(".channel_password").change(function (this: HTMLInputElement) {
            properties.channel_flag_password = this.value.length != 0;
            if(properties.channel_flag_password)
                helpers.hashPassword(this.value).then(pass => properties.channel_password = pass);

            $(this).removeClass("input_error");
            if(!properties.channel_flag_password)
                if(globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1))
                    $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD : PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1));

        tag.find(".channel_topic").change(function (this: HTMLInputElement) {
            properties.channel_topic = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_TOPIC : PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1));

        tag.find(".channel_description").change(function (this: HTMLInputElement) {
            properties.channel_description = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DESCRIPTION : PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1));

        if(create) {
            tag.find(".channel_name").trigger("change");
            tag.find(".channel_password").trigger('change');
        }
    }

    function applyStandardListener(properties: ChannelProperties, tag: JQuery, button: JQuery, parent: ChannelEntry, create: boolean) {
        tag.find("input[name=\"channel_type\"]").change(function (this: HTMLInputElement) {
            switch(this.value) {
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
        });
        tag.find("input[name=\"channel_type\"][value=\"temp\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_TEMPORARY : PermissionType.B_CHANNEL_MODIFY_MAKE_TEMPORARY).granted(1));
        tag.find("input[name=\"channel_type\"][value=\"semi\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_SEMI_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_SEMI_PERMANENT).granted(1));
        tag.find("input[name=\"channel_type\"][value=\"perm\"]")
            .prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1));
        if(create)
            tag.find("input[name=\"channel_type\"]:not(:disabled)").last().prop("checked", true).trigger('change');

        tag.find("input[name=\"channel_default\"]").change(function (this: HTMLInputElement) {
            console.log(this.checked);
            properties.channel_flag_default = this.checked;

            let elements = tag.find("input[name=\"channel_type\"]");
            if(this.checked) {
                elements.prop("enabled", false);
                elements.prop("checked", false);
                tag.find("input[name=\"channel_type\"][value=\"perm\"]").prop("checked", true).trigger("change");
            } else elements.removeProp("enabled");
        }).prop("disabled",
            !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) ||
            !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT : PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1));

        tag.find("input[name=\"talk_power\"]").change(function (this: HTMLInputElement) {
            properties.channel_needed_talk_power = parseInt(this.value);
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER : PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1));

        let orderTag = tag.find(".order_id");
        for(let channel of (parent ? parent.siblings() : globalClient.channelTree.rootChannel()))
            $.spawn("option").attr("channelId", channel.channelId.toString()).text(channel.channelName()).appendTo(orderTag);

        orderTag.change(function (this: HTMLSelectElement) {
            let selected = $(this.options.item(this.selectedIndex));
            properties.channel_order = parseInt(selected.attr("channelId"));
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_SORTORDER : PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1));
        orderTag.find("option").last().prop("selected", true);
    }


    function applyPermissionListener(properties: ChannelProperties, tag: JQuery, button: JQuery, permissions: PermissionManager, channel?: ChannelEntry) {
        let apply_permissions = (channel_permissions: PermissionValue[]) => {
            console.log("Got permissions: %o", channel_permissions);
            let required_power = -2;
            for(let cperm of channel_permissions)
                if(cperm.type.name == PermissionType.I_CHANNEL_NEEDED_MODIFY_POWER) {
                    required_power = cperm.value;
                    return;
                }

            tag.find("input[permission]").each((index, _element) => {
                let element = $(_element);
                let permission = permissions.resolveInfo(element.attr("permission"));
                if(!permission) {
                    log.error(LogCategory.PERMISSIONS, "Failed to resolve channel permission for name %o", element.attr("permission"));
                    element.prop("disabled", true);
                    return;
                }

                let old_value: number = 0;
                element.on("click keyup", () => {
                    console.log("Permission triggered! %o", element.val() != old_value);
                    element.prop("changed", element.val() != old_value);
                });

                for(let cperm of channel_permissions)
                    if(cperm.type == permission) {
                        element.val(old_value = cperm.value);
                        return;
                    }
                element.val(0);
            });

            if(!permissions.neededPermission(PermissionType.I_CHANNEL_MODIFY_POWER).granted(required_power, false)) {
                tag.find("input[permission]").prop("enabled", false); //No permissions
            }
        };

        if(channel) {
            permissions.requestChannelPermissions(channel.getChannelId()).then(apply_permissions).catch((error) => {
                tag.find("input[permission]").prop("enabled", false);
                console.log(error);
            });
        } else apply_permissions([]);
    }
}