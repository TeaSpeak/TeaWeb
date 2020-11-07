import {createModal, Modal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import {modal as emodal, Registry} from "tc-shared/events";
import {modal_settings} from "tc-shared/ui/modal/ModalSettings";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {initialize_audio_microphone_controller, MicrophoneSettingsEvents} from "tc-shared/ui/modal/settings/Microphone";
import {MicrophoneSettings} from "tc-shared/ui/modal/settings/MicrophoneRenderer";
import * as React from "react";
import * as ReactDOM from "react-dom";

export interface EventModalNewcomer {
    "show_step": {
        "step": "welcome" | "microphone" | "identity" | "finish"
    },
    "exit_guide": {
        ask_yesno: boolean
    },
    "modal-shown": {},

    "action-next-help": {},
    "step-status": {
        allowNextStep: boolean,
        allowPreviousStep: boolean
    }
}

const next_step: { [key: string]: string } = {
    "welcome": "microphone",
    //"microphone": app.is_web() ? "identity" : "speaker", /* speaker setup only for the native client! */
    "microphone": "identity",
    "speaker": "identity",
    "identity": "finish"
};
const last_step: { [key: string]: string } = (() => {
    const result = {};
    for (const key of Object.keys(next_step))
        if (!result[next_step[key]])
            result[next_step[key]] = key;
    return result;
})();

export function openModalNewcomer(): Modal {
    let modal = createModal({
        header: tra("Welcome to the {}", __build.version === "web" ? "TeaSpeak - Web client" : "TeaSpeak - Client"),
        body: () => $("#tmpl_newcomer").renderTag({
            is_web: __build.version === "web"
        }).children(),
        footer: null,

        width: "",
        closeable: false
    });

    const event_registry = new Registry<EventModalNewcomer>();
    event_registry.enableDebug("newcomer");

    modal.htmlTag.find(".modal-body").addClass("modal-newcomer");

    initializeBasicFunctionality(modal.htmlTag, event_registry);
    initializeStepWelcome(modal.htmlTag.find(".container-body .step.step-welcome"), event_registry);
    initializeStepIdentity(modal.htmlTag.find(".container-body .step.step-identity"), event_registry);
    initializeStepMicrophone(modal.htmlTag.find(".container-body .step.step-microphone"), event_registry, modal);
    initializeStepFinish(modal.htmlTag.find(".container-body .step.step-finish"), event_registry);

    event_registry.on("exit_guide", event => {
        if (event.ask_yesno) {
            spawnYesNo(tr("Are you sure?"), tr("Do you really want to skip the basic setup guide?"), result => {
                if (result)
                    event_registry.fire("exit_guide", {ask_yesno: false});
            });
        } else {
            modal.close();
        }
    });

    event_registry.fire("show_step", {step: "welcome"});
    modal.open();
    event_registry.fire_react("modal-shown");
    return modal;
}

function initializeBasicFunctionality(tag: JQuery, event_registry: Registry<EventModalNewcomer>) {
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
        let allowNextStep = true;

        button_last_step.on('click', () => {
            if (last_step[current_step])
                event_registry.fire("show_step", {step: last_step[current_step] as any});
            else
                event_registry.fire("exit_guide", {ask_yesno: true});
        });

        let current_step;
        button_next_step.on('click', event => {
            if (!allowNextStep) {
                event_registry.fire("action-next-help");
                return;
            }

            if (next_step[current_step]) {
                event_registry.fire("show_step", {step: next_step[current_step] as any});
            } else {
                event_registry.fire("exit_guide", {ask_yesno: false});
            }
        });

        event_registry.on("show_step", event => {
            current_step = event.step;
            button_next_step.text(next_step[current_step] ? tr("Next step") : tr("Finish guide"));
            button_last_step.text(last_step[current_step] ? tr("Last step") : tr("Skip guide"));
        });

        event_registry.on("show_step", () => button_next_step.prop("disabled", false));
        event_registry.on("show_step", () => button_last_step.prop("disabled", true));

        event_registry.on("step-status", event => allowNextStep = event.allowNextStep);
        event_registry.on("step-status", event => button_last_step.prop("disabled", !event.allowPreviousStep));
    }
}

function initializeStepWelcome(tag: JQuery, event_registry: Registry<EventModalNewcomer>) {
    event_registry.on("show_step", e => {
        if (e.step !== "welcome") return;

        event_registry.fire_react("step-status", {allowNextStep: true, allowPreviousStep: true});
    });
}

function initializeStepFinish(tag: JQuery, event_registry: Registry<EventModalNewcomer>) {
    event_registry.on("show_step", e => {
        if (e.step !== "finish") return;

        event_registry.fire_react("step-status", {allowNextStep: true, allowPreviousStep: true});
    });
}

function initializeStepIdentity(tag: JQuery, event_registry: Registry<EventModalNewcomer>) {
    const profile_events = new Registry<emodal.settings.profiles>();
    profile_events.enableDebug("settings-identity");
    modal_settings.initialize_identity_profiles_controller(profile_events);
    modal_settings.initialize_identity_profiles_view(tag, profile_events, {forum_setuppable: false});

    let stepShown = false;
    let help_animation_done = false;
    const update_step_status = () => {
        event_registry.fire_react("step-status", {
            allowNextStep: help_animation_done,
            allowPreviousStep: help_animation_done
        });
    };
    profile_events.on("query-profile-validity-result", event => stepShown && event.status === "success" && event.valid && update_step_status());
    event_registry.on("show_step", e => {
        stepShown = e.step === "identity";
        if (!stepShown) return;

        update_step_status();
    });

    /* the help sequence */
    {
        const container = tag.find(".container-settings-identity-profile");
        const container_help_text = tag.find(".container-help-text");

        const container_profile_list = tag.find(".highlight-profile-list");
        const container_profile_settings = tag.find(".highlight-profile-settings");
        const container_identity_settings = tag.find(".highlight-identity-settings");

        let helpStep = 0;

        const set_help_text = text => {
            container_help_text.empty();
            text.split("\n").forEach(e => container_help_text.append(e == "" ? $.spawn("br") : $.spawn("a").text(e)));
        };

        event_registry.on("show_step", event => {
            if (helpStep > 0 || event.step !== "identity") {
                document.body.removeEventListener("mousedown", listenerClick);
                return;
            }

            document.body.addEventListener("mousedown", listenerClick);
            steps[helpStep++]();
        });

        const show_initial_help = () => {
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
            container.addClass("help-shown");
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
        };

        const hide_help = () => {
            container.find(".highlighted").removeClass("highlighted");
            container.addClass("hide-help");
            setTimeout(() => container.removeClass("help-shown"), 1000);
            container_help_text.off('resize');

            help_animation_done = true;
        };

        const steps = [
            show_initial_help,
            show_profile_list_help,
            show_profile_settings_help,
            show_identity_settings_help,
            hide_help
        ];

        const listenerClick = () => event_registry.fire("action-next-help");
        event_registry.on("action-next-help", () => {
            if (!stepShown) {
                return;
            }

            const fn = steps[helpStep++];
            if (typeof fn === "function") {
                fn();
            }
            update_step_status();
            document.body.addEventListener("mousedown", listenerClick);
        });
    }
}

function initializeStepMicrophone(tag: JQuery, event_registry: Registry<EventModalNewcomer>, modal: Modal) {
    let helpStep = 0;
    let stepShown = false;

    const settingEvents = new Registry<MicrophoneSettingsEvents>();
    settingEvents.on("query_help", () => settingEvents.fire_react("notify_highlight", {field: helpStep <= 2 ? ("hs-" + helpStep) as any : undefined}));
    settingEvents.on("action_help_click", () => {
        if (!stepShown) {
            return;
        }

        helpStep++;
        settingEvents.fire("query_help");

        event_registry.fire_react("step-status", {allowNextStep: helpStep > 2, allowPreviousStep: helpStep > 2})
    });
    event_registry.on("action-next-help", () => settingEvents.fire("action_help_click"));

    initialize_audio_microphone_controller(settingEvents);
    ReactDOM.render(<MicrophoneSettings events={settingEvents}/>, tag[0]);

    modal.close_listener.push(() => {
        settingEvents.fire("notify_destroy");
        ReactDOM.unmountComponentAtNode(tag[0]);
    });


    event_registry.on("show_step", event => {
        stepShown = event.step === "microphone";
        if (!stepShown) {
            return;
        }

        event_registry.fire_react("step-status", {allowNextStep: helpStep > 2, allowPreviousStep: helpStep > 2});
    });
}