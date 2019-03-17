let context_menu: JQuery;

$(document).bind("mousedown", function (e) {
    let menu = context_menu || (context_menu = $(".context-menu"));

    if(!menu.is(":visible")) return;

    if ($(e.target).parents(".context-menu").length == 0) {
        despawn_context_menu();
    }
});

let contextMenuCloseFn = undefined;
function despawn_context_menu() {
    let menu = context_menu || (context_menu = $(".context-menu"));

    if(!menu.is(":visible")) return;
    menu.hide(100);
    if(contextMenuCloseFn) contextMenuCloseFn();
}

enum MenuEntryType {
    CLOSE,
    ENTRY,
    HR,
    SUB_MENU
}

class MenuEntry {
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

interface ContextMenuEntry {
    callback?:   () => void;
    type:       MenuEntryType;
    name:       (() => string) | string;
    icon?:       (() => string) | string | JQuery;
    disabled?:  boolean;
    invalidPermission?:  boolean;

    sub_menu?: ContextMenuEntry[];
}

function generate_tag(entry: ContextMenuEntry) : JQuery {
    if(entry.type == MenuEntryType.HR) {
        return $.spawn("hr");
    } else if(entry.type == MenuEntryType.ENTRY) {
        console.log(entry.icon);
        let icon = $.isFunction(entry.icon) ? entry.icon() : entry.icon;
        if(typeof(icon) === "string") {
            if(!icon || icon.length == 0) icon = "icon_empty";
            else icon = "icon " + icon;
        }

        let tag = $.spawn("div").addClass("entry");
        tag.append(typeof(icon) === "string" ? $.spawn("div").addClass(icon) : icon);
        tag.append($.spawn("div").html($.isFunction(entry.name) ? entry.name() : entry.name));

        if(entry.disabled || entry.invalidPermission) tag.addClass("disabled");
        else {
            tag.click(function () {
                if($.isFunction(entry.callback)) entry.callback();
                despawn_context_menu();
            });
        }
        return tag;
    } else if(entry.type == MenuEntryType.SUB_MENU) {
        let icon = $.isFunction(entry.icon) ? entry.icon() : entry.icon;
        if(typeof(icon) === "string") {
            if(!icon || icon.length == 0) icon = "icon_empty";
            else icon = "icon " + icon;
        }

        let tag = $.spawn("div").addClass("entry").addClass("sub-container");
        tag.append(typeof(icon) === "string" ? $.spawn("div").addClass(icon) : icon);
        tag.append($.spawn("div").html($.isFunction(entry.name) ? entry.name() : entry.name));

        tag.append($.spawn("div").addClass("arrow right"));

        if(entry.disabled || entry.invalidPermission) tag.addClass("disabled");
        else {
            let menu = $.spawn("div").addClass("sub-menu").addClass("context-menu");
            for(let e of entry.sub_menu)
                menu.append(generate_tag(e));
            menu.appendTo(tag);
        }
        return tag;
    }
    return $.spawn("div").text("undefined");
}

function spawn_context_menu(x, y, ...entries: ContextMenuEntry[]) {
    let menu = context_menu || (context_menu = $(".context-menu"));
    menu.finish().empty();

    contextMenuCloseFn = undefined;

    for(let entry of entries){
        if(entry.type == MenuEntryType.CLOSE) {
            contextMenuCloseFn = entry.callback;
        } else
            menu.append(generate_tag(entry));
    }

    menu.show(100);
    // In the right position (the mouse)
    menu.css({
        "top": y + "px",
        "left": x + "px"
    });
}