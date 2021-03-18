import {createModal} from "../../ui/elements/Modal";
import {EventType, getKeyBoard, getKeyDescription, KeyEvent} from "../../PPTListener";
import {tr} from "tc-shared/i18n/localize";

export function spawnKeySelect(callback: (key?: KeyEvent) => void) {
    let modal = createModal({
        header: tr("Select a key"),
        body: () => $("#tmpl_key_select").renderTag().children(),
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
        if (event.type === EventType.KEY_PRESS) {
            //console.log(tr("Key select got key press for %o"), event);
            last_key = current_key;
            current_key = event;
            current_key_age = Date.now();

            container_key.text(getKeyDescription(event));
            button_save.prop("disabled", false);
        }
    };


    button_save.on('click', () => {
        if (__build.version !== "web") {
            /* Because pressing the close button is also a mouse action */
            if (current_key_age + 1000 > Date.now() && current_key.keyCode == "MOUSE1")
                current_key = last_key;
        }

        callback(current_key);
        modal.close();
    }).prop("disabled", true);
    button_cancel.on('click', () => modal.close());

    const keyboard = getKeyBoard();
    keyboard.registerListener(listener);
    modal.close_listener.push(() => keyboard.unregisterListener(listener));

    modal.htmlTag.find(".modal-body").addClass("modal-keyselect modal-green");
    modal.open();
}