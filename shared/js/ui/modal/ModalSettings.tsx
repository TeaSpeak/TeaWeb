import {createErrorModal, createInfoModal, createInputModal, createModal, Modal} from "tc-shared/ui/elements/Modal";
import {sliderfy} from "tc-shared/ui/elements/Slider";
import {settings, Settings} from "tc-shared/settings";
import * as sound from "tc-shared/sound/Sounds";
import {manager, set_master_volume, Sound} from "tc-shared/sound/Sounds";
import * as profiles from "tc-shared/profiles/ConnectionProfile";
import {ConnectionProfile} from "tc-shared/profiles/ConnectionProfile";
import {IdentitifyType} from "tc-shared/profiles/Identity";
import {TeaForumIdentity} from "tc-shared/profiles/identities/TeaForumIdentity";
import {TeaSpeakIdentity} from "tc-shared/profiles/identities/TeamSpeakIdentity";
import {NameIdentity} from "tc-shared/profiles/identities/NameIdentity";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import * as i18n from "tc-shared/i18n/localize";
import {RepositoryTranslation, TranslationRepository} from "tc-shared/i18n/localize";
import * as events from "tc-shared/events";
import {Registry} from "tc-shared/events";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import * as i18nc from "tc-shared/i18n/country";
import {server_connections} from "tc-shared/ui/frames/connection_handlers";
import * as forum from "tc-shared/profiles/identities/teaspeak-forum";
import {formatMessage, set_icon_size} from "tc-shared/ui/frames/chat";
import {spawnTeamSpeakIdentityImport, spawnTeamSpeakIdentityImprove} from "tc-shared/ui/modal/ModalIdentity";
import {Device} from "tc-shared/audio/player";
import * as aplayer from "tc-backend/audio/player";
import {KeyMapSettings} from "tc-shared/ui/modal/settings/Keymap";
import * as React from "react";
import * as ReactDOM from "react-dom";
import {NotificationSettings} from "tc-shared/ui/modal/settings/Notifications";
import {initialize_audio_microphone_controller, MicrophoneSettingsEvents} from "tc-shared/ui/modal/settings/Microphone";
import {MicrophoneSettings} from "tc-shared/ui/modal/settings/MicrophoneRenderer";

export function spawnSettingsModal(default_page?: string): Modal {
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
                    if (!target) return;

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
    settings_general_keymap(modal.htmlTag.find(".right .container.general-keymap"), modal);
    settings_general_notifications(modal.htmlTag.find(".right .container.general-notifications"), modal);
    settings_audio_microphone(modal.htmlTag.find(".right .container.audio-microphone"), modal);
    settings_audio_speaker(modal.htmlTag.find(".right .container.audio-speaker"), modal);
    settings_audio_sounds(modal.htmlTag.find(".right .container.audio-sounds"), modal);
    const update_profiles = settings_identity_profiles(modal.htmlTag.find(".right .container.identity-profiles"), modal);
    settings_identity_forum(modal.htmlTag.find(".right .container.identity-forum"), modal, update_profiles as any);

    modal.close_listener.push(() => {
        if (profiles.requires_save())
            profiles.save();
    });

    modal.open();
    return modal;
}

function settings_general_application(container: JQuery, modal: Modal) {
    /* hostbanner */
    {
        const option = container.find(".option-hostbanner-background") as JQuery<HTMLInputElement>;
        option.on('change', event => {
            settings.changeGlobal(Settings.KEY_HOSTBANNER_BACKGROUND, option[0].checked);
            for (const sc of server_connections.all_connections())
                sc.hostbanner.update();
        }).prop("checked", settings.static_global(Settings.KEY_HOSTBANNER_BACKGROUND));
    }

    /* font size */
    {
        const current_size = parseInt(getComputedStyle(document.body).fontSize); //settings.static_global(Settings.KEY_FONT_SIZE, 12);
        const select = container.find(".option-font-size");

        if (select.find("option[value='" + current_size + "']").length)
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

    /* all permissions */
    {
        const option = container.find(".option-all-permissions") as JQuery<HTMLInputElement>;
        option.on('change', event => {
            settings.changeGlobal(Settings.KEY_HOSTBANNER_BACKGROUND, option[0].checked);
        }).prop("checked", settings.global(Settings.KEY_PERMISSIONS_SHOW_ALL));
    }
}

function settings_general_language(container: JQuery, modal: Modal) {

    const container_entries = container.find(".container-list .entries");

    const tag_loading = container.find(".cover-loading");
    const template = $("#settings-translations-list-entry");

    const restart_hint = container.find(".restart-note").hide();

    const display_repository_info = (repository: TranslationRepository) => {
        const info_modal = createModal({
            header: tr("Repository info"),
            body: () => {
                return $("#settings-translations-list-entry-info").renderTag({
                    type: "repository",
                    name: repository.name,
                    url: repository.url,
                    contact: repository.contact,
                    translations: repository.translations || [],
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
    const display_translation_info = (translation: RepositoryTranslation, repository: TranslationRepository) => {
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

        let current_translation: RepositoryTranslation;
        i18n.iterate_repositories(repository => {
            if (current_translation) return;
            for (const entry of repository.translations)
                if (i18n.config.translation_config().current_translation_path == entry.path) {
                    current_translation = entry;
                    return;
                }
        }).then(() => {
            container_current.empty();

            const language = current_translation ? current_translation.country_code : "gb";
            $.spawn("div").addClass("country flag-" + language.toLowerCase()).attr('title', i18nc.country_name(language, tr("Unknown language"))).appendTo(container_current);
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
                selected: !currently_selected || currently_selected == "default",
                fallback_country_name: i18nc.country_name('gb'),
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

                        spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this repository?"), answer => {
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

                for (const translation of repo.translations) {
                    const tag = template.renderTag({
                        type: "translation",
                        name: translation.name || translation.path,
                        id: repo.unique_id,
                        country_code: translation.country_code,
                        selected: i18n.config.translation_config().current_translation_path == translation.path,
                        fallback_country_name: i18nc.country_name('gb'),
                        country_name: i18nc.country_name((translation.country_code || "XX").toLowerCase()),
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
                } catch (error) {
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
        if (__build.target === "web") {
            location.reload();
        } else {
            createErrorModal(tr("Not implemented"), tr("Client restart isn't implemented.<br>Please do it manually!")).open();
        }
    });

    update_list();
    update_current_selected();
}

function settings_general_keymap(container: JQuery, modal: Modal) {
    const entry = <KeyMapSettings/>;
    ReactDOM.render(entry, container[0]);
    modal.close_listener.push(() => ReactDOM.unmountComponentAtNode(container[0]));
}

function settings_general_notifications(container: JQuery, modal: Modal) {
    const entry = <NotificationSettings/>;
    ReactDOM.render(entry, container[0]);
    modal.close_listener.push(() => ReactDOM.unmountComponentAtNode(container[0]));
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
            if (option_fixed[0].checked) {
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
        const option = container.find(".option-support-bbcode") as JQuery<HTMLInputElement>;
        option.on('change', event => {
            settings.changeGlobal(Settings.KEY_CHAT_ENABLE_BBCODE, option[0].checked);
        }).prop("checked", settings.static_global(Settings.KEY_CHAT_ENABLE_BBCODE));
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

            set_icon_size((value / 100).toFixed(2) + "em");
        });
    }
}

function settings_audio_microphone(container: JQuery, modal: Modal) {
    const registry = new Registry<MicrophoneSettingsEvents>();
    initialize_audio_microphone_controller(registry);

    const entry = <MicrophoneSettings events={registry}/>;
    ReactDOM.render(entry, container[0]);
    modal.close_listener.push(() => {
        ReactDOM.unmountComponentAtNode(container[0]);
        registry.fire("notify_destroy");
    });

    return;
}

function settings_identity_profiles(container: JQuery, modal: Modal) {
    const registry = new Registry<events.modal.settings.profiles>();
    //registry.enable_debug("settings-identity");
    modal_settings.initialize_identity_profiles_controller(registry);
    modal_settings.initialize_identity_profiles_view(container, registry, {
        forum_setuppable: true
    });

    registry.on("setup-forum-connection", event => {
        modal.htmlTag.find('.entry[container="identity-forum"]').trigger('click');
    });
    return () => registry.fire("reload-profile");
}

function settings_audio_speaker(container: JQuery, modal: Modal) {
    /* devices */
    {
        const container_devices = container.find(".left .container-devices");
        const contianer_error = container.find(".left .container-error");

        const update_devices = () => {
            container_devices.children().remove();

            const current_selected = aplayer.current_device();
            const generate_device = (device: Device | undefined) => {
                const selected = device === current_selected || (typeof (current_selected) !== "undefined" && typeof (device) !== "undefined" && current_selected.device_id == device.device_id);

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
                    if (tag.hasClass("selected"))
                        return;

                    const _old = container_devices.find(".selected");
                    _old.removeClass("selected");
                    tag.addClass("selected");

                    aplayer.set_device(device ? device.device_id : null).then(() => {
                        console.debug(tr("Changed default speaker device"));
                    }).catch((error) => {
                        _old.addClass("selected");
                        tag.removeClass("selected");

                        console.error(tr("Failed to change speaker to device %o: %o"), device, error);
                        createErrorModal(tr("Failed to change speaker"), formatMessage(tr("Failed to change the speaker device to the target speaker{:br:}{}"), error)).open();
                    });
                });

                return tag;
            };

            generate_device(undefined).appendTo(container_devices);
            aplayer.available_devices().then(result => {
                contianer_error.text("").hide();
                result.forEach(e => generate_device(e).appendTo(container_devices));
            }).catch(error => {
                if (typeof (error) === "string")
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
            } catch (error) {
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

                if (aplayer.set_master_volume)
                    aplayer.set_master_volume(volume / 100);
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
                set_master_volume(volume / 100);
                settings.changeGlobal(Settings.KEY_SOUND_MASTER_SOUNDS, volume);
            });
        }
    }

    /* button test sound */
    {
        container.find(".button-test-sound").on('click', event => {
            manager.play(Sound.SOUND_TEST, {
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
        let scrollbar;
        /*
        let scrollbar: SimpleBar;
        if("SimpleBar" in window)
            scrollbar = new SimpleBar(container_sounds[0]);
        */

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
                if (tag_pause.is(":visible"))
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
        for (const sound_key in Sound)
            generate_sound(Sound[sound_key as any] as any).appendTo(scrollbar ? scrollbar.getContentElement() : container_sounds);

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
        const activated = (event.target as HTMLInputElement).checked;
        sound.set_overlap_activated(activated);
    }).prop("checked", sound.overlap_activated());

    const mute_tag = contianer.find(".option-mute-output");
    mute_tag.on('change', event => {
        const activated = (event.target as HTMLInputElement).checked;
        sound.set_ignore_output_muted(!activated);
    }).prop("checked", !sound.ignore_output_muted());

    modal.close_listener.push(sound.save);
}

export namespace modal_settings {
    export interface ProfileViewSettings {
        forum_setuppable: boolean
    }

    export function initialize_identity_profiles_controller(event_registry: Registry<events.modal.settings.profiles>) {
        const send_error = (event, profile, text) => event_registry.fire_async(event, {
            status: "error",
            profile_id: profile,
            error: text
        });
        event_registry.on("create-profile", event => {
            const profile = profiles.create_new_profile(event.name);
            profiles.mark_need_save();
            event_registry.fire_async("create-profile-result", {
                status: "success",
                name: event.name,
                profile_id: profile.id
            });
        });

        event_registry.on("delete-profile", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("delete-profile-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            profiles.delete_profile(profile);
            event_registry.fire_async("delete-profile-result", {status: "success", profile_id: event.profile_id});
        });

        const build_profile_info = (profile: ConnectionProfile) => {
            const forum_data = profile.selected_identity(IdentitifyType.TEAFORO) as TeaForumIdentity;
            const teamspeak_data = profile.selected_identity(IdentitifyType.TEAMSPEAK) as TeaSpeakIdentity;
            const nickname_data = profile.selected_identity(IdentitifyType.NICKNAME) as NameIdentity;

            return {
                id: profile.id,
                name: profile.profile_name,
                nickname: profile.default_username,
                identity_type: profile.selected_identity_type as any,
                identity_forum: !forum_data ? undefined : {
                    valid: forum_data.valid(),
                    fallback_name: forum_data.fallback_name()
                },
                identity_nickname: !nickname_data ? undefined : {
                    name: nickname_data.name(),
                    fallback_name: nickname_data.fallback_name()
                },
                identity_teamspeak: !teamspeak_data ? undefined : {
                    unique_id: teamspeak_data.uid(),
                    fallback_name: teamspeak_data.fallback_name()
                }
            }
        };
        event_registry.on("query-profile-list", event => {
            event_registry.fire_async("query-profile-list-result", {
                status: "success",
                profiles: profiles.profiles().map(e => build_profile_info(e))
            });
        });

        event_registry.on("query-profile", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("query-profile-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            event_registry.fire_async("query-profile-result", {
                status: "success",
                profile_id: event.profile_id,
                info: build_profile_info(profile)
            });
        });

        event_registry.on("set-default-profile", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("set-default-profile-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            const old = profiles.set_default_profile(profile);
            event_registry.fire_async("set-default-profile-result", {
                status: "success",
                old_profile_id: event.profile_id,
                new_profile_id: old.id
            });
        });

        event_registry.on("set-profile-name", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("set-profile-name-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            profile.profile_name = event.name;
            profiles.mark_need_save();
            event_registry.fire_async("set-profile-name-result", {
                name: event.name,
                profile_id: event.profile_id,
                status: "success"
            });
        });

        event_registry.on("set-default-name", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("set-default-name-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            profile.default_username = event.name;
            profiles.mark_need_save();
            event_registry.fire_async("set-default-name-result", {
                name: event.name,
                profile_id: event.profile_id,
                status: "success"
            });
        });

        event_registry.on("set-identity-name-name", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("set-identity-name-name-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            let identity = profile.selected_identity(IdentitifyType.NICKNAME) as NameIdentity;
            if (!identity)
                profile.set_identity(IdentitifyType.NICKNAME, identity = new NameIdentity());
            identity.set_name(event.name);
            profiles.mark_need_save();

            event_registry.fire_async("set-identity-name-name-result", {
                name: event.name,
                profile_id: event.profile_id,
                status: "success"
            });
        });

        event_registry.on("query-profile-validity", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("query-profile-validity-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            event_registry.fire_async("query-profile-validity-result", {
                status: "success",
                profile_id: event.profile_id,
                valid: profile.valid()
            });
        });

        event_registry.on("query-identity-teamspeak", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("query-identity-teamspeak-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            const ts = profile.selected_identity(IdentitifyType.TEAMSPEAK) as TeaSpeakIdentity;
            if (!ts) {
                event_registry.fire_async("query-identity-teamspeak-result", {
                    status: "error",
                    profile_id: event.profile_id,
                    error: tr("Missing identity")
                });
                return;
            }

            ts.level().then(level => {
                event_registry.fire_async("query-identity-teamspeak-result", {
                    status: "success",
                    level: level,
                    profile_id: event.profile_id
                });
            }).catch(error => {
                send_error("query-identity-teamspeak-result", event.profile_id, tr("failed to calculate level"));
            })
        });

        event_registry.on("select-identity-type", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                return;
            }

            profile.selected_identity_type = event.identity_type;
            profiles.mark_need_save();
        });

        event_registry.on("generate-identity-teamspeak", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                send_error("generate-identity-teamspeak-result", event.profile_id, tr("Unknown profile"));
                return;
            }

            TeaSpeakIdentity.generate_new().then(identity => {
                profile.set_identity(IdentitifyType.TEAMSPEAK, identity);
                profiles.mark_need_save();

                identity.level().then(level => {
                    event_registry.fire_async("generate-identity-teamspeak-result", {
                        status: "success",
                        profile_id: event.profile_id,
                        unique_id: identity.uid(),
                        level: level
                    });
                }).catch(error => {
                    console.error(tr("Failed to calculate level for a new identity. Error object: %o"), error);
                    send_error("generate-identity-teamspeak-result", event.profile_id, tr("failed to calculate level: ") + error);
                })
            }).catch(error => {
                console.error(tr("Failed to generate a new identity. Error object: %o"), error);
                send_error("generate-identity-teamspeak-result", event.profile_id, tr("failed to generate identity: ") + error);
            });
        });

        event_registry.on("import-identity-teamspeak", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                return;
            }

            spawnTeamSpeakIdentityImport(identity => {
                profile.set_identity(IdentitifyType.TEAMSPEAK, identity);
                profiles.mark_need_save();

                identity.level().catch(error => {
                    console.error(tr("Failed to calculate level for a new imported identity. Error object: %o"), error);
                    return Promise.resolve(undefined);
                }).then(level => {
                    event_registry.fire_async("import-identity-teamspeak-result", {
                        profile_id: event.profile_id,
                        unique_id: identity.uid(),
                        level: level
                    });
                });
            });
        });

        event_registry.on("improve-identity-teamspeak-level", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                return;
            }

            const identity = profile.selected_identity(IdentitifyType.TEAMSPEAK) as TeaSpeakIdentity;
            if (!identity) return;

            spawnTeamSpeakIdentityImprove(identity, profile.profile_name).close_listener.push(() => {
                profiles.mark_need_save();

                identity.level().then(level => {
                    event_registry.fire_async("improve-identity-teamspeak-level-update", {
                        profile_id: event.profile_id,
                        new_level: level
                    });
                }).catch(error => {
                    log.error(LogCategory.CLIENT, tr("Failed to calculate identity level after improvement (%o)"), error);
                });
            });
        });

        event_registry.on("export-identity-teamspeak", event => {
            const profile = profiles.find_profile(event.profile_id);
            if (!profile) {
                log.warn(LogCategory.CLIENT, tr("Received profile event with unknown profile id (event: %s, id: %s)"), event.type, event.profile_id);
                return;
            }

            const identity = profile.selected_identity(IdentitifyType.TEAMSPEAK) as TeaSpeakIdentity;
            if (!identity) return;

            identity.export_ts(true).then(data => {
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
        });
    }

    export function initialize_identity_profiles_view(container: JQuery, event_registry: Registry<events.modal.settings.profiles>, settings: ProfileViewSettings) {
        /* profile list */
        {
            const container_profiles = container.find(".container-profiles");
            let selected_profile;

            const overlay_error = container_profiles.find(".overlay-error");
            const overlay_timeout = container_profiles.find(".overlay-timeout");
            const overlay_empty = container_profiles.find(".overlay-empty");

            const build_profile = (profile: events.modal.settings.ProfileInfo, selected: boolean) => {
                let tag_avatar: JQuery, tag_default: JQuery;
                let tag = $.spawn("div").addClass("profile").attr("profile-id", profile.id).append(
                    tag_avatar = $.spawn("div").addClass("container-avatar"),
                    $.spawn("div").addClass("container-info").append(
                        $.spawn("div").addClass("container-type").append(
                            $.spawn("div").addClass("identity-type").text(profile.identity_type || tr("Type unset")),
                            tag_default = $.spawn("div").addClass("tag-default").text(tr("(Default)")),
                            $.spawn("div").addClass("icon_em icon-status").hide()
                        ),
                        $.spawn("div").addClass("profile-name").text(profile.name || tr("Unnamed"))
                    )
                );
                tag_avatar.hide(); /* no avatars yet */

                tag.on('click', event => event_registry.fire("select-profile", {profile_id: profile.id}));
                tag.toggleClass("selected", selected);
                tag_default.toggle(profile.id === "default");

                event_registry.fire("query-profile-validity", {profile_id: profile.id});
                return tag;
            };

            event_registry.on("select-profile", event => {
                container_profiles.find(".profile").removeClass("selected");
                container_profiles.find(".profile[profile-id='" + event.profile_id + "']").addClass("selected");
                selected_profile = event.profile_id;
            });


            event_registry.on("query-profile-list", event => {
                container_profiles.find(".profile").remove();
            });

            event_registry.on("query-profile-list-result", event => {
                container_profiles.find(".overlay").hide();
                if (event.status === "error") {
                    overlay_error.show().find(".error").text(event.error || tr("unknown error"));
                    return;
                } else if (event.status === "timeout") {
                    overlay_timeout.show();
                    return;
                }
                if (!event.profiles.length) {
                    overlay_empty.show();
                    return;
                }

                container_profiles.find(".overlay").hide();
                container_profiles.find(".profile").remove();
                event.profiles.forEach(e => build_profile(e, e.id == selected_profile).appendTo(container_profiles));
            });

            event_registry.on("delete-profile-result", event => {
                if (event.status !== "success") return;

                //TODO: Animate removal?
                container_profiles.find(".profile[profile-id='" + event.profile_id + "']").remove();
            });

            event_registry.on('create-profile-result', event => {
                if (event.status !== "success") return;

                event_registry.fire("query-profile-list");
                event_registry.one("query-profile-list-result", e => event_registry.fire("select-profile", {profile_id: event.profile_id}));
            });

            event_registry.on("set-profile-name-result", event => {
                if (event.status !== "success") return;

                const profile = container_profiles.find(".profile[profile-id='" + event.profile_id + "']");
                profile.find(".profile-name").text(event.name || tr("Unnamed"));
            });

            event_registry.on("set-default-profile-result", event => {
                if (event.status !== "success") return;

                const old_profile = container_profiles.find(".profile[profile-id='default']");
                const new_profile = container_profiles.find(".profile[profile-id='" + event.old_profile_id + "']");
                old_profile.attr("profile-id", event.new_profile_id).find(".tag-default").hide();
                new_profile.attr("profile-id", "default").find(".tag-default").show();
            });

            event_registry.on("select-identity-type", event => {
                if (!event.identity_type) return;

                const profile = container_profiles.find(".profile[profile-id='" + event.profile_id + "']");
                profile.find(".identity-type").text(event.identity_type.toUpperCase() || tr("Type unset"));
            });

            event_registry.on("query-profile-validity-result", event => {
                const profile = container_profiles.find(".profile[profile-id='" + event.profile_id + "']");
                profile.find(".icon-status")
                    .show()
                    .toggleClass("client-apply", event.status === "success" && event.valid)
                    .toggleClass("client-delete", event.status !== "success" || !event.valid)
                    .attr("title", event.status === "success" ? event.valid ? tr("Profile is valid") : tr("Provile is invalid") : event.error || tr("failed to query status"));
            });

            /* status indicator updaters */
            event_registry.on("select-identity-type", event => {
                if (!event.profile_id) return;

                /* we need a short delay so everything could apply*/
                setTimeout(() => {
                    event_registry.fire("query-profile-validity", {profile_id: event.profile_id});
                }, 100);
            });
            event_registry.on(["set-default-name-result", "set-profile-name-result", "set-identity-name-name-result", "generate-identity-teamspeak-result"], event => {
                if (!('status' in event) || !('profile_id' in event)) {
                    log.warn(LogCategory.CLIENT, tr("Profile status watcher encountered an unuseal event!"));
                    return;
                }
                if ((event as any).status !== "success") return;
                event_registry.fire("query-profile-validity", {profile_id: (event as any).profile_id});
            })
        }

        /* list buttons */
        {
            /* reload */
            {
                const button = container.find(".button-reload-list");

                button.on('click', event => event_registry.fire("query-profile-list"));

                event_registry.on("query-profile-list", event => button.prop("disabled", true));
                event_registry.on("query-profile-list-result", event => button.prop("disabled", false));
            }

            /* set default */
            {
                const button = container.find(".button-set-default");
                let current_profile;

                button.on('click', event => event_registry.fire("set-default-profile", {profile_id: current_profile}));
                event_registry.on("select-profile", event => {
                    current_profile = event.profile_id;
                    button.prop("disabled", !event.profile_id || event.profile_id === "default");
                });

                event_registry.on("set-default-profile-result", event => {
                    if (event.status === "success") return;

                    createErrorModal(tr("Failed to set default profile"), tr("Failed to set default profile:") + "<br>" + (event.status === "timeout" ? tr("request timeout") : (event.error || tr("unknown error")))).open();
                });
                button.prop("disabled", true);
            }

            /* delete button */
            {
                const button = container.find(".button-delete");
                let current_profile;

                button.on('click', event => {
                    if (!current_profile || current_profile === "default") return;

                    spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this profile?"), result => {
                        if (result)
                            event_registry.fire("delete-profile", {profile_id: current_profile});
                    });
                });

                event_registry.on("delete-profile-result", event => {
                    if (event.status === "success") return;

                    createErrorModal(tr("Failed to delete profile"), tr("Failed to delete profile:") + "<br>" + (event.status === "timeout" ? tr("request timeout") : (event.error || tr("unknown error")))).open();
                });

                event_registry.on("select-profile", event => {
                    current_profile = event.profile_id;

                    button.prop("disabled", !event.profile_id || event.profile_id === "default");
                });
            }

            /* create button */
            {
                const button = container.find(".button-create");
                button.on('click', event => {
                    createInputModal(tr("Please enter a name"), tr("Please enter a name for the new profile:"), text => text.length >= 3 && !profiles.find_profile_by_name(text), value => {
                        if (value)
                            event_registry.fire("create-profile", {name: value as string});
                    }).open();
                });

                event_registry.on('create-profile', event => button.prop("disabled", true));
                event_registry.on("create-profile-result", event => {
                    button.prop("disabled", false);
                    if (event.status === "success") {
                        event_registry.fire("select-profile", {profile_id: event.profile_id});
                        return;
                    }

                    createErrorModal(tr("Failed to create profile"), tr("Failed to create new profile:") + "<br>" + (event.status === "timeout" ? tr("request timeout") : (event.error || tr("unknown error")))).open();
                })
            }
        }


        /* profile info */
        {
            let current_profile;
            const error_text = event => event.status === "timeout" ? tr("request timeout") : (event.error || tr("unknown error"));

            /* general info */
            {
                /* profile name */
                {
                    const input = container.find(".profile-name");
                    let last_name;

                    const update_name = () => input.prop("disabled", false)
                        .val(last_name)
                        .attr("placeholder", tr("Profile name"))
                        .parent().removeClass("is-invalid");

                    const info_name = text => input.prop("disabled", true)
                        .val(null)
                        .attr("placeholder", text)
                        .parent().removeClass("is-invalid");

                    event_registry.on("query-profile", event => {
                        if (event.profile_id !== current_profile) return;

                        info_name(tr("loading"));
                    });

                    event_registry.on("query-profile-result", event => {
                        if (event.profile_id !== current_profile) return;

                        if (event.status === "success") {
                            last_name = event.info.name;
                            update_name();
                        } else {
                            info_name(error_text(event));
                        }
                    });

                    event_registry.on("set-profile-name", event => {
                        if (event.profile_id !== current_profile) return;

                        info_name(tr("saving"));
                    });

                    event_registry.on("set-profile-name-result", event => {
                        if (event.status !== "success") {
                            createErrorModal(tr("Failed to change profile name"), tr("Failed to create apply new name:") + "<br>" + error_text(event)).open();
                        } else {
                            last_name = event.name;
                        }
                        update_name();
                    });

                    input.on('keyup', event => {
                        const text = input.val() as string;
                        const profile = profiles.find_profile_by_name(text);
                        input.parent().toggleClass("is-invalid", text.length < 3 || (profile && profile.id != current_profile));
                    }).on('change', event => {
                        const text = input.val() as string;
                        const profile = profiles.find_profile_by_name(text);
                        if (text.length < 3 || (profile && profile.id != current_profile)) return;

                        event_registry.fire("set-profile-name", {profile_id: current_profile, name: text});
                    });
                }

                /* nickname name */
                {
                    const input = container.find(".profile-default-name");
                    let last_name = null, fallback_names = {}, current_identity_type = "";

                    const update_name = () => input.prop("disabled", false)
                        .val(last_name)
                        .attr("placeholder", fallback_names[current_identity_type] || tr("Another TeaSpeak user"))
                        .parent().removeClass("is-invalid");

                    const info_name = text => input.prop("disabled", true)
                        .val(null)
                        .attr("placeholder", text)
                        .parent().removeClass("is-invalid");

                    event_registry.on("query-profile", event => {
                        if (event.profile_id !== current_profile) return;

                        input.prop("disabled", true).val(null).attr("placeholder", tr("loading"));
                    });

                    event_registry.on("query-profile-result", event => {
                        if (event.profile_id !== current_profile) return;
                        if (event.status === "success") {
                            current_identity_type = event.info.identity_type;
                            fallback_names["nickname"] = event.info.identity_nickname ? event.info.identity_nickname.fallback_name : undefined;
                            fallback_names["teaforo"] = event.info.identity_forum ? event.info.identity_forum.fallback_name : undefined;
                            fallback_names["teamspeak"] = event.info.identity_teamspeak ? event.info.identity_teamspeak.fallback_name : undefined;

                            last_name = event.info.nickname;
                            update_name();
                        } else {
                            info_name(error_text(event));
                        }
                    });

                    event_registry.on("select-identity-type", event => {
                        if (current_identity_type === event.identity_type) return;

                        current_identity_type = event.identity_type;
                        update_name();
                    });

                    event_registry.on("set-default-name", event => {
                        if (event.profile_id !== current_profile) return;

                        info_name(tr("saving"));
                    });

                    event_registry.on("set-default-name-result", event => {
                        if (event.status !== "success") {
                            createErrorModal(tr("Failed to change nickname"), tr("Failed to create apply new nickname:") + "<br>" + error_text(event)).open();
                        } else {
                            last_name = event.name;
                        }
                        update_name();
                    });

                    input.on('keyup', event => {
                        const text = input.val() as string;
                        input.parent().toggleClass("is-invalid", text.length != 0 && text.length < 3);
                    }).on('change', event => {
                        const text = input.val() as string;
                        if (text.length != 0 && text.length < 3) return;

                        event_registry.fire("set-default-name", {profile_id: current_profile, name: text});
                    });
                }

                /* identity type */
                {
                    const select_identity_type = container.find(".profile-identity-type");

                    const show_message = (text, is_invalid) => select_identity_type
                        .toggleClass("is-invalid", is_invalid)
                        .prop("disabled", true)
                        .find("option[value=error]")
                        .text(text)
                        .prop("selected", true);

                    const set_type = type => select_identity_type
                        .toggleClass("is-invalid", type === "unset")
                        .prop("disabled", false)
                        .find("option[value=" + type + "]")
                        .prop("selected", true);

                    event_registry.on("query-profile", event => show_message(tr("loading"), false));

                    event_registry.on("select-identity-type", event => {
                        if (event.profile_id !== current_profile) return;

                        set_type(event.identity_type || "unset");
                    });

                    event_registry.on("query-profile-result", event => {
                        if (event.profile_id !== current_profile) return;

                        if (event.status === "success")
                            event_registry.fire("select-identity-type", {
                                profile_id: event.profile_id,
                                identity_type: event.info.identity_type
                            });
                        else
                            show_message(error_text(event), false);
                    });

                    select_identity_type.on('change', event => {
                        const type = (select_identity_type.val() as string).toLowerCase();
                        if (type === "error" || type == "unset") return;

                        event_registry.fire("select-identity-type", {
                            profile_id: current_profile,
                            identity_type: type as any
                        });
                    });
                }

                /* avatar */
                {
                    container.find(".button-change-avatar").hide();
                }
            }

            /* special info TeamSpeak */
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

                let is_profile_generated = false;

                event_registry.on("select-identity-type", event => {
                    if (event.profile_id !== current_profile) return;

                    container_settings.toggle(event.identity_type === "teamspeak");
                });

                event_registry.on("query-profile", event => {
                    input_unique_id.val(null).attr("placeholder", tr("loading"));
                    input_current_level.val(null).attr("placeholder", tr("loading"));

                    button_new.prop("disabled", true);
                    button_improve.prop("disabled", true);
                    button_import.prop("disabled", true);
                    button_export.prop("disabled", true);
                });

                const update_identity = (state: "not-created" | "created", unique_id?: string, level?: number) => {
                    if (state === "not-created") {
                        container_invalid.show();
                        container_valid.hide();

                        button_improve.prop("disabled", true);
                        button_export.prop("disabled", true);
                    } else {
                        container_invalid.hide();
                        container_valid.show();

                        input_unique_id.val(unique_id).attr("placeholder", null);
                        if (typeof level !== "number")
                            event_registry.fire("query-identity-teamspeak", {profile_id: current_profile});
                        else
                            input_current_level.val(level).attr("placeholder", null);

                        button_improve.prop("disabled", false);
                        button_export.prop("disabled", false);
                    }

                    is_profile_generated = state === "created";
                    button_new.toggleClass("btn-blue", !is_profile_generated).toggleClass("btn-red", is_profile_generated);
                    button_import.toggleClass("btn-blue", !is_profile_generated).toggleClass("btn-red", is_profile_generated);

                    button_new.prop("disabled", false);
                    button_import.prop("disabled", false);
                };

                event_registry.on("query-profile-result", event => {
                    if (event.profile_id !== current_profile) return;

                    if (event.status !== "success") {
                        input_unique_id.val(null).attr("placeholder", error_text(event));
                        return;
                    }

                    if (!event.info.identity_teamspeak)
                        update_identity("not-created");
                    else
                        update_identity("created", event.info.identity_teamspeak.unique_id);
                });

                event_registry.on("query-identity-teamspeak-result", event => {
                    if (event.profile_id !== current_profile) return;

                    if (event.status === "success") {
                        input_current_level.val(event.level).attr("placeholder", null);
                    } else {
                        input_current_level.val(null).attr("placeholder", error_text(event));
                    }
                });

                /* the new button */
                {
                    button_new.on('click', event => {
                        if (is_profile_generated) {
                            spawnYesNo(tr("Are you sure"), tr("Do you really want to generate a new identity and override the old identity?"), result => {
                                if (result) event_registry.fire("generate-identity-teamspeak", {profile_id: current_profile});
                            });
                        } else {
                            event_registry.fire("generate-identity-teamspeak", {profile_id: current_profile});
                        }
                    });

                    event_registry.on("generate-identity-teamspeak-result", event => {
                        if (event.profile_id !== current_profile) return;

                        if (event.status !== "success") {
                            createErrorModal(tr("Failed to generate a new identity"), tr("Failed to create a new identity:") + "<br>" + error_text(event)).open();
                            return;
                        }

                        update_identity("created", event.unique_id, event.level);
                        createInfoModal(tr("Identity generated"), tr("A new identity had been successfully generated")).open();
                    });
                }

                /* the import identity */
                {
                    button_import.on('click', event => {
                        if (is_profile_generated) {
                            spawnYesNo(tr("Are you sure"), tr("Do you really want to import a new identity and override the old identity?"), result => {
                                if (result) event_registry.fire("import-identity-teamspeak", {profile_id: current_profile});
                            });
                        } else {
                            event_registry.fire("import-identity-teamspeak", {profile_id: current_profile});
                        }
                    });

                    event_registry.on("improve-identity-teamspeak-level-update", event => {
                        if (event.profile_id !== current_profile) return;

                        input_current_level.val(event.new_level).attr("placeholder", null);
                    });

                    event_registry.on("import-identity-teamspeak-result", event => {
                        if (event.profile_id !== current_profile) return;

                        event_registry.fire_async("query-profile", {profile_id: event.profile_id}); /* we do it like this so the default nickname changes as well */
                        createInfoModal(tr("Identity imported"), tr("Your identity had been successfully imported generated")).open();
                    });
                }

                /* identity export */
                {
                    button_export.on('click', event => {
                        createInputModal(tr("File name"), tr("Please enter the file name"), text => !!text, name => {
                            if (name)
                                event_registry.fire("export-identity-teamspeak", {
                                    profile_id: current_profile,
                                    filename: name as string
                                });
                        }).open();
                    });
                }

                /* the improve button */
                button_improve.on('click', event => event_registry.fire("improve-identity-teamspeak-level", {profile_id: current_profile}));
            }

            /* special info TeaSpeak - Forum */
            {
                const container_settings = container.find(".container-teaforo");
                const container_valid = container_settings.find(".container-valid");
                const container_invalid = container_settings.find(".container-invalid");

                const button_setup = container_settings.find(".button-setup");

                event_registry.on("select-identity-type", event => {
                    if (event.profile_id !== current_profile) return;

                    container_settings.toggle(event.identity_type === "teaforo");
                });

                event_registry.on("query-profile", event => {
                    container_valid.toggle(false);
                    container_invalid.toggle(false);
                });

                event_registry.on("query-profile-result", event => {
                    if (event.profile_id !== current_profile) return;

                    const valid = event.status === "success" && event.info.identity_forum && event.info.identity_forum.valid;
                    container_valid.toggle(!!valid);
                    container_invalid.toggle(!valid);
                });

                button_setup.on('click', event => event_registry.fire_async("setup-forum-connection"));
                button_setup.toggle(settings.forum_setuppable);
            }

            /* special info nickname */
            {
                const container_settings = container.find(".container-nickname");
                const input_nickname = container_settings.find(".nickname");
                let last_name;

                const update_name = () => input_nickname.prop("disabled", false)
                    .val(last_name)
                    .attr("placeholder", tr("Identity base name"))
                    .parent().removeClass("is-invalid");

                const show_info = text => input_nickname.prop("disabled", true)
                    .val(null)
                    .attr("placeholder", text)
                    .parent().removeClass("is-invalid");

                event_registry.on("select-identity-type", event => event.profile_id === current_profile && container_settings.toggle(event.identity_type === "nickname"));

                event_registry.on("query-profile", event => {
                    if (event.profile_id !== current_profile) return;

                    show_info(tr("loading"));
                });

                event_registry.on("query-profile-result", event => {
                    if (event.profile_id !== current_profile) return;

                    if (event.status === "success") {
                        last_name = event.info.identity_nickname ? event.info.identity_nickname.name : null;
                        update_name();
                    } else {
                        show_info(error_text(event));
                    }
                });

                event_registry.on("set-identity-name-name", event => {
                    if (event.profile_id !== current_profile) return;
                    show_info(tr("saving"));
                });

                event_registry.on("set-identity-name-name-result", event => {
                    if (event.status !== "success") {
                        createErrorModal(tr("Failed to change name"), tr("Failed to create new name:") + "<br>" + error_text(event)).open();
                    } else {
                        last_name = event.name;
                    }
                    update_name();
                });

                input_nickname.on('keyup', event => {
                    const text = input_nickname.val() as string;
                    const profile = profiles.find_profile_by_name(text);
                    input_nickname.parent().toggleClass("is-invalid", text.length < 3 || (profile && profile.id != current_profile));
                }).on('change', event => {
                    const text = input_nickname.val() as string;
                    const profile = profiles.find_profile_by_name(text);
                    if (text.length < 3 || (profile && profile.id != current_profile)) return;

                    event_registry.fire("set-identity-name-name", {profile_id: current_profile, name: text});
                });
            }
            event_registry.on("select-profile", e => current_profile = e.profile_id);
        }

        /* timeouts */
        {
            /* profile list */
            {
                let timeout;
                event_registry.on("query-profile-list", event => timeout = setTimeout(() => event_registry.fire("query-profile-list-result", {status: "timeout"}), 5000));
                event_registry.on("query-profile-list-result", event => {
                    clearTimeout(timeout);
                    timeout = undefined;
                });
            }

            /* profile create */
            {
                const timeouts = {};
                event_registry.on("create-profile", event => {
                    clearTimeout(timeouts[event.name]);
                    timeouts[event.name] = setTimeout(() => {
                        event_registry.fire("create-profile-result", {name: event.name, status: "timeout"});
                    }, 5000);
                });

                event_registry.on("create-profile-result", event => {
                    clearTimeout(timeouts[event.name]);
                    delete timeouts[event.name];
                });
            }

            /* profile set default create */
            {
                const timeouts = {};
                event_registry.on("set-default-profile", event => {
                    clearTimeout(timeouts[event.profile_id]);
                    timeouts[event.profile_id] = setTimeout(() => {
                        event_registry.fire("set-default-profile-result", {
                            old_profile_id: event.profile_id,
                            status: "timeout"
                        });
                    }, 5000);
                });

                event_registry.on("set-default-profile-result", event => {
                    clearTimeout(timeouts[event.old_profile_id]);
                    delete timeouts[event.old_profile_id];
                });
            }

            const create_standard_timeout = (event: keyof events.modal.settings.profiles, response_event: keyof events.modal.settings.profiles, key: string) => {
                const timeouts = {};
                event_registry.on(event, event => {
                    clearTimeout(timeouts[event[key]]);
                    timeouts[event[key]] = setTimeout(() => {
                        const timeout_event = {status: "timeout"};
                        timeout_event[key] = event[key];
                        event_registry.fire(response_event, timeout_event as any);
                    }, 5000);
                });

                event_registry.on(response_event, event => {
                    clearTimeout(timeouts[event[key]]);
                    delete timeouts[event[key]];
                });
            };

            create_standard_timeout("query-profile", "query-profile-result", "profile_id");
            create_standard_timeout("query-identity-teamspeak", "query-identity-teamspeak-result", "profile_id");
            create_standard_timeout("delete-profile", "delete-profile-result", "profile_id");
            create_standard_timeout("set-profile-name", "set-profile-name-result", "profile_id");
            create_standard_timeout("set-default-name", "set-default-name-result", "profile_id");
            create_standard_timeout("query-profile-validity", "query-profile-validity-result", "profile_id");
            create_standard_timeout("set-identity-name-name", "set-identity-name-name-result", "profile_id");
            create_standard_timeout("generate-identity-teamspeak", "generate-identity-teamspeak-result", "profile_id");
        }

        /* some view semantics */
        {
            let selected_profile;
            event_registry.on("delete-profile-result", event => {
                if (event.status !== "success") return;
                if (event.profile_id !== selected_profile) return;

                /* the selected profile has been deleted, so we need to select another one */
                event_registry.fire("select-profile", {profile_id: "default"});
            });

            /* reselect the default profile or the new default profile */
            event_registry.on("set-default-profile-result", event => {
                if (event.status !== "success") return;
                if (selected_profile === "default")
                    event_registry.fire("select-profile", {profile_id: event.new_profile_id});
                else if (selected_profile === event.old_profile_id)
                    event_registry.fire("select-profile", {profile_id: "default"});
            });

            event_registry.on("select-profile", event => {
                selected_profile = event.profile_id;
                event_registry.fire("query-profile", {profile_id: event.profile_id});
            });

            event_registry.on("reload-profile", event => {
                event_registry.fire("query-profile-list");
                event_registry.fire("select-profile", event.profile_id || selected_profile);
            });
        }

        event_registry.fire("query-profile-list");
        event_registry.fire("select-profile", {profile_id: "default"});
        event_registry.fire("select-identity-type", {profile_id: "default", identity_type: undefined});
    }
}

function settings_identity_forum(container: JQuery, modal: Modal, update_profiles: () => any) {
    const containers_connected = container.find(".show-connected");
    const containers_disconnected = container.find(".show-disconnected");

    const update_state = () => {
        const logged_in = forum.logged_in();
        containers_connected.toggle(logged_in);
        containers_disconnected.toggle(!logged_in);

        if (logged_in) {
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
            enabled = enabled && (typeof (captcha) === "boolean" ? !captcha : !!captcha);
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

            forum.login(input_username.val() as string, input_password.val() as string, typeof (captcha) === "string" ? captcha : undefined).then(state => {
                captcha = false;

                console.debug(tr("Forum login result: %o"), state);
                if (state.status === "success") {
                    update_state();
                    update_profiles();
                    return;
                }

                setTimeout(() => {
                    if (!!state.error_message) /* clear password if we have an error */
                        input_password.val("");
                    input_password.focus();
                    update_button_state();
                }, 0);
                if (state.status === "captcha") {
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
                createErrorModal(tr("Forum logout failed"), formatMessage(tr("Failed to logout from forum account.{:br:}Error: {}"), error)).open();
            }).then(() => {
                if (modal.shown)
                    update_state();
                update_profiles();
            });
        });
    }

    update_state();
}