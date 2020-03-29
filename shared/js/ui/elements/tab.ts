/// <reference path="../../i18n/localize.ts" />

interface JQuery<TElement = HTMLElement> {
    asTabWidget(copy?: boolean) : JQuery<TElement>;
    tabify(copy?: boolean) : this;

    changeElementType(type: string) : JQuery<TElement>;
}


if(typeof (customElements) !== "undefined") {
    try {
        class X_Tab extends HTMLElement {}
        class X_Entry extends HTMLElement {}
        class X_Tag extends HTMLElement {}
        class X_Content extends HTMLElement {}

        customElements.define('x-tab', X_Tab, { extends: 'div' });
        customElements.define('x-entry', X_Entry, { extends: 'div' });
        customElements.define('x-tag', X_Tag, { extends: 'div' });
        customElements.define('x-content', X_Content, { extends: 'div' });
    } catch(error) {
        console.warn("failed to define costum elements");
    }
} else {
    console.warn(tr("Could not defied tab customElements!"));
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

        content.append($.spawn("div").addClass("height-watcher"));

        let silentContent = $.spawn("div");
        silentContent.addClass("tab-content-invisible");

        /* add some kind of min height */
        const update_height = () => {
            const height_watcher = tag.find("> .tab-content .height-watcher");
            const entries: JQuery = tag.find("> .tab-content-invisible x-content, > .tab-content x-content");
            console.error(entries);
            let max_height = 0;

            entries.each((_, _e) => {
                const entry = $(_e);
                const height = entry.visible_height();
                if(height > max_height)
                    max_height = height;
            });

            height_watcher.css('min-height', max_height + "px");
            tag.find(".window-resize-listener").trigger('resize');
        };

        template.find("x-entry").each( (_, _entry) => {
            const entry = $(_entry);

            const tag_header = $.spawn("div").addClass("entry");
            const tag_content = copy ? entry.find("x-content").clone(true, true) : entry.find("x-content");

            {
                const header_tag = entry.find("x-tag");
                const header_data = copy ? header_tag.contents().clone(true, true) : header_tag.contents();

                if(header_tag.attr("x-entry-class"))
                    tag_header.addClass(header_tag.attr("x-entry-class"));
                if(header_tag.attr("x-entry-id"))
                    tag_header.attr("x-id", header_tag.attr("x-entry-id"));

                tag_header.append(header_data);

                /* listener if the tab might got removed */
                tag_header.addClass("window-resize-listener");
                tag_header.on('resize', event => {
                    if(!tag_header.is(':visible') && tag_header.hasClass('selected')) {
                        let element = tag_header.next('.entry:visible');
                        if(element.length == 0)
                            element = tag_header.prev('.entry:visible');
                        if(element.length == 0) {
                            tag_header.removeClass("selected");
                            tag_content.hide();
                        } else {
                            element.first().trigger('click');
                        }
                        console.log("Next: %o", tag_header.next('.entry:visible'));
                        console.log("prev: %o", tag_header.prev('.entry:visible'));
                    }
                });
            }

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

                tag_content.trigger('show');
                tag_content.show();
            });

            console.log(this);
            header.append(tag_header);
        });

        setTimeout(() => header.find(".entry").first().trigger("click"), 0);

        tag.append(header);
        tag.append(content);
        tag.append(silentContent);

        tag.on('tab.resize', update_height);
        return tag;
    }
};

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
    $.fn.tabify = function (this: JQuery, copy?: boolean) {
        const wrapped_tag = $.spawn("div").append(this);
        wrapped_tag.find("x-tab").each((_, _element) => {
            const element = $(_element);
            element.replaceWith(element.asTabWidget(copy));
        });
        return wrapped_tag.children();
    }
}