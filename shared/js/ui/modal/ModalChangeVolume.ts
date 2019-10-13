/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    //TODO: Use the max limit!

    let modal: Modal;
    export function spawnChangeVolume(client: ClientEntry, local: boolean, current: number, max: number | undefined, callback: (number) => void) {
        if(modal) modal.close();

        let new_value: number;
        modal = createModal({
            header: local ? tr("Change local volume") : tr("Change remote volume"),
            body: function () {
                let tag = $("#tmpl_change_volume").renderTag({
                    client: htmltags.generate_client_object({
                        add_braces: false,
                        client_name: client.clientNickName(),
                        client_unique_id: client.properties.client_unique_identifier,
                        client_id: client.clientId()
                    }),
                    local: local
                });

                const container_value = tag.find(".info .value");
                const set_value = value => {
                    const number = value > 100 ? value - 100 : 100 - value;
                    container_value.html((value == 100 ? "&plusmn;" : value > 100 ? "+" : "-") + number + "%");

                    new_value = value / 100;
                    if(local) callback(new_value);
                };
                set_value(current * 100);

                const slider_tag = tag.find(".container-slider");
                const slider = sliderfy(slider_tag, {
                    initial_value: current * 100,
                    step: 1,
                    max_value: 200,
                    min_value: 0,

                    unit: '%'
                });
                slider_tag.on('change', event => set_value(parseInt(slider_tag.attr("value"))));

                tag.find(".button-save").on('click', event => {
                    if(typeof(new_value) !== "undefined") callback(new_value);
                    modal.close();
                });

                tag.find(".button-cancel").on('click', event => {
                    callback(current);
                    modal.close();
                });

                tag.find(".button-reset").on('click', event => {
                    slider.value(100);
                });

                tag.find(".button-apply").on('click', event => {
                    callback(new_value);
                    new_value = undefined;
                });

                return tag.children();
            },
            footer: null,

            width: 600
        });

        modal.close_listener.push(() => modal = undefined);
        modal.open();
        modal.htmlTag.find(".modal-body").addClass("modal-volume");
    }
}