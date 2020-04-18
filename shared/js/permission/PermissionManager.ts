import * as log from "tc-shared/log";
import {LogCategory, LogType} from "tc-shared/log";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {LaterPromise} from "tc-shared/utils/LaterPromise";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {CommandResult, ErrorID} from "tc-shared/connection/ServerConnectionDeclaration";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";

export class PermissionInfo {
    name: string;
    id: number;
    description: string;

    is_boolean() { return this.name.startsWith("b_"); }
    id_grant() : number {
        return this.id | (1 << 15);
    }
}

export class PermissionGroup {
    begin: number;
    end: number;
    deep: number;
    name: string;
}

export class GroupedPermissions {
    group: PermissionGroup;
    permissions: PermissionInfo[];
    children: GroupedPermissions[];
    parent: GroupedPermissions;
}

export class PermissionValue {
    readonly type: PermissionInfo;
    value: number;
    flag_skip: boolean;
    flag_negate: boolean;
    granted_value: number;

    constructor(type, value?) {
        this.type = type;
        this.value = value;
    }

    granted(requiredValue: number, required: boolean = true) : boolean {
        let result;
        result = this.value == -1 || this.value >= requiredValue || (this.value == -2 && requiredValue == -2 && !required);

        log.trace(LogCategory.PERMISSIONS,
            tr("Required permission test resulted for permission %s: %s. Required value: %s, Granted value: %s"),
            this.type ? this.type.name : "unknown",
            result ? tr("granted") : tr("denied"),
            requiredValue + (required ? " (" + tr("required") + ")" : ""),
            this.hasValue() ? this.value : tr("none")
        );
        return result;
    }

    hasValue() : boolean {
        return typeof(this.value) !== "undefined" && this.value != -2;
    }
    hasGrant() : boolean {
        return typeof(this.granted_value) !== "undefined" && this.granted_value != -2;
    }
}

export class NeededPermissionValue extends PermissionValue {
    constructor(type, value) {
        super(type, value);
    }
}

export type PermissionRequestKeys = {
    client_id?: number;
    channel_id?: number;
    playlist_id?: number;
}

export type PermissionRequest = PermissionRequestKeys & {
    timeout_id: any;
    promise: LaterPromise<PermissionValue[]>;
};

export namespace find {
    export type Entry = {
        type: "server" | "channel" | "client" | "client_channel" | "channel_group" | "server_group";
        value: number;
        id: number;
    }

    export type Client = Entry & {
        type: "client",

        client_id: number;
    }

    export type Channel = Entry & {
        type: "channel",

        channel_id: number;
    }

    export type Server = Entry & {
        type: "server"
    }

    export type ClientChannel = Entry & {
        type: "client_channel",

        client_id: number;
        channel_id: number;
    }

    export type ChannelGroup = Entry & {
        type: "channel_group",

        group_id: number;
    }

    export type ServerGroup = Entry & {
        type: "server_group",

        group_id: number;
    }
}

export type RequestLists =
    "requests_channel_permissions" |
    "requests_client_permissions" |
    "requests_client_channel_permissions" |
    "requests_playlist_permissions" |
    "requests_playlist_client_permissions";

export class PermissionManager extends AbstractCommandHandler {
    readonly handle: ConnectionHandler;

    permissionList: PermissionInfo[] = [];
    permissionGroups: PermissionGroup[] = [];
    neededPermissions: NeededPermissionValue[] = [];

    needed_permission_change_listener: {[permission: string]:(() => any)[]} = {};

    requests_channel_permissions: PermissionRequest[] = [];
    requests_client_permissions: PermissionRequest[] = [];
    requests_client_channel_permissions: PermissionRequest[] = [];
    requests_playlist_permissions: PermissionRequest[] = [];
    requests_playlist_client_permissions: PermissionRequest[] = [];

    requests_permfind: {
        timeout_id: number,
        permission: string,
        callback: (status: "success" | "error", data: any) => void
    }[] = [];

    initializedListener: ((initialized: boolean) => void)[] = [];
    private _cacheNeededPermissions: any;

    /* Static info mapping until TeaSpeak implements a detailed info */
    static readonly group_mapping: {name: string, deep: number}[] = [
        {name: tr("Global"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Virtual server management"), deep: 1},
            {name: tr("Administration"), deep: 1},
            {name: tr("Settings"), deep: 1},
        {name: tr("Virtual Server"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Administration"), deep: 1},
            {name: tr("Settings"), deep: 1},
        {name: tr("Channel"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Create"), deep: 1},
            {name: tr("Modify"), deep: 1},
            {name: tr("Delete"), deep: 1},
            {name: tr("Access"), deep: 1},
        {name: tr("Group"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Create"), deep: 1},
            {name: tr("Modify"), deep: 1},
            {name: tr("Delete"), deep: 1},
        {name: tr("Client"), deep: 0},
            {name: tr("Information"), deep: 1},
            {name: tr("Admin"), deep: 1},
            {name: tr("Basics"), deep: 1},
            {name: tr("Modify"), deep: 1},
        //TODO Music bot
        {name: tr("File Transfer"), deep: 0},
    ];
    private _group_mapping;

    public static parse_permission_bulk(json: any[], manager: PermissionManager) : PermissionValue[] {
        let permissions: PermissionValue[] = [];
        for(let perm of json) {
            if(perm["permid"] === undefined) continue;

            let perm_id = parseInt(perm["permid"]);
            let perm_grant = (perm_id & (1 << 15)) > 0;
            if(perm_grant)
                perm_id &= ~(1 << 15);

            let perm_info = manager.resolveInfo(perm_id);
            if(!perm_info) {
                log.warn(LogCategory.PERMISSIONS, tr("Got unknown permission id (%o/%o (%o))!"), perm["permid"], perm_id, perm["permsid"]);
                return;
            }

            let permission: PermissionValue;
            for(let ref_perm of permissions) {
                if(ref_perm.type == perm_info) {
                    permission = ref_perm;
                    break;
                }
            }
            if(!permission) {
                permission = new PermissionValue(perm_info, 0);
                permission.granted_value = undefined;
                permission.value = undefined;
                permissions.push(permission);
            }
            if(perm_grant) {
                permission.granted_value = parseInt(perm["permvalue"]);
            } else {
                permission.value = parseInt(perm["permvalue"]);
                permission.flag_negate = perm["permnegated"] == "1";
                permission.flag_skip = perm["permskip"] == "1";
            }
        }
        return permissions;
    }

    constructor(client: ConnectionHandler) {
        super(client.serverConnection);

        //FIXME? Dont register the handler like this?
        this.volatile_handler_boss = true;
        client.serverConnection.command_handler_boss().register_handler(this);

        this.handle = client;
    }

    destroy() {
        this.handle.serverConnection && this.handle.serverConnection.command_handler_boss().unregister_handler(this);
        this.needed_permission_change_listener = {};

        this.permissionList = undefined;
        this.permissionGroups = undefined;

        this.neededPermissions = undefined;

        /* delete all requests */
        for(const key of Object.keys(this))
            if(key.startsWith("requests"))
                delete this[key];

        this.initializedListener = undefined;
        this._cacheNeededPermissions = undefined;
    }

    handle_command(command: ServerCommand): boolean {
        switch (command.command) {
            case "notifyclientneededpermissions":
                this.onNeededPermissions(command.arguments);
                return true;
            case "notifypermissionlist":
                this.onPermissionList(command.arguments);
                return true;
            case "notifychannelpermlist":
                this.onChannelPermList(command.arguments);
                return true;
            case "notifyclientpermlist":
                this.onClientPermList(command.arguments);
                return true;
            case "notifyclientchannelpermlist":
                this.onChannelClientPermList(command.arguments);
                return true;
            case "notifyplaylistpermlist":
                this.onPlaylistPermList(command.arguments);
                return true;
            case "notifyplaylistclientpermlist":
                this.onPlaylistClientPermList(command.arguments);
                return true;
        }
        return false;
    }

    initialized() : boolean {
        return this.permissionList.length > 0;
    }

    public requestPermissionList() {
        this.handle.serverConnection.send_command("permissionlist");
    }

    private onPermissionList(json) {
        this.permissionList = [];
        this.permissionGroups = [];
        this._group_mapping = PermissionManager.group_mapping.slice();

        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, tr("Permission mapping"));
        const table_entries = [];
        let permission_id = 0;
        for(let e of json) {
            if(e["group_id_end"]) {
                let group = new PermissionGroup();
                group.begin = this.permissionGroups.length ? this.permissionGroups.last().end : 0;
                group.end = parseInt(e["group_id_end"]);
                group.deep = 0;
                group.name = tr("Group ") + e["group_id_end"];

                let info = this._group_mapping.pop_front();
                if(info) {
                    group.name = info.name;
                    group.deep = info.deep;
                }
                this.permissionGroups.push(group);
                continue;
            }

            let perm = new PermissionInfo();
            permission_id++;

            perm.name = e["permname"];
            perm.id = parseInt(e["permid"]) || permission_id; /* using permission_id as fallback if we dont have permid */
            perm.description = e["permdesc"];
            this.permissionList.push(perm);

            table_entries.push({
                "id": perm.id,
                "name": perm.name,
                "description": perm.description
            });
        }
        log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Permission list", table_entries);
        group.end();

        log.info(LogCategory.PERMISSIONS, tr("Got %i permissions"), this.permissionList.length);
        if(this._cacheNeededPermissions)
            this.onNeededPermissions(this._cacheNeededPermissions);
        for(let listener of this.initializedListener)
            listener(true);
    }

    private onNeededPermissions(json) {
        if(this.permissionList.length == 0) {
            log.warn(LogCategory.PERMISSIONS, tr("Got needed permissions but don't have a permission list!"));
            this._cacheNeededPermissions = json;
            return;
        }
        this._cacheNeededPermissions = undefined;

        let copy = this.neededPermissions.slice();
        let addcount = 0;

        let group = log.group(log.LogType.TRACE, LogCategory.PERMISSIONS, tr("Got %d needed permissions."), json.length);
        const table_entries = [];

        for(let e of json) {
            let entry: NeededPermissionValue = undefined;
            for(let p of copy) {
                if(p.type.id == e["permid"]) {
                    entry = p;
                    copy.remove(p);
                    break;
                }
            }
            if(!entry) {
                let info = this.resolveInfo(e["permid"]);
                if(info) {
                    entry = new NeededPermissionValue(info, -2);
                    this.neededPermissions.push(entry);
                } else {
                    log.warn(LogCategory.PERMISSIONS, tr("Could not resolve perm for id %s (%o|%o)"), e["permid"], e, info);
                    continue;
                }
                addcount++;
            }

            if(entry.value == parseInt(e["permvalue"])) continue;
            entry.value = parseInt(e["permvalue"]);

            for(const listener of this.needed_permission_change_listener[entry.type.name] || [])
                listener();

            table_entries.push({
                "permission": entry.type.name,
                "value": entry.value
            });
        }

        log.table(LogType.DEBUG, LogCategory.PERMISSIONS, "Needed client permissions", table_entries);
        group.end();

        log.debug(LogCategory.PERMISSIONS, tr("Dropping %o needed permissions and added %o permissions."), copy.length, addcount);
        for(let e of copy) {
            e.value = -2;
            for(const listener of this.needed_permission_change_listener[e.type.name] || [])
                listener();
        }
    }

    register_needed_permission(key: PermissionType, listener: () => any) {
        const array = this.needed_permission_change_listener[key] || [];
        array.push(listener);
        this.needed_permission_change_listener[key] = array;
    }

    unregister_needed_permission(key: PermissionType, listener: () => any) {
        const array = this.needed_permission_change_listener[key];
        if(!array) return;

        array.remove(listener);
        this.needed_permission_change_listener[key] = array.length > 0 ? array : undefined;
    }

    resolveInfo?(key: number | string | PermissionType) : PermissionInfo {
        for(let perm of this.permissionList)
            if(perm.id == key || perm.name == key)
                return perm;
        return undefined;
    }

    /* channel permission request */
    private onChannelPermList(json) {
        let channelId: number = parseInt(json[0]["cid"]);

        this.fullfill_permission_request("requests_channel_permissions", {
            channel_id: channelId
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_channel_permission_request(request: PermissionRequestKeys) {
        this.handle.serverConnection.send_command("channelpermlist", {"cid": request.channel_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_channel_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_channel_permissions", request, "error", error);
        });
    }

    requestChannelPermissions(channelId: number) : Promise<PermissionValue[]> {
        const keys: PermissionRequestKeys = {
            channel_id: channelId
        };
        return this.execute_permission_request("requests_channel_permissions", keys, this.execute_channel_permission_request.bind(this));
    }

    /* client permission request */
    private onClientPermList(json: any[]) {
        let client = parseInt(json[0]["cldbid"]);
        this.fullfill_permission_request("requests_client_permissions", {
            client_id: client
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_client_permission_request(request: PermissionRequestKeys) {
        this.handle.serverConnection.send_command("clientpermlist", {cldbid: request.client_id}).catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_client_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_client_permissions", request, "error", error);
        });
    }

    requestClientPermissions(client_id: number) : Promise<PermissionValue[]> {
        const keys: PermissionRequestKeys = {
            client_id: client_id
        };
        return this.execute_permission_request("requests_client_permissions", keys, this.execute_client_permission_request.bind(this));
    }

    /* client channel permission request */
    private onChannelClientPermList(json: any[]) {
        let client_id = parseInt(json[0]["cldbid"]);
        let channel_id = parseInt(json[0]["cid"]);

        this.fullfill_permission_request("requests_client_channel_permissions", {
            client_id: client_id,
            channel_id: channel_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_client_channel_permission_request(request: PermissionRequestKeys) {
        this.handle.serverConnection.send_command("channelclientpermlist", {cldbid: request.client_id, cid: request.channel_id})
        .catch(error => {
            if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                this.fullfill_permission_request("requests_client_channel_permissions", request, "success", []);
            else
                this.fullfill_permission_request("requests_client_channel_permissions", request, "error", error);
        });
    }

    requestClientChannelPermissions(client_id: number, channel_id: number) : Promise<PermissionValue[]> {
        const keys: PermissionRequestKeys = {
            client_id: client_id,
            channel_id: channel_id
        };
        return this.execute_permission_request("requests_client_channel_permissions", keys, this.execute_client_channel_permission_request.bind(this));
    }

    /* playlist permissions */
    private onPlaylistPermList(json: any[]) {
        let playlist_id = parseInt(json[0]["playlist_id"]);

        this.fullfill_permission_request("requests_playlist_permissions", {
            playlist_id: playlist_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_playlist_permission_request(request: PermissionRequestKeys) {
        this.handle.serverConnection.send_command("playlistpermlist", {playlist_id: request.playlist_id})
            .catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                    this.fullfill_permission_request("requests_playlist_permissions", request, "success", []);
                else
                    this.fullfill_permission_request("requests_playlist_permissions", request, "error", error);
            });
    }

    requestPlaylistPermissions(playlist_id: number) : Promise<PermissionValue[]> {
        const keys: PermissionRequestKeys = {
            playlist_id: playlist_id
        };
        return this.execute_permission_request("requests_playlist_permissions", keys, this.execute_playlist_permission_request.bind(this));
    }

    /* playlist client permissions */
    private onPlaylistClientPermList(json: any[]) {
        let playlist_id = parseInt(json[0]["playlist_id"]);
        let client_id = parseInt(json[0]["cldbid"]);

        this.fullfill_permission_request("requests_playlist_client_permissions", {
            playlist_id: playlist_id,
            client_id: client_id
        }, "success", PermissionManager.parse_permission_bulk(json, this.handle.permissions));
    }

    private execute_playlist_client_permission_request(request: PermissionRequestKeys) {
        this.handle.serverConnection.send_command("playlistclientpermlist", {playlist_id: request.playlist_id, cldbid: request.client_id})
            .catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT)
                    this.fullfill_permission_request("requests_playlist_client_permissions", request, "success", []);
                else
                    this.fullfill_permission_request("requests_playlist_client_permissions", request, "error", error);
            });
    }

    requestPlaylistClientPermissions(playlist_id: number, client_database_id: number) : Promise<PermissionValue[]> {
        const keys: PermissionRequestKeys = {
            playlist_id: playlist_id,
            client_id: client_database_id
        };
        return this.execute_permission_request("requests_playlist_client_permissions", keys, this.execute_playlist_client_permission_request.bind(this));
    }

    private readonly criteria_equal = (a, b) => {
        for(const criteria of ["client_id", "channel_id", "playlist_id"]) {
            if((typeof a[criteria] === "undefined") !== (typeof b[criteria] === "undefined")) return false;
            if(a[criteria] != b[criteria]) return false;
        }
        return true;
    };

    private execute_permission_request(list: RequestLists,
                                       criteria: PermissionRequestKeys,
                                       execute: (criteria: PermissionRequestKeys) => any) : Promise<PermissionValue[]> {
        for(const request of this[list])
            if(this.criteria_equal(request, criteria) && request.promise.time() + 1000 < Date.now())
                return request.promise;

        const result = Object.assign({
            timeout_id: setTimeout(() => this.fullfill_permission_request(list, criteria, "error", tr("timeout")), 5000),
            promise: new LaterPromise<PermissionValue[]>()
        }, criteria);
        this[list].push(result);
        execute(criteria);
        return result.promise;
    };

    private fullfill_permission_request(list: RequestLists, criteria: PermissionRequestKeys, status: "success" | "error", result: any) {
        for(const request of this[list]) {
            if(this.criteria_equal(request, criteria)) {
                this[list].remove(request);
                clearTimeout(request.timeout_id);
                status === "error" ? request.promise.rejected(result) : request.promise.resolved(result);
            }
        }
    }

    find_permission(...permissions: string[]) : Promise<find.Entry[]> {
        const permission_ids = [];
        for(const permission of permissions) {
            const info = this.resolveInfo(permission);
            if(!info) continue;

            permission_ids.push(info.id);
        }
        if(!permission_ids.length) return Promise.resolve([]);

        return new Promise<find.Entry[]>((resolve, reject) => {
            const single_handler = {
                command: "notifypermfind",
                function: command => {
                    const result: find.Entry[] = [];
                    for(const entry of command.arguments) {
                        const perm_id = parseInt(entry["p"]);
                        if(permission_ids.indexOf(perm_id) === -1) return; /* not our permfind result */

                        const value = parseInt(entry["v"]);
                        const type = parseInt(entry["t"]);

                        let data;
                        switch (type) {
                            case 0:
                                data = {
                                    type: "server_group",
                                    group_id: parseInt(entry["id1"]),
                                } as find.ServerGroup;
                                break;
                            case 1:
                                data = {
                                    type: "client",
                                    client_id: parseInt(entry["id2"]),
                                } as find.Client;
                                break;
                            case 2:
                                data = {
                                    type: "channel",
                                    channel_id: parseInt(entry["id2"]),
                                } as find.Channel;
                                break;
                            case 3:
                                data = {
                                    type: "channel_group",
                                    group_id: parseInt(entry["id1"]),
                                } as find.ChannelGroup;
                                break;
                            case 4:
                                data = {
                                    type: "client_channel",
                                    client_id: parseInt(entry["id1"]),
                                    channel_id: parseInt(entry["id1"]),
                                } as find.ClientChannel;
                                break;
                            default:
                                continue;
                        }

                        data.id = perm_id;
                        data.value = value;
                        result.push(data);
                    }

                    resolve(result);
                    return true;
                }
            };
            this.handler_boss.register_single_handler(single_handler);

            this.connection.send_command("permfind", permission_ids.map(e => { return {permid: e }})).catch(error => {
                this.handler_boss.remove_single_handler(single_handler);

                if(error instanceof CommandResult && error.id == ErrorID.EMPTY_RESULT) {
                    resolve([]);
                    return;
                }
                reject(error);
            });
        });
    }

    neededPermission(key: number | string | PermissionType | PermissionInfo) : NeededPermissionValue {
        for(let perm of this.neededPermissions)
            if(perm.type.id == key || perm.type.name == key || perm.type == key)
                return perm;

        log.debug(LogCategory.PERMISSIONS, tr("Could not resolve grant permission %o. Creating a new one."), key);
        let info = key instanceof PermissionInfo ? key : this.resolveInfo(key);
        if(!info) {
            log.warn(LogCategory.PERMISSIONS, tr("Requested needed permission with invalid key! (%o)"), key);
            return new NeededPermissionValue(undefined, -2);
        }
        let result = new NeededPermissionValue(info, -2);
        this.neededPermissions.push(result);
        return result;
    }

    groupedPermissions() : GroupedPermissions[] {
        let result: GroupedPermissions[] = [];
        let current: GroupedPermissions;

        for(let group of this.permissionGroups) {
            if(group.deep == 0) {
                current = new GroupedPermissions();
                current.group = group;
                current.parent = undefined;
                current.children = [];
                current.permissions = [];
                result.push(current);
            } else {
                if(!current) {
                    throw tr("invalid order!");
                } else {
                    while(group.deep <= current.group.deep)
                        current = current.parent;

                    let parent = current;
                    current = new GroupedPermissions();
                    current.group = group;
                    current.parent = parent;
                    current.children = [];
                    current.permissions = [];
                    parent.children.push(current);
                }
            }

            for(let permission of this.permissionList)
                if(permission.id > current.group.begin && permission.id <= current.group.end)
                    current.permissions.push(permission);

        }

        return result;
    }

    /**
     * Generates an enum with all know permission types, used for the enum above
     */
    export_permission_types() {
        let result = "";
        result = result + "enum PermissionType {\n";

        for(const permission of this.permissionList) {
            if(!permission.name) continue;
            result = result + "\t" + permission.name.toUpperCase() + " = \"" + permission.name.toLowerCase() + "\", /* Permission ID: " + permission.id + " */\n";
        }

        result = result + "}";
        return result;
    }
}