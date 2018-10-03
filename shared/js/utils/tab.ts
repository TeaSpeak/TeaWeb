
interface JQuery {
    asTabWidget(copy?: boolean) : JQuery;
    tabify(copy?: boolean) : this;

    changeElementType(type: string) : JQuery;
}

if(typeof (customElements) !== "undefined") {
    class X_Tab extends HTMLElement {}
    class X_Entry extends HTMLElement {}
    class X_Tag extends HTMLElement {}
    class X_Content extends HTMLElement {}

    customElements.define('x-tab', X_Tab, { extends: 'div' });
    customElements.define('x-entry', X_Entry, { extends: 'div' });
    customElements.define('x-tag', X_Tag, { extends: 'div' });
    customElements.define('x-content', X_Content, { extends: 'div' });
} else {
    console.warn("Could not defied tab customElements!");
}

var TabFunctions = {
    tabify(template: JQuery, copy: boolean = true) : JQuery {
        console.log("Tabify: copy=" + copy);
        console.log(template);

        let tag = $.spawn("div");
        tag.addClass("tab");

        let header = $.spawn("div");
        header.addClass("tab-header");

        let content = $.spawn("div");
        content.addClass("tab-content");

        let silentContent = $.spawn("div");
        silentContent.addClass("tab-content-invisible");

        template.find("x-entry").each(function () {
            let hentry = $.spawn("div");
            hentry.addClass("entry");
            if(copy)
                hentry.append($(this).find("x-tag").clone(true, true));
            else
                hentry.append($(this).find("x-tag"));

            const _this = $(this);
            const _entryContent = copy ? _this.find("x-content").clone(true, true) : _this.find("x-content");
            silentContent.append(_entryContent);
            hentry.on("click", function () {
                if(hentry.hasClass("selected")) return;
                tag.find(".tab-header .selected").removeClass("selected");
                hentry.addClass("selected");

                content.children().appendTo(silentContent);
                console.log(silentContent);
                content.empty();
                content.append(_entryContent);
                //console.log(_this.find("x-content"));
                //content.append(_this.find("x-content"));
            });

            console.log(this);
            header.append(hentry);
        });

        header.find(".entry").first().trigger("click");

        tag.append(header);
        tag.append(content);
        tag.append(silentContent);
        return tag;
    }
}

if(!$.fn.asTabWidget) {
    $.fn.asTabWidget = function (copy?: boolean) : JQuery {
        if($(this).prop("tagName") == "X-TAB")
            return TabFunctions.tabify($(this), typeof(copy) === "boolean" ? copy : true);
        else {
            throw "Invalid tag! " + $(this).prop("tagName");
        }
    }
}

if(!$.fn.tabify) {
    $.fn.tabify = function (copy?: boolean) {
        try {
            let self = this.asTabWidget(copy);
            this.replaceWith(self);
        } catch(object) {}
        this.find("x-tab").each(function () {
            $(this).replaceWith($(this).asTabWidget(copy));
        });
        return this;
    }
}