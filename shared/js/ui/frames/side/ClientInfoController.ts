import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {ClientEntry, ClientType, LocalClientEntry} from "tc-shared/tree/Client";
import {
    ClientForumInfo,
    ClientGroupInfo,
    ClientInfoEvents,
    ClientStatusInfo,
    ClientVersionInfo
} from "tc-shared/ui/frames/side/ClientInfoDefinitions";

import * as ReactDOM from "react-dom";
import {ClientInfoRenderer} from "tc-shared/ui/frames/side/ClientInfoRenderer";
import {Registry} from "tc-shared/events";
import * as React from "react";
import * as i18nc from "../../../i18n/country";
import {openClientInfo} from "tc-shared/ui/modal/ModalClientInfo";

type CurrentClientInfo = {
    name: string,
    description: string,
    joinTimestamp: number,
    leaveTimestamp: number,
    country: { name: string, flag: string },
    volume: { volume: number, muted: boolean },
    status: ClientStatusInfo,
    forumAccount: ClientForumInfo | undefined,
    channelGroup: number,
    serverGroups: number[],
    version: ClientVersionInfo
}

export class ClientInfoController {
    private readonly connection: ConnectionHandler;
    private readonly listenerConnection: (() => void)[];

    private readonly uiEvents: Registry<ClientInfoEvents>;
    private readonly htmlContainer: HTMLDivElement;

    private listenerClient: (() => void)[];
    private currentClient: ClientEntry | undefined;
    private currentClientStatus: CurrentClientInfo | undefined;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.uiEvents = new Registry<ClientInfoEvents>();
        this.uiEvents.enableDebug("client-info");

        this.listenerConnection = [];
        this.listenerClient = [];

        this.initialize();

        this.htmlContainer = document.createElement("div");
        this.htmlContainer.style.display = "flex";
        this.htmlContainer.style.flexDirection = "column";
        this.htmlContainer.style.justifyContent = "strech";
        this.htmlContainer.style.height = "100%";
        ReactDOM.render(React.createElement(ClientInfoRenderer, { events: this.uiEvents }), this.htmlContainer);
    }

    getHtmlTag() : HTMLDivElement {
        return this.htmlContainer;
    }

    private initialize() {
        this.listenerConnection.push(this.connection.groups.events.on("notify_groups_updated", event => {
            if(!this.currentClientStatus) {
                return;
            }

            for(const update of event.updates) {
                if(update.group.id === this.currentClientStatus.channelGroup) {
                    this.sendChannelGroup();
                    break;
                }
            }

            for(const update of event.updates) {
                if(this.currentClientStatus.serverGroups.indexOf(update.group.id) !== -1) {
                    this.sendServerGroups();
                    break;
                }
            }
        }));

        this.listenerConnection.push(this.connection.channelTree.events.on("notify_client_leave_view", event => {
            if(event.client !== this.currentClient) {
                return;
            }

            this.currentClientStatus.leaveTimestamp = Date.now() / 1000;
            this.currentClient = undefined;
            this.unregisterClientEvents();
            this.sendOnline();
        }));

        this.listenerConnection.push(this.connection.events().on("notify_connection_state_changed", event => {
            if(event.new_state !== ConnectionState.CONNECTED && this.currentClientStatus) {
                this.currentClient = undefined;
                this.currentClientStatus.leaveTimestamp = Date.now() / 1000;
                this.sendOnline();
            }
        }))

        this.uiEvents.on("query_client_name", () => this.sendClientName());
        this.uiEvents.on("query_client_description", () => this.sendClientDescription());
        this.uiEvents.on("query_channel_group", () => this.sendChannelGroup());
        this.uiEvents.on("query_server_groups", () => this.sendServerGroups());
        this.uiEvents.on("query_status", () => this.sendClientStatus());
        this.uiEvents.on("query_online", () => this.sendOnline());
        this.uiEvents.on("query_country", () => this.sendCountry());
        this.uiEvents.on("query_volume", () => this.sendVolume());
        this.uiEvents.on("query_version", () => this.sendVersion());
        this.uiEvents.on("query_forum", () => this.sendForum());

        this.uiEvents.on("action_edit_avatar", () => this.connection.update_avatar());
        this.uiEvents.on("action_show_full_info", () => this.currentClient && openClientInfo(this.currentClient));
    }

    private unregisterClientEvents() {
        this.listenerClient.forEach(callback => callback());
        this.listenerClient = [];
    }

    private registerClientEvents(client: ClientEntry) {
        const events = this.listenerClient;

        events.push(client.events.on("notify_properties_updated", event => {
            if('client_nickname' in event.updated_properties) {
                this.currentClientStatus.name = event.client_properties.client_nickname;
                this.sendClientName();
            }

            if('client_description' in event.updated_properties) {
                this.currentClientStatus.description = event.client_properties.client_description;
                this.sendClientDescription();
            }

            if('client_channel_group_id' in event.updated_properties) {
                this.currentClientStatus.channelGroup = event.client_properties.client_channel_group_id;
                this.sendChannelGroup();
            }

            if('client_servergroups' in event.updated_properties) {
                this.currentClientStatus.serverGroups = client.assignedServerGroupIds();
                this.sendServerGroups();
            }

            /* Can happen since that variable isn't in view on client appearance */
            if('client_lastconnected' in event.updated_properties) {
                this.currentClientStatus.joinTimestamp = event.client_properties.client_lastconnected;
                this.sendOnline();
            }

            if('client_country' in event.updated_properties) {
                this.updateCachedCountry(client);
                this.sendCountry();
            }

            for(const key of ["client_away", "client_away_message", "client_input_muted", "client_input_hardware", "client_output_muted", "client_output_hardware"]) {
                if(key in event.updated_properties) {
                    this.updateCachedClientStatus(client);
                    this.sendClientStatus();
                    break;
                }
            }

            if('client_platform' in event.updated_properties || 'client_version' in event.updated_properties) {
                this.currentClientStatus.version = {
                    platform: client.properties.client_platform,
                    version: client.properties.client_version
                };
                this.sendVersion();
            }

            if('client_teaforo_flags' in event.updated_properties || 'client_teaforo_name' in event.updated_properties || 'client_teaforo_id' in event.updated_properties) {
                this.updateForumAccount(client);
                this.sendForum();
            }
        }));

        events.push(client.events.on("notify_audio_level_changed", () => {
            this.updateCachedVolume(client);
            this.sendVolume();
        }));

        events.push(client.events.on("notify_mute_state_change", () => {
            this.updateCachedVolume(client);
            this.sendVolume();
        }));
    }

    private updateCachedClientStatus(client: ClientEntry) {
        this.currentClientStatus.status = {
            away: client.properties.client_away ? client.properties.client_away_message ? client.properties.client_away_message : true : false,
            microphoneMuted: client.properties.client_input_muted,
            microphoneDisabled: !client.properties.client_input_hardware,
            speakerMuted: client.properties.client_output_muted,
            speakerDisabled: client.properties.client_output_hardware
        };
    }

    private updateCachedCountry(client: ClientEntry) {
        this.currentClientStatus.country = {
            flag: client.properties.client_country,
            name: i18nc.country_name(client.properties.client_country.toUpperCase()),
        };
    }

    private updateCachedVolume(client: ClientEntry) {
        this.currentClientStatus.volume = {
            volume: client.getAudioVolume(),
            muted: client.isMuted()
        }
    }

    private updateForumAccount(client: ClientEntry) {
        if(client.properties.client_teaforo_id) {
            this.currentClientStatus.forumAccount = {
                flags: client.properties.client_teaforo_flags,
                nickname: client.properties.client_teaforo_name,
                userId: client.properties.client_teaforo_id
            };
        } else {
            this.currentClientStatus.forumAccount = undefined;
        }
    }

    private initializeClientInfo(client: ClientEntry) {
        this.currentClientStatus = {
            name: client.properties.client_nickname,
            description: client.properties.client_description,
            channelGroup: client.properties.client_channel_group_id,
            serverGroups: client.assignedServerGroupIds(),
            country: undefined,
            forumAccount: undefined,
            joinTimestamp: client.properties.client_lastconnected,
            leaveTimestamp: 0,
            status: undefined,
            volume: undefined,
            version: {
                platform: client.properties.client_platform,
                version: client.properties.client_version
            }
        };
        this.updateCachedClientStatus(client);
        this.updateCachedCountry(client);
        this.updateCachedVolume(client);
        this.updateForumAccount(client);
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);
    }

    setClient(client: ClientEntry | undefined) {
        if(this.currentClient === client) {
            return;
        }

        this.unregisterClientEvents();
        this.currentClient = client;
        if(this.currentClient) {
            this.currentClient.updateClientVariables().then(undefined);
            this.registerClientEvents(this.currentClient);
            this.initializeClientInfo(this.currentClient);
            this.uiEvents.fire("notify_client", {
                info: {
                    handlerId: this.connection.handlerId,
                    type: client instanceof LocalClientEntry ? "self" : client.properties.client_type === ClientType.CLIENT_QUERY ? "query" : "voice",
                    clientDatabaseId: client.properties.client_database_id,
                    clientId: client.clientId(),
                    clientUniqueId: client.properties.client_unique_identifier
                }
            });
        } else {
            this.currentClientStatus = undefined;
            this.uiEvents.fire("notify_client", {
                info: undefined
            });
        }
    }

    getClient() : ClientEntry | undefined {
        return this.currentClient;
    }

    private generateGroupInfo(groupId: number, type: "channel" | "server") : ClientGroupInfo {
        const uniqueServerId = this.connection.channelTree.server.properties.virtualserver_unique_identifier;
        const group = type === "channel" ? this.connection.groups.findChannelGroup(groupId) : this.connection.groups.findServerGroup(groupId);

        if(!group) {
            return {
                groupId: groupId,
                groupIcon: { iconId: 0, serverUniqueId: uniqueServerId, handlerId: this.connection.handlerId },
                groupName: tra("Unknown group {}", groupId),
                groupSortOrder: 0
            }
        } else {
            return {
                groupId: group.id,
                groupName:  group.name,
                groupIcon: {
                    handlerId: this.connection.handlerId,
                    serverUniqueId: uniqueServerId,
                    iconId: group.properties.iconid
                },
                groupSortOrder: group.properties.sortid
            };
        }
    }

    private sendChannelGroup() {
        if(typeof this.currentClientStatus === "undefined") {
            this.uiEvents.fire_react("notify_channel_group", { group: undefined });
        } else {
            this.uiEvents.fire_react("notify_channel_group", { group: this.generateGroupInfo(this.currentClientStatus.channelGroup, "channel") });
        }
    }

    private sendServerGroups() {
        if(this.currentClientStatus === undefined) {
            this.uiEvents.fire_react("notify_server_groups", { groups: [] });
        } else {
            this.uiEvents.fire_react("notify_server_groups", {
                groups: this.currentClientStatus.serverGroups.map(group => this.generateGroupInfo(group, "server"))
                    .sort((a, b) => {
                        if (a.groupSortOrder < b.groupSortOrder)
                            return 1;

                        if (a.groupSortOrder > b.groupSortOrder)
                            return -1;

                        if (a.groupId > b.groupId)
                            return -1;

                        if (a.groupId < b.groupId)
                            return 1;

                        return 0;
                    }).reverse()
            });
        }
    }

    private sendClientStatus() {
        this.uiEvents.fire_react("notify_status", {
            status: this.currentClientStatus?.status || {
                away: false,
                speakerDisabled: false,
                speakerMuted: false,
                microphoneDisabled: false,
                microphoneMuted: false
            }
        });
    }

    private sendClientName() {
        this.uiEvents.fire_react("notify_client_name", { name: this.currentClientStatus?.name });
    }

    private sendClientDescription() {
        this.uiEvents.fire_react("notify_client_description", { description: this.currentClientStatus?.description });
    }

    private sendOnline() {
        this.uiEvents.fire_react("notify_online", {
            status: {
                leaveTimestamp: this.currentClientStatus ? this.currentClientStatus.leaveTimestamp : 0,
                joinTimestamp: this.currentClientStatus ? this.currentClientStatus.joinTimestamp : 0
            }
        });
    }

    private sendCountry() {
        this.uiEvents.fire_react("notify_country", {
            country: this.currentClientStatus ? {
                name: this.currentClientStatus.country.name,
                flag: this.currentClientStatus.country.flag
            } : {
                name: tr("Unknown"),
                flag: "xx"
            }
        });
    }

    private sendVolume() {
        this.uiEvents.fire_react("notify_volume", {
            volume: this.currentClientStatus ? {
                volume: this.currentClientStatus.volume.volume,
                muted: this.currentClientStatus.volume.muted
            } : {
                volume: -1,
                muted: false
            }
        })
    }

    private sendVersion() {
        this.uiEvents.fire_react("notify_version", {
            version: this.currentClientStatus ? {
                platform: this.currentClientStatus.version.platform,
                version: this.currentClientStatus.version.version
            } : {
                platform: tr("Unknown"),
                version: tr("Unknown")
            }
        })
    }

    private sendForum() {
        this.uiEvents.fire_react("notify_forum", { forum: this.currentClientStatus?.forumAccount })
    }
}