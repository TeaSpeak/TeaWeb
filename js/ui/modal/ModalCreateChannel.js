/// <reference path="../../utils/modal.ts" />
var Modals;
(function (Modals) {
    function createChannelModal(channel, parent, callback) {
        let properties = {}; //The changes properties
        const modal = createModal({
            header: channel ? "Edit channel" : "Create channel",
            body: () => {
                let template = $("#tmpl_channel_edit").tmpl(channel ? channel.properties : new ChannelProperties());
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
        applyGeneralListener(properties, modal.htmlTag.find(".channel_general_properties"), modal.htmlTag.find(".button_ok"), !channel);
        applyStandardListener(properties, modal.htmlTag.find(".settings_standard"), modal.htmlTag.find(".button_ok"), parent, !channel);
        modal.htmlTag.find(".button_ok").click(() => {
            modal.close();
            callback(properties);
        });
        modal.htmlTag.find(".button_cancel").click(() => {
            modal.close();
            callback();
        });
        modal.open();
    }
    Modals.createChannelModal = createChannelModal;
    function applyGeneralListener(properties, tag, button, create) {
        let updateButton = () => {
            if (tag.find(".input_error").length == 0)
                button.removeAttr("disabled");
            else
                button.attr("disabled", "true");
        };
        tag.find(".channel_name").change(function () {
            properties.channel_name = this.value;
            $(this).removeClass("input_error");
            if (this.value.length < 1 || this.value.length > 40)
                $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !create && !globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_MODIFY_NAME).granted(1));
        tag.find(".channel_password").change(function () {
            properties.channel_flag_password = this.value.length != 0;
            if (properties.channel_flag_password)
                helpers.hashPassword(this.value).then(pass => properties.channel_password = pass);
            $(this).removeClass("input_error");
            if (!properties.channel_flag_password)
                if (globalClient.permissions.neededPermission(PermissionType.B_CHANNEL_CREATE_MODIFY_WITH_FORCE_PASSWORD).granted(1))
                    $(this).addClass("input_error");
            updateButton();
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_PASSWORD : PermissionType.B_CHANNEL_MODIFY_PASSWORD).granted(1));
        tag.find(".channel_topic").change(function () {
            properties.channel_topic = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_TOPIC : PermissionType.B_CHANNEL_MODIFY_TOPIC).granted(1));
        tag.find(".channel_description").change(function () {
            properties.channel_description = this.value;
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DESCRIPTION : PermissionType.B_CHANNEL_MODIFY_DESCRIPTION).granted(1));
        if (create) {
            tag.find(".channel_name").trigger("change");
            tag.find(".channel_password").trigger('change');
        }
    }
    function applyStandardListener(properties, tag, button, parent, create) {
        tag.find("input[name=\"channel_type\"]").change(function () {
            switch (this.value) {
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
        tag.find("input[name=\"channel_type\"]:not(:disabled)").last().prop("checked", true).trigger('change');
        tag.find("input[name=\"channel_default\"]").change(function () {
            console.log(this.checked);
            properties.channel_flag_default = this.checked;
            let elements = tag.find("input[name=\"channel_type\"]");
            if (this.checked) {
                elements.prop("enabled", false);
                elements.prop("checked", false);
                tag.find("input[name=\"channel_type\"][value=\"perm\"]").prop("checked", true).trigger("change");
            }
            else
                elements.removeProp("enabled");
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_PERMANENT : PermissionType.B_CHANNEL_MODIFY_MAKE_PERMANENT).granted(1) ||
            !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_DEFAULT : PermissionType.B_CHANNEL_MODIFY_MAKE_DEFAULT).granted(1));
        tag.find("input[name=\"talk_power\"]").change(function () {
            properties.channel_needed_talk_power = parseInt(this.value);
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_NEEDED_TALK_POWER : PermissionType.B_CHANNEL_MODIFY_NEEDED_TALK_POWER).granted(1));
        let orderTag = tag.find(".order_id");
        for (let channel of (parent ? parent.siblings() : globalClient.channelTree.rootChannel()))
            $.spawn("option").attr("channelId", channel.channelId.toString()).text(channel.channelName()).appendTo(orderTag);
        orderTag.change(function () {
            let selected = $(this.options.item(this.selectedIndex));
            properties.channel_order = parseInt(selected.attr("channelId"));
        }).prop("disabled", !globalClient.permissions.neededPermission(create ? PermissionType.B_CHANNEL_CREATE_WITH_SORTORDER : PermissionType.B_CHANNEL_MODIFY_SORTORDER).granted(1));
        orderTag.find("option").last().prop("selected", true);
    }
})(Modals || (Modals = {}));
//# sourceMappingURL=ModalCreateChannel.js.map