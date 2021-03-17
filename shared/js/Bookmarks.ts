import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {WritableKeys} from "tc-shared/proto";
import {LogCategory, logDebug, logError, logInfo, logTrace, logWarn} from "tc-shared/log";
import {guid} from "tc-shared/crypto/uid";
import {Registry} from "tc-events";
import {server_connections} from "tc-shared/ConnectionManager";
import {defaultConnectProfile, findConnectProfile} from "tc-shared/profiles/ConnectionProfile";
import {ConnectionState} from "tc-shared/ConnectionHandler";
import * as _ from "lodash";

type BookmarkBase = {
    readonly uniqueId: string,
    displayName: string,

    previousEntry: string | undefined,
    parentEntry: string | undefined,
};

export type BookmarkInfo = BookmarkBase & {
    readonly type: "entry",

    connectOnStartup: boolean,
    connectProfile: string,

    serverAddress: string,
    serverPasswordHash: string | undefined,

    defaultChannel: string | undefined,
    defaultChannelPasswordHash: string | undefined,
}

export type BookmarkDirectory = BookmarkBase & {
    readonly type: "directory",
}

export type BookmarkEntry = BookmarkInfo | BookmarkDirectory;

export interface BookmarkEvents {
    notify_bookmark_created: { bookmark: BookmarkEntry },
    notify_bookmark_edited: { bookmark: BookmarkEntry, keys: (keyof BookmarkInfo | keyof BookmarkDirectory)[] },
    notify_bookmark_deleted: { bookmark: BookmarkEntry, children: BookmarkEntry[] },
    notify_bookmarks_imported: { bookmarks: BookmarkEntry[] },
}

export type OrderedBookmarkEntry = {
    entry: BookmarkEntry,
    depth: number,
    childCount: number,
};

const kLocalStorageKey = "bookmarks_v2";
export class BookmarkManager {
    readonly events: Registry<BookmarkEvents>;
    private readonly registeredBookmarks: BookmarkEntry[];
    private defaultBookmarkCreated: boolean;

    constructor() {
        this.events = new Registry<BookmarkEvents>();
        this.registeredBookmarks = [];
        this.defaultBookmarkCreated = false;
        this.loadBookmarks();
    }

    private loadBookmarks() {
        const bookmarksJson = localStorage.getItem(kLocalStorageKey);
        if(typeof bookmarksJson !== "string") {
            const oldBookmarksJson = localStorage.getItem("bookmarks");
            if(typeof oldBookmarksJson === "string") {
                logDebug(LogCategory.BOOKMARKS, tr("Found no new bookmarks but found old bookmarks. Trying to import."));
                try {
                    this.importOldBookmarks(oldBookmarksJson);
                    logInfo(LogCategory.BOOKMARKS, tr("Successfully imported %d old bookmarks."), this.registeredBookmarks.length);
                    this.saveBookmarks();
                } catch (error) {
                    const saveKey = "bookmarks_v1_save_" + Date.now();
                    logError(LogCategory.BOOKMARKS, tr("Failed to import old bookmark data. Saving it as %s"), saveKey);
                    localStorage.setItem(saveKey, oldBookmarksJson);
                } finally {
                    localStorage.removeItem("bookmarks");
                }
            }
        } else {
            try {
                const storageData = JSON.parse(bookmarksJson);
                if(storageData.version !== 2) {
                    throw tr("bookmark storage has an invalid version");
                }

                this.defaultBookmarkCreated = storageData.defaultBookmarkCreated;
                this.registeredBookmarks.slice(0, this.registeredBookmarks.length);
                this.registeredBookmarks.push(...storageData.bookmarks);
                logTrace(LogCategory.BOOKMARKS, tr("Loaded %d bookmarks."), this.registeredBookmarks.length);
            } catch (error) {
                const saveKey = "bookmarks_v2_save_" + Date.now();
                logError(LogCategory.BOOKMARKS, tr("Failed to parse bookmarks. Saving them at %s and using a clean setup."), saveKey)
                localStorage.setItem(saveKey, bookmarksJson);
                localStorage.removeItem("bookmarks_v2");
            }
        }

        if(!this.defaultBookmarkCreated && this.registeredBookmarks.length === 0) {
            this.defaultBookmarkCreated = true;

            logDebug(LogCategory.BOOKMARKS, tr("No bookmarks found. Registering default bookmark."));
            this.createBookmark({
                connectOnStartup: false,
                connectProfile: "default",

                displayName: "Official TeaSpeak - Test server",

                parentEntry: undefined,
                previousEntry: undefined,

                serverAddress: "ts.teaspeak.de",
                serverPasswordHash: undefined,

                defaultChannel: undefined,
                defaultChannelPasswordHash: undefined,
            });

            this.saveBookmarks();
        }
    }

    private importOldBookmarks(jsonData: string) {
        const data = JSON.parse(jsonData);
        if(typeof data?.root_bookmark !== "object") {
            throw tr("missing root bookmark");
        }

        if(!Array.isArray(data?.root_bookmark?.content)) {
            throw tr("Missing root bookmarks content");
        }

        const registerBookmarks = (parentEntry: string, previousEntry: string, entry: any) : string | undefined => {
            if(typeof entry.display_name !== "string") {
                logWarn(LogCategory.BOOKMARKS, tr("Missing display_name in old bookmark entry. Skipping entry."));
                return undefined;
            }

            if("content" in entry) {
                /* it was a directory */
                const directory = this.createDirectory({
                    previousEntry,
                    parentEntry,

                    displayName: entry.display_name,
                });

                previousEntry = undefined;
                entry.content.forEach(entry => {
                    previousEntry = registerBookmarks(directory.uniqueId, previousEntry, entry) || previousEntry;
                });
            } else {
                /* it was a normal entry */
                if(typeof entry.connect_profile !== "string") {
                    logWarn(LogCategory.BOOKMARKS, tr("Missing connect_profile in old bookmark entry. Skipping entry."));
                    return undefined;
                }

                if(typeof entry.server_properties?.server_address !== "string") {
                    logWarn(LogCategory.BOOKMARKS, tr("Missing server_address in old bookmark entry. Skipping entry."));
                    return undefined;
                }

                if(typeof entry.server_properties?.server_port !== "number") {
                    logWarn(LogCategory.BOOKMARKS, tr("Missing server_port in old bookmark entry. Skipping entry."));
                    return undefined;
                }

                let serverAddress;
                if(entry.server_properties.server_address.indexOf(":") !== -1) {
                    serverAddress = `[${entry.server_properties.server_address}]`;
                } else {
                    serverAddress = entry.server_properties.server_address;
                }
                serverAddress += ":" + entry.server_properties.server_port;

                return this.createBookmark({
                    previousEntry,
                    parentEntry,

                    serverAddress,
                    serverPasswordHash: entry.server_properties?.server_password_hash,

                    defaultChannel: undefined,
                    defaultChannelPasswordHash: undefined,

                    displayName: entry.display_name,
                    connectProfile: entry.connect_profile,

                    connectOnStartup: false
                }).uniqueId;
            }
        }

        let previousEntry = undefined;
        data.root_bookmark.content.forEach(entry => {
            previousEntry = registerBookmarks(undefined, previousEntry, entry) || previousEntry;
        });

        this.defaultBookmarkCreated = true;
    }

    private saveBookmarks() {
        localStorage.setItem(kLocalStorageKey, JSON.stringify({
            version: 2,
            bookmarks: this.registeredBookmarks,
            defaultBookmarkCreated: this.defaultBookmarkCreated,
        }))
    }

    getRegisteredBookmarks() : BookmarkEntry[] {
        return this.registeredBookmarks;
    }

    getOrderedRegisteredBookmarks() : OrderedBookmarkEntry[] {
        const unorderedBookmarks = this.registeredBookmarks.slice(0);
        const orderedBookmarks: OrderedBookmarkEntry[] = [];

        const orderTreeLayer = (entries: BookmarkEntry[]): BookmarkEntry[] => {
            if(entries.length === 0) {
                return [];
            }

            const result = [];
            while(entries.length > 0) {
                let head = entries.find(entry => !entry.previousEntry) || entries[0];
                while(head) {
                    result.push(head);
                    entries.remove(head);
                    head = entries.find(entry => entry.previousEntry === head.uniqueId);
                }
            }

            return result;
        }

        const traverseTree = (parentEntry: string | undefined, depth: number): number => {
            const children = unorderedBookmarks.filter(e => e.parentEntry === parentEntry);
            children.forEach(child => unorderedBookmarks.remove(child));

            const childCount = children.length;
            for(const entry of orderTreeLayer(children)) {
                let orderedEntry: OrderedBookmarkEntry = {
                    entry: entry,
                    depth: depth,
                    childCount: 0
                };

                orderedBookmarks.push(orderedEntry);
                orderedEntry.childCount = traverseTree(entry.uniqueId, depth + 1);
            }

            return childCount;
        };

        traverseTree(undefined, 0);

        /* Append all broken/unreachable elements */
        while (unorderedBookmarks.length > 0) {
            traverseTree(unorderedBookmarks[0].parentEntry, 0);
        }

        return orderedBookmarks;
    }

    findBookmark(uniqueId: string) : BookmarkEntry | undefined {
        return this.registeredBookmarks.find(entry => entry.uniqueId === uniqueId);
    }

    createBookmark(properties: Pick<BookmarkInfo, WritableKeys<BookmarkInfo>>) : BookmarkInfo {
        this.validateHangInPoint(properties);
        const bookmark = Object.assign(properties, {
            uniqueId: guid(),
            type: "entry"
        } as BookmarkInfo);
        this.registeredBookmarks.push(bookmark);
        this.events.fire("notify_bookmark_created", { bookmark });
        this.saveBookmarks();
        return bookmark;
    }

    editBookmark(uniqueId: string, newValues: Partial<Pick<BookmarkInfo, WritableKeys<BookmarkInfo>>>) {
        this.doEditBookmark(uniqueId, newValues);
    }

    createDirectory(properties: Pick<BookmarkInfo, WritableKeys<BookmarkDirectory>>) : BookmarkDirectory {
        this.validateHangInPoint(properties);
        const bookmark = Object.assign(properties, {
            uniqueId: guid(),
            type: "directory"
        } as BookmarkDirectory);
        this.registeredBookmarks.push(bookmark);
        this.events.fire("notify_bookmark_created", { bookmark });
        this.saveBookmarks();
        return bookmark;
    }

    editDirectory(uniqueId: string, newValues: Partial<Pick<BookmarkDirectory, WritableKeys<BookmarkDirectory>>>) {
        this.doEditBookmark(uniqueId, newValues);
    }

    deleteEntry(uniqueId: string) {
        const index = this.registeredBookmarks.findIndex(entry => entry.uniqueId === uniqueId);
        if(index === -1) {
            return;
        }

        const [ entry ] = this.registeredBookmarks.splice(index, 1);
        const children = [], pendingChildren = [ entry ];

        while(pendingChildren[0]) {
            const child = pendingChildren.pop_front();
            children.push(child);

            const childChildren = this.registeredBookmarks.filter(entry => entry.parentEntry === child.uniqueId);
            pendingChildren.push(...childChildren);
            childChildren.forEach(entry => this.registeredBookmarks.remove(entry));
        }

        children.pop_front();
        this.events.fire("notify_bookmark_deleted", { bookmark: entry, children });
        this.saveBookmarks();
    }

    executeConnect(uniqueId: string, newTab: boolean) {
        const bookmark = this.findBookmark(uniqueId);
        if(!bookmark || bookmark.type !== "entry") {
            return;
        }

        const connection = newTab ? server_connections.spawnConnectionHandler() : server_connections.getActiveConnectionHandler();
        if(!connection) {
            return;
        }

        let profile = findConnectProfile(bookmark.connectProfile) || defaultConnectProfile();
        connection.startConnectionNew({
            profile: profile,

            targetAddress: bookmark.serverAddress,

            serverPasswordHashed: true,
            serverPassword: bookmark.serverPasswordHash,

            defaultChannel: bookmark.defaultChannel,
            defaultChannelPassword: bookmark.defaultChannelPasswordHash,
            defaultChannelPasswordHashed: true,

            token: undefined,

            nicknameSpecified: false,
            nickname: undefined
        }, false).then(undefined);
    }

    executeAutoConnect() {
        let newTab = server_connections.getActiveConnectionHandler().connection_state !== ConnectionState.UNCONNECTED;
        for(const entry of this.getOrderedRegisteredBookmarks()) {
            if(entry.entry.type !== "entry") {
                continue;
            }

            if(!entry.entry.connectOnStartup) {
                continue;
            }

            this.executeConnect(entry.entry.uniqueId, newTab);
            newTab = true;
        }
    }

    exportBookmarks() : string {
        return JSON.stringify({
            version: 1,
            bookmarks: this.registeredBookmarks
        });
    }

    importBookmarks(filePayload: string) : number {
        let data;
        try {
            data = JSON.parse(filePayload)
        } catch (error) {
            throw tr("failed to parse bookmarks");
        }

        if(data?.version !== 1) {
            throw tr("supplied data contains invalid version");
        }

        const newBookmarks = data.bookmarks as BookmarkEntry[];
        if(!Array.isArray(newBookmarks)) {
            throw tr("missing bookmarks");
        }

        /* TODO: Validate integrity? */
        for(const knownBookmark of this.registeredBookmarks) {
            const index = newBookmarks.findIndex(entry => entry.uniqueId === knownBookmark.uniqueId);
            if(index === -1) {
                continue;
            }

            newBookmarks.splice(index, 1);
        }

        if(newBookmarks.length === 0) {
            return;
        }

        this.registeredBookmarks.push(...newBookmarks);
        newBookmarks.forEach(entry => this.validateHangInPoint(entry));
        this.events.fire("notify_bookmarks_imported", { bookmarks: newBookmarks });
        return newBookmarks.length;
    }

    private doEditBookmark(uniqueId: string, newValues: any) {
        const bookmarkInfo = this.findBookmark(uniqueId);
        if(!bookmarkInfo) {
            return;
        }

        const originalProperties = _.cloneDeep(bookmarkInfo);
        for(const key of Object.keys(newValues)) {
            bookmarkInfo[key] = newValues[key];
        }
        this.validateHangInPoint(bookmarkInfo);

        const editedKeys = [];
        for(const key of Object.keys(newValues)) {
            if(_.isEqual(bookmarkInfo[key], originalProperties[key])) {
                continue;
            }

            editedKeys.push(key);
        }

        if(editedKeys.length === 0) {
            return;
        }

        this.saveBookmarks();
        this.events.fire("notify_bookmark_edited", { bookmark: bookmarkInfo, keys: editedKeys });
    }

    private validateHangInPoint(entry: Partial<BookmarkBase>) {
        if(entry.previousEntry) {
            const previousEntry = this.findBookmark(entry.previousEntry);
            if(!previousEntry) {
                logError(LogCategory.BOOKMARKS, tr("New bookmark previous entry does not exists. Clearing it."));
                entry.previousEntry = undefined;
            } else if(previousEntry.parentEntry !== entry.parentEntry) {
                logWarn(LogCategory.BOOKMARKS, tr("Previous entries parent does not match our entries parent. Updating our parent from %s to %s"), entry.parentEntry, previousEntry.parentEntry);
                entry.parentEntry = previousEntry.parentEntry;
            }


            const openList = this.registeredBookmarks.filter(e1 => e1.parentEntry === entry.parentEntry);
            let currentEntry = entry;
            while(true) {
                if(!currentEntry.previousEntry) {
                    break;
                }

                const previousEntry = openList.find(entry => entry.uniqueId === currentEntry.previousEntry);
                if(!previousEntry) {
                    logError(LogCategory.BOOKMARKS, tr("Found circular dependency within the previous entry or one of the previous entries does not exists. Clearing out previous entry."));
                    entry.previousEntry = undefined;
                    break;
                }

                openList.remove(previousEntry);
                currentEntry = previousEntry;
            }
        }

        if(entry.parentEntry) {
            const parentEntry = this.findBookmark(entry.parentEntry);
            if(!parentEntry) {
                logError(LogCategory.BOOKMARKS, tr("Missing parent entry %s. Clearing it."), entry.parentEntry);
                entry.parentEntry = undefined;
            }

            const openList = this.registeredBookmarks.slice();
            let currentEntry = entry;
            while(true) {
                if(!currentEntry.parentEntry) {
                    break;
                }

                const parentEntry = openList.find(entry => entry.uniqueId === currentEntry.parentEntry);
                if(!parentEntry) {
                    logError(LogCategory.BOOKMARKS, tr("Found circular dependency within a parent or one of the parents does not exists. Clearing out parent."));
                    entry.parentEntry = undefined;
                    break;
                }

                openList.remove(parentEntry);
                currentEntry = parentEntry;
            }
        }

        if(entry.previousEntry) {
            this.registeredBookmarks.forEach(bookmark => {
                if(bookmark.previousEntry === entry.previousEntry && bookmark !== entry) {
                    bookmark.previousEntry = bookmark.uniqueId;
                }
            });
        }
    }
}

export let bookmarks: BookmarkManager;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "initialize bookmarks",
    function: async () => {
        bookmarks = new BookmarkManager();
        (window as any).bookmarks = bookmarks;
    },
    priority: 20
});
