class X_Tab extends HTMLElement {
}
class X_Entry extends HTMLElement {
}
class X_Tag extends HTMLElement {
}
class X_Content extends HTMLElement {
}
customElements.define('x-tab', X_Tab, { extends: 'div' });
customElements.define('x-entry', X_Entry, { extends: 'div' });
customElements.define('x-tag', X_Tag, { extends: 'div' });
customElements.define('x-content', X_Content, { extends: 'div' });
var TabFunctions = {
    tabify(template) {
        console.log("Tabify:");
        console.log(template);
        let tag = $.spawn("div");
        tag.addClass("tab");
        let header = $.spawn("div");
        header.addClass("tab-header");
        let content = $.spawn("div");
        content.addClass("tab-content");
        template.find("x-entry").each(function () {
            let hentry = $.spawn("div");
            hentry.addClass("entry");
            hentry.append($(this).find("x-tag").clone());
            const _this = $(this);
            hentry.on("click", function () {
                tag.find(".tab-header .selected").removeClass("selected");
                hentry.addClass("selected");
                content.empty();
                content.append(_this.find("x-content").clone());
            });
            console.log(this);
            header.append(hentry);
        });
        header.find(".entry").first().trigger("click");
        tag.append(header);
        tag.append(content);
        return tag;
    }
};
if (!$.fn.asTabWidget) {
    $.fn.asTabWidget = function () {
        if ($(this).prop("tagName") == "X-TAB")
            return TabFunctions.tabify($(this));
        else {
            throw "Invalid tag! " + $(this).prop("tagName");
        }
    };
}
if (!$.fn.tabify) {
    $.fn.tabify = function () {
        try {
            let self = this.asTabWidget();
            this.replaceWith(self);
        }
        catch (object) { }
        this.find("x-tab").each(function () {
            $(this).replaceWith($(this).asTabWidget());
        });
        return this;
    };
}
//# sourceMappingURL=tab.js.map