import {LaterPromise} from "tc-shared/utils/LaterPromise";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {PermissionManager, PermissionValue} from "tc-shared/permission/PermissionManager";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {AbstractCommandHandler} from "tc-shared/connection/AbstractCommandHandler";
import {Registry} from "tc-shared/events";

export enum GroupType {
    QUERY,
    TEMPLATE,
    NORMAL
}

export enum GroupTarget {
    SERVER,
    CHANNEL
}

export class GroupProperties {
    iconid: number = 0;

    sortid: number = 0;
    savedb: boolean = false;
    namemode: number = 0;
}

export class GroupPermissionRequest {
    group_id: number;
    promise: LaterPromise<PermissionValue[]>;
}

export interface GroupEvents {
    notify_deleted: {},

    notify_properties_updated: {
        updated_properties: {[Key in keyof GroupProperties]: GroupProperties[Key]};
        group_properties: GroupProperties
    }
}

export class Group {
    readonly handle: GroupManager;

    readonly events: Registry<GroupEvents>;
    readonly properties: GroupProperties = new GroupProperties();

    readonly id: number;
    readonly target: GroupTarget;
    readonly type: GroupType;

    name: string;
    requiredModifyPower: number = 0;
    requiredMemberAddPower: number = 0;
    requiredMemberRemovePower: number = 0;


    constructor(handle: GroupManager, id: number, target: GroupTarget, type: GroupType, name: string) {
        this.events = new Registry<GroupEvents>();

        this.handle = handle;
        this.id = id;
        this.target = target;
        this.type = type;
        this.name = name;
    }

    updateProperties(properties: {key: string, value: string}[]) {
        let updates = {};

        for(const { key, value } of properties) {
            if(!JSON.map_field_to(this.properties, value, key))
                continue; /* no updates */
            if(key === "iconid")
                this.properties.iconid = this.properties.iconid >>> 0;
            updates[key] = this.properties[key];
        }

        this.events.fire("notify_properties_updated", {
            group_properties: this.properties,
            updated_properties: updates as any
        });
    }
}

export class GroupManager extends AbstractCommandHandler {
    readonly handle: ConnectionHandler;

    serverGroups: Group[] = [];
    channelGroups: Group[] = [];

    private requests_group_permissions: GroupPermissionRequest[] = [];
    constructor(client: ConnectionHandler) {
        super(client.serverConnection);

        client.serverConnection.command_handler_boss().register_handler(this);
        this.handle = client;
    }

    destroy() {
        this.handle.serverConnection && this.handle.serverConnection.command_handler_boss().unregister_handler(this);
        this.serverGroups = undefined;
        this.channelGroups = undefined;
    }

    handle_command(command: ServerCommand): boolean {
        switch (command.command) {
            case "notifyservergrouplist":
            case "notifychannelgrouplist":
                this.handle_grouplist(command.arguments);
                return true;
            case "notifyservergrouppermlist":
            case "notifychannelgrouppermlist":
                this.handle_group_permission_list(command.arguments);
                return true;
        }
        return false;
    }

    requestGroups(){
        this.handle.serverConnection.send_command("servergrouplist");
        this.handle.serverConnection.send_command("channelgrouplist");
    }

    static sorter() : (a: Group, b: Group) => number {
        return (a, b) => {
            if(!a)
                return b ? 1 : 0;
            if(!b)
                return a ? -1 : 0;

            if(a.properties.sortid > b.properties.sortid)
                return 1;
            if(a.properties.sortid < b.properties.sortid)
                return -1;

            if(a.id < b.id)
                return -1;
            if(a.id > b.id)
                return 1;
            return 0;
        }
    }

    serverGroup?(id: number) : Group {
        for(let group of this.serverGroups)
            if(group.id == id) return group;
        return undefined;
    }

    channelGroup?(id: number) : Group {
        for(let group of this.channelGroups)
            if(group.id == id) return group;
        return undefined;
    }

    private handle_grouplist(json) {
        let target : GroupTarget;
        if(json[0]["sgid"]) target = GroupTarget.SERVER;
        else if(json[0]["cgid"]) target = GroupTarget.CHANNEL;
        else {
            log.error(LogCategory.CLIENT, tr("Could not resolve group target! => %o"), json[0]);
            return;
        }

        let group_list = target == GroupTarget.SERVER ? this.serverGroups : this.channelGroups;
        const deleted_groups = group_list.slice(0);

        for(const group_data of json) {
            let type : GroupType;
            switch (parseInt(group_data["type"])) {
                case 0: type = GroupType.TEMPLATE; break;
                case 1: type = GroupType.NORMAL; break;
                case 2: type = GroupType.QUERY; break;
                default:
                    log.error(LogCategory.CLIENT, tr("Invalid group type: %o for group %s"), group_data["type"],group_data["name"]);
                    continue;
            }

            const group_id = parseInt(target == GroupTarget.SERVER ? group_data["sgid"] : group_data["cgid"]);
            let group_index = deleted_groups.findIndex(e => e.id === group_id);
            let group: Group;
            if(group_index === -1) {
                group = new Group(this, group_id, target, type, group_data["name"]);
                group_list.push(group);
            } else
                group = deleted_groups.splice(group_index, 1)[0];

            const property_blacklist = [
                "sgid", "cgid", "type", "name",

                "n_member_removep", "n_member_addp", "n_modifyp"
            ];
            group.updateProperties(Object.keys(group_data).filter(e => property_blacklist.findIndex(a => a === e) === -1).map(e => { return { key: e, value: group_data[e] } }));

            group.requiredMemberRemovePower = parseInt(group_data["n_member_removep"]);
            group.requiredMemberAddPower = parseInt(group_data["n_member_addp"]);
            group.requiredModifyPower = parseInt(group_data["n_modifyp"]);
        }

        for(const deleted of deleted_groups) {
            group_list.remove(deleted);
            deleted.events.fire("notify_deleted");
        }
    }

    request_permissions(group: Group) : Promise<PermissionValue[]> { //database_empty_result
        for(let request of this.requests_group_permissions)
            if(request.group_id == group.id && request.promise.time() + 1000 > Date.now())
                return request.promise;
        let req = new GroupPermissionRequest();
        req.group_id = group.id;
        req.promise = new LaterPromise<PermissionValue[]>();
        this.requests_group_permissions.push(req);

        this.handle.serverConnection.send_command(group.target == GroupTarget.SERVER ? "servergrouppermlist" : "channelgrouppermlist", {
            cgid: group.id,
            sgid: group.id
        }).catch(error => {
            if(error instanceof CommandResult && error.id == 0x0501)
                req.promise.resolved([]);
            else
                req.promise.rejected(error);
        }).then(() => {
            //No notify handler
            setTimeout(() => {
                if(this.requests_group_permissions.remove(req))
                    req.promise.rejected(tr("no response"));
            }, 1000);
        });
        return req.promise;
    }

    private handle_group_permission_list(json: any[]) {
        let group = json[0]["sgid"] ? this.serverGroup(parseInt(json[0]["sgid"])) : this.channelGroup(parseInt(json[0]["cgid"]));
        if(!group) {
            log.error(LogCategory.PERMISSIONS, tr("Got group permissions for group %o/%o, but its not a registered group!"), json[0]["sgid"], json[0]["cgid"]);
            return;
        }
        let requests: GroupPermissionRequest[] = [];
        for(let req of this.requests_group_permissions)
            if(req.group_id == group.id)
                requests.push(req);

        if(requests.length == 0) {
            log.warn(LogCategory.PERMISSIONS, tr("Got group permissions for group %o/%o, but it was never requested!"), json[0]["sgid"], json[0]["cgid"]);
            return;
        }

        let permissions = PermissionManager.parse_permission_bulk(json, this.handle.permissions);
        for(let req of requests) {
            this.requests_group_permissions.remove(req);
            req.promise.resolved(permissions);
        }
    }
}