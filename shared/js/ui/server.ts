/// <reference path="channel.ts" />
/// <reference path="modal/ModalServerEdit.ts" />

class ServerProperties {
    virtualserver_host: string = "";
    virtualserver_port: number = 0;

    virtualserver_name: string = "";
    virtualserver_name_phonetic: string = "";
    virtualserver_icon_id: number = 0;
    virtualserver_version: string = "unknown";
    virtualserver_platform: string = "unknown";
    virtualserver_unique_identifier: string = "";

    virtualserver_clientsonline: number = 0;
    virtualserver_queryclientsonline: number = 0;
    virtualserver_channelsonline: number = 0;
    virtualserver_uptime: number = 0;
    virtualserver_created: number = 0;
    virtualserver_maxclients: number = 0;
    virtualserver_reserved_slots: number = 0;

    virtualserver_password: string = "";
    virtualserver_flag_password: boolean = false;

    virtualserver_ask_for_privilegekey: boolean = false;

    virtualserver_welcomemessage: string = "";

    virtualserver_hostmessage: string = "";
    virtualserver_hostmessage_mode: number = 0;

    virtualserver_hostbanner_url: string = "";
    virtualserver_hostbanner_gfx_url: string = "";
    virtualserver_hostbanner_gfx_interval: number = 0;
    virtualserver_hostbanner_mode: number = 0;

    virtualserver_hostbutton_tooltip: string = "";
    virtualserver_hostbutton_url: string = "";
    virtualserver_hostbutton_gfx_url: string = "";

    virtualserver_codec_encryption_mode: number = 0;

    virtualserver_default_music_group: number = 0;
    virtualserver_default_server_group: number = 0;
    virtualserver_default_channel_group: number = 0;
    virtualserver_default_channel_admin_group: number = 0;

    //Special requested properties
    virtualserver_default_client_description: string = "";
    virtualserver_default_channel_description: string = "";
    virtualserver_default_channel_topic: string = "";

    virtualserver_antiflood_points_tick_reduce: number = 0;
    virtualserver_antiflood_points_needed_command_block: number = 0;
    virtualserver_antiflood_points_needed_ip_block: number = 0;

    virtualserver_country_code: string = "XX";

    virtualserver_complain_autoban_count: number = 0;
    virtualserver_complain_autoban_time: number = 0;
    virtualserver_complain_remove_time: number = 0;

    virtualserver_needed_identity_security_level: number = 8;
    virtualserver_weblist_enabled: boolean = false;
    virtualserver_min_clients_in_channel_before_forced_silence: number = 0;
    virtualserver_channel_temp_delete_delay_default: number = 60;
    virtualserver_priority_speaker_dimm_modificator: number = -18;

    virtualserver_max_upload_total_bandwidth: number = 0;
    virtualserver_upload_quota: number = 0;
    virtualserver_max_download_total_bandwidth: number = 0;
    virtualserver_download_quota: number = 0;

    virtualserver_month_bytes_downloaded: number = 0;
    virtualserver_month_bytes_uploaded: number = 0;
    virtualserver_total_bytes_downloaded: number = 0;
    virtualserver_total_bytes_uploaded: number = 0;
}

interface ServerConnectionInfo {
    connection_filetransfer_bandwidth_sent: number;
    connection_filetransfer_bandwidth_received: number;

    connection_filetransfer_bytes_sent_total: number;
    connection_filetransfer_bytes_received_total: number;

    connection_filetransfer_bytes_sent_month: number;
    connection_filetransfer_bytes_received_month: number;

    connection_packets_sent_total: number;
    connection_bytes_sent_total: number;
    connection_packets_received_total: number;
    connection_bytes_received_total: number;

    connection_bandwidth_sent_last_second_total: number;
    connection_bandwidth_sent_last_minute_total: number;
    connection_bandwidth_received_last_second_total: number;
    connection_bandwidth_received_last_minute_total: number;

    connection_connected_time: number;
    connection_packetloss_total: number;
    connection_ping: number;
}

interface ServerAddress {
    host: string;
    port: number;
}

class ServerEntry {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;

    private info_request_promise: Promise<void> = undefined;
    private info_request_promise_resolve: any = undefined;
    private info_request_promise_reject: any = undefined;

    private _info_connection_promise: Promise<ServerConnectionInfo>;
    private _info_connection_promise_timestamp: number;
    private _info_connection_promise_resolve: any;
    private _info_connection_promise_reject: any;

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _htmlTag: JQuery<HTMLElement>;
    private _destroyed = false;

    constructor(tree, name, address: ServerAddress) {
        this.properties = new ServerProperties();
        this.channelTree = tree;
        this.remote_address = Object.assign({}, address); /* close the address because it might get changed due to the DNS resolve */
        this.properties.virtualserver_name = name;
    }

    get htmlTag() {
        if(this._destroyed) throw "destoryed";
        if(this._htmlTag) return this._htmlTag;

        let tag = $.spawn("div").addClass("tree-entry server");

        /* unread marker */
        {
            tag.append(
                $.spawn("div")
                    .addClass("marker-text-unread hidden")
                    .attr("conversation", 0)
            );
        }

        tag.append(
            $.spawn("div")
            .addClass("server_type icon client-server_green")
        );

        tag.append(
            $.spawn("div")
            .addClass("name")
            .text(this.properties.virtualserver_name)
        );

        tag.append(
            $.spawn("div")
            .addClass("icon_property icon_empty")
        );

        return this._htmlTag = tag;
    }

    destroy() {
        this._destroyed = true;
        if(this._htmlTag) {
            this._htmlTag.remove();
            this._htmlTag = undefined;
        }
        this.info_request_promise = undefined;
        this.info_request_promise_resolve = undefined;
        this.info_request_promise_reject = undefined;

        this.channelTree = undefined;
        this.remote_address = undefined;
    }

    initializeListener(){
        this._htmlTag.on('click' ,() => {
            this.channelTree.onSelect(this);
            this.updateProperties(); /* just prepare to show some server info */
        });

        if(!settings.static(Settings.KEY_DISABLE_CONTEXT_MENU, false)) {
            this.htmlTag.on("contextmenu", (event) => {
                event.preventDefault();
                if($.isArray(this.channelTree.currently_selected)) { //Multiselect
                    (this.channelTree.currently_selected_context_callback || ((_) => null))(event);
                    return;
                }

                this.channelTree.onSelect(this, true);
                this.spawnContextMenu(event.pageX, event.pageY, () => { this.channelTree.onSelect(undefined, true); });
            });
        }
    }

    spawnContextMenu(x: number, y: number, on_close: () => void = () => {}) {
        let trigger_close = true;
        contextmenu.spawn_context_menu(x, y, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show server info"),
                callback: () => {
                    trigger_close = false;
                    Modals.openServerInfo(this);
                },
                icon_class: "client-about"
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-invite_buddy",
                name: tr("Invite buddy"),
                callback: () => Modals.spawnInviteEditor(this.channelTree.client)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: tr("Join server text channel"),
                callback: () => {
                    this.channelTree.client.side_bar.channel_conversations().set_current_channel(0);
                    this.channelTree.client.side_bar.show_channel_conversations();
                },
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-virtualserver_edit",
                name: tr("Edit"),
                callback: () => {
                    Modals.createServerModal(this, properties => {
                        log.info(LogCategory.SERVER, tr("Changing server properties %o"), properties);
                        console.log(tr("Changed properties: %o"), properties);
                        if (properties) {
                            if(Object.keys(properties)) {
                                return this.channelTree.client.serverConnection.send_command("serveredit", properties).then(() => {
                                    this.channelTree.client.sound.play(Sound.SERVER_EDITED_SELF);
                                });
                            }
                        }
                        return Promise.resolve();
                    });
                }
            }, {
                type: contextmenu.MenuEntryType.HR,
                visible: true,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-iconviewer",
                name: tr("View icons"),
                callback: () => Modals.spawnIconSelect(this.channelTree.client)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: 'client-iconsview',
                name: tr("View avatars"),
                visible: false, //TODO: Enable again as soon the new design is finished
                callback: () => Modals.spawnAvatarList(this.channelTree.client)
            },
            contextmenu.Entry.CLOSE(() => trigger_close ? on_close() : {})
        );
    }

    updateVariables(is_self_notify: boolean, ...variables: {key: string, value: string}[]) {
        let group = log.group(log.LogType.DEBUG, LogCategory.SERVER, tr("Update properties (%i)"), variables.length);

        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Server update properties", entries);
        }

        let update_bannner = false, update_button = false;
        for(let variable of variables) {
            JSON.map_field_to(this.properties, variable.value, variable.key);

            if(variable.key == "virtualserver_name") {
                this.htmlTag.find(".name").text(variable.value);
                this.channelTree.client.tag_connection_handler.find(".server-name").text(variable.value);
                server_connections.update_ui();
            } else if(variable.key == "virtualserver_icon_id") {
                /* For more detail lookup client::updateVariables and client_icon_id!
                 * ATTENTION: This is required!
                 */
                this.properties.virtualserver_icon_id = variable.value as any >>> 0;

                const bmarks = bookmarks.bookmarks_flat()
                    .filter(e => e.server_properties.server_address === this.remote_address.host && e.server_properties.server_port == this.remote_address.port)
                    .filter(e => e.last_icon_id !== this.properties.virtualserver_icon_id);
                if(bmarks.length > 0) {
                    bmarks.forEach(e => {
                        e.last_icon_id = this.properties.virtualserver_icon_id;
                    });
                    bookmarks.save_bookmark();
                    top_menu.rebuild_bookmarks();
                    control_bar.update_bookmarks();
                }

                if(this.channelTree.client.fileManager && this.channelTree.client.fileManager.icons)
                    this.htmlTag.find(".icon_property").replaceWith(this.channelTree.client.fileManager.icons.generateTag(this.properties.virtualserver_icon_id).addClass("icon_property"));
            } else if(variable.key.indexOf('hostbanner') != -1) {
                update_bannner = true;
            } else if(variable.key.indexOf('hostbutton') != -1) {
                update_button = true;
            }
        }
        if(update_bannner)
            this.channelTree.client.hostbanner.update();
        if(update_button)
            if(control_bar.current_connection_handler() === this.channelTree.client)
                control_bar.apply_server_hostbutton();

        group.end();
        if(is_self_notify && this.info_request_promise_resolve) {
            this.info_request_promise_resolve();
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        }

        connection_log.update_address_info({
            hostname: this.remote_address.host,
            port: this.remote_address.port
        }, {
            clients_online: this.properties.virtualserver_clientsonline,
            clients_total: this.properties.virtualserver_maxclients,
            country: this.properties.virtualserver_country_code,
            flag_password: this.properties.virtualserver_flag_password,
            name: this.properties.virtualserver_name,
            icon_id: this.properties.virtualserver_icon_id,

            password_hash: undefined /* we've here no clue */
        });
    }

    /* this result !must! be cached for at least a second */
    updateProperties() : Promise<void> {
        if(this.info_request_promise && Date.now() - this.lastInfoRequest < 1000) return this.info_request_promise;
        this.lastInfoRequest = Date.now();
        this.nextInfoRequest =  this.lastInfoRequest + 10 * 1000;
        this.channelTree.client.serverConnection.send_command("servergetvariables").catch(error => {
            this.info_request_promise_reject(error);
            this.info_request_promise = undefined;
            this.info_request_promise_reject = undefined;
            this.info_request_promise_resolve = undefined;
        });

        return this.info_request_promise = new Promise<void>((resolve, reject) => {
            this.info_request_promise_reject = reject;
            this.info_request_promise_resolve = resolve;
        });
    }

    /* max 1s ago, so we could update every second */
    request_connection_info() : Promise<ServerConnectionInfo> {
        if(Date.now() - 900 < this._info_connection_promise_timestamp && this._info_connection_promise)
            return this._info_connection_promise;

        if(this._info_connection_promise_reject)
            this._info_connection_promise_resolve("timeout");

        let _local_reject; /* to ensure we're using the right resolve! */
        this._info_connection_promise = new Promise<ServerConnectionInfo>((resolve, reject) => {
            this._info_connection_promise_resolve = resolve;
            this._info_connection_promise_reject = reject;
            _local_reject = reject;
        });

        this._info_connection_promise_timestamp = Date.now();
        this.channelTree.client.serverConnection.send_command("serverrequestconnectioninfo", {}, {process_result: false}).catch(error => _local_reject(error));
        return this._info_connection_promise;
    }

    set_connection_info(info: ServerConnectionInfo) {
        if(!this._info_connection_promise_resolve)
            return;
        this._info_connection_promise_resolve(info);
        this._info_connection_promise_resolve = undefined;
        this._info_connection_promise_reject = undefined;
    }

    shouldUpdateProperties() : boolean {
        return this.nextInfoRequest < Date.now();
    }

    calculateUptime() : number {
        if(this.properties.virtualserver_uptime == 0 || this.lastInfoRequest == 0) return this.properties.virtualserver_uptime;
        return this.properties.virtualserver_uptime + (new Date().getTime() - this.lastInfoRequest) / 1000;
    }

    set flag_text_unread(flag: boolean) {
        this._htmlTag.find(".marker-text-unread").toggleClass("hidden", !flag);
    }
}