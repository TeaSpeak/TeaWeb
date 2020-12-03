import * as contextmenu from "../ui/elements/ContextMenu";
import {Registry} from "../events";
import {ChannelTree} from "./ChannelTree";
import * as log from "../log";
import {LogCategory, logInfo, LogType} from "../log";
import {Settings, settings} from "../settings";
import {Sound} from "../sound/Sounds";
import {Group, GroupManager, GroupTarget, GroupType} from "../permission/GroupManager";
import PermissionType from "../permission/PermissionType";
import {createErrorModal, createInputModal} from "../ui/elements/Modal";
import * as htmltags from "../ui/htmltags";
import {CommandResult, PlaylistSong} from "../connection/ServerConnectionDeclaration";
import {ChannelEntry} from "./Channel";
import {ConnectionHandler, ViewReasonId} from "../ConnectionHandler";
import {createServerGroupAssignmentModal} from "../ui/modal/ModalGroupAssignment";
import {openClientInfo} from "../ui/modal/ModalClientInfo";
import {spawnBanClient} from "../ui/modal/ModalBanClient";
import {spawnChangeLatency} from "../ui/modal/ModalChangeLatency";
import {formatMessage} from "../ui/frames/chat";
import {spawnYesNo} from "../ui/modal/ModalYesNo";
import * as hex from "../crypto/hex";
import {ChannelTreeEntry, ChannelTreeEntryEvents} from "./ChannelTreeEntry";
import {spawnClientVolumeChange, spawnMusicBotVolumeChange} from "../ui/modal/ModalChangeVolumeNew";
import {spawnPermissionEditorModal} from "../ui/modal/permission/ModalPermissionEditor";
import {EventClient, EventType} from "../ui/frames/log/Definitions";
import {W2GPluginCmdHandler} from "../video-viewer/W2GPlugin";
import {global_client_actions} from "../events/GlobalEvents";
import {ClientIcon} from "svg-sprites/client-icons";
import {VoiceClient} from "../voice/VoiceClient";
import {VoicePlayerEvents, VoicePlayerState} from "../voice/VoicePlayer";
import {ChannelTreeUIEvents} from "tc-shared/ui/tree/Definitions";
import {VideoClient} from "tc-shared/connection/VideoConnection";
import { tr } from "tc-shared/i18n/localize";

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
    client_talk_request: number = 0;
    client_talk_request_msg: string = "";
    client_is_talker: boolean = false;

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
    notify_properties_updated: {
        updated_properties: {[Key in keyof ClientProperties]: ClientProperties[Key]};
        client_properties: ClientProperties
    },
    notify_mute_state_change: { muted: boolean }
    notify_speak_state_change: { speaking: boolean },
    notify_audio_level_changed: { newValue: number },
    notify_status_icon_changed: { newIcon: ClientIcon },

    notify_video_handle_changed: { oldHandle: VideoClient | undefined, newHandle: VideoClient | undefined },

    music_status_update: {
        player_buffered_index: number,
        player_replay_index: number
    },
    music_song_change: {
        "song": SongInfo
    },

    /* TODO: Move this out of the music bots interface? */
    playlist_song_add: { song: PlaylistSong },
    playlist_song_remove: { song_id: number },
    playlist_song_reorder: { song_id: number, previous_song_id: number },
    playlist_song_loaded: { song_id: number, success: boolean, error_msg?: string, metadata?: string },
}

const StatusIconUpdateKeys: (keyof ClientProperties)[] = [
    "client_away",
    "client_input_hardware",
    "client_output_hardware",
    "client_output_muted",
    "client_input_muted",
    "client_is_channel_commander",
    "client_talk_power"
];

export class ClientEntry extends ChannelTreeEntry<ClientEvents> {
    readonly events: Registry<ClientEvents>;
    channelTree: ChannelTree;

    protected _clientId: number;
    protected _channel: ChannelEntry;

    protected _properties: ClientProperties;
    protected lastVariableUpdate: number = 0;
    protected _speaking: boolean;
    protected _listener_initialized: boolean;

    protected voiceHandle: VoiceClient;
    protected voiceVolume: number;
    protected voiceMuted: boolean;
    private readonly voiceCallbackStateChanged;

    protected videoHandle: VideoClient;

    private promiseClientInfo: Promise<void>;
    private promiseClientInfoTimestamp: number;

    private promiseConnectionInfo: Promise<ClientConnectionInfo>;
    private promiseConnectionInfoTimestamp: number;
    private promiseConnectionInfoResolve: any;
    private promiseConnectionInfoReject: any;

    constructor(clientId: number, clientName, properties: ClientProperties = new ClientProperties()) {
        super();
        this.events = new Registry<ClientEvents>();

        this._properties = properties;
        this._properties.client_nickname = clientName;
        this._clientId = clientId;
        this.channelTree = null;
        this._channel = null;

        this.voiceCallbackStateChanged = this.handleVoiceStateChange.bind(this);

        this.events.on(["notify_speak_state_change", "notify_mute_state_change"], () => this.events.fire_later("notify_status_icon_changed", { newIcon: this.getStatusIcon() }));
        this.events.on("notify_properties_updated", event => {
            for (const key of StatusIconUpdateKeys) {
                if (key in event.updated_properties) {
                    this.events.fire_later("notify_status_icon_changed", { newIcon: this.getStatusIcon() })
                    return;
                }
            }
        });
    }

    destroy() {
        if(this.voiceHandle) {
            log.error(LogCategory.AUDIO, tr("Destroying client with an active audio handle. This could cause memory leaks!"));
            this.setVoiceClient(undefined);
        }
        if(this.videoHandle) {
            log.error(LogCategory.AUDIO, tr("Destroying client with an active video handle. This could cause memory leaks!"));
            this.setVideoClient(undefined);
        }

        this._channel = undefined;
        this.events.destroy();
    }

    setVoiceClient(handle: VoiceClient) {
        if(this.voiceHandle === handle)
            return;

        if(this.voiceHandle) {
            this.voiceHandle.events.off(this.voiceCallbackStateChanged);
        }

        this.voiceHandle = handle;
        if(handle) {
            this.voiceHandle.events.on("notify_state_changed", this.voiceCallbackStateChanged);
            this.handleVoiceStateChange({ oldState: VoicePlayerState.STOPPED, newState: handle.getState() });
        }
    }

    setVideoClient(handle: VideoClient) {
        if(this.videoHandle === handle) {
            return;
        }

        const oldHandle = this.videoHandle;
        this.videoHandle = handle;
        this.events.fire("notify_video_handle_changed", { oldHandle: oldHandle, newHandle: handle });
    }

    private handleVoiceStateChange(event: VoicePlayerEvents["notify_state_changed"]) {
        switch (event.newState) {
            case VoicePlayerState.PLAYING:
            case VoicePlayerState.STOPPING:
                this.speaking = true;
                break;

            case VoicePlayerState.STOPPED:
            case VoicePlayerState.INITIALIZING:
                this.speaking = false;
                break;
        }
    }

    private updateVoiceVolume() {
        let volume = this.voiceMuted ? 0 : this.voiceVolume;

        /* TODO: If a whisper session has been set, update this as well */
        this.voiceHandle?.setVolume(volume);
    }

    getVoiceClient() : VoiceClient {
        return this.voiceHandle;
    }

    getVideoClient() : VideoClient {
        return this.videoHandle;
    }

    get properties() : ClientProperties {
        return this._properties;
    }

    getStatusIcon() : ClientIcon {
        if (this.properties.client_type_exact == ClientType.CLIENT_QUERY) {
            return ClientIcon.ServerQuery;
        } else if (this.properties.client_away) {
            return ClientIcon.Away;
        } else if (!this.getVoiceClient() && !(this instanceof LocalClientEntry)) {
            return ClientIcon.InputMutedLocal;
        } else if (!this.properties.client_output_hardware) {
            return ClientIcon.HardwareOutputMuted;
        } else if (this.properties.client_output_muted) {
            return ClientIcon.OutputMuted;
        } else if (!this.properties.client_input_hardware) {
            return ClientIcon.HardwareInputMuted;
        } else if (this.properties.client_input_muted) {
            return ClientIcon.InputMuted;
        } else {
            if (this.isSpeaking()) {
                if (this.properties.client_is_channel_commander) {
                    return ClientIcon.PlayerCommanderOn;
                } else {
                    return ClientIcon.PlayerOn;
                }
            } else {
                if (this.properties.client_is_channel_commander) {
                    return ClientIcon.PlayerCommanderOff;
                } else {
                    return ClientIcon.PlayerOff;
                }
            }
        }
    }

    currentChannel() : ChannelEntry { return this._channel; }
    clientNickName(){ return this.properties.client_nickname; }
    clientUid(){ return this.properties.client_unique_identifier; }
    clientId(){ return this._clientId; }

    isMuted() { return !!this.voiceMuted; }

    /* TODO: Move this method to the view (e.g. channel tree) and rename with to setClientMuted */
    setMuted(flagMuted: boolean, force: boolean) {
        if(this.voiceMuted === flagMuted && !force) {
            return;
        }

        if(flagMuted) {
            this.channelTree.client.serverConnection.send_command('clientmute', {
                clid: this.clientId()
            }).then(() => {});
        } else if(this.voiceMuted) {
            this.channelTree.client.serverConnection.send_command('clientunmute', {
                clid: this.clientId()
            }).then(() => {});
        }
        this.voiceMuted = flagMuted;

        this.channelTree.client.settings.changeServer(Settings.FN_CLIENT_MUTED(this.clientUid()), flagMuted);
        this.updateVoiceVolume();

        this.events.fire("notify_mute_state_change", { muted: flagMuted });
        for(const client of this.channelTree.clients) {
            if(client === this || client.properties.client_unique_identifier !== this.properties.client_unique_identifier)
                continue;
            client.setMuted(flagMuted, false);
        }
    }

    protected initializeListener() {
        if(this._listener_initialized) return;
        this._listener_initialized = true;
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
                    }).then(() => {});
                };
                entry.disabled = !this.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
            } else {
                entry.callback = () => {
                    this.channelTree.client.serverConnection.send_command("servergroupaddclient", {
                        sgid: group.id,
                        cldbid: this.properties.client_database_id
                    }).then(() => {});
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
                }).then(() => {});
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
                    callback: () => spawnPermissionEditorModal(this.channelTree.client, "client", { clientDatabaseId: this.properties.client_database_id })
                },
                {
                    type: contextmenu.MenuEntryType.ENTRY,
                    icon_class: "client-permission_client",
                    name: tr("Client channel permissions"),
                    callback: () => spawnPermissionEditorModal(this.channelTree.client, "client-channel", { clientDatabaseId: this.properties.client_database_id })
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
                    }).then(() => true);
                } else
                    return this.channelTree.client.serverConnection.send_command("servergroupdelclient", {
                        sgid: groups[0],
                        cldbid: this.properties.client_database_id
                    }).then(() => true);
            } else {
                const data = groups.map(e => { return {sgid: e}; });
                data[0]["cldbid"] = this.properties.client_database_id;

                if(flag) {
                    return this.channelTree.client.serverConnection.send_command("clientaddservergroup", data, {flagset: ["continueonerror"]}).then(() => true);
                } else
                    return this.channelTree.client.serverConnection.send_command("clientdelservergroup", data, {flagset: ["continueonerror"]}).then(() => true);
            }
        });
    }

    open_text_chat() {
        const chat = this.channelTree.client.side_bar;
        const conversation = chat.private_conversations().findOrCreateConversation(this);
        conversation.setActiveClientEntry(this);
        chat.private_conversations().setActiveConversation(conversation);
        chat.show_private_conversations();
        chat.private_conversations().focusInput();
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined) {
        const w2gPlugin = this.channelTree.client.getPluginCmdRegistry().getPluginHandler<W2GPluginCmdHandler>(W2GPluginCmdHandler.kPluginChannel);

        let trigger_close = true;
        contextmenu.spawn_context_menu(x, y,
            ...this.contextmenu_info(), {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.ChangeNickname,
                name:   (contextmenu.get_provider().html_format_enabled() ? "<b>" : "") +
                    tr("Open text chat") +
                    (contextmenu.get_provider().html_format_enabled() ? "</b>" : ""),
                callback: () => {
                    this.open_text_chat();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Watch clients video"),
                icon_class: ClientIcon.W2g,
                visible: w2gPlugin?.getCurrentWatchers().findIndex(e => e.clientId === this.clientId()) !== -1,
                callback: () => {
                    global_client_actions.fire("action_w2g", {
                        following: this.clientId(),
                        handlerId: this.channelTree.client.handlerId
                    });
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.About,
                name: tr("Show client info"),
                callback: () => openClientInfo(this)
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.Poke,
                name: tr("Poke client"),
                callback: () => {
                    createInputModal(tr("Poke client"), tr("Poke message:<br>"), () => true, result => {
                        if(typeof(result) === "string") {
                            this.channelTree.client.serverConnection.send_command("clientpoke", {
                                clid: this.clientId(),
                                msg: result
                            }).then(() => {
                                this.channelTree.client.log.log(EventType.CLIENT_POKE_SEND, {
                                    target: this.log_data(),
                                    message: result
                                });
                            });
                        }
                    }, { width: 400, maxLength: 512 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.Edit,
                name: tr("Change description"),
                callback: () => {
                    createInputModal(tr("Change client description"), tr("New description:<br>"), () => true, result => {
                        if(typeof(result) === "string") {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            }).then(() => {});

                        }
                    }, { width: 400, maxLength: 1024 }).open();
                }
            },
            contextmenu.Entry.HR(),
            ...this.assignment_context(),
            contextmenu.Entry.HR(), {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.MoveClientToOwnChannel,
                name: tr("Move client to your channel"),
                callback: () => {
                    this.channelTree.client.serverConnection.send_command("clientmove", {
                        clid: this.clientId(),
                        cid: this.channelTree.client.getClient().currentChannel().getChannelId()
                    }).then(() => {});
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.KickChannel,
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), () => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            logInfo(LogCategory.CLIENT, tr("Kicking client %s from channel with reason %s"), this.clientNickName(), result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            }).then(() => {});

                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.KickServer,
                name: tr("Kick client fom server"),
                callback: () => {
                    createInputModal(tr("Kick client from server"), tr("Kick reason:<br>"), () => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            logInfo(LogCategory.CLIENT, tr("Kicking client %s from server with reason %s"), this.clientNickName(), result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_SERVER_KICK,
                                reasonmsg: result
                            }).then(() => {});
                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.BanClient,
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
                icon_class: ClientIcon.Volume,
                name: tr("Change Volume"),
                callback: () => spawnClientVolumeChange(this)
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Change playback latency"),
                callback: () => {
                    spawnChangeLatency(this, this.voiceHandle.getLatencySettings(), () => {
                        this.voiceHandle.resetLatencySettings();
                        return this.voiceHandle.getLatencySettings();
                    }, settings => this.voiceHandle.setLatencySettings(settings), () => this.voiceHandle.flushBuffer());
                },
                visible: !!this.voiceHandle
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.InputMutedLocal,
                name: tr("Mute client"),
                visible: !this.voiceMuted,
                callback: () => this.setMuted(true, false)
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: ClientIcon.InputMutedLocal,
                name: tr("Unmute client"),
                visible: this.voiceMuted,
                callback: () => this.setMuted(false, false)
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
                        this.channelTree.client.log.log(EventType.CLIENT_NICKNAME_CHANGED, {
                            client: this.log_data(),
                            new_name: variable.value,
                            old_name: old_value
                        });
                    }
                }

                reorder_channel = true;
            }
            if(variable.key == "client_unique_identifier") {
                this.voiceVolume = this.channelTree.client.settings.server(Settings.FN_CLIENT_VOLUME(this.clientUid()), 1);
                const mute_status = this.channelTree.client.settings.server(Settings.FN_CLIENT_MUTED(this.clientUid()), false);
                this.setMuted(mute_status, mute_status); /* force only needed when we want to mute the client */
                this.updateVoiceVolume();
                log.debug(LogCategory.CLIENT, tr("Loaded client (%s) server specific properties. Volume: %o Muted: %o."), this.clientUid(), this.voiceVolume, this.voiceMuted);
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
        const side_bar = this.channelTree?.client?.side_bar;
        if(side_bar) {
            const client_info = side_bar.client_info();
            if(client_info.current_client() === this)
                client_info.set_current_client(this, true); /* force an update */
        }

        if(update_avatar)
            this.channelTree.client?.fileManager?.avatars.updateCache(this.avatarId(), this.properties.client_flag_avatar);

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
        if(Date.now() - 10 * 60 * 1000 < this.promiseClientInfoTimestamp && this.promiseClientInfo && (typeof(force_update) !== "boolean" || force_update))
            return this.promiseClientInfo;

        this.promiseClientInfoTimestamp = Date.now();
        return (this.promiseClientInfo = new Promise<void>((resolve, reject) => {
            this.channelTree.client.serverConnection.send_command("clientgetvariables", {clid: this.clientId()}).then(() => resolve()).catch(error => {
                this.promiseConnectionInfoTimestamp = 0; /* not succeeded */
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

    log_data() : EventClient {
        return {
            client_unique_id: this.properties.client_unique_identifier,
            client_name: this.clientNickName(),
            client_id: this._clientId
        }
    }

    /* max 1s ago, so we could update every second */
    request_connection_info() : Promise<ClientConnectionInfo> {
        if(Date.now() - 900 < this.promiseConnectionInfoTimestamp && this.promiseConnectionInfo)
            return this.promiseConnectionInfo;

        if(this.promiseConnectionInfoReject)
            this.promiseConnectionInfoResolve("timeout");

        let _local_reject; /* to ensure we're using the right resolve! */
        this.promiseConnectionInfo = new Promise<ClientConnectionInfo>((resolve, reject) => {
            this.promiseConnectionInfoResolve = resolve;
            this.promiseConnectionInfoReject = reject;
            _local_reject = reject;
        });

        this.promiseConnectionInfoTimestamp = Date.now();
        this.channelTree.client.serverConnection.send_command("getconnectioninfo", {clid: this._clientId}).catch(error => _local_reject(error));
        return this.promiseConnectionInfo;
    }

    set_connection_info(info: ClientConnectionInfo) {
        if(!this.promiseConnectionInfoResolve)
            return;
        this.promiseConnectionInfoResolve(info);
        this.promiseConnectionInfoResolve = undefined;
        this.promiseConnectionInfoReject = undefined;
    }

    setAudioVolume(value: number) {
        if(this.voiceVolume == value)
            return;

        this.voiceVolume = value;

        this.updateVoiceVolume();
        this.channelTree.client.settings.changeServer(Settings.FN_CLIENT_VOLUME(this.clientUid()), value);

        this.events.fire("notify_audio_level_changed", { newValue: value });
    }

    getAudioVolume() {
        return this.voiceVolume;
    }
}

export class LocalClientEntry extends ClientEntry {
    handle: ConnectionHandler;

    constructor(handle: ConnectionHandler) {
        super(0, "local client");
        this.handle = handle;
    }

    showContextMenu(x: number, y: number, on_close: () => void = undefined): void {
        contextmenu.spawn_context_menu(x, y,
            ...this.contextmenu_info(), {

                name:   (contextmenu.get_provider().html_format_enabled() ? "<b>" : "") +
                    tr("Change name") +
                    (contextmenu.get_provider().html_format_enabled() ? "</b>" : ""),
                icon_class: "client-change_nickname",
                callback: () => this.openRenameModal(), /* FIXME: Pass the UI event registry */
                type: contextmenu.MenuEntryType.ENTRY
            }, {
                name: tr("Change description"),
                icon_class: "client-edit",
                callback: () => {
                    createInputModal(tr("Change own description"), tr("New description:<br>"), () => true, result => {
                        if(result) {
                            logInfo(LogCategory.CLIENT, tr("Changing own description to %s"), result);
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            }).then(() => {});

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
        return this.handle.serverConnection.send_command("clientupdate", { client_nickname: new_name }).then(() => {
            settings.changeGlobal(Settings.KEY_CONNECT_USERNAME, new_name);
            this.channelTree.client.log.log(EventType.CLIENT_NICKNAME_CHANGED_OWN, {
                client: this.log_data(),
                old_name: old_name,
                new_name: new_name,
            });
            return true;
        }).catch((e: CommandResult) => {
            this.updateVariables({ key: "client_nickname", value: old_name }); /* change it back */
            this.channelTree.client.log.log(EventType.CLIENT_NICKNAME_CHANGE_FAILED, {
                reason: e.extra_message
            });
            return false;
        });
    }

    openRenameModal() {
        createInputModal(tr("Enter your new name"), tr("Enter your new client name"), text => text.length >= 3 && text.length <= 30, value => {
            if(value) {
                this.renameSelf(value as string).then(result => {
                    if(!result) {
                        createErrorModal(tr("Failed change nickname"), tr("Failed to change your client nickname")).open();
                    }
                });
            }
        }).open();
    }

    openRename(events: Registry<ChannelTreeUIEvents>) : void {
        events.fire("notify_client_name_edit", { initialValue: this.clientNickName(), treeEntryId: this.uniqueEntryId });
    }
}

export enum MusicClientPlayerState {
    SLEEPING,
    LOADING,

    PLAYING,
    PAUSED,
    STOPPED
}

export class MusicClientProperties extends ClientProperties {
    player_state: number = 0; /* MusicClientPlayerState */
    player_volume: number = 0;

    client_playlist_id: number = 0;
    client_disabled: boolean = false;

    client_flag_notify_song_change: boolean = false;
    client_bot_type: number = 0;
    client_uptime_mode: number = 0;
}

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
                            }).then(() => {});
                        }
                    }, { width: "40em", min_width: "10em", maxLength: 255 }).open();
                },
                type: contextmenu.MenuEntryType.ENTRY
            }, {
                name: tr("Change bot description"),
                icon_class: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Change music bots description"), tr("New description:<br>"), () => true, result => {
                        if(typeof(result) === 'string') {
                            this.channelTree.client.serverConnection.send_command("clientedit", {
                                clid: this.clientId(),
                                client_description: result
                            }).then(() => {});
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
                name: tr("Quick url replay"),
                icon_class: "client-edit",
                disabled: false,
                callback: () => {
                    createInputModal(tr("Please enter the URL"), tr("URL:"), () => true, result => {
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
                    }).then(() => {});
                }
            }, {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-kick_channel",
                name: tr("Kick client from channel"),
                callback: () => {
                    createInputModal(tr("Kick client from channel"), tr("Kick reason:<br>"), () => true, result => {
                        if(typeof(result) !== 'boolean' || result) {
                            logInfo(LogCategory.CLIENT, tr("Kicking client %o from channel with reason %o"), this.clientNickName(), result);
                            this.channelTree.client.serverConnection.send_command("clientkick", {
                                clid: this.clientId(),
                                reasonid: ViewReasonId.VREASON_CHANNEL_KICK,
                                reasonmsg: result
                            }).then(() => {});
                        }
                    }, { width: 400, maxLength: 255 }).open();
                }
            },
            contextmenu.Entry.HR(),
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-volume",
                name: tr("Change local volume"),
                callback: () => spawnClientVolumeChange(this)
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                icon_class: "client-volume",
                name: tr("Change remote volume"),
                callback: () => {
                    let max_volume = this.channelTree.client.permissions.neededPermission(PermissionType.I_CLIENT_MUSIC_CREATE_MODIFY_MAX_VOLUME).value;
                    if(max_volume < 0) {
                        max_volume = 100;
                    }

                    spawnMusicBotVolumeChange(this, max_volume / 100);
                }
            },
            {
                type: contextmenu.MenuEntryType.ENTRY,
                name: tr("Change playback latency"),
                callback: () => {
                    spawnChangeLatency(this, this.voiceHandle.getLatencySettings(), () => {
                        this.voiceHandle.resetLatencySettings();
                        return this.voiceHandle.getLatencySettings();
                    }, settings => this.voiceHandle.setLatencySettings(settings), () => this.voiceHandle.flushBuffer());
                },
                visible: !!this.voiceHandle
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
                            }).then(() => {});
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

        this.channelTree.client.serverConnection.send_command("musicbotplayerinfo", {bot_id: this.properties.client_database_id }).then(() => {});
        return this._info_promise;
    }

    isCurrentlyPlaying() {
        switch (this.properties.player_state) {
            case MusicClientPlayerState.PLAYING:
            case MusicClientPlayerState.LOADING:
                return true;

            default:
                return false;
        }
    }
}