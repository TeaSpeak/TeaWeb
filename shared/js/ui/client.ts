import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {Registry} from "tc-shared/events";
import {ChannelTree} from "tc-shared/ui/view";
import * as log from "tc-shared/log";
import {LogCategory, LogType} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {Sound} from "tc-shared/sound/Sounds";
import {Group, GroupManager, GroupTarget, GroupType} from "tc-shared/permission/GroupManager";
import PermissionType from "tc-shared/permission/PermissionType";
import {createErrorModal, createInputModal} from "tc-shared/ui/elements/Modal";
import * as htmltags from "tc-shared/ui/htmltags";
import * as server_log from "tc-shared/ui/frames/server_log";
import {CommandResult, PlaylistSong} from "tc-shared/connection/ServerConnectionDeclaration";
import {ChannelEntry} from "tc-shared/ui/channel";
import {ConnectionHandler, ViewReasonId} from "tc-shared/ConnectionHandler";
import {voice} from "tc-shared/connection/ConnectionBase";
import VoiceClient = voice.VoiceClient;
import {spawnPermissionEdit} from "tc-shared/ui/modal/permission/ModalPermissionEdit";
import {createServerGroupAssignmentModal} from "tc-shared/ui/modal/ModalGroupAssignment";
import {openClientInfo} from "tc-shared/ui/modal/ModalClientInfo";
import {spawnBanClient} from "tc-shared/ui/modal/ModalBanClient";
import {spawnChangeVolume} from "tc-shared/ui/modal/ModalChangeVolume";
import {spawnChangeLatency} from "tc-shared/ui/modal/ModalChangeLatency";
import {spawnPlaylistEdit} from "tc-shared/ui/modal/ModalPlaylistEdit";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import * as hex from "tc-shared/crypto/hex";
import { ClientEntry as ClientEntryView } from "./tree/Client";
import * as React from "react";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "tc-shared/ui/TreeEntry";

export enum ClientType {
    CLIENT_VOICE,
    CLIENT_QUERY,
    CLIENT_INTERNAL,
    CLIENT_WEB,
    CLIENT_MUSIC,
    CLIENT_UNDEFINED
}

export class ClientProperties {
    client_type: ClientType = ClientType.CLIENT_VOICE; //TeamSpeaks type
    client_type_exact: ClientType = ClientType.CLIENT_VOICE;

    client_database_id: number = 0;
    client_version: string = "";
    client_platform: string = "";
    client_nickname: string = "unknown";
    client_unique_identifier: string = "unknown";
    client_description: string = "";
    client_servergroups: string = "";

    client_channel_group_id: number = 0;
    client_lastconnected: number = 0;
    client_created: number = 0;
    client_totalconnections: number = 0;

    client_flag_avatar: string = "";
    client_icon_id: number = 0;

    client_away_message: string = "";
    client_away: boolean = false;

    client_country: string = "";

    client_input_hardware: boolean = false;
    client_output_hardware: boolean = false;
    client_input_muted: boolean = false;
    client_output_muted: boolean = false;
    client_is_channel_commander: boolean = false;

    client_teaforo_id: number = 0;
    client_teaforo_name: string = "";
    client_teaforo_flags: number = 0; /* 0x01 := Banned | 0x02 := Stuff | 0x04 := Premium */


    /* not updated in view! */
    client_month_bytes_uploaded: number = 0;
    client_month_bytes_downloaded: number = 0;
    client_total_bytes_uploaded: number = 0;
    client_total_bytes_downloaded: number = 0;

    client_talk_power: number = 0;
    client_is_priority_speaker: boolean = false;
}

export class ClientConnectionInfo {
    connection_bandwidth_received_last_minute_control: number = -1;
    connection_bandwidth_received_last_minute_keepalive: number = -1;
    connection_bandwidth_received_last_minute_speech: number = -1;
    connection_bandwidth_received_last_second_control: number = -1;
    connection_bandwidth_received_last_second_keepalive: number = -1;
    connection_bandwidth_received_last_second_speech: number = -1;

    connection_bandwidth_sent_last_minute_control: number = -1;
    connection_bandwidth_sent_last_minute_keepalive: number = -1;
    connection_bandwidth_sent_last_minute_speech: number = -1;
    connection_bandwidth_sent_last_second_control: number = -1;
    connection_bandwidth_sent_last_second_keepalive: number = -1;
    connection_bandwidth_sent_last_second_speech: number = -1;

    connection_bytes_received_control: number = -1;
    connection_bytes_received_keepalive: number = -1;
    connection_bytes_received_speech: number = -1;
    connection_bytes_sent_control: number = -1;
    connection_bytes_sent_keepalive: number = -1;
    connection_bytes_sent_speech: number = -1;

    connection_packets_received_control: number = -1;
    connection_packets_received_keepalive: number = -1;
    connection_packets_received_speech: number = -1;

    connection_packets_sent_control: number = -1;
    connection_packets_sent_keepalive: number = -1;
    connection_packets_sent_speech: number = -1;

    connection_ping: number = -1;
    connection_ping_deviation: number = -1;

    connection_server2client_packetloss_control: number = -1;
    connection_server2client_packetloss_keepalive: number = -1;
    connection_server2client_packetloss_speech: number = -1;
    connection_server2client_packetloss_total: number = -1;

    connection_client2server_packetloss_speech: number = -1;
    connection_client2server_packetloss_keepalive: number = -1;
    connection_client2server_packetloss_control: number = -1;
    connection_client2server_packetloss_total: number = -1;

    connection_filetransfer_bandwidth_sent: number = -1;
    connection_filetransfer_bandwidth_received: number = -1;

    connection_connected_time: number = -1;
    connection_idle_time: number = -1;
    connection_client_ip: string | undefined;
    connection_client_port: number = -1;
}

export interface ClientEvents extends ChannelTreeEntryEvents {
    "notify_enter_view": {},
    "notify_left_view": {},

    notify_properties_updated: {
        updated_properties: {[Key in keyof ClientProperties]: ClientProperties[Key]};
        client_properties: ClientProperties
    },
    notify_mute_state_change: { muted: boolean }
    notify_speak_state_change: { speaking: boolean }

    "music_status_update": {
        player_buffered_index: number,
        player_replay_index: number
    },
    "music_song_change": {
        "song": SongInfo
    },

    /* TODO: Move this out of the music bots interface? */
    "playlist_song_add": { song: PlaylistSong },
    "playlist_song_remove": { song_id: number },
    "playlist_song_reorder": { song_id: number, previous_song_id: number },
    "playlist_song_loaded": { song_id: number, success: boolean, error_msg?: string, metadata?: string },

}

export class ClientEntry extends ChannelTreeEntry<ClientEvents> {
    readonly events: Registry<ClientEvents>;
    readonly view: React.RefObject<ClientEntryView> = React.createRef<ClientEntryView>();

    protected _clientId: number;
    protected _channel: ChannelEntry;

    protected _properties: ClientProperties;
    protected lastVariableUpdate: number = 0;
    protected _speaking: boolean;
    protected _listener_initialized: boolean;

    protected _audio_handle: VoiceClient;
    protected _audio_volume: number;
    protected _audio_muted: boolean;

    private _info_variables_promise: Promise<void>;
    private _info_variables_promise_timestamp: number;

    private _info_connection_promise: Promise<ClientConnectionInfo>;
    private _info_connection_promise_timestamp: number;
    private _info_connection_promise_resolve: any;
    private _info_connection_promise_reject: any;

    channelTree: ChannelTree;

    constructor(clientId: number, clientName, properties: ClientProperties = new ClientProperties()) {
        super();
        this.events = new Registry<ClientEvents>();

        this._properties = properties;
        this._properties.client_nickname = clientName;
        this._clientId = clientId;
        this.channelTree = null;
        this._channel = null;
    }

    destroy() {
        if(this._audio_handle) {
            log.warn(LogCategory.AUDIO, tr("Destroying client with an active audio handle. This could cause memory leaks!"));
            try {
                this._audio_handle.abort_replay();
            } catch(error) {
                log.warn(LogCategory.AUDIO, tr("Failed to abort replay: %o"), error);
            }
            this._audio_handle.callback_playback = undefined;
            this._audio_handle.callback_stopped = undefined;
            this._audio_handle = undefined;
        }

        this._channel = undefined;
    }

    tree_unregistered() {
        this.channelTree = undefined;
        if(this._audio_handle) {
            try {
                this._audio_handle.abort_replay();
            } catch(error) {
                log.warn(LogCategory.AUDIO, tr("Failed to abort replay: %o"), error);
            }
            this._audio_handle.callback_playback = undefined;
            this._audio_handle.callback_stopped = undefined;
            this._audio_handle = undefined;
        }

        this._channel = undefined;
    }

    set_audio_handle(handle: VoiceClient) {
        if(this._audio_handle === handle)
            return;

        if(this._audio_handle) {
            this._audio_handle.callback_playback = undefined;
            this._audio_handle.callback_stopped = undefined;
        }
        //TODO may ensure that the id is the same?
        this._audio_handle = handle;
        if(!handle) {
            this.speaking = false;
            return;
        }

        handle.callback_playback = () => this.speaking = true;
        handle.callback_stopped = () => this.speaking = false;
    }

    get_audio_handle() : VoiceClient {
        return this._audio_handle;
    }

    get properties() : ClientProperties {
        return this._properties;
    }

    currentChannel() : ChannelEntry { return this._channel; }
    clientNickName(){ return this.properties.client_nickname; }
    clientUid(){ return this.properties.client_unique_identifier; }
    clientId(){ return this._clientId; }

    is_muted() { return !!this._audio_muted; }
    set_muted(flag: boolean, force: boolean) {
        if(this._audio_muted === flag && !force)
            return;

        if(flag) {
            this.channelTree.client.serverConnection.send_command('clientmute', {
                clid: this.clientId()
            });
        } else if(this._audio_muted) {
            this.channelTree.client.serverConnection.send_command('clientunmute', {
                clid: this.clientId()
            });
        }
        this._audio_muted = flag;

        this.channelTree.client.settings.changeServer("mute_client_" + this.clientUid(), flag);
        if(this._audio_handle) {
            if(flag) {
                this._audio_handle.set_volume(0);
            } else {
                this._audio_handle.set_volume(this._audio_volume);
            }
        }

        this.events.fire("notify_mute_state_change", { muted: flag });
        for(const client of this.channelTree.clients) {
            if(client === this || client.properties.client_unique_identifier !== this.properties.client_unique_identifier)
                continue;
            client.set_muted(flag, false);
        }
    }

    protected initializeListener() {
        if(this._listener_initialized) return;
        this._listener_initialized = true;

        //FIXME: TODO!
        /*
        this.tag.on('mousedown', event => {
            if(event.which != 1) return; //Only the left button

            let clients = this.channelTree.currently_selected as (ClientEntry | ClientEntry[]);

            if(ppt.key_pressed(SpecialKey.SHIFT)) {
                if(clients != this && !($.isArray(clients) && clients.indexOf(this) != -1))
                    clients = $.isArray(clients) ? [...clients, this] : [clients, this];
            } else {
                clients = this;
            }

            this.channelTree.client_mover.activate(clients, target => {
                if(!target) return;

                for(const client of $.isArray(clients) ? clients : [clients]) {
                    if(target == client._channel) continue;

                    const source = client._channel;
                    const self = this.channelTree.client.getClient();
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: client.clientId(),
                        cid: target.getChannelId()
                    }).then(event => {
                        if(client.clientId() == this.channelTree.client.clientId)
                            this.channelTree.client.sound.play(Sound.CHANNEL_JOINED);
                        else if(target !== source && target != self.currentChannel())
                            this.channelTree.client.sound.play(Sound.USER_MOVED);
                    });
                }

                this.channelTree.onSelect();
            }, event);
        });
         */
    }

    protected onSelect(singleSelect: boolean) {
        super.onSelect(singleSelect);
        if(!singleSelect) return;

        if(settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT)) {
            if(this instanceof MusicClientEntry)
                this.channelTree.client.side_bar.show_music_player(this);
            else
                this.channelTree.client.side_bar.show_client_info(this);
        }
    }

    protected contextmenu_info() : contextmenu.MenuEntry[] {
        return [
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: this.properties.client_type_exact === ClientType.CLIENT_MUSIC ? tr("Show bot info") : tr("Show client info"),
                callback: () => {
                    this.channelTree.client.side_bar.show_client_info(this);
                },
                icon_class: "client-about",
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT)
            }, {
                callback: () => {},
                type: contextmenu.MenuEntryType.HR,
                name: "",
                visible: !settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT)
            }
        ]
    }

    protected assignment_context() : contextmenu.MenuEntry[] {
        let server_groups: contextmenu.MenuEntry[] = [];
        for(let group of this.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
            if(group.type != GroupType.NORMAL) continue;

            let entry: contextmenu.MenuEntry = {} as any;

            //TODO: May add the server group icon?
            entry.checkbox_checked = this.groupAssigned(group);
            entry.name = group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]";
            if(this.groupAssigned(group)) {
                entry.callback = () => {
                    this.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                        sgid: group.id,
                        cldbid: this.properties.client_database_id
                    });
                };
                entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
            } else {
                entry.callback = () => {
                    this.channelTree.client.serverConnection.send_command("servergroupaddclient", {
                        sgid: group.id,
                        cldbid: this.properties.client_database_id
                    });
                };
                entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_REMOVE_POWER).granted(group.requiredMemberAddPower);
            }
            entry.type = contextmenu.MenuEntryType.CHECKBOX;

            server_groups.push(entry);
        }

        let channel_groups: contextmenu.MenuEntry[] = [];
        for(let group of this.channelTree.client.groups.channelGroups.sort(GroupManager.sorter())) {
            if(group.type != GroupType.NORMAL) continue;

            let entry: contextmenu.MenuEntry = {} as any;

            //TODO: May add the channel group icon?
            entry.checkbox_checked = this.assignedChannelGroup() == group.id;
            entry.name = group.name + " [" + (group.properties.savedb ? "perm" : "tmp") + "]";
            entry.callback = () => {
                this.channelTree.client.serverConnection.send_command("setclientchannelgroup", {
                    cldbid: this.properties.client_database_id,
                    cgid: group.id,
                    cid: this.currentChannel().channelId
                });
            };
            entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
            entry.type = contextmenu.MenuEntryType.CHECKBOX;
            channel_groups.push(entry);
        }

        return [{
            type: contextmenu.MenuEntryType.SUB_MENU,
            icon_class: "client-permission_server_groups",
            name: tr("Set server group"),
            sub_menu: [
                {
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-permission_server_groups",
                    name: "Server groups dialog",
                    callback: () => this.open_assignment_modal()
                },
                contextmenu.Entry.HR(),
                ...server_groups
            ]
        },{
            type: contextmenu.MenuEntryType.SUB_MENU,
            icon_class: "client-permission_channel",
            name: tr("Set channel group"),
            sub_menu: [
                ...channel_groups
            ]
        },{
            type: contextmenu.MenuEntryType.SUB_MENU,
            icon_class: "client-permission_client",
            name: tr("Permissions"),
            sub_menu: [
                {
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-permission_client",
                    name: tr("Client permissions"),
                    callback: () => spawnPermissionEdit(this.channelTree.client, "clp", {unique_id: this.clientUid()}).open()
                },
                {
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-permission_client",
                    name: tr("Client channel permissions"),
                    callback: () => spawnPermissionEdit(this.channelTree.client, "clchp", {unique_id: this.clientUid(), channel_id: this._channel ? this._channel.channelId : undefined }).open()
                }
            ]
        }];
    }

    open_assignment_modal() {
        createServerGroupAssignmentModal(this, (groups, flag) => {
            if(groups.length == 0) return Promise.resolve(true);

            if(groups.length == 1) {
                if(flag) {
                    return this.channelTree.client.serverConnection.send_command("servergroupaddclient", {
                        sgid: groups[0],
                        cldbid: this.properties.client_database_id
                    }).then(result => true);
                } else
                    return this.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                        sgid: groups[0],
                        cldbid: this.properties.client_database_id
                    }).then(result => true);
            } else {
                const data = groups.map(e => { return {sgid: e}; });
                data[0]["cldbid"] = this.properties.client_database_id;

                if(flag) {
                    return this.channelTree.client.serverConnection.send_command("clientaddservergroup", data, {flagset: ["continueonerror"]}).then(result => true);
                } else
                    return this.channelTree.client.serverConnection.send_command("clientdelservergroup", data, {flagset: ["continueonerror"]}).then(result => true);
            }
        });
    }

    open_text_chat() {
        const chat = this.channelTree.client.side_bar;
        const conversation = chat.private_conversations().find_conversation({
            name: this.clientNickName(),
            client_id: this.clientId(),
            unique_id: this.clientUid()
        }, {
            attach: true,
            create: true
        });
        chat.private_conversations().set_selected_conversation(conversation);
        chat.show_private_conversations();
        chat.private_conversations().try_input_focus();
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        let trigger_close = true;
        contextmenu.spawn_context_menu(x, y,
            ...this.contextmenu_info(), {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-change_nickname",
                name:   (contextmenu.get_provider().html_format_enabled() ? "<b>" : "") +
                        tr("Open text chat") +
                        (contextmenu.get_provider().html_format_enabled() ? "</b>" : ""),
                callback: () => {
                    this.open_text_chat();
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-about",
                name: tr("Show client info"),
                callback: () => openClientInfo(this)
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-poke",
                name: tr("Poke client"),
                callback: () => {
                    createInputModal(tr("Poke client"), tr("Poke message:<br>"), text => true, result => {
                        if(typeof(result) === "string") {
                            //TODO tr
                            console.log("Poking client " + this.clientNickName() + " with message " + result);
                            this.channelTree.client.serverConnection.send_command("clientpoke", {
                                clid: this.clientId(),
                                msg: result
                            });

                        }
                    }, { width: 400, maxLength: 512 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-edit",
                name: tr("Change description"),
                callback: () => {
                    createInputModal(tr("Change client description"), tr("New description:<br>"), text => true, result => {
                        if(typeof(result) === "string") {
                            //TODO tr
                            console.log("Changing " + this.clientNickName() + "'s description to " + result);
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                }
            },
            contextmenu.Entry.HR(),
            ...this.assignment_context(),
            contextmenu.Entry.HR(), {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-move_client_to_own_channel",
                name: tr("Move client to your channel"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    });
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-kick_channel",
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            //TODO tr
                            console.log("Kicking client " + this.clientNickName() + " from channel with reason " + result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-kick_server",
                name: tr("Kick client fom server"),
                callback: () => {
                    createInputModal(tr("Kick client from server"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            //TODO tr
                            console.log("Kicking client " + this.clientNickName() + " from server with reason " + result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                reasonmsg: result
                            });

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-ban_client",
                name: tr("Ban client"),
                invalidPermission: !this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                callback: () => {
                    spawnBanClient(this.channelTree.client, [{
                        name: this.properties.client_nickname,
                        unique_id: this.properties.client_unique_identifier
                    }], (data) => {
                        this.channelTree.client.serverConnection.send_command("banclient", {
                            uid: this.properties.client_unique_identifier,
                            banreason: data.reason,
                            time: data.length
                        }, {
                            flagset: [data.no_ip ? "no-ip" : "", data.no_hwid ? "no-hardware-id" : "", data.no_name ? "no-nickname" : ""]
                        }).then(() => {
                            this.channelTree.client.sound.play(Sound.USER_BANNED);
                        });
                    });
                }
            },
            contextmenu.Entry.HR(),
            /*
            {
                type: MenuEntryType.ENTRY,
                icon: "client-kick_server",
                name: "Add group to client",
                invalidPermission: true, //!this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_BAN_MAX_BANTIME).granted(1),
                callback: () => {
                    Modals.spawnBanClient(this.properties.client_nickname, (duration, reason) => {
                        this.channelTree.client.serverConnection.send_command("banclient", {
                            uid: this.properties.client_unique_identifier,
                            banreason: reason,
                            time: duration
                        });
                    });
                }
            },
            MenuEntry.HR(),
            */
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-volume",
                name: tr("Change Volume"),
                callback: () => {
                    spawnChangeVolume(this, true, this._audio_volume, undefined, volume => {
                        this._audio_volume = volume;
                        this.channelTree.client.settings.changeServer("volume_client_" + this.clientUid(), volume);
                        if(this._audio_handle)
                            this._audio_handle.set_volume(volume);
                        //TODO: Update in info
                    });
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Change playback latency"),
                callback: () => {
                    spawnChangeLatency(this, this._audio_handle.latency_settings(), () => {
                        this._audio_handle.reset_latency_settings();
                        return this._audio_handle.latency_settings();
                    }, settings => this._audio_handle.latency_settings(settings), this._audio_handle.support_flush ? () => {
                        this._audio_handle.flush();
                    } : undefined);
                },
                visible: this._audio_handle && this._audio_handle.support_latency_settings()
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-input_muted_local",
                name: tr("Mute client"),
                visible: !this._audio_muted,
                callback: () => this.set_muted(true, false)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-input_muted_local",
                name: tr("Unmute client"),
                visible: this._audio_muted,
                callback: () => this.set_muted(false, false)
            },
            contextmenu.Entry.CLOSE(() => trigger_close && on_close ? on_close() : {})
        );
    }

    static bbcodeTag(id: number, name: string, uid: string) : string {
        return "[url=client://" + id + "/" + uid + "~" + encodeURIComponent(name) + "]" + name + "[/url]";
    }

    static chatTag(id: number, name: string, uid: string, braces: boolean = false) : JQuery {
        return $(htmltags.generate_client({
            client_name: name,
            client_id: id,
            client_unique_id: uid,
            add_braces: braces
        }));
    }

    create_bbcode() : string {
        return ClientEntry.bbcodeTag(this.clientId(), this.clientNickName(), this.clientUid());
    }

    createChatTag(braces: boolean = false) : JQuery {
        return ClientEntry.chatTag(this.clientId(), this.clientNickName(), this.clientUid(), braces);
    }

    set speaking(flag) {
        if(flag === this._speaking) return;
        this._speaking = flag;
        this.events.fire("notify_speak_state_change", { speaking: flag });
    }

    isSpeaking() { return this._speaking; }

    updateVariables(...variables: {key: string, value: string}[]) {

        let reorder_channel = false;
        let update_avatar = false;

        /* devel-block(log-client-property-updates) */
        let group = log.group(log.LogType.DEBUG, LogCategory.CLIENT, tr("Update properties (%i) of %s (%i)"), variables.length, this.clientNickName(), this.clientId());
        {
            const entries = [];
            for(const variable of variables)
                entries.push({
                    key: variable.key,
                    value: variable.value,
                    type: typeof (this.properties[variable.key])
                });
            log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Client update properties", entries);
        }
        /* devel-block-end */

        for(const variable of variables) {
            const old_value = this._properties[variable.key];
            JSON.map_field_to(this._properties, variable.value, variable.key);

            if(variable.key == "client_nickname") {
                if(variable.value !== old_value && typeof(old_value) === "string") {
                    if(!(this instanceof LocalClientEntry)) { /* own changes will be logged somewhere else */
                        this.channelTree.client.log.log(server_log.Type.CLIENT_NICKNAME_CHANGED, {
                            own_client: false,
                            client: this.log_data(),
                            new_name: variable.value,
                            old_name: old_value
                        });
                    }
                }

                const chat = this.channelTree.client.side_bar;
                const conversation = chat.private_conversations().find_conversation({
                    name: this.clientNickName(),
                    client_id: this.clientId(),
                    unique_id: this.clientUid()
                }, {
                    attach: false,
                    create: false
                });
                if(conversation)
                    conversation.set_client_name(variable.value);
                reorder_channel = true;
            }
            if(variable.key == "client_unique_identifier") {
                this._audio_volume = parseFloat(this.channelTree.client.settings.server("volume_client_" + this.clientUid(), "1"));
                const mute_status = this.channelTree.client.settings.server("mute_client_" + this.clientUid(), false);
                this.set_muted(mute_status, mute_status); /* force only needed when we want to mute the client */

                if(this._audio_handle)
                    this._audio_handle.set_volume(this._audio_muted ? 0 : this._audio_volume);

                log.debug(LogCategory.CLIENT, tr("Loaded client (%s) server specific properties. Volume: %o Muted: %o."), this.clientUid(), this._audio_volume, this._audio_muted);
            }
            if(variable.key == "client_talk_power") {
                reorder_channel = true;
                //update_icon_status = true; DONE
            }
            if(variable.key == "client_icon_id") {
                /* yeah we like javascript. Due to JS wiered integer behaviour parsing for example fails for 18446744073409829863.
                *  parseInt("18446744073409829863") evaluates to  18446744073409829000.
                *  In opposite "18446744073409829863" >>> 0 evaluates to 3995244544, which is the icon id :)
                */
                this.properties.client_icon_id = variable.value as any >>> 0;
            }
            else if(variable.key == "client_flag_avatar")
                update_avatar = true;
        }

        /* process updates after variables have been set */
        const side_bar = this.channelTree.client.side_bar;
        {
            const client_info = side_bar.client_info();
            if(client_info.current_client() === this)
                client_info.set_current_client(this, true); /* force an update */
        }
        if(update_avatar) {
            this.channelTree.client.fileManager.avatars.update_cache(this.avatarId(), this.properties.client_flag_avatar);

            const conversations = side_bar.private_conversations();
            const conversation = conversations.find_conversation({name: this.clientNickName(), unique_id: this.clientUid(), client_id: this.clientId()}, {create: false, attach: false});
            if(conversation)
                conversation.update_avatar();
        }

        /* devel-block(log-client-property-updates) */
        group.end();
        /* devel-block-end */

        {
            let properties = {};
            for(const property of variables)
                properties[property.key] = this.properties[property.key];
            this.events.fire("notify_properties_updated", { updated_properties: properties as any, client_properties: this.properties });
        }
    }

    updateClientVariables(force_update?: boolean) : Promise<void> {
        if(Date.now() - 10 * 60 * 1000 < this._info_variables_promise_timestamp && this._info_variables_promise && (typeof(force_update) !== "boolean" || force_update))
            return this._info_variables_promise;

        this._info_variables_promise_timestamp = Date.now();
        return (this._info_variables_promise = new Promise<void>((resolve, reject) => {
            this.channelTree.client.serverConnection.send_command("clientgetvariables", {clid: this.clientId()}).then(() => resolve()).catch(error => {
                this._info_connection_promise_timestamp = 0; /* not succeeded */
                reject(error);
            });
        }));
    }

    assignedServerGroupIds() : number[] {
        let result = [];
        for(let id of this.properties.client_servergroups.split(",")){
            if(id.length == 0) continue;
            result.push(Number.parseInt(id));
        }
        return result;
    }

    assignedChannelGroup() : number {
        return this.properties.client_channel_group_id;
    }

    groupAssigned(group: Group) : boolean {
        if(group.target == GroupTarget.SERVER) {
            for(let id of this.assignedServerGroupIds())
                if(id == group.id) return true;
            return false;
        } else return group.id == this.assignedChannelGroup();
    }

    onDelete() { }

    calculateOnlineTime() : number {
        return Date.now() / 1000 - this.properties.client_lastconnected;
    }

    avatarId?() : string {
        function str2ab(str) {
            let buf = new ArrayBuffer(str.length); // 2 bytes for each char
            let bufView = new Uint8Array(buf);
            for (let i=0, strLen = str.length; i<strLen; i++) {
                bufView[i] = str.charCodeAt(i);
            }
            return buf;
        }

        try {
            let raw = atob(this.properties.client_unique_identifier);
            let input = hex.encode(str2ab(raw));

            let result: string = "";
            for(let index = 0; index < input.length; index++) {
                let c = input.charAt(index);
                let offset: number = 0;
                if(c >= '0' && c <= '9')
                    offset = c.charCodeAt(0) - '0'.charCodeAt(0);
                else if(c >= 'A' && c <= 'F')
                    offset = c.charCodeAt(0) - 'A'.charCodeAt(0) + 0x0A;
                else if(c >= 'a' && c <= 'f')
                    offset = c.charCodeAt(0) - 'a'.charCodeAt(0) + 0x0A;
                result += String.fromCharCode('a'.charCodeAt(0) + offset);
            }
            return result;
        } catch (e) { //invalid base 64 (like music bot etc)
            return undefined;
        }
    }

    log_data() : server_log.base.Client {
        return {
            client_unique_id: this.properties.client_unique_identifier,
            client_name: this.clientNickName(),
            client_id: this._clientId
        }
    }

    /* max 1s ago, so we could update every second */
    request_connection_info() : Promise<ClientConnectionInfo> {
        if(Date.now() - 900 < this._info_connection_promise_timestamp && this._info_connection_promise)
            return this._info_connection_promise;

        if(this._info_connection_promise_reject)
            this._info_connection_promise_resolve("timeout");

        let _local_reject; /* to ensure we're using the right resolve! */
        this._info_connection_promise = new Promise<ClientConnectionInfo>((resolve, reject) => {
            this._info_connection_promise_resolve = resolve;
            this._info_connection_promise_reject = reject;
            _local_reject = reject;
        });

        this._info_connection_promise_timestamp = Date.now();
        this.channelTree.client.serverConnection.send_command("getconnectioninfo", {clid: this._clientId}).catch(error => _local_reject(error));
        return this._info_connection_promise;
    }

    set_connection_info(info: ClientConnectionInfo) {
        if(!this._info_connection_promise_resolve)
            return;
        this._info_connection_promise_resolve(info);
        this._info_connection_promise_resolve = undefined;
        this._info_connection_promise_reject = undefined;
    }
}

export class LocalClientEntry extends ClientEntry {
    handle: ConnectionHandler;

    private renaming: boolean;

    constructor(handle: ConnectionHandler) {
        super(0, "local client");
        this.handle = handle;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        const _self = this;

        contextmenu.spawn_context_menu(x, y,
            ...this.contextmenu_info(), {

                name:   (contextmenu.get_provider().html_format_enabled() ? "<b>" : "") +
                        tr("Change name") +
                        (contextmenu.get_provider().html_format_enabled() ? "</b>" : ""),
                icon_class: "client-change_nickname",
                callback: () =>_self.openRename(),
                type: contextmenu.MenuEntryType.ENTRY
            }, {
                name: tr("Change description"),
                icon_class: "client-edit",
                callback: () => {
                    createInputModal(tr("Change own description"), tr("New description:<br>"), text => true, result => {
                        if(result) {
                            console.log(tr("Changing own description to %s"), result);
                            _self.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: _self.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                },
                type: contextmenu.MenuEntryType.ENTRY
            },
            contextmenu.Entry.HR(),
            ...this.assignment_context(),
            contextmenu.Entry.CLOSE(on_close)
        );
    }

    initializeListener(): void {
        super.initializeListener();
    }

    renameSelf(new_name: string) : Promise<boolean> {
        const old_name = this.properties.client_nickname;
        this.updateVariables({ key: "client_nickname", value: new_name }); /* change it locally */
        return this.handle.serverConnection.command_helper.updateClient("client_nickname", new_name).then((e) => {
            settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, new_name);
            this.channelTree.client.log.log(server_log.Type.CLIENT_NICKNAME_CHANGED, {
                client: this.log_data(),
                old_name: old_name,
                new_name: new_name,
                own_client: true
            });
            return true;
        }).catch((e: CommandResult) => {
            this.updateVariables({ key: "client_nickname", value: old_name }); /* change it back */
            this.channelTree.client.log.log(server_log.Type.CLIENT_NICKNAME_CHANGE_FAILED, {
                reason: e.extra_message
            });
            return false;
        });
    }

    openRename() : void {
        const view = this.channelTree.view.current;
        if(!view) return; //TODO: Fallback input modal
        view.scrollEntryInView(this, () => {
            const own_view = this.view.current;
            if(!own_view) {
                return; //TODO: Fallback input modal
            }

            own_view.setState({
                rename: true,
                renameInitialName: this.properties.client_nickname
            });
        });
    }
}

export class MusicClientProperties extends ClientProperties {
    player_state: number = 0;
    player_volume: number = 0;

    client_playlist_id: number = 0;
    client_disabled: boolean = false;

    client_flag_notify_song_change: boolean = false;
    client_bot_type: number = 0;
    client_uptime_mode: number = 0;
}

/*
 *     command[index]["song_id"] = element ? element->getSongId() : 0;
 command[index]["song_url"] = element ? element->getUrl() : "";
 command[index]["song_invoker"] = element ? element->getInvoker() : 0;
 command[index]["song_loaded"] = false;

 auto entry = dynamic_pointer_cast<ts::music::PlayableSong>(element);
 if(entry) {
        auto data = entry->song_loaded_data();
        command[index]["song_loaded"] = entry->song_loaded() && data;

        if(entry->song_loaded() && data) {
            command[index]["song_title"] = data->title;
            command[index]["song_description"] = data->description;
            command[index]["song_thumbnail"] = data->thumbnail;
            command[index]["song_length"] = data->length.count();
        }
    }
 */

export class SongInfo {
    song_id: number = 0;
    song_url: string = "";
    song_invoker: number = 0;
    song_loaded: boolean = false;

    /* only if song_loaded = true */
    song_title: string = "";
    song_description: string = "";
    song_thumbnail: string = "";
    song_length: number = 0;
}

export class MusicClientPlayerInfo extends SongInfo {
    bot_id: number = 0;
    player_state: number = 0;

    player_buffered_index: number = 0;
    player_replay_index: number = 0;
    player_max_index: number = 0;
    player_seekable: boolean = false;

    player_title: string = "";
    player_description: string = "";
}

export class MusicClientEntry extends ClientEntry {
    private _info_promise: Promise<MusicClientPlayerInfo>;
    private _info_promise_age: number = 0;
    private _info_promise_resolve: any;
    private _info_promise_reject: any;

    constructor(clientId, clientName) {
        super(clientId, clientName, new MusicClientProperties());
    }

    destroy() {
        super.destroy();
        this._info_promise = undefined;
        this._info_promise_reject = undefined;
        this._info_promise_resolve = undefined;
    }

    get properties() : MusicClientProperties {
        return this._properties as MusicClientProperties;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        let trigger_close = true;
        contextmenu.spawn_context_menu(x, y,
            ...this.contextmenu_info(), {
                name: (contextmenu.get_provider().html_format_enabled() ? "<b>" : "") +
                      tr("Change bot name") +
                      (contextmenu.get_provider().html_format_enabled() ? "</b>" : ""),
                icon_class: "client-change_nickname",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Change music bots nickname"), tr("New nickname:<br>"), text => text.length >= 3 && text.length <= 31, result => {
                        if(result) {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_nickname: result
                            });

                        }
                    }, { width: "40em", min_width: "10em", maxLength: 255 }).open();
                },
                type: contextmenu.MenuEntryType.ENTRY
            }, {
                name: tr("Change bot description"),
                icon_class: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Change music bots description"), tr("New description:<br>"), text => true, result => {
                        if(typeof(result) === 'string') {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            });

                        }
                    }, { width: "60em", min_width: "10em", maxLength: 255 }).open();
                },
                type: contextmenu.MenuEntryType.ENTRY
            },
            /*
            {
                name: tr("Open music panel"),
                icon: "client-edit",
                disabled: true,
                callback: () => {},
                type: MenuEntryType.ENTRY
            },
            */
            {
                name: tr("Open bot's playlist"),
                icon_class: "client-edit",
                disabled: false,
                callback: () => {
                    this.channelTree.client.serverConnection.command_helper.request_playlist_list().then(lists => {
                        for(const entry of lists) {
                            if(entry.playlist_id == this.properties.client_playlist_id) {
                                spawnPlaylistEdit(this.channelTree.client, entry);
                                return;
                            }
                        }
                        createErrorModal(tr("Invalid permissions"), tr("You dont have to see the bots playlist.")).open();
                    }).catch(error => {
                        createErrorModal(tr("Failed to query playlist."), tr("Failed to query playlist info.")).open();
                    });
                },
                type: contextmenu.MenuEntryType.ENTRY
            },
            {
                name: tr("Quick url replay"),
                icon_class: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Please enter the URL"), tr("URL:"), text => true, result => {
                        if(result) {
                            this.channelTree.client.serverConnection.send_command("musicbotqueueadd", {
                                bot_id: this.properties.client_database_id,
                                type: "yt", //Its a hint not a force!
                                url: result
                            }).catch(error => {
                                if(error instanceof CommandResult) {
                                    error = error.extra_message || error.message;
                                }
                                //TODO tr
                                createErrorModal(tr("Failed to replay url"), "Failed to enqueue url:<br>" + error).open();
                            });
                        }
                    }, { width: 400, maxLength: 255 }).open();
                },
                type: contextmenu.MenuEntryType.ENTRY
            },
            contextmenu.Entry.HR(),
            ...super.assignment_context(),
            contextmenu.Entry.HR(),{
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-move_client_to_own_channel",
                name: tr("Move client to your channel"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    });
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-kick_channel",
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), text => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            console.log(tr("Kicking client %o from channel with reason %o"), this.clientNickName(), result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            });
                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-volume",
                name: tr("Change local volume"),
                callback: () => {
                    spawnChangeVolume(this, true, this._audio_handle.get_volume(), undefined, volume => {
                        this.channelTree.client.settings.changeServer("volume_client_" + this.clientUid(), volume);
                        this._audio_handle.set_volume(volume);
                    });
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-volume",
                name: tr("Change remote volume"),
                callback: () => {
                    let max_volume = this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME).value;
                    if(max_volume < 0)
                        max_volume = 100;

                    spawnChangeVolume(this, false, this.properties.player_volume, max_volume / 100, value => {
                        if(typeof(value) !== "number")
                            return;

                        this.channelTree.client.serverConnection.send_command("clientedit", {
                            clid: this.clientId(),
                            player_volume: value,
                        }).then(() => {
                            //TODO: Update in info
                        });
                    });
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Change playback latency"),
                callback: () => {
                    spawnChangeLatency(this, this._audio_handle.latency_settings(), () => {
                        this._audio_handle.reset_latency_settings();
                        return this._audio_handle.latency_settings();
                    }, settings => this._audio_handle.latency_settings(settings), this._audio_handle.support_flush ? () => {
                        this._audio_handle.flush();
                    } : undefined);
                },
                visible: this._audio_handle && this._audio_handle.support_latency_settings()
            },
            contextmenu.Entry.HR(),
            {
                name: tr("Delete bot"),
                icon_class: "client-delete",
                disabled: false,
                callback: () => {
                    const tag = $.spawn("div").append(formatMessage(tr("Do you really want to delete {0}"), this.createChatTag(false)));
                    spawnYesNo(tr("Are you sure?"), $.spawn("div").append(tag), result => {
                       if(result) {
                           this.channelTree.client.serverConnection.send_command("musicbotdelete", {
                               bot_id: this.properties.client_database_id
                           });
                       }
                    });
                },
                type: contextmenu.MenuEntryType.ENTRY
            },
            contextmenu.Entry.CLOSE(() => trigger_close && on_close ? on_close() : {})
        );
    }

    initializeListener(): void {
        super.initializeListener();
    }

    handlePlayerInfo(json) {
        if(json) {
            const info = new MusicClientPlayerInfo();
           JSON.map_to(info, json);
            if(this._info_promise_resolve)
                this._info_promise_resolve(info);
            this._info_promise_reject = undefined;
            this._info_promise_resolve = undefined;
        }
    }

    requestPlayerInfo(max_age: number = 1000) : Promise<MusicClientPlayerInfo> {
        if(this._info_promise !== undefined && this._info_promise_age > 0 && Date.now() - max_age <= this._info_promise_age) return this._info_promise;
        this._info_promise_age = Date.now();
        this._info_promise = new Promise<MusicClientPlayerInfo>((resolve, reject) => {
            this._info_promise_reject = reject;
            this._info_promise_resolve = resolve;
        });

        this.channelTree.client.serverConnection.send_command("musicbotplayerinfo", {bot_id: this.properties.client_database_id });
        return this._info_promise;
    }
}