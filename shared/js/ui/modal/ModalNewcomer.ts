import {createModal, Modal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import {Registry} from "tc-shared/events";
import { modal as emodal } from "tc-shared/events";
import {modal_settings} from "tc-shared/ui/modal/ModalSettings";
import {profiles} from "tc-shared/profiles/ConnectionProfile";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";

const next_step: {[key: string]:string} = {
    "welcome": "microphone",
    //"microphone": app.is_web() ? "identity" : "speaker", /* speaker setup only for the native client! */
    "microphone": "identity",
    "speaker": "identity",
    "identity": "finish"
};
const last_step: {[key: string]:string} = (() => {
    const result = {};
    for(const key of Object.keys(next_step))
        if(!result[next_step[key]])
            result[next_step[key]] = key;
    return result;
})();

export function openModalNewcomer() : Modal {
    let modal = createModal({
        header: tra("Welcome to the {}", __build.version === "web" ? "TeaSpeak - Web client" : "TeaSpeak - Client"),
        body:  () => $("#tmpl_newcomer").renderTag({
            is_web: __build.version === "web"
        }).children(),
        footer: null,

        width: "",
        closeable: false
    });

    const event_registry = new Registry<emodal.newcomer>();
    event_registry.enable_debug("newcomer");

    modal.htmlTag.find(".modal-body").addClass("modal-newcomer");

    initializeBasicFunctionality(modal.htmlTag, event_registry);
    initializeStepWelcome(modal.htmlTag.find(".container-body .step.step-welcome"), event_registry);
    initializeStepIdentity(modal.htmlTag.find(".container-body .step.step-identity"), event_registry);
    initializeStepMicrophone(modal.htmlTag.find(".container-body .step.step-microphone"), event_registry, modal);
    initializeStepFinish(modal.htmlTag.find(".container-body .step.step-finish"), event_registry);

    event_registry.on("exit_guide", event => {
        if(event.ask_yesno)
            spawnYesNo(tr("Are you sure?"), tr("Do you really want to skip the basic setup guide?"), result => {
                if(result)
                    event_registry.fire("exit_guide", {ask_yesno: false});
            });
        else
            modal.close();
    });

    event_registry.fire("show_step", {step: "welcome"});
    modal.open();
    event_registry.fire_async("modal-shown");
    return modal;
}

function initializeBasicFunctionality(tag: JQuery, event_registry: Registry<emodal.newcomer>) {
    const container_header = tag.find(".container-header");
    const tag_body = tag.find(".container-body .body");

    /* step navigation */
    event_registry.on("show_step", event => {
        tag_body.find(".step").addClass("hidden");
        container_header.find(".step").addClass("hidden");

         tag_body.find(".step.step-" + event.step).removeClass("hidden");
        container_header.find(".step.step-" + event.step).removeClass("hidden");
    });

    /* button controller */
    {
        const buttons = tag.find(".buttons");
        const button_last_step = buttons.find(".button-last-step");
        const button_next_step = buttons.find(".button-next-step");

        button_last_step.on('click', event => {
            if(last_step[current_step])
                event_registry.fire("show_step", { step: last_step[current_step] as any });
            else
                event_registry.fire("exit_guide", {ask_yesno: true});
        });

        let current_step;
        button_next_step.on('click', event => {
            if(next_step[current_step])
                event_registry.fire("show_step", { step: next_step[current_step] as any });
            else
                event_registry.fire("exit_guide", {ask_yesno: false});
        });

        event_registry.on("show_step", event => {
            current_step = event.step;
            button_next_step.text(next_step[current_step] ? tr("Next step") : tr("Finish guide"));
            button_last_step.text(last_step[current_step] ? tr("Last step") : tr("Skip guide"));
        });

        event_registry.on("show_step", event => button_next_step.prop("disabled", true));
        event_registry.on("show_step", event => button_last_step.prop("disabled", true));

        event_registry.on("step-status", event => button_next_step.prop("disabled", !event.next_button));
        event_registry.on("step-status", event => button_last_step.prop("disabled", !event.previous_button));
    }
}

function initializeStepWelcome(tag: JQuery, event_registry: Registry<emodal.newcomer>) {
    event_registry.on("show_step", e => {
        if(e.step !== "welcome") return;

        event_registry.fire_async("step-status", { next_button: true, previous_button: true });
    });
}

function initializeStepFinish(tag: JQuery, event_registry: Registry<emodal.newcomer>) {
    event_registry.on("show_step", e => {
        if(e.step !== "finish") return;

        event_registry.fire_async("step-status", {next_button: true, previous_button: true });
    });
}

function initializeStepIdentity(tag: JQuery, event_registry: Registry<emodal.newcomer>) {
    const profile_events = new Registry<emodal.settings.profiles>();
    profile_events.enable_debug("settings-identity");
    modal_settings.initialize_identity_profiles_controller(profile_events);
    modal_settings.initialize_identity_profiles_view(tag, profile_events, { forum_setuppable: false });

    let step_shown = false;
    let help_animation_done = false;
    const profiles_valid = () => profiles().findIndex(e => e.valid()) !== -1;
    const update_step_status = () => {
        event_registry.fire_async("step-status", { next_button: help_animation_done && profiles_valid(), previous_button: help_animation_done });
    };
    profile_events.on("query-profile-validity-result", event => step_shown && event.status === "success" && event.valid && update_step_status());
    event_registry.on("show_step", e => {
        step_shown = e.step === "identity";
        if(!step_shown) return;

        update_step_status();
    });

    /* the help sequence */
    {
        const container = tag.find(".container-settings-identity-profile");
        const container_help_text = tag.find(".container-help-text");

        const container_profile_list = tag.find(".highlight-profile-list");
        const container_profile_settings = tag.find(".highlight-profile-settings");
        const container_identity_settings = tag.find(".highlight-identity-settings");

        let is_first_show = true;

        event_registry.on("show_step", event => {
            if(!is_first_show || event.step !== "identity") return;
            is_first_show = false;

            container.addClass("help-shown");


            const text = tr( /* @tr-ignore */
                "After you've successfully set upped your microphone,\n" +
                "lets setup some profiles and identities!\n" +
                "\n" +
                "Connect profiles determine, how your're authenticating yourself with the server.\n" +
                "So basically they're your identity.\n" +
                "In the following I'll guid you thru the options and GUI elements.\n" +
                "\n" +
                "To continue click anywhere on the screen."
            );
            set_help_text(text);
            $("body").one('mousedown', event => show_profile_list_help());
        });

        const set_help_text = text => {
            container_help_text.empty();
            text.split("\n").forEach(e => container_help_text.append(e == "" ? $.spawn("br") : $.spawn("a").text(e)));
        };

        const show_profile_list_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container_profile_list.addClass("highlighted");

            const update_position = () => {
                const font_size = parseFloat(getComputedStyle(container_help_text[0]).fontSize);

                const offset = container_profile_list.offset();
                const abs = container.offset();

                container_help_text.css({
                    top: offset.top - abs.top,
                    left: ((offset.left - abs.left) + container_profile_list.outerWidth() + font_size) + "px",
                    right: "1em",
                    bottom: "1em"
                });
            };
            update_position();
            container_help_text.off('resize').on('resize', update_position);

            const text = tr( /* @tr-ignore */
                "You could have as many connect profiles as you want.\n" +
                "All created profiles will be listed here.\n" +
                "\n" +
                "To create a new profile just simply click the blue button \"Create profile\" and enter a profile name.\n" +
                "If you want to delete a profile you've to select that profile and click the delete button.\n" +
                "\n" +
                "By default we're using the \"default\" profile\n" +
                "to connect to any server. o change the default profile\n" +
                "just select the new profile and press the \"select as default\" button.\n" +
                "\n" +
                "To continue click anywhere on the screen."
            );
            set_help_text(text);
            $("body").one('mousedown', event => show_profile_settings_help());
        };

        const show_profile_settings_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container_profile_settings.addClass("highlighted");

            const update_position = () => {
                const font_size = parseFloat(getComputedStyle(container_help_text[0]).fontSize);
                const container_settings_offset = container_profile_settings.offset();
                const right = container_profile_settings.outerWidth() + font_size * 2;
                container_help_text.css({
                    top: container_settings_offset.top - container.offset().top,
                    left: "1em",
                    right: right + "px",
                    bottom: "1em"
                });
            };
            set_help_text(tr( /* @tr-ignore */
                "In the upper left, you'll find the profile settings for the selected profile.\n" +
                "You could give each profile an individual name. You could also specify the default connect nickname here.\n" +
                "\n" +
                "The last option \"Identity Type\" determines on what your identity is based on.\n" +
                "TeaSpeak has two possibilities to identify yourself:\n" +
                "1. Identify yourself by your TeaSpeak forum account\n" +
                "2. Identify by an own generated cryptographic identity\n" +
                "The second methods is also known as a TeamSpeak 3 identity.\n" +
                "\n" +
                "To continue click anywhere on the screen."
            ));
            update_position();
            container_help_text.off('resize').on('resize', update_position);

            $("body").one('mousedown', event => show_identity_settings_help());
        };

        const show_identity_settings_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container_identity_settings.addClass("highlighted");

            const update_position = () => {
                const font_size = parseFloat(getComputedStyle(container_help_text[0]).fontSize);
                const container_identity_offset = container_identity_settings.offset();
                const right = container_profile_settings.outerWidth() + font_size * 2;
                container_help_text.css({
                    top: container_identity_offset.top - container.offset().top,
                    left: "1em",
                    right: right + "px",
                    bottom: "1em"
                });
            };
            set_help_text(tr( /* @tr-ignore */
                "When selecting an identify type, some corresponding will pop up in the highlighted area.\n" +
                "\n" +
                "But don't worry, we've already generated\n" +
                "a cryptographic identity for you!\n" +
                "So you don't have to change anything before you start."
            ));
            update_position();
            container_help_text.off('resize').on('resize', update_position);

            $("body").one('mousedown', event => hide_help());
        };

        const hide_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container.addClass("hide-help");
            setTimeout(() => container.removeClass("help-shown"), 1000);
            container_help_text.off('resize');

            help_animation_done = true;
            update_step_status();
        };
    }
}

function initializeStepMicrophone(tag: JQuery, event_registry: Registry<emodal.newcomer>, modal: Modal) {
    const microphone_events = new Registry<emodal.settings.microphone>();
    //microphone_events.enable_debug("settings-microphone");
    modal_settings.initialize_audio_microphone_controller(microphone_events);
    modal_settings.initialize_audio_microphone_view(tag, microphone_events);
    modal.close_listener.push(() => microphone_events.fire_async("deinitialize"));

    let help_animation_done = false;
    const update_step_status = () => event_registry.fire_async("step-status", { next_button: help_animation_done, previous_button: help_animation_done });
    event_registry.on("show_step", e => {
        if(e.step !== "microphone") return;

        update_step_status();
    });

    /* the help sequence */
    {
        const container = tag.find(".container-settings-audio-microphone");
        const container_help_text = tag.find(".container-help-text");

        const container_profile_list = tag.find(".highlight-microphone-list");
        const container_profile_settings = tag.find(".highlight-microphone-settings");

        let is_first_show = true;
        event_registry.on("show_step", event => {
            if(!is_first_show || event.step !== "microphone") return;
            is_first_show = false;

            container.addClass("help-shown");
            const text = tr( /* @tr-ignore */
                "Firstly we need to setup a microphone.\n" +
                "Let me guide you thru the basic UI elements.\n" +
                "\n" +
                "To continue click anywhere on the screen."
            );
            set_help_text(text);
            $("body").one('mousedown', event => show_microphone_list_help());
        });

        const set_help_text = text => {
            container_help_text.empty();
            text.split("\n").forEach(e => container_help_text.append(e == "" ? $.spawn("br") : $.spawn("a").text(e)));
        };

        const show_microphone_list_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container_profile_list.addClass("highlighted");

            const update_position = () => {
                const font_size = parseFloat(getComputedStyle(container_help_text[0]).fontSize);

                const offset = container_profile_list.offset();
                const abs = container.offset();

                container_help_text.css({
                    top: offset.top - abs.top,
                    left: ((offset.left - abs.left) + container_profile_list.outerWidth() + font_size) + "px",
                    right: "1em",
                    bottom: "1em"
                });
            };
            update_position();
            container_help_text.off('resize').on('resize', update_position);

            const text = tr( /* @tr-ignore */
                "All your available microphones are listed within this box.\n" +
                "\n" +
                "The currently selected microphone\n" +
                "is marked with a green checkmark. To change the selected microphone\n" +
                "just click on the new one.\n" +
                "\n" +
                "To continue click anywhere on the screen."
            );
            set_help_text(text);
            $("body").one('mousedown', event => show_microphone_settings_help());
        };

        const show_microphone_settings_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container_profile_settings.addClass("highlighted");

            const update_position = () => {
                const font_size = parseFloat(getComputedStyle(container_help_text[0]).fontSize);
                const container_settings_offset = container_profile_settings.offset();
                const right = container_profile_settings.outerWidth() + font_size * 2;
                container_help_text.css({
                    top: container_settings_offset.top - container.offset().top,
                    left: "1em",
                    right: right + "px",
                    bottom: "1em"
                });
            };

            container_help_text.empty();
            container_help_text.append($.spawn("div").addClass("help-microphone-settings").append(
                $.spawn("a").text(tr("On the right side you'll find all microphone settings.")),
                $.spawn("br"),
                $.spawn("a").text("TeaSpeak has three voice activity detection types:"),
                $.spawn("ol").append(
                    $.spawn("li").addClass("vad-type").append(
                        $.spawn("a").addClass("title").text(tr("Push to Talk")),
                        $.spawn("a").addClass("description").html(tr( /* @tr-ignore */
                            "To transmit audio data you'll have to<br>" +
                            "press a key. The key could be selected " +
                            "via the button right to the radio button."
                        ))
                    ),
                    $.spawn("li").addClass("vad-type").append(
                        $.spawn("a").addClass("title").text(tr("Voice activity detection")),
                        $.spawn("a").addClass("description").html(tr( /* @tr-ignore */
                            "In this mode, TeaSpeak will continuously analyze your microphone input. " +
                            "If the audio level is grater than a certain threshold, " +
                            "the audio will be transmitted. " +
                            "The threshold is changeable via the \"Sensitivity Settings\" slider."
                        ))
                    ),
                    $.spawn("li").addClass("vad-type").append(
                        $.spawn("a").addClass("title").html(tr("Always active")),
                        $.spawn("a").addClass("description").text(tr( /* @tr-ignore */
                            "Continuously transmit any audio data.\n"
                        ))
                    )
                ),
                $.spawn("br"),
                $.spawn("a").text(tr("Now you're ready to configure your microphone. Just click anywhere on the screen."))
            ));
            update_position();
            container_help_text.off('resize').on('resize', update_position);

            $("body").one('mousedown', event => hide_help());
        };

        const hide_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container.addClass("hide-help");
            setTimeout(() => container.removeClass("help-shown"), 1000);
            container_help_text.off('resize');

            help_animation_done = true;
            update_step_status();
        };
    }
}