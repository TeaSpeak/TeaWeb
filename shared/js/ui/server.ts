import {ChannelTree} from "tc-shared/ui/view";
import {Settings, settings} from "tc-shared/settings";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import * as log from "tc-shared/log";
import {LogCategory, LogType} from "tc-shared/log";
import {Sound} from "tc-shared/sound/Sounds";
import * as bookmarks from "tc-shared/bookmarks";
import {spawnInviteEditor} from "tc-shared/ui/modal/ModalInvite";
import {openServerInfo} from "tc-shared/ui/modal/ModalServerInfo";
import {createServerModal} from "tc-shared/ui/modal/ModalServerEdit";
import {spawnIconSelect} from "tc-shared/ui/modal/ModalIconSelect";
import {spawnAvatarList} from "tc-shared/ui/modal/ModalAvatarList";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import {connection_log} from "tc-shared/ui/modal/ModalConnect";
import * as top_menu from "./frames/MenuBar";
import {control_bar_instance} from "tc-shared/ui/frames/control-bar";
import { ServerEntry as ServerEntryView } from "./tree/Server";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "tc-shared/ui/TreeEntry";

export class ServerProperties {
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

export interface ServerConnectionInfo {
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

export interface ServerAddress {
    host: string;
    port: number;
}

export interface ServerEvents extends ChannelTreeEntryEvents {
    notify_properties_updated: {
        updated_properties: {[Key in keyof ServerProperties]: ServerProperties[Key]};
        server_properties: ServerProperties
    }
}

export class ServerEntry extends ChannelTreeEntry<ServerEvents> {
    remote_address: ServerAddress;
    channelTree: ChannelTree;
    properties: ServerProperties;

    readonly events: Registry<ServerEvents>;
    readonly view: React.Ref<ServerEntryView>;

    private info_request_promise: Promise<void> = undefined;
    private info_request_promise_resolve: any = undefined;
    private info_request_promise_reject: any = undefined;

    private _info_connection_promise: Promise<ServerConnectionInfo>;
    private _info_connection_promise_timestamp: number;
    private _info_connection_promise_resolve: any;
    private _info_connection_promise_reject: any;

    lastInfoRequest: number = 0;
    nextInfoRequest: number = 0;
    private _destroyed = false;

    constructor(tree, name, address: ServerAddress) {
        super();

        this.events = new Registry<ServerEvents>();
        this.view = React.createRef();

        this.properties = new ServerProperties();
        this.channelTree = tree;
        this.remote_address = Object.assign({}, address); /* copy the address because it might get changed due to the DNS resolve */
        this.properties.virtualserver_name = name;
    }

    destroy() {
        this._destroyed = true;
        this.info_request_promise = undefined;
        this.info_request_promise_resolve = undefined;
        this.info_request_promise_reject = undefined;

        this.channelTree = undefined;
        this.remote_address = undefined;
    }

    protected onSelect(singleSelect: boolean) {
        super.onSelect(singleSelect);
        if(!singleSelect) return;

        if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)) {
            const sidebar = this.channelTree.client.side_bar;
            sidebar.channel_conversations().findOrCreateConversation(0);
            sidebar.channel_conversations().setSelectedConversation(0);
            sidebar.show_channel_conversations();
        }
    }

    contextMenuItems() : contextmenu.MenuEntry[] {
        return [
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Show server info"),
                callback: () => {
                    openServerInfo(this);
                },
                icon_class: "client-about"
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-invite_buddy",
                name: tr("Invite buddy"),
                callback: () => spawnInviteEditor(this.channelTree.client)
            }, {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_switch",
                name: tr("Join server text channel"),
                callback: () => {
                    this.channelTree.client.side_bar.channel_conversations().setSelectedConversation(0);
                    this.channelTree.client.side_bar.show_channel_conversations();
                },
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-virtualserver_edit",
                name: tr("Edit"),
                callback: () => {
                    createServerModal(this, properties => {
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
                callback: () => spawnIconSelect(this.channelTree.client)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: 'client-iconsview',
                name: tr("View avatars"),
                visible: false, //TODO: Enable again as soon the new design is finished
                callback: () => spawnAvatarList(this.channelTree.client)
            },
            {
                type: contextmenu.MenuEntryType.HR,
                name: ''
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_collapse_all",
                name: tr("Collapse all channels"),
                callback: () => this.channelTree.collapse_channels()
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-channel_expand_all",
                name: tr("Expend all channels"),
                callback: () => this.channelTree.expand_channels()
            },
        ];
    }

    spawnContextMenu(x: number, y: number, on_close: () => void = () => {}) {
        contextmenu.spawn_context_menu(x, y, ...this.contextMenuItems(),
            contextmenu.Entry.CLOSE(on_close)
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

        let update_bannner = false, update_button = false, update_bookmarks = false;
        for(let variable of variables) {
            JSON.map_field_to(this.properties, variable.value, variable.key);

            if(variable.key == "virtualserver_name") {
                this.channelTree.client.tag_connection_handler.find(".server-name").text(variable.value);
                server_connections.update_ui();
            } else if(variable.key == "virtualserver_icon_id") {
                /* For more detail lookup client::updateVariables and client_icon_id!
                 * ATTENTION: This is required!
                 */
                this.properties.virtualserver_icon_id = variable.value as any >>> 0;
                update_bookmarks = true;
            } else if(variable.key.indexOf('hostbanner') != -1) {
                update_bannner = true;
            } else if(variable.key.indexOf('hostbutton') != -1) {
                update_button = true;
            }
        }
        {
            let properties = {};
            for(const property of variables)
                properties[property.key] = this.properties[property.key];
            this.events.fire("notify_properties_updated", { updated_properties: properties as any, server_properties: this.properties });
        }
        if(update_bookmarks) {
            const bmarks = bookmarks.bookmarks_flat()
                .filter(e => e.server_properties.server_address === this.remote_address.host && e.server_properties.server_port == this.remote_address.port)
                .filter(e => e.last_icon_id !== this.properties.virtualserver_icon_id || e.last_icon_server_id !== this.properties.virtualserver_unique_identifier);
            if(bmarks.length > 0) {
                bmarks.forEach(e => {
                    e.last_icon_id = this.properties.virtualserver_icon_id;
                    e.last_icon_server_id = this.properties.virtualserver_unique_identifier;
                });
                bookmarks.save_bookmark();
                top_menu.rebuild_bookmarks();

                control_bar_instance()?.events().fire("update_state", { state: "bookmarks" });
            }
        }

        if(update_bannner)
            this.channelTree.client.hostbanner.update();

        if(update_button)
            control_bar_instance()?.events().fire("server_updated", { handler: this.channelTree.client, category: "hostbanner" });

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
            server_unique_id: this.properties.virtualserver_unique_identifier,

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

    reset() {
        this.properties = new ServerProperties();
        this._info_connection_promise = undefined;
        this._info_connection_promise_reject = undefined;
        this._info_connection_promise_resolve = undefined;
        this._info_connection_promise_timestamp = undefined;
    }
}