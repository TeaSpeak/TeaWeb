/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function createServerModal(server: ServerEntry, callback: (properties?: ServerProperties) => any) {
        let properties: ServerProperties = {} as ServerProperties; //The changes properties
        const modal = createModal({
            header: "Manager the  Virtual Server",
            body: () => {
                let template = $("#tmpl_server_edit").renderTag(server.properties);
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
            width: 750
        });

        server_applyGeneralListener(properties, modal.htmlTag.find(".properties_general"), modal.htmlTag.find(".button_ok"));
        server_applyHostListener(properties, server.properties, modal.htmlTag.find(".properties_host"), modal.htmlTag.find(".button_ok"));
        server_applyMessages(properties, server, modal.htmlTag.find(".properties_messages"));

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


    function server_applyHostListener(properties: ServerProperties, original_properties: ServerProperties, tag: JQuery, button: JQuery) {
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

    }

    function server_applyMessages(properties: ServerProperties, server: ServerEntry, tag: JQuery) {
        server.updateProperties().then(() => {
            tag.find(".virtualserver_default_client_description").val(server.properties.virtualserver_default_client_description);
            tag.find(".virtualserver_default_channel_description").val(server.properties.virtualserver_default_channel_description);
            tag.find(".virtualserver_default_channel_topic").val(server.properties.virtualserver_default_channel_topic);
        });

        console.log(tag);
        console.log(tag.find(".virtualserver_default_client_description"));
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
}