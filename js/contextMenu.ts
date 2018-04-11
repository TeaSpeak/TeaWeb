// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {
    // If the clicked element is not the menu
    if ($(e.target).parents(".contextMenu").length == 0) {
        // Hide it
        despawnContextMenu();
    }
});

let contextMenuCloseFn = undefined;
function despawnContextMenu() {
    let menue = $(".contextMenu");
    if(!menue.is(":visible")) return;
    menue.hide(100);
    if(contextMenuCloseFn) contextMenuCloseFn();
}

enum MenuEntryType {
    CLOSE,
    ENTRY,
    HR,
    EMPTY
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

    static EMPTY() {
        return {
            callback: () => {},
            type: MenuEntryType.EMPTY,
            name: "",
            icon: ""
        };
    };

    static CLOSE(callback: () => void) {
        return {
            callback: callback,
            type: MenuEntryType.EMPTY,
            name: "",
            icon: ""
        };
    }
}

function spawnMenu(x, y, ...entries: {
    callback:   () => void;
    type:       MenuEntryType;
    name:       (() => string) | string;
    icon:       (() => string) | string;
    disabled?:  boolean;
}[]) {
    const menu = $("#contextMenu");
    menu.empty();
    menu.hide();

    contextMenuCloseFn = undefined;

    let index = 0;

    for(let entry of entries){
        if(entry.type == MenuEntryType.HR) {
            menu.append("<hr>");
        } else if(entry.type == MenuEntryType.CLOSE) {
            contextMenuCloseFn = entry.callback;
        } else if(entry.type == MenuEntryType.ENTRY) {
            let icon = $.isFunction(entry.icon) ? entry.icon() : entry.icon;
            if(icon.length == 0) icon = "icon_empty";
            else icon = "icon " + icon;

            let tag = $.spawn("li");
            tag.append("<div class='" + icon + "'></div>");
            tag.append("<div>" + ($.isFunction(entry.name) ? entry.name() : entry.name) + "</div>");

            menu.append(tag);

            if(entry.disabled) tag.addClass("disabled");
            else {
                tag.click(function () {
                    if($.isFunction(entry.callback)) entry.callback();
                    despawnContextMenu();
                });
            }
        }
    }

    menu.show(100);
    // In the right position (the mouse)
    menu.css({
        "top": y + "px",
        "left": x + "px"
    });
}