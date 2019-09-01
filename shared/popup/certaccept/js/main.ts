
function tr(text: string) { return text; }

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "certificate accept tester",
    function: async () => {
        const certificate_accept = settings.static_global(Settings.KEY_CERTIFICATE_CALLBACK, undefined);
        const container_success = $("#container-success").hide();

        if(!certificate_accept) {
            loader.critical_error(tr("Missing certificate callback data"), tr("Please reconnect manually."));
            throw "missing data";
        }

        log.info(LogCategory.IPC, tr("Using this instance as certificate callback. ID: %s"), certificate_accept);
        try {
            await bipc.get_handler().post_certificate_accpected(certificate_accept);
            log.info(LogCategory.IPC, tr("Other instance has acknowledged out work. Closing this window."));

            let seconds = 5;
            let interval_id;
            interval_id = setInterval(() => {
                seconds--;
                $("#time-left").text(seconds.toString());

                if(seconds <= 0) {
                    clearTimeout(interval_id);
                    log.info(LogCategory.GENERAL, tr("Closing window"));
                    window.close();
                    return;
                }
            }, 1000);

            container_success.show();
        } catch(error) {
            log.warn(LogCategory.IPC, tr("Failed to successfully post certificate accept status: %o"), error);
            loader.critical_error(tr("Failed to emit success!"), tr("Please reconnect manually."));
        }
    },
    priority: 10
});