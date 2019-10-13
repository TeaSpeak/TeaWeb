namespace top_menu {
    export interface HRItem { }

    export interface MenuItem {
        append_item(label: string): MenuItem;
        append_hr(): HRItem;
        delete_item(item: MenuItem | HRItem);
        items() : (MenuItem | HRItem)[];

        icon(klass?: string | Promise<Icon> | Icon) : string;
        label(value?: string) : string;
        visible(value?: boolean) : boolean;
        disabled(value?: boolean) : boolean;
        click(callback: () => any) : this;
    }

    export interface MenuBarDriver {
        initialize();

        append_item(label: string) : MenuItem;
        delete_item(item: MenuItem);
        items() : MenuItem[];

        flush_changes();
    }

    let _driver: MenuBarDriver;
    export function driver() : MenuBarDriver {
        return _driver;
    }

    export function set_driver(driver: MenuBarDriver) {
        _driver = driver;
    }

    export interface NativeActions {
        open_dev_tools();
        reload_page();

        check_native_update();
        open_change_log();

        quit();
    }
    export let native_actions: NativeActions;

    namespace html {
        class HTMLHrItem implements top_menu.HRItem {
            readonly html_tag: JQuery;

            constructor() {
                this.html_tag = $.spawn("hr");
            }
        }

        class HTMLMenuItem implements top_menu.MenuItem {
            readonly html_tag: JQuery;
            readonly _label_tag: JQuery;
            readonly _label_icon_tag: JQuery;
            readonly _label_text_tag: JQuery;
            readonly _submenu_tag: JQuery;

            private _items: (MenuItem | HRItem)[] = [];
            private _label: string;
            private _callback_click: () => any;


            constructor(label: string, mode: "side" | "down") {
                this._label = label;

                this.html_tag = $.spawn("div").addClass("container-menu-item type-" + mode);

                this._label_tag = $.spawn("div").addClass("menu-item");
                this._label_icon_tag = $.spawn("div").addClass("container-icon").appendTo(this._label_tag);
                $.spawn("div").addClass("container-label").append(
                    this._label_text_tag = $.spawn("a").text(label)
                ).appendTo(this._label_tag);
                this._label_tag.on('click', event => {
                    if(event.isDefaultPrevented())
                        return;

                    const disabled = this.html_tag.hasClass("disabled");
                    if(this._callback_click && !disabled) {
                        this._callback_click();
                    }
                    event.preventDefault();
                    if(disabled) event.stopPropagation();
                });

                this._submenu_tag = $.spawn("div").addClass("sub-menu");

                this.html_tag.append(this._label_tag);
                this.html_tag.append(this._submenu_tag);
            }

            append_item(label: string): top_menu.MenuItem {
                const item = new HTMLMenuItem(label, "side");
                this._items.push(item);
                this._submenu_tag.append(item.html_tag);
                this.html_tag.addClass('sub-entries');
                return item;
            }

            append_hr(): HRItem {
                const item = new HTMLHrItem();
                this._items.push(item);
                this._submenu_tag.append(item.html_tag);
                return item;
            }

            delete_item(item: top_menu.MenuItem | top_menu.HRItem) {
                this._items.remove(item);
                (item as any).html_tag.detach();
                this.html_tag.toggleClass('sub-entries', this._items.length > 0);
            }

            disabled(value?: boolean): boolean {
                if(typeof(value) === "undefined")
                    return this.html_tag.hasClass("disabled");

                this.html_tag.toggleClass("disabled", value);
                return value;
            }

            items(): (top_menu.MenuItem | top_menu.HRItem)[] {
                return this._items;
            }

            label(value?: string): string {
                if(typeof(value) === "undefined" || this._label === value)
                    return this._label;

                return this._label;
            }

            visible(value?: boolean): boolean {
                if(typeof(value) === "undefined")
                    return this.html_tag.is(':visible'); //FIXME!

                this.html_tag.toggle(!!value);
                return value;
            }

            click(callback: () => any): this {
                this._callback_click = callback;
                return this;
            }

            icon(klass?: string | Promise<Icon> | Icon): string {
                this._label_icon_tag.children().remove();
                if(typeof(klass) === "string")
                    $.spawn("div").addClass("icon_em " + klass).appendTo(this._label_icon_tag);
                else
                    IconManager.generate_tag(klass).appendTo(this._label_icon_tag);
                return "";
            }

        }

        export class HTMLMenuBarDriver implements MenuBarDriver {
            private static _instance: HTMLMenuBarDriver;
            public static instance() : HTMLMenuBarDriver {
                if(!this._instance)
                    this._instance = new HTMLMenuBarDriver();
                return this._instance;
            }

            readonly html_tag: JQuery;

            private _items: MenuItem[] = [];
            constructor() {
                this.html_tag = $.spawn("div").addClass("top-menu-bar");
            }

            append_item(label: string): top_menu.MenuItem {
                const item = new HTMLMenuItem(label, "down");
                this._items.push(item);

                this.html_tag.append(item.html_tag);
                item._label_tag.on('click', event => {
                    event.preventDefault();

                    this.html_tag.find(".active").removeClass("active");
                    item.html_tag.addClass("active");

                    setTimeout(() => {
                        $(document).one('click focusout', event => item.html_tag.removeClass("active"));
                    }, 0);
                });
                return item;
            }

            delete_item(item: MenuItem) {
                return undefined;
            }

            items(): top_menu.MenuItem[] {
                return this._items;
            }

            flush_changes() { /* unused, all changed were made instantly */ }

            initialize() {
                $("#top-menu-bar").replaceWith(this.html_tag);
            }
        }
    }

    let _items_bookmark: {
        root: MenuItem,
        manage: MenuItem,
        add_current: MenuItem
    };

    export function rebuild_bookmarks() {
        if(!_items_bookmark) {
            _items_bookmark = {
                root: driver().append_item(tr("Favorites")),

                add_current: undefined,
                manage: undefined
            };
            _items_bookmark.manage = _items_bookmark.root.append_item(tr("Manage bookmarks"));
            _items_bookmark.manage.icon("client-bookmark_manager");
            _items_bookmark.manage.click(() => Modals.spawnBookmarkModal());

            _items_bookmark.add_current = _items_bookmark.root.append_item(tr("Add current server to bookmarks"));
            _items_bookmark.add_current.icon('client-bookmark_add');
            _items_bookmark.add_current.click(() => bookmarks.add_current_server());
            _state_updater["bookmarks.ac"] = { item: _items_bookmark.add_current, conditions: [condition_connected]};
        }

        _items_bookmark.root.items().filter(e => e !== _items_bookmark.add_current && e !== _items_bookmark.manage).forEach(e => {
            _items_bookmark.root.delete_item(e);
        });
        _items_bookmark.root.append_hr();

        const build_bookmark = (root: MenuItem, entry: bookmarks.DirectoryBookmark | bookmarks.Bookmark) => {
            if(entry.type == bookmarks.BookmarkType.DIRECTORY) {
                const directory = entry as bookmarks.DirectoryBookmark;
                const item = root.append_item(directory.display_name);
                item.icon('client-folder');
                for(const entry of directory.content)
                    build_bookmark(item, entry);
                if(directory.content.length == 0)
                    item.disabled(true);
            } else {
                const bookmark = entry as bookmarks.Bookmark;
                const item = root.append_item(bookmark.display_name);
                item.icon(IconManager.load_cached_icon(bookmark.last_icon_id || 0));
                item.click(() => bookmarks.boorkmak_connect(bookmark));
            }
        };

        for(const entry of bookmarks.bookmarks().content)
            build_bookmark(_items_bookmark.root, entry);
        driver().flush_changes();
    }

    /* will be called on connection handler change or on client connect state or mic state change etc... */
    let _state_updater: {[key: string]:{ item: MenuItem; conditions: (() => boolean)[], update_handler?: (item: MenuItem) => any }} = {};
    export function update_state() {
        for(const _key of Object.keys(_state_updater)) {
            const item = _state_updater[_key];
            if(item.update_handler) {
                if(item.update_handler(item.item))
                    continue;
            }
            let enabled = true;
            for(const condition of item.conditions)
                if(!condition()) {
                    enabled = false;
                    break;
                }
            item.item.disabled(!enabled);
        }
        driver().flush_changes();
    }

    const condition_connected = () => {
        const scon = server_connections ? server_connections.active_connection_handler() : undefined;
        return scon && scon.connected;
    };

    declare namespace native {
        export function initialize();
    }

    export function initialize() {
        const driver = top_menu.driver();
        driver.initialize();

        /* build connection */
        let item: MenuItem;
        {
            const menu = driver.append_item(tr("Connection"));
            item = menu.append_item("Connect to a server");
            item.icon('client-connect');
            item.click(() => Modals.spawnConnectModal({}));

            const do_disconnect = (handlers: ConnectionHandler[]) => {
                for(const handler of handlers) {
                    handler.cancel_reconnect(true);
                    handler.handleDisconnect(DisconnectReason.REQUESTED); //TODO message?
                    server_connections.active_connection_handler().serverConnection.disconnect();
                    handler.sound.play(Sound.CONNECTION_DISCONNECTED);
                    this.log.log(log.server.Type.DISCONNECTED, {});
                }
                control_bar.update_connection_state();
                update_state();
            };
            item = menu.append_item("Disconnect from current server");
            item.icon('client-disconnect');
            item.disabled(true);
            item.click(() => {
                const handler = server_connections.active_connection_handler();
                do_disconnect([handler]);
            });
            _state_updater["connection.dc"] = { item: item, conditions: [() => condition_connected()]};

            item = menu.append_item("Disconnect from all servers");
            item.icon('client-disconnect');
            item.click(() => {
                do_disconnect(server_connections.server_connection_handlers());
            });
            _state_updater["connection.dca"] = { item: item, conditions: [], update_handler: (item) => {
                item.visible(server_connections && server_connections.server_connection_handlers().length > 1);
                return true;
            }};

            if(!app.is_web()) {
                menu.append_hr();

                item = menu.append_item(tr("Quit"));
                item.icon('client-close_button');
                item.click(() => native_actions.quit());
            }
        }
        {
            rebuild_bookmarks();
        }

        if(false) {
            const menu = driver.append_item("Self");
            /* Microphone | Sound | Away */
        }

        {
            const menu = driver.append_item("Rights");

            item = menu.append_item(tr("Server Groups"));
            item.icon("client-permission_server_groups");
            item.click(() => {
                Modals.spawnPermissionEdit(server_connections.active_connection_handler(), "sg").open();
            });
            _state_updater["permission.sg"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Client Permissions"));
            item.icon("client-permission_client");
            item.click(() => {
                Modals.spawnPermissionEdit(server_connections.active_connection_handler(), "clp").open();
            });
            _state_updater["permission.clp"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Channel Client Permissions"));
            item.icon("client-permission_client");
            item.click(() => {
                Modals.spawnPermissionEdit(server_connections.active_connection_handler(), "clchp").open();
            });
            _state_updater["permission.chclp"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Channel Groups"));
            item.icon("client-permission_channel");
            item.click(() => {
                Modals.spawnPermissionEdit(server_connections.active_connection_handler(), "cg").open();
            });
            _state_updater["permission.cg"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Channel Permissions"));
            item.icon("client-permission_channel");
            item.click(() => {
                Modals.spawnPermissionEdit(server_connections.active_connection_handler(), "chp").open();
            });
            _state_updater["permission.cp"] = { item: item, conditions: [condition_connected]};

            menu.append_hr();
            item = menu.append_item(tr("List Privilege Keys"));
            item.icon("client-token");
            item.click(() => {
                createErrorModal(tr("Not implemented"), tr("Privilege key list is not implemented yet!")).open();
            });
            _state_updater["permission.pk"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Use Privilege Key"));
            item.icon("client-token_use");
            item.click(() => {
                //TODO: Fixeme use one method for the control bar and here!
                createInputModal(tr("Use token"), tr("Please enter your token/privilege key"), message => message.length > 0, result => {
                    if(!result) return;
                    const scon = server_connections.active_connection_handler();

                    if(scon.serverConnection.connected)
                        scon.serverConnection.send_command("tokenuse", {
                            token: result
                        }).then(() => {
                            createInfoModal(tr("Use token"), tr("Toke successfully used!")).open();
                        }).catch(error => {
                            //TODO tr
                            createErrorModal(tr("Use token"), MessageHelper.formatMessage(tr("Failed to use token: {}"), error instanceof CommandResult ? error.message : error)).open();
                        });
                }).open();
            });
            _state_updater["permission.upk"] = { item: item, conditions: [condition_connected]};
        }

        {
            const menu = driver.append_item("Tools");

            item = menu.append_item(tr("Manage Playlists"));
            item.icon('client-music');
            item.click(() => {
                const scon = server_connections.active_connection_handler();
                if(scon && scon.connected) {
                    Modals.spawnPlaylistManage(scon);
                } else {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
                }
            });
            _state_updater["tools.pl"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Ban List"));
            item.icon('client-ban_list');
            item.click(() => {
                const scon = server_connections.active_connection_handler();
                if(scon && scon.connected) {
                    if(scon.permissions.neededPermission(PermissionType.B_CLIENT_BAN_LIST).granted(1)) {
                        Modals.openBanList(scon);
                    } else {
                        createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to view the ban list")).open();
                        scon.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                    }
                } else {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
                }
            });
            _state_updater["tools.bl"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Query List"));
            item.icon('client-server_query');
            item.click(() => {
                const scon = server_connections.active_connection_handler();
                if(scon && scon.connected) {
                    if(scon.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_LIST).granted(1) || scon.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_LIST_OWN).granted(1)) {
                        Modals.spawnQueryManage(scon);
                    } else {
                        createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to view the server query list")).open();
                        scon.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                    }
                } else {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
                }
            });
            _state_updater["tools.ql"] = { item: item, conditions: [condition_connected]};

            item = menu.append_item(tr("Query Create"));
            item.icon('client-server_query');
            item.click(() => {
                const scon = server_connections.active_connection_handler();
                if(scon && scon.connected) {
                    if(scon.permissions.neededPermission(PermissionType.B_CLIENT_CREATE_MODIFY_SERVERQUERY_LOGIN).granted(1) || scon.permissions.neededPermission(PermissionType.B_CLIENT_QUERY_CREATE).granted(1)) {
                        Modals.spawnQueryCreate(scon);
                    } else {
                        createErrorModal(tr("You dont have the permission"), tr("You dont have the permission to create a server query login")).open();
                        scon.sound.play(Sound.ERROR_INSUFFICIENT_PERMISSIONS);
                    }
                } else {
                    createErrorModal(tr("You have to be connected"), tr("You have to be connected to use this function!")).open();
                }
            });
            _state_updater["tools.qc"] = { item: item, conditions: [condition_connected]};
            menu.append_hr();

            item = menu.append_item(tr("Settings"));
            item.icon("client-settings");
            item.click(() => Modals.spawnSettingsModal());
        }

        {
            const menu = driver.append_item("Help");

            if(!app.is_web()) {
                item = menu.append_item(tr("Check for updates"));
                item.click(() => native_actions.check_native_update());

                item = menu.append_item(tr("Open changelog"));
                item.click(() => native_actions.open_change_log());
            }

            item = menu.append_item(tr("Visit TeaSpeak.de"));
            //TODO: Client direct browser?
            item.click(() => window.open('https://teaspeak.de/', '_blank'));

            item = menu.append_item(tr("Visit TeaSpeak forum"));
            //TODO: Client direct browser?
            item.click(() => window.open('https://forum.teaspeak.de/', '_blank'));

            menu.append_hr();
            item = menu.append_item(app.is_web() ? tr("About TeaWeb") : tr("About TeaClient"));
            item.click(() => Modals.spawnAbout())
        }

        update_state();
    }

    /* default is HTML, the client will override this */
    set_driver(html.HTMLMenuBarDriver.instance());
}