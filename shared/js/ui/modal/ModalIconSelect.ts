/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    //TODO Upload/delete button
    export function spawnIconSelect(client: ConnectionHandler, callback_icon?: (id: number) => any, selected_icon?: number) {
        selected_icon = selected_icon || 0;

        const modal = createModal({
            header: tr("Icons"),
            footer: undefined,
            body: () => {
                const template = $("#tmpl_icon_select").renderTag({
                    enable_select: !!callback_icon
                });

                return template;
            }
        });

        const button_select = modal.htmlTag.find(".button-select");

        const container_loading = modal.htmlTag.find(".container-loading").hide();
        const container_no_permissions = modal.htmlTag.find(".container-no-permissions").hide();
        const container_error = modal.htmlTag.find(".container-error").hide();
        const selected_container = modal.htmlTag.find(".selected-item-container");

        const update_local_icons = (icons: number[]) => {
            const container_icons = modal.htmlTag.find(".container-icons .container-icons-local");
            container_icons.empty();

            for(const icon_id of icons) {
                const tag = client.fileManager.icons.generateTag(icon_id, {animate: false}).attr('title', "Icon " + icon_id);
                if(callback_icon) {
                    tag.on('click', event => {
                        container_icons.find(".selected").removeClass("selected");
                        tag.addClass("selected");

                        selected_container.empty().append(tag.clone());
                        selected_icon = icon_id;
                        button_select.prop("disabled", false);
                    });
                    tag.on('dblclick', event => {
                        callback_icon(icon_id);
                        modal.close();
                    });
                    if(icon_id == selected_icon)
                        tag.trigger('click');
                }
                tag.appendTo(container_icons);
            }
        };

        const update_remote_icons = () => {
            container_no_permissions.hide();
            container_error.hide();
            container_loading.show();
            const display_remote_error = (error?: string) => {
                if(typeof(error) === "string") {
                    container_error.find(".error-message").text(error);
                    container_error.show();
                } else {
                    container_error.hide();
                }
            };

            client.fileManager.requestFileList("/icons").then(icons => {
                const container_icons = modal.htmlTag.find(".container-icons");
                const container_icons_remote = container_icons.find(".container-icons-remote");
                const container_icons_remote_parent = container_icons_remote.parent();
                container_icons_remote.detach().empty();

                const chunk_size = 50;
                const icon_chunks: FileEntry[][] = [];
                let index = 0;
                while(icons.length > index) {
                    icon_chunks.push(icons.slice(index, index + chunk_size));
                    index += chunk_size;
                }

                const process_next_chunk = () => {
                    const chunk = icon_chunks.pop_front();
                    if(!chunk) return;

                    for(const icon of chunk) {
                        const icon_id = parseInt(icon.name.substr("icon_".length));
                        if(icon_id == NaN) {
                            log.warn(LogCategory.GENERAL, tr("Received an unparsable icon within icon list (%o)"), icon);
                            continue;
                        }
                        const tag = client.fileManager.icons.generateTag(icon_id, {animate: false}).attr('title', "Icon " + icon_id);
                        if(callback_icon) {
                            tag.on('click', event => {
                                container_icons.find(".selected").removeClass("selected");
                                tag.addClass("selected");

                                selected_container.empty().append(tag.clone());
                                selected_icon = icon_id;
                                button_select.prop("disabled", false);
                            });
                            tag.on('dblclick', event => {
                                callback_icon(icon_id);
                                modal.close();
                            });
                            if(icon_id == selected_icon)
                                tag.trigger('click');
                        }
                        tag.appendTo(container_icons_remote);
                    }
                    setTimeout(process_next_chunk, 100);
                };
                process_next_chunk();

                container_icons_remote_parent.append(container_icons_remote);
                container_error.hide();
                container_loading.hide();
                container_no_permissions.hide();
            }).catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.PERMISSION_ERROR) {
                    container_no_permissions.show();
                } else {
                    log.error(LogCategory.GENERAL, tr("Failed to fetch icon list. Error: %o"), error);
                    display_remote_error(tr("Failed to fetch icon list"));
                }
                container_loading.hide();
            });
        };

        update_local_icons([100, 200, 300, 500, 600]);
        update_remote_icons();
        modal.htmlTag.find('.button-reload').on('click', () => update_remote_icons());
        button_select.prop("disabled", true).on('click', () => {
            if(callback_icon) callback_icon(selected_icon);
            modal.close();
        });
        modal.htmlTag.find(".button-select-no-icon").on('click', () => {
            if(callback_icon) callback_icon(0);
            modal.close();
        });
        modal.open();
    }
}