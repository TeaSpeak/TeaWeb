class Hostbanner {
    readonly html_tag: JQuery<HTMLElement>;
    readonly client: ConnectionHandler;

    private _destryed = false;
    private updater: NodeJS.Timer;

    constructor(client: ConnectionHandler) {
        this.client = client;
        this.html_tag = $.spawn("div").addClass("container-hostbanner");
        this.html_tag.on('click', event => {
            const server = this.client.channelTree.server;
            if(!server || !server.properties.virtualserver_hostbanner_url)
                return;
            window.open(server.properties.virtualserver_hostbanner_url, '_blank');
        });

        this.update();
    }

    destroy() {
        if(this.updater) {
            clearTimeout(this.updater);
            this.updater = undefined;
        }
        if(this.html_tag) {
            this.html_tag.remove();
        }
        this._destryed = true;
    }

    update() {
        if(this._destryed) return;

        if(this.updater) {
            clearTimeout(this.updater);
            this.updater = undefined;
        }

        this.html_tag.toggleClass("no-background", !settings.static_global(Settings.KEY_HOSTBANNER_BACKGROUND));

        const tag = this.generate_tag();
        tag.then(element => {
            log.debug(LogCategory.CLIENT, tr("Regenerated hostbanner tag. Replacing it: %o"), element);
            if(!element) {
                this.html_tag.empty().addClass("disabled");
                return;
            }
            const children = this.html_tag.children();
            this.html_tag.append(element).removeClass("disabled");

            /* allow the new image be loaded from cache URL */
            {
                children
                    .css('z-index', '2')
                    .css('position', 'absolute')
                    .css('height', '100%')
                    .css('width', '100%');
                setTimeout(() => {
                    children.detach();
                }, 250);
            }
        }).catch(error => {
            log.warn(LogCategory.CLIENT, tr("Failed to load the hostbanner: %o"), error);
            this.html_tag.empty().addClass("disabled");
        });
        const server = this.client.channelTree.server;
        this.html_tag.attr('title', server ? server.properties.virtualserver_hostbanner_url : undefined);
    }

    public static async generate_tag(banner_url: string | undefined, gfx_interval: number, mode: number) : Promise<JQuery | undefined> {
        if(!banner_url) return undefined;

        if(gfx_interval > 0) {
            const update_interval = Math.max(gfx_interval, 60);
            const update_timestamp = (Math.floor((Date.now() / 1000) / update_interval) * update_interval).toString();
            try {
                const url = new URL(banner_url);
                if(url.search.length == 0)
                    banner_url += "?_ts=" + update_timestamp;
                else
                    banner_url += "&_ts=" + update_timestamp;
            } catch(error) {
                console.warn(tr("Failed to parse banner URL: %o. Using default '&' append."), error);
                banner_url += "&_ts=" + update_timestamp;
            }
        }

        /* first now load the image */
        const image_element = document.createElement("img");
        await new Promise((resolve, reject) => {
            image_element.onload = resolve;
            image_element.onerror = reject;
            image_element.src = banner_url;
            image_element.style.display = 'none';
            document.body.append(image_element);
            log.debug(LogCategory.CLIENT, tr("Successfully loaded hostbanner image."));
        });

        image_element.parentNode.removeChild(image_element);
        image_element.style.display = 'unset';
        return $.spawn("div").addClass("hostbanner-image-container hostbanner-mode-" + mode).append($(image_element));
    }

    private async generate_tag?() : Promise<JQuery | undefined> {
        if(!this.client.connected)
            return undefined;

        const server = this.client.channelTree.server;
        if(!server) return undefined;
        if(!server.properties.virtualserver_hostbanner_gfx_url) return undefined;

        const timeout = server.properties.virtualserver_hostbanner_gfx_interval;
        const tag = Hostbanner.generate_tag(server.properties.virtualserver_hostbanner_gfx_url, server.properties.virtualserver_hostbanner_gfx_interval, server.properties.virtualserver_hostbanner_mode);
        if(timeout > 0)
            this.updater = setTimeout(() => this.update(), timeout * 1000);

        return tag;
    }
}
