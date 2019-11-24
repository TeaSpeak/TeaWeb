/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function openModalNewcomer() {
        let modal = createModal({
            header: tr("Select a key"),
            body:  () => $("#tmpl_newcomer").renderTag().children(),
            footer: null,

            width: "",
            closeable: false
        });



        modal.open();

    }
}