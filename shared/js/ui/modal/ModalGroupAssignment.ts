namespace Modals {
    let current_modal: Modal;
    export function createServerGroupAssignmentModal(client: ClientEntry, callback: (group: Group, flag: boolean) => Promise<boolean>) {
        if(current_modal)
            current_modal.close();

        current_modal = createModal({
            header: tr("Server Groups"),
            body: () => {
                let tag: any = {};
                let groups = tag["groups"] = [];

                tag["client"] = client.createChatTag();

                const _groups = client.channelTree.client.groups.serverGroups.sort(GroupManager.sorter());
                for(let group of _groups) {
                    if(group.type != GroupType.NORMAL) continue;

                    let entry = {} as any;
                    entry["id"] = group.id;
                    entry["name"] = group.name;
                    entry["assigned"] = client.groupAssigned(group);
                    entry["disabled"] = !client.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
                    entry["default"] = client.channelTree.server.properties.virtualserver_default_server_group == group.id;
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
                        callback(group, target).then(flag => flag ? Promise.resolve() : Promise.reject()).then(() => {
                            template.find(".group-entry input[default]").prop("checked", template.find(".group-entry input:checked").length == 0);
                        }).catch(error => entry.prop("checked", !target));
                    });
                });

                template.find(".button-close").on('click', () => current_modal.close());
                template.find(".button-remove-all").on('click', () => {
                    template.find(".group-entry input").each((_idx, _entry) => {
                        let entry = $(_entry);
                        if(entry.attr("default") !== undefined || !entry.prop("checked"))
                            return;

                        entry.prop("checked", false).trigger('change');
                    });
                });
                template.find(".group-entry input[default]").prop("checked", template.find(".group-entry input:checked").length == 0);
                return template;
            },
            footer: null,
            width: "max-content"
        });

        current_modal.htmlTag.find(".modal-body").addClass("modal-server-group-assignments");
        current_modal.close_listener.push(() => current_modal = undefined);
        current_modal.open();
    }

}