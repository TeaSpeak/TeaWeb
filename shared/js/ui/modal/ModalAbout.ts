export namespace Modals {
    function format_date(date: number) {
        const d = new Date(date);

        return ('00' + d.getDay()).substr(-2) + "." + ('00' + d.getMonth()).substr(-2) + "." + d.getFullYear() + " - " + ('00' + d.getHours()).substr(-2) + ":" + ('00' + d.getMinutes()).substr(-2);
    }

    export function spawnAbout() {
        const app_version = (() => {
            const version_node = document.getElementById("app_version");
            if(!version_node) return undefined;

            const version = version_node.hasAttribute("value") ? version_node.getAttribute("value") : undefined;
            if(!version) return undefined;

            if(version == "unknown" || version.replace(/0+/, "").length == 0)
                return undefined;

            return version;
        })();

        const connectModal = createModal({
            header: tr("About"),
            body: () => {
                let tag = $("#tmpl_about").renderTag({
                    client: !app.is_web(),

                    version_client: app.is_web() ? app_version || "in-dev" : "loading...",
                    version_ui: app_version || "in-dev",

                    version_timestamp: !!app_version ? format_date(Date.now()) : "--"
                });
                return tag;
            },
            footer: null,

            width: "60em"
        });
        connectModal.htmlTag.find(".modal-body").addClass("modal-about");
        connectModal.open();

        if(!app.is_web()) {
            (window as any).native.client_version().then(version => {
                connectModal.htmlTag.find(".version-client").text(version);
            }).catch(error => {
                log.error(LogCategory.GENERAL, tr("Failed to load client version: %o"), error);
                connectModal.htmlTag.find(".version-client").text("unknown");
            });
        }
    }
}