namespace image_preview {
    let preview_overlay: JQuery<HTMLDivElement>;
    let container_image: JQuery<HTMLDivElement>;
    let button_open_in_browser: JQuery;

    export function preview_image(url: string, original_url: string) {
        if(!preview_overlay) return;

        container_image.empty();
        $.spawn("img").attr({
                "src": url,
                "title": original_url,
                "x-original-src": original_url
        }).appendTo(container_image);

        preview_overlay.removeClass("hidden");
        button_open_in_browser.show();
    }

    export function preview_image_tag(tag: JQuery) {
        if(!preview_overlay) return;

        container_image.empty();
        container_image.append(tag);

        preview_overlay.removeClass("hidden");
        button_open_in_browser.hide();
    }

    export function current_url() {
        const image_tag = container_image.find("img");
        return image_tag.attr("x-original-src") || image_tag.attr("src") || "";
    }

    export function close_preview() {
        preview_overlay.addClass("hidden");
    }

    loader.register_task(loader.Stage.LOADED, {
        priority: 0,
        name: "image preview init",
        function: async () => {
            preview_overlay = $("#overlay-image-preview");
            container_image = preview_overlay.find(".container-image") as any;

            preview_overlay.find("img").on('click', event => event.preventDefault());
            preview_overlay.on('click', event => {
                if(event.isDefaultPrevented()) return;
                close_preview();
            });

            preview_overlay.find(".button-close").on('click', event => {
                event.preventDefault();
                close_preview();
            });

            preview_overlay.find(".button-download").on('click', event => {
                event.preventDefault();

                const link = document.createElement('a');
                link.href = current_url();
                link.target = "_blank";

                const findex = link.href.lastIndexOf("/") + 1;
                link.download = link.href.substr(findex);

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });

            button_open_in_browser = preview_overlay.find(".button-open-in-window");
            button_open_in_browser.on('click', event => {
                event.preventDefault();

                const win = window.open(current_url(), '_blank');
                win.focus();
            });
        }
    });
}