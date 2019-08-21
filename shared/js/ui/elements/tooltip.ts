function tooltip(entry: JQuery) {
    return tooltip.initialize(entry);
}

namespace tooltip {
    let _global_tooltip: JQuery;
    export type Handle = {
        show();
        is_shown();
        hide();
        update();
    }
    export function initialize(entry: JQuery) : Handle {
        let _show;
        let _hide;
        let _shown;
        let _update;

        entry.find(".container-tooltip").each((index, _node) => {
            const node = $(_node) as JQuery;
            const node_content = node.find(".tooltip");

            let _force_show = false, _flag_shown = false;

            const mouseenter = (event?) => {
                const bounds = node[0].getBoundingClientRect();

                if(!_global_tooltip) {
                    _global_tooltip = $("#global-tooltip");
                }

                _global_tooltip[0].style.left = (bounds.left + bounds.width / 2) + "px";
                _global_tooltip[0].style.top = bounds.top + "px";
                _global_tooltip[0].classList.add("shown");

                _global_tooltip[0].innerHTML = node_content[0].innerHTML;
                _flag_shown = _flag_shown || !!event; /* if event is undefined then it has been triggered by hand */
            };

            const mouseexit = () => {
                if(_global_tooltip) {
                    if(!_force_show) {
                        _global_tooltip[0].classList.remove("shown");
                    }
                    _flag_shown = false;
                }
            };

            _node.addEventListener("mouseenter", mouseenter);

            _node.addEventListener("mouseleave", mouseexit);

            _show = () => {
                _force_show = true;
                mouseenter();
            };

            _hide = () => {
                _force_show = false;
                if(!_flag_shown)
                    mouseexit();
            };

            _update = () => {
                if(_flag_shown || _force_show)
                    mouseenter();
            };

            _shown = () => _flag_shown || _force_show;
        });
        return {
            hide: _hide || (() => {}),
            show: _show || (() => {}),
            is_shown: _shown || (() => false),
            update: _update || (() => {})
        };
    }
}