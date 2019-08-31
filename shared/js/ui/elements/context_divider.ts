interface JQuery<TElement = HTMLElement> {
    dividerfy() : this;
}

if(!$.fn.dividerfy) {
    $.fn.dividerfy = function<T extends HTMLElement>(this: JQuery<T>) : JQuery<T> {
        this.find(".container-seperator").each(function (this: T) {
            if(!this.previousElementSibling) return;
            if(!this.nextElementSibling) return;

            const element = $(this);
            const parent_element = $(this.parentElement);
            const previous_element = $(this.previousElementSibling);
            const next_element = $(this.nextElementSibling);

            const seperator_id = element.attr("seperator-id");
            const vertical = element.hasClass("vertical");

            const apply_view = (property: "width" | "height", previous: number, next: number) => {
                const value_a = "calc(" + previous + "% - " + (vertical ? element.width() : element.height()) + "px)";
                const value_b = "calc(" + next + "% - " + (vertical ? element.width() : element.height()) + "px)";

                /* dont cause a reflow here */
                if(property === "height") {
                    (previous_element[0] as HTMLElement).style.height = value_a;
                    (next_element[0] as HTMLElement).style.height = value_b;
                } else {
                    (previous_element[0] as HTMLElement).style.width = value_a;
                    (next_element[0] as HTMLElement).style.width = value_b;
                }
            };

            const listener_move = (event: MouseEvent | TouchEvent) => {
                const parent_offset = parent_element.offset();
                const min = vertical ? parent_offset.left : parent_offset.top;
                const max = vertical ? parent_offset.left + parent_element.width() : parent_offset.top + parent_element.height();
                const current = event instanceof MouseEvent ?
                    (vertical ? event.pageX : event.pageY) :
                    (vertical ? event.touches[event.touches.length - 1].clientX : event.touches[event.touches.length - 1].clientY);

                /*
                const previous_offset = previous_element.offset();
                const next_offset = next_element.offset();

                const min = vertical ? Math.min(previous_offset.left, next_offset.left) : Math.min(previous_offset.top, next_offset.top);
                const max = vertical ?
                    Math.max(previous_offset.left + previous_element.width(), next_offset.left + next_element.width()) :
                    Math.max(previous_offset.top + previous_element.height(), next_offset.top + next_element.height());
                */

                let previous = 0;
                let next = 0;
                if(current < min) {
                    previous = 0;
                    next = 1;
                } else if(current < max) {
                    const x_offset = current - min;
                    const x_offset_max = max - min;

                    previous = x_offset / x_offset_max;
                    next = 1 - previous;
                } else {
                    previous = 1;
                    next = 0;
                }


                //console.log(min + " - " + max + " - " + current);
                const property = vertical ? "width" : "height";
                const previous_p = Math.ceil(previous * 100);
                const next_p = Math.ceil(next * 100);
                apply_view(property, previous_p, next_p);

                if(seperator_id)
                    settings.changeGlobal("seperator-settings-" + seperator_id, JSON.stringify({
                        previous: previous_p,
                        next: next_p,
                        property: property
                    }));
            };

            const listener_up = (event: MouseEvent) => {
                document.removeEventListener('mousemove', listener_move);
                document.removeEventListener('touchmove', listener_move);

                document.removeEventListener('mouseup', listener_up);
                document.removeEventListener('touchend', listener_up);
                document.removeEventListener('touchcancel', listener_up);
                $(document.documentElement).css("user-select", "");

                element.removeClass("seperator-selected");

                next_element.find("[x-divider-require-resize]").trigger('resize');
                previous_element.find("[x-divider-require-resize]").trigger('resize');
            };

            element.on('mousedown', () => {
                document.addEventListener('mousemove', listener_move);
                document.addEventListener('touchmove', listener_move);

                document.addEventListener('mouseup', listener_up);
                document.addEventListener('touchend', listener_up);
                document.addEventListener('touchcancel', listener_up);
                $(document.documentElement).css("user-select", "none");

                element.addClass("seperator-selected");
            });

            element.on('touchstart', () => {
                element.trigger('mousedown');
            });


            if(seperator_id) {
                try {
                    const config = JSON.parse(settings.global("seperator-settings-" + seperator_id));
                    if(config) {
                        log.debug(LogCategory.GENERAL, tr("Applying previous changed sperator settings for %s: %o"), seperator_id, config);
                        apply_view(config.property, config.previous, config.next);
                    }
                } catch(e) {
                    if(!(e instanceof SyntaxError))
                        log.error(LogCategory.GENERAL, tr("Failed to parse seperator settings for sperator %s: %o"), seperator_id, e);
                }
            }
        });
        return this;
    }
}