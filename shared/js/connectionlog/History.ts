import {LogCategory, logError, logWarn} from "tc-shared/log";
import {tr, tra} from "tc-shared/i18n/localize";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {server_connections} from "tc-shared/ConnectionManager";
import {ServerProperties} from "tc-shared/tree/Server";

export const kUnknownHistoryServerUniqueId = "unknown";

export type ConnectionHistoryEntry = {
    id: number,
    timestamp: number,

    serverUniqueId: string | typeof kUnknownHistoryServerUniqueId

    /* Target address how it has been given by the user */
    targetAddress: string,
    nickname: string,
    hashedPassword: string,
};

export type ConnectionHistoryServerEntry = {
    firstConnectTimestamp: number,
    firstConnectId: number,

    lastConnectTimestamp: number,
    lastConnectId: number,
}

export type ConnectionHistoryServerInfo = {
    name: string,
    iconId: number,

    country: string,

    /* These properties are only available upon server variable retrieval */
    clientsOnline: number | -1,
    clientsMax: number | -1,

    hostBannerUrl: string | undefined,
    hostBannerMode: number,

    passwordProtected: boolean
}

export class ConnectionHistory {
    private database: IDBDatabase;

    constructor() { }

    async initializeDatabase() {
        const openRequest = indexedDB.open("connection-log", 1);
        openRequest.onupgradeneeded = event => {
            const database = openRequest.result;
            switch (event.oldVersion) {
                case 0:
                    if(!database.objectStoreNames.contains("attempt-history")) {
                        /*
                            Schema:
                            {
                                timestamp: number,
                                targetAddress: string,
                                nickname: string,
                                hashedPassword: string,
                                serverUniqueId: string | typeof kUnknownHistoryServerUniqueId,

                            }
                         */
                        const store = database.createObjectStore("attempt-history", { keyPath: "id", autoIncrement: true });
                        store.createIndex("timestamp", "timestamp", { unique: false });
                        store.createIndex("targetAddress", "targetAddress", { unique: false });
                        store.createIndex("serverUniqueId", "serverUniqueId", { unique: false });
                    }

                    if(!database.objectStoreNames.contains("server-info")) {
                        database.createObjectStore("server-info", { keyPath: "uniqueId" });
                        /*
                            Schema:
                            {
                                firstConnectTimestamp: number,
                                firstConnectId: number,

                                lastConnectTimestamp: number,
                                lastConnectId: number,

                                name: string,
                                iconId: number,

                                country: string,

                                clientsOnline: number | -1,
                                clientsMax: number | -1,

                                passwordProtected: boolean
                            }
                         */
                    }

                    /* fall through wanted */
                case 1:
                    break;

                default:
                    throw tra("connection log database has an invalid version: {}", event.oldVersion);
            }
        };

        this.database = await new Promise<IDBDatabase>((resolve, reject) => {
            openRequest.onblocked = () => reject(tr("Failed to open the connection log database"));

            openRequest.onerror = () => {
                logError(LogCategory.GENERAL, tr("Failed to open the client connection log database: %o"), openRequest.error);
                reject(openRequest.error.message);
            };

            openRequest.onsuccess = () => resolve(openRequest.result);
        });
    }

    /**
     * Register a new connection attempt.
     * @param attempt
     * @return Returns a unique connect attempt identifier id which could be later used to set the unique server id.
     */
    async logConnectionAttempt(attempt: {
        targetAddress: string,
        nickname: string,
        hashedPassword: string,
    }) : Promise<number> {
        if(!this.database) {
            return;
        }

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
        const store = transaction.objectStore("attempt-history");

        const id = await new Promise<IDBValidKey>((resolve, reject) => {
            const insert = store.put({
                timestamp: Date.now(),
                serverUniqueId: kUnknownHistoryServerUniqueId,

                targetAddress: attempt.targetAddress,
                nickname: attempt.nickname,
                hashedPassword: attempt.hashedPassword,
            });

            insert.onsuccess = () => resolve(insert.result);
            insert.onerror = () => reject(insert.error);
        });

        if(typeof id !== "number") {
            logError(LogCategory.GENERAL, tr("Received invalid idb key type which isn't a number: %o"), id);
            throw tr("invalid idb key returned");
        }

        return id;
    }

    private async resolveDatabaseServerInfo(serverUniqueId: string, mode: IDBTransactionMode) : Promise<IDBCursorWithValue | null> {
        const transaction = this.database.transaction(["server-info"], mode);
        const store = transaction.objectStore("server-info");

        return await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
            const cursor = store.openCursor(serverUniqueId);
            cursor.onsuccess = () => resolve(cursor.result);
            cursor.onerror = () => reject(cursor.error);
        });
    }

    private async updateDatabaseServerInfo(serverUniqueId: string, updateCallback: (databaseValue) => void) {
        let entry = await this.resolveDatabaseServerInfo(serverUniqueId, "readwrite");

        if(entry) {
            const newValue = Object.assign({}, entry.value);
            updateCallback(newValue);
            await new Promise((resolve, reject) => {
                const update = entry.update(newValue);
                update.onsuccess = resolve;
                update.onerror = () => reject(update.error);
            });
        } else {
            const transaction = this.database.transaction(["server-info"], "readwrite");
            const store = transaction.objectStore("server-info");

            const value = {
                uniqueId: serverUniqueId,

                firstConnectTimestamp: 0,
                firstConnectId: -1,

                lastConnectTimestamp: 0,
                lastConnectId: -1,

                name: tr("unknown"),
                iconId: 0,

                clientsOnline: -1,
                clientsMax: -1,

                passwordProtected: false
            };

            updateCallback(value);
            await new Promise((resolve, reject) => {
                const insert = store.put(value);
                insert.onsuccess = resolve;
                insert.onerror = () => reject(insert.error);
            });
        }
    }

    /**
     * Update the connection attempts target server id.
     * @param connectionAttemptId
     * @param serverUniqueId
     */
    async updateConnectionServerUniqueId(connectionAttemptId: number, serverUniqueId: string) {
        if(!this.database) {
            return;
        }

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
        const store = transaction.objectStore("attempt-history");

        let connectAttemptInfo;
        {
            const entry = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
                const cursor = store.openCursor(connectionAttemptId);
                cursor.onsuccess = () => resolve(cursor.result);
                cursor.onerror = () => reject(cursor.error);
            });

            if(!entry) {
                throw tr("missing connection attempt");
            }

            if(entry.value.serverUniqueId === serverUniqueId) {
                logWarn(LogCategory.GENERAL, tr("updateConnectionServerUniqueId(...) has been called twice"));
                return;
            } else if(entry.value.serverUniqueId !== kUnknownHistoryServerUniqueId) {
                throw tr("connection attempt has already a server unique id set");
            }

            const newValue = connectAttemptInfo = Object.assign({}, entry.value);
            newValue.serverUniqueId = serverUniqueId;

            await new Promise((resolve, reject) => {
                const update = entry.update(newValue);
                update.onsuccess = resolve;
                update.onerror = () => reject(update.error);
            });
        }

        await this.updateDatabaseServerInfo(serverUniqueId, databaseValue => {
            if(databaseValue.firstConnectTimestamp === 0) {
                databaseValue.firstConnectTimestamp = connectAttemptInfo.timestamp;
                databaseValue.firstConnectId = connectAttemptInfo.id;
            }

            databaseValue.lastConnectTimestamp = connectAttemptInfo.timestamp;
            databaseValue.lastConnectId = connectAttemptInfo.id;
        });
    }

    /**
     * Update the connection attempt server password
     * @param connectionAttemptId
     * @param passwordHash
     */
    async updateConnectionServerPassword(connectionAttemptId: number, passwordHash: string) {
        if(!this.database) {
            return;
        }

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
        const store = transaction.objectStore("attempt-history");

        const entry = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
            const cursor = store.openCursor(connectionAttemptId);
            cursor.onsuccess = () => resolve(cursor.result);
            cursor.onerror = () => reject(cursor.error);
        });

        if(!entry) {
            throw tr("missing connection attempt");
        }

        const newValue = Object.assign({}, entry.value);
        newValue.hashedPassword = passwordHash;

        await new Promise((resolve, reject) => {
            const update = entry.update(newValue);
            update.onsuccess = resolve;
            update.onerror = () => reject(update.error);
        });
    }

    /**
     * Update the server info of the given server.
     * @param serverUniqueId
     * @param info
     */
    async updateServerInfo(serverUniqueId: string, info: ConnectionHistoryServerInfo) {
        if(!this.database) {
            return;
        }


        await this.updateDatabaseServerInfo(serverUniqueId, databaseValue => {
            databaseValue.name = info.name;
            databaseValue.iconId = info.iconId;

            databaseValue.clientsOnline = info.clientsOnline;
            databaseValue.clientsMax = info.clientsMax;

            databaseValue.hostBannerUrl = info.hostBannerUrl
            databaseValue.hostBannerMode = info.hostBannerMode;
        });
    }

    async deleteConnectionAttempts(target: string, targetType: "address" | "server-unique-id") {
        if(!this.database) {
            return;
        }

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
        const store = transaction.objectStore("attempt-history");

        const cursor = store.index(targetType === "server-unique-id" ? "serverUniqueId" : "targetAddress").openCursor(target);
        const promises = [];
        while(true) {
            const entry = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
                cursor.onsuccess = () => resolve(cursor.result);
                cursor.onerror = () => reject(cursor.error);
            });

            if (!entry) {
                break;
            }

            promises.push(new Promise<void>(resolve => {
                const deleteRequest = entry.delete();
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => {
                    logWarn(LogCategory.GENERAL, tr("Failed to delete a connection attempt: %o"), deleteRequest.error);
                    resolve();
                }
            }));

            entry.continue();
        }

        await Promise.all(promises);
    }

    /**
     * Query the server info of a given server unique id
     * @param serverUniqueId
     */
    async queryServerInfo(serverUniqueId: string) : Promise<(ConnectionHistoryServerInfo & ConnectionHistoryServerEntry) | undefined> {
        if(!this.database) {
            return undefined;
        }

        let entry = await this.resolveDatabaseServerInfo(serverUniqueId, "readonly");
        if(!entry) {
            return;
        }

        const value = entry.value;
        return {
            firstConnectId: value.firstConnectId,
            firstConnectTimestamp: value.firstConnectTimestamp,

            lastConnectId: value.lastConnectId,
            lastConnectTimestamp: value.lastConnectTimestamp,

            name: value.name,
            iconId: value.iconId,

            country: value.country,

            clientsOnline: value.clientsOnline,
            clientsMax: value.clientsMax,

            hostBannerUrl: value.hostBannerUrl,
            hostBannerMode: typeof value.hostBannerMode === "number" ? value.hostBannerMode : 0,

            passwordProtected: value.passwordProtected
        };
    }

    /**
     * Query the last connected addresses/servers.
     * @param maxUniqueServers
     */
    async lastConnectedServers(maxUniqueServers: number) : Promise<ConnectionHistoryEntry[]> {
        if(!this.database) {
            return [];
        }

        const result: ConnectionHistoryEntry[] = [];

        const transaction = this.database.transaction(["attempt-history"], "readonly");
        const store = transaction.objectStore("attempt-history");

        const cursor = store.index("timestamp").openCursor(undefined, "prev");
        while(result.length < maxUniqueServers) {
            const entry = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
                cursor.onsuccess = () => resolve(cursor.result);
                cursor.onerror = () => reject(cursor.error);
            });

            if(!entry) {
                break;
            }

            const parsedEntry = {
                id: entry.value.id,
                timestamp: entry.value.timestamp,
                serverUniqueId: entry.value.serverUniqueId,

                nickname: entry.value.nickname,
                hashedPassword: entry.value.hashedPassword,
                targetAddress: entry.value.targetAddress,
            } as ConnectionHistoryEntry;
            entry.continue();

            if(parsedEntry.serverUniqueId !== kUnknownHistoryServerUniqueId) {
                if(result.findIndex(entry => entry.serverUniqueId === parsedEntry.serverUniqueId) !== -1) {
                    continue;
                }

                const failedEntry = result.find(entry => entry.targetAddress === parsedEntry.targetAddress);
                if(failedEntry) {
                    /* We've a newer, but failed attempt to that address. Since we've connected to that address already we could just use that attempt */
                    failedEntry.serverUniqueId = parsedEntry.serverUniqueId;
                    continue;
                }
            } else {
                if(result.findIndex(entry => entry.targetAddress === parsedEntry.targetAddress) !== -1) {
                    continue;
                }
            }

            result.push(parsedEntry);
        }

        return result;
    }

    async lastConnectInfo(target: string, targetType: "address" | "server-unique-id", onlySucceeded?: boolean) : Promise<ConnectionHistoryEntry | undefined> {
        if(!this.database) {
            return undefined;
        }

        const transaction = this.database.transaction(["attempt-history"], "readonly");
        const store = transaction.objectStore("attempt-history");

        const cursor = store.index(targetType === "server-unique-id" ? "serverUniqueId" : "targetAddress").openCursor(target, "prev");
        while(true) {
            const entry = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
                cursor.onsuccess = () => resolve(cursor.result);
                cursor.onerror = () => reject(cursor.error);
            });

            if(!entry) {
                return undefined;
            }

            if(entry.value.serverUniqueId === kUnknownHistoryServerUniqueId && onlySucceeded) {
                continue;
            }

            return {
                id: entry.value.id,
                timestamp: entry.value.timestamp,
                serverUniqueId: entry.value.serverUniqueId,

                nickname: entry.value.nickname,
                hashedPassword: entry.value.hashedPassword,
                targetAddress: entry.value.targetAddress,
            };
        }
    }

    async countConnectCount(target: string, targetType: "address" | "server-unique-id") : Promise<number> {
        if(!this.database) {
            return -1;
        }

        const transaction = this.database.transaction(["attempt-history"], "readonly");
        const store = transaction.objectStore("attempt-history");


        const count = store.index(targetType === "server-unique-id" ? "serverUniqueId" : "targetAddress").count(target);
        return await new Promise<number>((resolve, reject) => {
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => reject(count.error);
        });
    }
}

const kConnectServerInfoUpdatePropertyKeys: (keyof ServerProperties)[] = [
    "virtualserver_icon_id",
    "virtualserver_name",
    "virtualserver_flag_password",
    "virtualserver_maxclients",
    "virtualserver_clientsonline",
    "virtualserver_flag_password",
    "virtualserver_country_code",
    "virtualserver_hostbanner_gfx_url",
    "virtualserver_hostbanner_mode"
];

class ConnectionHistoryUpdateListener {
    private readonly history: ConnectionHistory;

    private listenerHandlerManager: (() => void)[];
    private listenerConnectionHandler: {[key: string]: (() => void)[]} = {};

    constructor(history: ConnectionHistory) {
        this.history = history;
        this.listenerHandlerManager = [];

        this.listenerHandlerManager.push(server_connections.events().on("notify_handler_created", event => {
            this.registerConnectionHandler(event.handler);
        }));

        this.listenerHandlerManager.push(server_connections.events().on("notify_handler_deleted", event => {
            this.listenerConnectionHandler[event.handler.handlerId]?.forEach(callback => callback());
            delete this.listenerConnectionHandler[event.handler.handlerId];
        }));
    }

    destroy() {
        this.listenerHandlerManager.forEach(callback => callback());

        Object.values(this.listenerConnectionHandler).forEach(callbacks => callbacks.forEach(callback => callback()));
        this.listenerConnectionHandler = {};
    }

    private registerConnectionHandler(handler: ConnectionHandler) {
        handler.channelTree.server.events.on("notify_properties_updated", event => {
            if("virtualserver_unique_identifier" in event.updated_properties) {
                if(handler.currentConnectId > 0) {
                    this.history.updateConnectionServerUniqueId(handler.currentConnectId, event.server_properties.virtualserver_unique_identifier)
                        .catch(error => {
                            logError(LogCategory.GENERAL, tr("Failed to update connect server unique id: %o"), error);
                        })
                }
            }

            for(const key of kConnectServerInfoUpdatePropertyKeys) {
                if(key in event.updated_properties) {
                    this.history.updateServerInfo(event.server_properties.virtualserver_unique_identifier, {
                        name: event.server_properties.virtualserver_name,
                        iconId: event.server_properties.virtualserver_icon_id,

                        country: event.server_properties.virtualserver_country_code,

                        clientsMax: event.server_properties.virtualserver_maxclients,
                        clientsOnline: event.server_properties.virtualserver_clientsonline,

                        hostBannerUrl: event.server_properties.virtualserver_hostbanner_gfx_url,
                        hostBannerMode: event.server_properties.virtualserver_hostbanner_mode,

                        passwordProtected: event.server_properties.virtualserver_flag_password
                    }).catch(error => {
                        logError(LogCategory.GENERAL, tr("Failed to update connect server info: %o"), error);
                    });
                    break;
                }
            }
        });
    }
}

export let connectionHistory: ConnectionHistory;
let historyInfoListener: ConnectionHistoryUpdateListener;

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    priority: 0,
    name: "Chat history setup",
    function: async () => {
        if(!('indexedDB' in window)) {
            loader.critical_error(tr("Missing Indexed DB support"));
            throw tr("Missing Indexed DB support");
        }

        connectionHistory = new ConnectionHistory();
        try {
            await connectionHistory.initializeDatabase();
        } catch (error) {
            logError(LogCategory.GENERAL, tr("Failed to initialize connection history database: %o"), error);
            logError(LogCategory.GENERAL, tr("Do not saving the connection attempts."));
            return;
        }

        historyInfoListener = new ConnectionHistoryUpdateListener(connectionHistory);
        (window as any).connectionHistory = connectionHistory;
    }
});