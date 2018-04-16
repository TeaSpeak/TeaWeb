/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />
var Modals;
(function (Modals) {
    function spawnSettingsModal() {
        let modal;
        modal = createModal({
            header: "Settings",
            body: () => {
                let template = $("#tmpl_settings").tmpl();
                template = $.spawn("div").append(template);
                initialiseSettingListeners(modal, template = template.tabify());
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
    Modals.spawnSettingsModal = spawnSettingsModal;
    function initialiseSettingListeners(modal, tag) {
        //Voice
        initialiseVoiceListeners(modal, tag.find(".settings_voice"));
    }
    function initialiseVoiceListeners(modal, tag) {
        let currentVAD = settings.global("vad_type");
        tag.find("input[type=radio][name=\"vad_type\"]").change(function () {
            tag.find(".vad_settings .vad_type").text($(this).attr("display"));
            tag.find(".vad_settings .vad_type_settings").hide();
            tag.find(".vad_settings .vad_type_" + this.value).show();
            settings.changeGlobal("vad_type", this.value);
            globalClient.voiceConnection.voiceRecorder.reinitialiseVAD();
            switch (this.value) {
                case "ppt":
                    let keyCode = parseInt(settings.global("vad_ppt_key", 84 /* T */.toString()));
                    tag.find(".vat_ppt_key").text(String.fromCharCode(keyCode));
                    break;
                case "vad":
                    let slider = tag.find(".vad_vad_slider");
                    let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
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
        if (!currentVAD)
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
            if (vad instanceof VoiceActivityDetectorVAD)
                vad.percentageThreshold = slider.val();
            tag.find(".vad_vad_slider_value").text(slider.val().toString());
        });
        modal.properties.registerCloseListener(() => {
            let vad = globalClient.voiceConnection.voiceRecorder.getVADHandler();
            if (vad instanceof VoiceActivityDetectorVAD)
                vad.percentage_listener = undefined;
        });
        //Trigger radio button select for VAD setting setup
        elm.trigger("change");
        //Initialise microphones
        console.log(tag);
        let mselect = tag.find(".voice_microphone_select");
        console.log(mselect);
        let mselectError = tag.find(".voice_microphone_select_error");
        navigator.mediaDevices.enumerateDevices().then(devices => {
            let currentStream = globalClient.voiceConnection.voiceRecorder.getMediaStream();
            let currentDeviceId;
            if (currentStream) {
                let audio = currentStream.getAudioTracks()[0];
                currentDeviceId = audio.getSettings().deviceId;
            }
            console.log("Got " + devices.length + " devices:");
            for (let device of devices) {
                console.log(device);
                if (device.kind == "audioinput") {
                    let dtag = $.spawn("option");
                    dtag.attr("device-id", device.deviceId);
                    dtag.attr("device-group", device.groupId);
                    dtag.text(device.label);
                    mselect.append(dtag);
                    if (currentDeviceId && device.deviceId == currentDeviceId)
                        mselect.attr("selected", "");
                }
            }
        }).catch(error => {
            console.error("Could not enumerate over devices!");
            console.error(error);
            mselectError.text("Could not get device list!").show();
        });
        mselect.change(event => {
            let deviceSelected = mselect.find("option:selected");
            let deviceId = deviceSelected.attr("device-id");
            console.log("Selected device: " + deviceId);
            globalClient.voiceConnection.voiceRecorder.changeDevice(deviceId);
        });
    }
})(Modals || (Modals = {}));
//# sourceMappingURL=ModalSettings.js.map