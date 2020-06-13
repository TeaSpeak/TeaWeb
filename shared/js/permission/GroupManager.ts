import {LaterPromise} from "tc-shared/utils/LaterPromise";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {PermissionManager, PermissionValue} from "tc-shared/permission/PermissionManager";
import {ServerCommand} from "tc-shared/connection/ConnectionBase";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ConnectionEvents, ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
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

export interface GroupManagerEvents {
    notify_reset: {},
    notify_groups_created: {
        groups: Group[],
        cause: "list-update" | "initialize" | "user-action"
    },
    notify_groups_deleted: {
        groups: Group[],
        cause: "list-update" | "reset" | "user-action"
    }
}

export interface GroupEvents {
    notify_group_deleted: { },

    notify_properties_updated: {
        updated_properties: {[Key in keyof GroupProperties]: GroupProperties[Key]};
        group_properties: GroupProperties
    },

    notify_needed_powers_updated: { }
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

        if(Object.keys(updates).length === 0)
            return;

        this.events.fire("notify_properties_updated", {
            group_properties: this.properties,
            updated_properties: updates as any
        });
    }
}

export class GroupManager extends AbstractCommandHandler {
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

    readonly events = new Registry<GroupManagerEvents>();
    readonly connectionHandler: ConnectionHandler;

    serverGroups: Group[] = [];
    channelGroups: Group[] = [];

    private readonly connectionStateListener;
    private groupPermissionRequests: GroupPermissionRequest[] = [];

    constructor(client: ConnectionHandler) {
        super(client.serverConnection);
        this.connectionHandler = client;

        this.connectionStateListener = (event: ConnectionEvents["notify_connection_state_changed"]) => {
            if(event.new_state === ConnectionState.DISCONNECTING || event.new_state === ConnectionState.UNCONNECTED || event.new_state === ConnectionState.CONNECTING)
                this.reset();
        };

        client.serverConnection.command_handler_boss().register_handler(this);
        client.events().on("notify_connection_state_changed", this.connectionStateListener);

        this.reset();
    }

    destroy() {
        this.reset();
        this.connectionHandler.events().off("notify_connection_state_changed", this.connectionStateListener);
        this.connectionHandler.serverConnection?.command_handler_boss().unregister_handler(this);
        this.serverGroups = undefined;
        this.channelGroups = undefined;
    }

    reset() {
        if(this.serverGroups.length === 0 && this.channelGroups.length === 0)
            return;

        log.debug(LogCategory.PERMISSIONS, tr("Resetting server/channel groups"));
        this.serverGroups = [];
        this.channelGroups = [];

        for(const permission of this.groupPermissionRequests)
            permission.promise.rejected(tr("Group manager reset"));
        this.groupPermissionRequests = [];
        this.events.fire("notify_reset");
    }

    handle_command(command: ServerCommand): boolean {
        switch (command.command) {
            case "notifyservergrouplist":
                this.handleGroupList(command.arguments, GroupTarget.SERVER);
                return true;
            case "notifychannelgrouplist":
                this.handleGroupList(command.arguments, GroupTarget.CHANNEL);
                return true;

            case "notifyservergrouppermlist":
            case "notifychannelgrouppermlist":
                this.handleGroupPermissionList(command.arguments);
                return true;
        }
        return false;
    }

    requestGroups(){
        this.connectionHandler.serverConnection.send_command("servergrouplist", {}, { process_result: false }).catch(error => {
            log.warn(LogCategory.PERMISSIONS, tr("Failed to request the server group list: %o"), error);
        });

        this.connectionHandler.serverConnection.send_command("channelgrouplist", {}, { process_result: false }).catch(error => {
            log.warn(LogCategory.PERMISSIONS, tr("Failed to request the channel group list: %o"), error);
        });
    }

    findServerGroup(id: number) : Group | undefined {
        for(let group of this.serverGroups)
            if(group.id === id)
                return group;
        return undefined;
    }

    findChannelGroup(id: number) : Group | undefined {
        for(let group of this.channelGroups)
            if(group.id === id)
                return group;
        return undefined;
    }

    private handleGroupList(json: any[], target: GroupTarget) {
        let groupList = target == GroupTarget.SERVER ? this.serverGroups : this.channelGroups;
        const deleteGroups = groupList.slice(0);
        const newGroups: Group[] = [];

        const isInitialList = groupList.length === 0;
        for(const groupData of json) {
            let type : GroupType;
            switch (parseInt(groupData["type"])) {
                case 0: type = GroupType.TEMPLATE; break;
                case 1: type = GroupType.NORMAL; break;
                case 2: type = GroupType.QUERY; break;
                default:
                    log.error(LogCategory.CLIENT, tr("Invalid group type: %o for group %s"), groupData["type"], groupData["name"]);
                    continue;
            }

            const groupId = parseInt(target == GroupTarget.SERVER ? groupData["sgid"] : groupData["cgid"]);
            let groupIndex = deleteGroups.findIndex(e => e.id === groupId);

            let group: Group;
            if(groupIndex === -1) {
                group = new Group(this, groupId, target, type, groupData["name"]);
                groupList.push(group);
                newGroups.push(group);
            } else {
                group = deleteGroups.splice(groupIndex, 1)[0];
            }

            const property_blacklist = [
                "sgid", "cgid", "type", "name",

                "n_member_removep", "n_member_addp", "n_modifyp"
            ];

            group.requiredMemberRemovePower = parseInt(groupData["n_member_removep"]);
            group.requiredMemberAddPower = parseInt(groupData["n_member_addp"]);
            group.requiredModifyPower = parseInt(groupData["n_modifyp"]);
            group.updateProperties(Object.keys(groupData).filter(e => property_blacklist.findIndex(a => a === e) === -1).map(e => { return { key: e, value: groupData[e] } }));
            group.events.fire("notify_needed_powers_updated");
        }

        if(newGroups.length !== 0) {
            this.events.fire("notify_groups_created", { groups: newGroups, cause: isInitialList ? "initialize" : "list-update" });
        }

        for(const deleted of deleteGroups) {
            groupList.remove(deleted);
            deleted.events.fire("notify_group_deleted");
        }

        if(deleteGroups.length !== 0) {
            this.events.fire("notify_groups_deleted", { groups: deleteGroups, cause: "list-update" });
        }
    }

    request_permissions(group: Group) : Promise<PermissionValue[]> {
        for(let request of this.groupPermissionRequests)
            if(request.group_id == group.id && request.promise.time() + 1000 > Date.now())
                return request.promise;
        let req = new GroupPermissionRequest();
        req.group_id = group.id;
        req.promise = new LaterPromise<PermissionValue[]>();
        this.groupPermissionRequests.push(req);

        this.connectionHandler.serverConnection.send_command(group.target == GroupTarget.SERVER ? "servergrouppermlist" : "channelgrouppermlist", {
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
                if(this.groupPermissionRequests.remove(req))
                    req.promise.rejected(tr("no response"));
            }, 1000);
        });
        return req.promise;
    }

    private handleGroupPermissionList(json: any[]) {
        let group = json[0]["sgid"] ? this.findServerGroup(parseInt(json[0]["sgid"])) : this.findChannelGroup(parseInt(json[0]["cgid"]));
        if(!group) {
            log.error(LogCategory.PERMISSIONS, tr("Got group permissions for group %o/%o, but its not a registered group!"), json[0]["sgid"], json[0]["cgid"]);
            return;
        }
        let requests: GroupPermissionRequest[] = [];
        for(let req of this.groupPermissionRequests)
            if(req.group_id == group.id)
                requests.push(req);

        if(requests.length == 0) {
            log.warn(LogCategory.PERMISSIONS, tr("Got group permissions for group %o/%o, but it was never requested!"), json[0]["sgid"], json[0]["cgid"]);
            return;
        }

        let permissions = PermissionManager.parse_permission_bulk(json, this.connectionHandler.permissions);
        for(let req of requests) {
            this.groupPermissionRequests.remove(req);
            req.promise.resolved(permissions);
        }
    }
}