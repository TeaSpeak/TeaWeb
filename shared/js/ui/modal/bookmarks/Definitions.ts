import {RemoteIconInfo} from "tc-shared/file/Icons";

export type BookmarkListEntry = {
    uniqueId: string,
    type: "bookmark" | "directory",

    displayName: string,
    icon: RemoteIconInfo | undefined,

    depth: number,
    childCount: number,
}

export interface BookmarkConnectInfo {
    serverName: string,
    serverRegion: string,

    clientsOnline: number,
    clientsMax: number,

    connectCountUniqueId: number,
    connectCountAddress: number,

    hostBannerUrl: string,
    hostBannerMode: number
}

export type CurrentClientChannel = { name: string, channelId: number, path: string, passwordHash: string };

export interface ModalBookmarkVariables {
    readonly bookmarks: BookmarkListEntry[],
    bookmarkSelected: { type?: "empty" | "bookmark" | "directory", id: string | undefined },

    readonly connectProfiles: { id: string, name: string }[],
    readonly currentClientChannel: CurrentClientChannel | undefined,

    bookmarkName: string,
    bookmarkConnectProfile: string,
    bookmarkConnectOnStartup: boolean,
    bookmarkServerAddress: string,
    bookmarkServerPassword: string | undefined,
    bookmarkDefaultChannel: string | undefined,
    bookmarkDefaultChannelPassword: string | undefined,
    bookmarkInfo: BookmarkConnectInfo | undefined,
}

export interface ModalBookmarkEvents {
    action_create_bookmark: {
        entryType: "bookmark" | "directory",
        order: {
            type: "previous",
            entry: string
        } | {
            type: "parent",
            entry: string
        } | {
            type: "selected",
        } | {
            type: "end"
        },
        displayName: string | undefined
    },
    action_duplicate_bookmark: { uniqueId: string, displayName: string | undefined, originalName: string },
    action_delete_bookmark: { uniqueId: string, force: boolean },

    action_connect: { uniqueId: string, newTab: boolean, closeModal: boolean },

    action_export: {},
    action_import: { payload: string | undefined },

    notify_export_data: { payload: string }
    notify_import_result: {
        status: "success",
        importedBookmarks: number
    } | {
        status: "error",
        message: string
    }
}