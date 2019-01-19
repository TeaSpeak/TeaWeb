interface JQuery<TElement = HTMLElement> {
    dividerfy() : this;
}

if(!$.fn.dividerfy) {
    $.fn.dividerfy = function<T extends HTMLElement>(this: JQuery<T>) : JQuery<T> {
        this.find(".container-seperator").each(function (this: T) {
            const element = $(this);
            const vertical = element.hasClass("vertical");

            const listener_move = (event: MouseEvent) => {
                if(!this.previousElementSibling) return;
                if(!this.nextElementSibling) return;

                const parent_element = $(this.parentElement);
                const previous_element = $(this.previousElementSibling);
                const next_element = $(this.nextElementSibling);

                const parent_offset = parent_element.offset();
                const min = vertical ? parent_offset.left : parent_offset.top;
                const max = vertical ? parent_offset.left + parent_element.width() : parent_offset.top + parent_element.height();
                const current = vertical ? event.pageX : event.pageY;

                /*
                const previous_offset = previous_element.offset();
                const next_offset = next_element.offset();

                const min = vertical ? Math.min(previous_offset.left, next_offset.left) : Math.min(previous_offset.top, next_offset.top);
                const max = vertical ?
                    Math.max(previous_offset.left + previous_element.width(), next_offset.left + next_element.width()) :
                    Math.max(previous_offset.top + previous_element.height(), next_offset.top + next_element.height());
                */

                let previous_width = 0;
                let next_width = 0;
                if(current < min) {
                    previous_width = 0;
                    next_width = 1;
                } else if(current < max) {
                    const x_offset = current - min;
                    const x_offset_max = max - min;

                    previous_width = x_offset / x_offset_max;
                    next_width = 1 - previous_width;
                } else {
                    previous_width = 1;
                    next_width = 0;
                }


                previous_element.css(vertical ? "width" : "height", "calc(" + Math.ceil(previous_width * 100) + "% - " + (vertical ? element.width() : element.height()) + "px)");
                next_element.css(vertical ? "width" : "height", "calc(" + Math.ceil(next_width * 100) + "% - " + (vertical ? element.width() : element.height()) + "px)");
            };

            const listener_up = (event: MouseEvent) => {
                document.removeEventListener('mousemove', listener_move);
                document.removeEventListener('mouseup', listener_up);
                $(document.documentElement).css("user-select", "");
            };

            element.on('mousedown', () => {
                document.addEventListener('mousemove', listener_move);
                document.addEventListener('mouseup', listener_up);
                $(document.documentElement).css("user-select", "none");
            });
        });
        return this;
    }
}