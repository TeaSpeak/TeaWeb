/// <reference path="../../utils/modal.ts" />
namespace Modals {
    export function spawnConnectModal(defaultHost: string = "ts.TeaSpeak.de", def_connect_type?: IdentitifyType) {
        let connectIdentity: Identity;
        const connectModal = createModal({
            header: function() {
                let header = $.spawn("div");
                header.text("Create a new connection");
                return header;
            },
            body: function () {
                let tag = $("#tmpl_connect").renderTag({
                    forum_path: settings.static("forum_path"),
                    forum_valid: !!forumIdentity
                });

                let updateFields = function () {
                    if(connectIdentity) tag.find(".connect_nickname").attr("placeholder", connectIdentity.name());
                    else tag.find(".connect_nickname").attr("");

                    let button = tag.parents(".modal-content").find(".connect_connect_button");

                    let field_address = tag.find(".connect_address");
                    let address = field_address.val().toString();
                    settings.changeGlobal("connect_address", address);
                    let flag_address = !!address.match(Regex.IP_V4) || !!address.match(Regex.DOMAIN);

                    let field_nickname = tag.find(".connect_nickname");
                    let nickname = field_nickname.val().toString();
                    settings.changeGlobal("connect_name", nickname);
                    let flag_nickname = (nickname.length == 0 && connectIdentity && connectIdentity.name().length > 0) || nickname.length >= 3 && nickname.length <= 32;

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

                    if(!flag_nickname || !flag_address || !connectIdentity) {
                        button.prop("disabled", true);
                    } else {
                        button.prop("disabled", false);
                    }
                };

                tag.find(".connect_nickname").val(settings.static_global("connect_name", undefined));
                tag.find(".connect_address").val(settings.static_global("connect_address", defaultHost));
                tag.find(".connect_address").on("keyup", () => updateFields());
                tag.find(".connect_nickname").on("keyup", () => updateFields());

                tag.find(".identity_select").on('change', function (this: HTMLSelectElement) {
                    settings.changeGlobal("connect_identity_type", IdentitifyType[this.value]);
                    tag.find(".error_message").hide();
                    tag.find(".identity_config:not(" + ".identity_config_" + this.value + ")").hide();
                    tag.find(".identity_config_" + this.value).show().trigger('shown');
                });
                tag.find(".identity_select").val(IdentitifyType[def_connect_type ? def_connect_type : settings.global("connect_identity_type", IdentitifyType.TEAFORO)]);
                setTimeout(() =>  tag.find(".identity_select").trigger('change'), 0); //For some reason could not be run instantly

                {
                    tag.find(".identity_file").change(function (this: HTMLInputElement) {
                        const reader = new FileReader();
                        reader.onload = function() {
                            connectIdentity = TSIdentityHelper.loadIdentityFromFileContains(reader.result as string);

                            console.log(connectIdentity.uid());
                            if(!connectIdentity) tag.find(".error_message").text("Could not read identity! " + TSIdentityHelper.last_error());
                            else {
                                tag.find(".identity_string").val((connectIdentity as TeamSpeakIdentity).exported());
                                settings.changeGlobal("connect_identity_teamspeak_identity", (connectIdentity as TeamSpeakIdentity).exported());
                            }

                            (!!connectIdentity ? tag.hide : tag.show).apply(tag.find(".error_message"));
                            updateFields();
                        };
                        reader.onerror = ev => {
                            tag.find(".error_message").text("Could not read identity file!").show();
                            updateFields();
                        };
                        reader.readAsText(this.files[0]);
                    });

                    tag.find(".identity_string").on('change', function (this: HTMLInputElement) {
                        if(this.value.length == 0){
                            tag.find(".error_message").text("Please select an identity!");
                            connectIdentity = undefined;
                        } else {
                            connectIdentity = TSIdentityHelper.loadIdentity(this.value);
                            if(!connectIdentity) tag.find(".error_message").text("Could not parse identity! " + TSIdentityHelper.last_error());
                            else settings.changeGlobal("connect_identity_teamspeak_identity", this.value);
                        }
                        (!!connectIdentity ? tag.hide : tag.show).apply(tag.find(".error_message"));
                        tag.find(".identity_file").val("");
                        updateFields();
                    });
                    tag.find(".identity_string").val(settings.global("connect_identity_teamspeak_identity", ""));
                    tag.find(".identity_config_" + IdentitifyType[IdentitifyType.TEAMSPEAK]).on('shown', ev => {
                        tag.find(".identity_string").trigger('change');
                    });
                }

                {
                    tag.find(".identity_config_" + IdentitifyType[IdentitifyType.TEAFORO]).on('shown', ev => {
                        connectIdentity = forumIdentity;
                        updateFields();
                    });
                }

                {
                    tag.find(".identity_config_" + IdentitifyType[IdentitifyType.NICKNAME]).on('shown', ev => {
                        connectIdentity = new NameIdentity(tag.find(".connect_nickname").val() as string);
                        updateFields();
                    });
                    tag.find(".connect_nickname").on("keyup", () => {
                        if(connectIdentity instanceof NameIdentity)
                            connectIdentity.set_name(tag.find(".connect_nickname").val() as string);
                    });
                    if(!settings.static("localhost_debug", false))
                        tag.find(".identity_select option[value=" + IdentitifyType[IdentitifyType.NICKNAME] + "]").remove();
                }

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
                button.text("Connect");
                button.on("click", function () {
                    connectModal.close();

                    let field_address = tag.parents(".modal-content").find(".connect_address");
                    let address = field_address.val().toString();
                    globalClient.startConnection(
                        address,
                        connectIdentity,
                        tag.parents(".modal-content").find(".connect_nickname").val().toString(),
                        {password: tag.parents(".modal-content").find(".connect_password").val().toString(), hashed: false}
                    );
                });
                tag.append(button);
                return tag;
            },

            width: 600,
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

/*
<div style="display: flex; justify-content: space-between;">
                        <div style="text-align: right;">Identity Settings</div>
                        <select class="identity_select">
                            <option name="identity_type" value="identity_type_forum">Forum Account</option>
                            <option name="identity_type" value="identity_type_teamspeak">TeamSpeak</option>
                        </select>
                    </div>
                    <hr>
                    <div class="identity_config_teamspeak">
                        Please enter your exported TS3 Identity string bellow or select your exported Identity<br>
                        <div style="width: 100%; display: flex; flex-direction: row">
                            <input placeholder="Identity string" style="width: 70%; margin: 5px;" class="identity_string">
                            <div style="width: 30%; margin: 5px"><input name="identity_file" type="file"></div>
                        </div>
                    </div>
                    <div class="identity_config_forum">
                        You're using your forum account as verification
                    </div>

                    <div style="background-color: red; border-radius: 1px; display: none" class="error_message">
                        Identity isnt valid!
                    </div>
 */