/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function spawnConnectModal(defaultHost: { url: string, enforce: boolean} = { url: "ts.TeaSpeak.de", enforce: false}, connect_profile?: { profile: profiles.ConnectionProfile, enforce: boolean}) {
        let selected_profile: profiles.ConnectionProfile;
        const connectModal = createModal({
            header: function() {
                let header = $.spawn("div");
                header.text(tr("Create a new connection"));
                return header;
            },
            body: function () {
                let tag = $("#tmpl_connect").renderTag({
                    client: native_client,
                    forum_path: settings.static("forum_path")
                });

                let updateFields = function () {
                    if(selected_profile) tag.find(".connect_nickname").attr("placeholder", selected_profile.default_username);
                    else
                    tag.find(".connect_nickname").attr("");

                    let button = tag.parents(".modal-content").find(".connect_connect_button");

                    let field_address = tag.find(".connect_address");
                    let address = field_address.val().toString();
                    settings.changeGlobal("connect_address", address);
                    let flag_address = !!address.match(Regex.IP_V4) || !!address.match(Regex.DOMAIN);

                    let field_nickname = tag.find(".connect_nickname");
                    let nickname = field_nickname.val().toString();
                    settings.changeGlobal("connect_name", nickname);
                    let flag_nickname = (nickname.length == 0 && selected_profile && selected_profile.default_username.length > 0) || nickname.length >= 3 && nickname.length <= 32;

                    if(flag_address) {
                        if(field_address.hasClass("invalid_input"))
                            field_address.removeClass("invalid_input");
                    } else {
                        if(!field_address.hasClass("invalid_input"))
                            field_address.addClass("invalid_input");
                    }

                    if(flag_nickname) {
                        if(field_nickname.hasClass("invalid_input"))
                            field_nickname.removeClass("invalid_input");
                    } else {
                        if(!field_nickname.hasClass("invalid_input"))
                            field_nickname.addClass("invalid_input");
                    }

                    if(!flag_nickname || !flag_address || !selected_profile || !selected_profile.valid()) {
                        button.prop("disabled", true);
                    } else {
                        button.prop("disabled", false);
                    }
                };

                tag.find(".connect_nickname").val(settings.static_global("connect_name", undefined));
                tag.find(".connect_address").val(defaultHost.enforce ? defaultHost.url : settings.static_global("connect_address", defaultHost.url));
                tag.find(".connect_address")
                    .on("keyup", () => updateFields())
                    .on('keydown', event => {
                        if(event.keyCode == JQuery.Key.Enter && !event.shiftKey)
                            tag.parents(".modal-content").find(".connect_connect_button").trigger('click');
                    });

                tag.find(".button-manage-profiles").on('click', event => {
                    const modal = Modals.spawnSettingsModal();
                    setTimeout(() => {
                        modal.htmlTag.find(".tab-profiles").parent(".entry").trigger('click');
                    }, 100);
                    modal.close_listener.push(() => {
                        tag.find(".profile-select-container select").trigger('change');
                    });
                    return true;
                });

                {
                    const select_tag = tag.find(".profile-select-container select");
                    const select_invalid_tag = tag.find(".profile-invalid");

                    for(const profile of profiles.profiles()) {
                        select_tag.append(
                            $.spawn("option").text(profile.profile_name).val(profile.id)
                        );
                    }

                    select_tag.on('change', event => {
                        selected_profile = profiles.find_profile(select_tag.val() as string);
                        if(!selected_profile || !selected_profile.valid())
                            select_invalid_tag.show();
                        else
                            select_invalid_tag.hide();
                        updateFields();
                    });
                    select_tag.val(connect_profile && connect_profile.enforce ? connect_profile.profile.id : connect_profile && connect_profile.profile ? connect_profile.profile.id : 'default').trigger('change');
                }

                tag.find(".connect_nickname").on("keyup", () => updateFields());

                setTimeout(() => updateFields(), 100);
                //connect_address
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");

                let button = $.spawn("button");
                button.addClass("connect_connect_button");
                button.text(tr("Connect"));
                button.on("click", function () {
                    connectModal.close();

                    let field_address = tag.parents(".modal-content").find(".connect_address");
                    let address = field_address.val().toString();
                    globalClient.startConnection(
                        address,
                        selected_profile,
                        tag.parents(".modal-content").find(".connect_nickname").val().toString() || selected_profile.default_username,
                        {password: tag.parents(".modal-content").find(".connect_password").val().toString(), hashed: false}
                    );
                });
                tag.append(button);
                return tag;
            },

            width: '70%',
            //closeable: false
        });
        connectModal.open();
    }

    let Regex = {
        //DOMAIN<:port>
        DOMAIN: /^(localhost|((([a-zA-Z0-9_-]{0,63}\.){0,253})?[a-zA-Z0-9_-]{0,63}\.[a-zA-Z]{2,5}))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
        //IP<:port>
        IP_V4: /(^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(|:(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[0-5]?[0-9]{1,4}))$/,
        IP_V6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
        IP: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
    };
}