namespace contextmenu {
    export interface MenuEntry {
        callback?: () => void;
        type: MenuEntryType;
        name: (() => string) | string;
        icon_class?: string;
        icon_path?: string;
        disabled?:  boolean;
        visible?: boolean;

        checkbox_checked?: boolean;

        invalidPermission?:  boolean;
        sub_menu?: MenuEntry[];
    }

    export enum MenuEntryType {
        CLOSE,
        ENTRY,
        CHECKBOX,
        HR,
        SUB_MENU
    }

    export class Entry {
        static HR() {
            return {
                callback: () => {},
                type: MenuEntryType.HR,
                name: "",
                icon: ""
            };
        };

        static CLOSE(callback: () => void) {
            return {
                callback: callback,
                type: MenuEntryType.CLOSE,
                name: "",
                icon: ""
            };
        }
    }

    export interface ContextMenuProvider {
        despawn_context_menu();
        spawn_context_menu(x: number, y: number, ...entries: MenuEntry[]);

        initialize();
        finalize();

        html_format_enabled() : boolean;
    }

    let provider: ContextMenuProvider;
    export function spawn_context_menu(x: number, y: number, ...entries: MenuEntry[]) {
        if(!provider) {
            console.error(tr("Failed to spawn context menu! Missing provider!"));
            return;
        }

        provider.spawn_context_menu(x, y, ...entries);
    }

    export function despawn_context_menu() {
        if(!provider)
            return;

        provider.despawn_context_menu();
    }

    export function get_provider() : ContextMenuProvider { return provider; }
    export function set_provider(_provider: ContextMenuProvider) {
        provider = _provider;
        provider.initialize();
    }
}

class HTMLContextMenuProvider implements contextmenu.ContextMenuProvider {
    private _global_click_listener: (event) => any;
    private _context_menu: JQuery;
    private _close_callbacks: (() => any)[] = [];
    private _visible = false;

    despawn_context_menu() {
        if(!this._visible)
            return;

        let menu = this._context_menu || (this._context_menu = $(".context-menu"));
        menu.animate({opacity: 0}, 100, () => menu.css("display", "none"));
        this._visible = false;
        for(const callback of this._close_callbacks) {
            if(typeof(callback) !== "function") {
                console.error(tr("Given close callback is not a function!. Callback: %o"), callback);
                continue;
            }
            callback();
        }
        this._close_callbacks = [];
    }

    finalize() {
        $(document).unbind('click', this._global_click_listener);
    }

    initialize() {
        this._global_click_listener = this.on_global_click.bind(this);
        $(document).bind('click', this._global_click_listener);
    }

    private on_global_click(event) {
        //let menu = this._context_menu || (this._context_menu = $(".context-menu"));

        if(!this._visible) return;
        if ($(event.target).parents(".context-menu").length == 0) {
            this.despawn_context_menu();
            event.preventDefault();
        }
    }

    private generate_tag(entry: contextmenu.MenuEntry) : JQuery {
        if(entry.type == contextmenu.MenuEntryType.HR) {
            return $.spawn("hr");
        } else if(entry.type == contextmenu.MenuEntryType.ENTRY) {
            let icon = entry.icon_class;
            if(!icon || icon.length == 0) icon = "icon_empty";
            else icon = "icon " + icon;

            let tag = $.spawn("div").addClass("entry");
            tag.append($.spawn("div").addClass(icon));
            tag.append($.spawn("div").html($.isFunction(entry.name) ? entry.name() : entry.name));

            if(entry.disabled || entry.invalidPermission)
                tag.addClass("disabled");
            else {
                tag.on('click', () => {
                    if($.isFunction(entry.callback))
                        entry.callback();
                    entry.callback = undefined; /* for some reason despawn_context_menu() causes a second click event? */
                    this.despawn_context_menu();
                });
            }
            return tag;
        } else if(entry.type == contextmenu.MenuEntryType.CHECKBOX) {
             let checkbox = $.spawn("label").addClass("ccheckbox");
                $.spawn("input").attr("type", "checkbox").prop("checked", !!entry.checkbox_checked).appendTo(checkbox);
                $.spawn("span").addClass("checkmark").appendTo(checkbox);

            let tag = $.spawn("div").addClass("entry");
            tag.append(checkbox);
            tag.append($.spawn("div").html($.isFunction(entry.name) ? entry.name() : entry.name));

            if(entry.disabled || entry.invalidPermission)
                tag.addClass("disabled");
            else {
                tag.on('click', () => {
                    if($.isFunction(entry.callback))
                        entry.callback();
                    entry.callback = undefined; /* for some reason despawn_context_menu() causes a second click event? */
                    this.despawn_context_menu();
                });
            }
            return tag;
        } else if(entry.type == contextmenu.MenuEntryType.SUB_MENU) {
            let icon = entry.icon_class;
            if(!icon || icon.length == 0) icon = "icon_empty";
            else icon = "icon " + icon;

            let tag = $.spawn("div").addClass("entry").addClass("sub-container");
            tag.append($.spawn("div").addClass(icon));
            tag.append($.spawn("div").html($.isFunction(entry.name) ? entry.name() : entry.name));

            tag.append($.spawn("div").addClass("arrow right"));

            if(entry.disabled || entry.invalidPermission) tag.addClass("disabled");
            else {
                let menu = $.spawn("div").addClass("sub-menu").addClass("context-menu-container");
                for(const e of entry.sub_menu) {
                    if(typeof(entry.visible) === 'boolean' && !entry.visible)
                        continue;
                    menu.append(this.generate_tag(e));
                }
                menu.appendTo(tag);
            }
            return tag;
        }
        return $.spawn("div").text("undefined");
    }

    spawn_context_menu(x: number, y: number, ...entries: contextmenu.MenuEntry[]) {
        this._visible = true;

        let menu_tag = this._context_menu || (this._context_menu = $(".context-menu"));
        menu_tag.finish().empty().css("opacity", "0");

        const menu_container = $.spawn("div").addClass("context-menu-container");
        this._close_callbacks = [];

        for(const entry of entries){
            if(typeof(entry.visible) === 'boolean' && !entry.visible)
                continue;

            if(entry.type == contextmenu.MenuEntryType.CLOSE) {
                if(entry.callback)
                    this._close_callbacks.push(entry.callback);
            } else
                menu_container.append(this.generate_tag(entry));
        }

        menu_tag.append(menu_container);
        menu_tag.animate({opacity: 1}, 100).css("display", "block");

        const width = menu_container.visible_width();
        if(x + width + 5 > window.innerWidth)
            menu_container.addClass("left");

        // In the right position (the mouse)
        menu_tag.css({
            "top": y + "px",
            "left": x + "px"
        });
    }

    html_format_enabled(): boolean {
        return true;
    }
}

contextmenu.set_provider(new HTMLContextMenuProvider());