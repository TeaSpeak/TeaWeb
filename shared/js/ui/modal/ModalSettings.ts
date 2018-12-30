/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../voice/AudioController.ts" />

namespace Modals {
    import TranslationRepository = i18n.TranslationRepository;
    import ConnectionProfile = profiles.ConnectionProfile;
    import IdentitifyType = profiles.identities.IdentitifyType;

    export function spawnSettingsModal() : Modal{
        let modal;
        modal = createModal({
            header: tr("Settings"),
            body: () => {
                let template = $("#tmpl_settings").renderTag({
                    client: native_client,
                    valid_forum_identity: profiles.identities.valid_static_forum_identity(),
                    forum_path: settings.static("forum_path"),
                });

                template = $.spawn("div").append(template);
                initialiseSettingListeners(modal,template = template.tabify());
                initialise_translations(template.find(".settings-translations"));
                initialise_profiles(modal, template.find(".settings-profiles"));

                return template;
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin-top", "5px");
                footer.css("margin-bottom", "5px");
                footer.css("text-align", "right");

                let buttonOk = $.spawn("button");
                buttonOk.text(tr("Ok"));
                buttonOk.click(() => modal.close());
                footer.append(buttonOk);

                return footer;
            },
            width: 750
        });
        modal.open();
        return modal;
    }

    function initialiseSettingListeners(modal: Modal, tag: JQuery) {
        //Voice
        initialiseVoiceListeners(modal, tag.find(".settings_audio"));
    }

    function initialiseVoiceListeners(modal: Modal, tag: JQuery) {
        let currentVAD = settings.global("vad_type", "ppt");

        { //Initialized voice activation detection
            const vad_tag = tag.find(".settings-vad-container");

            vad_tag.find('input[type=radio]').on('change', event => {
                const select = event.currentTarget as HTMLSelectElement;
                {
                    vad_tag.find(".settings-vad-impl-entry").hide();
                    vad_tag.find(".setting-vad-" + select.value).show();
                }
                {
                    settings.changeGlobal("vad_type", select.value);
                    globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();
                }

                switch (select.value) {
                    case "ppt":
                        let ppt_settings: PPTKeySettings = settings.global('vad_ppt_settings', undefined);
                        ppt_settings = ppt_settings ? JSON.parse(ppt_settings as any as string) : {};

                        vad_tag.find(".vat_ppt_key").text(ppt.key_description(ppt_settings));
                        break;
                    case "vad":
                        let slider = vad_tag.find(".vad_vad_slider");
                        let vad: VoiceActivityDetectorVAD = globalClient.voiceConnection.voiceRecorder.getVADHandler() as VoiceActivityDetectorVAD;
                        slider.val(vad.percentageThreshold);
                        slider.trigger("change");
                        globalClient.voiceConnection.voiceRecorder.update(true);
                        vad.percentage_listener = per => {
                            vad_tag.find(".vad_vad_bar_filler")
                                .css("width", per + "%");
                        };
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
                        if(event.type == ppt.EventType.KEY_TYPED) {
                            settings.changeGlobal('vad_ppt_key', undefined); //TODO remove that because its legacy shit
                            console.log(tr("Got key %o"), event);

                            let ppt_settings: PPTKeySettings = settings.global('vad_ppt_settings', undefined);
                            ppt_settings = ppt_settings ? JSON.parse(ppt_settings as any as string) : {};
                            Object.assign(ppt_settings, event);
                            settings.changeGlobal('vad_ppt_settings', ppt_settings);

                            globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();

                            ppt.unregister_key_listener(listener);
                            modal.close();
                            vad_tag.find(".vat_ppt_key").text(ppt.key_description(event));
                        }
                    };
                    ppt.register_key_listener(listener);
                    modal.open();
                });
            }

            { //Initialized voice activation detection
                let slider = vad_tag.find(".vad_vad_slider");
                slider.on("input change", () => {
                    settings.changeGlobal("vad_threshold", slider.val().toString());
                    let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
                    if(vad instanceof  VoiceActivityDetectorVAD)
                        vad.percentageThreshold = slider.val() as number;
                    vad_tag.find(".vad_vad_slider_value").text(slider.val().toString());
                });
                modal.properties.registerCloseListener(() => {
                    let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
                    if(vad instanceof  VoiceActivityDetectorVAD)
                        vad.percentage_listener = undefined;

                });
            }

            let target_tag = vad_tag.find('input[type=radio][name="vad_type"][value="' + currentVAD + '"]');
            if(target_tag.length == 0) {
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
            console.log(setting_tag);
            console.log(setting_tag.find(".settings-device-error"));
            console.log(setting_tag.find(".settings-device-error").html());

            { //List devices
                $.spawn("option")
                    .attr("device-id", "")
                    .attr("device-group", "")
                    .text(tr("No device"))
                    .appendTo(tag_select);

                navigator.mediaDevices.enumerateDevices().then(devices => {
                    const active_device = globalClient.voiceConnection.voiceRecorder.device_id();

                    for(const device of devices) {
                        console.debug(tr("Got device %s (%s): %s"), device.deviceId, device.kind, device.label);
                        if(device.kind !== 'audioinput') continue;

                        $.spawn("option")
                            .attr("device-id", device.deviceId)
                            .attr("device-group", device.groupId)
                            .text(device.label)
                            .prop("selected", device.deviceId == active_device)
                            .appendTo(tag_select);
                    }
                }).catch(error => {
                    console.error(tr("Could not enumerate over devices!"));
                    console.error(error);
                    setting_tag.find(".settings-device-error")
                        .text(tr("Could not get device list!"))
                        .css("display", "block");
                });

                if(tag_select.find("option:selected").length == 0)
                    tag_select.find("option").prop("selected", true);

            }

            {
                tag_select.on('change', event => {
                    let selected_tag = tag_select.find("option:selected");
                    let deviceId = selected_tag.attr("device-id");
                    let groupId = selected_tag.attr("device-group");
                    console.log(tr("Selected microphone device: id: %o group: %o"), deviceId, groupId);
                    globalClient.voiceConnection.voiceRecorder.change_device(deviceId, groupId);
                });
            }
        }

        { //Initialize speaker
            const setting_tag = tag.find(".settings-speaker");
            const tag_select = setting_tag.find(".audio-select-speaker");
            const active_device = audio.player.current_device();

            audio.player.available_devices().then(devices => {
                for(const device of devices) {
                    $.spawn("option")
                        .attr("device-id", device.device_id)
                        .text(device.name)
                        .prop("selected", device.device_id == active_device.device_id)
                        .appendTo(tag_select);
                }
            }).catch(error => {
                console.error(tr("Could not enumerate over devices!"));
                console.error(error);
                setting_tag.find(".settings-device-error")
                    .text(tr("Could not get device list!"))
                    .css("display", "block");
            });


            if(tag_select.find("option:selected").length == 0)
                tag_select.find("option").prop("selected", true);

            {
                const error_tag = setting_tag.find(".settings-device-error");
                tag_select.on('change', event => {
                    let selected_tag = tag_select.find("option:selected");
                    let deviceId = selected_tag.attr("device-id");
                    console.log(tr("Selected speaker device: id: %o"), deviceId);
                    audio.player.set_device(deviceId).then(() => error_tag.css("display", "none")).catch(error => {
                        console.error(error);
                        error_tag
                            .text(tr("Failed to change device!"))
                            .css("display", "block");
                    });
                });
            }
        }

        //Initialise microphones
        /*
        let select_microphone = tag.find(".voice_microphone_select");
        let select_error = tag.find(".voice_microphone_select_error");

        navigator.mediaDevices.enumerateDevices().then(devices => {
            let recoder = globalClient.voiceConnection.voiceRecorder;

            console.log("Got " + devices.length + " devices:");
            for(let device of devices) {
                console.log(" - Type: %s Name %s ID: %s Group: %s", device.kind, device.label, device.deviceId, device.groupId);
                if(device.kind == "audioinput") {
                    let dtag = $.spawn("option");
                    dtag.attr("device-id", device.deviceId);
                    dtag.attr("device-group", device.groupId);
                    dtag.text(device.label);
                    select_microphone.append(dtag);

                    if(recoder) dtag.prop("selected", device.deviceId == recoder.device_id());
                }
            }
        }).catch(error => {
            console.error("Could not enumerate over devices!");
            console.error(error);
            select_error.text("Could not get device list!").show();
        });

        select_microphone.change(event => {
            let deviceSelected = select_microphone.find("option:selected");
            let deviceId = deviceSelected.attr("device-id");
            let groupId = deviceSelected.attr("device-group");
            console.log("Selected microphone device: id: %o group: %o", deviceId, groupId);
            globalClient.voiceConnection.voiceRecorder.change_device(deviceId, groupId);
        });
        */
        //Initialise speakers

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
                const display_repository_info = (repository: TranslationRepository) => {
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
               i18n.iterate_translations((repo, entry) => {
                   let repo_tag = tag_list.find("[repository=\"" + repo.unique_id + "\"]");
                   if(repo_tag.length == 0) {
                       repo_tag = template.renderTag({
                           type: "repository",
                           name: repo.name || repo.url,
                           id: repo.unique_id
                       });

                       repo_tag.find(".button-delete").on('click', e => {
                           e.preventDefault();

                           Modals.spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this repository?"), answer => {
                                if(answer) {
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

                   const tag = template.renderTag({
                       type: "translation",
                       name: entry.info.name || entry.url,
                       id: repo.unique_id,
                       selected: i18n.config.translation_config().current_translation_url == entry.url
                   });
                   tag.find(".button-info").on('click', e => {
                       e.preventDefault();

                       const info_modal = createModal({
                           header: tr("Translation info"),
                           body: () => {
                               const tag = $("#settings-translations-list-entry-info").renderTag({
                                   type: "translation",
                                   name: entry.info.name,
                                   url: entry.url,
                                   repository_name: repo.name,
                                   contributors: entry.info.contributors || []
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
                        if(e.isDefaultPrevented()) return;
                        i18n.select_translation(repo, entry);
                        tag_list.find(".selected").removeClass("selected");
                        tag.addClass("selected");

                       restart_hint.show();
                   });
                   tag.insertAfter(repo_tag)
               }, () => {
                   tag_loading.hide();
               });
           }

       };

       {
           tag.find(".button-add-repository").on('click', () => {
               createInputModal("Enter URL", tr("Enter repository URL:<br>"), text => true, url => { //FIXME test valid url
                   if(!url) return;

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
        let selected_profile: ConnectionProfile;
        let nickname_listener: () => any;
        let status_listener: () => any;

        const display_settings = (profile: ConnectionProfile) => {
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

                    if(selected_type == IdentitifyType.TEAFORO) {
                        const forum_tag = settings_tag.find(".identity-settings-teaforo");

                        forum_tag.find(".connected, .disconnected").hide();
                        if(identity && identity.valid()) {
                            forum_tag.find(".connected").show();
                        } else {
                            forum_tag.find(".disconnected").show();
                        }
                    } else if(selected_type == IdentitifyType.TEAMSPEAK) {
                        console.log("Set: " + identity);
                        const teamspeak_tag = settings_tag.find(".identity-settings-teamspeak");
                        if(identity)
                            teamspeak_tag.find(".identity_string").val((identity as profiles.identities.TeamSpeakIdentity).exported());
                        else
                            teamspeak_tag.find(".identity_string").val("");
                    } else if(selected_type == IdentitifyType.NICKNAME) {
                        const name_tag = settings_tag.find(".identity-settings-nickname");
                        if(identity)
                            name_tag.find("input").val(identity.name());
                        else
                            name_tag.find("input").val("");
                    }
                };

                select_tag.value = type;
                select_tag.onchange(undefined);
            }
        };

        const update_profile_list = () => {
            const profile_list = tag.find(".profile-list .list").empty();
            const profile_template = $("#settings-profile-list-entry");
            for(const profile of profiles.profiles()) {
                const list_tag = profile_template.renderTag({
                    profile_name: profile.profile_name,
                    id: profile.id
                });

                const profile_status_update = () => {
                    list_tag.find(".status").hide();
                    if(profile.valid())
                        list_tag.find(".status-valid").show();
                    else
                        list_tag.find(".status-invalid").show();
                };
                list_tag.on('click', event => {
                    /* update ui */
                    profile_list.find(".selected").removeClass("selected");
                    list_tag.addClass("selected");

                    if(profile == selected_profile) return;
                    nickname_listener = () => list_tag.find(".name").text(profile.profile_name);
                    status_listener = profile_status_update;

                    display_settings(profile);
                });


                profile_list.append(list_tag);
                if((!selected_profile && profile.id == "default") || selected_profile == profile)
                    setTimeout(() => list_tag.trigger('click'), 1);
                profile_status_update();
            }
        };

        /* identity settings */
        {
            { //TeamSpeak change listener
                const teamspeak_tag = settings_tag.find(".identity-settings-teamspeak");
                const display_error = (error?: string) => {
                    if(error){
                        teamspeak_tag.find(".error-message").show().html(error);
                    } else
                        teamspeak_tag.find(".error-message").hide();
                    status_listener();
                };

                teamspeak_tag.find(".identity_file").on('change', event => {
                    if(!selected_profile) return;

                    const element = event.target as HTMLInputElement;
                    const file_reader = new FileReader();
                    file_reader.onload = function() {
                        const identity = profiles.identities.TSIdentityHelper.loadIdentityFromFileContains(file_reader.result as string);
                        if(!identity) {
                            display_error(tr("Failed to parse identity.<br>Reason: ") + profiles.identities.TSIdentityHelper.last_error());
                            return;
                        } else {
                            teamspeak_tag.find(".identity_string").val(identity.exported());
                            selected_profile.set_identity(IdentitifyType.TEAMSPEAK, identity as any);
                            profiles.mark_need_save();
                            display_error(undefined);
                        }
                    };

                    file_reader.onerror = ev => {
                        console.error(tr("Failed to read give identity file: %o"), ev);
                        display_error(tr("Failed to read file!"));
                        return;
                    };

                    if(element.files && element.files.length > 0)
                        file_reader.readAsText(element.files[0]);
                });

                teamspeak_tag.find(".identity_string").on('change', event => {
                    if(!selected_profile) return;

                    const element = event.target as HTMLInputElement;
                    if(element.value.length == 0) {
                        display_error("Please provide an identity");
                        selected_profile.set_identity(IdentitifyType.TEAMSPEAK, undefined as any);
                        profiles.mark_need_save();
                    } else {
                        const identity = profiles.identities.TSIdentityHelper.loadIdentity(element.value);
                        if(!identity) {
                            selected_profile.set_identity(IdentitifyType.TEAMSPEAK, identity as any);
                            profiles.mark_need_save();

                            display_error("Failed to parse identity string!");
                            return;
                        }

                        selected_profile.set_identity(IdentitifyType.TEAMSPEAK, identity as any);
                        profiles.mark_need_save();
                        display_error(undefined);
                    }
                });
            }

            { //The forum
                const teaforo_tag = settings_tag.find(".identity-settings-teaforo");
                if(native_client) {
                    teaforo_tag.find(".native-teaforo-login").on('click', event => {
                        setTimeout(() => {
                            const forum = require("teaforo.js");
                            const call = () => {
                                if(modal.shown) {
                                    display_settings(selected_profile);
                                    status_listener();
                                }
                            };
                            forum.register_callback(call);
                            forum.open();
                        }, 0);
                    });
                }
            }
            //TODO add the name!
        }

        /* general settings */
        {
            settings_tag.find(".setting-name").on('change', event => {
                const value = settings_tag.find(".setting-name").val() as string;
                if(value && selected_profile) {
                    selected_profile.profile_name = value;
                    if(nickname_listener)
                        nickname_listener();
                    profiles.mark_need_save();
                    status_listener();
                }
            });
            settings_tag.find(".setting-default-nickname").on('change', event => {
                const value = settings_tag.find(".setting-default-nickname").val() as string;
                if(value && selected_profile) {
                    selected_profile.default_username = value;
                    profiles.mark_need_save();
                    status_listener();
                }
            });
            settings_tag.find(".setting-default-password").on('change', event => {
                const value = settings_tag.find(".setting-default-password").val() as string;
                if(value && selected_profile) {
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
                    if(value) {
                        display_settings(profiles.create_new_profile(value as string));
                        update_profile_list();
                        profiles.mark_need_save();
                    }
                }).open();
            });

            tag.find(".button-set-default").on('click', event => {
                if(selected_profile && selected_profile.id != 'default') {
                    profiles.set_default_profile(selected_profile);
                    update_profile_list();
                    profiles.mark_need_save();
                }
            });

            tag.find(".button-delete").on('click', event => {
                if(selected_profile && selected_profile.id != 'default') {
                    event.preventDefault();
                    spawnYesNo(tr("Are you sure?"), tr ("Do you really want to delete this profile?"), result => {
                        if(result) {
                            profiles.delete_profile(selected_profile);
                            update_profile_list();
                        }
                    });
                }
            });
        }

        modal.close_listener.push(() => {
            if(profiles.requires_save())
                profiles.save();
        });
        update_profile_list();
    }
}