interface SliderOptions {
    min_value?: number;
    max_value?: number;
    initial_value?: number;
    step?: number;

    unit?: string;
    value_field?: JQuery | JQuery[];
}

interface Slider {
    value(value?: number) : number;
}

function sliderfy(slider: JQuery, options?: SliderOptions) : Slider {
    options = Object.assign( {
        initial_value: 0,
        min_value: 0,
        max_value: 100,
        step: 1,
        unit: '%',
        value_field: []
    }, options);

    if(!Array.isArray(options.value_field))
        options.value_field = [options.value_field];
    if(options.min_value >= options.max_value)
        throw "invalid range";
    if(options.step > (options.max_value - options.min_value))
        throw "invalid step size";


    const tool = tooltip(slider); /* add the tooltip functionality */
    const filler = slider.find(".filler");
    const thumb = slider.find(".thumb");
    const tooltip_text = slider.find(".tooltip a");

    let _current_value;
    const update_value = (value: number, trigger_change: boolean) => {
        _current_value = value;

        const offset = Math.min(100, Math.max(0, ((value - options.min_value) * 100) / (options.max_value - options.min_value)));
        filler.css('width', offset + '%');
        thumb.css('left', offset + '%');


        tooltip_text.text(value.toFixed(0) + options.unit);
        slider.attr("value", value);
        if(trigger_change)
            slider.trigger('change');
        for(const field of options.value_field)
            (field as JQuery).text(value + options.unit);

        tool.update();
    };

    const mouse_up_listener = () => {
        document.removeEventListener('mousemove', mouse_listener);
        document.removeEventListener('touchmove', mouse_listener);

        document.removeEventListener('mouseup', mouse_up_listener);
        document.removeEventListener('touchend', mouse_up_listener);
        document.removeEventListener('touchcancel', mouse_up_listener);

        tool.hide();
        slider.removeClass("active");
        console.log("Events removed");
    };

    const mouse_listener = (event: MouseEvent | TouchEvent) => {
        const parent_offset = slider.offset();
        const min = parent_offset.left;
        const max = parent_offset.left + slider.width();
        const current = event instanceof MouseEvent ? event.pageX : event.touches[event.touches.length - 1].clientX;

        const range = options.max_value - options.min_value;
        const offset = Math.round(((current - min) * (range / options.step)) / (max - min)) * options.step;
        let value = Math.min(options.max_value, Math.max(options.min_value, options.min_value + offset));
        //console.log("Min: %o | Max: %o | %o (%o)", min, max, current, offset);

        update_value(value, true);
    };

    slider.on('mousedown', event => {
        document.addEventListener('mousemove', mouse_listener);
        document.addEventListener('touchmove', mouse_listener);

        document.addEventListener('mouseup', mouse_up_listener);
        document.addEventListener('touchend', mouse_up_listener);
        document.addEventListener('touchcancel', mouse_up_listener);

        tool.show();
        slider.addClass("active");
    });

    update_value(options.initial_value, false);

    return {
        value(value?: number) {
            if(typeof(value) !== "undefined" && value !== _current_value)
                update_value(value, true);
            return _current_value;
        }
    }
}