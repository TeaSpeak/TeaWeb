/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    let global_modal: PokeModal;

    interface ServerEntry {
        source: ConnectionHandler;
        add_message(invoker: PokeInvoker, message: string);
    }

    class PokeModal {
        private _handle: Modal;
        private source_map: ServerEntry[] = [];

        constructor() {
            this._handle = createModal({
                header: tr("You have been poked!"),
                body: () => {
                    let template = $("#tmpl_poke_popup").renderTag();
                    template.find(".button-close").on('click', event => this._handle_close());
                    return template;
                },
                footer: undefined,
                width: 750
            });
            this._handle.close_listener.push(() => this._handle_close());
        }

        modal() { return this._handle; }
        add_poke(source: ConnectionHandler, invoker: PokeInvoker, message: string) {
            let handler: ServerEntry;
            for(const entry of this.source_map)
                if(entry.source === source) {
                    handler = entry;
                    break;
                }
            if(!handler) {
                const html_tag = $.spawn("div").addClass("server");
                const poke_list = $.spawn("div").addClass("poke-list");
                $.spawn("div")
                    .addClass("server-name")
                    .text(source && source.channelTree && source.channelTree.server ? source.channelTree.server.properties.virtualserver_name : "unknown")
                    .appendTo(html_tag);
                poke_list.appendTo(html_tag);

                this.source_map.push(handler = {
                    source: source,
                    add_message: (invoker: PokeInvoker, message: string) => {
                        const container = $.spawn("div").addClass("entry");

                        $.spawn("div").addClass("date").text(moment().format("HH:mm:ss") + " - ").appendTo(container);
                        $.spawn("div").addClass("user").append($(htmltags.generate_client({
                            add_braces: true,
                            client_id: invoker.id,
                            client_name: invoker.name,
                            client_unique_id: invoker.unique_id
                        }))).appendTo(container);
                        if(message) {
                            $.spawn("div").addClass("text").text(tr("pokes you:")).appendTo(container);
                            $.spawn("div").addClass("poke-message").append(...MessageHelper.bbcode_chat(message)).appendTo(container);
                        } else {
                            $.spawn("div").addClass("text").text(tr("pokes you.")).appendTo(container);
                        }

                        container.appendTo(poke_list);
                    }
                });

                this._handle.htmlTag.find(".container-servers").append(html_tag);
            }
            handler.add_message(invoker, message);
        }

        private _handle_close() {
            this._handle.close();
            global_modal = undefined;
        }
    }

    export type PokeInvoker = {
        name: string,
        id: number,
        unique_id: string
    };

    export function spawnPoke(source: ConnectionHandler, invoker: PokeInvoker, message: string) {
        if(!global_modal)
            global_modal = new PokeModal();
        global_modal.add_poke(source, invoker, message);
        global_modal.modal().open();
    }
}