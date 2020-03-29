namespace Modals {
    let current_modal: Modal;
    export function createServerGroupAssignmentModal(client: ClientEntry, callback: (groups: number[], flag: boolean) => Promise<boolean>) {
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
                    entry["disabled"] = !client.channelTree.client.permissions.neededPermission(PermissionType.I_GROUP_MEMBER_ADD_POWER).granted(group.requiredMemberRemovePower);
                    entry["default"] = client.channelTree.server.properties.virtualserver_default_server_group == group.id;
                    tag["icon_" + group.id] = client.channelTree.client.fileManager.icons.generateTag(group.properties.iconid);
                    groups.push(entry);
                }

                let template = $("#tmpl_server_group_assignment").renderTag(tag);

                const update_groups = () => {
                    for(let group of _groups) {
                        template.find("input[group-id='" + group.id + "']").prop("checked", client.groupAssigned(group));
                    }
                };

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
                        callback([group.id], target).catch(e => { log.warn(LogCategory.GENERAL, tr("Failed to change group assignment: %o"), e)}).then(update_groups);
                    });
                });

                template.find(".button-close").on('click', () => current_modal.close());
                template.find(".button-remove-all").on('click', () => {
                    const group_ids = [];

                    template.find(".group-entry input").each((_idx, _entry) => {
                        let entry = $(_entry);
                        if(entry.attr("default") !== undefined || !entry.prop("checked"))
                            return;

                        group_ids.push(parseInt(entry.attr("group-id")));
                    });

                    callback(group_ids, false).catch(e => { log.warn(LogCategory.GENERAL, tr("Failed to remove all group assignments: %o"), e)}).then(update_groups);

                });

                update_groups();
                return template;
            },
            footer: null,
            min_width: "10em"

        });

        current_modal.htmlTag.find(".modal-body").addClass("modal-server-group-assignments");
        current_modal.close_listener.push(() => current_modal = undefined);
        current_modal.open();
    }

}