import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {
    ClientForumInfo,
    ClientInfoType,
    ClientStatusInfo,
    ClientVersionInfo
} from "tc-shared/ui/frames/side/ClientInfoDefinitions";
import {ClientEntry, ClientType, LocalClientEntry} from "tc-shared/tree/Client";
import {Registry} from "tc-shared/events";
import * as i18nc from "tc-shared/i18n/country";

export type CachedClientInfoCategory = "name" | "description" | "online-state" | "country" | "volume" | "status" | "forum-account" | "group-channel" | "groups-server" | "version";

export type CachedClientInfo = {
    type: ClientInfoType;
    name: string,
    uniqueId: string,
    databaseId: number,
    clientId: number,

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

export interface ClientInfoManagerEvents {
    notify_client_changed: { newClient: ClientEntry | undefined },
    notify_cache_changed: { category: CachedClientInfoCategory },
}

export class SelectedClientInfo {
    readonly events: Registry<ClientInfoManagerEvents>;

    private readonly connection: ConnectionHandler;
    private readonly listenerConnection: (() => void)[];

    private listenerClient: (() => void)[];
    private currentClient: ClientEntry | undefined;
    private currentClientStatus: CachedClientInfo | undefined;

    constructor(connection: ConnectionHandler) {
        this.connection = connection;
        this.events = new Registry<ClientInfoManagerEvents>();

        this.listenerClient = [];
        this.listenerConnection = [];
        this.listenerConnection.push(connection.channelTree.events.on("notify_client_leave_view", event => {
            if(event.client !== this.currentClient) {
                return;
            }

            this.currentClientStatus.leaveTimestamp = Date.now() / 1000;
            this.currentClientStatus.clientId = 0;
            this.currentClient = undefined;
            this.unregisterClientEvents();
            this.events.fire("notify_cache_changed", { category: "online-state" });
        }));

        this.listenerConnection.push(connection.events().on("notify_connection_state_changed", event => {
            if(event.newState !== ConnectionState.CONNECTED && this.currentClientStatus) {
                this.currentClient = undefined;
                this.currentClientStatus.leaveTimestamp = Date.now() / 1000;
                this.events.fire("notify_cache_changed", { category: "online-state" });
            }
        }));
    }

    destroy() {
        this.listenerConnection.forEach(callback => callback());
        this.listenerConnection.splice(0, this.listenerConnection.length);

        this.unregisterClientEvents();
    }

    getInfo() : CachedClientInfo {
        return this.currentClientStatus;
    }

    setClient(client: ClientEntry | undefined) {
        if(this.currentClient === client) {
            return;
        }

        if(client.channelTree.client !== this.connection) {
            throw tr("client does not belong to current connection handler");
        }

        this.unregisterClientEvents();
        this.currentClient = client;
        this.currentClientStatus = undefined;
        if(this.currentClient) {
            this.currentClient.updateClientVariables().then(undefined);
            this.registerClientEvents(this.currentClient);
            this.initializeClientInfo(this.currentClient);
        }

        this.events.fire("notify_client_changed", { newClient: client });
    }

    getClient() : ClientEntry | undefined {
        return this.currentClient;
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
                this.events.fire("notify_cache_changed", { category: "name" });
            }

            if('client_description' in event.updated_properties) {
                this.currentClientStatus.description = event.client_properties.client_description;
                this.events.fire("notify_cache_changed", { category: "description" });
            }

            if('client_channel_group_id' in event.updated_properties) {
                this.currentClientStatus.channelGroup = event.client_properties.client_channel_group_id;
                this.events.fire("notify_cache_changed", { category: "group-channel" });
            }

            if('client_servergroups' in event.updated_properties) {
                this.currentClientStatus.serverGroups = client.assignedServerGroupIds();
                this.events.fire("notify_cache_changed", { category: "groups-server" });
            }

            /* Can happen since that variable isn't in view on client appearance */
            if('client_lastconnected' in event.updated_properties) {
                this.currentClientStatus.joinTimestamp = event.client_properties.client_lastconnected;
                this.events.fire("notify_cache_changed", { category: "online-state" });
            }

            if('client_country' in event.updated_properties) {
                this.updateCachedCountry(client);
                this.events.fire("notify_cache_changed", { category: "country" });
            }

            for(const key of ["client_away", "client_away_message", "client_input_muted", "client_input_hardware", "client_output_muted", "client_output_hardware"]) {
                if(key in event.updated_properties) {
                    this.updateCachedClientStatus(client);
                    this.events.fire("notify_cache_changed", { category: "status" });
                    break;
                }
            }

            if('client_platform' in event.updated_properties || 'client_version' in event.updated_properties) {
                this.currentClientStatus.version = {
                    platform: client.properties.client_platform,
                    version: client.properties.client_version
                };
                this.events.fire("notify_cache_changed", { category: "version" });
            }

            if('client_teaforo_flags' in event.updated_properties || 'client_teaforo_name' in event.updated_properties || 'client_teaforo_id' in event.updated_properties) {
                this.updateForumAccount(client);
                this.events.fire("notify_cache_changed", { category: "forum-account" });
            }
        }));

        events.push(client.events.on("notify_audio_level_changed", () => {
            this.updateCachedVolume(client);
            this.events.fire("notify_cache_changed", { category: "volume" });
        }));

        events.push(client.events.on("notify_mute_state_change", () => {
            this.updateCachedVolume(client);
            this.events.fire("notify_cache_changed", { category: "volume" });
        }));
    }


    private updateCachedClientStatus(client: ClientEntry) {
        this.currentClientStatus.status = {
            away: client.properties.client_away ? client.properties.client_away_message ? client.properties.client_away_message : true : false,
            microphoneMuted: client.properties.client_input_muted,
            microphoneDisabled: !client.properties.client_input_hardware,
            speakerMuted: client.properties.client_output_muted,
            speakerDisabled: !client.properties.client_output_hardware
        };
    }

    private updateCachedCountry(client: ClientEntry) {
        this.currentClientStatus.country = {
            flag: client.properties.client_country,
            name: i18nc.getCountryName(client.properties.client_country.toUpperCase()),
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
            type: client instanceof LocalClientEntry ? "self" : client.properties.client_type === ClientType.CLIENT_QUERY ? "query" : "voice",
            name: client.properties.client_nickname,
            databaseId: client.properties.client_database_id,
            uniqueId: client.properties.client_unique_identifier,
            clientId: client.clientId(),

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
}