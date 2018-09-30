/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../client.ts" />

namespace Modals {
    export function spawnPermissionEdit() : Modal {
        const connectModal = createModal({
            header: function() {
                return "Server Permissions";
            },
            body: function () {
                let properties: any = {};

                let start, end;
                start = Date.now();
                {
                    let groups = globalClient.permissions.groupedPermissions();
                    let root_entry: any = {};
                    root_entry.entries = [];
                    let entry_stack: any[] = [root_entry];

                    let insert_group = (group: GroupedPermissions) => {
                        let group_entry: any = {};
                        group_entry.type = "group";
                        group_entry.name = group.group.name;
                        group_entry.entries = [];
                        entry_stack.last().entries.push(group_entry);

                        entry_stack.push(group_entry);
                        for(let child of group.children)
                            insert_group(child);
                        entry_stack.pop();

                        for(let perm of group.permissions) {
                            let entry: any = {};
                            entry.type = "entry";
                            entry.permission_name = perm.name;
                            entry.unset = true;
                            group_entry.entries.push(entry);

                            {
                                let tag: JQuery<HTMLElement>;
                                if(perm.name.startsWith("b_")) {
                                    tag = $.spawn("label").addClass("checkbox");
                                    $.spawn("input").attr("type", "checkbox").appendTo(tag);
                                    $.spawn("span").addClass("checkmark").appendTo(tag);
                                } else {
                                    tag = $.spawn("input");
                                    tag.attr("type", "number");
                                    tag.attr("min-value", -1);
                                    tag.attr("max-value", 9999999999); //TODO use there may the grant permission
                                }
                                root_entry[perm.name + "_value"] = tag;
                            }
                            {
                                let tag = $.spawn("label").addClass("checkbox");
                                $.spawn("input").attr("type", "checkbox").appendTo(tag);
                                $.spawn("span").addClass("checkmark").appendTo(tag);
                                root_entry[perm.name + "_skip"] = tag;
                            }
                            {
                                let tag = $.spawn("label").addClass("checkbox");
                                $.spawn("input").attr("type", "checkbox").appendTo(tag);
                                $.spawn("span").addClass("checkmark").appendTo(tag);
                                root_entry[perm.name + "_negate"] = tag;
                            }
                            {
                                let tag = $.spawn("input");
                                tag.attr("type", "number");
                                tag.attr("min-value", -1);
                                tag.attr("max-value", 9999999999);
                                root_entry[perm.name + "_grant"] = tag;
                            }
                            //{{>permission_name}}_value
                        }
                    };
                    groups.forEach(entry => insert_group(entry));

                    root_entry.permissions = root_entry.entries;
                    properties["permissions_group_server"] = $("#tmpl_permission_explorer").renderTag(root_entry);
                    properties["permissions_group_channel"] = properties["permissions_group_server"].clone();
                    properties["permissions_channel"] = properties["permissions_group_server"].clone();
                    properties["permissions_client"] = properties["permissions_group_server"].clone();
                    properties["permissions_client_channel"] = properties["permissions_group_server"].clone();
                }
                end = Date.now();
                console.log("Generate: %s", end - start);
                start = end;

                let tag = $.spawn("div").append($("#tmpl_server_permissions").renderTag(properties)).tabify(false);
                end = Date.now();
                console.log("Tab: %s", end - start);
                start = end;

                apply_server_groups(tag.find(".layout-group-server"));
                apply_channel_groups(tag.find(".layout-group-channel"));
                apply_channel_permission(tag.find(".layout-channel"));
                apply_client_permission(tag.find(".layout-client"));
                apply_client_channel_permission(tag.find(".layout-client-channel"));
                end = Date.now();
                console.log("Listeners: %s", end - start);
                start = end;
                return tag;
            },
            footer: function () {
                let tag = $.spawn("div");
                tag.css("text-align", "right");
                tag.css("margin-top", "3px");
                tag.css("margin-bottom", "6px");
                tag.addClass("modal-button-group");

                let buttonOk = $.spawn("button");
                buttonOk.text("Close").addClass("btn_close");
                tag.append(buttonOk);
                return tag;
            },

            width: "90%"
        });

        connectModal.htmlTag.find(".btn_close").on('click', () => {
            connectModal.close();
        });

        return connectModal;
    }

    function display_permissions(permission_tag: JQuery, permissions: PermissionValue[]) {
        permission_tag.find(".permission").addClass("unset").find(".permission-grant input").val("");

        for(let perm of permissions) {
            let tag = permission_tag.find("." + perm.type.name);
            if(perm.value != undefined) {
                tag.removeClass("unset");
                {
                    let value = tag.find(".permission-value input");
                    if(value.attr("type") == "checkbox")
                        value.prop("checked", perm.value == 1);
                    else
                        value.val(perm.value);
                }
                tag.find(".permission-skip input").prop("checked", perm.flag_skip);
                tag.find(".permission-negate input").prop("checked", perm.flag_negate);
            }
            if(perm.granted_value != undefined) {
                tag.find(".permission-grant input").val(perm.granted_value);
            }
        }
        permission_tag.find(".filter-input").trigger('change');
    }

    function make_permission_editor(tag: JQuery, default_number: number, cb_edit: (type: PermissionInfo, value?: number, skip?: boolean, negate?: boolean) => Promise<boolean>, cb_grant_edit: (type: PermissionInfo, value?: number) => Promise<boolean>) {
        tag = tag.hasClass("permission-explorer") ? tag : tag.find(".permission-explorer");
        const list = tag.find(".list");
        list.css("max-height", document.body.clientHeight * .7)

        list.find(".arrow").each((idx, _entry) => {
            let entry = $(_entry);
            let entries = entry.parentsUntil(".group").first().parent().find("> .group-entries");
            entry.on('click', () => {
                if(entry.hasClass("right")) {
                    entries.show();
                } else {
                    entries.hide();
                }
                entry.toggleClass("right down");
            });
        });

        tag.find(".filter-input, .filter-granted").on('keyup change', event => {
            let filter_mask = tag.find(".filter-input").val() as string;
            let req_granted = tag.find('.filter-granted').prop("checked");

            tag.find(".permission").each((idx, _entry) => {
                let entry = $(_entry);
                let key = entry.find("> .filter-key");

                let should_hide = filter_mask.length != 0 && key.text().indexOf(filter_mask) == -1;
                if(req_granted) {
                    if(entry.hasClass("unset") && entry.find(".permission-grant input").val() == "")
                        should_hide = true;
                }
                entry.attr("match", should_hide ? 0 : 1);
                if(should_hide)
                    entry.hide();
                else
                    entry.show();
            });
            tag.find(".group").each((idx, _entry) => {
                let entry = $(_entry);
                let target = entry.find(".entry:not(.group)[match=\"1\"]").length > 0;
                if(target)
                    entry.show();
                else
                    entry.hide();
            });
        });

        const expend_all = (parent) => {
            (parent || list).find(".arrow").addClass("right").removeClass("down").trigger('click');
        };
        const collapse_all = (parent) => {
            (parent || list).find(".arrow").removeClass("right").addClass("down").trigger('click');
        };

        list.on('contextmenu', event => {
            if (event.isDefaultPrevented()) return;
            event.preventDefault();

            spawn_context_menu(event.pageX, event.pageY, {
                type: MenuEntryType.ENTRY,
                icon: "",
                name: "Expend all",
                callback: () => expend_all.bind(this, [undefined])
            },{
                type: MenuEntryType.ENTRY,
                icon: "",
                name: "Collapse all",
                callback: collapse_all.bind(this, [undefined])
            });
        });

        tag.find(".title").each((idx, _entry) => {
            let entry = $(_entry);
            entry.on('click', () => {
                tag.find(".selected").removeClass("selected");
                $(_entry).addClass("selected");
            });

            entry.on('contextmenu', event => {
                if (event.isDefaultPrevented()) return;
                event.preventDefault();

                spawn_context_menu(event.pageX, event.pageY, {
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Expend group",
                    callback: () => expend_all.bind(this, entry)
                }, {
                    type: MenuEntryType.ENTRY,
                        icon: "",
                        name: "Expend all",
                        callback: () => expend_all.bind(this, undefined)
                }, {
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Collapse group",
                    callback: collapse_all.bind(this, entry)
                }, {
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Collapse all",
                    callback: () => expend_all.bind(this, undefined)
                });
            });
        });

        tag.find(".permission").each((idx, _entry) => {
            let entry = $(_entry);

            entry.on('click', () => {
                tag.find(".selected").removeClass("selected");
                $(_entry).addClass("selected");
            });

            entry.on('dblclick', event => {
                entry.removeClass("unset");

                let value = entry.find("> .permission-value input");
                if(value.attr("type") == "number")
                    value.focus().val(default_number).trigger('change');
                else
                    value.prop("checked", true).trigger('change');
            });

            entry.on('contextmenu', event => {
                if(event.isDefaultPrevented()) return;
                event.preventDefault();

                let entries: ContextMenuEntry[] = [];

                if(entry.hasClass("unset")) {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: "Add permission",
                        callback: () => entry.trigger('dblclick')
                    });
                } else {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: "Remove permission",
                        callback: () => {
                            entry.addClass("unset");
                            entry.find(".permission-value input").val("").trigger('change');
                        }
                    });
                }
                if(entry.find("> .permission-grant input").val() == "") {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: "Add grant permission",
                        callback: () => {
                            let value = entry.find("> .permission-grant input");
                            value.focus().val(default_number).trigger('change');
                        }
                    });
                } else {
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: "Remove permission",
                        callback: () => {
                            entry.find("> .permission-grant input").val("").trigger('change');
                        }
                    });
                }
                entries.push(MenuEntry.HR());
                entries.push({
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Expend all",
                    callback: () => expend_all.bind(this, undefined)
                });
                entries.push({
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Collapse all",
                    callback: collapse_all.bind(this, undefined)
                });
                entries.push(MenuEntry.HR());
                entries.push({
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Show permission description",
                    callback: () => {
                        createErrorModal("Not implemented!", "This function isnt implemented yet!").open();
                    }
                });
                entries.push({
                    type: MenuEntryType.ENTRY,
                    icon: "",
                    name: "Copy permission name",
                    callback: () => {
                        copy_to_clipboard(entry.find(".permission-name").text() as string);
                    }
                });

                spawn_context_menu(event.pageX, event.pageY, ...entries);
            });

            entry.find(".permission-value input, .permission-negate input, .permission-skip input").on('change', event => {
                let permission = globalClient.permissions.resolveInfo(entry.find(".permission-name").text());
                if(!permission) {
                    console.error("Attempted to edit a not known permission! (%s)", entry.find(".permission-name").text());
                    return;
                }

                if(entry.hasClass("unset")) {
                    cb_edit(permission, undefined, undefined, undefined).catch(error => {
                        tag.find(".button-update").trigger('click');
                    });
                } else {
                    let input = entry.find(".permission-value input");
                    let value = input.attr("type") == "number" ? input.val() : (input.prop("checked") ? "1" : "0");
                    if(value == "" || isNaN(value as number)) value = 0;
                    else value = parseInt(value as string);
                    let negate = entry.find(".permission-negate input").prop("checked");
                    let skip = entry.find(".permission-skip input").prop("checked");

                    cb_edit(permission, value, skip, negate).catch(error => {
                        tag.find(".button-update").trigger('click');
                    });
                }
            });

            entry.find(".permission-grant input").on('change', event => {
                let permission = globalClient.permissions.resolveInfo(entry.find(".permission-name").text());
                if(!permission) {
                    console.error("Attempted to edit a not known permission! (%s)", entry.find(".permission-name").text());
                    return;
                }

                let value = entry.find(".permission-grant input").val();
                if(value && value != "" && !isNaN(value as number)) {
                    cb_grant_edit(permission, parseInt(value as string)).catch(error => {
                        tag.find(".button-update").trigger('click');
                    });
                } else cb_grant_edit(permission, undefined).catch(error => {
                    tag.find(".button-update").trigger('click');
                });
            });
        });
    }

    function build_channel_tree(channel_list: JQuery, update_button: JQuery) {
        for(let channel of globalClient.channelTree.channels) {
            let tag = $.spawn("div").addClass("channel").attr("channel-id", channel.channelId);
            globalClient.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(tag);
            {
                let name = $.spawn("a").text(channel.channelName() + " (" + channel.channelId + ")").addClass("name");
                //if(globalClient.channelTree.server.properties. == group.id)
                //    name.addClass("default");
                name.appendTo(tag);
            }
            tag.appendTo(channel_list);

            tag.on('click', event => {
                channel_list.find(".selected").removeClass("selected");
                tag.addClass("selected");
                update_button.trigger('click');
            });
        }
        setTimeout(() => channel_list.find('.channel').first().trigger('click'), 0);
    }

    function apply_client_channel_permission(tag: JQuery) {
        let permission_tag = tag.find(".permission-explorer");
        let channel_list = tag.find(".list-channel .entries");
        permission_tag.addClass("disabled");

        make_permission_editor(permission_tag, 75, (type, value, skip, negate) => {
            let cldbid = parseInt(tag.find(".client-dbid").val() as string);
            if(isNaN(cldbid)) return Promise.reject("invalid cldbid");

            let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
            let channel = globalClient.channelTree.findChannel(channel_id);
            if(!channel) {
                console.warn("Missing selected channel id for permission editor action!");
                return Promise.reject("invalid channel");
            }

            if(value != undefined) {
                console.log("Added permission " + type.name + " with properties: %o %o %o", value, skip, negate);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channelclientaddperm", {
                        cldbid: cldbid,
                        cid: channel.channelId,
                        permid: type.id,
                        permvalue: value,
                        permskip: skip,
                        permnegate: negate
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed permission " + type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channelclientdelperm", {
                        cldbid: cldbid,
                        cid: channel.channelId,
                        permid: type.id
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        }, (type, value) => {
            let cldbid = parseInt(tag.find(".client-dbid").val() as string);
            if(isNaN(cldbid)) return Promise.reject("invalid cldbid");

            let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
            let channel = globalClient.channelTree.findChannel(channel_id);
            if(!channel) {
                console.warn("Missing selected channel id for permission editor action!");
                return Promise.reject("invalid channel");
            }

            if(value != undefined) {
                console.log("Added grant of %o for " + type.name, value);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channelclientaddperm", {
                        cldbid: cldbid,
                        cid: channel.channelId,
                        permid: type.id | (1 << 15),
                        permvalue: value,
                        permskip: false,
                        permnegate: false
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed grant permission for %s", type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channelclientdelperm", {
                        cldbid: cldbid,
                        cid: channel.channelId,
                        permid: type.id | (1 << 15)
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        });

        build_channel_tree(channel_list, permission_tag.find(".button-update"));
        permission_tag.find(".button-update").on('click', event => {
            let val = tag.find('.client-select-uid').val();
            globalClient.serverConnection.helper.info_from_uid(val as string).then(result => {
                if(!result || result.length == 0) return Promise.reject("invalid data");
                permission_tag.removeClass("disabled");

                tag.find(".client-name").val(result[0].client_nickname);
                tag.find(".client-uid").val(result[0].client_unique_id);
                tag.find(".client-dbid").val(result[0].client_database_id);

                let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
                let channel = globalClient.channelTree.findChannel(channel_id);
                if(!channel) {
                    console.warn("Missing selected channel id for permission editor action!");
                    return Promise.reject();
                }

                return globalClient.permissions.requestClientChannelPermissions(channel.channelId, result[0].client_database_id).then(result => display_permissions(permission_tag, result));
            }).catch(error => {
                console.log(error); //TODO error handling?
                permission_tag.addClass("disabled");
            });
        });
        tag.find(".client-select-uid").on('change', event => {
            tag.find(".button-update").trigger('click');
        });
    }

    function apply_client_permission(tag: JQuery) {
        let permission_tag = tag.find(".permission-explorer");
        permission_tag.addClass("disabled");

        make_permission_editor(permission_tag, 75, (type, value, skip, negate) => {
            let cldbid = parseInt(tag.find(".client-dbid").val() as string);
            if(isNaN(cldbid)) return Promise.reject("invalid cldbid");
            if(value != undefined) {
                console.log("Added permission " + type.name + " with properties: %o %o %o", value, skip, negate);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("clientaddperm", {
                        cldbid: cldbid,
                        permid: type.id,
                        permvalue: value,
                        permskip: skip,
                        permnegate: negate
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed permission " + type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("clientdelperm", {
                        cldbid: cldbid,
                        permid: type.id
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        }, (type, value) => {
            let cldbid = parseInt(tag.find(".client-dbid").val() as string);
            if(isNaN(cldbid)) return Promise.reject("invalid cldbid");

            if(value != undefined) {
                console.log("Added grant of %o for " + type.name, value);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("clientaddperm", {
                        cldbid: cldbid,
                        permid: type.id | (1 << 15),
                        permvalue: value,
                        permskip: false,
                        permnegate: false
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed grant permission for %s", type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("clientdelperm", {
                        cldbid: cldbid,
                        permid: type.id | (1 << 15)
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        });

        tag.find(".client-select-uid").on('change', event => {
            tag.find(".button-update").trigger('click');
        });

        permission_tag.find(".button-update").on('click', event => {
            let val = tag.find('.client-select-uid').val();
            globalClient.serverConnection.helper.info_from_uid(val as string).then(result => {
                if(!result || result.length == 0) return Promise.reject("invalid data");
                permission_tag.removeClass("disabled");

                tag.find(".client-name").val(result[0].client_nickname);
                tag.find(".client-uid").val(result[0].client_unique_id);
                tag.find(".client-dbid").val(result[0].client_database_id);

                return globalClient.permissions.requestClientPermissions(result[0].client_database_id).then(result => display_permissions(permission_tag, result));
            }).catch(error => {
                console.log(error); //TODO error handling?
                permission_tag.addClass("disabled");
            });
        });
    }

    function apply_channel_permission(tag: JQuery) {
        let channel_list = tag.find(".list-channel .entries");
        let permission_tag = tag.find(".permission-explorer");

        make_permission_editor(tag, 75, (type, value, skip, negate) => {
            let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
            let channel = globalClient.channelTree.findChannel(channel_id);
            if(!channel) {
                console.warn("Missing selected channel id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added permission " + type.name + " with properties: %o %o %o", value, skip, negate);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channeladdperm", {
                        cid: channel.channelId,
                        permid: type.id,
                        permvalue: value,
                        permskip: skip,
                        permnegate: negate
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed permission " + type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channeldelperm", {
                        cid: channel.channelId,
                        permid: type.id
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        }, (type, value) => {
            let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
            let channel = globalClient.channelTree.findChannel(channel_id);
            if(!channel) {
                console.warn("Missing selected channel id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added grant of %o for " + type.name, value);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channeladdperm", {
                        cid: channel.channelId,
                        permid: type.id | (1 << 15),
                        permvalue: value,
                        permskip: false,
                        permnegate: false
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed grant permission for %s", type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channeldelperm", {
                        cid: channel.channelId,
                        permid: type.id | (1 << 15)
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        });

        build_channel_tree(channel_list, permission_tag.find(".button-update"));
        permission_tag.find(".button-update").on('click', event => {
            let channel_id: number = parseInt(channel_list.find(".selected").attr("channel-id"));
            let channel = globalClient.channelTree.findChannel(channel_id);
            if(!channel) {
                console.warn("Missing selected channel id for permission editor action!");
                return;
            }

            globalClient.permissions.requestChannelPermissions(channel.channelId).then(result => display_permissions(permission_tag, result)).catch(error => {
                console.log(error); //TODO handling?
            });
        });
    }

    function apply_channel_groups(tag: JQuery) {
        let group_list = tag.find(".list-group-channel .entries");
        let permission_tag = tag.find(".permission-explorer");

        make_permission_editor(tag, 75, (type, value, skip, negate) => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.channelGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added permission " + type.name + " with properties: %o %o %o", value, skip, negate);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channelgroupaddperm", {
                        cgid: group.id,
                        permid: type.id,
                        permvalue: value,
                        permskip: skip,
                        permnegate: negate
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed permission " + type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channelgroupdelperm", {
                        cgid: group.id,
                        permid: type.id
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        }, (type, value) => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.channelGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added grant of %o for " + type.name, value);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("channelgroupaddperm", {
                        cgid: group.id,
                        permid: type.id | (1 << 15),
                        permvalue: value,
                        permskip: false,
                        permnegate: false
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
            else {
                console.log("Removed grant permission for %s", type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("channelgroupdelperm", {
                        cgid: group.id,
                        permid: type.id | (1 << 15)
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        });

        {
            for(let group of globalClient.groups.channelGroups.sort(GroupManager.sorter())) {
                let tag = $.spawn("div").addClass("group").attr("group-id", group.id);
                globalClient.fileManager.icons.generateTag(group.properties.iconid).appendTo(tag);
                {
                    let name = $.spawn("a").text(group.name + " (" + group.id + ")").addClass("name");
                    if(group.properties.savedb)
                        name.addClass("savedb");
                    if(globalClient.channelTree.server.properties.virtualserver_default_channel_group == group.id)
                        name.addClass("default");
                    name.appendTo(tag);
                }
                tag.appendTo(group_list);

                tag.on('click', event => {
                    group_list.find(".selected").removeClass("selected");
                    tag.addClass("selected");
                    permission_tag.find(".button-update").trigger('click');
                });
            }
        }

        //button-update
        permission_tag.find(".button-update").on('click', event => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.channelGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor!");
                return;
            }
            globalClient.groups.request_permissions(group).then(result => display_permissions(permission_tag, result)).catch(error => {
                console.log(error); //TODO handling?
            });
        });

        setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
    }

    function apply_server_groups(tag: JQuery) {
        let group_list = tag.find(".list-group-server .entries");
        let permission_tag = tag.find(".permission-explorer");

        make_permission_editor(tag, 75, (type, value, skip, negate) => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.serverGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added permission " + type.name + " with properties: %o %o %o", value, skip, negate);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("servergroupaddperm", {
                        sgid: group.id,
                        permid: type.id,
                        permvalue: value,
                        permskip: skip,
                        permnegate: negate
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            } else {
                console.log("Removed permission " + type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("servergroupdelperm", {
                        sgid: group.id,
                        permid: type.id
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        }, (type, value) => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.serverGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor action!");
                return;
            }

            if(value != undefined) {
                console.log("Added grant of %o for " + type.name, value);
                return new Promise<boolean>((resolve, reject) => {
                    globalClient.serverConnection.sendCommand("servergroupaddperm", {
                        sgid: group.id,
                        permid: type.id | (1 << 15),
                        permvalue: value,
                        permskip: false,
                        permnegate: false
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
            else {
                console.log("Removed grant permission for %s", type.name);
                return new Promise<boolean>((resolve, reject) => {
                    return globalClient.serverConnection.sendCommand("servergroupdelperm", {
                        sgid: group.id,
                        permid: type.id | (1 << 15)
                    }).then(resolve.bind(undefined, true)).catch(reject);
                });
            }
        });

        {
            for(let group of globalClient.groups.serverGroups.sort(GroupManager.sorter())) {
                let tag = $.spawn("div").addClass("group").attr("group-id", group.id);
                globalClient.fileManager.icons.generateTag(group.properties.iconid).appendTo(tag);
                {
                    let name = $.spawn("a").text(group.name + " (" + group.id + ")").addClass("name");
                    if(group.properties.savedb)
                        name.addClass("savedb");
                    if(globalClient.channelTree.server.properties.virtualserver_default_server_group == group.id)
                        name.addClass("default");
                    name.appendTo(tag);
                }
                tag.appendTo(group_list);

                tag.on('click', event => {
                    group_list.find(".selected").removeClass("selected");
                    tag.addClass("selected");
                    permission_tag.find(".button-update").trigger('click');
                });
            }
        }

        //button-update
        permission_tag.find(".button-update").on('click', event => {
            let group_id: number = parseInt(group_list.find(".selected").attr("group-id"));
            let group = globalClient.groups.serverGroup(group_id);
            if(!group) {
                console.warn("Missing selected group id for permission editor!");
                return;
            }
            globalClient.groups.request_permissions(group).then(result => display_permissions(permission_tag, result)).catch(error => {
                console.log(error); //TODO handling?
            });
        });

        setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
    }
}