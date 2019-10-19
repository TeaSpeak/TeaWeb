namespace Modals {
    export function spawnSettingsModal(default_page?: string) : Modal {
        let modal: Modal;
        modal = createModal({
            header: tr("Settings"),
            body: () => {
                const tag = $("#tmpl_settings").renderTag().dividerfy();

                /* general "tab" mechanic */
                const left = tag.find("> .left");
                const right = tag.find("> .right");
                {
                    left.find(".entry:not(.group)").on('click', event => {
                        const entry = $(event.target);
                        right.find("> .container").addClass("hidden");
                        left.find(".selected").removeClass("selected");

                        const target = entry.attr("container");
                        if(!target) return;

                        right.find("> .container." + target).removeClass("hidden");
                        entry.addClass("selected");
                    })
                }

                /* initialize all tabs */

                /* enable one tab */
                {
                    left.find(".entry[container" + (default_page ? ("='" + default_page + "'") : "") + "]").first().trigger('click');
                }

                return tag;
            },
            footer: null
        });
        modal.htmlTag.find(".modal-body").addClass("modal-settings");

        settings_general_application(modal.htmlTag.find(".right .container.general-application"), modal);
        settings_general_language(modal.htmlTag.find(".right .container.general-language"), modal);
        settings_general_chat(modal.htmlTag.find(".right .container.general-chat"), modal);
        settings_audio_microphone(modal.htmlTag.find(".right .container.audio-microphone"), modal);
        settings_audio_speaker(modal.htmlTag.find(".right .container.audio-speaker"), modal);
        settings_audio_sounds(modal.htmlTag.find(".right .container.audio-sounds"), modal);
        const update_profiles = settings_identity_profiles(modal.htmlTag.find(".right .container.identity-profiles"), modal);
        settings_identity_forum(modal.htmlTag.find(".right .container.identity-forum"), modal, update_profiles as any);

        modal.open();
        return modal;
    }

    function settings_general_application(container: JQuery, modal: Modal) {
        /* hostbanner */
        {
            const option = container.find(".option-hostbanner-background") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_HOSTBANNER_BACKGROUND, option[0].checked);
                for(const sc of server_connections.server_connection_handlers())
                    sc.hostbanner.update();
            }).prop("checked", settings.static_global(Settings.KEY_HOSTBANNER_BACKGROUND));
        }

        /* font size */
        {
            const current_size = parseInt(getComputedStyle(document.body).fontSize); //settings.static_global(Settings.KEY_FONT_SIZE, 12);
            const select = container.find(".option-font-size");

            if(select.find("option[value='" + current_size + "']").length)
                select.find("option[value='" + current_size + "']").prop("selected", true);
            else
                select.find("option[value='-1']").prop("selected", true);

            select.on('change', event => {
                const value = parseInt(select.val() as string);
                settings.changeGlobal(Settings.KEY_FONT_SIZE, value);
                console.log("Changed font size to %dpx", value);

                $(document.body).css("font-size", value + "px");
            });
        }
    }

    function settings_general_language(container: JQuery, modal: Modal) {

        const container_entries = container.find(".container-list .entries");

        const tag_loading = container.find(".cover-loading");
        const template = $("#settings-translations-list-entry");

        const restart_hint = container.find(".restart-note").hide();

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
        const display_translation_info = (translation: i18n.RepositoryTranslation, repository: i18n.TranslationRepository) => {
            const info_modal = createModal({
                header: tr("Translation info"),
                body: () => {
                    const tag = $("#settings-translations-list-entry-info").renderTag({
                        type: "translation",
                        name: translation.name,
                        url: translation.path,
                        repository_name: repository.name,
                        contributors: translation.contributors || []
                    });

                    tag.find(".button-info").on('click', () => display_repository_info(repository));

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
        };

        const update_current_selected = () => {
            const container_current = container.find(".selected-language");
            container_current.empty().text(tr("Loading"));

            let current_translation: i18n.RepositoryTranslation;
            i18n.iterate_repositories(repository => {
                if(current_translation) return;
                for(const entry of repository.translations)
                    if(i18n.config.translation_config().current_translation_path == entry.path) {
                        current_translation = entry;
                        return;
                    }
            }).then(() => {
                container_current.empty();

                const language = current_translation ? current_translation.country_code : "gb";
                $.spawn("div").addClass("country flag-" + language.toLowerCase()).attr('title', i18n.country_name(language, tr("Unknown language"))).appendTo(container_current);
                $.spawn("a").text(current_translation ? current_translation.name : tr("English (Default)")).appendTo(container_current);
            }).catch(error => {
                /* This shall never happen */
            });
        };

        const initially_selected = i18n.config.translation_config().current_translation_url;
        const update_list = () => {
            container_entries.empty();

            const currently_selected = i18n.config.translation_config().current_translation_url;
            //Default translation
            {
                const tag = template.renderTag({
                    type: "default",
                    selected: !currently_selected || currently_selected == "default"
                });
                tag.on('click', () => {
                    i18n.select_translation(undefined, undefined);
                    container_entries.find(".selected").removeClass("selected");
                    tag.addClass("selected");

                    update_current_selected();
                    restart_hint.toggle(initially_selected !== i18n.config.translation_config().current_translation_url);
                });
                tag.appendTo(container_entries);
            }

            {
                tag_loading.show();
                i18n.iterate_repositories(repo => {
                    let repo_tag = container_entries.find("[repository=\"" + repo.unique_id + "\"]");
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

                        container_entries.append(repo_tag);
                    }

                    for(const translation of repo.translations) {
                        const tag = template.renderTag({
                            type: "translation",
                            name: translation.name || translation.path,
                            id: repo.unique_id,
                            country_code: translation.country_code,
                            selected:  i18n.config.translation_config().current_translation_path == translation.path
                        });
                        tag.find(".button-info").on('click', e => {
                            e.preventDefault();
                            display_translation_info(translation, repo);
                        });
                        tag.on('click', e => {
                            if (e.isDefaultPrevented()) return;
                            i18n.select_translation(repo, translation);
                            container_entries.find(".selected").removeClass("selected");
                            tag.addClass("selected");

                            update_current_selected();
                            restart_hint.toggle(initially_selected !== i18n.config.translation_config().current_translation_url);
                        });
                        tag.insertAfter(repo_tag);
                    }
                }).then(() => tag_loading.hide()).catch(error => {
                    console.error(error);
                    /* this should NEVER happen */
                })
            }

        };

        /* button add repository */
        {
            container.find(".button-add-repository").on('click', () => {
                createInputModal(tr("Enter repository URL"), tr("Enter repository URL:"), text => {
                    try {
                        new URL(text);
                        return true;
                    } catch(error) {
                        return false;
                    }
                }, url => {
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

        container.find(".button-restart").on('click', () => {
            if(app.is_web()) {
                location.reload();
            } else {
                createErrorModal(tr("Not implemented"), tr("Client restart isn't implemented.<br>Please do it manually!")).open();
            }
        });

        update_list();
        update_current_selected();
    }

    function settings_general_chat(container: JQuery, modal: Modal) {
        /* timestamp format */
        {
            const option_fixed = container.find(".option-fixed-timestamps") as JQuery<HTMLInputElement>;
            const option_colloquial = container.find(".option-colloquial-timestamps") as JQuery<HTMLInputElement>;

            option_colloquial.on('change', event => {
                settings.changeGlobal(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS, option_colloquial[0].checked);
            });

            option_fixed.on('change', event => {
                settings.changeGlobal(Settings.KEY_CHAT_FIXED_TIMESTAMPS, option_fixed[0].checked);
                option_colloquial
                    .prop("disabled", option_fixed[0].checked)
                    .parents("label").toggleClass("disabled", option_fixed[0].checked);
                if(option_fixed[0].checked) {
                    option_colloquial.prop("checked", false);
                } else {
                    option_colloquial.prop("checked", settings.static_global(Settings.KEY_CHAT_COLLOQUIAL_TIMESTAMPS));
                }
            }).prop("checked", settings.static_global(Settings.KEY_CHAT_FIXED_TIMESTAMPS)).trigger('change');
        }

        {
            const option = container.find(".option-instant-channel-switch") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_SWITCH_INSTANT_CHAT, option[0].checked);
            }).prop("checked", settings.static_global(Settings.KEY_SWITCH_INSTANT_CHAT));
        }
        {
            const option = container.find(".option-instant-client-switch") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_SWITCH_INSTANT_CLIENT, option[0].checked);
            }).prop("checked", settings.static_global(Settings.KEY_SWITCH_INSTANT_CLIENT));
        }
        {
            const option = container.find(".option-colored-emojies") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_CHAT_COLORED_EMOJIES, option[0].checked);
            }).prop("checked", settings.static_global(Settings.KEY_CHAT_COLORED_EMOJIES));
        }

        {
            const option = container.find(".option-support-markdown") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_CHAT_ENABLE_MARKDOWN, option[0].checked);
            }).prop("checked", settings.static_global(Settings.KEY_CHAT_ENABLE_MARKDOWN));
        }
        {
            const option = container.find(".option-url-tagging") as JQuery<HTMLInputElement>;
            option.on('change', event => {
                settings.changeGlobal(Settings.KEY_CHAT_TAG_URLS, option[0].checked);
            }).prop("checked", settings.static_global(Settings.KEY_CHAT_TAG_URLS));
        }
        /* Icon size */
        {
            const container_slider = container.find(".container-icon-size .container-slider");
            const container_value = container.find(".container-icon-size .value");

            sliderfy(container_slider, {
                unit: '%',
                min_value: 25,
                max_value: 300,
                step: 5,
                initial_value: settings.static_global(Settings.KEY_ICON_SIZE),
                value_field: container_value
            });

            container_slider.on('change', event => {
                const value = parseInt(container_slider.attr("value") as string);
                settings.changeGlobal(Settings.KEY_ICON_SIZE, value);
                console.log("Changed icon size to %sem", (value / 100).toFixed(2));

                MessageHelper.set_icon_size((value / 100).toFixed(2) + "em");
            });
        }
    }

    function settings_audio_microphone(container: JQuery, modal: Modal) {
        let _callbacks_filter_change: (() => any)[] = [];

        /* devices */
        {
            const container_devices = container.find(".container-devices");

            let level_meters: audio.recorder.LevelMeter[] = [];
            modal.close_listener.push(() => {
                for(const meter of level_meters)
                    meter.destory();
                level_meters = [];
            });
            const update_devices = () => {
                container_devices.children().remove();
                for(const meter of level_meters)
                    meter.destory();
                level_meters = [];

                const current_selected = default_recorder.current_device();
                const generate_device = (device: audio.recorder.InputDevice | undefined) => {
                    const selected = device === current_selected || (typeof(current_selected) !== "undefined" && typeof(device) !== "undefined" && current_selected.unique_id == device.unique_id);

                    let tag_volume: JQuery, tag_volume_error: JQuery;
                    const tag = $.spawn("div").addClass("device").toggleClass("selected", selected).append(
                        $.spawn("div").addClass("container-selected").append(
                            $.spawn("div").addClass("icon_em client-apply")
                        ),
                        $.spawn("div").addClass("container-name").append(
                            $.spawn("div").addClass("device-driver").text(
                                device ? (device.driver || "Unknown driver") : "No device"
                            ),
                            $.spawn("div").addClass("device-name").text(
                                device ? (device.name || "Unknown name") : "No device"
                            ),
                        ),
                        $.spawn("div").addClass("container-activity").append(
                            $.spawn("div").addClass("container-activity-bar").append(
                                tag_volume = $.spawn("div").addClass("bar-hider"),
                                tag_volume_error = $.spawn("div").addClass("bar-error")
                            )
                        )
                    );

                    tag.on('click', event => {
                        if(tag.hasClass("selected"))
                            return;

                        const _old = container_devices.find(".selected");
                        _old.removeClass("selected");
                        tag.addClass("selected");

                        default_recorder.set_device(device).then(() => {
                            console.debug(tr("Changed default microphone device"));
                            for(const cb of _callbacks_filter_change)
                                cb();
                        }).catch((error) => {
                            _old.addClass("selected");
                            tag.removeClass("selected");

                            console.error(tr("Failed to change microphone to device %o: %o"), device, error);
                            createErrorModal(tr("Failed to change microphone"), MessageHelper.formatMessage(tr("Failed to change the microphone to the target microphone{:br:}{}"), error)).open();
                        });
                    });

                    tag_volume.css('width', '100%');
                    if(device) {
                        audio.recorder.create_levelmeter(device).then(meter => {
                            level_meters.push(meter);
                            meter.set_observer(value => {
                                tag_volume.css('width', (100 - value) + '%');
                            });
                        }).catch(error => {
                            console.warn(tr("Failed to generate levelmeter for device %o: %o"), device, error);
                            tag_volume_error.attr('title', error).text(error);
                        });
                    }

                    return tag;
                };

                generate_device(undefined).appendTo(container_devices);
                audio.recorder.devices().forEach(e => generate_device(e).appendTo(container_devices));
            };
            update_devices();

            const button_update = container.find(".button-update");
            button_update.on('click', async event => {
                button_update.prop("disabled", true);
                if(audio.recorder.device_refresh_available()) {
                    try {
                        await audio.recorder.refresh_devices();
                    } catch(error) {
                        console.warn(tr("Failed to refresh input devices: %o"), error);
                    }
                }
                try {
                    update_devices();
                } catch(error) {
                    console.error(tr("Failed to build new device list: %o"), error);
                }
                button_update.prop("disabled", false);
            });
        }

        /* settings */
        {
            /* volume */
            {
                const container_volume = container.find(".container-volume");
                const slider = container_volume.find(".container-slider");
                sliderfy(slider, {
                    min_value: 0,
                    max_value: 100,
                    step: 1,
                    initial_value: default_recorder.get_volume()
                });
                slider.on('change', event => {
                    const value = parseInt(slider.attr("value"));
                    default_recorder.set_volume(value);
                });
            }

            /* vad select */
            {
                const container_select = container.find(".container-select-vad");
                container_select.find("input").on('change', event => {
                    if(!(<HTMLInputElement>event.target).checked)
                        return;

                    const mode = (<HTMLInputElement>event.target).value;
                    if(mode == "active")
                        default_recorder.set_vad_type("active");
                    else if(mode == "threshold")
                        default_recorder.set_vad_type("threshold");
                    else
                        default_recorder.set_vad_type("push_to_talk");

                    for(const cb of _callbacks_filter_change)
                        cb();
                });

                let elements = container_select.find('input[value="' + default_recorder.get_vad_type() + '"]');
                if(elements.length < 1)
                    elements = container_select.find('input[value]');
                elements.first().trigger('click');
            }

            /* Sensitivity */
            {
                const container_sensitivity = container.find(".container-sensitivity");

                const container_bar = container_sensitivity.find(".container-activity-bar");
                const bar_hider = container_bar.find(".bar-hider");

                sliderfy(container_bar, {
                    min_value: 0,
                    max_value: 100,
                    step: 1,
                    initial_value: default_recorder.get_vad_threshold()
                });
                container_bar.on('change', event => {
                    const threshold = parseInt(container_bar.attr("value"));
                    default_recorder.set_vad_threshold(threshold);
                });

                const _set_level = level => {
                    bar_hider.css("width", (100 - level) + "%");
                };

                let _last_filter: audio.recorder.filter.ThresholdFilter;
                modal.close_listener.push(() => {
                    if(_last_filter) {
                        _last_filter.callback_level = undefined;
                        _last_filter = undefined;
                    }
                });
                _callbacks_filter_change.push(() => {
                    container_sensitivity.toggleClass("disabled", default_recorder.get_vad_type() !== "threshold");

                    if(_last_filter) {
                        _last_filter.callback_level = undefined;
                        _last_filter = undefined;
                    }

                    if(default_recorder.get_vad_type() !== "threshold") {
                        container_sensitivity.addClass("disabled");
                        return;
                    }
                    container_sensitivity.removeClass("disabled");

                    _set_level(0);
                    if(!default_recorder.input)
                        return;

                    if(default_recorder.input.current_state() === audio.recorder.InputState.PAUSED)
                        default_recorder.input.start().then(result => {
                            if(result === audio.recorder.InputStartResult.EOK) {
                                for(const cb of _callbacks_filter_change)
                                    cb();
                            }
                        }); /* for us to show the VAD */

                    const filter = default_recorder.input.get_filter(audio.recorder.filter.Type.THRESHOLD) as audio.recorder.filter.ThresholdFilter;
                    if(!filter)
                        return;

                    _last_filter = filter;
                    filter.callback_level = _set_level;
                });
            }

            /* push to talk */
            {
                /* PPT Key */
                {
                    const button_key = container.find(".container-ppt button");
                    _callbacks_filter_change.push(() => {
                        button_key.prop('disabled', default_recorder.get_vad_type() !== "push_to_talk");
                    });

                    button_key.on('click', event => {
                        Modals.spawnKeySelect(key => {
                            if(!key)
                                return;
                            default_recorder.set_vad_ppt_key(key);
                            button_key.text(ppt.key_description(key));
                        });
                    });

                    button_key.text(ppt.key_description(default_recorder.get_vad_ppt_key()));
                }

                /* Delay */
                {
                    const container_delay = container.find(".container-ppt-delay");
                    const input_time = container_delay.find("input.delay-time");
                    const input_enabled = container_delay.find("input.delay-enabled");

                    input_enabled.on('change', event => {
                        const enabled = input_enabled.prop("checked");
                        if(enabled) {
                            if(default_recorder.get_vad_type() === "push_to_talk")
                                input_time.prop("disabled", false).parent().removeClass("disabled");
                            default_recorder.set_vad_ppt_delay(Math.abs(default_recorder.get_vad_ppt_delay()));
                        } else {
                            input_time.prop("disabled", true).parent().addClass("disabled");
                            default_recorder.set_vad_ppt_delay(-Math.abs(default_recorder.get_vad_ppt_delay()));
                        }
                    });

                    input_time.on('change', event => {
                        const value = parseFloat(input_time.val() as any);
                        default_recorder.set_vad_ppt_delay(value * 1000);
                    }).val(Math.abs(default_recorder.get_vad_ppt_delay() / 1000).toFixed(2));

                    input_enabled.prop("checked", default_recorder.get_vad_ppt_delay() >= 0);

                    _callbacks_filter_change.push(() => {
                        let enabled = default_recorder.get_vad_type() === "push_to_talk";
                        input_enabled.prop("disabled", !enabled).parent().toggleClass("disabled", !enabled);

                        enabled = enabled && input_enabled.prop("checked");
                        input_time.prop("disabled", !enabled).parent().toggleClass("disabled", !enabled);
                    });
                }

                //delay-time
            }
        }

        for(const cb of _callbacks_filter_change)
            cb();
    }

    function settings_audio_speaker(container: JQuery, modal: Modal) {
        /* devices */
        {
            const container_devices = container.find(".left .container-devices");
            const contianer_error = container.find(".left .container-error");

            const update_devices = () => {
                container_devices.children().remove();

                const current_selected = audio.player.current_device();
                const generate_device = (device: audio.player.Device | undefined) => {
                    const selected = device === current_selected || (typeof(current_selected) !== "undefined" && typeof(device) !== "undefined" && current_selected.device_id == device.device_id);

                    const tag = $.spawn("div").addClass("device").toggleClass("selected", selected).append(
                        $.spawn("div").addClass("container-selected").append(
                            $.spawn("div").addClass("icon_em client-apply")
                        ),
                        $.spawn("div").addClass("container-name").append(
                            $.spawn("div").addClass("device-driver").text(
                                device ? (device.driver || "Unknown driver") : "No device"
                            ),
                            $.spawn("div").addClass("device-name").text(
                                device ? (device.name || "Unknown name") : "No device"
                            )
                        )
                    );

                    tag.on('click', event => {
                        if(tag.hasClass("selected"))
                            return;

                        const _old = container_devices.find(".selected");
                        _old.removeClass("selected");
                        tag.addClass("selected");

                        audio.player.set_device(device ? device.device_id : null).then(() => {
                            console.debug(tr("Changed default speaker device"));
                        }).catch((error) => {
                            _old.addClass("selected");
                            tag.removeClass("selected");

                            console.error(tr("Failed to change speaker to device %o: %o"), device, error);
                            createErrorModal(tr("Failed to change speaker"), MessageHelper.formatMessage(tr("Failed to change the speaker device to the target speaker{:br:}{}"), error)).open();
                        });
                    });

                    return tag;
                };

                generate_device(undefined).appendTo(container_devices);
                audio.player.available_devices().then(result => {
                    contianer_error.text("").hide();
                    result.forEach(e => generate_device(e).appendTo(container_devices));
                }).catch(error => {
                    if(typeof(error) === "string")
                        contianer_error.text(error).show();

                    console.log(tr("Failed to query available speaker devices: %o"), error);
                    contianer_error.text(tr("Errors occurred (View console)")).show();
                });
            };
            update_devices();

            const button_update = container.find(".button-update");
            button_update.on('click', async event => {
                button_update.prop("disabled", true);
                try {
                    update_devices();
                } catch(error) {
                    console.error(tr("Failed to build new speaker device list: %o"), error);
                }
                button_update.prop("disabled", false);
            });
        }

        /* slider */
        {

            {
                const container_master = container.find(".container-volume-master");
                const slider = container_master.find(".container-slider");
                sliderfy(slider, {
                    min_value: 0,
                    max_value: 100,
                    step: 1,
                    initial_value: settings.static_global(Settings.KEY_SOUND_MASTER, 100),
                    value_field: [container_master.find(".container-value")]
                });
                slider.on('change', event => {
                    const volume = parseInt(slider.attr('value'));

                    if(audio.player.set_master_volume)
                        audio.player.set_master_volume(volume / 100);
                    settings.changeGlobal(Settings.KEY_SOUND_MASTER, volume);
                });
            }

            {
                const container_soundpack = container.find(".container-volume-soundpack");
                const slider = container_soundpack.find(".container-slider");
                sliderfy(slider, {
                    min_value: 0,
                    max_value: 100,
                    step: 1,
                    initial_value: settings.static_global(Settings.KEY_SOUND_MASTER_SOUNDS, 100),
                    value_field: [container_soundpack.find(".container-value")]
                });
                slider.on('change', event => {
                    const volume = parseInt(slider.attr('value'));
                    sound.set_master_volume(volume / 100);
                    settings.changeGlobal(Settings.KEY_SOUND_MASTER_SOUNDS, volume);
                });
            }
        }

        /* button test sound */
        {
            container.find(".button-test-sound").on('click', event => {
                sound.manager.play(Sound.SOUND_TEST, {
                    default_volume: 1,
                    ignore_muted: true,
                    ignore_overlap: true
                })
            });
        }
    }

    function settings_audio_sounds(contianer: JQuery, modal: Modal) {
        /* initialize sound list */
        {
            const container_sounds = contianer.find(".container-sounds");

            const generate_sound = (_sound: Sound) => {
                let tag_play_pause: JQuery, tag_play: JQuery, tag_pause: JQuery, tag_input_muted: JQuery;
                let tag = $.spawn("div").addClass("sound").append(
                    tag_play_pause = $.spawn("div").addClass("container-button-play_pause").append(
                        tag_play = $.spawn("img").attr("src", "img/icon_sound_play.svg"),
                        tag_pause = $.spawn("img").attr("src", "img/icon_sound_pause.svg")
                    ),
                    $.spawn("div").addClass("container-name").text(_sound),
                    $.spawn("label").addClass("container-button-toggle").append(
                        $.spawn("div").addClass("switch").append(
                            tag_input_muted = $.spawn("input").attr("type", "checkbox"),
                            $.spawn("span").addClass("slider").append(
                                $.spawn("div").addClass("dot")
                            )
                        )
                    )
                );

                tag_play_pause.on('click', event => {
                    if(tag_pause.is(":visible"))
                        return;
                    tag_play.hide();
                    tag_pause.show();

                    const _done = flag => {
                        tag_pause.hide();
                        tag_play.show();
                    };
                    const _timeout = setTimeout(() => _done(false), 10 * 1000); /* the sounds are not longer than 10 seconds */

                    sound.manager.play(_sound, {
                        ignore_overlap: true,
                        ignore_muted: true,
                        default_volume: 1,

                        callback: flag => {
                            clearTimeout(_timeout);
                            _done(flag);
                        }
                    });
                });
                tag_pause.hide();

                tag_input_muted.prop("checked", sound.get_sound_volume(_sound, 1) > 0);
                tag_input_muted.on('change', event => {
                    const volume = tag_input_muted.prop("checked") ? 1 : 0;
                    sound.set_sound_volume(_sound, volume);
                    console.log(tr("Changed sound volume to %o for sound %o"), volume, _sound);
                });

                return tag;
            };

            //container-sounds
            for(const sound_key in Sound)
                generate_sound(Sound[sound_key as any] as any).appendTo(container_sounds);

            /* the filter */
            const input_filter = contianer.find(".input-sounds-filter");
            input_filter.on('change keyup', event => {
                const filter = input_filter.val() as string;

                container_sounds.find(".sound").each((_, _element) => {
                    const element = $(_element);
                    element.toggle(filter.length == 0 || element.text().toLowerCase().indexOf(filter) !== -1);
                })
            });
        }

        const overlap_tag = contianer.find(".option-overlap-same");
        overlap_tag.on('change', event => {
            const activated = (<HTMLInputElement>event.target).checked;
            sound.set_overlap_activated(activated);
        }).prop("checked", sound.overlap_activated());

        const mute_tag = contianer.find(".option-mute-output");
        mute_tag.on('change', event => {
            const activated = (<HTMLInputElement>event.target).checked;
            sound.set_ignore_output_muted(!activated);
        }).prop("checked", !sound.ignore_output_muted());

        modal.close_listener.push(sound.save);
    }

    type SelectedIdentity = {
        identity: profiles.ConnectionProfile;

        update_name(text?: string);
        update_valid_flag();
        update_type();

        update_avatar();
    }
    function settings_identity_profiles(container: JQuery, modal: Modal) {
        let selected_profile: SelectedIdentity;
        let selected_profile_changed: (() => void)[] = [];
        let profile_identity_changed: (() => void)[] = [];

        let update_profiles: (selected_id: string) => void;

        /* profile list */
        {
            const container_profiles = container.find(".container-profiles");

            const build_profile = (profile: profiles.ConnectionProfile, selected: boolean) => {
                let tag_name: JQuery, tag_default: JQuery, tag_valid: JQuery, tag_type: JQuery, tag_avatar: JQuery;
                let tag = $.spawn("div").addClass("profile").append(
                    tag_avatar = $.spawn("div").addClass("container-avatar"),
                    $.spawn("div").addClass("container-info").append(
                        $.spawn("div").addClass("container-type").append(
                            tag_type = $.spawn("div").text(profile.selected_identity_type || tr("Type unset")),
                            tag_default = $.spawn("div").addClass("tag-default").text(tr("(Default)")),
                            tag_valid = $.spawn("div").addClass("icon_em icon-status")
                                .toggleClass("client-apply", profile.valid())
                                .toggleClass("client-delete", !profile.valid())
                        ),
                        tag_name = $.spawn("div").addClass("profile-name").text(profile.profile_name || tr("Unnamed"))
                    )
                );
                tag_avatar.hide(); /* no avatars yet */

                tag_default.toggle(profile.id === "default");
                tag.on('click', event => {
                    if(tag.hasClass('selected'))
                        return;
                    container_profiles.find(".selected").removeClass("selected");
                    tag.addClass("selected");

                    /* reset profile name if may in change */
                    if(selected_profile)
                        selected_profile.update_name();

                    selected_profile = {
                        identity: profile,
                        update_name(text) {
                            tag_name.text(typeof(text) === "string" ? text : (profile.profile_name || tr("Unnamed")))
                        },
                        update_type() {
                            tag_type.text(profile.selected_identity_type || tr("Type unset"));
                        },
                        update_valid_flag() {
                            tag_valid
                                .toggleClass("client-apply", profile.valid())
                                .toggleClass("client-delete", !profile.valid())
                        },
                        update_avatar() {
                            //TODO HERE!
                        }
                    };

                    for(const listener of selected_profile_changed)
                        listener();
                });

                if(selected)
                    tag.trigger('click');

                return tag;
            };

            update_profiles = (selected_id) => {
                selected_id = selected_id || "default";
                container_profiles.children().remove();
                profiles.profiles().forEach(e => build_profile(e, e.id == selected_id).appendTo(container_profiles));

            };

        }

        /* profile general info */
        {
            const input_name = container.find(".right input.profile-name");
            const input_default_name = container.find(".right input.profile-default-name");
            const select_type = container.find(".right select.profile-identity-type");

            selected_profile_changed.push(() => {
                //profile-identity-type
                if(!selected_profile.identity) {
                    input_name.val(tr("No profile selected")).prop("disabled", true);
                    input_default_name.val("").prop("disabled", true);
                    select_type.val("unset").prop("disabled", true);
                    select_type.parent().toggleClass("is-invalid", true);
                } else {
                    input_name.val(selected_profile.identity.profile_name).prop("disabled", false);
                    input_default_name
                        .val(selected_profile.identity.default_username)
                        .attr("placeholder", selected_profile.identity.connect_username() || "Another TeaSpeak user")
                        .prop("disabled", false);
                    select_type.val(selected_profile.identity.selected_identity_type || "unset").prop("disabled", false);
                }

                for(const listener of profile_identity_changed)
                    listener();
            });

            input_name.on('keyup', event => {
                const text = input_name.val() as string;
                const profile = profiles.find_profile_by_name(text);
                input_name.parent().toggleClass("is-invalid", text.length < 3 || (profile && profile != selected_profile.identity));
                selected_profile.update_name(text);
            }).on('change', event => {
                const text = input_name.val() as string;
                const profile = profiles.find_profile_by_name(text);
                if(text.length < 3 || (profile && profile != selected_profile.identity)) return;
                selected_profile.identity.profile_name = text;
                profiles.mark_need_save();
            });

            input_default_name.on('change', event => {
                selected_profile.identity.default_username = input_default_name.val() as string;
                profiles.mark_need_save();
            });

            select_type.on('change', event => {
                selected_profile.identity.selected_identity_type = (select_type.val() as string).toLowerCase();
                profiles.mark_need_save();

                selected_profile.update_type();
                for(const listener of profile_identity_changed)
                    listener();
                selected_profile.update_valid_flag();
            });

            profile_identity_changed.push(() => {
                select_type.parent()
                    .toggleClass("is-invalid", typeof(profiles.identities.IdentitifyType[selected_profile.identity.selected_identity_type.toUpperCase()]) === "undefined");
            });
        }

        /* profile special info */
        {
            /* teamspeak */
            {
                const container_settings = container.find(".container-teamspeak");
                const container_valid = container_settings.find(".container-valid");
                const container_invalid = container_settings.find(".container-invalid");

                const input_current_level = container_settings.find(".current-level");
                const input_unique_id = container_settings.find(".unique-id");

                const button_new = container_settings.find(".button-new");
                const button_improve = container_settings.find(".button-improve");

                const button_import = container_settings.find(".button-import");
                const button_export = container_settings.find(".button-export");

                button_improve.on('click', event => {
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    if (!profile) return;

                    Modals.spawnTeamSpeakIdentityImprove(profile, selected_profile.identity.profile_name).close_listener.push(() => {
                        profiles.mark_need_save();
                        for(const listener of profile_identity_changed)
                            listener();
                    });
                });

                button_new.on('click', event => {
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    const generate_identity = () => {
                        profiles.identities.TeaSpeakIdentity.generate_new().then(identity => {
                            selected_profile.identity.set_identity(profiles.identities.IdentitifyType.TEAMSPEAK, identity);
                            createInfoModal(tr("Identity generated"), tr("A new identity had been successfully generated")).open();

                            profiles.mark_need_save();
                            for(const listener of profile_identity_changed)
                                listener();
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

                button_import.on('click', event => {
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;

                    const set_identity = (identity: profiles.identities.TeaSpeakIdentity) => {
                        selected_profile.identity.set_identity(profiles.identities.IdentitifyType.TEAMSPEAK, identity);
                        createInfoModal(tr("Identity imported"), tr("Your identity has been successfully imported!")).open();

                        profiles.mark_need_save();
                        for(const listener of profile_identity_changed)
                            listener();
                    };

                    if (profile && profile.valid()) {
                        spawnYesNo(tr("Are you sure"), tr("Do you really want to import a new identity and override the old identity?"), result => {
                            if (result)
                                spawnTeamSpeakIdentityImport(set_identity);
                        });
                    } else {
                        spawnTeamSpeakIdentityImport(set_identity);
                    }
                });

                button_export.on('click', event => {
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    if(!profile) return;

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
                                element.remove();
                            }).catch(error => {
                                console.error(error);
                                createErrorModal(tr("Failed to export identity"), tr("Failed to export and save identity.<br>Error: ") + error).open();
                            });
                        }
                    }).open();
                });

                profile_identity_changed.push(() => {
                    const enabled = selected_profile && selected_profile.identity.selected_identity_type === "teamspeak";
                    container_settings.toggle(enabled);
                    if(!enabled) return;

                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAMSPEAK) as profiles.identities.TeaSpeakIdentity;
                    button_improve.prop("disabled", !profile);
                    button_export.toggle(!!profile);

                    button_import.toggleClass("btn-danger", !!profile).toggleClass("btn-success", !profile);
                    button_new.toggleClass("btn-danger", !!profile).toggleClass("btn-success", !profile);

                    container_invalid.toggle(!profile);
                    container_valid.toggle(!!profile);
                    if (!profile) {
                        input_current_level.val("no profile");
                        input_unique_id.val("no profile");
                    } else {
                        input_current_level.val("loading....");
                        profile.level().then(level => input_current_level.val(level + ""));
                        input_unique_id.val(profile.uid());
                    }

                    selected_profile.update_valid_flag();
                });
            }

            /* teaspeak forum */
            {
                const container_settings = container.find(".container-teaforo");
                const continer_valid = container_settings.find(".container-valid");
                const continer_invalid = container_settings.find(".container-invalid");

                const button_setup = container_settings.find(".button-setup");

                profile_identity_changed.push(() => {
                    container_settings.toggle(selected_profile && selected_profile.identity.selected_identity_type === "teaforo");
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.TEAFORO) as profiles.identities.TeaForumIdentity;
                    const valid = profile && profile.valid();

                    continer_valid.toggle(valid);
                    continer_invalid.toggle(!valid);
                });

                button_setup.on('click', event => {
                    modal.htmlTag.find('.entry[container="identity-forum"]').trigger('click');
                });
            }

            /* nickname */
            {
                const container_settings = container.find(".container-nickname");
                const input_nickname = container_settings.find(".nickname");

                profile_identity_changed.push(() => {
                    const active = selected_profile && selected_profile.identity.selected_identity_type === "nickname";
                    container_settings.toggle(active);
                    if(!active) return;

                    let profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.NICKNAME) as profiles.identities.NameIdentity;
                    if(!profile)
                        selected_profile.identity.set_identity(profiles.identities.IdentitifyType.NICKNAME, profile = new profiles.identities.NameIdentity());
                    input_nickname.val(profile.name()).trigger('change');
                });

                input_nickname.on('keydown', event => {
                    const profile = selected_profile.identity.selected_identity(profiles.identities.IdentitifyType.NICKNAME) as profiles.identities.NameIdentity;
                    if(!profile)
                        return;

                    profile.set_name(input_nickname.val() as string);
                    profiles.mark_need_save();

                    selected_profile.update_valid_flag();
                    input_nickname.parent().toggleClass('is-invalid', !profile.valid());
                });
            }
        }

        /* change avatar button */
        {
            container.find(".button-change-avatar").hide();
        }

        /* create new button */
        {
            container.find(".button-create").on('click', event => {
                createInputModal(tr("Please enter a name"), tr("Please enter a name for the new profile:"), text => text.length >= 3 && !profiles.find_profile_by_name(text), value => {
                    if (value) {
                        const profile = profiles.create_new_profile(value as string);
                        update_profiles(profile.id);
                        profiles.mark_need_save();
                    }
                }).open();
            });
        }

        /* set as default button */
        {
            const button = container.find(".button-set-default");
            button.on('click', event => {
                profiles.set_default_profile(selected_profile.identity);
                profiles.mark_need_save();
                update_profiles(selected_profile.identity.id);
            });

            selected_profile_changed.push(() => {
                button.prop("disabled", !selected_profile || selected_profile.identity.id === "default");
            });
        }

        /* delete button */
        {
            const button = container.find(".button-delete");
            button.on('click', event => {
                if (selected_profile && selected_profile.identity.id != 'default') {
                    spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this profile?"), result => {
                        if (result) {
                            profiles.delete_profile(selected_profile.identity);
                            profiles.mark_need_save();
                            update_profiles(undefined);
                        }
                    });
                }
            });

            selected_profile_changed.push(() => {
                button.prop("disabled", !selected_profile || selected_profile.identity.id === "default");
            });
        }

        update_profiles(undefined);

        modal.close_listener.push(() => {
            if(profiles.requires_save())
                profiles.save();
        });

        return update_profiles;
    }

    function settings_identity_forum(container: JQuery, modal: Modal, update_profiles: () => any) {
        const containers_connected = container.find(".show-connected");
        const containers_disconnected = container.find(".show-disconnected");

        const update_state = () => {
            const logged_in = forum.logged_in();
            containers_connected.toggle(logged_in);
            containers_disconnected.toggle(!logged_in);

            if(logged_in) {
                container.find(".forum-username").text(forum.data().name());
                container.find(".forum-premium").text(forum.data().is_premium() ? tr("Yes") : tr("No"));
            }
        };

        /* login */
        {
            const button_login = container.find(".button-login");
            const input_username = container.find(".input-username");
            const input_password = container.find(".input-password");
            const container_error = container.find(".container-login .container-error");

            const container_captcha_g = container.find(".g-recaptcha");
            let captcha: boolean | string = false;

            const update_button_state = () => {
                let enabled = true;
                enabled = enabled && !!input_password.val();
                enabled = enabled && !!input_username.val();
                enabled = enabled && (typeof(captcha) === "boolean" ? !captcha : !!captcha);
                button_login.prop("disabled", !enabled);
            };

            /* username */
            input_username.on('change keyup', update_button_state);

            /* password */
            input_password.on('change keyup', update_button_state);

            button_login.on('click', event => {
                input_username.prop("disabled", true);
                input_password.prop("disabled", true);
                button_login.prop("disabled", true);
                container_error.removeClass("shown");

                forum.login(input_username.val() as string, input_password.val() as string, typeof(captcha) === "string" ? captcha : undefined).then(state => {
                    captcha = false;

                    console.debug(tr("Forum login result: %o"), state);
                    if(state.status === "success") {
                        update_state();
                        update_profiles();
                        return;
                    }

                    setTimeout(() => {
                        if(!!state.error_message) /* clear password if we have an error */
                            input_password.val("");
                        input_password.focus();
                        update_button_state();
                    }, 0);
                    if(state.status === "captcha") {
                        //TODO Works currently only with localhost!
                        button_login.hide();
                        container_error.text(state.error_message || tr("Captcha required")).addClass("shown");

                        captcha = "";

                        console.log(tr("Showing captcha for site-key: %o"), state.captcha.data);
                        forum.gcaptcha.spawn(container_captcha_g, state.captcha.data, token => {
                            captcha = token;
                            console.debug(tr("Got captcha token: %o"), token);
                            container_captcha_g.hide();
                            button_login.show();
                            update_button_state();
                        }).catch(error => {
                            console.error(tr("Failed to initialize forum captcha: %o"), error);
                            container_error.text("Failed to initialize GReCaptcha! No authentication possible.").addClass("shown");
                            container_captcha_g.hide();
                            button_login.hide();
                        });
                        container_captcha_g.show();
                    } else {
                        container_error.text(state.error_message || tr("Unknown error")).addClass("shown");
                    }
                }).catch(error => {
                    console.error(tr("Failed to login within the forum. Error: %o"), error);
                    createErrorModal(tr("Forum login failed."), tr("Forum login failed. Lookup the console for more information")).open();
                }).then(() => {
                    input_username.prop("disabled", false);
                    input_password.prop("disabled", false);
                    update_button_state();
                });
            });
            update_button_state();
        }

        /* logout */
        {
            container.find(".button-logout").on('click', event => {
                forum.logout().catch(error => {
                    console.error(tr("Failed to logout from forum: %o"), error);
                    createErrorModal(tr("Forum logout failed"), MessageHelper.formatMessage(tr("Failed to logout from forum account.{:br:}Error: {}"), error)).open();
                }).then(() => {
                    if (modal.shown)
                        update_state();
                    update_profiles();
                });
            });
        }

        update_state();
    }
}