/**
 * RIP old HTML based editor (too many nodes, made the browser laggy)
 */
namespace unused {
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

                            contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Expend group"),
                                callback: () => update_collapse_status(true, false)
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Expend all"),
                                callback: () => update_collapse_status(true, true)
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Collapse group"),
                                callback: () => update_collapse_status(false, false)
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
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

                                    let entries: contextmenu.MenuEntry[] = [];
                                    if(tag_permission.hasClass("value-unset")) {
                                        entries.push({
                                            type: contextmenu.MenuEntryType.ENTRY,
                                            name: tr("Add permission"),
                                            callback: () => tag_permission.trigger('dblclick')
                                        });
                                    } else {
                                        entries.push({
                                            type: contextmenu.MenuEntryType.ENTRY,
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
                                            type: contextmenu.MenuEntryType.ENTRY,
                                            name: tr("Add grant permission"),
                                            callback: () => tag_permission.find(".column-granted").trigger('dblclick')
                                        });
                                    } else {
                                        entries.push({
                                            type: contextmenu.MenuEntryType.ENTRY,
                                            name: tr("Remove grant permission"),
                                            callback: () =>
                                                tag_granted.val('').trigger('focusout') /* empty values are handled within focus out */
                                        });
                                    }
                                    entries.push(contextmenu.Entry.HR());
                                    entries.push({
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Expend all"),
                                        callback: () => update_collapse_status(true, true)
                                    });
                                    entries.push({
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Collapse all"),
                                        callback: () => update_collapse_status(false, true)
                                    });
                                    entries.push(contextmenu.Entry.HR());
                                    entries.push({
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Show permission description"),
                                        callback: () => {
                                            createInfoModal(
                                                tr("Permission description"),
                                                tr("Permission description for permission ") + permission.name + ": <br>" + permission.description
                                            ).open();
                                        }
                                    });
                                    entries.push({
                                        type: contextmenu.MenuEntryType.ENTRY,
                                        name: tr("Copy permission name"),
                                        callback: () => {
                                            copy_to_clipboard(permission.name);
                                        }
                                    });

                                    contextmenu.spawn_context_menu(event.pageX, event.pageY, ...entries);
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
}