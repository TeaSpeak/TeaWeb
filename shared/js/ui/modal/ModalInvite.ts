/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    type URLGeneratorSettings = {
        flag_direct: boolean,
        flag_resolved: boolean
    }

    const DefaultGeneratorSettings: URLGeneratorSettings = {
        flag_direct: true,
        flag_resolved: false
    };

    type URLGenerator = {
        generate: (properties: {
            address: ServerAddress,
            resolved_address: ServerAddress
        } & URLGeneratorSettings) => string;

        setting_available: (key: keyof URLGeneratorSettings) => boolean;
    };

    const build_url = (base, params) => {
        if(Object.keys(params).length == 0)
            return base;

        return base + "?" + Object.keys(params)
                                .map(e => e + "=" + encodeURIComponent(params[e]))
                                .join("&");
    };

    //TODO: Server password
    const url_generators: {[key: string]:URLGenerator} = {
        "tea-web": {
            generate: properties => {
                const address = properties.resolved_address ? properties.resolved_address : properties.address;
                const address_str = address.host + (address.port === 9987 ? "" : address.port);
                const parameter = "connect_default=" + (properties.flag_direct ? 1 : 0) + "&connect_address=" + encodeURIComponent(address_str);

                let pathbase = "";
                if(document.location.protocol !== 'https:') {
                    /*
                     * Seems to be a test environment or the TeaClient for localhost where we dont have to use https.
                     */
                    pathbase = "https://web.teaspeak.de/";
                } else if(document.location.hostname === "localhost" || document.location.host.startsWith("127.")) {
                    pathbase = "https://web.teaspeak.de/";
                } else {
                    pathbase = document.location.origin +  document.location.pathname;
                }
                return pathbase + "?" + parameter;
            },
            setting_available: setting => {
                return {
                    flag_direct: true,
                    flag_resolved: true
                }[setting] || false;
            }
        },
        "tea-client": {
            generate: properties => {
                const address = properties.resolved_address ? properties.resolved_address : properties.address;


                let parameters = {
                    connect_default: properties.flag_direct ? 1 : 0
                };

                if(address.port != 9987)
                    parameters["port"] = address.port;

                return build_url("teaclient://" + address.host + "/", parameters);
            },
            setting_available: setting => {
                return {
                    flag_direct: true,
                    flag_resolved: true
                }[setting] || false;
            }
        },
        "teamspeak": {
            generate: properties => {
                const address = properties.resolved_address ? properties.resolved_address : properties.address;

                let parameters = {};
                if(address.port != 9987)
                    parameters["port"] = address.port;

                /*
                    ts3server://<host>?
                        port=9987
                        nickname=UserNickname
                        password=serverPassword
                        channel=MyDefaultChannel
                        cid=channelID
                        channelpassword=defaultChannelPassword
                        token=TokenKey
                        addbookmark=MyBookMarkLabel
                */
                return build_url("ts3server://" + address.host + "/", parameters);
            },
            setting_available: setting => {
                return {
                    flag_direct: false,
                    flag_resolved: true
                }[setting] || false;
            }
        }
    };

    export function spawnInviteEditor(connection: ConnectionHandler) {
        let modal: Modal;
        modal = createModal({
            header: tr("Invite URL creator"),
            body: () => {
                let template = $("#tmpl_invite").renderTag();

                template.find(".button-close").on('click', event => modal.close());
                return template;
            },
            footer: undefined,
            min_width: "20em",
            width: "50em"
        });

        modal.htmlTag.find(".modal-body").addClass("modal-invite");

        const button_copy = modal.htmlTag.find(".button-copy");
        const input_type = modal.htmlTag.find(".property-type select");
        const label_output = modal.htmlTag.find(".text-output");

        const invite_settings = [
            {
                key: "flag_direct",
                node: modal.htmlTag.find(".flag-direct-connect input"),
                value: node => node.prop('checked'),
                set_value: (node, value) => node.prop('checked', value == "1"),
                disable: (node, flag) => node.prop('disabled', flag)
                                            .firstParent('.checkbox').toggleClass('disabled', flag)
            },

            {
                key: "flag_resolved",
                node: modal.htmlTag.find(".flag-resolved-address input"),
                value: node => node.prop('checked'),
                set_value: (node, value) => node.prop('checked', value == "1"),
                disable: (node, flag) => node.prop('disabled', flag)
                                            .firstParent('.checkbox').toggleClass('disabled', flag)
            }
        ];

        const update_buttons = () => {
            const generator = url_generators[input_type.val() as string];
            if(!generator) {
                for(const s of invite_settings)
                    s.disable(s.node, true);
                return;
            }

            for(const s of invite_settings)
                s.disable(s.node, !generator.setting_available(s.key as any));
        };

        const update_link = () => {
            const generator = url_generators[input_type.val() as string];
            if(!generator) {
                button_copy.prop('disabled', true);
                label_output.text(tr("Missing link generator"));
                return;
            }
            button_copy.prop('disabled', false);

            const properties = {
                address: connection.channelTree.server.remote_address,
                resolved_address: connection.channelTree.client.serverConnection.remote_address()
            };
            for(const s of invite_settings)
                properties[s.key] = s.value(s.node);

            label_output.text(generator.generate(properties as any));
        };


        for(const s of invite_settings) {
            s.node.on('change keyup', () => {
                settings.changeGlobal(Settings.FN_INVITE_LINK_SETTING(s.key), s.value(s.node));
                update_link()
            });

            s.set_value(s.node, settings.global(Settings.FN_INVITE_LINK_SETTING(s.key), DefaultGeneratorSettings[s.key]));
        }

        input_type.on('change', () => {
                        settings.changeGlobal(Settings.KEY_LAST_INVITE_LINK_TYPE, input_type.val());
                        update_buttons();
                        update_link();
                    }).val(settings.global(Settings.KEY_LAST_INVITE_LINK_TYPE));

        button_copy.on('click', event => {
            label_output.select();
            document.execCommand('copy');
        });

        update_buttons();
        update_link();
        modal.open();
    }
}

/*

                        <option value="tea-web">{{tr "TeaWeb" /}}</option>
                        <option value="tea-client">{{tr "TeaClient" /}}</option>
                        <option value="teamspeak">{{tr "TeamSpeak" /}}</option>
 */