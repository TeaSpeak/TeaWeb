/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../voice/AudioController.ts" />

namespace Modals {
    import set = Reflect.set;

    export function spawnSettingsModal() {
        let modal;
        modal = createModal({
            header: "Settings",
            body: () => {
                let template = $("#tmpl_settings").renderTag();
                template = $.spawn("div").append(template);
                initialiseSettingListeners(modal,template = template.tabify());
                return template;
            },
            footer: () => {
                let footer = $.spawn("div");
                footer.addClass("modal-button-group");
                footer.css("margin-top", "5px");
                footer.css("margin-bottom", "5px");
                footer.css("text-align", "right");

                let buttonOk = $.spawn("button");
                buttonOk.text("Ok");
                buttonOk.click(() => modal.close());
                footer.append(buttonOk);

                return footer;
            },
            width: 750
        });
        modal.open();
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
                        let keyCode: number = parseInt(settings.global("vad_ppt_key", JQuery.Key.T.toString()));
                        vad_tag.find(".vat_ppt_key").text(String.fromCharCode(keyCode));
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
                            head.text("Type the key you wish");
                            head.css("background-color", "blue");
                            return head;
                        },
                        footer: ""
                    });
                    $(document).one("keypress", function (e) {
                        console.log("Got key " + e.keyCode);
                        modal.close();
                        settings.changeGlobal("vad_ppt_key", e.keyCode.toString());
                        globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();
                        vad_tag.find(".vat_ppt_key").text(String.fromCharCode(e.keyCode));
                    });
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
                    .text("No device")
                    .appendTo(tag_select);

                navigator.mediaDevices.enumerateDevices().then(devices => {
                    const active_device = globalClient.voiceConnection.voiceRecorder.device_id();

                    for(const device of devices) {
                        console.debug("Got device %s (%s): %s", device.deviceId, device.kind, device.label);
                        if(device.kind !== 'audioinput') continue;

                        $.spawn("option")
                            .attr("device-id", device.deviceId)
                            .attr("device-group", device.groupId)
                            .text(device.label)
                            .prop("selected", device.deviceId == active_device)
                            .appendTo(tag_select);
                    }
                }).catch(error => {
                    console.error("Could not enumerate over devices!");
                    console.error(error);
                    setting_tag.find(".settings-device-error")
                        .text("Could not get device list!")
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
                    console.log("Selected microphone device: id: %o group: %o", deviceId, groupId);
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
                console.error("Could not enumerate over devices!");
                console.error(error);
                setting_tag.find(".settings-device-error")
                    .text("Could not get device list!")
                    .css("display", "block");
            });


            if(tag_select.find("option:selected").length == 0)
                tag_select.find("option").prop("selected", true);

            {
                const error_tag = setting_tag.find(".settings-device-error");
                tag_select.on('change', event => {
                    let selected_tag = tag_select.find("option:selected");
                    let deviceId = selected_tag.attr("device-id");
                    console.log("Selected speaker device: id: %o", deviceId);
                    audio.player.set_device(deviceId).then(() => error_tag.css("display", "none")).catch(error => {
                        console.error(error);
                        error_tag
                            .text("Failed to change device!")
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
}