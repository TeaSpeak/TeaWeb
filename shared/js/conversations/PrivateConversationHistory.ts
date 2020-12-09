import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import { tr } from "tc-shared/i18n/localize";
import {LogCategory, logDebug, logError, logInfo, logWarn} from "tc-shared/log";
import {ChatEvent} from "../ui/frames/side/AbstractConversationDefinitions";

const clientUniqueId2StoreName = uniqueId => "conversation-" + uniqueId;

let currentDatabase: IDBDatabase;
let databaseMode: "closed" | "opening" | "updating" | "open" = "closed";

/* will trigger only once, have to be re added */
const databaseStateChangedCallbacks: (() => void)[] = [];
async function requestDatabase() {
    while(true) {
        if(databaseMode === "open") {
            return;
        } else if(databaseMode === "opening" || databaseMode === "updating") {
            await new Promise(resolve => databaseStateChangedCallbacks.push(resolve));
        } else if(databaseMode === "closed") {
            await doOpenDatabase(false);
        }
    }
}

async function executeClose() {
    currentDatabase.close();
    /* We don't await the close since for some reason the onclose callback never triggers */
    /* await new Promise(resolve => currentDatabase.onclose = resolve); */
    currentDatabase = undefined;
}

type DatabaseUpdateRequest = (database: IDBDatabase) => void;
const databaseUpdateRequests: DatabaseUpdateRequest[] = [];
async function requestDatabaseUpdate(callback: (database: IDBDatabase) => void) : Promise<void> {
    while(true) {
        if(databaseMode === "opening") {
            await requestDatabase();
        } else if(databaseMode === "updating") {
            databaseUpdateRequests.push(callback);
            await requestDatabase();
            if(databaseUpdateRequests.indexOf(callback) === -1)
                return;
        } else if(databaseMode === "open") {
            databaseMode = "updating";
            await executeClose();
            break;
        } else if(databaseMode === "closed") {
            databaseMode = "updating";
            break;
        }
    }

    /* lets update the database */
    databaseMode = "updating";
    fireDatabaseStateChanged();

    databaseUpdateRequests.push(callback);
    await doOpenDatabase(true);
}

function fireDatabaseStateChanged() {
    while(databaseStateChangedCallbacks.length > 0) {
        try {
            databaseStateChangedCallbacks.pop()();
        } catch (error) {
            logError(LogCategory.CHAT, tr("Database ready callback throw an unexpected exception: %o"), error);
        }
    }
}

let cacheImportUniqueKeyId = 0;
async function importChatsFromCacheStorage(database: IDBDatabase) {
    if(!(await caches.has("chat_history"))) {
        return;
    }

    logInfo(LogCategory.CHAT, tr("Importing old chats saved via cache storage. This may take some moments."));

    let chatEvents = {};
    const cache = await caches.open("chat_history");

    for(const chat of await cache.keys()) {
        try {
            if(!chat.url.startsWith("https://_local_cache/cache_request_")) {
                logWarn(LogCategory.CHAT, tr("Skipping importing chat %s because URL does not match."), chat.url);
                continue;
            }

            const clientUniqueId = chat.url.substring(35).split("_")[1];
            const events: ChatEvent[] = chatEvents[clientUniqueId] || (chatEvents[clientUniqueId] = []);

            const data = await (await cache.match(chat)).json();
            if(!Array.isArray(data)) {
                throw tr("array expected");
            }

            for(const event of data) {
                events.push({
                    type: "message",
                    timestamp: event["timestamp"],
                    isOwnMessage: event["sender"] === "self",
                    uniqueId: "ci-m-" + event["timestamp"] + "-" + (++cacheImportUniqueKeyId),
                    message: {
                        message: event["message"],
                        timestamp: event["timestamp"],
                        sender_database_id: event["sender_database_id"],
                        sender_name: event["sender_name"],
                        sender_unique_id: event["sender_unique_id"]
                    }
                });
            }
        } catch (error) {
            logWarn(LogCategory.CHAT, tr("Skipping importing chat %s because of an error: %o"), chat?.url, error);
        }
    }

    const clientUniqueIds = Object.keys(chatEvents);
    if(clientUniqueIds.length === 0) {
        return;
    }

    logInfo(LogCategory.CHAT, tr("Found %d old chats. Importing."), clientUniqueIds.length);
    await requestDatabaseUpdate(database => {
        for(const uniqueId of clientUniqueIds) {
            doInitializeUser(uniqueId, database);
        }
    });
    await requestDatabase();

    for(const uniqueId of clientUniqueIds) {
        const storeName = clientUniqueId2StoreName(uniqueId);
        const transaction = currentDatabase.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        chatEvents[uniqueId].forEach(event => {
            store.put(event);
        });
        await new Promise(resolve => store.transaction.oncomplete = resolve);
    }

    logInfo(LogCategory.CHAT, tr("All old chats have been imported. Deleting old data."));
    await caches.delete("chat_history");
}

async function doOpenDatabase(forceUpgrade: boolean) {
    if(databaseMode === "closed") {
        databaseMode = "opening";
        fireDatabaseStateChanged();
    }

    let localVersion = parseInt(localStorage.getItem("indexeddb-private-conversations-version") || "0");
    let upgradePerformed = false;

    while(true) {
        const openRequest = indexedDB.open("private-conversations", forceUpgrade ? localVersion  + 1 : undefined);
        openRequest.onupgradeneeded = event => {
            if(event.oldVersion === 0) {
                /* database newly created */
                importChatsFromCacheStorage(openRequest.result).catch(error => {
                    logWarn(LogCategory.CHAT, tr("Failed to import old chats from cache storage: %o"), error);
                });
            }
            upgradePerformed = true;
            while (databaseUpdateRequests.length > 0) {
                try {
                    databaseUpdateRequests.pop()(openRequest.result);
                } catch (error) {
                    logError(LogCategory.CHAT, tr("Database update callback throw an unexpected exception: %o"), error);
                }
            }
        };

        const database = await new Promise<IDBDatabase>((resolve, reject) => {
            openRequest.onblocked = () => {
                reject(tr("Failed to open/upgrade the private chat database.\nPlease close all other instances of the TeaWeb client."));
            };

            openRequest.onerror = () => {
                console.error("Private conversation history opening error: %o", openRequest.error);
                reject(openRequest.error.message);
            };

            openRequest.onsuccess = () => resolve(openRequest.result);
        });

        localStorage.setItem("indexeddb-private-conversations-version", database.version.toString());
        if(!upgradePerformed && forceUpgrade) {
            logWarn(LogCategory.CHAT, tr("Opened private conversations database, with an update, but update didn't happened. Trying again."));
            database.close();
            await new Promise(resolve => database.onclose = resolve);
            continue;
        }

        database.onversionchange = () => {
            logDebug(LogCategory.CHAT, tr("Received external database version change. Closing database."));
            databaseMode = "closed";
            executeClose();
        };

        currentDatabase = database;
        databaseMode = "open";
        fireDatabaseStateChanged();
        break;
    }
}

function doInitializeUser(uniqueId: string, database: IDBDatabase) {
    const storeId = clientUniqueId2StoreName(uniqueId);
    if(database.objectStoreNames.contains(storeId))
        return;

    const store = database.createObjectStore(storeId, { keyPath: "databaseId", autoIncrement: true });

    store.createIndex("timestamp", "timestamp", { unique: false });
    store.createIndex("uniqueId", "uniqueId", { unique: false });
    store.createIndex("type", "type", { unique: false });
}

async function initializeUser(uniqueId: string) {
    await requestDatabase();

    const storeId = clientUniqueId2StoreName(uniqueId);
    if(currentDatabase.objectStoreNames.contains(storeId))
        return;

    await requestDatabaseUpdate(database => doInitializeUser(uniqueId, database));
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 0,
    name: "Chat history setup",
    function: async () => {
        if(!('indexedDB' in window)) {
            loader.critical_error(tr("Missing Indexed DB support"));
            throw tr("Missing Indexed DB support");
        }

        try {
            await doOpenDatabase(false);
            logDebug(LogCategory.CHAT, tr("Successfully initialized private conversation history database"));
        } catch (error) {
            logError(LogCategory.CHAT, tr("Failed to initialize private conversation history database: %o"), error);
            logError(LogCategory.CHAT, tr("Do not saving the private conversation chat."));
        }
    }
});

export async function queryConversationEvents(clientUniqueId: string, query: {
    begin: number,
    end: number,
    direction: "backwards" | "forwards",
    limit: number
}) : Promise<{ events: (ChatEvent & { databaseId: number })[], hasMore: boolean }> {
    const storeName = clientUniqueId2StoreName(clientUniqueId);

    await requestDatabase();
    if(!currentDatabase.objectStoreNames.contains(storeName))
        return { events: [], hasMore: false };

    const transaction = currentDatabase.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);

    const cursor = store.index("timestamp").openCursor(IDBKeyRange.bound(query.end, query.begin, false, false), query.direction === "backwards" ? "prev" : "next");

    const events = [];
    let hasMoreEvents = false;

    await new Promise((resolve, reject) => {
        cursor.onsuccess = () => {
            if(!cursor.result) {
                /* no more results */
                resolve();
                return;
            }

            if(events.length > query.limit) {
                hasMoreEvents = true;
                resolve();
                return;
            }

            events.push(cursor.result.value);
            cursor.result.continue();
        };

        cursor.onerror = () => reject(cursor.error);
    });

    return { events: events, hasMore: hasMoreEvents };
}

export async function registerConversationEvent(clientUniqueId: string, event: ChatEvent) : Promise<void> {
    await initializeUser(clientUniqueId);
    const storeName = clientUniqueId2StoreName(clientUniqueId);

    await requestDatabase();
    const transaction = currentDatabase.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);

    store.put(event);
}