/// <reference path="../../../ui/elements/modal.ts" />
/// <reference path="../../../ConnectionHandler.ts" />
/// <reference path="../../../proto.ts" />

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
        private listener_change: PermissionEditor.change_listener_t = () => Promise.resolve();
        private listener_update: () => any;

        private entry_editor: ui.PermissionEditor;

        icon_resolver: (id: number) => Promise<HTMLImageElement>;
        icon_selector: (current_id: number) => Promise<number>;

        constructor(permissions: GroupedPermissions[]) {
            this.permissions = permissions;
            this.entry_editor = new ui.PermissionEditor(permissions);
        }

        build_tag() {
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


                    for(const entry of this.entry_editor.permission_entries()) {
                        const permission = entry.permission();

                        let shown = filter_mask.length == 0 || permission.name.indexOf(filter_mask) != -1;
                        if(shown && req_granted) {
                            const value: PermissionValue = this.permission_value_map[permission.id];
                            shown = value && (value.hasValue() || value.hasGrant());
                        }

                        entry.hidden = !shown;
                    }
                    this.entry_editor.request_draw(true);
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

            {
                const tag_container = this.container.find(".entry-editor-container");
                tag_container.append(this.entry_editor.canvas_container);

                tag_container.parent().on('contextmenu', event => {
                    if(event.isDefaultPrevented()) return;
                    event.preventDefault();

                    spawn_context_menu(event.pageX, event.pageY, {
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: tr("Expend all"),
                        callback: () => this.entry_editor.expend_all()
                    }, {
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: tr("Collapse all"),
                        callback: () => this.entry_editor.collapse_all()
                    });
                });
            }

            /* setup the permissions */
            for(const entry of this.entry_editor.permission_entries()) {
                const permission = entry.permission();
                entry.on_change = () => {
                    const flag_remove = typeof(entry.value) !== "number";
                    this.listener_change(permission, {
                        remove: flag_remove,
                        flag_negate: entry.flag_negate,
                        flag_skip: entry.flag_skip,
                        value: flag_remove ? -2 : entry.value
                    }).then(() => {
                        if(flag_remove) {
                            const element = this.permission_value_map[permission.id];
                            if(!element) return; /* This should never happen, if so how are we displaying this permission?! */

                            element.value = undefined;
                            element.flag_negate = false;
                            element.flag_skip = false;
                        } else {
                            const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));

                            element.value = entry.value;
                            element.flag_skip = entry.flag_skip;
                            element.flag_negate = entry.flag_negate;
                        }

                        if(permission.name === "i_icon_id") {
                            this.icon_resolver(entry.value).then(e => {
                                entry.set_icon_id_image(e);
                                entry.request_full_draw();
                                this.entry_editor.request_draw(false);
                            }).catch(error => {
                                console.warn(tr("Failed to load icon for permission editor: %o"), error);
                            });
                        }
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    }).catch(() => {
                        const element = this.permission_value_map[permission.id];

                        entry.value = element && element.hasValue() ? element.value : undefined;
                        entry.flag_skip = element && element.flag_skip;
                        entry.flag_negate = element && element.flag_negate;

                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    });
                };

                entry.on_grant_change = () => {
                    const flag_remove = typeof(entry.granted) !== "number";

                    this.listener_change(permission, {
                        remove: flag_remove,
                        granted: flag_remove ? -2 : entry.granted,
                    }).then(() => {
                        if(flag_remove) {
                            const element = this.permission_value_map[permission.id];
                            if (!element) return; /* This should never happen, if so how are we displaying this permission?! */

                            element.granted_value = undefined;
                        } else {
                            const element = this.permission_value_map[permission.id] || (this.permission_value_map[permission.id] = new PermissionValue(permission));
                            element.granted_value = entry.granted;
                        }
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    }).catch(() => {
                        const element = this.permission_value_map[permission.id];

                        entry.granted = element && element.hasGrant() ? element.granted_value : undefined;
                        entry.request_full_draw();
                        this.entry_editor.request_draw(false);
                    });
                };

                entry.on_context_menu = (x, y) => {
                    let entries: ContextMenuEntry[] = [];
                    if(typeof(entry.value) === "undefined") {
                        entries.push({
                            type: MenuEntryType.ENTRY,
                            icon: "",
                            name: tr("Add permission"),
                            callback: () => entry.trigger_value_assign()
                        });
                    } else {
                        entries.push({
                            type: MenuEntryType.ENTRY,
                            icon: "",
                            name: tr("Remove permission"),
                            callback: () => {
                                entry.value = undefined;
                                entry.on_change();
                            }
                        });
                    }

                    if(typeof(entry.granted) === "undefined") {
                        entries.push({
                            type: MenuEntryType.ENTRY,
                            icon: "",
                            name: tr("Add grant permission"),
                            callback: () => entry.trigger_grant_assign()
                        });
                    } else {
                        entries.push({
                            type: MenuEntryType.ENTRY,
                            icon: "",
                            name: tr("Remove grant permission"),
                            callback: () => {
                                entry.granted = undefined;
                                entry.on_grant_change();
                            }
                        });
                    }
                    entries.push(MenuEntry.HR());
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: tr("Expend all"),
                        callback: () => this.entry_editor.expend_all()
                    });
                    entries.push({
                        type: MenuEntryType.ENTRY,
                        icon: "",
                        name: tr("Collapse all"),
                        callback: () => this.entry_editor.collapse_all()
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

                    spawn_context_menu(x, y, ...entries);
                }
            }
        }

        set_permissions(permissions?: PermissionValue[]) {
            permissions = permissions || [];
            this.permission_value_map = {};

            for(const permission of permissions)
                this.permission_value_map[permission.type.id] = permission;

            for(const entry of this.entry_editor.permission_entries()) {
                const permission = entry.permission();
                const value: PermissionValue = this.permission_value_map[permission.id];

                if(value && value.hasValue()) {
                    entry.value = value.value;
                    entry.flag_skip = value.flag_skip;
                    entry.flag_negate = value.flag_negate;
                    if(permission.name === "i_icon_id") {
                        this.icon_resolver(value.value).then(e => {
                            entry.set_icon_id_image(e);
                            entry.request_full_draw();
                            this.entry_editor.request_draw(false);
                        }).catch(error => {
                            console.warn(tr("Failed to load icon for permission editor: %o"), error);
                        });
                        entry.on_icon_select = this.icon_selector;
                    }
                } else {
                    entry.value = undefined;
                    entry.flag_skip = false;
                    entry.flag_negate = false;
                    entry.set_icon_id_image(undefined);
                }

                if(value && value.hasGrant()) {
                    entry.granted = value.granted_value;
                } else {
                    entry.granted = undefined;
                }
            }
            this.entry_editor.request_draw(true);
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
            if(mode == PermissionEditorMode.VISIBLE)
                this.entry_editor.draw(true);
        }

        update_ui() {
            this.entry_editor.draw(true);
        }
    }

    export function spawnPermissionEdit(connection: ConnectionHandler) : Modal {
        const modal = createModal({
            header: function() {
                return tr("Server Permissions");
            },
            body: function () {
                let properties: any = {};

                let tag = $("#tmpl_server_permissions").renderTag(properties);
                const pe = new PermissionEditor(connection.permissions.groupedPermissions());
                pe.build_tag();
                pe.icon_resolver = id => connection.fileManager.icons.resolve_icon(id).then(async icon => {
                    if(!icon)
                        return undefined;

                    const tag = document.createElement("img");
                    await new Promise((resolve, reject) => {
                        tag.onerror = reject;
                        tag.onload = resolve;
                        tag.src = icon.url;
                    });
                    return tag;
                });
                pe.icon_selector = current_icon => new Promise<number>(resolve => {
                    spawnIconSelect(connection, id => resolve(new Int32Array([id])[0]), current_icon);
                });

                /* initialisation */
                {
                    const pe_server = tag.find("permission-editor.group-server");
                    pe_server.append(pe.container); /* fuck off workaround to initialize form listener */
                }
                setTimeout(() => {
                    pe.update_ui();
                }, 500);

                apply_server_groups(connection, pe, tag.find(".tab-group-server"));
                apply_channel_groups(connection, pe, tag.find(".tab-group-channel"));
                apply_channel_permission(connection, pe, tag.find(".tab-channel"));
                apply_client_permission(connection, pe, tag.find(".tab-client"));
                apply_client_channel_permission(connection, pe, tag.find(".tab-client-channel"));
                return tag.tabify(false);
            },
            footer: undefined,

            width: "90%",
            height: "80%",
            trigger_tab: false,
            full_size: true
        });

        const tag = modal.htmlTag;
        tag.find(".btn_close").on('click', () => {
            modal.close();
        });

        return modal;
    }

    function build_channel_tree(connection: ConnectionHandler, channel_list: JQuery, select_callback: (channel: ChannelEntry) => any) {
        const root = connection.channelTree.get_first_channel();
        if(!root) return;

        const build_channel = (channel: ChannelEntry) => {
            let tag = $.spawn("div").addClass("channel").attr("channel-id", channel.channelId);
            connection.fileManager.icons.generateTag(channel.properties.channel_icon_id).appendTo(tag);
            {
                let name = $.spawn("a").text(channel.channelName() + " (" + channel.channelId + ")").addClass("name");
                //if(connection.channelTree.server.properties. == group.id)
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

    function apply_client_channel_permission(connection: ConnectionHandler, editor: PermissionEditor, tab_tag: JQuery) {
        let current_cldbid: number = 0;
        let current_channel: ChannelEntry;

        /* the editor */
        {
            const pe_client = tab_tag.find("permission-editor.client-channel");
            tab_tag.on('show', event => {
                console.error("Channel tab show");
                pe_client.append(editor.container);
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST).granted(1)) {
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

                    connection.permissions.requestClientChannelPermissions(current_cldbid, current_channel.channelId).then(result => {
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

                            return connection.serverConnection.send_command("channelclientdelperm", {
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

                            return connection.serverConnection.send_command("channelclientdelperm", {
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

                            return connection.serverConnection.send_command("channelclientaddperm", {
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

                            return connection.serverConnection.send_command("channelclientaddperm", {
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

        build_channel_tree(connection, tab_tag.find(".list-channel .entries"), channel => {
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
                connection.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
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

    function apply_client_permission(connection: ConnectionHandler, editor: PermissionEditor, tab_tag: JQuery) {
        let current_cldbid: number = 0;

        /* the editor */
        {
            const pe_client = tab_tag.find("permission-editor.client");
            tab_tag.on('show', event => {
                console.error("Channel tab show");

                pe_client.append(editor.container);
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST).granted(1)) {
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

                    connection.permissions.requestClientPermissions(current_cldbid).then(result => {
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

                            return connection.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return connection.serverConnection.send_command("clientaddperm", {
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

                            return connection.serverConnection.send_command("clientaddperm", {
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

                            return connection.serverConnection.send_command("clientaddperm", {
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
            connection.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
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

    function apply_channel_permission(connection: ConnectionHandler, editor: PermissionEditor, tab_tag: JQuery) {
        let current_channel: ChannelEntry | undefined;

        /* the editor */
        {
            const pe_channel = tab_tag.find("permission-editor.channel");
            tab_tag.on('show', event => {
                console.error("Channel tab show");
                pe_channel.append(editor.container);
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }

                editor.set_listener_update(() => {
                    if(!current_channel) return;

                    connection.permissions.requestChannelPermissions(current_channel.channelId).then(result => editor.set_permissions(result)).catch(error => {
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

                            return connection.serverConnection.send_command("channeldelperm", {
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

                            return connection.serverConnection.send_command("channeldelperm", {
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

                            return connection.serverConnection.send_command("channeladdperm", {
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

                            return connection.serverConnection.send_command("channeladdperm", {
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
        build_channel_tree(connection, channel_list, channel => {
            current_channel = channel;
            editor.trigger_update();
        });
    }

    function apply_channel_groups(connection: ConnectionHandler, editor: PermissionEditor, tab_tag: JQuery) {
        let current_group;

        /* the editor */
        {
            const pe_server = tab_tag.find("permission-editor.group-channel");
            tab_tag.on('show', event => {
                console.error("Channel group tab show");
                pe_server.append(editor.container);
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }

                editor.set_listener_update(() => {
                    if(!current_group) return;

                    connection.groups.request_permissions(current_group).then(result => editor.set_permissions(result)).catch(error => {
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

                            return connection.serverConnection.send_command("channelgroupdelperm", {
                                cgid: current_group.id,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return connection.serverConnection.send_command("channelgroupdelperm", {
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

                            return connection.serverConnection.send_command("channelgroupaddperm", {
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

                            return connection.serverConnection.send_command("channelgroupaddperm", {
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

            const allow_query_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1);
            const allow_template_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1);
            for(let group of connection.groups.channelGroups.sort(GroupManager.sorter())) {
                if(group.type == GroupType.QUERY) {
                    if(!allow_query_groups)
                        continue;
                } else if(group.type == GroupType.TEMPLATE) {
                    if(!allow_template_groups)
                        continue;
                }

                let tag = $.spawn("div").addClass("group").attr("group-id", group.id);
                connection.fileManager.icons.generateTag(group.properties.iconid).appendTo(tag);
                {
                    let name = $.spawn("a").text(group.name + " (" + group.id + ")").addClass("name");
                    if(group.properties.savedb)
                        name.addClass("savedb");
                    if(connection.channelTree.server.properties.virtualserver_default_channel_group == group.id)
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
    function apply_server_groups(connection: ConnectionHandler, editor: PermissionEditor, tab_tag: JQuery) {
        let current_group;

        /* list all groups */
        let update_icon: (icon_id: number) => any;
        {
            let group_list = tab_tag.find(".list-group-server .entries");

            const allow_query_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1);
            const allow_template_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1);
            for(const group of connection.groups.serverGroups.sort(GroupManager.sorter())) {
                if(group.type == GroupType.QUERY) {
                    if(!allow_query_groups)
                        continue;
                } else if(group.type == GroupType.TEMPLATE) {
                    if(!allow_template_groups)
                        continue;
                }
                let tag = $.spawn("div").addClass("group").attr("group-id", group.id);
                let icon_tag = connection.fileManager.icons.generateTag(group.properties.iconid);
                icon_tag.appendTo(tag);
                const _update_icon = icon_id => icon_tag.replaceWith(icon_tag = connection.fileManager.icons.generateTag(icon_id));

                {
                    let name = $.spawn("a").text(group.name + " (" + group.id + ")").addClass("name");
                    if(group.properties.savedb)
                        name.addClass("savedb");
                    if(connection.channelTree.server.properties.virtualserver_default_server_group == group.id)
                        name.addClass("default");
                    name.appendTo(tag);
                }
                tag.appendTo(group_list);

                tag.on('click', event => {
                    current_group = group;
                    update_icon = _update_icon;
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
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }
                editor.set_listener_update(() => {
                    connection.groups.request_permissions(current_group).then(result => editor.set_permissions(result)).catch(error => {
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

                            return connection.serverConnection.send_command("servergroupdelperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_icon)
                                    update_icon(0);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing server group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return connection.serverConnection.send_command("servergroupdelperm", {
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

                            return connection.serverConnection.send_command("servergroupaddperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegate: value.flag_negate
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_icon)
                                    update_icon(value.value);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating server group grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            return connection.serverConnection.send_command("servergroupaddperm", {
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