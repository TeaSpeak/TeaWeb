import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {
    BookmarkConnectInfo,
    BookmarkListEntry,
    CurrentClientChannel,
    ModalBookmarkEvents,
    ModalBookmarkVariables
} from "tc-shared/ui/modal/bookmarks/Definitions";
import {Registry} from "tc-events";
import {BookmarkEntry, BookmarkInfo, bookmarks} from "tc-shared/Bookmarks";
import {connectionHistory} from "tc-shared/connectionlog/History";
import {RemoteIconInfo} from "tc-shared/file/Icons";
import {availableConnectProfiles} from "tc-shared/profiles/ConnectionProfile";
import {hashPassword} from "tc-shared/utils/helpers";
import {server_connections} from "tc-shared/ConnectionManager";
import {ConnectionHandler, ConnectionState} from "tc-shared/ConnectionHandler";
import {LocalClientEntry} from "tc-shared/tree/Client";
import _ from "lodash";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {promptYesNo} from "tc-shared/ui/modal/yes-no/Controller";
import {tra} from "tc-shared/i18n/localize";

class BookmarkModalController {
    readonly events: Registry<ModalBookmarkEvents>;
    readonly variables: IpcUiVariableProvider<ModalBookmarkVariables>;

    private selectedBookmark: BookmarkEntry;
    private bookmarkUniqueServerIds: { [key: string]: Promise<string | undefined> } = {};
    private currentClientChannels: { [key: string]: CurrentClientChannel } = {};

    private registeredListeners: (() => void)[];
    private registeredHandlerListeners: { [key: string]: (() => void)[] } = {};

    constructor() {
        this.events = new Registry<ModalBookmarkEvents>();
        this.variables = new IpcUiVariableProvider<ModalBookmarkVariables>();
        this.registeredListeners = [];

        //this.variables.setArtificialDelay(1500);

        this.variables.setVariableProvider("bookmarks", async () => {
            const orderedBookmarks: BookmarkListEntry[] = [];

            for(const entry of bookmarks.getOrderedRegisteredBookmarks()) {
                let icon: RemoteIconInfo = undefined;

                try {
                    const serverUniqueId = await this.getBookmarkServerUniqueId(entry.entry);
                    if(serverUniqueId) {
                        const serverInfo = await connectionHistory.queryServerInfo(serverUniqueId);
                        if(serverInfo.iconId > 0) {
                            icon = {
                                iconId: serverInfo.iconId,
                                serverUniqueId: serverUniqueId
                            };
                        }
                    }
                } catch (_) {}

                orderedBookmarks.push({
                    icon,
                    depth: entry.depth,
                    type: entry.entry.type === "directory" ? "directory" : "bookmark",
                    displayName: entry.entry.displayName,
                    uniqueId: entry.entry.uniqueId,
                    childCount: entry.childCount
                });
            }

            return orderedBookmarks;
        });
        this.variables.setVariableProvider("connectProfiles", () => {
            return availableConnectProfiles().map(entry => ({
                id: entry.id,
                name: entry.profileName
            }));
        });

        this.variables.setVariableProvider("currentClientChannel", async bookmarkId => {
            const serverUniqueId = await this.getBookmarkServerUniqueId(bookmarkId);
            if(!serverUniqueId) {
                return;
            }

            const handler = server_connections.getAllConnectionHandlers().filter(handler => handler.connected && handler.getCurrentServerUniqueId() === serverUniqueId);
            return this.currentClientChannels[handler[0]?.handlerId];
        });

        this.variables.setVariableProvider("bookmarkInfo", bookmarkId => {
            if(!bookmarkId || this.selectedBookmark?.uniqueId !== bookmarkId) {
                return undefined;
            }

            return undefined;
        });

        this.variables.setVariableProvider("bookmarkSelected", () => {
            if(!this.selectedBookmark) {
                return { id: undefined, type: "empty" };
            } else if(this.selectedBookmark.type === "directory") {
                return { id: this.selectedBookmark.uniqueId, type: "directory" };
            } else {
                return { id: this.selectedBookmark.uniqueId, type: "bookmark" };
            }
        });
        this.variables.setVariableEditor("bookmarkSelected", newValue => {
            this.selectBookmark(newValue.id);
        });

        this.variables.setVariableProvider("bookmarkInfo", this.bookmarkInfoProvider(undefined, async (bookmark): Promise<BookmarkConnectInfo> => {
            const serverUniqueId = await this.getBookmarkServerUniqueId(bookmark);
            if(!serverUniqueId) {
                return undefined;
            }

            const serverInfo = await connectionHistory.queryServerInfo(serverUniqueId);
            if(!serverInfo) {
                return undefined;
            }


            return {
                clientsOnline: serverInfo.clientsOnline,
                clientsMax: serverInfo.clientsMax,

                connectCountUniqueId: await connectionHistory.countConnectCount(serverUniqueId, "server-unique-id"),
                connectCountAddress: await connectionHistory.countConnectCount(bookmark.serverAddress, "address"),

                hostBannerMode: serverInfo.hostBannerMode,
                hostBannerUrl: serverInfo.hostBannerUrl,

                serverName: serverInfo.name,
                serverRegion: serverInfo.country
            };
        }));

        this.variables.setVariableProvider("bookmarkName", bookmarkId => {
            return bookmarks.findBookmark(bookmarkId)?.displayName;
        });
        this.variables.setVariableEditor("bookmarkName", (newValue, bookmarkId) => {
            const bookmark = bookmarks.findBookmark(bookmarkId);
            switch(bookmark?.type) {
                case "directory":
                    bookmarks.editDirectory(bookmark.uniqueId, { displayName: newValue });
                    return true;

                case "entry":
                    bookmarks.editBookmark(bookmark.uniqueId, { displayName: newValue });
                    return true;

                default:
                    return false;
            }
        });

        this.variables.setVariableProvider("bookmarkServerAddress", this.bookmarkInfoProvider(undefined, bookmark => bookmark.serverAddress));
        this.variables.setVariableEditorAsync("bookmarkServerAddress", this.bookmarkEditor(async (updates, newValue) => {
            updates.serverAddress = newValue;
        }));

        this.variables.setVariableProvider("bookmarkServerPassword", this.bookmarkInfoProvider(undefined, bookmark => bookmark.serverPasswordHash || ""));
        this.variables.setVariableEditorAsync("bookmarkServerPassword", this.bookmarkEditor(async (updates, newValue) => {
            if(newValue) {
                updates.serverPasswordHash = await hashPassword(newValue);
            } else {
                updates.serverPasswordHash = "";
            }
            return updates.serverPasswordHash;
        }));

        this.variables.setVariableProvider("bookmarkConnectProfile", this.bookmarkInfoProvider(undefined, bookmark => bookmark.connectProfile));
        this.variables.setVariableEditorAsync("bookmarkConnectProfile", this.bookmarkEditor(async (updates, newValue) => {
            updates.connectProfile = newValue;
        }));

        this.variables.setVariableProvider("bookmarkConnectOnStartup", this.bookmarkInfoProvider(undefined, bookmark => bookmark.connectOnStartup));
        this.variables.setVariableEditorAsync("bookmarkConnectOnStartup", this.bookmarkEditor(async (updates, newValue) => {
            updates.connectOnStartup = newValue;
        }));

        this.variables.setVariableProvider("bookmarkDefaultChannel", this.bookmarkInfoProvider(undefined, bookmark => bookmark.defaultChannel));
        this.variables.setVariableEditorAsync("bookmarkDefaultChannel", this.bookmarkEditor(async (updates, newValue) => {
            updates.defaultChannel = newValue;
            updates.defaultChannelPasswordHash = undefined;
        }));

        this.variables.setVariableProvider("bookmarkDefaultChannelPassword", this.bookmarkInfoProvider(undefined, bookmark => bookmark.defaultChannelPasswordHash || ""));
        this.variables.setVariableEditorAsync("bookmarkDefaultChannelPassword", this.bookmarkEditor(async (updates, newValue) => {
            if(newValue) {
                updates.defaultChannelPasswordHash = await hashPassword(newValue);
            } else {
                updates.defaultChannelPasswordHash = "";
            }
            return updates.defaultChannelPasswordHash;
        }));

        /* events */
        this.events.on("action_delete_bookmark", event => {
            const entry = bookmarks.findBookmark(event.uniqueId);
            if(!entry) {
                logWarn(LogCategory.GENERAL, tr("Tried to delete an unknown bookmark entry %s."), event.uniqueId);
                return;
            }

            const children = bookmarks.directoryContents(entry.uniqueId);
            if(!event.force && entry.type === "directory" && children.length > 0) {
                promptYesNo({
                    title: tr("Are you sure?"),
                    question: tra("Do you really want to delete the directory \"{0}\"?\nThe directory contains {1} entries.", entry.displayName, children.length)
                }).then(result => {
                    if(!result) {
                        return;
                    }

                    this.events.fire("action_delete_bookmark", { uniqueId: entry.uniqueId, force: true });
                });
                return;
            }

            bookmarks.deleteEntry(event.uniqueId);
        });
        this.events.on("action_create_bookmark", event => {
            if(!event.displayName) {
                return;
            }

            let parentBookmark, previousBookmark;
            switch (event.order.type) {
                case "parent":
                    parentBookmark = event.order.entry;
                    previousBookmark = undefined;
                    break;

                case "previous": {
                    const previous = bookmarks.findBookmark(event.order.entry);
                    previousBookmark = event.order.entry;
                    parentBookmark = previous?.parentEntry;
                    break;
                }

                case "selected":
                    parentBookmark = this.selectedBookmark?.parentEntry;
                    previousBookmark = this.selectedBookmark?.previousEntry;
                    break;

                case "end":
                default:
                    break;
            }

            if(event.entryType === "bookmark") {
                bookmarks.createBookmark({
                    displayName: event.displayName,

                    parentEntry: parentBookmark,
                    previousEntry: previousBookmark,

                    connectOnStartup: false,
                    connectProfile: "default",

                    defaultChannelPasswordHash: undefined,
                    defaultChannel: undefined,

                    serverAddress: "",
                    serverPasswordHash: undefined
                });
            } else {
                bookmarks.createDirectory({
                    displayName: event.displayName,

                    parentEntry: parentBookmark,
                    previousEntry: previousBookmark,
                });
            }
        });

        this.events.on("action_duplicate_bookmark", event => {
            if(!event.displayName) {
                return;
            }

            const bookmark = bookmarks.findBookmark(event.uniqueId);
            if(!bookmark || bookmark.type !== "entry") {
                return;
            }

            const newBookmark = bookmarks.createBookmark({
                serverAddress: bookmark.serverAddress,
                serverPasswordHash: bookmark.serverPasswordHash,

                defaultChannel: bookmark.defaultChannel,
                defaultChannelPasswordHash: bookmark.defaultChannelPasswordHash,

                connectOnStartup: bookmark.connectOnStartup,
                connectProfile: bookmark.connectProfile,

                displayName: event.displayName,

                previousEntry: bookmark.uniqueId,
                parentEntry: bookmark.parentEntry
            });
            this.selectBookmark(newBookmark.uniqueId);
        });

        this.events.on("action_connect", event => {
            bookmarks.executeConnect(event.uniqueId, event.newTab);
        });

        this.events.on("action_export", () => {
            this.events.fire("notify_export_data", { payload: bookmarks.exportBookmarks() });
        });

        this.events.on("action_import", event => {
            if(!event.payload) {
                return;
            }

            try {
                const importedBookmarks = bookmarks.importBookmarks(event.payload);
                this.events.fire("notify_import_result", { status: "success", importedBookmarks: importedBookmarks });
            } catch (error) {
                if(typeof error !== "string") {
                    logError(LogCategory.BOOKMARKS, tr("Failed to import bookmarks: %o"), error);
                    error = tr("lookup the console for more details");
                }

                this.events.fire("notify_import_result", { status: "error", message: error });
            }
        });
    }

    initialize() {
        this.registeredListeners.push(bookmarks.events.on("notify_bookmark_deleted", event => {
            this.variables.sendVariable("bookmarks");
            if(this.selectedBookmark?.uniqueId === event.bookmark.uniqueId) {
                this.selectBookmark(bookmarks.getRegisteredBookmarks()[0]?.uniqueId);
            }
        }));

        this.registeredListeners.push(bookmarks.events.on("notify_bookmark_created", event => {
            this.variables.sendVariable("bookmarks");
            this.selectBookmark(event.bookmark.uniqueId);
        }));

        this.registeredListeners.push(bookmarks.events.on("notify_bookmarks_imported", () => this.variables.sendVariable("bookmarks")));

        this.registeredListeners.push(bookmarks.events.on("notify_bookmark_edited", event => {
            if(event.keys.indexOf("serverAddress") !== -1) {
                delete this.bookmarkUniqueServerIds[event.bookmark.uniqueId];
            }

            if(event.keys.indexOf("displayName") !== -1 ||
                event.keys.indexOf("parentEntry") !== -1 ||
                event.keys.indexOf("previousEntry") !== -1 ||
                event.keys.indexOf("serverAddress") !== -1) {
                this.variables.sendVariable("bookmarks");
            }

            if(event.bookmark.uniqueId === this.selectedBookmark?.uniqueId) {
                if(event.keys.indexOf("displayName") !== -1) {
                    this.variables.sendVariable("bookmarkName", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("connectProfile") !== -1) {
                    this.variables.sendVariable("bookmarkConnectProfile", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("connectOnStartup") !== -1) {
                    this.variables.sendVariable("bookmarkConnectOnStartup", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("serverAddress") !== -1) {
                    this.variables.sendVariable("bookmarkServerAddress", this.selectedBookmark.uniqueId);
                    this.variables.sendVariable("bookmarkInfo", this.selectedBookmark.uniqueId);
                    this.variables.sendVariable("currentClientChannel", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("serverPasswordHash") !== -1) {
                    this.variables.sendVariable("bookmarkServerPassword", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("defaultChannel") !== -1) {
                    this.variables.sendVariable("bookmarkDefaultChannel", this.selectedBookmark.uniqueId);
                }

                if(event.keys.indexOf("defaultChannelPasswordHash") !== -1) {
                    this.variables.sendVariable("bookmarkDefaultChannelPassword", this.selectedBookmark.uniqueId);
                }
            }
        }));

        this.registeredListeners.push(server_connections.events().on("notify_handler_created", event => {
            this.registerHandlerListener(event.handler);
        }));

        this.registeredListeners.push(server_connections.events().on("notify_handler_deleted", event => {
            this.unregisterHandlerListener(event.handler);
        }));

        server_connections.getAllConnectionHandlers().forEach(handler => this.registerHandlerListener(handler));
        this.selectBookmark(bookmarks.getRegisteredBookmarks()[0].uniqueId);
    }

    private registerHandlerListener(handler: ConnectionHandler) {
        const events = this.registeredHandlerListeners[handler.handlerId] = [];
        events.push(handler.events().on("notify_connection_state_changed", event => {
            if(event.newState !== ConnectionState.CONNECTED) {
                this.updateHandlerClientChannel(handler, undefined);
            }
        }));

        events.push(handler.channelTree.events.on(["notify_client_moved", "notify_client_enter_view"], event => {
            if(!(event.client instanceof LocalClientEntry)) {
                return;
            }

            const targetChannel = event.client.currentChannel();
            if(!targetChannel) {
                this.updateHandlerClientChannel(handler, undefined);
                return;
            }

            /* TODO: Register to channel rename events maybe? */
            this.updateHandlerClientChannel(handler);
        }));

        this.updateHandlerClientChannel(handler);
    }

    private unregisterHandlerListener(handler: ConnectionHandler) {
        this.updateHandlerClientChannel(handler, undefined);
        this.registeredHandlerListeners[handler.handlerId]?.forEach(callback => callback());
        delete this.registeredHandlerListeners[handler.handlerId];
    }

    private updateHandlerClientChannel(handler: ConnectionHandler, newChannel?: CurrentClientChannel) {
        if(arguments.length === 1 && handler.connected) {
            const channel = handler.getClient().currentChannel();
            if(channel) {
                let path;
                {
                    path = "";
                    let current = channel;
                    while(current) {
                        path = "/" + current.channelName() + path;
                        current = current.parent_channel();
                    }
                }

                newChannel = {
                    name: channel.channelName(),
                    passwordHash: channel.getCachedPasswordHash(),
                    path: path,
                    channelId: channel.getChannelId()
                };
            }
        }

        const oldChannel = this.registeredHandlerListeners[handler.handlerId];
        if(_.isEqual(oldChannel, newChannel)) {
            return;
        }

        if(!newChannel) {
            delete this.currentClientChannels[handler.handlerId];
        } else {
            this.currentClientChannels[handler.handlerId] = newChannel;
        }

        /* Only update the current bookmark */
        const handlerServerUniqueId = handler.getCurrentServerUniqueId();
        this.getBookmarkServerUniqueId(this.selectedBookmark).then(serverUniqueId => {
            if(serverUniqueId !== handlerServerUniqueId) {
                return;
            }

            this.variables.sendVariable("currentClientChannel", this.selectedBookmark.uniqueId);
        });
    }

    destroy() {
        this.registeredListeners.forEach(callback => callback());
        this.registeredListeners = [];

        Object.keys(this.registeredHandlerListeners)
            .forEach(handlerId => this.registeredHandlerListeners[handlerId].forEach(callback => callback()));
        this.registeredHandlerListeners = {};

        this.events.destroy();
        this.variables.destroy();
    }

    selectBookmark(bookmarkUniqueId: string) {
        if(this.selectedBookmark?.uniqueId === bookmarkUniqueId) {
            return;
        }

        this.selectedBookmark = bookmarks.findBookmark(bookmarkUniqueId);
        this.variables.sendVariable("bookmarkSelected");
    }

    private bookmarkInfoProvider<T>(defaultValue: T, callback: (bookmark: BookmarkInfo) => T | Promise<T>) : (bookmarkId: any) => T | Promise<T> {
        return bookmarkId => {
            if(!bookmarkId) {
                return defaultValue;
            }

            if(bookmarkId === this.selectedBookmark?.uniqueId) {
                if(this.selectedBookmark.type === "entry") {
                    return callback(this.selectedBookmark);
                } else {
                    return defaultValue;
                }
            } else {
                const bookmark = bookmarks.findBookmark(bookmarkId);
                if(bookmark?.type === "entry") {
                    return callback(bookmark);
                } else {
                    return defaultValue;
                }
            }
        }
    }

    private bookmarkEditor<T, R>(callback: (updates: Partial<BookmarkInfo>, newValue: T, bookmark: BookmarkInfo) => Promise<R>) : (newValue: T, bookmarkId: any) => Promise<R | false> {
        return async (newValue, bookmarkId) => {
            if(!bookmarkId) {
                return;
            }

            let bookmark: BookmarkInfo;
            if(bookmarkId === this.selectedBookmark?.uniqueId) {
                if(this.selectedBookmark.type === "entry") {
                    bookmark = this.selectedBookmark;
                }
            } else {
                const foundBookmark = bookmarks.findBookmark(bookmarkId);
                if(foundBookmark?.type === "entry") {
                    bookmark = foundBookmark;
                }
            }

            if(!bookmark) {
                return false;
            }

            const updates = {};
            const result = await callback(updates, newValue, bookmark);

            if(Object.keys(updates).length > 0) {
                bookmarks.editBookmark(bookmark.uniqueId, updates);
            }
            return result;
        }
    }

    private getBookmarkServerUniqueId(bookmarkOrId: string | BookmarkEntry) : Promise<string | undefined> {
        let bookmarkId = typeof bookmarkOrId === "string" ? bookmarkOrId : bookmarkOrId?.uniqueId;
        let bookmark = typeof bookmarkOrId === "string" ? bookmarks.findBookmark(bookmarkOrId) : bookmarkOrId;
        if(!bookmark || bookmark.type !== "entry") {
            return Promise.resolve(undefined);
        }

        if(this.bookmarkUniqueServerIds[bookmarkId]) {
            return this.bookmarkUniqueServerIds[bookmarkId];
        }

        return this.bookmarkUniqueServerIds[bookmarkId] = (async () => {
            const info = await connectionHistory.lastConnectInfo(bookmark.serverAddress, "address", true);
            if(!info) {
                return undefined;
            }

            return info.serverUniqueId;
        })();
    }
}

export function spawnBookmarkModal() {
    const controller = new BookmarkModalController();
    controller.initialize();

    const modal = spawnModal("modal-bookmarks", [controller.events.generateIpcDescription(), controller.variables.generateConsumerDescription()], { popoutable: true, popedOut: false });
    modal.getEvents().on("destroy", () => controller.destroy());

    controller.events.on("action_connect", event => {
        if(!event.closeModal) {
            return;
        }

        modal.destroy();
    });

    modal.show().then(undefined);
}