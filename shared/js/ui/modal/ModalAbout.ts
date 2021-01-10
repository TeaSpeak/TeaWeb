import {createModal} from "../../ui/elements/Modal";
import {LogCategory, logError} from "../../log";
import {tr} from "tc-shared/i18n/localize";

function format_date(date: number) {
    const d = new Date(date);

    return ('00' + d.getDay()).substr(-2) + "." + ('00' + d.getMonth()).substr(-2) + "." + d.getFullYear() + " - " + ('00' + d.getHours()).substr(-2) + ":" + ('00' + d.getMinutes()).substr(-2);
}

export function spawnAbout() {
    const connectModal = createModal({
        header: tr("About"),
        body: () => {
            let tag = $("#tmpl_about").renderTag({
                client: __build.target !== "web",

                version_client: __build.target === "web" ? __build.version || "in-dev" : "loading...",
                version_ui: __build.version || "in-dev",

                version_timestamp: format_date(__build.timestamp)
            });
            return tag;
        },
        footer: null,

        width: "60em"
    });
    connectModal.htmlTag.find(".modal-body").addClass("modal-about");
    connectModal.open();

    if (__build.target !== "web") {
        (window as any).native.client_version().then(version => {
            connectModal.htmlTag.find(".version-client").text(version);
        }).catch(error => {
            logError(LogCategory.GENERAL, tr("Failed to load client version: %o"), error);
            connectModal.htmlTag.find(".version-client").text("unknown");
        });
    }
}