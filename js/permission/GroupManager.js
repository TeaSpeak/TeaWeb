var GroupType;
(function (GroupType) {
    GroupType[GroupType["QUERY"] = 0] = "QUERY";
    GroupType[GroupType["TEMPLATE"] = 1] = "TEMPLATE";
    GroupType[GroupType["NORMAL"] = 2] = "NORMAL";
})(GroupType || (GroupType = {}));
var GroupTarget;
(function (GroupTarget) {
    GroupTarget[GroupTarget["SERVER"] = 0] = "SERVER";
    GroupTarget[GroupTarget["CHANNEL"] = 1] = "CHANNEL";
})(GroupTarget || (GroupTarget = {}));
class Group {
    constructor(handle, id, target, type, name) {
        this.properties = {
            iconid: 0
        };
        this.requiredModifyPower = 0;
        this.requiredMemberAddPower = 0;
        this.requiredMemberRemovePower = 0;
        this.handle = handle;
        this.id = id;
        this.target = target;
        this.type = type;
        this.name = name;
    }
    updateProperty(key, value) {
        this.properties[key] = value;
        if (key == "iconid") {
            const _this = this;
            console.log("Icon id " + _this.properties.iconid);
            this.handle.handle.channelTree.clientsByGroup(this).forEach(client => {
                client.updateGroupIcon(_this);
            });
        }
    }
}
class GroupManager {
    constructor(client) {
        this.serverGroups = [];
        this.channelGroups = [];
        this.handle = client;
        this.handle.serverConnection.commandHandler["notifyservergrouplist"] = this.onServerGroupList.bind(this);
        this.handle.serverConnection.commandHandler["notifychannelgrouplist"] = this.onServerGroupList.bind(this);
    }
    requestGroups() {
        this.handle.serverConnection.sendCommand("servergrouplist");
        this.handle.serverConnection.sendCommand("channelgrouplist");
    }
    serverGroup(id) {
        for (let group of this.serverGroups)
            if (group.id == id)
                return group;
        return undefined;
    }
    channelGroup(id) {
        for (let group of this.channelGroups)
            if (group.id == id)
                return group;
        return undefined;
    }
    onServerGroupList(json) {
        let target;
        if (json[0]["sgid"])
            target = GroupTarget.SERVER;
        else if (json[0]["cgid"])
            target = GroupTarget.CHANNEL;
        else {
            console.error("Could not resolve group target! => " + json[0]);
            return;
        }
        if (target == GroupTarget.SERVER)
            this.serverGroups = [];
        else
            this.channelGroups = [];
        for (let groupData of json) {
            let type;
            switch (Number.parseInt(groupData["type"])) {
                case 0:
                    type = GroupType.TEMPLATE;
                    break;
                case 1:
                    type = GroupType.NORMAL;
                    break;
                case 2:
                    type = GroupType.QUERY;
                    break;
                default:
                    console.error("Invalid group type: " + groupData["type"] + " for group " + groupData["name"]);
                    continue;
            }
            let group = new Group(this, target == GroupTarget.SERVER ? groupData["sgid"] : groupData["cgid"], target, type, groupData["name"]);
            for (let key in groupData) {
                if (key == "sgid")
                    continue;
                if (key == "cgid")
                    continue;
                if (key == "type")
                    continue;
                if (key == "name")
                    continue;
                group.updateProperty(key, groupData[key]);
            }
            group.requiredMemberRemovePower = groupData["n_member_removep"];
            group.requiredMemberAddPower = groupData["n_member_addp"];
            group.requiredModifyPower = groupData["n_modifyp"];
            if (target == GroupTarget.SERVER)
                this.serverGroups.push(group);
            else
                this.channelGroups.push(group);
        }
        console.log("Got " + json.length + " new " + target + " groups:");
    }
}
//# sourceMappingURL=GroupManager.js.map