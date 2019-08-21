namespace Modals {
    export function spawnKeySelect(callback: (key?: ppt.KeyEvent) => void) {
        let modal = createModal({
            header: tr("Select a key"),
            body:  () => $("#tmpl_key_select").renderTag().children(),
            footer: null,

            width: "",
            closeable: false
        });

        const container_key = modal.htmlTag.find(".container-key a");
        const button_save = modal.htmlTag.find(".button-save");
        const button_cancel = modal.htmlTag.find(".button-cancel");

        let current_key;
        const listener = (event: ppt.KeyEvent) => {
            if(event.type === ppt.EventType.KEY_PRESS) {
                //console.log(tr("Key select got key press for %o"), event);
                current_key = event;

                container_key.text(ppt.key_description(event));
                button_save.prop("disabled", false);
            }
        };


        button_save.on('click', () => {
            callback(current_key);
            modal.close();
        }).prop("disabled", true);
        button_cancel.on('click', () => modal.close());

        ppt.register_key_listener(listener);
        modal.close_listener.push(() => ppt.unregister_key_listener(listener));

        modal.htmlTag.find(".modal-body").addClass("modal-keyselect modal-green");
        modal.open();
    }
}