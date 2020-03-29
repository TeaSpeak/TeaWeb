/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    const avatar_to_uid = (id: string) => {
        const buffer = new Uint8Array(id.length / 2);
        for(let index = 0; index < id.length; index += 2) {
            const upper_nibble = id.charCodeAt(index) - 97;
            const lower_nibble = id.charCodeAt(index + 1) - 97;
            buffer[index / 2] = (upper_nibble << 4) | lower_nibble;
        }
        return base64_encode_ab(buffer);
    };

    export const human_file_size = (size: number) => {
        if(size < 1000)
            return size + "B";
        const exp = Math.floor(Math.log2(size) / 10);
        return (size / Math.pow(1024, exp)).toFixed(2) + 'KMGTPE'.charAt(exp - 1) + "iB";
    };

    export function spawnAvatarList(client: ConnectionHandler) {
        const modal = createModal({
            header: tr("Avatars"),
            footer: undefined,
            body: () => {
                const template = $("#tmpl_avatar_list").renderTag({});

                return template;
            }
        });

        let callback_download: () => any;
        let callback_delete: () => any;

        const button_download = modal.htmlTag.find(".button-download");
        const button_delete = modal.htmlTag.find(".button-delete");
        const container_list = modal.htmlTag.find(".container-list .list-entries-container");
        const list_entries = container_list.find(".list-entries");
        const container_info = modal.htmlTag.find(".container-info");
        const overlay_no_user = container_info.find(".disabled-overlay").show();

        const set_selected_avatar = (unique_id: string, avatar_id: string, size: number) => {
            button_download.prop("disabled", true);
            callback_download = undefined;
            if(!unique_id) {
                overlay_no_user.show();
                return;
            }

            const tag_username = container_info.find(".property-username");
            const tag_unique_id = container_info.find(".property-unique-id");
            const tag_avatar_id = container_info.find(".property-avatar-id");
            const container_avatar = container_info.find(".container-image");
            const tag_image_bytes = container_info.find(".property-image-size");
            const tag_image_width = container_info.find(".property-image-width").val(tr("loading..."));
            const tag_image_height = container_info.find(".property-image-height").val(tr("loading..."));
            const tag_image_type = container_info.find(".property-image-type").val(tr("loading..."));

            tag_username.val("unknown");
            tag_unique_id.val(unique_id);
            tag_avatar_id.val(avatar_id);
            tag_image_bytes.val(size);

            container_avatar.empty().append(client.fileManager.avatars.generate_tag(avatar_id, undefined, {
                callback_image: image => {
                    tag_image_width.val(image[0].naturalWidth + 'px');
                    tag_image_height.val(image[0].naturalHeight + 'px');
                },
                callback_avatar: avatar => {
                    tag_image_type.val(media_image_type(avatar.type));
                    button_download.prop("disabled", false);

                    callback_download = () => {
                        const element = $.spawn("a")
                            .text("download")
                            .attr("href", avatar.url)
                            .attr("download", "avatar-" + unique_id + "." + media_image_type(avatar.type, true))
                            .css("display", "none")
                            .appendTo($("body"));
                        element[0].click();
                        element.remove();
                    };
                }
            }));

            callback_delete = () => {
                spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this avatar?"), result => {
                    if(result) {
                        createErrorModal(tr("Not implemented"), tr("Avatar delete hasn't implemented yet")).open();
                        //TODO Implement avatar delete
                    }
                });
            };
            overlay_no_user.hide();
        };
        set_selected_avatar(undefined, undefined, 0);

        const update_avatar_list = () => {
            const template_entry = $("#tmpl_avatar_list-list_entry");
            list_entries.empty();

            client.fileManager.requestFileList("/").then(files => {
                const username_resolve: {[unique_id: string]:((name:string) => any)[]} = {};
                for(const entry of files) {
                    const avatar_id = entry.name.substr('avatar_'.length);
                    const unique_id = avatar_to_uid(avatar_id);

                    const tag = template_entry.renderTag({
                        username: 'loading',
                        unique_id: unique_id,
                        size: human_file_size(entry.size),
                        timestamp: moment(entry.datetime * 1000).format('YY-MM-DD HH:mm')
                    });

                    (username_resolve[unique_id] || (username_resolve[unique_id] = [])).push(name => {
                        const tag_username = tag.find(".column-username").empty();
                        if(name) {
                            tag_username.append(ClientEntry.chatTag(0, name, unique_id, false));
                        } else {
                            tag_username.text("unknown");
                        }
                    });
                    list_entries.append(tag);

                    tag.on('click', () => {
                        list_entries.find('.selected').removeClass('selected');
                        tag.addClass('selected');

                        set_selected_avatar(unique_id, avatar_id, entry.size);
                    });
                }

                if(container_list.hasScrollBar())
                    container_list.addClass("scrollbar");

                client.serverConnection.command_helper.info_from_uid(...Object.keys(username_resolve)).then(result => {
                    for(const info of result) {
                        username_resolve[info.client_unique_id].forEach(e => e(info.client_nickname));
                        delete username_resolve[info.client_unique_id];
                    }
                    for(const uid of Object.keys(username_resolve)) {
                        (username_resolve[uid] || []).forEach(e => e(undefined));
                    }
                }).catch(error => {
                    log.error(LogCategory.GENERAL, tr("Failed to fetch usernames from avatar names. Error: %o"), error);
                    createErrorModal(tr("Failed to fetch usernames"), tr("Failed to fetch usernames related to their avatar names"), undefined).open();
                })
            }).catch(error => {
                //TODO: Display no perms error
                log.error(LogCategory.GENERAL, tr("Failed to receive avatar list. Error: %o"), error);
                createErrorModal(tr("Failed to list avatars"), tr("Failed to receive avatar list."), undefined).open();
            });
        };

        button_download.on('click', () => (callback_download || (() => {}))());
        button_delete.on('click', () => (callback_delete || (() => {}))());
        setTimeout(() => update_avatar_list(), 250);
        modal.open();
    }
}