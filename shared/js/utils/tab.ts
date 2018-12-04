
interface JQuery<TElement = HTMLElement> {
    asTabWidget(copy?: boolean) : JQuery<TElement>;
    tabify(copy?: boolean) : this;

    changeElementType(type: string) : JQuery<TElement>;
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

        template.find("x-entry").each( (_, _entry) => {
            const entry = $(_entry);

            let tag_header = $.spawn("div").addClass("entry");
            if(copy)
                tag_header.append(entry.find("x-tag").clone(true, true));
            else
                tag_header.append(entry.find("x-tag"));

            const tag_content = copy ? entry.find("x-content").clone(true, true) : entry.find("x-content");
            content.append(tag_content.hide());

            tag_header.on("click", () => {
                if(tag_header.hasClass("selected")) return;

                tag.find(".tab-header .selected").removeClass("selected");
                tag_header.addClass("selected");

                content.find("> x-content").hide();
                /* don't show many nodes at once */
                let entries = tag_content.find(".tab-show-partitional");
                entries.hide();
                const show_next = index => {
                    console.log("Show " + index);
                    if(index >= entries.length) return;
                    entries.eq(index).show();

                    setTimeout(show_next.bind(undefined, index + 1), 0);
                };
                show_next(0);

                tag_content.show();
            });

            console.log(this);
            header.append(tag_header);
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