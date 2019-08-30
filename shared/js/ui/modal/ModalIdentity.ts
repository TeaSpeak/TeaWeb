namespace Modals {
    export function spawnTeamSpeakIdentityImprove(identity: profiles.identities.TeaSpeakIdentity, name: string): Modal {
        let modal: Modal;
        let elapsed_timer: NodeJS.Timer;

        modal = createModal({
            header: tr("Improve identity"),
            body: () => {
                let template = $("#tmpl_settings-teamspeak_improve").renderTag({
                    identity_name: name
                });
                template = $.spawn("div").append(template);

                let active;
                const button_start_stop = template.find(".button-start-stop");
                const button_close = template.find(".button-close");
                const input_current_level = template.find(".identity-level input");
                const input_target_level = template.find(".identity-target-level input");
                const input_threads = template.find(".threads input");
                const input_hash_rate = template.find(".hash-rate input");
                const input_elapsed = template.find(".time-elapsed input");

                button_close.on('click', event => {
                    if (active)
                        button_start_stop.trigger('click');

                    if (modal.shown)
                        modal.close();
                });

                button_start_stop.on('click', event => {
                    button_start_stop
                        .toggleClass('btn-success', active)
                        .toggleClass('btn-danger', !active)
                        .text(active ? tr("Start") : tr("Stop"));

                    input_threads.prop("disabled", !active);
                    input_target_level.prop("disabled", !active);
                    if (active) {
                        input_hash_rate.val(0);
                        clearInterval(elapsed_timer);
                        active = false;
                        return;
                    }
                    active = true;
                    input_hash_rate.val("nan");

                    const threads = parseInt(input_threads.val() as string);
                    const target_level = parseInt(input_target_level.val() as string);
                    if (target_level == 0) {
                        identity.improve_level(-1, threads, () => active, current_level => {
                            input_current_level.val(current_level);
                        }, hash_rate => {
                            input_hash_rate.val(hash_rate);
                        }).catch(error => {
                            console.error(error);
                            createErrorModal(tr("Failed to improve identity"), tr("Failed to improve identity.<br>Error:") + error).open();
                            if (active)
                                button_start_stop.trigger('click');
                        });
                    } else {
                        identity.improve_level(target_level, threads, () => active, current_level => {
                            input_current_level.val(current_level);
                        }, hash_rate => {
                            input_hash_rate.val(hash_rate);
                        }).then(success => {
                            if (success) {
                                identity.level().then(level => {
                                    input_current_level.val(level);
                                    createInfoModal(tr("Identity successfully improved"), MessageHelper.formatMessage(tr("Identity successfully improved to level {}"), level)).open();
                                }).catch(error => {
                                    input_current_level.val("error: " + error);
                                });
                            }
                            if (active)
                                button_start_stop.trigger('click');
                        }).catch(error => {
                            console.error(error);
                            createErrorModal(tr("Failed to improve identity"), tr("Failed to improve identity.<br>Error:") + error).open();
                            if (active)
                                button_start_stop.trigger('click');
                        });
                    }

                    const begin = Date.now();
                    elapsed_timer = setInterval(() => {
                        const time = (Date.now() - begin) / 1000;
                        let seconds = Math.floor(time % 60).toString();
                        let minutes = Math.floor(time / 60).toString();

                        if (seconds.length < 2)
                            seconds = "0" + seconds;

                        if (minutes.length < 2)
                            minutes = "0" + minutes;

                        input_elapsed.val(minutes + ":" + seconds);
                    }, 1000);
                });


                template.find(".identity-unique-id input").val(identity.uid());
                identity.level().then(level => {
                    input_current_level.val(level);
                }).catch(error => {
                    input_current_level.val("error: " + error);
                });
                tooltip(template);
                return template.children();
            },
            footer: undefined,
            width: 750
        });

        modal.htmlTag.find(".modal-body").addClass("modal-identity-improve modal-green");
        modal.close_listener.push(() => modal.htmlTag.find(".button-close").trigger('click'));
        modal.open();
        return modal;
    }

    export function spawnTeamSpeakIdentityImport(callback: (identity: profiles.identities.TeaSpeakIdentity) => any): Modal {
        let modal: Modal;
        let selected_type: string;
        let identities: {[key: string]: profiles.identities.TeaSpeakIdentity} = {};

        modal = createModal({
            header: tr("Import identity"),
            body: () => {
                let template = $("#tmpl_settings-teamspeak_import").renderTag();

                const button_import = template.find(".button-import");
                const button_file_select = template.find(".button-load-file");

                const container_status = template.find(".container-status");
                const input_text = template.find(".input-identity-text");
                const input_file = template.find(".file-selector");

                const set_status = (message: string | undefined, type: "error" | "loading" | "success") => {
                    container_status.toggleClass("hidden", !message);
                    if(message) {
                        container_status.toggleClass("error", type === "error");
                        container_status.toggleClass("loading", type === "loading");
                        container_status.find("a").text(message);
                    }
                };

                button_file_select.on('click', event => input_file.trigger('click'));

                template.find("input[name='type']").on('change', event => {
                    const type = (event.target as HTMLInputElement).value;

                    button_file_select.prop("disabled", type !== "file");
                    input_text.prop("disabled", type !== "text");

                    selected_type = type;
                    button_import.prop("disabled", !identities[type]);
                });
                template.find("input[name='type'][value='file']").prop("checked", true).trigger("change");

                const import_identity = (data: string, ini: boolean) => {
                    set_status(tr("Parsing identity"), "loading");
                    profiles.identities.TeaSpeakIdentity.import_ts(data, ini).then(identity => {
                        identities[selected_type] = identity;
                        set_status("Identity parsed successfully.", "success");
                        button_import.prop("disabled", false);
                        template.find(".success").show();
                    }).catch(error => {
                        set_status(tr("Failed to parse identity: ") + error, "error");
                    });
                };

                 /* file select button */
                input_file.on('change', event => {
                    const element = event.target as HTMLInputElement;
                    const file_reader = new FileReader();

                    set_status(tr("Loading file"), "loading");
                    file_reader.onload = function () {
                        import_identity(file_reader.result as string, true);
                    };

                    file_reader.onerror = ev => {
                        console.error(tr("Failed to read give identity file: %o"), ev);
                        set_status(tr("Failed to read the identity file."), "error");
                        return;
                    };

                    if (element.files && element.files.length > 0)
                        file_reader.readAsText(element.files[0]);
                });

                input_text.on('change keyup', event => {
                    const text = input_text.val() as string;
                    if(!text) {
                        set_status("", "success");
                        return;
                    }

                    if(text.indexOf('V') == -1) {
                        set_status(tr("Invalid identity string"), "error");
                        return;
                    }

                    import_identity(text, false);
                });

                button_import.on('click', event => {
                    modal.close();
                    callback(identities[selected_type]);
                });

                set_status("", "success");
                button_import.prop("disabled", true);
                return template.children();
            },
            footer: undefined,
            width: 750
        });

        modal.htmlTag.find(".modal-body").addClass("modal-identity-import modal-green");
        modal.open();
        return modal;
    }
}