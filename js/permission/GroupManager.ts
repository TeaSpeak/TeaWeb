
enum GroupType {
    QUERY,
    TEMPLATE,
    NORMAL
}

enum GroupTarget {
    SERVER,
    CHANNEL
}

class GroupProperties {
    iconid: number = 0;

    sortid: number = 0;
    savedb: boolean = false;
    namemode: number = 0;
}

class GroupPermissionRequest {
    group_id: number;
    promise: LaterPromise<PermissionValue[]>;
}

class Group {
    properties: GroupProperties = new GroupProperties();

    readonly handle: GroupManager;
    readonly id: number;
    readonly target: GroupTarget;
    readonly type: GroupType;

    name: string;
    requiredModifyPower: number = 0;
    requiredMemberAddPower: number = 0;
    requiredMemberRemovePower: number = 0;


    constructor(handle: GroupManager, id: number, target: GroupTarget, type: GroupType, name: string) {
        this.handle = handle;
        this.id = id;
        this.target = target;
        this.type = type;
        this.name = name;
    }

    updateProperty(key, value) {
        JSON.map_field_to(this.properties, value, key);

        if(key == "iconid") {
            this.properties.iconid = (new Uint32Array([this.properties.iconid]))[0];
            console.log("Icon id " + this.properties.iconid);
            this.handle.handle.channelTree.clientsByGroup(this).forEach(client => {
                client.updateGroupIcon(this);
            });
        }
    }
}

class GroupManager {
    readonly handle: TSClient;

    serverGroups: Group[] = [];
    channelGroups: Group[] = [];

    private requests_group_permissions: GroupPermissionRequest[] = [];
    constructor(client: TSClient) {
        this.handle = client;

        this.handle.serverConnection.commandHandler["notifyservergrouplist"] = this.onServerGroupList.bind(this);
        this.handle.serverConnection.commandHandler["notifychannelgrouplist"] = this.onServerGroupList.bind(this);

        this.handle.serverConnection.commandHandler["notifyservergrouppermlist"] = this.onPermissionList.bind(this);
        this.handle.serverConnection.commandHandler["notifychannelgrouppermlist"] = this.onPermissionList.bind(this);
    }

    requestGroups(){
        this.handle.serverConnection.sendCommand("servergrouplist");
        this.handle.serverConnection.sendCommand("channelgrouplist");
    }

    static sorter() : (a: Group, b: Group) => number {
        return (a, b) => {
            if(a.properties.sortid < b.properties.sortid)
                return 1;
            if(a.properties.sortid > b.properties.sortid)
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

    private onServerGroupList(json) {
        let target : GroupTarget;
        if(json[0]["sgid"]) target = GroupTarget.SERVER;
        else if(json[0]["cgid"]) target = GroupTarget.CHANNEL;
        else {
            console.error("Could not resolve group target! => " + json[0]);
            return;
        }

        if(target == GroupTarget.SERVER)
            this.serverGroups = [];
        else
            this.channelGroups = [];

        for(let groupData of json) {
            let type : GroupType;
            switch (Number.parseInt(groupData["type"])) {
                case 0: type = GroupType.TEMPLATE; break;
                case 1: type = GroupType.NORMAL; break;
                case 2: type = GroupType.QUERY; break;
                default:
                    console.error("Invalid group type: " + groupData["type"] + " for group " + groupData["name"]);
                    continue;
            }

            let group = new Group(this,parseInt(target == GroupTarget.SERVER ? groupData["sgid"] : groupData["cgid"]), target, type, groupData["name"]);
            for(let key in groupData as any) {
                if(key == "sgid") continue;
                if(key == "cgid") continue;
                if(key == "type") continue;
                if(key == "name") continue;

                group.updateProperty(key, groupData[key]);
            }

            group.requiredMemberRemovePower = groupData["n_member_removep"];
            group.requiredMemberAddPower = groupData["n_member_addp"];
            group.requiredModifyPower = groupData["n_modifyp"];

            if(target == GroupTarget.SERVER)
                this.serverGroups.push(group);
            else
                this.channelGroups.push(group);
        }

        console.log("Got " + json.length + " new " + target + " groups:");
    }

    request_permissions(group: Group) : Promise<PermissionValue[]> { //database_empty_result
        for(let request of this.requests_group_permissions)
            if(request.group_id == group.id && request.promise.time() + 1000 > Date.now())
                return request.promise;
        let req = new GroupPermissionRequest();
        req.group_id = group.id;
        req.promise = new LaterPromise<PermissionValue[]>();
        this.requests_group_permissions.push(req);

        this.handle.serverConnection.sendCommand(group.target == GroupTarget.SERVER ? "servergrouppermlist" : "channelgrouppermlist", {
            cgid: group.id,
            sgid: group.id
        }).catch(error => {
            if(error instanceof CommandResult && error.id == 0x0501)
                req.promise.resolved([]);
            else
                req.promise.rejected(error);
        });
        return req.promise;
    }

    private onPermissionList(json: any[]) {
        let group = json[0]["sgid"] ? this.serverGroup(parseInt(json[0]["sgid"])) : this.channelGroup(parseInt(json[0]["cgid"]));
        if(!group) {
            log.error(LogCategory.PERMISSIONS, "Got group permissions for group %o/%o, but its not a registered group!", json[0]["sgid"], json[0]["cgid"]);
            return;
        }
        let requests: GroupPermissionRequest[] = [];
        for(let req of this.requests_group_permissions)
            if(req.group_id == group.id)
                requests.push(req);

        if(requests.length == 0) {
            log.warn(LogCategory.PERMISSIONS, "Got group permissions for group %o/%o, but it was never requested!", json[0]["sgid"], json[0]["cgid"]);
            return;
        }

        let permissions = PermissionManager.parse_permission_bulk(json, this.handle.permissions);
        for(let req of requests) {
            this.requests_group_permissions.remove(req);
            req.promise.resolved(permissions);
        }
    }
}