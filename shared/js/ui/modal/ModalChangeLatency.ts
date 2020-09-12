import {createModal, Modal} from "tc-shared/ui/elements/Modal";
import {ClientEntry} from "tc-shared/tree/Client";
import {Slider, sliderfy} from "tc-shared/ui/elements/Slider";
import * as htmltags from "tc-shared/ui/htmltags";
import {VoicePlayerLatencySettings} from "tc-shared/voice/VoicePlayer";

let modalInstance: Modal;
export function spawnChangeLatency(client: ClientEntry, current: VoicePlayerLatencySettings, reset: () => VoicePlayerLatencySettings, apply: (settings: VoicePlayerLatencySettings) => void, callback_flush?: () => any) {
    if(modalInstance) {
        modalInstance.close();
    }

    const begin = Object.assign({}, current);
    current = Object.assign({}, current);

    modalInstance = createModal({
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
                const valid = current.minBufferTime < current.maxBufferTime;

                modalInstance.htmlTag.find(".modal-body").toggleClass("modal-red", !valid);
                modalInstance.htmlTag.find(".modal-body").toggleClass("modal-green", valid);

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
                    initial_value: current.minBufferTime,
                    step: 20,
                    max_value: 1000,
                    min_value: 0,

                    unit: 'ms'
                });
                slider_tag.on('change', event => {
                    current.minBufferTime = parseInt(slider_tag.attr("value"));
                    tag_value.text(current.minBufferTime + "ms");
                    update_value();
                });

                tag_value.text(current.minBufferTime + "ms");
            }

            {
                const container = tag.find(".container-max");
                const tag_value = container.find(".value");

                const slider_tag = container.find(".container-slider");
                slider_max = sliderfy(slider_tag, {
                    initial_value: current.maxBufferTime,
                    step: 20,
                    max_value: 1020,
                    min_value: 20,

                    unit: 'ms'
                });

                slider_tag.on('change', event => {
                    current.maxBufferTime = parseInt(slider_tag.attr("value"));
                    tag_value.text(current.maxBufferTime + "ms");
                    update_value();
                });

                tag_value.text(current.maxBufferTime + "ms");
            }
            setTimeout(update_value, 0);

            tag.find(".button-close").on('click', event => {
                modalInstance.close();
            });

            tag.find(".button-cancel").on('click', event => {
                apply(begin);
                modalInstance.close();
            });

            tag.find(".button-reset").on('click', event => {
                current = Object.assign({}, reset());
                slider_max.value(current.maxBufferTime);
                slider_min.value(current.minBufferTime);
            });

            tag.find(".button-flush").on('click', event => callback_flush());

            return tag.children();
        },
        footer: null,

        width: 600
    });

    modalInstance.close_listener.push(() => modalInstance = undefined);
    modalInstance.open();
    modalInstance.htmlTag.find(".modal-body").addClass("modal-latency");
}