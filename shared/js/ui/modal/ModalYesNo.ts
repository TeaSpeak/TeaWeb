/// <reference path="../../ui/elements/modal.ts" />

namespace Modals {
    export function spawnYesNo(header: BodyCreator, body: BodyCreator, callback: (_: boolean) => any, properties?: {
        text_yes?: string,
        text_no?: string,

        closeable?: boolean;
    }) {
        properties = properties || {};

        const props = ModalFunctions.warpProperties({});
        props.template_properties || (props.template_properties = {});
        props.template_properties.text_yes = properties.text_yes || tr("Yes");
        props.template_properties.text_no = properties.text_no || tr("No");
        props.template = "#tmpl_modal_yesno";

        props.header = header;
        props.template_properties.question = ModalFunctions.jqueriefy(body);

        props.closeable = typeof(properties.closeable) !== "boolean" || properties.closeable;
        const modal = createModal(props);
        let submited = false;
        const button_yes = modal.htmlTag.find(".button-yes");
        const button_no = modal.htmlTag.find(".button-no");

        button_yes.on('click', event => {
            if(!submited) {
                submited = true;
                callback(true);
            }
            modal.close();
        });

        button_no.on('click', event => {
            if(!submited) {
                submited = true;
                callback(false);
            }
            modal.close();
        });

        modal.close_listener.push(() => button_no.trigger('click'));
        modal.open();
        return modal;
    }
}