import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {
    ClientGroupInfo,
    ClientInfoEvents,
} from "tc-shared/ui/frames/side/ClientInfoDefinitions";

import {Registry} from "tc-shared/events";
import {openClientInfo} from "tc-shared/ui/modal/ModalClientInfo";

export class ClientInfoController {
    private readonly uiEvents: Registry<ClientInfoEvents>;

    private connection: ConnectionHandler;
    private listenerConnection: (() => void)[];

    constructor() {
        this.uiEvents = new Registry<ClientInfoEvents>();
        this.uiEvents.enableDebug("client-info");

        this.listenerConnection = [];
        this.uiEvents.on("query_client", () => this.sendClient());
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

        this.uiEvents.on("action_edit_avatar", () => this.connection?.update_avatar());
        this.uiEvents.on("action_show_full_info", () => {
            const client = this.connection?.getSelectedClientInfo().getClient();
            if(client) {
                openClientInfo(client);
            }
        });
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];
    }

    setConnectionHandler(connection: ConnectionHandler) {
        if(this.connection === connection) {
            return;
        }

        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection = [];

        this.connection = connection;
        if(connection) {
            this.initializeConnection(connection);
        }
        this.sendClient();
    }

    private initializeConnection(connection: ConnectionHandler) {
        this.listenerConnection.push(connection.groups.events.on("notify_groups_updated", event => {
            const info = this.connection?.getSelectedClientInfo().getInfo();
            if(!info) {
                return;
            }

            for(const update of event.updates) {
                if(update.group.id === info.channelGroup) {
                    this.sendChannelGroup();
                    break;
                }
            }

            for(const update of event.updates) {
                if(info.serverGroups.indexOf(update.group.id) !== -1) {
                    this.sendServerGroups();
                    break;
                }
            }
        }));

        this.listenerConnection.push(connection.getSelectedClientInfo().events.on("notify_cache_changed", event => {
            switch (event.category) {
                case "name":
                    this.sendClientName();
                    break;

                case "country":
                    this.sendCountry();
                    break;

                case "description":
                    this.sendClientDescription();
                    break;

                case "forum-account":
                    this.sendForum();
                    break;

                case "group-channel":
                    this.sendChannelGroup();
                    break;

                case "groups-server":
                    this.sendServerGroups();
                    break;

                case "online-state":
                    this.sendOnline();
                    break;

                case "status":
                    this.sendClientStatus();
                    break;

                case "version":
                    this.sendVolume();
                    break;

                case "volume":
                    this.sendVolume();
                    break;
            }
        }));
    }

    private generateGroupInfo(groupId: number, type: "channel" | "server") : ClientGroupInfo {
        const uniqueServerId = this.connection?.channelTree.server.properties.virtualserver_unique_identifier;
        const group = type === "channel" ? this.connection?.groups.findChannelGroup(groupId) : this.connection?.groups.findServerGroup(groupId);

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

    private sendClient() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        if(info) {
            this.uiEvents.fire_react("notify_client", {
                info: {
                    handlerId: this.connection.handlerId,
                    type: info.type,
                    clientDatabaseId: info.databaseId,
                    clientId: info.clientId,
                    clientUniqueId: info.uniqueId
                }
            });
        } else {
            this.uiEvents.fire_react("notify_client", {
                info: undefined
            });
        }
    }

    private sendChannelGroup() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        if(typeof info === "undefined") {
            this.uiEvents.fire_react("notify_channel_group", { group: undefined });
        } else {
            this.uiEvents.fire_react("notify_channel_group", { group: this.generateGroupInfo(info.channelGroup, "channel") });
        }
    }

    private sendServerGroups() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        if(info === undefined) {
            this.uiEvents.fire_react("notify_server_groups", { groups: [] });
        } else {
            this.uiEvents.fire_react("notify_server_groups", {
                groups: info.serverGroups.map(group => this.generateGroupInfo(group, "server"))
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
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_status", {
            status: info?.status || {
                away: false,
                speakerDisabled: false,
                speakerMuted: false,
                microphoneDisabled: false,
                microphoneMuted: false
            }
        });
    }

    private sendClientName() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_client_name", { name: info?.name });
    }

    private sendClientDescription() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_client_description", { description: info?.description });
    }

    private sendOnline() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_online", {
            status: {
                leaveTimestamp: info ? info.leaveTimestamp : 0,
                joinTimestamp: info ? info.joinTimestamp : 0
            }
        });
    }

    private sendCountry() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_country", {
            country: info ? {
                name: info.country.name,
                flag: info.country.flag
            } : {
                name: tr("Unknown"),
                flag: "xx"
            }
        });
    }

    private sendVolume() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_volume", {
            volume: info ? {
                volume: info.volume.volume,
                muted: info.volume.muted
            } : {
                volume: -1,
                muted: false
            }
        })
    }

    private sendVersion() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_version", {
            version: info ? {
                platform: info.version.platform,
                version: info.version.version
            } : {
                platform: tr("Unknown"),
                version: tr("Unknown")
            }
        })
    }

    private sendForum() {
        const info = this.connection?.getSelectedClientInfo().getInfo();
        this.uiEvents.fire_react("notify_forum", { forum: info?.forumAccount })
    }
}