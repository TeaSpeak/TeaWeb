import {createInputModal, createModal, Modal} from "../../ui/elements/Modal";
import {
    Bookmark,
    bookmarks,
    BookmarkType,
    boorkmak_connect,
    create_bookmark,
    create_bookmark_directory,
    delete_bookmark,
    DirectoryBookmark,
    save_bookmark
} from "../../bookmarks";
import {connection_log, Regex} from "../../ui/modal/ModalConnect";
import {availableConnectProfiles} from "../../profiles/ConnectionProfile";
import {spawnYesNo} from "../../ui/modal/ModalYesNo";
import {Settings, settings} from "../../settings";
import * as log from "../../log";
import {LogCategory} from "../../log";
import * as i18nc from "../../i18n/country";
import {formatMessage} from "../../ui/frames/chat";
import {generateIconJQueryTag, getIconManager} from "tc-shared/file/Icons";
import { tr } from "tc-shared/i18n/localize";

export function spawnBookmarkModal() {
    let modal: Modal;
    modal = createModal({
        header: tr("Manage bookmarks"),
        body: () => {
            let template = $("#tmpl_manage_bookmarks").renderTag({});
            let selected_bookmark: Bookmark | DirectoryBookmark | undefined;

            const button_delete = template.find(".button-delete");
            const button_add_folder = template.find(".button-add-folder");
            const button_add_bookmark = template.find(".button-add-bookmark");

            const button_duplicate = template.find(".button-duplicate");
            const button_connect = template.find(".button-connect");
            const button_connect_tab = template.find(".button-connect-tab");

            const label_bookmark_name = template.find(".header .container-name");
            const label_server_address = template.find(".header .container-address");

            const input_bookmark_name = template.find(".input-bookmark-name");
            const input_connect_profile = template.find(".input-connect-profile");

            const input_server_address = template.find(".input-server-address");
            const input_server_password = template.find(".input-server-password");

            const label_server_name = template.find(".server-name");
            const label_server_region = template.find(".server-region");
            const label_last_ping = template.find(".server-ping");
            const label_client_count = template.find(".server-client-count");
            const label_connection_count = template.find(".server-connection-count");

            const update_buttons = () => {
                button_delete.prop("disabled", !selected_bookmark);
                button_connect.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);
                button_connect_tab.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);
                button_duplicate.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);
            };

            const update_connect_info = () => {
                if (selected_bookmark && selected_bookmark.type === BookmarkType.ENTRY) {
                    const entry = selected_bookmark as Bookmark;

                    const history = connection_log.history().find(e => e.address.hostname === entry.server_properties.server_address && e.address.port === entry.server_properties.server_port);
                    if (history) {
                        label_server_name.text(history.name);
                        label_server_region.empty().append(
                            $.spawn("div").addClass("country flag-" + history.country.toLowerCase()),
                            $.spawn("div").text(i18nc.country_name(history.country, tr("Global")))
                        );
                        label_client_count.text(history.clients_online + "/" + history.clients_total);
                        label_connection_count.empty().append(
                            ...formatMessage(tr("You've connected {} times"), $.spawn("div").addClass("connect-count").text(history.total_connection))
                        );
                    } else {
                        label_server_name.text(tr("Unknown"));
                        label_server_region.empty().text(tr("Unknown"));
                        label_client_count.text(tr("Unknown"));
                        label_connection_count.empty().append(
                            ...formatMessage(tr("You {} connected to that server address"), $.spawn("div").addClass("connect-never").text("never"))
                        );
                    }
                    label_last_ping.text(tr("Average ping isn't yet supported"));
                } else {
                    label_server_name.text("--");
                    label_server_region.text("--");
                    label_last_ping.text("--");
                    label_client_count.text("--");
                    label_connection_count.text("--");
                }
            };

            const update_selected = () => {
                input_bookmark_name.prop("disabled", !selected_bookmark);
                input_connect_profile.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);
                input_server_address.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);
                input_server_password.prop("disabled", !selected_bookmark || selected_bookmark.type !== BookmarkType.ENTRY);

                if (selected_bookmark) {
                    input_bookmark_name.val(selected_bookmark.display_name);
                    label_bookmark_name.text(selected_bookmark.display_name);
                }

                if (selected_bookmark && selected_bookmark.type === BookmarkType.ENTRY) {
                    const entry = selected_bookmark as Bookmark;

                    const address = entry.server_properties.server_address + (entry.server_properties.server_port == 9987 ? "" : (":" + entry.server_properties.server_port));
                    label_server_address.text(address);
                    input_server_address.val(address);

                    let profile = input_connect_profile.find("option[value='" + entry.connect_profile + "']");
                    if (profile.length == 0) {
                        log.warn(LogCategory.GENERAL, tr("Failed to find bookmark profile %s. Displaying default one."), entry.connect_profile);
                        profile = input_connect_profile.find("option[value=default]");
                    }
                    profile.prop("selected", true);

                    input_server_password.val(entry.server_properties.server_password_hash || entry.server_properties.server_password ? "WolverinDEV" : "");
                } else {
                    input_server_password.val("");
                    input_server_address.val("");
                    input_connect_profile.find("option[value='no-value']").prop('selected', true);
                    label_server_address.text(" ");
                }

                update_connect_info();
            };

            const container_bookmarks = template.find(".container-bookmarks");
            const update_bookmark_list = (_current_selected: string) => {
                container_bookmarks.empty();
                selected_bookmark = undefined;
                update_selected();

                const hide_links: boolean[] = [];
                const build_entry = (entry: Bookmark | DirectoryBookmark, sibling_data: { first: boolean; last: boolean; }, index: number) => {
                    let container = $.spawn("div")
                        .addClass(entry.type === BookmarkType.ENTRY ? "bookmark" : "directory")
                        .addClass(index > 0 ? "linked" : "")
                        .addClass(sibling_data.first ? "link-start" : "");
                    for (let i = 0; i < index; i++) {
                        container.append(
                            $.spawn("div")
                                .addClass("link")
                                .addClass(i + 1 === index ? " connected" : "")
                                .addClass(hide_links[i + 1] ? "hidden" : "")
                        );
                    }

                    if (entry.type === BookmarkType.ENTRY) {
                        const bookmark = entry as Bookmark;
                        container.append(
                            bookmark.last_icon_id && bookmark.last_icon_server_id ?
                                generateIconJQueryTag(getIconManager().resolveIcon(bookmark.last_icon_id, bookmark.last_icon_server_id), {animate: false}) :
                                $.spawn("div").addClass("icon-container icon_em")
                        );
                    } else {
                        container.append(
                            $.spawn("div").addClass("icon-container icon_em client-folder")
                        );
                    }

                    container.append(
                        $.spawn("div").addClass("name").attr("title", entry.display_name).text(entry.display_name)
                    );

                    container.appendTo(container_bookmarks);
                    container.on('click', () => {
                        if (selected_bookmark === entry)
                            return;

                        selected_bookmark = entry;
                        container_bookmarks.find(".selected").removeClass("selected");
                        container.addClass("selected");
                        update_buttons();
                        update_selected();
                    });
                    if (entry.unique_id === _current_selected)
                        container.trigger('click');

                    hide_links.push(sibling_data.last);
                    let cindex = 0;
                    const children = (entry as DirectoryBookmark).content || [];
                    for (const child of children)
                        build_entry(child, {first: cindex++ == 0, last: cindex == children.length}, index + 1);
                    hide_links.pop();
                };

                let cindex = 0;
                const children = bookmarks().content;
                for (const bookmark of children)
                    build_entry(bookmark, {first: cindex++ == 0, last: cindex == children.length}, 0);
            };

            /* generate profile list */
            {
                input_connect_profile.append(
                    $.spawn("option")
                        .attr("value", "no-value")
                        .text("")
                        .css("display", "none")
                );
                for (const profile of availableConnectProfiles()) {
                    input_connect_profile.append(
                        $.spawn("option")
                            .attr("value", profile.id)
                            .text(profile.profileName)
                    );
                }
            }

            /* buttons */
            {
                button_delete.on('click', () => {
                    if (!selected_bookmark) return;

                    if (selected_bookmark.type === BookmarkType.DIRECTORY && (selected_bookmark as DirectoryBookmark).content.length > 0) {
                        spawnYesNo(tr("Are you sure"), tr("Do you really want to delete this non empty directory?"), answer => {
                            if (answer) {
                                delete_bookmark(selected_bookmark);
                                save_bookmark(selected_bookmark);
                                update_bookmark_list(undefined);
                            }
                        });
                    } else {
                        delete_bookmark(selected_bookmark);
                        save_bookmark(selected_bookmark);
                        update_bookmark_list(undefined);
                    }
                });

                button_add_folder.on('click', () => {
                    createInputModal(tr("Enter a folder name"), tr("Enter the folder name"), () => {
                        return true;
                    }, result => {
                        if (result) {
                            const mark = create_bookmark_directory(
                                selected_bookmark ?
                                    selected_bookmark.type === BookmarkType.DIRECTORY ?
                                        selected_bookmark as DirectoryBookmark :
                                        selected_bookmark.parent :
                                    bookmarks(),
                                result as string
                            );
                            save_bookmark(mark);
                            update_bookmark_list(mark.unique_id);
                        }
                    }).open();
                });

                button_add_bookmark.on('click', () => {
                    createInputModal(tr("Enter a bookmark name"), tr("Enter the bookmark name"), () => {
                        return true;
                    }, result => {
                        if (result) {
                            const mark = create_bookmark(result as string,
                                selected_bookmark ?
                                    selected_bookmark.type === BookmarkType.DIRECTORY ?
                                        selected_bookmark as DirectoryBookmark :
                                        selected_bookmark.parent :
                                    bookmarks(), {
                                    server_password: "",
                                    server_port: 9987,
                                    server_address: "",
                                    server_password_hash: ""
                                }, "");
                            save_bookmark(mark);
                            update_bookmark_list(mark.unique_id);
                        }
                    }).open();
                });

                button_connect_tab.on('click', () => {
                    boorkmak_connect(selected_bookmark as Bookmark, true);
                    modal.close();
                }).toggle(!settings.static_global(Settings.KEY_DISABLE_MULTI_SESSION));

                button_connect.on('click', () => {
                    boorkmak_connect(selected_bookmark as Bookmark, false);
                    modal.close();
                });

                button_duplicate.on('click', () => {
                    createInputModal(tr("Enter a bookmark name"), tr("Enter the bookmark name for the duplicate"), text => text.length > 0, result => {
                        if (result) {
                            if (!selected_bookmark) return;

                            const original = selected_bookmark as Bookmark;
                            const mark = create_bookmark(result as string,
                                selected_bookmark ?
                                    selected_bookmark.parent :
                                    bookmarks(), original.server_properties, original.nickname);
                            save_bookmark(mark);
                            update_bookmark_list(mark.unique_id);
                        }
                    }).open();
                });
            }

            /* inputs */
            {
                input_bookmark_name.on('change keydown', event => {
                    const name = input_bookmark_name.val() as string;
                    const valid = name.length > 3;
                    input_bookmark_name.firstParent(".input-boxed").toggleClass("is-invalid", !valid);

                    if (event.type === "change" && valid) {
                        selected_bookmark.display_name = name;
                        label_bookmark_name.text(name);
                        save_bookmark(selected_bookmark);
                    }
                });

                input_server_address.on('change keyup', () => {
                    const address = input_server_address.val() as string;
                    const valid = !!address.match(Regex.IP_V4) || !!address.match(Regex.IP_V6) || !!address.match(Regex.DOMAIN);
                    input_server_address.firstParent(".input-boxed").toggleClass("is-invalid", !valid);

                    if (valid) {
                        const entry = selected_bookmark as Bookmark;
                        let _v6_end = address.indexOf(']');
                        let idx = address.lastIndexOf(':');
                        if (idx != -1 && idx > _v6_end) {
                            entry.server_properties.server_port = parseInt(address.substr(idx + 1));
                            entry.server_properties.server_address = address.substr(0, idx);
                        } else {
                            entry.server_properties.server_address = address;
                            entry.server_properties.server_port = 9987;
                        }
                        save_bookmark(selected_bookmark);

                        label_server_address.text(entry.server_properties.server_address + (entry.server_properties.server_port == 9987 ? "" : (":" + entry.server_properties.server_port)));
                        update_connect_info();
                    }
                });

                input_server_password.on("change keydown", () => {
                    const password = input_server_password.val() as string;
                    (selected_bookmark as Bookmark).server_properties.server_password = password;
                    save_bookmark(selected_bookmark);
                });

                input_connect_profile.on('change', () => {
                    const id = input_connect_profile.val() as string;
                    const profile = availableConnectProfiles().find(e => e.id === id);
                    if (profile) {
                        (selected_bookmark as Bookmark).connect_profile = id;
                        save_bookmark(selected_bookmark);
                    } else {
                        log.warn(LogCategory.GENERAL, tr("Failed to change connect profile for profile %s to %s"), selected_bookmark.unique_id, id);
                    }
                })
            }

            /* Arrow key navigation for the bookmark list */
            {
                let _focused = false;
                let _focus_listener;
                let _key_listener;

                _focus_listener = event => {
                    _focused = false;
                    let element = event.target as HTMLElement;
                    while (element) {
                        if (element === container_bookmarks[0]) {
                            _focused = true;
                            break;
                        }
                        element = element.parentNode as HTMLElement;
                    }
                };

                _key_listener = event => {
                    if (!_focused) return;

                    if (event.key.toLowerCase() === "arrowdown") {
                        container_bookmarks.find(".selected").next().trigger('click');
                    } else if (event.key.toLowerCase() === "arrowup") {
                        container_bookmarks.find(".selected").prev().trigger('click');
                    }
                };

                document.addEventListener('click', _focus_listener);
                document.addEventListener('keydown', _key_listener);
                modal.close_listener.push(() => {
                    document.removeEventListener('click', _focus_listener);
                    document.removeEventListener('keydown', _key_listener);
                })
            }


            update_bookmark_list(undefined);
            update_buttons();

            template.find(".button-close").on('click', () => modal.close());
            return template.children();
        },
        footer: undefined,
        width: "40em"
    });

    modal.htmlTag.dividerfy().find(".modal-body").addClass("modal-bookmarks");
    modal.open();
}