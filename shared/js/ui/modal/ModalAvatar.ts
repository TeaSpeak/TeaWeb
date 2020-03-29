/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    //TODO: Test if we could render this image and not only the browser by knowing the type.
    export function spawnAvatarUpload(callback_data: (data: ArrayBuffer | undefined | null) => any) {
        const modal = createModal({
            header: tr("Avatar Upload"),
            footer: undefined,
            body: () => {
                return $("#tmpl_avatar_upload").renderTag({});
            }
        });

        let _data_submitted = false;
        let _current_avatar;

        modal.htmlTag.find(".button-select").on('click', event => {
            modal.htmlTag.find(".file-inputs").trigger('click');
        });

        modal.htmlTag.find(".button-delete").on('click', () => {
            if(_data_submitted)
                return;
            _data_submitted = true;
            modal.close();
            callback_data(null);
        });

        modal.htmlTag.find(".button-cancel").on('click', () => modal.close());
        const button_upload = modal.htmlTag.find(".button-upload");
        button_upload.on('click', event => (!_data_submitted) && (_data_submitted = true, modal.close(), true) && callback_data(_current_avatar));

        const set_avatar = (data: string | undefined, type?: string) => {
            _current_avatar = data ? arrayBufferBase64(data) : undefined;
            button_upload.prop("disabled", !_current_avatar);
            modal.htmlTag.find(".preview img").attr("src", data ? ("data:image/" + type + ";base64," + data) : "img/style/avatar.png");
        };

        const input_node = modal.htmlTag.find(".file-inputs")[0] as HTMLInputElement;
        input_node.multiple = false;

        modal.htmlTag.find(".file-inputs").on('change', event => {
            console.log("Files: %o", input_node.files);

            const read_file = (file: File) => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);

                reader.readAsDataURL(file);
            });

            (async () => {
                const data = await read_file(input_node.files[0]);

                if(!data.startsWith("data:image/")) {
                    console.error(tr("Failed to load file %s: Invalid data media type (%o)"), input_node.files[0].name, data);
                    createErrorModal(tr("Icon upload failed"), tra("Failed to select avatar {}.<br>File is not an image", input_node.files[0].name)).open();
                    return;
                }
                const semi = data.indexOf(';');
                const type = data.substring(11, semi);
                console.log(tr("Given image has type %s"), type);

                set_avatar(data.substr(semi + 8 /* 8 bytes := base64, */), type);
            })();
        });
        set_avatar(undefined);
        modal.close_listener.push(() => !_data_submitted && callback_data(undefined));
        modal.open();
    }
}