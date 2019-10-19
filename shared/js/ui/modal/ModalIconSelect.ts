/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    export function spawnIconSelect(client: ConnectionHandler, callback_icon?: (id: number) => any, selected_icon?: number) {
        selected_icon = selected_icon || 0;
        let allow_manage = client.permissions.neededPermission(PermissionType.B_ICON_MANAGE).granted(1);

        const modal = createModal({
            header: tr("Icons"),
            footer: undefined,
            body: () => {
                return $("#tmpl_icon_select").renderTag({
                    enable_select: !!callback_icon,

                    enable_upload: allow_manage,
                    enable_delete: allow_manage
                });
            },

            min_width: "20em"
        });

        modal.htmlTag.find(".modal-body").addClass("modal-icon-select");

        const button_select = modal.htmlTag.find(".button-select");
        const button_delete = modal.htmlTag.find(".button-delete").prop("disabled", true);
        const button_upload = modal.htmlTag.find(".button-upload").prop("disabled", !allow_manage);

        const container_loading = modal.htmlTag.find(".container-loading").hide();
        const container_no_permissions = modal.htmlTag.find(".container-no-permissions").hide();
        const container_error = modal.htmlTag.find(".container-error").hide();

        const selected_container = modal.htmlTag.find(".selected-item-container");

        const container_icons = modal.htmlTag.find(".container-icons");
        const container_icons_remote = container_icons.find(".container-icons-remote");
        const container_icons_local = container_icons.find(".container-icons-local");

        const update_local_icons = (icons: number[]) => {
            container_icons_local.empty();

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
                tag.appendTo(container_icons_local);
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
                        if(Number.isNaN(icon_id)) {
                            log.warn(LogCategory.GENERAL, tr("Received an unparsable icon within icon list (%o)"), icon);
                            continue;
                        }
                        const tag = client.fileManager.icons.generateTag(icon_id, {animate: false}).attr('title', "Icon " + icon_id);
                        if(callback_icon || allow_manage) {
                            tag.on('click', event => {
                                container_icons.find(".selected").removeClass("selected");
                                tag.addClass("selected");

                                selected_container.empty().append(tag.clone());
                                selected_icon = icon_id;
                                button_select.prop("disabled", false);
                                button_delete.prop("disabled", !allow_manage);
                            });
                            tag.on('dblclick', event => {
                                if(!callback_icon)
                                    return;

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

        button_delete.on('click', event => {
            if(!selected_icon)
                return;

            const selected = modal.htmlTag.find(".selected");
            if(selected.length != 1)
                console.warn(tr("UI selected icon length does not equal with 1! (%o)"), selected.length);

            if(selected_icon < 1000) return; /* we cant delete local icons */

            client.fileManager.icons.delete_icon(selected_icon).then(() => {
                selected.detach();
            }).catch(error => {
                if(error instanceof CommandResult && error.id == ErrorID.PERMISSION_ERROR)
                    return;
                console.warn(tr("Failed to delete icon %d: %o"), selected_icon, error);

                error = error instanceof CommandResult ? error.extra_message || error.message : error;

                createErrorModal(tr("Failed to delete icon"), tra("Failed to delete icon.<br>Error: ", error)).open();
            });
        });

        button_upload.on('click', event => spawnIconUpload(client));

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

    interface UploadingIcon {
        file: File;
        state: "loading" | "valid" | "error";
        upload_state: "unset" | "uploading" | "uploaded" | "error";

        html_tag?: JQuery;
        image_element?: () => HTMLImageElement;

        loader: Promise<void>;

        upload_icon: () => () => Promise<void>;
        upload_html_tag?: JQuery;

        icon_id: string;
    }

    function handle_icon_upload(file: File, client: ConnectionHandler) : UploadingIcon {
        const icon = {} as UploadingIcon;
        icon.file = file;
        icon.upload_state = "unset";

        const file_too_big = () => {
            console.error(tr("Failed to load file %s: File is too big!"), file.name);
            createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>The given file is too big!", file.name)).open();
            icon.state = "error";
        };
        if(file.size > 1024 * 1024 * 512) {
            file_too_big();
        } else if((file.size | 0) <= 0) {
            console.error(tr("Failed to load file %s: Your browser does not support file sizes!"), file.name);
            createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>Your browser does not support file sizes!", file.name)).open();
            icon.state = "error";
            return;
        } else {
            icon.state = "loading";
            icon.loader = (async () => {
                const reader = new FileReader();

                try {
                    await new Promise((resolve, reject) => {
                        reader.onload = resolve;
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                } catch(error) {
                    console.log("Image failed to load (%o)", error);
                    console.error(tr("Failed to load file %s: Image failed to load"), file.name);
                    createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>Failed to load image", file.name)).open();
                    icon.state = "error";
                    return;
                }

                const result = reader.result as string;
                if(typeof(result) !== "string") {
                    console.error(tr("Failed to load file %s: Result is not an media string (%o)"), file.name, result);
                    createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>Result is not an media string", file.name)).open();
                    icon.state = "error";
                    return;
                }


                /* get the CRC32 sum */
                {
                    if(!result.startsWith("data:image/")) {
                        console.error(tr("Failed to load file %s: Invalid data media type (%o)"), file.name, result);
                        createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>File is not an image", file.name)).open();
                        icon.state = "error";
                        return;
                    }
                    const semi = result.indexOf(';');
                    const type = result.substring(11, semi);
                    console.log(tr("Given image has type %s"), type);
                    if(!result.substr(semi + 1).startsWith("base64,")) {
                        console.error(tr("Failed to load file %s: Mimetype isnt base64 encoded (%o)"), file.name, result.substr(semi + 1));
                        createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.<br>Decoder returned unknown result", file.name)).open();
                        icon.state = "error";
                        return;
                    }

                    const crc = new Crc32();
                    crc.update(arrayBufferBase64(result.substr(semi + 8)));
                    icon.icon_id = crc.digest(10);
                }


                const image = document.createElement("img");
                try {
                    await new Promise((resolve, reject) => {
                        image.onload = resolve;
                        image.onerror = reject;
                        image.src = result;
                    });
                } catch(error) {
                    console.log("Image failed to load (%o)", error);
                    console.error(tr("Failed to load file %s: Image failed to load"), file.name);
                    createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.{:br:}Failed to load image", file.name)).open();
                    icon.state = "error";
                }

                const width_error = message => {
                    console.error(tr("Failed to load file %s: Invalid bounds: %s"), file.name, message);
                    createErrorModal(tr("Icon upload failed"), tra("Failed to upload icon {}.{:br:}Image is too large ({})", file.name, message)).open();
                    icon.state = "error";
                };

                if(!result.startsWith("data:image/svg+xml")) {
                    if(image.naturalWidth > 32 && image.naturalHeight > 32) {
                        width_error("width and height (max 32px). Given: " + image.naturalWidth + "x" + image.naturalHeight);
                        return;
                    }
                    if(image.naturalWidth > 32) {
                        width_error("width (max 32px)");
                        return;
                    }
                    if(image.naturalHeight > 32) {
                        width_error("height (max 32px)");
                        return;
                    }
                }
                console.log("Image loaded (%dx%d) %s (%s)", image.naturalWidth, image.naturalHeight, image.name, icon.icon_id);
                icon.image_element = () => {
                    const image = document.createElement("img");
                    image.src = result;
                    return image;
                };
                icon.state = "valid";
            })();

            icon.upload_icon = () => {
                const create_progress_bar = () => {
                    const html = $.spawn("div").addClass("progress");
                    const indicator = $.spawn("div").addClass("progress-bar bg-success progress-bar-striped progress-bar-animated");
                    const message = $.spawn("div").addClass("progress-message");
                    const set_value = value => {
                        indicator.stop(true, false).animate({width: value + "%"}, 250);
                        if(value === 100)
                            setTimeout(() => indicator.removeClass("progress-bar-striped progress-bar-animated"), 900)
                    };

                    return {
                        html_tag: html.append(indicator).append(message),
                        set_value: set_value,
                        set_message: msg => message.text(msg),
                        set_error: msg => {
                            message.text(tr("error: ") + msg);
                            set_value(100);
                            indicator.removeClass("bg-success").addClass("bg-danger");
                        }
                    }
                };

                const container_image = $.spawn("div").addClass("container-icon");
                const bar = create_progress_bar();

                const set_error = message => {
                    bar.set_value(100);
                    bar.set_message(tr("error: ") + message);
                };

                const html_tag = $.spawn("div")
                        .addClass("upload-entry")
                        .append(container_image)
                        .append(bar.html_tag);

                icon.upload_html_tag = html_tag;

                let icon_added = false;
                if(icon.image_element) {
                    container_image.append(icon.image_element());
                    icon_added = true;
                }


                bar.set_value(0);
                bar.set_value(tr("waiting"));

                return async () => {
                    const time_begin = Date.now();

                    if(icon.state === "loading") {
                        bar.set_message(tr("Awaiting local processing"));
                        await icon.loader;
                        // @ts-ignore Could happen because the loader function updates the state
                        if(icon.state !== "valid") {
                            set_error(tr("local processing failed"));
                            icon.upload_state = "error";
                            return;
                        }
                    } else if(icon.state === "error") {
                        set_error(tr("local processing error"));
                        icon.upload_state = "error";
                        return;
                    }
                    if(!icon_added)
                        container_image.append(icon.image_element());

                    bar.set_value(25);
                    bar.set_message(tr("initializing"));

                    let upload_key: transfer.UploadKey;
                    try {
                        upload_key = await client.fileManager.upload_file({
                            channel: undefined,
                            channel_password: undefined,
                            name: '/icon_' + icon.icon_id,
                            overwrite: false,
                            path: '',
                            size: icon.file.size
                        })
                    } catch(error) {
                        if(error instanceof CommandResult && error.id == ErrorID.FILE_ALREADY_EXISTS) {
                            if(!settings.static_global(Settings.KEY_DISABLE_COSMETIC_SLOWDOWN, false))
                                await new Promise(resolve => setTimeout(resolve, 500 + Math.floor(Math.random() * 500)));
                            bar.set_message(tr("icon already exists"));
                            bar.set_value(100);
                            icon.upload_state = "uploaded";
                            return;
                        }
                        console.error(tr("Failed to initialize upload: %o"), error);
                        bar.set_error(tr("failed to initialize upload"));
                        icon.upload_state = "error";
                        return;
                    }
                    bar.set_value(50);
                    bar.set_message(tr("uploading"));

                    const connection = transfer.spawn_upload_transfer(upload_key);
                    try {
                        await connection.put_data(icon.file)
                    } catch(error) {
                        console.error(tr("Icon upload failed for icon %s: %o"), icon.file.name, error);
                        if(typeof(error) === "string")
                            bar.set_error(tr("upload failed: ") + error);
                        else
                            bar.set_error(tr("upload failed"));
                        icon.upload_state = "error";
                        return;
                    }

                    const time_end = Date.now();
                    if(!settings.static_global(Settings.KEY_DISABLE_COSMETIC_SLOWDOWN, false))
                        await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (time_end - time_begin))));
                    bar.set_value(100);
                    bar.set_message(tr("upload completed"));
                    icon.upload_state = "uploaded";
                };
            };
        }

        return icon;
    }

    export function spawnIconUpload(client: ConnectionHandler) {
        const modal = createModal({
            header: tr("Upload Icons"),
            footer: undefined,
            body: () => $("#tmpl_icon_upload").renderTag(),
            closeable: false,

            min_width: "20em"
        });
        modal.htmlTag.find(".modal-body").addClass("modal-icon-upload");

        const button_upload = modal.htmlTag.find(".button-upload");
        const button_delete = modal.htmlTag.find(".button-remove").prop("disabled", true);
        const button_add = modal.htmlTag.find(".button-add");
        const button_upload_abort = modal.htmlTag.find(".button-upload-abort");
        const input_file = modal.htmlTag.find(".input-file-upload") as JQuery<HTMLInputElement>;
        const container_icons = modal.htmlTag.find(".container-icons");

        let selected_icon: UploadingIcon;
        let icons: UploadingIcon[] = [];

        const update_upload_button = () => {
            const icon_count = icons.filter(e => e.state === "valid").length;
            button_upload.empty();
            tra("Upload icons ({})", icon_count).forEach(e => e.appendTo(button_upload));
            button_upload.prop("disabled", icon_count == 0);
        };
        update_upload_button();

        const add_icon = (icon: UploadingIcon) => {
            icons.push(icon);
            icon.loader.then(e => {
                if(icon.state === "valid") {
                    const image = icon.image_element();
                    const element = $.spawn("div")
                                        .addClass("icon-container")
                                        .append(image);
                    container_icons.append(icon.html_tag = element);

                    element.on('click', event => {
                        container_icons.find(".selected").removeClass("selected");
                        element.addClass("selected");

                        selected_icon = icon;
                        button_delete.prop("disabled", false);
                    });

                    update_upload_button();
                }
            });
        };
        button_delete.on('click', event => {
            if(!selected_icon)
                return;
            icons = icons.filter(e => e !== selected_icon);
            if(selected_icon.html_tag)
                selected_icon.html_tag.detach();
            button_delete.prop("disabled", true);
            update_upload_button();
        });

        button_add.on('click', event => input_file.click());
        input_file.on('change', event => {
            if(input_file[0].files.length > 0) {
                for(let index = 0; index < input_file[0].files.length; index++) {
                    const file = input_file[0].files.item(index);
                    {
                        let duplicate = false;

                        for(const icon of icons)
                            if(icon.file.name === file.name && icon.file.lastModified === file.lastModified && icon.state !== "error") {
                                duplicate = true;
                                break;
                            }
                        if(duplicate)
                            continue;
                    }

                    add_icon(handle_icon_upload(file, client));
                }
            }
        });

        container_icons.on('dragover', ((event: DragEvent) => {
            event.stopPropagation();
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
        }) as any);
        container_icons.on('drop', ((event: DragEvent) => {
            event.stopPropagation();
            event.preventDefault();

            for(let index = 0; index < event.dataTransfer.files.length; index++) {
                const file = event.dataTransfer.files.item(index);
                {
                    let duplicate = false;

                    for(const icon of icons)
                        if(icon.file === file && icon.state !== "error") {
                            duplicate = true;
                            break;
                        }
                    if(duplicate)
                        continue;
                }

                add_icon(handle_icon_upload(file, client));
            }
        }) as any);

        /* upload process */
        {
            const container_upload = modal.htmlTag.find(".container-upload");
            const container_error = container_upload.find(".container-error");
            const container_success = container_upload.find(".container-success");
            const container_process = container_upload.find(".container-process");
            const container_info = container_upload.find(".container-info");
            const container_statistics = container_upload.find(".uploaded-statistics");

            const show_critical_error = message => {
                container_error.find(".error-message").text(message);
                container_error.removeClass("hidden");
            };

            const finish_upload = () => {
                icons = icons.filter(e => {
                    if(e.upload_state === "uploaded") {
                        e.html_tag.detach();
                        return false;
                    }
                    return true;
                });
                update_upload_button();
                button_upload.prop("disabled", false);
                button_upload.prop("disabled", false);
                container_upload.hide();
                container_error.addClass("hidden");
                container_error.addClass("hidden");
                modal.set_closeable(true);
            };


            const execute_upload = async () => {
                if(!client || !client.fileManager) {
                  show_critical_error(tr("Invalid client handle"));
                  return;
                }
                if(!client.connected) {
                  show_critical_error(tr("Not connected"));
                  return;
                }

                let invoke_count = 0;
                let succeed_count = 0;
                let failed_count = 0;

                const uploads = icons.filter(e => e.state !== "error");

                const executes: {icon: UploadingIcon, task: () => Promise<void>}[] = [];
                for(const icon of uploads) {
                    executes.push({
                        icon: icon,
                        task: icon.upload_icon()
                    });

                    if(!icon.upload_html_tag)
                        continue; /* TODO: error? */
                    icon.upload_html_tag.appendTo(container_process);
                }

                const update_state = () => container_statistics.text(invoke_count + " | " + succeed_count + " | " + failed_count);
                for(const execute of executes) {
                    invoke_count++;
                    update_state();
                    try {
                        await execute.task();
                        if(execute.icon.upload_state !== "uploaded")
                            throw "failed";
                        succeed_count++;
                    } catch(error) {
                        failed_count++;
                    }
                    update_state();
                }
                container_info.css({opacity: 1}).animate({opacity: 0}, 250, () => container_info.css({opacity: undefined}).hide());
                container_success.find(".message").html(
                    "Total icons: " + invoke_count + "<br>" +
                    "Succeeded icons: " + succeed_count + "<br>" +
                    "Failed icons: " + failed_count
                );

                container_success.removeClass("hidden");
            };

            button_upload.on('click', event => {
                modal.set_closeable(false);
                button_upload.prop("disabled", true);
                button_delete.prop("disabled", true);
                button_add.prop("disabled", true);
                container_process.empty();
                container_upload.show();
                execute_upload();
            });

            button_upload_abort.on('click', event => finish_upload());

            container_error.addClass("hidden");
            container_success.addClass("hidden");
            container_upload.hide();
        }

        modal.open();
        modal.set_closeable(true);
    }
}