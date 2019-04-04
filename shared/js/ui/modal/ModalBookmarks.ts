/// <reference path="../../ui/elements/modal.ts" />
/// <reference path="../../ConnectionHandler.ts" />
/// <reference path="../../proto.ts" />

namespace Modals {
    function bookmark_tag(callback_select: (entry, tag) => any, bookmark: bookmarks.Bookmark | bookmarks.DirectoryBookmark) {
        const tag = $("#tmpl_manage_bookmarks-list_entry").renderTag({
            name: bookmark.display_name,
            type: bookmark.type == bookmarks.BookmarkType.DIRECTORY ? "directory" : "bookmark"
        });
        tag.find(".name").on('click', () => {
            callback_select(bookmark, tag);
            tag.addClass("selected");
        });

        if(bookmark.type == bookmarks.BookmarkType.DIRECTORY) {
            const casted = <bookmarks.DirectoryBookmark>bookmark;
            for(const member of casted.content)
                tag.find("> .members").append(bookmark_tag(callback_select, member));
        }

        return tag;
    }

    function parent_tag(select_tag: JQuery, prefix: string, bookmark: bookmarks.Bookmark | bookmarks.DirectoryBookmark) {
        if(bookmark.type == bookmarks.BookmarkType.DIRECTORY) {
            const casted = <bookmarks.DirectoryBookmark>bookmark;

            select_tag.append(
                $.spawn("option")
                    .val(casted.unique_id)
                    .text(prefix + casted.display_name)
            );

            for(const member of casted.content)
                parent_tag(select_tag, prefix + "  ", member);
        }
    }

    export function spawnBookmarkModal() {
        let modal: Modal;
        modal = createModal({
            header: tr("Manage bookmarks"),
            body: () => {
                let template = $("#tmpl_manage_bookmarks").renderTag({ });
                template = $.spawn("div").append(template);
                let selected_bookmark: bookmarks.Bookmark | bookmarks.DirectoryBookmark | undefined;
                let update_name: () => any;

                const update_bookmarks = () => { //list bookmarks
                    template.find(".list").empty();

                    const callback_selected = (entry: bookmarks.Bookmark | bookmarks.DirectoryBookmark, tag: JQuery) => {
                        template.find(".selected").removeClass("selected");
                        if(selected_bookmark == entry) return;

                        selected_bookmark = entry;
                        update_name = () => tag.find("> .name").text(entry.display_name);

                        template.find(".bookmark-setting").hide();
                        template.find(".setting-bookmark-name").val(selected_bookmark.display_name);

                        if(selected_bookmark.type == bookmarks.BookmarkType.ENTRY) {
                            template.find(".bookmark-setting-bookmark").show();

                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const profile = profiles.find_profile(casted.connect_profile) || profiles.default_profile();
                            template.find(".setting-bookmark-profile").val(profile.id);

                            template.find(".setting-server-host").val(casted.server_properties.server_address);
                            template.find(".setting-server-port").val(casted.server_properties.server_port);
                            template.find(".setting-server-password").val(casted.server_properties.server_password_hash || casted.server_properties.server_password);

                            template.find(".setting-username").val(casted.nickname);
                            template.find(".setting-channel").val(casted.default_channel);
                            template.find(".setting-channel-password").val(casted.default_channel_password_hash || casted.default_channel_password);
                        } else {
                            template.find(".bookmark-setting-directory").show();
                        }
                    };

                    for(const bookmark of bookmarks.bookmarks().content) {
                        template.find(".list").append(bookmark_tag(callback_selected, bookmark));
                    }
                    console.log( template.find(".list").find(".bookmark, .directory"));
                    template.find(".list").find(".bookmark, .directory").eq(0).find("> .name").trigger('click');
                };

                { //General buttons
                    template.find(".button-create").on('click', event => {
                        let create_modal: Modal;
                        create_modal = createModal({
                            header: tr("Create a new entry"),
                            body: () => {
                                let template = $("#tmpl_manage_bookmarks-create").renderTag({ });
                                template = $.spawn("div").append(template);

                                for(const bookmark of bookmarks.bookmarks().content)
                                    parent_tag(template.find(".bookmark-parent"), "", bookmark);

                                if(selected_bookmark) {
                                    const parent = selected_bookmark.type == bookmarks.BookmarkType.ENTRY ?
                                            bookmarks.parent_bookmark(selected_bookmark as bookmarks.Bookmark) :
                                            selected_bookmark;
                                    if(parent)
                                        template.find(".bookmark-parent").val(parent.unique_id);
                                }

                                template.find(".bookmark-name").on('change, keyup', event => {
                                    template.find(".button-create").prop("disabled", (<HTMLInputElement>event.target).value.length < 3);
                                });

                                template.find(".button-create").prop("disabled", true).on('click', event => {
                                    const name = template.find(".bookmark-name").val() as string;
                                    const parent_uuid = template.find(".bookmark-parent").val() as string;

                                    const parent = bookmarks.find_bookmark(parent_uuid);

                                    let bookmark;
                                    if(template.find(".bookmark-type").val() == "directory") {
                                        bookmark = bookmarks.create_bookmark_directory(parent as bookmarks.DirectoryBookmark || bookmarks.bookmarks(), name);
                                    } else {
                                        bookmark = bookmarks.create_bookmark(name, parent as bookmarks.DirectoryBookmark || bookmarks.bookmarks(), {
                                            server_port: 9987,
                                            server_address: "ts.teaspeak.de"
                                        }, "Another TeaSpeak user");
                                    }
                                    bookmarks.save_bookmark(bookmark);
                                    create_modal.close();
                                    update_bookmarks();
                                });

                                return template;
                            },
                            footer: 400
                        });

                        create_modal.open();
                    });

                    template.find(".button-delete").on('click', event => {
                        if(!selected_bookmark) return;

                        spawnYesNo(tr("Are you sure?"), tr("Do you really want to delete this entry?"), result => {
                            if(result) {
                                bookmarks.delete_bookmark(selected_bookmark);
                                bookmarks.save_bookmark(selected_bookmark); /* save the deleted state */
                                update_bookmarks();
                            }
                        });
                    });

                    /* bookmark listener */
                    {
                        template.find(".setting-bookmark-profile").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.connect_profile = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });

                        template.find(".setting-server-host").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.server_properties.server_address = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });

                        template.find(".setting-server-port").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.server_properties.server_port = parseInt(element.value);
                            bookmarks.save_bookmark(selected_bookmark);
                        });

                        template.find(".setting-server-password").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.server_properties.server_password = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });


                        template.find(".setting-username").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.nickname = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });

                        template.find(".setting-channel").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.default_channel = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });

                        template.find(".setting-channel-password").on('change', event => {
                            if(!selected_bookmark || selected_bookmark.type != bookmarks.BookmarkType.ENTRY) return;
                            const casted = <bookmarks.Bookmark>selected_bookmark;
                            const element = <HTMLInputElement>event.target;

                            casted.default_channel_password = element.value;
                            bookmarks.save_bookmark(selected_bookmark);
                        });
                    }

                    /* listener for both */
                    {
                        template.find(".setting-bookmark-name").on('change', event => {
                            if(!selected_bookmark) return;
                            const element = <HTMLInputElement>event.target;

                            if(element.value.length >= 3) {
                                selected_bookmark.display_name = element.value;
                                bookmarks.save_bookmark(selected_bookmark);
                                if(update_name)
                                    update_name();
                            }
                        });
                    }
                }

                /* connect profile initialisation */
                {
                    const list = template.find(".setting-bookmark-profile");
                    for(const profile of profiles.profiles()) {
                        const tag = $.spawn("option").val(profile.id).text(profile.profile_name);
                        if(profile.id == "default")
                            tag.css("font-weight", "bold");

                        list.append(tag);
                    }
                }

                update_bookmarks();
                template.find(".button-close").on('click', event => modal.close());
                return template;
            },
            footer: undefined,
            width: 750
        });

        modal.close_listener.push(() => control_bar.update_bookmarks());
        modal.open();
    }
}