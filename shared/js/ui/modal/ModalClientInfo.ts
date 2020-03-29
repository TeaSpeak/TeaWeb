namespace Modals {
    type InfoUpdateCallback = (info: ClientConnectionInfo) => any;
    export function openClientInfo(client: ClientEntry) {
        let modal: Modal;
        let update_callbacks: InfoUpdateCallback[] = [];

        modal = createModal({
            header: tr("Profile Information: ") + client.clientNickName(),
            body: () => {
                const template = $("#tmpl_client_info").renderTag();

                /* the tab functionality */
                {
                    const container_tabs = template.find(".container-categories");
                    container_tabs.find(".categories .entry").on('click', event => {
                        const entry = $(event.target);

                        container_tabs.find(".bodies > .body").addClass("hidden");
                        container_tabs.find(".categories > .selected").removeClass("selected");

                        entry.addClass("selected");
                        container_tabs.find(".bodies > .body." + entry.attr("container")).removeClass("hidden");
                    });

                    container_tabs.find(".entry").first().trigger('click');
                }

                apply_static_info(client, template, modal, update_callbacks);
                apply_client_status(client, template, modal, update_callbacks);
                apply_basic_info(client, template.find(".container-basic"), modal, update_callbacks);
                apply_groups(client, template.find(".container-groups"), modal, update_callbacks);
                apply_packets(client, template.find(".container-packets"), modal, update_callbacks);

                tooltip(template);
                return template.children();
            },
            footer: null,

            width: '60em'
        });

        const updater = setInterval(() => {
            client.request_connection_info().then(info => update_callbacks.forEach(e => e(info)));
        }, 1000);

        modal.htmlTag.find(".modal-body").addClass("modal-client-info");
        modal.open();
        modal.close_listener.push(() => clearInterval(updater));
    }

    const TIME_SECOND = 1000;
    const TIME_MINUTE = 60 * TIME_SECOND;
    const TIME_HOUR = 60 * TIME_MINUTE;
    const TIME_DAY = 24 * TIME_HOUR;
    const TIME_WEEK = 7 * TIME_DAY;

    function format_time(time: number, default_value: string) {
        let result = "";
        if(time > TIME_WEEK) {
            const amount = Math.floor(time / TIME_WEEK);
            result += " " + amount + " " + (amount > 1 ? tr("Weeks") : tr("Week"));
            time -= amount * TIME_WEEK;
        }

        if(time > TIME_DAY) {
            const amount = Math.floor(time / TIME_DAY);
            result += " " + amount + " " + (amount > 1 ? tr("Days") : tr("Day"));
            time -= amount * TIME_DAY;
        }

        if(time > TIME_HOUR) {
            const amount = Math.floor(time / TIME_HOUR);
            result += " " + amount + " " + (amount > 1 ? tr("Hours") : tr("Hour"));
            time -= amount * TIME_HOUR;
        }

        if(time > TIME_MINUTE) {
            const amount = Math.floor(time / TIME_MINUTE);
            result += " " + amount + " " + (amount > 1 ? tr("Minutes") : tr("Minute"));
            time -= amount * TIME_MINUTE;
        }

        if(time > TIME_SECOND) {
            const amount = Math.floor(time / TIME_SECOND);
            result += " " + amount + " " + (amount > 1 ? tr("Seconds") : tr("Second"));
            time -= amount * TIME_SECOND;
        }

        return result.length > 0 ? result.substring(1) : default_value;
    }

    function apply_static_info(client: ClientEntry, tag: JQuery, modal: Modal, callbacks: InfoUpdateCallback[]) {
        tag.find(".container-avatar").append(
            client.channelTree.client.fileManager.avatars.generate_chat_tag({database_id: client.properties.client_database_id, id: client.clientId()}, client.properties.client_unique_identifier)
        );

        tag.find(".container-name").append(
            client.createChatTag()
        );

        tag.find(".client-description").text(
            client.properties.client_description
        );
    }

    function apply_client_status(client: ClientEntry, tag: JQuery, modal: Modal, callbacks: InfoUpdateCallback[]) {
        tag.find(".status-output-disabled").toggle(!client.properties.client_output_hardware);
        tag.find(".status-input-disabled").toggle(!client.properties.client_input_hardware);

        tag.find(".status-output-muted").toggle(client.properties.client_output_muted);
        tag.find(".status-input-muted").toggle(client.properties.client_input_muted);


        tag.find(".status-away").toggle(client.properties.client_away);
        if(client.properties.client_away_message) {
            tag.find(".container-away-message").show().find("a").text(client.properties.client_away_message);
        } else {
            tag.find(".container-away-message").hide();
        }
    }

    function apply_basic_info(client: ClientEntry, tag: JQuery, modal: Modal, callbacks: InfoUpdateCallback[]) {
        /* Unique ID */
        {
            const container = tag.find(".property-unique-id");

            container.find(".value a").text(client.clientUid());
            container.find(".value-dbid").text(client.properties.client_database_id);

            container.find(".button-copy").on('click', event => {
                copy_to_clipboard(client.clientUid());
                createInfoModal(tr("Unique ID copied"), tr("The unique id has been copied to your clipboard!")).open();
            });
        }

        /* TeaForo */
        {
            const container = tag.find(".property-teaforo .value").empty();

            if(client.properties.client_teaforo_id) {
                container.children().remove();

                let text = client.properties.client_teaforo_name;
                if((client.properties.client_teaforo_flags & 0x01) > 0)
                    text += " (" + tr("Banned") + ")";
                if((client.properties.client_teaforo_flags & 0x02) > 0)
                    text += " (" + tr("Stuff") + ")";
                if((client.properties.client_teaforo_flags & 0x04) > 0)
                    text += " (" + tr("Premium") + ")";

                $.spawn("a")
                    .attr("href", "https://forum.teaspeak.de/index.php?members/" + client.properties.client_teaforo_id)
                    .attr("target", "_blank")
                    .text(text)
                    .appendTo(container);
            } else {
                container.append($.spawn("a").text(tr("Not connected")));
            }
        }

        /* Version */
        {
            const container = tag.find(".property-version");

            let version_full = client.properties.client_version;
            let version = version_full.substring(0, version_full.indexOf(" "));

            container.find(".value").empty().append(
                $.spawn("a").attr("title", version_full).text(version),
                $.spawn("a").addClass("a-on").text("on"),
                $.spawn("a").text(client.properties.client_platform)
            );

            const container_timestamp = container.find(".container-tooltip");

            let timestamp = -1;
            version_full.replace(/\[build: ?([0-9]+)]/gmi, (group, ts) => {
                timestamp = parseInt(ts);
                return "";
            });
            if(timestamp > 0) {
                container_timestamp.find(".value-timestamp").text(moment(timestamp * 1000).format('MMMM Do YYYY, h:mm:ss a'));
                container_timestamp.show();
            } else {
                container_timestamp.hide();
            }
        }

        /* Country */
        {
            const container = tag.find(".property-country");
            container.find(".value").empty().append(
                $.spawn("div").addClass("country flag-" + client.properties.client_country.toLowerCase()),
                $.spawn("a").text(i18n.country_name(client.properties.client_country, tr("Unknown")))
            );
        }

        /* IP Address */
        {
            const container = tag.find(".property-ip");
            const value = container.find(".value a");
            value.text(tr("loading..."));

            container.find(".button-copy").on('click', event => {
                copy_to_clipboard(value.text());
                createInfoModal(tr("Client IP copied"), tr("The client IP has been copied to your clipboard!")).open();
            });

            callbacks.push(info => {
                value.text(info.connection_client_ip ? (info.connection_client_ip + ":" + info.connection_client_port) : tr("Hidden"));
            });
        }

        /* first connected */
        {
            const container = tag.find(".property-first-connected");

            container.find(".value a").text(tr("loading..."));
            client.updateClientVariables().then(() => {
                container.find(".value a").text(moment(client.properties.client_created * 1000).format('MMMM Do YYYY, h:mm:ss a'));
            }).catch(error => {
                container.find(".value a").text(tr("error"));
            });
        }

        /* connect count */
        {
            const container = tag.find(".property-connect-count");

            container.find(".value a").text(tr("loading..."));
            client.updateClientVariables().then(() => {
                container.find(".value a").text(client.properties.client_totalconnections);
            }).catch(error => {
                container.find(".value a").text(tr("error"));
            });
        }

        /* Online since */
        {
            const container = tag.find(".property-online-since");

            const node = container.find(".value a")[0];
            if(node) {
                const update = () => {
                    node.innerText = format_time(client.calculateOnlineTime() * 1000, tr("0 Seconds"));
                };

                callbacks.push(update); /* keep it in sync with all other updates. Else it looks wired */
                update();
            }
        }

        /* Idle time */
        {
            const container = tag.find(".property-idle-time");
            const node = container.find(".value a")[0];
            if(node) {
                callbacks.push(info => {
                    node.innerText = format_time(info.connection_idle_time, tr("Currently active"));
                });
                node.innerText = tr("loading...");
            }
        }

        /* ping */
        {
            const container = tag.find(".property-ping");
            const node = container.find(".value a")[0];

            if(node) {
                callbacks.push(info => {
                    if(info.connection_ping >= 0)
                        node.innerText = info.connection_ping.toFixed(0) + "ms ± " + info.connection_ping_deviation.toFixed(2) + "ms";
                    else if(info.connection_ping == -1 && info.connection_ping_deviation == -1)
                        node.innerText = tr("Not calculated");
                    else
                        node.innerText = tr("loading...");
                });
                node.innerText = tr("loading...");
            }
        }
    }

    function apply_groups(client: ClientEntry, tag: JQuery, modal: Modal, callbacks: InfoUpdateCallback[]) {
        /* server groups */
        {
            const container_entries = tag.find(".entries");
            const container_empty = tag.find(".container-default-groups");

            const update_groups = () => {
                container_entries.empty();
                container_empty.show();

                for(const group_id of client.assignedServerGroupIds()) {
                    if(group_id == client.channelTree.server.properties.virtualserver_default_server_group)
                        continue;

                    const group = client.channelTree.client.groups.serverGroup(group_id);
                    if(!group) continue; //This shall never happen!

                    container_empty.hide();
                    container_entries.append($.spawn("div").addClass("entry").append(
                        client.channelTree.client.fileManager.icons.generateTag(group.properties.iconid),
                        $.spawn("a").addClass("name").text(group.name + " (" + group.id + ")"),
                        $.spawn("div").addClass("button-delete").append(
                            $.spawn("div").addClass("icon_em client-delete").attr("title", tr("Delete group")).on('click', event => {
                                client.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                                    sgid: group.id,
                                    cldbid: client.properties.client_database_id
                                }).then(result => update_groups());
                            })
                        ).toggleClass("visible",
                            client.channelTree.client.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MEMBER_REMOVE_POWER).granted(group.requiredMemberRemovePower) ||
                            client.clientId() == client.channelTree.client.getClientId() && client.channelTree.client.permissions.neededPermission(PermissionType.I_SERVER_GROUP_SELF_REMOVE_POWER).granted(group.requiredMemberRemovePower)
                        )
                    ))
                }
            };

            tag.find(".button-group-add").on('click', () => client.open_assignment_modal());

            update_groups();
        }
    }

    function apply_packets(client: ClientEntry, tag: JQuery, modal: Modal, callbacks: InfoUpdateCallback[]) {

        /* Packet Loss */
        {
            const container = tag.find(".statistic-packet-loss");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                callbacks.push(info => {
                    node_downstream.innerText = info.connection_server2client_packetloss_control < 0 ? tr("Not calculated") : (info.connection_server2client_packetloss_control || 0).toFixed();
                });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                callbacks.push(info => {
                    node_upstream.innerText = info.connection_client2server_packetloss_total < 0 ? tr("Not calculated") : (info.connection_client2server_packetloss_total || 0).toFixed();
                });
                node_upstream.innerText = tr("loading...");
            }
        }

        /* Packets transmitted */
        {
            const container = tag.find(".statistic-transmitted-packets");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                callbacks.push(info => {
                    let packets = 0;
                    packets += info.connection_packets_received_speech > 0 ? info.connection_packets_received_speech : 0;
                    packets += info.connection_packets_received_control > 0 ? info.connection_packets_received_control : 0;
                    packets += info.connection_packets_received_keepalive > 0 ? info.connection_packets_received_keepalive : 0;
                    if(packets == 0 && info.connection_packets_received_keepalive == -1)
                        node_downstream.innerText = tr("Not calculated");
                    else
                        node_downstream.innerText = MessageHelper.format_number(packets, {unit: "Packets"});
                });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                callbacks.push(info => {
                    let packets = 0;
                    packets += info.connection_packets_sent_speech > 0 ? info.connection_packets_sent_speech : 0;
                    packets += info.connection_packets_sent_control > 0 ? info.connection_packets_sent_control : 0;
                    packets += info.connection_packets_sent_keepalive > 0 ? info.connection_packets_sent_keepalive : 0;
                    if(packets == 0 && info.connection_packets_sent_keepalive == -1)
                        node_upstream.innerText = tr("Not calculated");
                    else
                        node_upstream.innerText = MessageHelper.format_number(packets, {unit: "Packets"});
                });
                node_upstream.innerText = tr("loading...");
            }
        }

        /* Bytes transmitted */
        {
            const container = tag.find(".statistic-transmitted-bytes");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bytes_received_speech > 0 ? info.connection_bytes_received_speech : 0;
                    bytes += info.connection_bytes_received_control > 0 ? info.connection_bytes_received_control : 0;
                    bytes += info.connection_bytes_received_keepalive > 0 ? info.connection_bytes_received_keepalive : 0;
                    if(bytes == 0 && info.connection_bytes_received_keepalive == -1)
                        node_downstream.innerText = tr("Not calculated");
                    else
                        node_downstream.innerText = MessageHelper.network.format_bytes(bytes);
                });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bytes_sent_speech > 0 ? info.connection_bytes_sent_speech : 0;
                    bytes += info.connection_bytes_sent_control > 0 ? info.connection_bytes_sent_control : 0;
                    bytes += info.connection_bytes_sent_keepalive > 0 ? info.connection_bytes_sent_keepalive : 0;
                    if(bytes == 0 && info.connection_bytes_sent_keepalive == -1)
                        node_upstream.innerText = tr("Not calculated");
                    else
                        node_upstream.innerText = MessageHelper.network.format_bytes(bytes);
                });
                node_upstream.innerText = tr("loading...");
            }
        }

        /* Bandwidth second */
        {
            const container = tag.find(".statistic-bandwidth-second");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bandwidth_received_last_second_speech > 0 ? info.connection_bandwidth_received_last_second_speech : 0;
                    bytes += info.connection_bandwidth_received_last_second_control > 0 ? info.connection_bandwidth_received_last_second_control : 0;
                    bytes += info.connection_bandwidth_received_last_second_keepalive > 0 ? info.connection_bandwidth_received_last_second_keepalive : 0;
                    if(bytes == 0 && info.connection_bandwidth_received_last_second_keepalive == -1)
                        node_downstream.innerText = tr("Not calculated");
                    else
                        node_downstream.innerText = MessageHelper.network.format_bytes(bytes, {time: "s"});
            });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bandwidth_sent_last_second_speech > 0 ? info.connection_bandwidth_sent_last_second_speech : 0;
                    bytes += info.connection_bandwidth_sent_last_second_control > 0 ? info.connection_bandwidth_sent_last_second_control : 0;
                    bytes += info.connection_bandwidth_sent_last_second_keepalive > 0 ? info.connection_bandwidth_sent_last_second_keepalive : 0;
                    if(bytes == 0 && info.connection_bandwidth_sent_last_second_keepalive == -1)
                        node_upstream.innerText = tr("Not calculated");
                    else
                        node_upstream.innerText = MessageHelper.network.format_bytes(bytes, {time: "s"});
                });
                node_upstream.innerText = tr("loading...");
            }
        }

        /* Bandwidth minute */
        {
            const container = tag.find(".statistic-bandwidth-minute");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bandwidth_received_last_minute_speech > 0 ? info.connection_bandwidth_received_last_minute_speech : 0;
                    bytes += info.connection_bandwidth_received_last_minute_control > 0 ? info.connection_bandwidth_received_last_minute_control : 0;
                    bytes += info.connection_bandwidth_received_last_minute_keepalive > 0 ? info.connection_bandwidth_received_last_minute_keepalive : 0;
                    if(bytes == 0 && info.connection_bandwidth_received_last_minute_keepalive == -1)
                        node_downstream.innerText = tr("Not calculated");
                    else
                        node_downstream.innerText = MessageHelper.network.format_bytes(bytes, {time: "s"});
                });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                callbacks.push(info => {
                    let bytes = 0;
                    bytes += info.connection_bandwidth_sent_last_minute_speech > 0 ? info.connection_bandwidth_sent_last_minute_speech : 0;
                    bytes += info.connection_bandwidth_sent_last_minute_control > 0 ? info.connection_bandwidth_sent_last_minute_control : 0;
                    bytes += info.connection_bandwidth_sent_last_minute_keepalive > 0 ? info.connection_bandwidth_sent_last_minute_keepalive : 0;
                    if(bytes == 0 && info.connection_bandwidth_sent_last_minute_keepalive == -1)
                        node_upstream.innerText = tr("Not calculated");
                    else
                        node_upstream.innerText = MessageHelper.network.format_bytes(bytes, {time: "s"});
                });
                node_upstream.innerText = tr("loading...");
            }
        }

        /* quota */
        {
            const container = tag.find(".statistic-quota");
            const node_downstream = container.find(".downstream .value")[0];
            const node_upstream = container.find(".upstream .value")[0];

            if(node_downstream) {
                client.updateClientVariables().then(info => {
                    //TODO: Test for own client info and if so then show the max quota (needed permission)
                    node_downstream.innerText = MessageHelper.network.format_bytes(client.properties.client_month_bytes_downloaded, {exact: false});
                });
                node_downstream.innerText = tr("loading...");
            }

            if(node_upstream) {
                client.updateClientVariables().then(info => {
                    //TODO: Test for own client info and if so then show the max quota (needed permission)
                    node_upstream.innerText = MessageHelper.network.format_bytes(client.properties.client_month_bytes_uploaded, {exact: false});
                });
                node_upstream.innerText = tr("loading...");
            }
        }
    }
}