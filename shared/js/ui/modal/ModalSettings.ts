/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../voice/VoiceClient.ts" />
/// <reference path="../../profiles/Identity.ts" />

namespace Modals {
    function spawnTeamSpeakIdentityImprove(identity: profiles.identities.TeaSpeakIdentity): Modal {
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

    function spawnTeamSpeakIdentityImport(callback: (identity: profiles.identities.TeaSpeakIdentity) => any): Modal {
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

    export function spawnSettingsModal(): Modal {
        let modal: Modal;
        modal = createModal({
            header: tr("Settings"),
            body: () => {
                let template = $("#tmpl_settings").renderTag({
                    client: native_client,
                    valid_forum_identity: profiles.identities.valid_static_forum_identity(),
                    forum_path: settings.static("forum_path"),
                    voice_available: !settings.static_global(Settings.KEY_DISABLE_VOICE, false)
                });

                initialiseVoiceListeners(modal, (template = template.tabify()).find(".settings_audio"));
                initialise_translations(template.find(".settings-translations"));
                initialise_profiles(modal, template.find(".settings-profiles"));
                initialise_global(modal, template.find(".settings-general"));

                return template;
            },
            footer: undefined,
            width: 750
        });
        modal.open();
        return modal;
    }

    function initialise_global(modal: Modal, tag: JQuery) {
        console.log(tag);
        {/* setup the forum */
            const identity = profiles.identities.static_forum_identity();
            if (identity && identity.valid()) {
                tag.find(".not-connected").hide();

                tag.find(".property.username .value").text(identity.name());
                const premium_tag = tag.find(".property.premium .value").text("");
                if (identity.is_stuff() || identity.is_premium())
                    premium_tag.append($.spawn("div").addClass("premium").text(tr("yes")));
                else
                    premium_tag.append($.spawn("div").addClass("non-premium").text(tr("no")));
            } else {
                tag.find(".connected").hide();
            }

            tag.find(".button-logout").on('click', event => {
                if(native_client) {
                    modal.close(); /* we cant update the modal so we close it */
                    forum.logout();
                } else {
                    window.location.href = settings.static("forum_path") + "auth.php?type=logout";
                }
            });
            tag.find(".button-login").on('click', event => {
                if(native_client) {
                    modal.close(); /* we cant update the modal so we close it */
                    forum.open();
                } else {
                    window.location.href = settings.static("forum_path") + "login.php";
                }

            });
        }
    }


    let vad_mapping = {
        "threshold": "vad",
        "push_to_talk": "ppt",
        "active": "pt"
    };

    function initialiseVoiceListeners(modal: Modal, tag: JQuery) {
        let currentVAD = vad_mapping[default_recorder.get_vad_type()] || "vad";

        const display_error = (message: string) => {
            const alert = tag.find(".settings-device-error").first();
            alert.clone()
                .alert()
                .css("display", "block")
                .insertAfter(alert)
                .find(".message")
                .text(message);
        };

        if (!settings.static_global(Settings.KEY_DISABLE_VOICE, false)) {
            { //Initialized voice activation detection
                const vad_tag = tag.find(".settings-vad-container");

                vad_tag.find('input[type=radio]').on('change', event => {
                    const select = event.currentTarget as HTMLSelectElement;
                    {
                        vad_tag.find(".settings-vad-impl-entry").hide();
                        vad_tag.find(".setting-vad-" + select.value).show();
                    }

                    switch (select.value) {
                        case "ppt":
                            default_recorder.set_vad_type("push_to_talk");

                            vad_tag.find(".vat_ppt_key").text(ppt.key_description(default_recorder.get_vad_ppt_key()));
                            vad_tag.find(".ppt-delay input").val(default_recorder.get_vad_ppt_delay());

                            break;
                        case "vad":
                            default_recorder.set_vad_type("threshold");

                            let slider = vad_tag.find(".vad_vad_slider");
                            slider.val(default_recorder.get_vad_threshold());
                            slider.trigger("change");

                            const filter = default_recorder.input.get_filter(audio.recorder.filter.Type.THRESHOLD) as audio.recorder.filter.ThresholdFilter;
                            filter.callback_level = level => vad_tag.find(".vad_vad_bar_filler").css("width", (100 - level) + "%");
                            break;

                        case "pt":
                            default_recorder.set_vad_type("active");
                            break;
                    }
                });

                { //Initialized push to talk
                    vad_tag.find(".vat_ppt_key").click(function () {
                        let modal = createModal({
                            body: "",
                            header: () => {
                                let head = $.spawn("div");
                                head.text(tr("Type the key you wish"));
                                head.css("background-color", "blue");
                                return head;
                            },
                            footer: ""
                        });

                        let listener = (event: ppt.KeyEvent) => {
                            if (event.type == ppt.EventType.KEY_TYPED) {
                                settings.changeGlobal('vad_ppt_key', undefined); //TODO remove that because its legacy shit
                                console.log(tr("Got key %o"), event);

                                default_recorder.set_vad_ppt_key(event);

                                ppt.unregister_key_listener(listener);
                                modal.close();
                                vad_tag.find(".vat_ppt_key").text(ppt.key_description(event));
                            }
                        };
                        ppt.register_key_listener(listener);
                        modal.open();
                    });

                    vad_tag.find(".ppt-delay input").on('change', event => {
                        default_recorder.set_vad_ppt_delay((<HTMLInputElement>event.target).valueAsNumber);
                    });
                }

                { //Initialized voice activation detection
                    let slider = vad_tag.find(".vad_vad_slider");
                    slider.on("input change", () => {
                        settings.changeGlobal("vad_threshold", slider.val().toString());
                        default_recorder.set_vad_threshold(slider.val() as number);
                        vad_tag.find(".vad_vad_slider_value").text(slider.val().toString());
                    });
                    modal.properties.registerCloseListener(() => {
                        const filter = default_recorder.input.get_filter(audio.recorder.filter.Type.THRESHOLD) as audio.recorder.filter.ThresholdFilter;
                        filter.callback_level = undefined;
                    });
                }

                let target_tag = vad_tag.find('input[type=radio][name="vad_type"][value="' + currentVAD + '"]');
                if (target_tag.length == 0) {
                    //TODO tr
                    console.warn("Failed to find tag for " + currentVAD + ". Using latest tag!");
                    target_tag = vad_tag.find('input[type=radio][name="vad_type"]').last();
                }
                target_tag.prop("checked", true);
                setTimeout(() => target_tag.trigger('change'), 0);
            }

            { //Initialize microphone

                const setting_tag = tag.find(".settings-microphone");
                const tag_select = setting_tag.find(".audio-select-microphone");

                const update_devices = () => { //List devices
                    tag_select.empty();

                    $.spawn("option")
                        .attr("device-id", "")
                        .text(tr("No device"))
                        .appendTo(tag_select);

                    const active_device = default_recorder.current_device();
                    audio.recorder.devices().forEach(device => {
                        console.debug(tr("Got device %o"), device);

                        $.spawn("option")
                            .attr("device-id", device.unique_id)
                            .text(device.name)
                            .prop("selected", active_device && device.unique_id == active_device.unique_id)
                            .appendTo(tag_select);
                    });
                    if (tag_select.find("option:selected").length == 0)
                        tag_select.find("option").prop("selected", true);

                };

                {
                    tag_select.on('change', event => {
                        let selected_tag = tag_select.find("option:selected");
                        let deviceId = selected_tag.attr("device-id");
                        console.log(tr("Selected microphone device: id: %o"), deviceId);
                        const device = audio.recorder.devices().find(e => e.unique_id === deviceId);
                        if(!device)
                            console.warn(tr("Failed to find device!"));

                        default_recorder.set_device(device);
                    });
                }

                update_devices();
                setting_tag.find(".button-device-update").on('click', event => update_devices());
            }
        }

        { //Initialize speaker
            const setting_tag = tag.find(".settings-speaker");
            const tag_select = setting_tag.find(".audio-select-speaker");

            const update_devices = () => {
                tag_select.empty();

                const active_device = audio.player.current_device();
                audio.player.available_devices().then(devices => {
                    for (const device of devices) {
                        $.spawn("option")
                            .attr("device-id", device.device_id)
                            .text(device.name)
                            .prop("selected", device.device_id == active_device.device_id)
                            .appendTo(tag_select);
                    }
                }).catch(error => {
                    console.error(tr("Could not enumerate over devices!"));
                    console.error(error);
                    display_error(tr("Could not get speaker device list!"));
                });


                if (tag_select.find("option:selected").length == 0)
                    tag_select.find("option").prop("selected", true);
            };

            {
                tag_select.on('change', event => {
                    let selected_tag = tag_select.find("option:selected");
                    let deviceId = selected_tag.attr("device-id");
                    console.log(tr("Selected speaker device: id: %o"), deviceId);
                    audio.player.set_device(deviceId).catch(error => {
                        console.error(error);
                        display_error(tr("Failed to change device!"));
                    });
                });
            }

            update_devices();
            setting_tag.find(".button-device-update").on('click', event => update_devices());

            { /* master sound volume */
                const master_tag = setting_tag.find(".master-volume");
                master_tag.find("input").on('change input', event => {
                    const value = parseInt((<HTMLInputElement>event.target).value);
                    master_tag.find('a').text("(" + value + "%)");

                    if(audio.player.set_master_volume)
                        audio.player.set_master_volume(value / 100);
                    settings.changeGlobal(Settings.KEY_SOUND_MASTER, value);
                }).val((audio.player.get_master_volume ? audio.player.get_master_volume() * 100 : 100).toString()).trigger('change');
            }
        }

        { /* initialize sounds */
            const sound_tag = tag.find(".sound-settings");

            { /* master sound volume */
                const master_tag = sound_tag.find(".sound-master-volume");
                master_tag.find("input").on('change input', event => {
                    const value = parseInt((<HTMLInputElement>event.target).value);
                    master_tag.find('a').text("(" + value + "%)");

                    sound.set_master_volume(value / 100);
                    settings.changeGlobal(Settings.KEY_SOUND_MASTER_SOUNDS, value);
                }).val((sound.get_master_volume() * 100).toString()).trigger('change');
            }

            {
                const overlap_tag = sound_tag.find(".overlap-sounds input");
                overlap_tag.on('change', event => {
                    const activated = (<HTMLInputElement>event.target).checked;
                    sound.set_overlap_activated(activated);
                }).prop("checked", sound.overlap_activated());
            }

            {
                const muted_tag = sound_tag.find(".muted-sounds input");
                muted_tag.on('change', event => {
                    const activated = (<HTMLInputElement>event.target).checked;
                    sound.set_ignore_output_muted(!activated);
                }).prop("checked", !sound.ignore_output_muted());
            }

            { /* sound elements */
                const template_tag = $("#tmpl_settings-sound_entry");
                const entry_tag = sound_tag.find(".sound-list-entries");

                for (const _sound in Sound) {
                    const sound_name = Sound[_sound];

                    console.log(sound.get_sound_volume(sound_name as Sound));
                    const data = {
                        name: sound_name,
                        activated: sound.get_sound_volume(sound_name as Sound) > 0
                    };

                    const entry = template_tag.renderTag(data);
                    entry.find("input").on('change', event => {
                        const activated = (<HTMLInputElement>event.target).checked;
                        console.log(tr("Sound %s had changed to %o"), sound_name, activated);
                        sound.set_sound_volume(sound_name as Sound, activated ? 1 : 0);
                    });

                    entry.find(".button-playback").on('click', event => {
                        sound.manager.play(sound_name as Sound);
                    });

                    entry_tag.append(entry);
                }

                setTimeout(() => {
                    const entry_container = sound_tag.find(".sound-list-entries-container");
                    if (entry_container.hasScrollBar())
                        entry_container.addClass("scrollbar");
                }, 100);

                /* filter */
                const filter_tag = sound_tag.find(".sound-list-filter input");
                filter_tag.on('change keyup', event => {
                    const filter = ((<HTMLInputElement>event.target).value || "").toLowerCase();
                    if (!filter)
                        entry_tag.find(".entry").show();
                    else {
                        entry_tag.find(".entry").each((_, _entry) => {
                            const entry = $(_entry);
                            if (entry.text().toLowerCase().indexOf(filter) == -1)
                                entry.hide();
                            else
                                entry.show();
                        });
                    }
                });
            }

            modal.close_listener.push(sound.save);
        }
    }

    function initialise_translations(tag: JQuery) {
        { //Initialize the list
            const tag_list = tag.find(".setting-list .list");
            const tag_loading = tag.find(".setting-list .loading");
            const template = $("#settings-translations-list-entry");
            const restart_hint = tag.find(".setting-list .restart-note");
            restart_hint.hide();

            const update_list = () => {
                tag_list.empty();

                const currently_selected = i18n.config.translation_config().current_translation_url;
                { //Default translation
                    const tag = template.renderTag({
                        type: "default",
                        selected: !currently_selected || currently_selected == "default"
                    });
                    tag.on('click', () => {
                        i18n.select_translation(undefined, undefined);
                        tag_list.find(".selected").removeClass("selected");
                        tag.addClass("selected");

                        restart_hint.show();
                    });
                    tag.appendTo(tag_list);
                }

                {
                    const display_repository_info = (repository: i18n.TranslationRepository) => {
                        const info_modal = createModal({
                            header: tr("Repository info"),
                            body: () => {
                                return $("#settings-translations-list-entry-info").renderTag({
                                    type: "repository",
                                    name: repository.name,
                                    url: repository.url,
                                    contact: repository.contact,
                                    translations: repository.translations || []
                                });
                            },
                            footer: () => {
                                let footer = $.spawn("div");
                                footer.addClass("modal-button-group");
                                footer.css("margin-top", "5px");
                                footer.css("margin-bottom", "5px");
                                footer.css("text-align", "right");

                                let buttonOk = $.spawn("button");
                                buttonOk.text(tr("Close"));
                                buttonOk.click(() => info_modal.close());
                                footer.append(buttonOk);

                                return footer;
                            }
                        });
                        info_modal.open()
                    };

                    tag_loading.show();
                    i18n.iterate_repositories(repo => {
                        let repo_tag = tag_list.find("[repository=\"" + repo.unique_id + "\"]");
                        if (repo_tag.length == 0) {
                            repo_tag = template.renderTag({
                                type: "repository",
                                name: repo.name || repo.url,
                                id: repo.unique_id
                            });

                            repo_tag.find(".button-delete").on('click', e => {
                                e.preventDefault();

                                Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this repository?"), answer => {
                                    if (answer) {
                                        i18n.delete_repository(repo);
                                        update_list();
                                    }
                                });
                            });
                            repo_tag.find(".button-info").on('click', e => {
                                e.preventDefault();

                                display_repository_info(repo);
                            });

                            tag_list.append(repo_tag);
                        }

                        for(const translation of repo.translations) {
                            const tag = template.renderTag({
                                type: "translation",
                                name: translation.name || translation.path,
                                id: repo.unique_id,
                                country_code: translation.country_code,
                                selected: i18n.config.translation_config().current_translation_path == translation.path
                            });
                            tag.find(".button-info").on('click', e => {
                                e.preventDefault();

                                const info_modal = createModal({
                                    header: tr("Translation info"),
                                    body: () => {
                                        const tag = $("#settings-translations-list-entry-info").renderTag({
                                            type: "translation",
                                            name: translation.name,
                                            url: translation.path,
                                            repository_name: repo.name,
                                            contributors: translation.contributors || []
                                        });

                                        tag.find(".button-info").on('click', () => display_repository_info(repo));

                                        return tag;
                                    },
                                    footer: () => {
                                        let footer = $.spawn("div");
                                        footer.addClass("modal-button-group");
                                        footer.css("margin-top", "5px");
                                        footer.css("margin-bottom", "5px");
                                        footer.css("text-align", "right");

                                        let buttonOk = $.spawn("button");
                                        buttonOk.text(tr("Close"));
                                        buttonOk.click(() => info_modal.close());
                                        footer.append(buttonOk);

                                        return footer;
                                    }
                                });
                                info_modal.open()
                            });
                            tag.on('click', e => {
                                if (e.isDefaultPrevented()) return;
                                i18n.select_translation(repo, translation);
                                tag_list.find(".selected").removeClass("selected");
                                tag.addClass("selected");

                                restart_hint.show();
                            });
                            tag.insertAfter(repo_tag);
                        }
                    }).then(() => tag_loading.hide()).catch(error => {
                        console.error(error);
                        /* this should NEVER happen */
                    })
                }

            };

            {
                tag.find(".button-add-repository").on('click', () => {
                    createInputModal("Enter URL", tr("Enter repository URL:<br>"), text => true, url => { //FIXME test valid url
                        if (!url) return;

                        tag_loading.show();
                        i18n.load_repository(url as string).then(repository => {
                            i18n.register_repository(repository);
                            update_list();
                        }).catch(error => {
                            tag_loading.hide();
                            createErrorModal("Failed to load repository", tr("Failed to query repository.<br>Ensure that this repository is valid and reachable.<br>Error: ") + error).open();
                        })
                    }).open();
                });
            }

            restart_hint.find(".button-reload").on('click', () => {
                location.reload();
            });

            update_list();
        }
    }

    function initialise_profiles(modal: Modal, tag: JQuery) {
        const settings_tag = tag.find(".profile-settings");
        let selected_profile: profiles.ConnectionProfile;
        let nickname_listener: () => any;
        let status_listener: () => any;

        const display_settings = (profile: profiles.ConnectionProfile) => {
            selected_profile = profile;

            settings_tag.find(".setting-name").val(profile.profile_name);
            settings_tag.find(".setting-default-nickname").val(profile.default_username);
            settings_tag.find(".setting-default-password").val(profile.default_password);

            {
                //change listener
                const select_tag = settings_tag.find(".select-container select")[0] as HTMLSelectElement;
                const type = profile.selected_identity_type.toLowerCase();

                select_tag.onchange = () => {
                    console.log("Selected: " + select_tag.value);
                    settings_tag.find(".identity-settings.active").removeClass("active");
                    settings_tag.find(".identity-settings-" + select_tag.value).addClass("active");

                    profile.selected_identity_type = select_tag.value.toLowerCase();
                    const selected_type = profile.selected_type();
                    const identity = profile.selected_identity();

                    profiles.mark_need_save();

                    let tag: JQuery;
                    if (selected_type == profiles.identities.IdentitifyType.TEAFORO) {
                        const forum_tag = tag = settings_tag.find(".identity-settings-teaforo");

                        forum_tag.find(".connected, .disconnected").hide();
                        if (identity && identity.valid()) {
                            forum_tag.find(".connected").show();
                        } else {
                            forum_tag.find(".disconnected").show();
                        }
                    } else if (selected_type == profiles.identities.IdentitifyType.TEAMSPEAK) {
                        console.log("Set: " + identity);
                        const teamspeak_tag = tag = settings_tag.find(".identity-settings-teamspeak");
                        teamspeak_tag.find(".identity_string").val("");
                        if (identity)
                            (identity as profiles.identities.TeaSpeakIdentity).export_ts().then(e => teamspeak_tag.find(".identity_string").val(e));
                    } else if (selected_type == profiles.identities.IdentitifyType.NICKNAME) {
                        const name_tag = tag = settings_tag.find(".identity-settings-nickname");
                        if (identity)
                            name_tag.find("input").val(identity.name());
                        else
                            name_tag.find("input").val("");
                    }

                    if (tag)
                        tag.trigger('show');
                };

                select_tag.value = type;
                select_tag.onchange(undefined);
            }
        };

        const update_profile_list = () => {
            const profile_list = tag.find(".profile-list .list").empty();
            const profile_template = $("#settings-profile-list-entry");
            for (const profile of profiles.profiles()) {
                const list_tag = profile_template.renderTag({
                    profile_name: profile.profile_name,
                    id: profile.id
                });

                const profile_status_update = () => {
                    list_tag.find(".status").hide();
                    if (profile.valid())
                        list_tag.find(".status-valid").show();
                    else
                        list_tag.find(".status-invalid").show();
                };
                list_tag.on('click', event => {
                    /* update ui */
                    profile_list.find(".selected").removeClass("selected");
                    list_tag.addClass("selected");

                    if (profile == selected_profile) return;
                    nickname_listener = () => list_tag.find(".name").text(profile.profile_name);
                    status_listener = profile_status_update;

                    display_settings(profile);
                });


                profile_list.append(list_tag);
                if ((!selected_profile && profile.id == "default") || selected_profile == profile)
                    setTimeout(() => list_tag.trigger('click'), 1);
                profile_status_update();
            }
        };

        const display_error = (error?: string) => {
            if (error) {
                settings_tag.find(".settings-profile-error").show().find(".message").html(error);
            } else
                settings_tag.find(".settings-profile-error").hide();
            status_listener();
        };

        /* identity settings */
        {
            { //TeamSpeak change listener
                const teamspeak_tag = settings_tag.find(".identity-settings-teamspeak");
                const identity_info_tag = teamspeak_tag.find(".identity-info");
                const button_export = teamspeak_tag.find(".button-export");
                const button_import = teamspeak_tag.find(".button-import");
                const button_generate = teamspeak_tag.find(".button-generate");
                const button_improve = teamspeak_tag.find(".button-improve");

                button_import.on('click', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;

                    const set_identity = (identity: profiles.identities.TeaSpeakIdentity) => {
                        selected_profile.set_identity(profiles.identities.IdentitifyType.TEAMSPEAK, identity);
                        teamspeak_tag.trigger('show');
                        createInfoModal(tr("Identity imported"), tr("Your identity has been successfully imported!")).open();
                    };

                    if (profile && profile.valid()) {
                        spawnYesNo(tr("Are you sure"), tr("Do you really want to import a new identity and override the old identity?"), result => {
                            if (result)
                                spawnTeamSpeakIdentityImport(set_identity);
                        });
                    } else
                        spawnTeamSpeakIdentityImport(set_identity);
                });
                button_export.on('click', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    if (!profile) return;

                    createInputModal(tr("File name"), tr("Please enter the file name"), text => !!text, name => {
                        if (name) {
                            profile.export_ts(true).then(data => {
                                const element = $.spawn("a")
                                    .text("donwload")
                                    .attr("href", "data:test/plain;charset=utf-8," + encodeURIComponent(data))
                                    .attr("download", name + ".ini")
                                    .css("display", "none")
                                    .appendTo($("body"));
                                element[0].click();
                                element.detach();
                            }).catch(error => {
                                console.error(error);
                                createErrorModal(tr("Failed to export identity"), tr("Failed to export and save identity.<br>Error: ") + error).open();
                            });
                        }
                    }).open();
                });

                button_generate.on('click', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    const generate_identity = () => {
                        profiles.identities.TeaSpeakIdentity.generate_new().then(identity => {
                            selected_profile.set_identity(profiles.identities.IdentitifyType.TEAMSPEAK, identity);
                            teamspeak_tag.trigger('show');
                            createInfoModal(tr("Identity generate"), tr("A new identity had been successfully generated")).open();
                        }).catch(error => {
                            console.error(tr("Failed to generate a new identity. Error object: %o"), error);
                            createErrorModal(tr("Failed to generate identity"), tr("Failed to generate a new identity.<br>Error:") + error).open();
                        });
                    };

                    if (profile && profile.valid()) {
                        spawnYesNo(tr("Are you sure"), tr("Do you really want to generate a new identity and override the old identity?"), result => {
                            if (result)
                                generate_identity();
                        });
                    } else
                        generate_identity();
                });

                button_improve.on('click', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    if (!profile) return;

                    spawnTeamSpeakIdentityImprove(profile).close_listener.push(() => teamspeak_tag.trigger('show'));
                });

                /* updates the data */
                teamspeak_tag.on('show', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;

                    if (!profile || !profile.valid()) {
                        identity_info_tag.hide();
                        teamspeak_tag.find(".identity-undefined").show();
                        button_export.prop("disabled", true);
                    } else {
                        identity_info_tag.show();
                        teamspeak_tag.find(".identity-undefined").hide();
                        button_export.prop("disabled", false);

                        identity_info_tag.find(".unique-id input").val(profile.uid());
                        const input_level = identity_info_tag.find(".level input").val("loading...");
                        profile.level().then(level => input_level.val(level.toString())).catch(error => input_level.val("error: " + error));
                    }
                    display_error();
                });
            }

            { //The
                const teaforo_tag = settings_tag.find(".identity-settings-teaforo");
                if (native_client) {
                    teaforo_tag.find(".native-teaforo-login").on('click', event => {
                        setTimeout(() => {
                            const call = () => {
                                if (modal.shown) {
                                    display_settings(selected_profile);
                                    status_listener();
                                }
                            };
                            forum.register_callback(call);
                            forum.open();
                        }, 0);
                    });
                }

                teaforo_tag.on('show', event => {
                    display_error();
                    /* clear error */
                });
            }

            { //The name
                const name_tag = settings_tag.find(".identity-settings-nickname");
                name_tag.find(".setting-name").on('change keyup', event => {
                    const name = name_tag.find(".setting-name").val() as string;
                    selected_profile.set_identity(profiles.identities.IdentitifyType.NICKNAME, new profiles.identities.NameIdentity(name));
                    profiles.mark_need_save();

                    if (name.length < 3) {
                        display_error("Name must be at least 3 characters long!");
                        return;
                    }
                    display_error();
                });

                name_tag.on('show', event => {
                    const profile = selected_profile.selected_identity(profiles.identities.IdentitifyType.NICKNAME);
                    if (!profile)
                        display_error("invalid profile");
                    else if (!profile.valid())
                        display_error("Name must be at least 3 characters long!");
                    else
                        display_error();
                });
            }
        }

        /* general settings */
        {
            settings_tag.find(".setting-name").on('change', event => {
                const value = settings_tag.find(".setting-name").val() as string;
                if (value && selected_profile) {
                    selected_profile.profile_name = value;
                    if (nickname_listener)
                        nickname_listener();
                    profiles.mark_need_save();
                    status_listener();
                }
            });
            settings_tag.find(".setting-default-nickname").on('change', event => {
                const value = settings_tag.find(".setting-default-nickname").val() as string;
                if (value && selected_profile) {
                    selected_profile.default_username = value;
                    profiles.mark_need_save();
                    status_listener();
                }
            });
            settings_tag.find(".setting-default-password").on('change', event => {
                const value = settings_tag.find(".setting-default-password").val() as string;
                if (value && selected_profile) {
                    selected_profile.default_username = value;
                    profiles.mark_need_save();
                    status_listener();
                }
            });
        }

        /* general buttons */
        {
            tag.find(".button-add-profile").on('click', event => {
                createInputModal(tr("Please enter a name"), tr("Please enter a name for the new profile:<br>"), text => text.length > 0 && !profiles.find_profile_by_name(text), value => {
                    if (value) {
                        display_settings(profiles.create_new_profile(value as string));
                        update_profile_list();
                        profiles.mark_need_save();
                    }
                }).open();
            });

            tag.find(".button-set-default").on('click', event => {
                if (selected_profile && selected_profile.id != 'default') {
                    profiles.set_default_profile(selected_profile);
                    update_profile_list();
                    profiles.mark_need_save();
                }
            });

            tag.find(".button-delete").on('click', event => {
                if (selected_profile && selected_profile.id != 'default') {
                    event.preventDefault();
                    spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this profile?"), result => {
                        if (result) {
                            profiles.delete_profile(selected_profile);
                            update_profile_list();
                        }
                    });
                }
            });
        }

        modal.close_listener.push(() => {
            if (profiles.requires_save())
                profiles.save();
        });
        update_profile_list();
    }
}