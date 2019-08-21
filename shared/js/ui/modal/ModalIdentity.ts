namespace Modals {
    export function spawnTeamSpeakIdentityImprove(identity: profiles.identities.TeaSpeakIdentity): Modal {
        let modal: Modal;
        let elapsed_timer: NodeJS.Timer;

        modal = createModal({
            header: tr("Improve identity"),
            body: () => {
                let template = $("#tmpl_settings-teamspeak_improve").renderTag();
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
                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.close_listener.push(() => modal.htmlTag.find(".button-close").trigger('click'));
        modal.open();
        return modal;
    }

    export function spawnTeamSpeakIdentityImport(callback: (identity: profiles.identities.TeaSpeakIdentity) => any): Modal {
        let modal: Modal;
        let loaded_identity: profiles.identities.TeaSpeakIdentity;

        modal = createModal({
            header: tr("Import identity"),
            body: () => {
                let template = $("#tmpl_settings-teamspeak_import").renderTag();
                template = $.spawn("div").append(template);

                template.find(".button-load-file").on('click', event => template.find(".input-file").trigger('click'));

                const button_import = template.find(".button-import");
                const set_error = message => {
                    template.find(".success").hide();
                    if (message) {
                        template.find(".error").text(message).show();
                        button_import.prop("disabled", true);
                    } else
                        template.find(".error").hide();
                };

                const import_identity = (data: string, ini: boolean) => {
                    profiles.identities.TeaSpeakIdentity.import_ts(data, ini).then(identity => {
                        loaded_identity = identity;
                        set_error("");
                        button_import.prop("disabled", false);
                        template.find(".success").show();
                    }).catch(error => {
                        set_error("Failed to load identity: " + error);
                    });
                };

                { /* file select button */
                    template.find(".input-file").on('change', event => {
                        const element = event.target as HTMLInputElement;
                        const file_reader = new FileReader();

                        file_reader.onload = function () {
                            import_identity(file_reader.result as string, true);
                        };

                        file_reader.onerror = ev => {
                            console.error(tr("Failed to read give identity file: %o"), ev);
                            set_error(tr("Failed to read file!"));
                            return;
                        };

                        if (element.files && element.files.length > 0)
                            file_reader.readAsText(element.files[0]);
                    });
                }

                { /* text input */
                    template.find(".button-load-text").on('click', event => {
                        createInputModal("Import identity from text", "Please paste your idenity bellow<br>", text => text.length > 0 && text.indexOf('V') != -1, result => {
                            if (result)
                                import_identity(result as string, false);
                        }).open();
                    });
                }

                button_import.on('click', event => {
                    modal.close();
                    callback(loaded_identity);
                });

                set_error("");
                button_import.prop("disabled", true);
                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.open();
        return modal;
    }
}