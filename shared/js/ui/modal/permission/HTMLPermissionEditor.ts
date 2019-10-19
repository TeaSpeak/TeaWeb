/// <reference path="./ModalPermissionEdit.ts" /> /* first needs the AbstractPermissionEdit */

namespace pe {
    class HTMLPermission {
        readonly handle: HTMLPermissionEditor;
        readonly group: HTMLPermissionGroup;
        readonly permission: PermissionInfo;
        readonly index: number;

        tag: JQuery;
        tag_name: JQuery;
        tag_container_value: JQuery;
        tag_container_granted: JQuery;
        tag_container_skip: JQuery;
        tag_container_negate: JQuery;

        hidden: boolean;

        /* the "actual" values */
        private _mask = 0; /* fourth bit: hidden by filer | third bit: value type | second bit: grant shown | first bit: value shown */

        private _tag_value: JQuery;
        private _tag_value_input: JQuery;

        private _tag_granted: JQuery;
        private _tag_granted_input: JQuery;

        private _tag_skip: JQuery;
        private _tag_skip_input: JQuery;

        private _tag_negate: JQuery;
        private _tag_negate_input: JQuery;

        private _value: number | undefined;
        private _grant: number | undefined;
        private flags: number; /* 0x01 := Skip | 0x02 := Negate */

        constructor(handle: HTMLPermissionEditor, group: HTMLPermissionGroup, permission: PermissionInfo, index: number) {
            this.handle = handle;
            this.permission = permission;
            this.index = index;
            this.group = group;

            this.build_tag();
        }

        private static build_checkbox() : {tag: JQuery, input: JQuery} {
            let tag, input;
            tag = $.spawn("label").addClass("switch").append([
                input = $.spawn("input").attr("type", "checkbox"),
                $.spawn("span").addClass("slider").append(
                    $.spawn("div").addClass("dot")
                )
            ]);
            return {tag: tag, input: input};
        }

        private static number_filter_re = /^[-+]?([0-9]{0,9})$/;
        private static number_filter = (event: KeyboardEvent) => {
            if(event.ctrlKey)
                return;

            const target = <HTMLInputElement>event.target;
            if(event.key === "Enter") {
                target.blur();
                return;
            }

            if('keyCode' in event) {
                /* everything under 46 is a control key except 32 its space */
                if(event.keyCode < 46 && event.keyCode != 32)
                    return;

                if(!HTMLPermission.number_filter_re.test(target.value + String.fromCharCode(event.keyCode))) {
                    event.preventDefault();
                    return;
                }
            } else {
                const e = <JQuery.Event>event; /* for some reason typescript deducts the event type to "never" */
                if(!HTMLPermission.number_filter_re.test(e.key)) {
                    e.preventDefault();
                    return;
                }
            }
        };

        private build_tag() {
            this.tag = $.spawn("div").addClass("entry permission").css('padding-left', this.index + "em").append([
                this.tag_name = $.spawn("div").addClass("column-name").text(this.permission.name),
                this.tag_container_value = $.spawn("div").addClass("column-value"),
                this.tag_container_skip = $.spawn("div").addClass("column-skip"),
                this.tag_container_negate = $.spawn("div").addClass("column-negate"),
                this.tag_container_granted = $.spawn("div").addClass("column-granted")
            ]);

            if(this.permission.is_boolean()) {
                let value = HTMLPermission.build_checkbox();
                this._tag_value = value.tag;
                this._tag_value_input = value.input;

                this._tag_value_input.on('change', event => {
                    const value = this._tag_value_input.prop('checked') ? 1 : 0;

                    this.handle.trigger_change(this.permission, {
                        remove: false,

                        value: value,
                        flag_skip: (this.flags & 0x01) > 0,
                        flag_negate: (this.flags & 0x02) > 0
                    }).then(() => {
                        this._value = value;
                    }).catch(error => {
                        this._reset_value();
                    });
                });

                this._mask |= 0x04;
            } else {
                this._tag_value = $.spawn("input").addClass("number");
                this._tag_value_input = this._tag_value;

                this._tag_value_input.on('keydown', HTMLPermission.number_filter as any);
                this._tag_value_input.on('change', event => {
                     const str_value =  this._tag_value_input.val() as string;
                     const value = parseInt(str_value);
                     if(!HTMLPermission.number_filter_re.test(str_value) || value == NaN) {
                         console.warn(tr("Failed to parse given permission value string: %s"), this._tag_value_input.val());
                         this._reset_value();
                         return;
                     }

                     this.handle.trigger_change(this.permission, {
                         remove: false,

                         value: value,
                         flag_skip: (this.flags & 0x01) > 0,
                         flag_negate: (this.flags & 0x02) > 0
                     }).then(() => {
                         this._value = value;
                         this._update_active_class();
                     }).catch(error => {
                         this._reset_value();
                     });
                });
            }

            {
                let skip = HTMLPermission.build_checkbox();
                this._tag_skip = skip.tag;
                this._tag_skip_input = skip.input;

                this._tag_skip_input.on('change', event => {
                    const value = this._tag_skip_input.prop('checked');

                    this.handle.trigger_change(this.permission, {
                        remove: false,

                        value: this._value,
                        flag_skip: value,
                        flag_negate: (this.flags & 0x02) > 0
                    }).then(() => {
                        if(value)
                            this.flags |= 0x01;
                        else
                            this.flags &= ~0x1;
                        this._update_active_class();
                    }).catch(error => {
                        this._reset_value();
                    });
                });
            }

            {
                let negate = HTMLPermission.build_checkbox();
                this._tag_negate = negate.tag;
                this._tag_negate_input = negate.input;

                this._tag_negate_input.on('change', event => {
                    const value = this._tag_negate_input.prop('checked');

                    console.log("Negate value: %o", value);
                    this.handle.trigger_change(this.permission, {
                        remove: false,

                        value: this._value,
                        flag_skip: (this.flags & 0x01) > 0,
                        flag_negate: value
                    }).then(() => {
                        if(value)
                            this.flags |= 0x02;
                        else
                            this.flags &= ~0x2;
                        this._update_active_class();
                    }).catch(error => {
                        this._reset_value();
                    });
                });
            }

            {
                this._tag_granted = $.spawn("input").addClass("number");
                this._tag_granted_input = this._tag_granted;

                this._tag_granted_input.on('keydown', HTMLPermission.number_filter as any);
                this._tag_granted_input.on('change', event => {
                    const str_value =  this._tag_granted_input.val() as string;
                    const value = parseInt(str_value);
                    if(!HTMLPermission.number_filter_re.test(str_value) || Number.isNaN(value)) {
                        console.warn(tr("Failed to parse given permission granted value string: %s"), this._tag_granted_input.val());
                        this._reset_value();
                        return;
                    }

                    this.handle.trigger_change(this.permission, {
                        remove: false,

                        granted: value
                    }).then(() => {
                        this._grant = value;
                        this._update_active_class();
                    }).catch(error => {
                        this._reset_grant();
                    });
                });
            }

            /* double click handler */
            {
                this.tag.on('dblclick', event => this._trigger_value_assign())
            }

            /* context menu */
            {
                this.tag.on('contextmenu', event => {
                    if(event.isDefaultPrevented())
                        return;
                    event.preventDefault();

                    let entries: contextmenu.MenuEntry[] = [];
                    if(typeof(this._value) === "undefined") {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Add permission"),
                            callback: () => this._trigger_value_assign()
                        });
                    } else {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Remove permission"),
                            callback: () => {
                                this.handle.trigger_change(this.permission, {
                                    remove: true,
                                    value: 0
                                }).then(() => {
                                    this.value(undefined);
                                }).catch(error => {
                                    //We have to do nothing
                                });
                            }
                        });
                    }

                    if(typeof(this._grant) === "undefined") {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Add grant permission"),
                            callback: () => this._trigger_grant_assign()
                        });
                    } else {
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Remove grant permission"),
                            callback: () => {
                                this.handle.trigger_change(this.permission, {
                                    remove: true,
                                    granted: 0
                                }).then(() => {
                                    this.granted(undefined);
                                }).catch(error => {
                                    //We have to do nothing
                                });
                            }
                        });
                    }
                    entries.push(contextmenu.Entry.HR());
                    if(this.group.collapsed)
                        entries.push({ /* This could never happen! */
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Expend group"),
                            callback: () => this.group.expend()
                        });
                    else
                        entries.push({
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Collapse group"),
                            callback: () => this.group.collapse()
                        });
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Expend all"),
                        callback: () => this.handle.expend_all()
                    });
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Collapse all"),
                        callback: () => this.handle.collapse_all()
                    });
                    entries.push(contextmenu.Entry.HR());
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Show permission description"),
                        callback: () => {
                            createInfoModal(
                                tr("Permission description"),
                                tr("Permission description for permission ") + this.permission.name + ": <br>" + this.permission.description
                            ).open();
                        }
                    });
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Copy permission name"),
                        callback: () => {
                            copy_to_clipboard(this.permission.name);
                        }
                    });

                    contextmenu.spawn_context_menu(event.pageX, event.pageY, ...entries);
                });
            }
        }

        private _trigger_value_assign() {
            if(typeof(this._value) === "undefined")
                this.value(this._grant || 1, false, false); //TODO: Use max granted value?
            this._tag_value_input.focus();
            if(this.permission.is_boolean())
                this._tag_value_input.trigger('change');
        }

        private _trigger_grant_assign() {
            this.granted(1); //TODO: Use max granted value?
            this._tag_granted_input.focus();
        }

        hide() {
            this._mask &= ~0x08;
            for(const element of this.tag)
                (<HTMLElement>element).style.display = 'none';
        }

        show() {
            this._mask |= 0x08;
            for(const element of this.tag)
                (<HTMLElement>element).style.display = 'flex';
        }

        is_filtered() : boolean {
            return (this._mask & 0x10) > 0;
        }

        set_filtered(flag: boolean) {
            if(flag)
                this._mask |= 0x10;
            else
                this._mask &= ~0x10;
        }

        is_set() : boolean {
            return (this._mask & 0x03) > 0;
        }

        get_value() { return this._value; }

        value(value: number | undefined, skip?: boolean, negate?: boolean) {
            if(typeof value === "undefined") {
                this._tag_value.detach();
                this._tag_negate.detach();
                this._tag_skip.detach();

                this._value = undefined;
                this.flags = 0;

                this._update_active_class();
                this._mask &= ~0x1;
                return;
            }

            if((this._mask & 0x1) == 0) {
                this._tag_value.appendTo(this.tag_container_value);
                this._tag_negate.appendTo(this.tag_container_negate);
                this._tag_skip.appendTo(this.tag_container_skip);

                this._update_active_class();
                this._mask |= 0x01;
            }

            if((this._mask & 0x04) > 0)
                this._tag_value_input.prop('checked', !!value);
            else
                this._tag_value_input.val(value);
            this._tag_skip_input.prop('checked', !!skip);
            this._tag_negate_input.prop('checked', !!negate);

            this._value = value;
            this.flags = (!!skip ? 0x01 : 0) | (!!negate ? 0x2 : 0);
        }

        granted(value: number | undefined) {
            if(typeof value === "undefined") {
                this._tag_granted.detach();

                this._update_active_class();
                this._grant = undefined;
                this._mask &= ~0x2;
                return;
            }

            if((this._mask & 0x2) == 0) {
                this._mask |= 0x02;
                this._tag_granted.appendTo(this.tag_container_granted);
                this._update_active_class();
            }
            this._tag_granted_input.val(value);
            this._grant = value;
        }

        reset() {
            this._mask &= ~0x03;

            this._tag_value.detach();
            this._tag_negate.detach();
            this._tag_skip.detach();

            this._tag_granted.detach();

            this._value = undefined;
            this._grant = undefined;
            this.flags = 0;

            const tag = this.tag[0] as HTMLDivElement;
            tag.classList.remove("active");
        }

        private _reset_value() {
            if(typeof(this._value) === "undefined") {
                if((this._mask & 0x1) != 0)
                    this.value(undefined);
            } else {
                this.value(this._value, (this.flags & 0x1) > 1, (this.flags & 0x2) > 1);
            }
        }

        private _reset_grant() {
            if(typeof(this._grant) === "undefined") {
                if((this._mask & 0x2) != 0)
                    this.granted(undefined);
            } else {
                this.granted(this._grant);
            }
        }

        private _update_active_class() {
            const value = typeof(this._value) !== "undefined" || typeof(this._grant) !== "undefined";
            const tag = this.tag[0] as HTMLDivElement;
            if(value)
                tag.classList.add("active");
            else
                tag.classList.remove("active");
        }
    }

    class HTMLPermissionGroup {
        readonly handle: HTMLPermissionEditor;
        readonly group: PermissionGroup;
        readonly index: number;

        private _tag_arrow: JQuery;

        permissions: HTMLPermission[] = [];
        children: HTMLPermissionGroup[] = [];

        tag: JQuery;
        visible: boolean;

        collapsed: boolean;
        parent_collapsed: boolean;

        constructor(handle: HTMLPermissionEditor, group: PermissionGroup, index: number) {
            this.handle = handle;
            this.group = group;
            this.index = index;

            this._build_tag();
        }

        private _build_tag() {
            this.tag = $.spawn("div").addClass("entry group").css('padding-left', this.index + "em").append([
                $.spawn("div").addClass("column-name").append([
                    this._tag_arrow = $.spawn("div").addClass("arrow down"),
                    $.spawn("div").addClass("group-name").text(this.group.name)
                ]),
                $.spawn("div").addClass("column-value"),
                $.spawn("div").addClass("column-skip"),
                $.spawn("div").addClass("column-negate"),
                $.spawn("div").addClass("column-granted")
            ]);

            this.tag.on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;
                event.preventDefault();

                const entries: contextmenu.MenuEntry[] = [];
                if(this.collapsed)
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Expend group"),
                        callback: () => this.expend(),
                    });
                else
                    entries.push({
                        type: contextmenu.MenuEntryType.ENTRY,
                        name: tr("Collapse group"),
                        callback: () => this.collapse(),
                    });
                entries.push(contextmenu.Entry.HR());

                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Expend all"),
                    callback: () => this.handle.expend_all()
                });
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse all"),
                    callback: () => this.handle.collapse_all()
                });

                contextmenu.spawn_context_menu(event.pageX, event.pageY, ...entries);
            });

            this._tag_arrow.on('click', event => {
                if(this.collapsed)
                    this.expend();
                else
                    this.collapse();
            })
        }

        update_visibility() {
            let flag = false;
            if (!flag) {
                for (const group of this.children) {
                    if (group.visible) {
                        flag = true;
                        break;
                    }
                }
            }

            if (!flag) {
                for (const permission of this.permissions) {
                    if (!permission.is_filtered()) {
                        flag = true;
                        break;
                    }
                }
            }

            this.visible = flag;

            flag = flag && !this.parent_collapsed;
            for(const element of this.tag)
                (<HTMLElement>element).style.display = flag ? 'flex' : 'none';

            const arrow_node = this._tag_arrow[0];
            arrow_node.classList.remove(this.collapsed ? "down" : "right");
            arrow_node.classList.add(!this.collapsed ? "down" : "right");
        }

        collapse() {
            this.collapsed = true;

            const children = [...this.children];
            while (true) {
                const child = children.pop();
                if(!child) break;

                child.parent_collapsed = true;
                children.push(...child.children);
            }

            this.handle.update_view();
        }

        expend() {
            this.collapsed = false;

            if(this.parent_collapsed)
                return;

            const children = [...this.children];
            while (true) {
                const child = children.pop();
                if(!child) break;

                child.parent_collapsed = false;
                if(!child.collapsed)
                    children.push(...child.children);
            }

            this.handle.update_view();
        }
    }

    export class HTMLPermissionEditor extends Modals.AbstractPermissionEditor {
        container: JQuery;

        private mode_container_permissions: JQuery;
        private mode_container_error_permission: JQuery;
        private mode_container_unset: JQuery;

        private filter_input: JQuery;
        private filter_grant: JQuery;

        private button_toggle: JQuery;

        private even_list: ({ visible() : boolean; set_even(flag: boolean); })[];
        private permission_map: Array<HTMLPermission>;
        private permission_groups: HTMLPermissionGroup[];

        constructor() {
            super();
        }

        initialize(permissions: GroupedPermissions[]) {
            this._permissions = permissions;
            this.build_tag();
        }

        private update_filter() {
            const value = (this.filter_input.val() as string).toLowerCase();
            const grant = !!this.filter_grant.prop('checked');

            const _filter = (permission: HTMLPermission) => {
                if(value && permission.permission.name.indexOf(value) == -1) return false;
                if(grant && !permission.is_set()) return false;

                return true;
            };

            for(let id = 1; id < this.permission_map.length; id++) {
                const permission = this.permission_map[id];
                let flag = _filter(permission);
                permission.set_filtered(!flag);


                flag = flag && !permission.group.collapsed && !permission.group.parent_collapsed; /* hide when parent is filtered */
                if(flag) permission.show();
                else permission.hide();
            }

            /* run in both directions, to update the parent visibility and the actiual visibility */
            for(const group of this.permission_groups)
                group.update_visibility();
            for(const group of this.permission_groups.slice().reverse())
                group.update_visibility();


            let index = 0;
            for(const entry of this.even_list) {
                if(!entry.visible()) continue;
                entry.set_even((index++ & 0x1) == 0);
            }
        }

        private update_icon() {
            const permission = this.permission_map.find(e => e && e.permission.name === "i_icon_id");
            const icon_id = permission ? permission.get_value() : 0;

            const icon_node = this.container.find(".container-icon-select .icon-preview");
            icon_node.children().remove();

            let resolve: Promise<JQuery<HTMLDivElement>>;
            if(icon_id >= 0 && icon_id <= 1000)
                resolve = Promise.resolve(IconManager.generate_tag({id: icon_id, url: ""}));
            else
                resolve = this.icon_resolver(permission ? permission.get_value() : 0).then(e => $(e));

            resolve.then(tag => tag.appendTo(icon_node))
                .catch(error => {
                    log.error(LogCategory.PERMISSIONS, tr("Failed to generate empty icon preview: %o"), error);
                });
        }

        private build_tag() {
            this.container = $("#tmpl_permission_editor_html").renderTag();
            this.container.find("input").on('change', event => {
                $(event.target).parents(".form-group").toggleClass('is-filled', !!(event.target as HTMLInputElement).value);
            });

            /* search for that as long we've not that much nodes */
            this.mode_container_permissions = this.container.find(".container-mode-permissions");
            this.mode_container_error_permission = this.container.find(".container-mode-no-permissions");
            this.mode_container_unset = this.container.find(".container-mode-unset");

            this.filter_input = this.container.find(".filter-input");
            this.filter_input.on('change keyup', event => this.update_filter());

            this.filter_grant = this.container.find(".filter-granted");
            this.filter_grant.on('change', event => this.update_filter());

            this.button_toggle = this.container.find(".button-toggle-clients");
            this.button_toggle.on('click', () => {
                if(this._toggle_callback)
                    this.button_toggle.text(this._toggle_callback());
            });

            this.container.find(".button-update").on('click', event => this.trigger_update());

            /* allocate array space */
            {
                let max_index = 0;
                let tmp: GroupedPermissions[] = [];
                while(true) {
                    const entry = tmp.pop();
                    if(!entry) break;
                    for(const permission of entry.permissions)
                        if(permission.id > max_index)
                            max_index = permission.id;
                    tmp.push(...entry.children);
                }
                this.permission_map = new Array(max_index + 1);
            }
            this.permission_groups = [];
            this.even_list = [];

            {
                const container_permission = this.mode_container_permissions.find(".container-permission-list .body");

                const build_group = (pgroup: HTMLPermissionGroup, group: GroupedPermissions, index: number) => {
                    const hgroup = new HTMLPermissionGroup(this, group.group, index);
                    hgroup.tag.appendTo(container_permission);
                    this.even_list.push({
                        set_even(flag: boolean) {
                            if(flag)
                                hgroup.tag[0].classList.add('even');
                            else
                                hgroup.tag[0].classList.remove('even');
                        },

                        visible(): boolean {
                            return !hgroup.parent_collapsed && hgroup.visible;
                        }
                    });

                    if(pgroup)
                        pgroup.children.push(hgroup);
                    this.permission_groups.push(hgroup);

                    index++;
                    for(const child of group.children)
                        build_group(hgroup, child, index);

                    for(const permission of group.permissions) {
                        const perm = new HTMLPermission(this, hgroup, permission, index);
                        this.permission_map[perm.permission.id] = perm;
                        perm.tag.appendTo(container_permission);
                        hgroup.permissions.push(perm);
                        this.even_list.push({
                            set_even(flag: boolean) {
                                if(flag)
                                    perm.tag[0].classList.add('even');
                                else
                                    perm.tag[0].classList.remove('even');
                            },

                            visible(): boolean {
                                return !perm.is_filtered() && !perm.group.collapsed && !perm.group.parent_collapsed;
                            }
                        });
                    }
                };

                for(const group of this._permissions)
                    build_group(undefined, group, 0);
            }

            {
                const container = this.container.find(".container-icon-select");
                container.find(".button-select-icon").on('click', event => {
                    const permission = this.permission_map.find(e => e && e.permission.name === "i_icon_id");
                    this.icon_selector(permission ? permission.get_value() : 0).then(id => {
                        const permission = this.permission_map.find(e => e && e.permission.name === "i_icon_id");
                        if(permission) {
                            this.trigger_change(permission.permission, {
                                remove: false,
                                value: id,
                                flag_skip: false,
                                flag_negate: false
                            }, false).then(() => {
                                log.debug(LogCategory.PERMISSIONS, tr("Selected new icon %s"), id);

                                permission.value(id, false, false);
                                this.update_icon();
                            }).catch(error => {
                                log.warn(LogCategory.PERMISSIONS, tr("Failed to set icon permission within permission editor: %o"), error);
                            });
                        } else {
                            log.warn(LogCategory.PERMISSIONS, tr("Failed to find icon permissions within permission editor"));
                        }
                    }).catch(error => {
                        log.error(LogCategory.PERMISSIONS, tr("Failed to select an icon for the icon permission: %o"), error);
                    });
                });

                container.find(".button-icon-remove").on('click', event => {
                    const permission = this.permission_map.find(e => e && e.permission.name === "i_icon_id");
                    if(permission) {
                        this.trigger_change(permission.permission, {
                            remove: true,
                        }, false).then(() => {
                            permission.value(undefined);
                            this.update_icon();
                        }).catch(error => {
                            log.warn(LogCategory.PERMISSIONS, tr("Failed to remove icon permission within permission editor: %o"), error);
                        });
                    } else {
                        log.warn(LogCategory.PERMISSIONS, tr("Failed to find icon permission within permission editor"));
                    }
                });
            }

            this.mode_container_permissions.on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;
                event.preventDefault();

                const entries: contextmenu.MenuEntry[] = [];
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Expend all"),
                    callback: () => this.expend_all()
                });
                entries.push({
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Collapse all"),
                    callback: () => this.collapse_all()
                });

                contextmenu.spawn_context_menu(event.pageX, event.pageY, ...entries);
            });

            this.set_mode(Modals.PermissionEditorMode.UNSET);
        }

        html_tag(): JQuery<HTMLElement> {
            return this.container;
        }

        set_permissions(u_permissions?: PermissionValue[]) {
            const permissions = new Array<PermissionValue>(this.permission_map.length);

            /* initialize update array, boundary checks are already made by js */
            for(const perm of u_permissions)
                permissions[perm.type.id] = perm;

            /* there is no permission with id 0 */
            for(let id = 1; id < permissions.length; id++) {
                const new_permission = permissions[id];
                const permission_handle = this.permission_map[id];
                if(!new_permission) {
                    permission_handle.reset();
                    continue;
                }

                permission_handle.value(new_permission.value, new_permission.flag_skip, new_permission.flag_negate);
                permission_handle.granted(new_permission.granted_value);
            }

            this.update_icon();
            this.update_filter();
        }

        set_mode(mode: Modals.PermissionEditorMode) {
            this.mode_container_permissions.css('display', mode == Modals.PermissionEditorMode.VISIBLE ? 'flex' : 'none');
            this.mode_container_error_permission.css('display', mode == Modals.PermissionEditorMode.NO_PERMISSION ? 'flex' : 'none');
            this.mode_container_unset.css('display', mode == Modals.PermissionEditorMode.UNSET ? 'block' : 'none');
        }

        trigger_change(permission: PermissionInfo, value?: Modals.PermissionEditor.PermissionValue, update_icon?: boolean) : Promise<void> {
            if(this._listener_change) {
                if((typeof(update_icon) !== "boolean" || update_icon) && permission && permission.name === "i_icon_id")
                    return this._listener_change(permission, value).then(e => {
                        setTimeout(() => this.update_icon(), 0); /* we need to fully handle the response and then only we're able to update the icon */
                        return e;
                    });
                else
                    return this._listener_change(permission, value);
            }

            return Promise.reject();
        }

        collapse_all() {
            for(const group of this.permission_groups) {
                group.collapsed = true;
                for(const child of group.children)
                    child.parent_collapsed = true;
            }
            this.update_filter(); /* update display state of all entries */
        }

        expend_all() {
            for(const group of this.permission_groups) {
                group.collapsed = false;
                group.parent_collapsed = false;
            }
            this.update_filter(); /* update display state of all entries */
        }

        update_view() { return this.update_filter(); }

        set_toggle_button(callback: () => string, initial: string) {
            this._toggle_callback = callback;
            if(this._toggle_callback) {
                this.button_toggle.text(initial);
                this.button_toggle.show();
            } else {
                this.button_toggle.hide();
            }
        }
    }
}