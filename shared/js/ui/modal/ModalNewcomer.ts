/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function openModalNewcomer() {
        let modal = createModal({
            header: tra("Welcome to the {}", app.is_web() ? "TeaWeb-Client" : "TeaSpeak-Client"),
            body:  () => $("#tmpl_newcomer").renderTag().children(),
            footer: null,

            width: "",
            closeable: false
        });

        //TODO!

        modal.open();

    }
}