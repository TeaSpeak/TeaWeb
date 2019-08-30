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
    export namespace PermissionEditor {
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

        export type change_listener_t = (permission: PermissionInfo, value?: PermissionEditor.PermissionValue) => Promise<void>;
    }
    export enum PermissionEditorMode {
        VISIBLE,
        NO_PERMISSION,
        UNSET
    }

    export abstract class AbstractPermissionEditor {
        protected _permissions: GroupedPermissions[];
        protected _listener_update: () => any;
        protected _listener_change: PermissionEditor.change_listener_t = () => Promise.resolve();
        protected _toggle_callback: () => string;

        icon_resolver: (id: number) => Promise<HTMLImageElement>;
        icon_selector: (current_id: number) => Promise<number>;

        protected constructor() {}

        abstract set_mode(mode: PermissionEditorMode);

        abstract initialize(permissions: GroupedPermissions[]);
        abstract html_tag() : JQuery;
        abstract set_permissions(permissions?: PermissionValue[]);

        set_listener(listener?: PermissionEditor.change_listener_t) {
            this._listener_change = listener || (() => Promise.resolve());
        }

        set_listener_update(listener?: () => any) { this._listener_update = listener; }
        trigger_update() { if(this._listener_update) this._listener_update(); }

        abstract set_toggle_button(callback: () => string, initial: string);
    }

    export type OptionsServerGroup = {};
    export type OptionsChannelGroup = {};
    export type OptionsClientPermissions = { unique_id?: string };
    export type OptionsChannelPermissions = { channel_id?: number };
    export type OptionsClientChannelPermissions = OptionsClientPermissions & OptionsChannelPermissions;
    export interface OptionMap {
        "sg": OptionsServerGroup,
        "cg": OptionsChannelGroup,
        "clp": OptionsClientPermissions,
        "chp": OptionsChannelPermissions,
        "clchp": OptionsClientChannelPermissions
    }

    export function _space() {
        const now = Date.now();
        while(now + 100 > Date.now());
    }

    export function spawnPermissionEdit<T extends keyof OptionMap>(connection: ConnectionHandler, selected_tab?: T, options?: OptionMap[T]) : Modal {
        options = options || {};

        const modal = createModal({
            header: function() {
                return tr("Server Permissions");
            },
            body: function () {
                let properties: any = {};
                let tag = $("#tmpl_server_permissions").renderTag(properties);

                /* build the permission editor */
                const permission_editor: AbstractPermissionEditor = (() => {
                    const editor = new pe.HTMLPermissionEditor();
                    editor.initialize(connection.permissions.groupedPermissions());
                    editor.icon_resolver = id => connection.fileManager.icons.resolve_icon(id).then(async icon => {
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
                    editor.icon_selector = current_icon => new Promise<number>(resolve => {
                        spawnIconSelect(connection, id => resolve(new Int32Array([id])[0]), current_icon);
                    });

                    if(editor instanceof pe.CanvasPermissionEditor)
                        setTimeout(() => editor.update_ui(), 500);
                    return editor;
                })();

                const container_tab_list = tag.find(".right > .header");
                {
                    const label_current = tag.find(".left .container-selected");
                    const create_tab = (tab_entry: JQuery, container_name: string) => {
                        const target_container = tag.find(".body .container." + container_name);

                        tab_entry.on('click', () => {
                            /* Using a timeout here prevents unnecessary style calculations required by other click event handlers */
                            setTimeout(() => {
                                container_tab_list.find(".selected").removeClass("selected");
                                tab_entry.addClass("selected");
                                label_current.text(tab_entry.find("a").text());

                                /* dont use show() here because it causes a style recalculation */
                                for(const element of tag.find(".body .container"))
                                    (<HTMLElement>element).style.display = "none";

                                permission_editor.html_tag()[0].remove();
                                target_container.find(".permission-editor").trigger('show');
                                target_container.find(".permission-editor").append(permission_editor.html_tag());

                                for(const element of target_container)
                                    (<HTMLElement>element).style.display = null;
                            }, 0);
                        });
                    };

                    create_tab(container_tab_list.find(".sg"), "container-view-server-groups");
                    create_tab(container_tab_list.find(".cg"), "container-view-channel-groups");
                    create_tab(container_tab_list.find(".chp"), "container-view-channel-permissions");
                    create_tab(container_tab_list.find(".clp"), "container-view-client-permissions");
                    create_tab(container_tab_list.find(".clchp"), "container-view-client-channel-permissions");
                }

                apply_server_groups(connection, permission_editor, tag.find(".left .container-view-server-groups"), tag.find(".right .container-view-server-groups"));
                apply_channel_groups(connection, permission_editor, tag.find(".left .container-view-channel-groups"), tag.find(".right .container-view-channel-groups"));
                apply_channel_permission(connection, permission_editor, tag.find(".left .container-view-channel-permissions"), tag.find(".right .container-view-channel-permissions"));
                apply_client_permission(connection, permission_editor, tag.find(".left .container-view-client-permissions"), tag.find(".right .container-view-client-permissions"), selected_tab == "clp" ? <any>options : {});
                apply_client_channel_permission(connection, permission_editor, tag.find(".left .container-view-client-channel-permissions"), tag.find(".right .container-view-client-channel-permissions"), selected_tab == "clchp" ? <any>options : {});

                setTimeout(() => container_tab_list.find("." + (selected_tab || "sg")).trigger('click'), 0);
                return tag.dividerfy();
            },
            footer: undefined,

            min_width: "30em",
            height: "80%",
            trigger_tab: false,
            full_size: true
        });

        const tag = modal.htmlTag;
        tag.find(".modal-body").addClass("modal-permission-editor");
        if(selected_tab)
            setTimeout(() => tag.find(".tab-header .entry[x-id=" + selected_tab + "]").first().trigger("click"), 1);
        tag.find(".btn_close").on('click', () => {
            modal.close();
        });

        return modal;
    }

    function build_channel_tree(connection: ConnectionHandler, channel_list: JQuery, selected_channel: number, select_callback: (channel: ChannelEntry, icon_update: (id: number) => any) => any) {
        const root = connection.channelTree.get_first_channel();
        if(!root) return;

        const build_channel = (channel: ChannelEntry, level: number) => {
            let tag = $.spawn("div").addClass("channel").css("padding-left", "calc(0.25em + " + (level * 16) + "px)").attr("channel-id", channel.channelId);
            let icon_tag = connection.fileManager.icons.generateTag(channel.properties.channel_icon_id);
            icon_tag.appendTo(tag);
            const _update_icon = icon_id => icon_tag.replaceWith(icon_tag = connection.fileManager.icons.generateTag(icon_id));

            {
                let name = $.spawn("a").text(channel.channelName() + " (" + channel.channelId + ")").addClass("name");
                name.appendTo(tag);
            }

            tag.on('click', event => {
                channel_list.find(".selected").removeClass("selected");
                tag.addClass("selected");
                select_callback(channel, _update_icon);
            });

            return tag;
        };

        const build_channels = (root: ChannelEntry, level: number) => {
            build_channel(root, level).appendTo(channel_list);
            const child_head = root.children(false).find(e => e.channel_previous === undefined);
            if(child_head)
                build_channels(child_head, level + 1);
            if(root.channel_next)
                build_channels(root.channel_next, level)
        };
        build_channels(root, 0);

        let selected_channel_tag = channel_list.find(".channel[channel-id=" + selected_channel + "]");
        if(!selected_channel_tag || selected_channel_tag.length < 1)
            selected_channel_tag = channel_list.find('.channel').first();
        setTimeout(() => selected_channel_tag.trigger('click'), 0);
    }

    function apply_client_channel_permission(connection: ConnectionHandler, editor: AbstractPermissionEditor, tab_left: JQuery, tab_right: JQuery, options: OptionsClientChannelPermissions) {
        let current_cldbid: number = 0;
        let current_channel: ChannelEntry;

        /* the editor */
        {
            const pe_client = tab_right.find(".permission-editor");
            tab_right.on('show', event => {
                editor.set_toggle_button(undefined, undefined);
                pe_client.append(editor.html_tag());
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

                /* TODO: Error handling? */
                editor.set_listener(async (permission, value) => {
                    if (!current_cldbid)
                        throw "unset client";
                    if (!current_channel)
                        throw "unset channel";

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client channel permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            await connection.serverConnection.send_command("channelclientdelperm", {
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

                            await connection.serverConnection.send_command("channelclientdelperm", {
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

                            await connection.serverConnection.send_command("channelclientaddperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegated: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client channel grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("channelclientaddperm", {
                                cldbid: current_cldbid,
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegated: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }

        build_channel_tree(connection, tab_left.find(".list-channel .entries"), options.channel_id || 0, channel => {
            if(current_channel == channel) return;

            current_channel = channel;

            /* TODO: Test for visibility */
            editor.trigger_update();
        });

        {

            const tag_select = tab_left.find(".client-select");
            const tag_select_uid = tag_select.find("input");
            const tag_select_error = tag_select.find(".invalid-feedback");

            const tag_client_name = tab_left.find(".client-name");
            const tag_client_uid = tab_left.find(".client-uid");
            const tag_client_dbid = tab_left.find(".client-dbid");


            const resolve_client = () => {
                let client_uid = tag_select_uid.val() as string;
                connection.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
                    if(!result || result.length == 0) return Promise.reject("invalid data");
                    tag_select.removeClass('is-invalid');

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
                    tag_select.addClass('is-invalid');
                    editor.set_mode(PermissionEditorMode.UNSET);
                });
            };

            tag_select_uid.on('change', event => resolve_client());
            if(options.unique_id) {
                tag_select_uid.val(options.unique_id);
                setTimeout(() => resolve_client());
            }
        }
    }

    function apply_client_permission(connection: ConnectionHandler, editor: AbstractPermissionEditor, tab_left: JQuery, tab_right: JQuery, options: OptionsClientPermissions) {
        let current_cldbid: number = 0;

        /* the editor */
        {
            const pe_client = tab_right.find("permission-editor.client");
            tab_right.on('show', event => {
                editor.set_toggle_button(undefined, undefined);
                pe_client.append(editor.html_tag());
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

                /* TODO: Error handling? */
                editor.set_listener(async (permission, value) => {
                    if (!current_cldbid)
                        throw "unset client";

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            await connection.serverConnection.send_command("clientdelperm", {
                                cldbid: current_cldbid,
                                permid: permission.id,
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing client grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("clientdelperm", {
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

                            await connection.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegated: value.flag_negate
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating client grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("clientaddperm", {
                                cldbid: current_cldbid,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegated: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }


        const tag_select = tab_left.find(".client-select");
        const tag_select_uid = tag_select.find("input");
        const tag_select_error = tag_select.find(".invalid-feedback");

        const tag_client_name = tab_left.find(".client-name");
        const tag_client_uid = tab_left.find(".client-uid");
        const tag_client_dbid = tab_left.find(".client-dbid");

        const resolve_client = () => {
            let client_uid = tag_select_uid.val() as string;
            connection.serverConnection.command_helper.info_from_uid(client_uid).then(result => {
                if(!result || result.length == 0) return Promise.reject("invalid data");
                tag_select.removeClass("is-invalid");

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
                tag_select.addClass("is-invalid");
                editor.set_mode(PermissionEditorMode.UNSET);
            });
        };

        tag_select_uid.on('change', event => resolve_client());
        if(options.unique_id) {
            tag_select_uid.val(options.unique_id);
            setTimeout(() => resolve_client());
        }
    }

    function apply_channel_permission(connection: ConnectionHandler, editor: AbstractPermissionEditor, tab_left: JQuery, tab_right: JQuery) {
        let current_channel: ChannelEntry | undefined;
        let update_channel_icon: (id: number) => any;

        /* the editor */
        {
            const pe_channel = tab_right.find(".permission-editor");
            tab_right.on('show', event => {
                editor.set_toggle_button(undefined, undefined);
                pe_channel.append(editor.html_tag());
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

                editor.set_listener(async (permission, value) => {
                    if (!current_channel)
                        throw "unset channel";

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            await connection.serverConnection.send_command("channeldelperm", {
                                cid: current_channel.channelId,
                                permid: permission.id,
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_channel_icon)
                                    update_channel_icon(undefined);
                                return e;
                            });
                        } else {
                            /* TODO Remove this because its totally useless. Remove this from the UI as well */
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("channeldelperm", {
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

                            await connection.serverConnection.send_command("channeladdperm", {
                                cid: current_channel.channelId,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegated: value.flag_negate
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_channel_icon)
                                    update_channel_icon(value.value);
                                return e;
                            });
                        } else {
                            /* TODO Remove this because its totally useless. Remove this from the UI as well */
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("channeladdperm", {
                                cid: current_channel.channelId,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegated: false
                            });
                        }
                    }
                });

                /* FIXME: Use cached permissions */
                editor.trigger_update();
            });
        }

        let channel_list = tab_left.find(".list-channel .entries");
        build_channel_tree(connection, channel_list, 0, (channel, update) => {
            current_channel = channel;
            update_channel_icon = update;
            editor.trigger_update();
        });
    }

    function apply_channel_groups(connection: ConnectionHandler, editor: AbstractPermissionEditor, tab_left: JQuery, tab_right: JQuery) {
        let current_group;
        let update_group_icon: (id: number) => any;
        let update_groups: (selected_group: number) => any;
        let update_buttons: () => any;

        /* the editor */
        {
            const pe_server = tab_right.find(".permission-editor");
            tab_right.on('show', event => {
                editor.set_toggle_button(undefined, undefined);
                pe_server.append(editor.html_tag());
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

                editor.set_listener(async (permission, value) => {
                    if (!current_group)
                        throw "unset channel group";

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel group permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            await connection.serverConnection.send_command("channelgroupdelperm", {
                                cgid: current_group.id,
                                permid: permission.id,
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_group_icon)
                                    update_group_icon(undefined);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing channel group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("channelgroupdelperm", {
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

                            await connection.serverConnection.send_command("channelgroupaddperm", {
                                cgid: current_group.id,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegated: value.flag_negate
                            }).then(e => {
                                if(permission.name === "i_icon_id" && update_group_icon)
                                    update_group_icon(value.value);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating channel group grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("channelgroupaddperm", {
                                cgid: current_group.id,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegated: false
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
            let group_list = tab_left.find(".list-groups .entries");

            update_groups = (selected_group: number) => {
                group_list.children().remove();

                const allow_query_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1);
                const allow_template_groups = connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1);
                for (let group of connection.groups.channelGroups.sort(GroupManager.sorter())) {
                    if (group.type == GroupType.QUERY) {
                        if (!allow_query_groups)
                            continue;
                    } else if (group.type == GroupType.TEMPLATE) {
                        if (!allow_template_groups)
                            continue;
                    }

                    let tag = $.spawn("div").addClass("group").attr("group-id", group.id);
                    let icon_tag = connection.fileManager.icons.generateTag(group.properties.iconid);
                    icon_tag.appendTo(tag);
                    const _update_icon = icon_id => icon_tag.replaceWith(icon_tag = connection.fileManager.icons.generateTag(icon_id));

                    {
                        let name = $.spawn("a").text(group.name + " (" + group.id + ")").addClass("name");
                        if (group.properties.savedb)
                            name.addClass("savedb");
                        if (connection.channelTree.server.properties.virtualserver_default_channel_group == group.id)
                            name.addClass("default");
                        name.appendTo(tag);
                    }
                    tag.appendTo(group_list);

                    tag.on('click', event => {
                        current_group = group;
                        update_group_icon = _update_icon;
                        group_list.find(".selected").removeClass("selected");
                        tag.addClass("selected");

                        update_buttons();
                        //TODO trigger only if the editor is in channel group mode!
                        editor.trigger_update();
                    });
                    tag.on('contextmenu', event => {
                        if(event.isDefaultPrevented())
                            return;

                        contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Create a channel group"),
                            icon_class: 'client-add',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_CREATE).granted(1),
                            callback: () => tab_left.find(".button-add").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Rename channel group"),
                            icon_class: 'client-edit',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.I_CHANNEL_GROUP_MODIFY_POWER).granted(current_group.requiredModifyPower),
                            callback: () => tab_left.find(".button-rename").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Duplicate channel group"),
                            icon_class: 'client-copy',
                            callback: () => tab_left.find(".button-duplicate").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Delete channel group"),
                            icon_class: 'client-delete',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_DELETE).granted(1),
                            callback: () => tab_left.find(".button-delete").trigger('click')
                        });
                        event.preventDefault();
                    });
                    if(group.id === selected_group) {
                        setTimeout(() => tag.trigger('click'), 0);
                        selected_group = undefined;
                    }
                }

                /* because the server menu is the first which will be shown */
                if(typeof(selected_group) !== "undefined") {
                    setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
                }
            };

            tab_left.find(".list-groups").on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;

                contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Create a channel group"),
                    icon_class: 'client-add',
                    callback: () => tab_left.find(".button-add").trigger('click')
                });
                event.preventDefault();
            });
        }

        {
            const container_buttons = tab_left.find(".container-buttons");

            const button_add = container_buttons.find(".button-add");
            const button_rename = container_buttons.find(".button-rename");
            const button_duplicate = container_buttons.find(".button-duplicate");
            const button_delete = container_buttons.find(".button-delete");

            button_add.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_CREATE).granted(1));
            button_delete.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_CREATE).granted(1));
            update_buttons = () => {
                const permission_modify = current_group && connection.permissions.neededPermission(PermissionType.I_CHANNEL_GROUP_MODIFY_POWER).granted(current_group.requiredModifyPower);
                button_rename.prop("disabled", !permission_modify);
                button_duplicate.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_CREATE).granted(1));
            };

            button_add.on('click', () => {
                spawnGroupAdd(false, connection.permissions, (name, type) => name.length > 0 && !connection.groups.channelGroups.find(e => e.target == GroupTarget.CHANNEL && e.name.toLowerCase() === name.toLowerCase() && e.type == type) , (name, type) => {
                    console.log("Creating channel group: %o, %o", name, type);
                    connection.serverConnection.send_command('channelgroupadd', {
                        name: name,
                        type: type
                    }).then(() => {
                        createInfoModal(tr("Group created"), tr("The channel group has been created.")).open();
                        update_groups(0); //TODO: May get the created group?
                    }).catch(error => {
                        console.warn(tr("Failed to create channel group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to create group"), MessageHelper.formatMessage(tr("Failed to create group:{:br:}"), error)).open();
                    });
                });
            });

            button_rename.on('click', () => {
                if(!current_group)
                    return;

                createInputModal(tr("Rename group"), tr("Enter the new group name"), name => name.length > 0 && !connection.groups.channelGroups.find(e => e.target == GroupTarget.CHANNEL && e.name.toLowerCase() === name.toLowerCase() && e.type == current_group.type), result => {
                    if(typeof(result) !== "string" || !result)
                        return;
                    connection.serverConnection.send_command('channelgrouprename', {
                        cgid: current_group.id,
                        name: result
                    }).then(() => {
                        createInfoModal(tr("Group renamed"), tr("The channel group has been renamed.")).open();
                        update_groups(current_group.id);
                    }).catch(error => {
                        console.warn(tr("Failed to rename channel group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to rename group"), MessageHelper.formatMessage(tr("Failed to rename group:{:br:}"), error)).open();
                    });
                }).open();
            });

            button_duplicate.on('click', () => {
                createErrorModal(tr("Not implemented yet"), tr("This function hasn't been implemented yet!")).open();
            });

            button_delete.on('click', () => {
                if(!current_group)
                    return;

                spawnYesNo(tr("Are you sure?"), MessageHelper.formatMessage(tr("Do you really want to delete the group {}?"), current_group.name), result => {
                    if(result !== true)
                        return;

                    connection.serverConnection.send_command("channelgroupdel", {
                        cgid: current_group.id,
                        force: true
                    }).then(() => {
                        createInfoModal(tr("Group deleted"), tr("The channel group has been deleted.")).open();
                        update_groups(0);
                    }).catch(error => {
                        console.warn(tr("Failed to delete channel group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to delete group"), MessageHelper.formatMessage(tr("Failed to delete group:{:br:}"), error)).open();
                    });
                });
            });
        }
        update_groups(0);
    }

    function apply_server_groups(connection: ConnectionHandler, editor: AbstractPermissionEditor, tab_left: JQuery, tab_right: JQuery) {
        let current_group: Group;
        let current_group_changed: (() => any)[] = [];

        let update_buttons: () => any;
        /* list all groups */

        let update_icon: ((icon_id: number) => any)[] = [];

        let update_groups: (selected_group: number) => any;
        {
            let group_list = tab_left.find(".container-group-list .list-groups .entries");
            let group_list_update_icon: (i: number) => any;
            update_icon.push(i => group_list_update_icon(i));

            update_groups = (selected_group: number) => {
                group_list.children().remove();

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
                        let name = $.spawn("div").text(group.name + " (" + group.id + ")").addClass("name");
                        if(group.properties.savedb)
                            name.addClass("savedb");
                        if(connection.channelTree.server.properties.virtualserver_default_server_group == group.id)
                            name.addClass("default");
                        name.appendTo(tag);
                    }
                    tag.appendTo(group_list);

                    tag.on('click', event => {
                        if(current_group === group)
                            return;

                        current_group = group;
                        group_list_update_icon = _update_icon;
                        if(update_buttons)
                            update_buttons();
                        for(const entry of current_group_changed)
                            entry();

                        group_list.find(".selected").removeClass("selected");
                        tag.addClass("selected");
                        editor.trigger_update();
                    });
                    tag.on('contextmenu', event => {
                        if(event.isDefaultPrevented())
                            return;

                        contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Create a server group"),
                            icon_class: 'client-add',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_CREATE).granted(1),
                            callback: () => tab_left.find(".button-add").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Rename server group"),
                            icon_class: 'client-edit',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MODIFY_POWER).granted(current_group.requiredModifyPower),
                            callback: () => tab_left.find(".button-rename").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Duplicate server group"),
                            icon_class: 'client-copy',
                            callback: () => tab_left.find(".button-duplicate").trigger('click')
                        }, {
                            type: contextmenu.MenuEntryType.ENTRY,
                            name: tr("Delete server group"),
                            icon_class: 'client-delete',
                            invalidPermission: !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_DELETE).granted(1),
                            callback: () => tab_left.find(".button-delete").trigger('click')
                        });
                        event.preventDefault();
                    });

                    if(group.id === selected_group) {
                        setTimeout(() => tag.trigger('click'), 0);
                        selected_group = undefined;
                    }
                }

                /* because the server menu is the first which will be shown */
                if(typeof(selected_group) !== "undefined") {
                    setTimeout(() => group_list.find('.group').first().trigger('click'), 0);
                }
            };


            tab_left.find(".list-groups").on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;

                contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Create a server group"),
                    icon_class: 'client-add',
                    callback: () => tab_left.find(".button-add").trigger('click')
                });
                event.preventDefault();
            });
        }
        {
            const container_buttons = tab_left.find(".container-group-list .container-buttons");

            const button_add = container_buttons.find(".button-add");
            const button_rename = container_buttons.find(".button-rename");
            const button_duplicate = container_buttons.find(".button-duplicate");
            const button_delete = container_buttons.find(".button-delete");

            button_add.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_CREATE).granted(1));
            button_delete.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_DELETE).granted(1));
            update_buttons = () => {
                const permission_modify = current_group && connection.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MODIFY_POWER).granted(current_group.requiredModifyPower);
                button_rename.prop("disabled", !permission_modify);
                button_duplicate.prop("disabled", !connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_CREATE).granted(1));
            };

            button_add.on('click', () => {
                spawnGroupAdd(true, connection.permissions, (name, type) => name.length > 0 && !connection.groups.serverGroups.find(e => e.target == GroupTarget.SERVER && e.name.toLowerCase() === name.toLowerCase() && e.type == type) , (name, type) => {
                    console.log("Creating group: %o, %o", name, type);
                    connection.serverConnection.send_command('servergroupadd', {
                        name: name,
                        type: type
                    }).then(() => {
                        createInfoModal(tr("Group created"), tr("The server group has been created.")).open();
                        update_groups(0); //TODO: May get the created group?
                    }).catch(error => {
                        console.warn(tr("Failed to create server group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to create group"), MessageHelper.formatMessage(tr("Failed to create group:{:br:}"), error)).open();
                    });
                });
            });

            button_rename.on('click', () => {
                if(!current_group)
                    return;

                createInputModal(tr("Rename group"), tr("Enter the new group name"), name => name.length > 0 && !connection.groups.serverGroups.find(e => e.target == GroupTarget.SERVER && e.name.toLowerCase() === name.toLowerCase() && e.type == current_group.type), result => {
                    if(typeof(result) !== "string" || !result)
                        return;
                    connection.serverConnection.send_command('servergrouprename', {
                        sgid: current_group.id,
                        name: result
                    }).then(() => {
                        createInfoModal(tr("Group renamed"), tr("The server group has been renamed.")).open();
                        update_groups(current_group.id);
                    }).catch(error => {
                        console.warn(tr("Failed to rename server group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to rename group"), MessageHelper.formatMessage(tr("Failed to rename group:{:br:}"), error)).open();
                    });
                }).open();
            });

            button_duplicate.on('click', () => {
                createErrorModal(tr("Not implemented yet"), tr("This function hasn't been implemented yet!")).open();
            });

            button_delete.on('click', () => {
                if(!current_group)
                    return;

                spawnYesNo(tr("Are you sure?"), MessageHelper.formatMessage(tr("Do you really want to delete the group {}?"), current_group.name), result => {
                    if(result !== true)
                        return;

                    connection.serverConnection.send_command("servergroupdel", {
                        sgid: current_group.id,
                        force: true
                    }).then(() => {
                        createInfoModal(tr("Group deleted"), tr("The server group has been deleted.")).open();
                        update_groups(0);
                    }).catch(error => {
                        console.warn(tr("Failed to delete server group: %o"), error);
                        if(error instanceof CommandResult) {
                            error = error.extra_message || error.message;
                        }
                        createErrorModal(tr("Failed to delete group"), MessageHelper.formatMessage(tr("Failed to delete group:{:br:}"), error)).open();
                    });
                });
            });
        }
        update_groups(0);

        /* the editor */
        {
            const pe_server = tab_right.find(".permission-editor");
            tab_right.on('show', event => {
                pe_server.append(editor.html_tag());
                if(connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST).granted(1))
                    editor.set_mode(PermissionEditorMode.VISIBLE);
                else {
                    editor.set_mode(PermissionEditorMode.NO_PERMISSION);
                    return;
                }
                editor.set_listener_update(() => {
                    console.log("Updating permissions");
                    connection.groups.request_permissions(current_group).then(result => editor.set_permissions(result)).catch(error => {
                        console.log(error); //TODO handling?
                    });
                });

                editor.set_listener(async (permission, value) => {
                    if (!current_group)
                        throw "unset server group";

                    if (value.remove) {
                        /* remove the permission */
                        if (typeof (value.value) !== "undefined") {
                            log.info(LogCategory.PERMISSIONS, tr("Removing server group permission %s. permission.id: %o"),
                                permission.name,
                                permission.id,
                            );

                            await connection.serverConnection.send_command("servergroupdelperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                            }).then(e => {
                                if(permission.name === "i_icon_id")
                                    for(const c of update_icon)
                                        c(0);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Removing server group grant permission %s. permission.id: %o"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("servergroupdelperm", {
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

                            await connection.serverConnection.send_command("servergroupaddperm", {
                                sgid: current_group.id,
                                permid: permission.id,
                                permvalue: value.value,
                                permskip: value.flag_skip,
                                permnegated: value.flag_negate
                            }).then(e => {
                                if(permission.name === "i_icon_id")
                                    for(const c of update_icon)
                                        c(value.value);
                                return e;
                            });
                        } else {
                            log.info(LogCategory.PERMISSIONS, tr("Adding or updating server group grant permission %s. permission.{id: %o, value: %o}"),
                                permission.name,
                                permission.id_grant(),
                                value.granted,
                            );

                            await connection.serverConnection.send_command("servergroupaddperm", {
                                sgid: current_group.id,
                                permid: permission.id_grant(),
                                permvalue: value.granted,
                                permskip: false,
                                permnegated: false
                            });
                        }
                    }
                });

                editor.trigger_update();
            });
        }

        /* client list */
        {
            //container-client-list container-group-list
            let clients_visible = false;
            let selected_client: {
                tag: JQuery,
                dbid: number
            };

            const container_client_list = tab_left.find(".container-client-list").addClass("hidden");
            const container_group_list = tab_left.find(".container-group-list");

            const container_selected_group = container_client_list.find(".container-current-group");
            const container_clients = container_client_list.find(".list-clients .entries");

            const input_filter = container_client_list.find(".filter-client-list");

            const button_add = container_client_list.find(".button-add");
            const button_delete = container_client_list.find(".button-delete");

            const update_filter = () => {
                const filter_text = (input_filter.val() || "").toString().toLowerCase();
                if(!filter_text) {
                    container_clients.find(".entry").css('display', 'block');
                } else {
                    const entries = container_clients.find(".entry");
                    for(const _entry of entries) {
                        const entry = $(_entry);
                        if(entry.attr("search-string").toLowerCase().indexOf(filter_text) !== -1)
                            entry.css('display', 'block');
                        else
                            entry.css('display', 'none');
                    }
                }
            };

            const update_client_list = () => {
                container_clients.empty();
                button_delete.prop('disabled', true);

                connection.serverConnection.command_helper.request_clients_by_server_group(current_group.id).then(clients => {
                    for(const client of clients) {
                        const tag = $.spawn("div").addClass("client").text(client.client_nickname);
                        tag.attr("search-string", client.client_nickname + "-" + client.client_unique_identifier + "-" + client.client_database_id);
                        container_clients.append(tag);

                        tag.on('click contextmenu', event => {
                            container_clients.find(".selected").removeClass("selected");
                            tag.addClass("selected");

                            selected_client = {
                                tag: tag,
                                dbid: client.client_database_id
                            };
                            button_delete.prop('disabled', false);
                        });

                        tag.on('contextmenu', event => {
                            if(event.isDefaultPrevented())
                                return;

                            event.preventDefault();
                            contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Add client"),
                                icon_class: 'client-add',
                                callback: () => button_add.trigger('click')
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Remove client"),
                                icon_class: 'client-delete',
                                callback: () => button_delete.trigger('click')
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Copy unique id"),
                                icon_class: 'client-copy',
                                callback: () => copy_to_clipboard(client.client_unique_identifier)
                            })
                        });
                    }
                    update_filter();
                }).catch(error => {
                    if(error instanceof CommandResult && error.id === ErrorID.PERMISSION_ERROR)
                        return;
                    console.warn(tr("Failed to receive server group clients for group %d: %o"), current_group.id, error);
                });
            };
            current_group_changed.push(update_client_list);

            button_delete.on('click', event => {
                const client = selected_client;
                if(!client) return;

                connection.serverConnection.send_command("servergroupdelclient", {
                    sgid: current_group.id,
                    cldbid: client.dbid
                }).then(() => {
                    selected_client.tag.detach();
                    button_delete.prop('disabled', true); /* nothing is selected */
                }).catch(error => {
                    console.log(tr("Failed to delete client %o from server group %o: %o"), client.dbid, current_group.id, error);
                    if(error instanceof CommandResult)
                        error = error.extra_message || error.message;
                    createErrorModal(tr("Failed to remove client"), tr("Failed to remove client from server group")).open();
                });
            });

            button_add.on('click', event => {
                createInputModal(tr("Add client to server group"), tr("Enter the client unique id or database id"), text => {
                    if(!text) return false;
                    if(!!text.match(/^[0-9]+$/))
                        return true;
                    try {
                        return atob(text).length >= 20;
                    } catch(error) {
                        return false;
                    }
                }, async text => {
                    if(typeof(text) !== "string")
                        return;

                    let dbid;
                    if(!!text.match(/^[0-9]+$/)) {
                        dbid = parseInt(text);
                        debugger;
                    } else {
                        try {
                            const data = await connection.serverConnection.command_helper.info_from_uid(text.trim());
                            dbid = data[0].client_database_id;
                        } catch(error) {
                            console.log(tr("Failed to resolve client database id from unique id (%s): %o"), text, error);
                            if(error instanceof CommandResult)
                                error = error.extra_message || error.message;
                            createErrorModal(tr("Failed to add client"), MessageHelper.formatMessage(tr("Failed to add client to server group\nFailed to resolve database id: {}."), error)).open();
                            return;
                        }
                    }
                    if(!dbid) {
                        console.log(tr("Failed to resolve client database id from unique id (%s): Client not found"));
                        createErrorModal(tr("Failed to add client"), tr("Failed to add client to server group\nClient database id not found")).open();
                        return;
                    }


                    connection.serverConnection.send_command("servergroupaddclient", {
                        sgid: current_group.id,
                        cldbid: dbid
                    }).then(() => {
                        update_client_list();
                    }).catch(error => {
                        console.log(tr("Failed to add client %o to server group %o: %o"), dbid, current_group.id, error);
                        if(error instanceof CommandResult)
                            error = error.extra_message || error.message;
                        createErrorModal(tr("Failed to add client"), tr("Failed to add client to server group\n" + error)).open();
                    });
                }).open();
            });

            container_client_list.on('contextmenu', event => {
                if(event.isDefaultPrevented())
                    return;

                event.preventDefault();
                contextmenu.spawn_context_menu(event.pageX, event.pageY, {
                    type: contextmenu.MenuEntryType.ENTRY,
                    name: tr("Add client"),
                    icon_class: 'client-add',
                    callback: () => button_add.trigger('click')
                })
            });

            /* icon handler and current group display */
            {
                let update_icon_callback: (i: number) => any;
                update_icon.push(i => update_icon_callback(i));

                input_filter.on('change keyup', event => update_filter());
                current_group_changed.push(() => {
                    container_selected_group.empty();
                    if(!current_group) return;

                    let icon_container = $.spawn("div").addClass("icon-container").appendTo(container_selected_group);

                    connection.fileManager.icons.generateTag(current_group.properties.iconid).appendTo(icon_container);
                    update_icon_callback = icon => {
                        icon_container.empty();
                        connection.fileManager.icons.generateTag(icon).appendTo(icon_container);
                    };
                    $.spawn("div").addClass("name").text(current_group.name + " (" + current_group.id + ")").appendTo(container_selected_group);
                });
            }

            tab_right.on('show', event => {
                editor.set_toggle_button(() => {
                    clients_visible = !clients_visible;

                    container_client_list.toggleClass("hidden", !clients_visible);
                    container_group_list.toggleClass("hidden", clients_visible);

                    return clients_visible ? tr("Hide clients in group") : tr("Show clients in group");
                }, clients_visible ? tr("Hide clients in group") : tr("Show clients in group"));
            });
        }
    }

    function spawnGroupAdd(server_group: boolean, permissions: PermissionManager, valid_name: (name: string, group_type: number) => boolean, callback: (group_name: string, group_type: number) => any) {
        let modal: Modal;
        modal = createModal({
            header: tr("Create a new group"),
            body: () => {
                let tag = $("#tmpl_group_add").renderTag({
                    server_group: server_group
                });

                tag.find(".group-type-template").prop("disabled", !permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1));
                tag.find(".group-type-query").prop("disabled", !permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1));

                const container_name = tag.find(".group-name");
                const button_create = tag.find(".button-create");

                const group_type = () => (tag.find(".group-type")[0] as HTMLSelectElement).selectedIndex;
                container_name.on('keyup change', (event: Event) => {
                    if(event.type === 'keyup') {
                        const kevent = event as KeyboardEvent;
                        if(!kevent.shiftKey && kevent.key == 'Enter') {
                            button_create.trigger('click');
                            return;
                        }
                    }
                    const valid = valid_name(container_name.val() as string, group_type());
                    button_create.prop("disabled", !valid);
                    container_name.parent().toggleClass("is-invalid", !valid);
                }).trigger('change');
                tag.find(".group-type").on('change', () => container_name.trigger('change'));

                button_create.on('click', event => {
                    if(button_create.prop("disabled"))
                        return;
                    button_create.prop("disabled", true); /* disable double clicking */

                    modal.close();
                    callback(container_name.val() as string, group_type());
                });
                return tag;
            },
            footer: null,

            width: 600
        });
        modal.htmlTag.find(".modal-body").addClass("modal-group-add");
        modal.open_listener.push(() => {
            modal.htmlTag.find(".group-name").focus();
        });

        modal.open();
    }
}