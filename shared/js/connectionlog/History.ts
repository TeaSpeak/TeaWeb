import {LogCategory, logError, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {server_connections} from "tc-shared/ConnectionManager";
import {ServerProperties} from "tc-shared/tree/Server";

const kUnknownServerUniqueId = "unknown";

export type ConnectionHistoryEntry = {
    id: number,
    timestamp: number,

    targetHost: string,
    targetPort: number,

    serverUniqueId: string | typeof kUnknownServerUniqueId
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

    /* These properties are only available upon server variable retrieval */
    clientsOnline: number | -1,
    clientsMax: number | -1,

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
                        const store = database.createObjectStore("attempt-history", { keyPath: "id", autoIncrement: true });
                        store.createIndex("timestamp", "timestamp", { unique: false });
                        store.createIndex("targetHost", "targetHost", { unique: false });
                        store.createIndex("targetPort", "targetPort", { unique: false });
                        store.createIndex("serverUniqueId", "serverUniqueId", { unique: false });
                    }

                    if(!database.objectStoreNames.contains("server-info")) {
                        const store = database.createObjectStore("server-info", { keyPath: "uniqueId" });
                        store.createIndex("firstConnectTimestamp", "firstConnectTimestamp", { unique: false });
                        store.createIndex("firstConnectId", "firstConnectId", { unique: false });

                        store.createIndex("lastConnectTimestamp", "lastConnectTimestamp", { unique: false });
                        store.createIndex("lastConnectId", "lastConnectId", { unique: false });

                        store.createIndex("name", "name", { unique: false });
                        store.createIndex("iconId", "iconId", { unique: false });

                        store.createIndex("clientsOnline", "clientsOnline", { unique: false });
                        store.createIndex("clientsMax", "clientsMax", { unique: false });

                        store.createIndex("passwordProtected", "passwordProtected", { unique: false });
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
     * @param targetHost
     * @param targetPort
     * @return Returns a unique connect attempt identifier id which could be later used to set the unique server id.
     */
    async logConnectionAttempt(targetHost: string, targetPort: number) : Promise<number> {
        if(!this.database) {
            return;
        }

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
        const store = transaction.objectStore("attempt-history");

        const id = await new Promise<IDBValidKey>((resolve, reject) => {
            const insert = store.put({
                timestamp: Date.now(),
                targetHost: targetHost,
                targetPort: targetPort,
                serverUniqueId: kUnknownServerUniqueId
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

    private async resolveDatabaseServerInfo(serverUniqueId: string) : Promise<IDBCursorWithValue | null> {
        const transaction = this.database.transaction(["server-info"], "readwrite");
        const store = transaction.objectStore("server-info");

        return await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
            const cursor = store.openCursor(serverUniqueId);
            cursor.onsuccess = () => resolve(cursor.result);
            cursor.onerror = () => reject(cursor.error);
        });
    }

    private async updateDatabaseServerInfo(serverUniqueId: string, updateCallback: (databaseValue) => void) {
        let entry = await this.resolveDatabaseServerInfo(serverUniqueId);

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
            } else if(entry.value.serverUniqueId !== kUnknownServerUniqueId) {
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
        });
    }

    /**
     * Query the server info of a given server unique id
     * @param serverUniqueId
     */
    async queryServerInfo(serverUniqueId: string) : Promise<(ConnectionHistoryServerInfo & ConnectionHistoryServerEntry) | undefined> {
        if(!this.database) {
            return undefined;
        }

        let entry = await this.resolveDatabaseServerInfo(serverUniqueId);
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

            clientsOnline: value.clientsOnline,
            clientsMax: value.clientsMax,

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

        const transaction = this.database.transaction(["attempt-history"], "readwrite");
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

                targetHost: entry.value.targetHost,
                targetPort: entry.value.targetPort,

                serverUniqueId: entry.value.serverUniqueId,
            } as ConnectionHistoryEntry;
            entry.continue();

            if(parsedEntry.serverUniqueId !== kUnknownServerUniqueId) {
                if(result.findIndex(entry => entry.serverUniqueId === parsedEntry.serverUniqueId) !== -1) {
                    continue;
                }
            } else {
                if(result.findIndex(entry => {
                    return entry.targetHost === parsedEntry.targetHost && entry.targetPort === parsedEntry.targetPort;
                }) !== -1) {
                    continue;
                }
            }

            result.push(parsedEntry);
        }

        return result;
    }
}

const kConnectServerInfoUpdatePropertyKeys: (keyof ServerProperties)[] = [
    "virtualserver_icon_id",
    "virtualserver_name",
    "virtualserver_flag_password",
    "virtualserver_maxclients",
    "virtualserver_clientsonline",
    "virtualserver_flag_password"
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

                        clientsMax: event.server_properties.virtualserver_maxclients,
                        clientsOnline: event.server_properties.virtualserver_clientsonline,

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