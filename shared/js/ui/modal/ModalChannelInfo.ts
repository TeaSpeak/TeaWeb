namespace Modals {
    export function openChannelInfo(channel: ChannelEntry) {
        let modal: Modal;

        modal = createModal({
            header: tr("Channel information: ") + channel.channelName(),
            body: () => {
                const template = $("#tmpl_channel_info").renderTag();

                const update_values = (container) => {

                    apply_channel_description(container.find(".container-description"), channel);
                    apply_general(container, channel);
                };

                template.find(".button-copy").on('click', event => {
                    copy_to_clipboard(channel.properties.channel_description);
                    createInfoModal(tr("Description copied"), tr("The channel description has been copied to your clipboard!")).open();
                });

                const button_update = template.find(".button-update");
                button_update.on('click', event => update_values(modal.htmlTag));

                update_values(template);
                tooltip(template);
                return template.children();
            },
            footer: null,
            width: "65em"
        });
        modal.htmlTag.find(".button-close").on('click', event => modal.close());
        modal.htmlTag.find(".modal-body").addClass("modal-channel-info");
        modal.open();
    }

    function apply_channel_description(container: JQuery, channel: ChannelEntry) {
        const container_value = container.find(".value");
        const container_no_value = container.find(".no-value");

        channel.getChannelDescription().then(description => {
            if(description) {
                const result = xbbcode.parse(description, {});
                container_value[0].innerHTML = result.build_html();
                container_no_value.hide();
                container_value.show();
            } else {
                container_no_value.text(tr("Channel has no description"));
            }
        });

        container_value.hide();
        container_no_value.text(tr("loading...")).show();
    }

    const codec_names = [
        tr("Speex Narrowband"),
        tr("Speex Wideband"),
        tr("Speex Ultra-Wideband"),
        tr("CELT Mono"),
        tr("Opus Voice"),
        tr("Opus Music")
    ];

    function apply_general(container: JQuery, channel: ChannelEntry) {
        /* channel type */
        {
            const tag = container.find(".channel-type .value").empty();
            if(channel.properties.channel_flag_permanent)
                tag.text(tr("Permanent"));
            else if(channel.properties.channel_flag_semi_permanent)
                tag.text(tr("Semi permanent"));
            else
                //TODO: Channel delete delay!
                tag.text(tr("Temporary"));
        }

        /* chat mode */
        {
            const tag = container.find(".chat-mode .value").empty();
            if(channel.properties.channel_flag_conversation_private || channel.properties.channel_flag_password) {
                tag.text(tr("Private"));
            } else {
                if(channel.properties.channel_conversation_history_length == -1)
                    tag.text(tr("Public; Semi permanent message saving"));
                else if(channel.properties.channel_conversation_history_length == 0)
                    tag.text(tr("Public; Permanent message saving"));
                else
                    tag.append(MessageHelper.formatMessage(tr("Public; Saving last {} messages"), channel.properties.channel_conversation_history_length));
            }
        }

        /* current clients */
        {
            const tag = container.find(".current-clients .value").empty();

            if(channel.flag_subscribed) {
                const current = channel.clients().length;
                let channel_limit = tr("Unlimited");
                if(!channel.properties.channel_flag_maxclients_unlimited)
                    channel_limit = "" + channel.properties.channel_maxclients;
                else if(!channel.properties.channel_flag_maxfamilyclients_unlimited) {
                    if(channel.properties.channel_maxfamilyclients >= 0)
                        channel_limit = "" + channel.properties.channel_maxfamilyclients;
                }

                tag.text(current + " / " + channel_limit);
            } else {
                tag.text(tr("Channel not subscribed"));
            }
        }

        /* audio codec */
        {
            const tag = container.find(".audio-codec .value").empty();
            tag.text((codec_names[channel.properties.channel_codec] || tr("Unknown")) + " (" + channel.properties.channel_codec_quality + ")")
        }

        /* audio encrypted */
        {
            const tag = container.find(".audio-encrypted .value").empty();
            const mode = channel.channelTree.server.properties.virtualserver_codec_encryption_mode;
            let appendix;
            if(mode == 1)
                appendix = tr("Overridden by the server with Unencrypted!");
            else if(mode == 2)
                appendix = tr("Overridden by the server with Encrypted!");

            tag.html((channel.properties.channel_codec_is_unencrypted ? tr("Unencrypted") : tr("Encrypted")) + (appendix ? "<br>" + appendix : ""))
        }

        /* flag password */
        {
            const tag = container.find(".flag-password .value").empty();
            if(channel.properties.channel_flag_password)
                tag.text(tr("Yes"));
            else
                tag.text(tr("No"));
        }

        /* topic */
        {
            const container_tag = container.find(".topic");
            const tag = container_tag.find(".value").empty();
            if(channel.properties.channel_topic) {
                container_tag.show();
                tag.text(channel.properties.channel_topic);
            } else {
                container_tag.hide();
            }
        }
    }
}