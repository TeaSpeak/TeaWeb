/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function openPlaylistManage(client: ConnectionHandler, playlist: Playlist) {
        let modal = createModal({
            header: tr(tr("Playlist Manage")),
            body:  () => $("#tmpl_playlist_manage").renderTag().children(),
            footer: null,

            width: "",
            closeable: false
        });

        //TODO!

        modal.open();

    }
}