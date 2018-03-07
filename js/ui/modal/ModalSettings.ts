/// <reference path="../../utils/modal.ts" />
/// <reference path="../../utils/tab.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnSettingsModal() {
        const modal = createModal({
            header: "Settings",
            body: () => {
                let template = $("#tmpl_settings").tmpl();
                template = $.spawn("div").append(template);
                initialiseSettingListeners(template = template.tabify());
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

    function initialiseSettingListeners(tag: JQuery) {
        //Voice
        initialiseVoiceListeners(tag.find(".settings_voice"));
    }

    function initialiseVoiceListeners(tag: JQuery) {
        let currentVAD = globalClient.settings.global("vad_type");

        tag.find("input[type=radio][name=\"vad_type\"]").change(function (this: HTMLButtonElement) {
            console.log(this.value + " => " + $(this).attr("display"));
            tag.find(".vad_settings .vad_type").text($(this).attr("display"));
            tag.find(".vad_settings .vad_type_settings").hide();
            tag.find(".vad_settings .vad_type_" + this.value).show();
            globalClient.settings.changeGlobal("vad_type", this.value);
            globalClient.voiceConnection.voiceRecorder.reinizaliszeVAD();

            switch (this.value) {
                case "ppt":
                    let keyCode: number = Number.parseInt(globalClient.settings.global("vad_ppt_key", Key.T.toString()));
                    tag.find(".vat_ppt_key").text(String.fromCharCode(keyCode));
            }
        });

        if(!currentVAD)
            currentVAD = "ppt";
        let elm = tag.find("input[type=radio][name=\"vad_type\"][value=\"" + currentVAD + "\"]");
        elm.attr("checked", "true");
        elm.trigger("change");


        tag.find(".vat_ppt_key").click(function () {
            let modal = createModal({
                body: "",
                header: () => {
                    let head = $.spawn("div");
                    head.text("Type the key you wish");
                    head.css("background-color", "blue");
                    console.log("SPAWNED!");
                    return head;
                },
                footer: ""
            });
            $(document).one("keypress", function (e) {
                console.log("Got key " + e.keyCode);
                modal.close();
                globalClient.settings.changeGlobal("vad_ppt_key", e.keyCode.toString());
                globalClient.voiceConnection.voiceRecorder.reinizaliszeVAD();
                tag.find(".vat_ppt_key").text(String.fromCharCode(e.keyCode));
            });
            modal.open();
        });
   }
}