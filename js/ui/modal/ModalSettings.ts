/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />
/// <reference path="../../voice/AudioController.ts" />

namespace Modals {
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
        initialiseVoiceListeners(modal, tag.find(".settings_voice"));
    }

    function initialiseVoiceListeners(modal: Modal, tag: JQuery) {
        let currentVAD = settings.global("vad_type");

        tag.find("input[type=radio][name=\"vad_type\"]").change(function (this: HTMLButtonElement) {
            tag.find(".vad_settings .vad_type").text($(this).attr("display"));
            tag.find(".vad_settings .vad_type_settings").hide();
            tag.find(".vad_settings .vad_type_" + this.value).show();
            settings.changeGlobal("vad_type", this.value);
            globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();

            switch (this.value) {
                case "ppt":
                    let keyCode: number = parseInt(settings.global("vad_ppt_key", JQuery.Key.T.toString()));
                    tag.find(".vat_ppt_key").text(String.fromCharCode(keyCode));
                    break;
                case "vad":
                    let slider = tag.find(".vad_vad_slider");
                    let vad: VoiceActivityDetectorVAD = globalClient.voiceConnection.voiceRecorder.getVADHandler() as VoiceActivityDetectorVAD;
                    slider.val(vad.percentageThreshold);
                    slider.trigger("change");
                    globalClient.voiceConnection.voiceRecorder.update(true);
                    vad.percentage_listener = per => {
                        tag.find(".vad_vad_bar_filler")
                            .css("width", per + "%");
                    };
                    break;
            }
        });

        if(!currentVAD)
            currentVAD = "ppt";
        let elm = tag.find("input[type=radio][name=\"vad_type\"][value=\"" + currentVAD + "\"]");
        elm.attr("checked", "true");


        tag.find(".vat_ppt_key").click(function () {
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
                tag.find(".vat_ppt_key").text(String.fromCharCode(e.keyCode));
            });
            modal.open();
        });


        //VAD VAD
        let slider = tag.find(".vad_vad_slider");
        slider.on("input change", () => {
            settings.changeGlobal("vad_threshold", slider.val().toString());
            let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
            if(vad instanceof  VoiceActivityDetectorVAD)
                vad.percentageThreshold = slider.val() as number;
            tag.find(".vad_vad_slider_value").text(slider.val().toString());
        });
        modal.properties.registerCloseListener(() => {
            let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
            if(vad instanceof  VoiceActivityDetectorVAD)
                vad.percentage_listener = undefined;

        });


        //Trigger radio button select for VAD setting setup
        elm.trigger("change");

        //Initialise microphones
        let select_microphone = tag.find(".voice_microphone_select");
        let select_error = tag.find(".voice_microphone_select_error");

        navigator.mediaDevices.enumerateDevices().then(devices => {
            let currentStream = globalClient.voiceConnection.voiceRecorder.getMediaStream();
            let currentDeviceId;
            if(currentStream) {
                let audio = currentStream.getAudioTracks()[0];
                currentDeviceId = audio.getSettings().deviceId;
            }
            console.log("Got " + devices.length + " devices:");
            for(let device of devices) {
                console.log(device);
                if(device.kind == "audioinput") {
                    let dtag = $.spawn("option");
                    dtag.attr("device-id", device.deviceId);
                    dtag.attr("device-group", device.groupId);
                    dtag.text(device.label);
                    select_microphone.append(dtag);

                    dtag.prop("selected", currentDeviceId && device.deviceId == currentDeviceId);
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
            globalClient.voiceConnection.voiceRecorder.changeDevice(deviceId, groupId);
        });
        //Initialise speakers

   }
}