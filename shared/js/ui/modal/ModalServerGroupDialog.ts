namespace Modals {
    export function createServerGroupAssignmentModal(client: ClientEntry, callback: (group: Group, flag: boolean) => Promise<boolean>) {
        const modal = createModal({
            header: tr("Server Groups"),
            body: () => {
                let tag: any = {};
                let groups = tag["groups"] = [];

                tag["client_name"] = client.clientNickName();
                for(let group of client.channelTree.client.groups.serverGroups.sort(GroupManager.sorter())) {
                    if(group.type != GroupType.NORMAL) continue;

                    let entry = {} as any;
                    entry["id"] = group.id;
                    entry["name"] = group.name;
                    entry["assigned"] = client.groupAssigned(group);
                    entry["disabled"] = !client.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
                    tag["icon_" + group.id] = client.channelTree.client.fileManager.icons.generateTag(group.properties.iconid);
                    groups.push(entry);
                }

                let template = $("#tmpl_server_group_assignment").renderTag(tag);

                template.find(".group-entry input").each((_idx, _entry) => {
                    let entry = $(_entry);

                    entry.on('change', event => {
                        let group_id = parseInt(entry.attr("group-id"));
                        let group = client.channelTree.client.groups.serverGroup(group_id);
                        if(!group) {
                            console.warn(tr("Could not resolve target group!"));
                            return false;
                        }

                        let target = entry.prop("checked");
                        callback(group, target).then(flag => flag ? Promise.resolve() : Promise.reject()).catch(error => entry.prop("checked", !target));
                    });
                });

                return template;
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin", "5px");

                let button_close = $.spawn("button");
                button_close.text(tr("Close")).addClass("button_close");

                footer.append(button_close);

                return footer;
            },
            width: "max-content"
        });

        modal.htmlTag.find(".button_close").click(() => {
            modal.close();
        });

        modal.open();
    }

}