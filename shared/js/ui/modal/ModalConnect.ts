/// <reference path="../../utils/modal.ts" />

namespace Modals {
    export function spawnConnectModal(defaultHost: { url: string, enforce: boolean} = { url: "ts.TeaSpeak.de", enforce: false}, connect_profile?: { profile: profiles.ConnectionProfile, enforce: boolean}) {
        let selected_profile: profiles.ConnectionProfile;

        const random_id = (() => {
            const array = new Uint32Array(10);
            window.crypto.getRandomValues(array);
            return array.join("");
        })();

        const connect_modal = $("#tmpl_connect").renderTag({
            client: native_client,
            forum_path: settings.static("forum_path"),
            password_id: random_id
        }).modalize((header, body, footer) => {
            const button_connect = footer.find(".button-connect");
            const button_manage = body.find(".button-manage-profiles");

            const input_profile = body.find(".container-select-profile select");
            const input_address = body.find(".container-address input");
            const input_nickname = body.find(".container-nickname input");
            const input_password = body.find(".container-password input");

            let updateFields = function () {
                console.log("Updating");
                if(selected_profile)
                    input_nickname.attr("placeholder", selected_profile.default_username);
                else
                    input_nickname.attr("placeholder", "");

                let address = input_address.val().toString();
                settings.changeGlobal(Settings.KEY_CONNECT_ADDRESS, address);
                let flag_address = !!address.match(Regex.IP_V4) || !!address.match(Regex.DOMAIN);

                let nickname = input_nickname.val().toString();
                settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, nickname);
                let flag_nickname = (nickname.length == 0 && selected_profile && selected_profile.default_username.length > 0) || nickname.length >= 3 && nickname.length <= 32;

                input_address.attr('pattern', flag_address ? null : '^[a]{1000}$').toggleClass('is-invalid', !flag_address);
                input_nickname.attr('pattern', flag_nickname ? null : '^[a]{1000}$').toggleClass('is-invalid', !flag_nickname);

                if(!flag_nickname || !flag_address || !selected_profile || !selected_profile.valid()) {
                    button_connect.prop("disabled", true);
                } else {
                    button_connect.prop("disabled", false);
                }
            };

            input_nickname.val(settings.static_global(Settings.KEY_CONNECT_USERNAME, undefined));
            input_address.val(defaultHost.enforce ? defaultHost.url : settings.static_global(Settings.KEY_CONNECT_ADDRESS, defaultHost.url));
            input_address
                .on("keyup", () => updateFields())
                .on('keydown', event => {
                    if(event.keyCode == JQuery.Key.Enter && !event.shiftKey)
                        button_connect.trigger('click');
                });

            button_manage.on('click', event => {
                const modal = Modals.spawnSettingsModal();
                setTimeout(() => {
                    modal.htmlTag.find(".tab-profiles").parent(".entry").trigger('click');
                }, 100);
                modal.close_listener.push(() => {
                    input_profile.trigger('change');
                });
                return true;
            });

            {
                for(const profile of profiles.profiles()) {
                    input_profile.append(
                        $.spawn("option").text(profile.profile_name).val(profile.id)
                    );
                }

                input_profile.on('change', event => {
                    selected_profile = profiles.find_profile(input_profile.val() as string);
                    input_profile.toggleClass("is-invalid", !selected_profile || !selected_profile.valid());
                    updateFields();
                });
                input_profile.val(connect_profile && connect_profile.enforce ? connect_profile.profile.id : connect_profile && connect_profile.profile ? connect_profile.profile.id : 'default').trigger('change');
            }

            input_nickname.on("keyup", () => updateFields());
            setTimeout(() => updateFields(), 100);

            button_connect.on('click', event => {
                connect_modal.close();

                globalClient.startConnection(
                    input_address.val().toString(),
                    selected_profile,
                    input_nickname.val().toString() || selected_profile.default_username,
                    {password: input_password.val().toString(), hashed: false}
                );
            });
        }, {
            width: '70%'
        });

        connect_modal.open();
        return;


        const connectModal = createModal({
            header: (tr("Create a new connection")),
            body: function () {
                const random_id = (() => {
                    const array = new Uint32Array(10);
                    window.crypto.getRandomValues(array);
                    return array.join("");
                })();

                let tag = $("#tmpl_connect").renderTag({
                    client: native_client,
                    forum_path: settings.static("forum_path"),
                    password_id: random_id
                });


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
            //flag_closeable: false
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