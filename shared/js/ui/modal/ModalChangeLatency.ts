import {createModal, Modal} from "tc-shared/ui/elements/Modal";
import {ClientEntry} from "tc-shared/ui/client";
import {Slider, sliderfy} from "tc-shared/ui/elements/Slider";
import * as htmltags from "tc-shared/ui/htmltags";
import {LatencySettings} from "tc-shared/connection/VoiceConnection";

let modal: Modal;
export function spawnChangeLatency(client: ClientEntry, current: LatencySettings, reset: () => LatencySettings, apply: (settings: LatencySettings) => any, callback_flush?: () => any) {
    if(modal) modal.close();

    const begin = Object.assign({}, current);
    current = Object.assign({}, current);

    modal = createModal({
        header: tr("Change playback latency"),
        body: function () {
            let tag = $("#tmpl_change_latency").renderTag({
                client: htmltags.generate_client_object({
                    add_braces: false,
                    client_name: client.clientNickName(),
                    client_unique_id: client.properties.client_unique_identifier,
                    client_id: client.clientId()
                }),

                have_flush: (typeof(callback_flush) === "function")
            });

            const update_value = () => {
                const valid = current.min_buffer < current.max_buffer;

                modal.htmlTag.find(".modal-body").toggleClass("modal-red", !valid);
                modal.htmlTag.find(".modal-body").toggleClass("modal-green", valid);

                if(!valid)
                    return;

                apply(current);
            };

            let slider_min: Slider, slider_max: Slider;
            {
                const container = tag.find(".container-min");
                const tag_value = container.find(".value");

                const slider_tag = container.find(".container-slider");
                slider_min = sliderfy(slider_tag, {
                    initial_value: current.min_buffer,
                    step: 20,
                    max_value: 1000,
                    min_value: 0,

                    unit: 'ms'
                });
                slider_tag.on('change', event => {
                    current.min_buffer = parseInt(slider_tag.attr("value"));
                    tag_value.text(current.min_buffer + "ms");
                    update_value();
                });

                tag_value.text(current.min_buffer + "ms");
            }

            {
                const container = tag.find(".container-max");
                const tag_value = container.find(".value");

                const slider_tag = container.find(".container-slider");
                slider_max = sliderfy(slider_tag, {
                    initial_value: current.max_buffer,
                    step: 20,
                    max_value: 1020,
                    min_value: 20,

                    unit: 'ms'
                });

                slider_tag.on('change', event => {
                    current.max_buffer = parseInt(slider_tag.attr("value"));
                    tag_value.text(current.max_buffer + "ms");
                    update_value();
                });

                tag_value.text(current.max_buffer + "ms");
            }
            setTimeout(update_value, 0);

            tag.find(".button-close").on('click', event => {
                modal.close();
            });

            tag.find(".button-cancel").on('click', event => {
                apply(begin);
                modal.close();
            });

            tag.find(".button-reset").on('click', event => {
                current = Object.assign({}, reset());
                slider_max.value(current.max_buffer);
                slider_min.value(current.min_buffer);
            });

            tag.find(".button-flush").on('click', event => callback_flush());

            return tag.children();
        },
        footer: null,

        width: 600
    });

    modal.close_listener.push(() => modal = undefined);
    modal.open();
    modal.htmlTag.find(".modal-body").addClass("modal-latency");
}