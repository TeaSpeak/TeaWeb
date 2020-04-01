import {createModal} from "tc-shared/ui/elements/Modal";
import {EventType, key_description, KeyEvent} from "tc-shared/PPTListener";
import * as loader from "tc-loader";
import * as ppt from "tc-backend/ppt";

export function spawnKeySelect(callback: (key?: KeyEvent) => void) {
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

    let current_key_age: number;
    let last_key: KeyEvent;
    let current_key: KeyEvent;
    const listener = (event: KeyEvent) => {
        if(event.type === EventType.KEY_PRESS) {
            //console.log(tr("Key select got key press for %o"), event);
            last_key = current_key;
            current_key = event;
            current_key_age = Date.now();

            container_key.text(key_description(event));
            button_save.prop("disabled", false);
        }
    };


    button_save.on('click', () => {
        if(__build.version !== "web") {
            /* Because pressing the close button is also a mouse action */
            if(current_key_age + 1000 > Date.now() && current_key.key_code == "MOUSE2")
                current_key = last_key;
        }

        callback(current_key);
        modal.close();
    }).prop("disabled", true);
    button_cancel.on('click', () => modal.close());

    ppt.register_key_listener(listener);
    modal.close_listener.push(() => ppt.unregister_key_listener(listener));

    modal.htmlTag.find(".modal-body").addClass("modal-keyselect modal-green");
    modal.open();
}