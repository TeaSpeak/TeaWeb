/// <reference path="../../utils/modal.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../client.ts" />

/*
    TODO: Check needed permissions and may not even try to request, because we dont have the permission. Permissions:
        b_virtualserver_servergroup_permission_list
        b_virtualserver_channel_permission_list
        b_virtualserver_client_permission_list
        b_virtualserver_channelgroup_permission_list
        b_virtualserver_channelclient_permission_list
        b_virtualserver_playlist_permission_list
 */

interface JQuery<TElement = HTMLElement> {
    dropdown: any;
}

namespace Modals {
    namespace PermissionEditor {
        export interface PermissionEntry {
            tag: JQuery;
            tag_value: JQuery;
            tag_grant: JQuery;
            tag_flag_negate: JQuery;
            tag_flag_skip: JQuery;

            id: number;
            filter: string;
            is_bool: boolean;

        }

        export interface PermissionValue {
            remove: boolean; /* if set remove the set permission (value or granted) */

            granted?: number;
            value?: number;

            flag_skip?: boolean;
            flag_negate?: boolean;
        }

        export type change_listener_t = (permission: PermissionInfo, value?: PermissionEditor.PermissionValue) => Promise<any>;
    }
    enum PermissionEditorMode {
        VISIBLE,
        NO_PERMISSION,
        UNSET
    }
    
    class PermissionEditor {
        readonly permissions: GroupedPermissions[];

        container: JQuery;

        private mode_container_permissions: JQuery;
        private mode_container_error_permission: JQuery;
        private mode_container_unset: JQuery;

        /* references within the container tag */
        private permission_value_map: {[key:number]:PermissionValue} = {};
        private permission_map: {[key:number]: PermissionEditor.PermissionEntry};
        private listener_change: PermissionEditor.change_listener_t = () => Promise.resolve();
        private listener_update: () => any;

        constructor(permissions: GroupedPermissions[]) {
            this.permissions = permissions;
        }

        build_tag() {
            this.permission_map = {};

            this.container = $("#tmpl_permission_editor").renderTag();
            /* search for that as long we've not that much nodes */
            this.mode_container_permissions = this.container.find(".container-mode-permissions");
            this.mode_container_error_permission = this.container.find(".container-mode-no-permissions");
            this.mode_container_unset = this.container.find(".container-mode-unset");
            this.set_mode(PermissionEditorMode.UNSET);

            /* the filter */
            {
                const tag_filter_input = this.container.find(".filter-input");
                const tag_filter_granted = this.container.find(".filter-granted");

                tag_filter_granted.on('change', event => tag_filter_input.trigger('change'));
                tag_filter_input.on('keyup change', event => {
                    let filter_mask = tag_filter_input.val() as string;
                    let req_granted = tag_filter_granted.prop("checked");

                    /* we've to disable this function because its sometimes laggy */
                    const org_fn = $.fn.dropdown && $.fn.dropdown.Constructor ? $.fn.dropdown.Constructor._clearMenus : undefined;
                    if(org_fn)
                        $.fn.dropdown.Constructor._clearMenus = () => {};

                    /* update each permission */
                    {
                        const start = Date.now();

                        for(const permission_id of Object.keys(this.permission_map)) {
                            const permission: PermissionEditor.PermissionEntry = this.permission_map[permission_id];
                            let shown = filter_mask.length == 0 || permission.filter.indexOf(filter_mask) != -1;
                            if(shown && req_granted) {
                                const value: PermissionValue = this.permission_value_map[permission_id];
                                shown = value && (value.hasValue() || value.hasGrant());
                            }

                            permission.tag.attr("match", shown ? 1 : 0);
                            /* this is faster then .hide() or .show() */
                            if(shown)
                                permission.tag.css('display', 'flex');
                            else
                                permission.tag.css('display', 'none');
                        }

                        const end = Date.now();
                        console.error("Filter update required %oms", end - start);
                    }

                    /* update group visibility (hide empty groups) */
                    {
                        const start = Date.now();

                        this.container.find(".group").each((idx, _entry) => {
                            let entry = $(_entry);
                            let target = entry.find(".entry:not(.group)[match=\"1\"]").length > 0;
                            /* this is faster then .hide() or .show() */
                            if(target)
                                entry.css('display', 'flex');
                            else
                                entry.css('display', 'none');
                        });

                        const end = Date.now();
                        console.error("Group update required %oms", end - start);
                    }

                    if(org_fn)
                        $.fn.dropdown.Constructor._clearMenus = org_fn;
                });
            }

            /* update button */
            {
                this.container.find(".button-update").on('click', this.trigger_update.bind(this));
            }

            /* global context menu listener */
            {
                this.container.on('contextmenu', event => {
                    if(event.isDefaultPrevented()) return;
                    event.preventDefault();

                    /* TODO allow collapse and expend all */
                });
            }

            /* actual permissions */
            {
                const tag_entries = this.container.find(".entries");

                const template_entry = $("#tmpl_permission_entry");
                const build_group = (group: GroupedPermissions) : JQuery => {
                    const tag_group = template_entry.renderTag({
                        type: "group",
                        name: group.group.name
                    });
                    const tag_group_entries = tag_group.find(".group-entries");

                    const update_collapse_status = (status: boolean, recursive: boolean) => {
                        const tag = recursive ? this.container.find(".entry.group") : tag_group;

                        /* this is faster then .hide() or .show() */
                        if(status) {
                            tag.find("> .group-entries").css('display', 'block');
                        } else {
                            tag.find("> .group-entries").css('display', 'none');
                        }

                        tag.find("> .title .arrow").toggleClass("down", status).toggleClass("right", !status);
                    };

                    /* register collapse and context listener */
                    {
                        const tag_arrow = tag_group.find(".arrow");
                        tag_arrow.on('click', event => {
                            if(event.isDefaultPrevented()) return;
                            event.preventDefault();

                            update_collapse_status(tag_arrow.hasClass("right"), false);
                        });

                        const tag_title = tag_group.find(".title");
                        tag_title.on('contextmenu', event => {
                            if(event.isDefaultPrevented()) return;
                            event.preventDefault();

                            spawn_context_menu(event.pageX, event.pageY, {
                                type: MenuEntryType.ENTRY,
                                icon: "",
                                name: tr("Expend group"),
                                callback: () => update_collapse_status(true, false)
                            }, {
                                type: MenuEntryType.ENTRY,
                                icon: "",
                                name: tr("Expend all"),
                                callback: () => update_collapse_status(true, true)
                            }, {
                                type: MenuEntryType.ENTRY,
                                icon: "",
                                name: tr("Collapse group"),
                                callback: () => update_collapse_status(false, false)
                            }, {
                                type: MenuEntryType.ENTRY,
                                icon: "",
                                name: tr("Collapse all"),
                                callback: () => update_collapse_status(false, true)
                            });
                        });
                    }

                    /* build the permissions */
                    {
                        for(const permission of group.permissions) {
                            const tag_permission = template_entry.renderTag({
                                type: "permission",
                                permission_name: permission.name,
                                permission_id: permission.id,
                                permission_description: permission.description,
                            });

                            const tag_value = tag_permission.find(".column-value input");
                            const tag_granted = tag_permission.find(".column-granted input");
                            const tag_flag_skip = tag_permission.find(".column-skip input");
                            const tag_flag_negate = tag_permission.find(".column-negate input");

                            /* double click listener */
                            {
                                tag_permission.on('dblclick', event => {
                                    if(event.isDefaultPrevented()) return;
                                    event.preventDefault();

                                    if(tag_permission.hasClass("value-unset")) {
                                        tag_flag_skip.prop("checked", false);
                                        tag_flag_negate.prop("checked", false);

                                        tag_permission.removeClass("value-unset");
                                        if(permission.name.startsWith("b_")) {
                                            tag_permission.find(".column-value input")
                                                .prop("checked", true)
                                                .trigger('change');
                                        } else {
                                            /* TODO auto value */
                                            tag_value.val('').focus();
                                        }
                                    } else if(!permission.name.startsWith("b_")) {
                                        tag_value.focus();
                                    }
                                });

                                tag_permission.find(".column-granted").on('dblclick', event => {
                                    if(event.isDefaultPrevented()) return;
                                    event.preventDefault();

                                    if(tag_permission.hasClass("grant-unset")) {
                                        tag_permission.removeClass("grant-unset");
                                        tag_granted.focus();
                                    }
                                });
                            }

                            /* focus out listener */
                            {
                                tag_granted.on('focusout', event => {
                                    try {
                                        const value = tag_granted.val() as string;
                                        if(isNaN(parseInt(value)))
                                            throw "";
                                    } catch(_) {
                                        tag_granted.val("");
                                        tag_permission.addClass("grant-unset");

                                        const element = this.permission_value_map[permission.id];
                                        if(element && element.hasGrant()) {
                                            this.listener_change(permission, {
                                                remove: true,
                                                granted: -2
                                            }).then(() => {
                                                element.granted_value = undefined;
                                            }).catch(() => {
                                                tag_granted.val(element.granted_value);
                                            });
                                        }
                                    }
                                });

                                tag_value.on('focusout', event => {
                                    try {
                                        if(isNaN(parseInt(tag_value.val() as string)))
                                            throw "";
                                    } catch(_) {
                                        const element = this.permission_value_map[permission.id];
                                        if(element && element.hasValue()) {
                                            tag_value.val(element.value);
                                        } else {
                                            tag_value.val("");
                                            tag_permission.addClass("value-unset");
                                        }
                                    }
                                })
                            }

                            /* change listener */
                            {
                                tag_flag_negate.on('change', () => tag_value.trigger('change'));
                                tag_flag_skip.on('change', () => tag_value.trigger('change'));

                                tag_granted.on('change', event => {
                                    const value = parseInt(tag_granted.val() as string);
                                    if(isNaN(value)) return;

                                    this.listener_change(permission, {
                                        remove: false,
                                        granted: value,
                                    }).then(() => {
                                        const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));
                                        element.granted_value = value;
                                    }).catch(() => {
                                        const element = this.permission_value_map[permission.id];
                                        tag_granted.val(element && element.hasGrant() ? element.granted_value : "");
                                        tag_permission.toggleClass("grant-unset", !element || !element.hasGrant());
                                    });
                                });

                                tag_value.on('change', event => {
                                    const value = permission.is_boolean() ? tag_value.prop("checked") ? 1 : 0 : parseInt(tag_value.val() as string);
                                    if(isNaN(value)) return;

                                    const flag_negate = tag_flag_negate.prop("checked");
                                    const flag_skip = tag_flag_skip.prop("checked");

                                    this.listener_change(permission, {
                                        remove: false,
                                        value: value,
                                        flag_negate: flag_negate,
                                        flag_skip: flag_skip
                                    }).then(() => {
                                        const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));

                                        element.value = value;
                                        element.flag_skip = flag_skip;
                                        element.flag_negate = flag_negate;
                                    }).catch(error => {
                                        const element = this.permission_value_map[permission.id];

                                        /* reset or set the fields */
                                        if(permission.is_boolean())
                                            tag_value.prop('checked', element && element.hasValue() && element.value > 0);
                                        else
                                            tag_value.val(element && element.hasValue() ? element.value : "");
                                        tag_flag_negate.prop("checked", element && element.flag_negate);
                                        tag_flag_skip.prop("checked", element && element.flag_skip);
                                        tag_permission.toggleClass("value-unset", !element || !element.hasValue());
                                    });
                                });
                            }

                            /* context menu */
                            {
                                tag_permission.on('contextmenu', event => {
                                    if(event.isDefaultPrevented()) return;
                                    event.preventDefault();

                                    let entries: ContextMenuEntry[] = [];
                                    if(tag_permission.hasClass("value-unset")) {
                                        entries.push({
                                            type: MenuEntryType.ENTRY,
                                            icon: "",
                                            name: tr("Add permission"),
                                            callback: () => tag_permission.trigger('dblclick')
                                        });
                                    } else {
                                        entries.push({
                                            type: MenuEntryType.ENTRY,
                                            icon: "",
                                            name: tr("Remove permission"),
                                            callback: () => {
                                                this.listener_change(permission, {
                                                    remove: true,
                                                    value: -2
                                                }).then(() => {
                                                    const element = this.permission_value_map[permission.id];
                                                    if(!element) return; /* This should never happen, if so how are we displaying this permission?! */

                                                    element.value = undefined;
                                                    element.flag_negate = false;
                                                    element.flag_skip = false;

                                                    tag_permission.toggleClass("value-unset", true);
                                                }).catch(() => {
                                                    const element = this.permission_value_map[permission.id];

                                                    /* reset or set the fields */
                                                    tag_value.val(element && element.hasValue() ? element.value : "");
                                                    tag_flag_negate.prop("checked", element && element.flag_negate);
                                                    tag_flag_skip.prop("checked", element && element.flag_skip);
                                                    tag_permission.toggleClass("value-unset", !element || !element.hasValue());
                                                });
                                            }
                                        });
                                    }

                                    if(tag_permission.hasClass("grant-unset")) {
                                        entries.push({
                                            type: MenuEntryType.ENTRY,
                                            icon: "",
                                            name: tr("Add grant permission"),
                                            callback: () => tag_permission.find(".column-granted").trigger('dblclick')
                                        });
                                    } else {
                                        entries.push({
                                            type: MenuEntryType.ENTRY,
                                            icon: "",
                                            name: tr("Remove grant permission"),
                                            callback: () =>
                                                tag_granted.val('').trigger('focusout') /* empty values are handled within focus out */
                                        });
                                    }
                                    entries.push(MenuEntry.HR());
                                    entries.push({
                                        type: MenuEntryType.ENTRY,
                                        icon: "",
                                        name: tr("Expend all"),
                                        callback: () => update_collapse_status(true, true)
                                    });
                                    entries.push({
                                        type: MenuEntryType.ENTRY,
                                        icon: "",
                                        name: tr("Collapse all"),
                                        callback: () => update_collapse_status(false, true)
                                    });
                                    entries.push(MenuEntry.HR());
                                    entries.push({
                                        type: MenuEntryType.ENTRY,
                                        icon: "",
                                        name: tr("Show permission description"),
                                        callback: () => {
                                            createInfoModal(
                                                tr("Permission description"),
                                                tr("Permission description for permission ") + permission.name + ": <br>" + permission.description
                                            ).open();
                                        }
                                    });
                                    entries.push({
                                        type: MenuEntryType.ENTRY,
                                        icon: "",
                                        name: tr("Copy permission name"),
                                        callback: () => {
                                            copy_to_clipboard(permission.name);
                                        }
                                    });

                                    spawn_context_menu(event.pageX, event.pageY, ...entries);
                                });
                            }

                            this.permission_map[permission.id] = {
                                tag: tag_permission,
                                id: permission.id,
                                filter: permission.name,
                                tag_flag_negate: tag_flag_negate,
                                tag_flag_skip: tag_flag_skip,
                                tag_grant: tag_granted,
                                tag_value: tag_value,
                                is_bool: permission.is_boolean()
                            };

                            tag_group_entries.append(tag_permission);
                        }
                    }

                    /* append the subgroups */
                    for(const child of group.children) {
                        tag_group_entries.append(build_group(child));
                    }

                    return tag_group;
                };

                /* build the groups */
                for(const group of this.permissions)
                    tag_entries.append(build_group(group));
            }
        }

        set_permissions(permissions?: PermissionValue[]) {
            permissions = permissions || [];
            this.permission_value_map = {};

            for(const permission of permissions)
                this.permission_value_map[permission.type.id] = permission;

            for(const permission_id of Object.keys(this.permission_map)) {
                const permission: PermissionEditor.PermissionEntry = this.permission_map[permission_id];
                const value: PermissionValue = this.permission_value_map[permission_id];

                permission.tag
                    .toggleClass("value-unset", !value || !value.hasValue())
                    .toggleClass("grant-unset", !value || !value.hasGrant());

                if(value && value.hasValue()) {
                    if(value.type.is_boolean())
                        permission.tag_value.prop("checked", value.value);
                    else
                        permission.tag_value.val(value.value);
                    permission.tag_flag_skip.prop("checked", value.flag_skip);
                    permission.tag_flag_negate.prop("checked", value.flag_negate);
                }
                if(value && value.hasGrant()) {
                    permission.tag_grant.val(value.granted_value);
                }
            }
        }

        set_listener(listener?: PermissionEditor.change_listener_t) {
            this.listener_change = listener || (() => Promise.resolve());
        }

        set_listener_update(listener?: () => any) {
            this.listener_update = listener;
        }

        trigger_update() {
            if(this.listener_update)
                this.listener_update();
        }

        set_mode(mode: PermissionEditorMode) {
            this.mode_container_permissions.css('display', mode == PermissionEditorMode.VISIBLE ? 'flex' : 'none');
            this.mode_container_error_permission.css('display', mode == PermissionEditorMode.NO_PERMISSION ? 'flex' : 'none');
            this.mode_container_unset.css('display', mode == PermissionEditorMode.UNSET ? 'block' : 'none');
        }
    }

    export function spawnPermissionEdit() : Modal {
        const connectModal = createModal({
            header: function() {
                return tr("Server Permissions");
            },
            body: function () {
                let properties: any = {};

                let tag = $("#tmpl_server_permissions").renderTag(properties);
                const pe = new PermissionEditor(globalClient.permissions.groupedPermissions());
                pe.build_tag();
                /* initialisation */
                {
                    const pe_server = tag.find("permission-editor.group-server");
                    pe_server.append(pe.container); /* fuck off workaround to initialize form listener */
                }


                apply_server_groups(pe, tag.find(".tab-group-server"));
                apply_channel_groups(pe, tag.find(".tab-group-channel"));
                apply_channel_permission(pe, tag.find(".tab-channel"));
                apply_client_permission(pe, tag.find(".tab-client"));
                apply_client_channel_permission(pe, tag.find(".tab-client-channel"));
                return tag.tabify(false);
            },
            footer: undefined,

            width: "90%",
            height: "80%",
            trigger_tab: false,
            full_size: true
        });

        const tag = connectModal.htmlTag;
        tag.find(".btn_close").on('click', () => {
            connectModal.close();
        });

        return connectModal;
    }

    function build_channel_tree(channel_list: JQuery, select_callback: (channel: ChannelEntry) => any) {
        const root = globalClient.channelTree.get_first_channel();
        if(!root) return;

        const build_channel = (channel: ChannelEntry) => {
            let tag = $.spawn("div").addClass("channel").attr("channel-id", channel.channelId);
            globalClient.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(tag);
            {
                let name = $.spawn("a").text(channel.channelName() + " (" + channel.channelId + ")").addClass("name");
                //if(globalClient.channelTree.server.properties. == group.id)
                //    name.addClass("default");
                name.appendTo(tag);
            }

            tag.on('click', event => {
                channel_list.find(".selected").removeClass("selected");
                tag.addClass("selected");
                select_callback(channel);
            });

            return tag;
        };

        const build_channels = (root: ChannelEntry) => {
            build_channel(root).appendTo(channel_list);
            for(const child of root.children())
                build_channels(child);
            while(root.channel_next) {
                root = root.channel_next;
                build_channel(root).appendTo(channel_list);
            }
        };
        build_channels(root);
        setTimeout(() => channel_list.find('.channel').first().trigger('click'), 0);
    }

    function apply_client_channel_permission(editor: PermissionEditor, tab_tag: JQuery) {
        let current_cldbid: number = 0;
        let current_channel: ChannelEntry;

        /* the editor */
        {
            const pe_client = tab_tag.find("permission-editor.client-channel");
            tab_tag.on('show', event => {
                console.error("Channel tab show");
                pe_client.append(editor.container);
                if(globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST).granted(1)) {
                    if(current_cldbid && current_channel)
                        editor.set_mode(PermissionEditorMode.VISIBLE);
                    else
                        editor.set_mode(PermissionEditorMode.UNSET);
                } else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }


                editor.set_listener_update(() => {
                    if(!current_cldbid || !current_channel) return;

                    globalClient.permissions.requestClientChannelPermissions(current_cldbid, current_channel.channelId).then(result => {
                        editor.set_permissions(result);
                        editor.set_mode(PermissionEditorMode.VISIBLE);
                    }).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener((permission, value) => {
                    if (!current_cldbid)
                        return Promise.reject("unset client");
                    if (!current_channel)
                        return Promise.reject("unset channel");

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client channel permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            return globalClient.serverConnection.send_command("channelclientdelperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client channel grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channelclientdelperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                            });
                        }
                    } else {
                        /* add the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client channel permission %s. permission.{id: %o, value: %o, flag_skip: %o, flag_negate: %o}"),
                                permission.name,
                                permission.id,
                                value.value,
                                value.flag_skip,
                                value.flag_negate
                            );

                            return globalClient.serverConnection.send_command("channelclientaddperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client channel grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channelclientaddperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegate: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }

        build_channel_tree(tab_tag.find(".list-channel .entries"), channel => {
            if(current_channel == channel) return;

            current_channel = channel;

            /* TODO: Test for visibility */
            editor.trigger_update();
        });

        {
            const tag_select_uid = tab_tag.find(".client-select input");
            const tag_select_error = tab_tag.find(".client-select .invalid-feedback");

            const tag_client_name = tab_tag.find(".client-name");
            const tag_client_uid = tab_tag.find(".client-uid");
            const tag_client_dbid = tab_tag.find(".client-dbid");

            const resolve_client = () => {
                let client_uid = tag_select_uid.val() as string;
                globalClient.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
                    if(!result || result.length == 0) return Promise.reject("invalid data");
                    tag_select_uid.attr('pattern', null).removeClass('is-invalid');

                    tag_client_name.val(result[0].client_nickname );
                    tag_client_uid.val(result[0].client_unique_id);
                    tag_client_dbid.val(result[0].client_database_id);

                    current_cldbid = result[0].client_database_id;
                    editor.trigger_update();
                }).catch(error => {
                    console.log(error);
                    if(error instanceof CommandResult) {
                        if(error.id == ErrorID.EMPTY_RESULT)
                            error = "unknown client";
                        else
                            error = error.extra_message || error.message;
                    }

                    tag_client_name.val("");
                    tag_client_uid.val("");
                    tag_client_dbid.val("");

                    tag_select_error.text(error);
                    tag_select_uid.attr('pattern', '^[a]{1000}$').addClass('is-invalid');
                    editor.set_mode(PermissionEditorMode.UNSET);
                });
            };

            tab_tag.find(".client-select-uid").on('change', event => resolve_client());
        }
    }

    function apply_client_permission(editor: PermissionEditor, tab_tag: JQuery) {
        let current_cldbid: number = 0;

        /* the editor */
        {
            const pe_client = tab_tag.find("permission-editor.client");
            tab_tag.on('show', event => {
                console.error("Channel tab show");

                pe_client.append(editor.container);
                if(globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST).granted(1)) {
                    if(current_cldbid)
                        editor.set_mode(PermissionEditorMode.VISIBLE);
                    else
                        editor.set_mode(PermissionEditorMode.UNSET);
                } else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }

                editor.set_listener_update(() => {
                    if(!current_cldbid) return;

                    globalClient.permissions.requestClientPermissions(current_cldbid).then(result => {
                        editor.set_permissions(result);
                        editor.set_mode(PermissionEditorMode.VISIBLE);
                    }).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener((permission, value) => {
                    if (!current_cldbid)
                        return Promise.reject("unset client");

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            return globalClient.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id_grant(),
                            });
                        }
                    } else {
                        /* add the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client permission %s. permission.{id: %o, value: %o, flag_skip: %o, flag_negate: %o}"),
                                permission.name,
                                permission.id,
                                value.value,
                                value.flag_skip,
                                value.flag_negate
                            );

                            return globalClient.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegate: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }


        const tag_select_uid = tab_tag.find(".client-select input");
        const tag_select_error = tab_tag.find(".client-select .invalid-feedback");

        const tag_client_name = tab_tag.find(".client-name");
        const tag_client_uid = tab_tag.find(".client-uid");
        const tag_client_dbid = tab_tag.find(".client-dbid");

        const resolve_client = () => {
            let client_uid = tag_select_uid.val() as string;
            globalClient.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
                if(!result || result.length == 0) return Promise.reject("invalid data");
                tag_select_uid.attr('pattern', null).removeClass('is-invalid');

                tag_client_name.val(result[0].client_nickname );
                tag_client_uid.val(result[0].client_unique_id);
                tag_client_dbid.val(result[0].client_database_id);

                current_cldbid = result[0].client_database_id;
                editor.trigger_update();
            }).catch(error => {
                console.log(error);
                if(error instanceof CommandResult) {
                    if(error.id == ErrorID.EMPTY_RESULT)
                        error = "unknown client";
                    else
                        error = error.extra_message || error.message;
                }

                tag_client_name.val("");
                tag_client_uid.val("");
                tag_client_dbid.val("");

                tag_select_error.text(error);
                tag_select_uid.attr('pattern', '^[a]{1000}$').addClass('is-invalid');
                editor.set_mode(PermissionEditorMode.UNSET);
            });
        };

        tab_tag.find(".client-select-uid").on('change', event => resolve_client());
    }

    function apply_channel_permission(editor: PermissionEditor, tab_tag: JQuery) {
        let current_channel: ChannelEntry | undefined;

        /* the editor */
        {
            const pe_channel = tab_tag.find("permission-editor.channel");
            tab_tag.on('show', event => {
                console.error("Channel tab show");
                pe_channel.append(editor.container);
                if(globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }

                editor.set_listener_update(() => {
                    if(!current_channel) return;

                    globalClient.permissions.requestChannelPermissions(current_channel.channelId).then(result => editor.set_permissions(result)).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener((permission, value) => {
                    if (!current_channel)
                        return Promise.reject("unset channel");

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            return globalClient.serverConnection.send_command("channeldelperm", {
                                cid: current_channel.channelId,
                                permid: permission.id,
                            });
                        } else {
                            /* TODO Remove this because its totally useless. Remove this from the UI as well */
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channeldelperm", {
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                            });
                        }
                    } else {
                        /* add the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel permission %s. permission.{id: %o, value: %o, flag_skip: %o, flag_negate: %o}"),
                                permission.name,
                                permission.id,
                                value.value,
                                value.flag_skip,
                                value.flag_negate
                            );

                            return globalClient.serverConnection.send_command("channeladdperm", {
                                cid: current_channel.channelId,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            });
                        } else {
                            /* TODO Remove this because its totally useless. Remove this from the UI as well */
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channeladdperm", {
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegate: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }

        let channel_list = tab_tag.find(".list-channel .entries");
        build_channel_tree(channel_list, channel => {
            current_channel = channel;
            editor.trigger_update();
        });
    }

    function apply_channel_groups(editor: PermissionEditor, tab_tag: JQuery) {
        let current_group;

        /* the editor */
        {
            const pe_server = tab_tag.find("permission-editor.group-channel");
            tab_tag.on('show', event => {
                console.error("Channel group tab show");
                pe_server.append(editor.container);
                if(globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }

                editor.set_listener_update(() => {
                    if(!current_group) return;

                    globalClient.groups.request_permissions(current_group).then(result => editor.set_permissions(result)).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener((permission, value) => {
                    if (!current_group)
                        return Promise.reject("unset channel group");

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel group permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            return globalClient.serverConnection.send_command("channelgroupdelperm", {
                                cgid: current_group.id,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channelgroupdelperm", {
                                cgid: current_group.id,
                                permid: permission.id_grant(),
                            });
                        }
                    } else {
                        /* add the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel group permission %s. permission.{id: %o, value: %o, flag_skip: %o, flag_negate: %o}"),
                                permission.name,
                                permission.id,
                                value.value,
                                value.flag_skip,
                                value.flag_negate
                            );

                            return globalClient.serverConnection.send_command("channelgroupaddperm", {
                                cgid: current_group.id,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel group grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("channelgroupaddperm", {
                                cgid: current_group.id,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegate: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }


        /* list all channel groups */
        {
            let group_list = tab_tag.find(".list-group-channel .entries");

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
                    current_group = group;
                    group_list.find(".selected").removeClass("selected");
                    tag.addClass("selected");

                    //TODO trigger only if the editor is in channel group mode!
                    editor.trigger_update();
                });
            }

            /* because the server menu is the first which will be shown */
            setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
        }
    }

    /*
        b_virtualserver_servergroup_permission_list
        b_virtualserver_channel_permission_list
        b_virtualserver_client_permission_list
        b_virtualserver_channelgroup_permission_list
        b_virtualserver_channelclient_permission_list
        b_virtualserver_playlist_permission_list
     */
    function apply_server_groups(editor: PermissionEditor, tab_tag: JQuery) {
        let current_group;

        /* list all groups */
        {
            let group_list = tab_tag.find(".list-group-server .entries");

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
                    current_group = group;
                    group_list.find(".selected").removeClass("selected");
                    tag.addClass("selected");
                    editor.trigger_update();
                });
            }

            /* because the server menu is the first which will be shown */
            setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
        }

        /* the editor */
        {
            const pe_server = tab_tag.find("permission-editor.group-server");
            tab_tag.on('show', event => {
                console.error("Server tab show");
                pe_server.append(editor.container);
                if(globalClient.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }
                editor.set_listener_update(() => {
                    globalClient.groups.request_permissions(current_group).then(result => editor.set_permissions(result)).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener((permission, value) => {
                    if (!current_group)
                        return Promise.reject("unset server group");

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing server group permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            return globalClient.serverConnection.send_command("servergroupdelperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing server group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("servergroupdelperm", {
                                sgid: current_group.id,
                                permid: permission.id_grant(),
                            });
                        }
                    } else {
                        /* add the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating server group permission %s. permission.{id: %o, value: %o, flag_skip: %o, flag_negate: %o}"),
                                permission.name,
                                permission.id,
                                value.value,
                                value.flag_skip,
                                value.flag_negate
                            );

                            return globalClient.serverConnection.send_command("servergroupaddperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating server group grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return globalClient.serverConnection.send_command("servergroupaddperm", {
                                sgid: current_group.id,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegate: false
                            });
                        }
                    }
                });

                editor.trigger_update();
            });
        }
    }
}