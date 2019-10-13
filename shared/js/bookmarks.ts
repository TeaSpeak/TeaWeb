namespace bookmarks {
    function guid() {
        function s4() {
            return Math
                .floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    export const boorkmak_connect = (mark: Bookmark, new_tab?: boolean) => {
        const profile = profiles.find_profile(mark.connect_profile) || profiles.default_profile();
        if(profile.valid()) {
            const connection = (typeof(new_tab) !== "boolean" || !new_tab) ? server_connections.active_connection_handler() : server_connections.spawn_server_connection_handler();
            server_connections.set_active_connection_handler(connection);
            connection.startConnection(
                mark.server_properties.server_address + ":" + mark.server_properties.server_port,
                profile,
                true,
                {
                    nickname: mark.nickname,
                    password: mark.server_properties.server_password_hash ? {
                        password: mark.server_properties.server_password_hash,
                        hashed: true
                    } : mark.server_properties.server_password ? {
                        hashed: false,
                        password: mark.server_properties.server_password
                    } : undefined
                }
            );
        } else {
            Modals.spawnConnectModal({}, {
                url: mark.server_properties.server_address + ":" + mark.server_properties.server_port,
                enforce: true
            }, {
                profile: profile,
                enforce: true
            })
        }
    };

    export interface ServerProperties {
        server_address: string;
        server_port: number;
        server_password_hash?: string;
        server_password?: string;
    }

    export enum BookmarkType {
        ENTRY,
        DIRECTORY
    }

    export interface Bookmark {
        type: /* BookmarkType.ENTRY */ BookmarkType;
        /* readonly */ parent: DirectoryBookmark;

        server_properties: ServerProperties;
        display_name: string;
        unique_id: string;

        nickname: string;
        default_channel?: number | string;
        default_channel_password_hash?: string;
        default_channel_password?: string;

        connect_profile: string;

        last_icon_id?: number;
    }

    export interface DirectoryBookmark {
        type: /* BookmarkType.DIRECTORY */ BookmarkType;
        /* readonly */ parent: DirectoryBookmark;

        readonly content: (Bookmark | DirectoryBookmark)[];
        unique_id: string;
        display_name: string;
    }

    interface BookmarkConfig {
        root_bookmark?: DirectoryBookmark;
        default_added?: boolean;
    }

    let _bookmark_config: BookmarkConfig;

    function bookmark_config() : BookmarkConfig {
        if(_bookmark_config)
            return _bookmark_config;

        let bookmark_json = localStorage.getItem("bookmarks");
        let bookmarks;
        try {
            bookmarks = JSON.parse(bookmark_json) || {} as BookmarkConfig;
        } catch(error) {
            log.error(LogCategory.BOOKMARKS, tr("Failed to load bookmarks: %o"), error);
            bookmarks = {} as any;
        }

        _bookmark_config = bookmarks;
        _bookmark_config.root_bookmark = _bookmark_config.root_bookmark || { content: [], display_name: "root", type: BookmarkType.DIRECTORY} as DirectoryBookmark;

        if(!_bookmark_config.default_added) {
            _bookmark_config.default_added = true;
            create_bookmark("TeaSpeak official Test-Server", _bookmark_config.root_bookmark, {
                server_address: "ts.teaspeak.de",
                server_port: 9987
            }, "Another TeaSpeak user");

            save_config();
        }

        const fix_parent = (parent: DirectoryBookmark, entry: Bookmark | DirectoryBookmark) => {
            entry.parent = parent;
            if(entry.type === BookmarkType.DIRECTORY)
                for(const child of (entry as DirectoryBookmark).content)
                    fix_parent(entry as DirectoryBookmark, child);
        };
        for(const entry of _bookmark_config.root_bookmark.content)
            fix_parent(_bookmark_config.root_bookmark, entry);

        return _bookmark_config;
    }

    function save_config() {
        localStorage.setItem("bookmarks", JSON.stringify(bookmark_config(), (key, value) => {
            if(key === "parent")
                return undefined;
            return value;
        }));
    }

    export function bookmarks() : DirectoryBookmark {
        return bookmark_config().root_bookmark;
    }

    export function bookmarks_flat() : Bookmark[] {
        const result: Bookmark[] = [];
        const _flat = (bookmark: Bookmark | DirectoryBookmark) => {
            if(bookmark.type == BookmarkType.DIRECTORY)
                for(const book of (bookmark as DirectoryBookmark).content)
                    _flat(book);
            else
                result.push(bookmark as Bookmark);
        };
        _flat(bookmark_config().root_bookmark);
        return result;
    }

    function find_bookmark_recursive(parent: DirectoryBookmark, uuid: string) : Bookmark | DirectoryBookmark {
        for(const entry of parent.content) {
            if(entry.unique_id == uuid)
                return entry;
            if(entry.type == BookmarkType.DIRECTORY) {
                const result = find_bookmark_recursive(entry as DirectoryBookmark, uuid);
                if(result) return result;
            }
        }
        return undefined;
    }

    export function find_bookmark(uuid: string) : Bookmark | DirectoryBookmark | undefined {
        return find_bookmark_recursive(bookmarks(), uuid);
    }

    export function parent_bookmark(bookmark: Bookmark) : DirectoryBookmark {
        const books: (DirectoryBookmark | Bookmark)[] = [bookmarks()];
        while(!books.length) {
            const directory = books.pop_front();
            if(directory.type == BookmarkType.DIRECTORY) {
                const cast = <DirectoryBookmark>directory;

                if(cast.content.indexOf(bookmark) != -1)
                    return cast;
                books.push(...cast.content);
            }
        }
        return bookmarks();
    }

    export function create_bookmark(display_name: string, directory: DirectoryBookmark, server_properties: ServerProperties, nickname: string) : Bookmark {
        const bookmark = {
            display_name: display_name,
            server_properties: server_properties,
            nickname: nickname,
            type: BookmarkType.ENTRY,
            connect_profile: "default",
            unique_id: guid(),
            parent: directory
        } as Bookmark;

        directory.content.push(bookmark);
        return bookmark;
    }

    export function create_bookmark_directory(parent: DirectoryBookmark, name: string) : DirectoryBookmark {
        const bookmark = {
            type: BookmarkType.DIRECTORY,

            display_name: name,
            content: [],
            unique_id: guid(),
            parent: parent
        } as DirectoryBookmark;

        parent.content.push(bookmark);
        return bookmark;
    }

    //TODO test if the new parent is within the old bookmark
    export function change_directory(parent: DirectoryBookmark, bookmark: Bookmark | DirectoryBookmark) {
        delete_bookmark(bookmark);
        parent.content.push(bookmark)
    }

    export function save_bookmark(bookmark?: Bookmark | DirectoryBookmark) {
        save_config(); /* nvm we dont give a fuck... saving everything */
    }

    function delete_bookmark_recursive(parent: DirectoryBookmark, bookmark: Bookmark | DirectoryBookmark) {
        const index = parent.content.indexOf(bookmark);
        if(index != -1)
            parent.content.remove(bookmark);
        else
            for(const entry of parent.content)
                if(entry.type == BookmarkType.DIRECTORY)
                    delete_bookmark_recursive(entry as DirectoryBookmark, bookmark)
    }

    export function delete_bookmark(bookmark: Bookmark | DirectoryBookmark) {
        delete_bookmark_recursive(bookmarks(), bookmark)
    }

    export function add_current_server() {
        const ch = server_connections.active_connection_handler();
        if(ch && ch.connected) {
            const ce = ch.getClient();
            const name = ce ? ce.clientNickName() : undefined;
            createInputModal(tr("Enter bookmarks name"), tr("Please enter the bookmarks name:<br>"), text => text.length > 0, result => {
                if(result) {
                    const bookmark = create_bookmark(result as string, bookmarks(), {
                        server_port: ch.serverConnection.remote_address().port,
                        server_address: ch.serverConnection.remote_address().host,

                        server_password: "",
                        server_password_hash: ""
                    }, name);
                    save_bookmark(bookmark);

                    control_bar.update_bookmarks();
                    top_menu.rebuild_bookmarks();

                    createInfoModal(tr("Server added"), tr("Server has been successfully added to your bookmarks.")).open();
                }
            }).open();
        } else {
            createErrorModal(tr("You have to be connected"), tr("You have to be connected!")).open();
        }
    }
}