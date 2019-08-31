
function tr(text: string) { return text; }

const task_certificate_callback: loader.Task = {
    name: "certificate accept tester",
    function: async () => {
        Settings.initialize();

        const certificate_accept = settings.static_global(Settings.KEY_CERTIFICATE_CALLBACK, undefined);
        if(!certificate_accept) {
            loader.critical_error("Missing certificate callback data");
            throw "missing data";
        }

        log.info(LogCategory.IPC, tr("Using this instance as certificate callback. ID: %s"), certificate_accept);
        try {
            try {
                await bipc.get_handler().post_certificate_accpected(certificate_accept);
            } catch(e) {} //FIXME remove!
            log.info(LogCategory.IPC, tr("Other instance has acknowledged out work. Closing this window."));

            const seconds_tag = $.spawn("a");

            let seconds = 5;
            let interval_id;
            interval_id = setInterval(() => {
                seconds--;
                seconds_tag.text(seconds.toString());

                if(seconds <= 0) {
                    clearTimeout(interval_id);
                    log.info(LogCategory.GENERAL, tr("Closing window"));
                    window.close();
                    return;
                }
            }, 1000);

            const message =
                "You've successfully accepted the certificate.{:br:}" +
                "This page will close in {0} seconds.";
            /*
            createInfoModal(
                tr("Certificate acccepted successfully"),
                MessageHelper.formatMessage(tr(message), seconds_tag),
                {
                    closeable: false,
                    footer: undefined
                }
            ).open();
             */
            //TODO!
            return;
        } catch(error) {
            log.warn(LogCategory.IPC, tr("Failed to successfully post certificate accept status: %o"), error);
            //TODO!
        }
    },
    priority: 10
};