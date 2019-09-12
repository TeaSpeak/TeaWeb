namespace Modals {
    type InfoUpdateCallback = (info: ServerConnectionInfo | boolean) => any;
    export function openServerInfo(server: ServerEntry) {
        let modal: Modal;
        let update_callbacks: InfoUpdateCallback[] = [];

        modal = createModal({
            header: tr("Server Information: ") + server.properties.virtualserver_name,
            body: () => {
                const template = $("#tmpl_server_info").renderTag();

                const children = template.children();
                const top = template.find(".container-top");
                const update_values = () => {
                    apply_hostbanner(server, top);
                    apply_category_1(server, children, update_callbacks);
                    apply_category_2(server, children, update_callbacks);
                    apply_category_3(server, children, update_callbacks);
                };

                const button_update = template.find(".button-update");
                button_update.on('click', event => {
                    button_update.prop("disabled", true);
                    server.updateProperties().then(() => {
                        update_callbacks = [];
                        update_values();
                    }).catch(error => {
                        log.warn(LogCategory.CLIENT, tr("Failed to refresh server properties: %o"), error);
                        if(error instanceof CommandResult)
                            error = error.extra_message || error.message;
                        createErrorModal(tr("Refresh failed"), MessageHelper.formatMessage(tr("Failed to refresh server properties.{:br:}Error: {}"), error)).open();
                    }).then(() => {
                        button_update.prop("disabled", false);
                    });
                }).trigger('click');

                update_values();
                tooltip(template);
                return template.children();
            },
            footer: null,
            min_width: "25em"
        });

        const updater = setInterval(() => {
            server.request_connection_info().then(info => update_callbacks.forEach(e => e(info))).catch(error => update_callbacks.forEach(e => e(false)));
        }, 1000);


        modal.htmlTag.find(".button-close").on('click', event => modal.close());
        modal.htmlTag.find(".button-show-bandwidth").on('click', event => {
            const intervals = [];
            const updater = (info) => {
                intervals.forEach(e => e(info));
            };

            update_callbacks.push(updater);
            Modals.openServerInfoBandwidth(server, intervals).close_listener.push(() => {
                update_callbacks.remove(updater);
            });
        });

        modal.htmlTag.find(".modal-body").addClass("modal-server-info");
        modal.open();
        modal.close_listener.push(() => clearInterval(updater));
    }

    function apply_hostbanner(server: ServerEntry, tag: JQuery) {
        let container: JQuery;
        tag.empty().append(
            container = $.spawn("div").addClass("container-hostbanner")
        ).addClass("hidden");

        const htag = Hostbanner.generate_tag(server.properties.virtualserver_hostbanner_gfx_url, server.properties.virtualserver_hostbanner_gfx_interval, server.properties.virtualserver_hostbanner_mode);
        htag.then(t => {
            if(!t) return;

            tag.removeClass("hidden");
            container.append(t);
        });
    }

    function apply_category_1(server: ServerEntry, tag: JQuery, update_callbacks: InfoUpdateCallback[]) {
        /* server name */
        {
            const container = tag.find(".server-name");
            container.text(server.properties.virtualserver_name);
        }

        /* server region */
        {
            const container = tag.find(".server-region").empty();
            container.append(
                $.spawn("div").addClass("country flag-" + server.properties.virtualserver_country_code.toLowerCase()),
                $.spawn("a").text(i18n.country_name(server.properties.virtualserver_country_code, tr("Global")))
            );
        }

        /* slots */
        {
            const container = tag.find(".server-slots");

            let text = server.properties.virtualserver_clientsonline + "/" + server.properties.virtualserver_maxclients;
            if(server.properties.virtualserver_queryclientsonline)
                text += " +" + (server.properties.virtualserver_queryclientsonline > 1 ?
                                    server.properties.virtualserver_queryclientsonline + " " + tr("Queries") :
                                    server.properties.virtualserver_queryclientsonline + " " + tr("Query"));
            if(server.properties.virtualserver_reserved_slots)
                text += " (" + server.properties.virtualserver_reserved_slots + " " + tr("Reserved") + ")";

            container.text(text);
        }

        /* first run */
        {
            const container = tag.find(".server-first-run");

            container.text(
                server.properties.virtualserver_created > 0 ?
                    moment(server.properties.virtualserver_created * 1000).format('MMMM Do YYYY, h:mm:ss a') :
                    tr("Unknown")
            );
        }

        /* uptime */
        {
            const container = tag.find(".server-uptime");
            const update = () => container.text(MessageHelper.format_time(server.calculateUptime() * 1000, tr("just started")));
            update_callbacks.push(update);
            update();
        }
    }

    function apply_category_2(server: ServerEntry, tag: JQuery, update_callbacks: InfoUpdateCallback[]) {
        /* ip */
        {
            const container = tag.find(".server-ip");
            container.text(server.remote_address.host + (server.remote_address.port == 9987 ? "" : (":" + server.remote_address.port)))
        }

        /* version */
        {
            const container = tag.find(".server-version");

            let timestamp = -1;
            const version = (server.properties.virtualserver_version || "unknwon").replace(/ ?\[build: ?([0-9]+)]/gmi, (group, ts) => {
                timestamp = parseInt(ts);
                return "";
            });

            container.find("a").text(version);
            container.find(".container-tooltip").toggle(timestamp > 0).find(".tooltip a").text(
                moment(timestamp * 1000).format('[Build timestamp:] YYYY-MM-DD HH:mm Z')
            );
        }

        /* platform */
        {
            const container = tag.find(".server-platform");
            container.text(server.properties.virtualserver_platform);
        }

        /* ping */
        {
            const container = tag.find(".server-ping");
            container.text(tr("calculating..."));
            update_callbacks.push(data => {
                if(typeof(data) === "boolean")
                    container.text(tr("No Permissions"));
                else
                    container.text(data.connection_ping.toFixed(0) + " " + "ms");
            });
        }

        /* packet loss */
        {
            const container = tag.find(".server-packet-loss");
            container.text(tr("calculating..."));
            update_callbacks.push(data => {
                if(typeof(data) === "boolean")
                    container.text(tr("No Permissions"));
                else
                    container.text(data.connection_packetloss_total.toFixed(2) + "%");
            });
        }
    }

    function apply_category_3(server: ServerEntry, tag: JQuery, update_callbacks: InfoUpdateCallback[]) {
        /* unique id */
        {
            const container = tag.find(".server-unique-id");
            container.text(server.properties.virtualserver_unique_identifier || tr("Unknown"));
        }

        /* voice encryption */
        {
            const container = tag.find(".server-voice-encryption");
            if(server.properties.virtualserver_codec_encryption_mode == 0)
                container.text(tr("Globally off"));
            else if(server.properties.virtualserver_codec_encryption_mode == 1)
                container.text(tr("Individually configured per channel"));
            else
                container.text(tr("Globally on"));
        }

        /* channel count */
        {
            const container = tag.find(".server-channel-count");
            container.text(server.properties.virtualserver_channelsonline);
        }

        /* minimal security level */
        {
            const container = tag.find(".server-min-security-level");
            container.text(server.properties.virtualserver_needed_identity_security_level);
        }

        /* complains */
        {
            const container = tag.find(".server-complains");
            container.text(server.properties.virtualserver_complain_autoban_count);
        }
    }
}