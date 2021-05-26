import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

export type ClientInfoResult = {
    status: "success",

    clientName: string,
    clientUniqueId: string,
    clientDatabaseId: number,
} | {
    status: "not-found"
} | {
    status: "error",
    error: string
};

type PendingInfoRequest = {
    promise: Promise<ClientInfoResult>,
    resolve: (result: ClientInfoResult) => void,
    fullFilled: boolean,
};

type ClientInfo = {
    clientName: string,
    clientUniqueId: string,
    clientDatabaseId: number,
};

export class ClientInfoResolver {
    private readonly handler: ConnectionHandler;
    private readonly requestDatabaseIds: { [key: number]: PendingInfoRequest };
    private readonly requestUniqueIds: { [key: string]: PendingInfoRequest };

    private executed: boolean;

    constructor(handler: ConnectionHandler) {
        this.handler = handler;
        this.executed = false;

        this.requestDatabaseIds = {};
        this.requestUniqueIds = {};
    }

    private registerRequest(type: "database-id", key: number) : Promise<ClientInfoResult>;
    private registerRequest(type: "unique-id", key: string) : Promise<ClientInfoResult>;
    private registerRequest(type, key) : Promise<ClientInfoResult> {
        let targetObject;
        switch (type) {
            case "database-id":
                targetObject = this.requestDatabaseIds;
                break;

            case "unique-id":
                targetObject = this.requestUniqueIds;
                break;

            default:
                return;
        }

        if(this.executed) {
            throw tr("request already executed");
        }

        if(typeof targetObject[key] === "undefined") {
            const handle: PendingInfoRequest = {
                fullFilled: false,

                resolve: undefined,
                promise: undefined,
            };

            handle.promise = new Promise<ClientInfoResult>(resolve => handle.resolve = resolve);
            targetObject[key] = handle;
        }

        return targetObject[key].promise;
    }

    private fullFullAllRequests(type: "database-id" | "unique-id", result: ClientInfoResult) {
        let targetObject;
        switch (type) {
            case "database-id":
                targetObject = this.requestDatabaseIds;
                break;

            case "unique-id":
                targetObject = this.requestUniqueIds;
                break;

            default:
                return;
        }

        Object.keys(targetObject).forEach(key => {
            if(targetObject[key].fullFilled) {
                return;
            }

            targetObject[key].fullFilled = true;
            targetObject[key].resolve(result);
        });
    }

    private static parseClientInfo(json: any[]) : ClientInfo[] {
        const result: ClientInfo[] = [];

        let index = 0;
        for(const entry of json) {
            index++;

            if(typeof entry["cluid"] === "undefined") {
                logWarn(LogCategory.NETWORKING, tr("Missing client unique id in client info result bulk %d."), index);
                continue;
            }

            if(typeof entry["clname"] === "undefined") {
                logWarn(LogCategory.NETWORKING, tr("Missing client name in client info result bulk %d."), index);
                continue;
            }

            if(typeof entry["cldbid"] === "undefined") {
                logWarn(LogCategory.NETWORKING, tr("Missing client database id in client info result bulk %d."), index);
                continue;
            }

            const databaseId = parseInt(entry["cldbid"]);
            if(isNaN(databaseId)) {
                logWarn(LogCategory.NETWORKING, tr("Client database id (%s) in client info isn't parse able as integer in bulk  %d."), entry["cldbid"], index);
                continue;
            }

            result.push({ clientName: entry["clname"], clientUniqueId: entry["cluid"], clientDatabaseId: databaseId });
        }

        return result;
    }

    getInfoByDatabaseId(databaseId: number) : Promise<ClientInfoResult> {
        return this.registerRequest("database-id", databaseId);
    }

    getInfoByUniqueId(uniqueId: string) : Promise<ClientInfoResult> {
        return this.registerRequest("unique-id", uniqueId);
    }

    async executeQueries() {
        this.executed = true;
        let promises = [];
        let handlers = [];

        try {
            const requestDatabaseIds = Object.keys(this.requestDatabaseIds);
            if(requestDatabaseIds.length > 0) {
                handlers.push(this.handler.serverConnection.getCommandHandler().registerCommandHandler("notifyclientgetnamefromdbid", command => {
                    ClientInfoResolver.parseClientInfo(command.arguments).forEach(info => {
                        if(this.requestDatabaseIds[info.clientDatabaseId].fullFilled) {
                            return;
                        }

                        this.requestDatabaseIds[info.clientDatabaseId].fullFilled = true;
                        this.requestDatabaseIds[info.clientDatabaseId].resolve({
                            status: "success",

                            clientName: info.clientName,
                            clientDatabaseId: info.clientDatabaseId,
                            clientUniqueId: info.clientUniqueId
                        });
                    });
                }));

                promises.push(this.handler.serverConnection.send_command("clientgetnamefromdbid",
                    requestDatabaseIds.map(entry => ({ cldbid: entry })),
                    {
                        process_result: false,
                    }
                ).catch(error => {
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                            return;
                        }

                        error = error.formattedMessage();
                    } else if(typeof error !== "string") {
                        logError(LogCategory.NETWORKING, tr("Failed to resolve client info from database id: %o"), error);
                        error = tr("lookup the console");
                    }

                    this.fullFullAllRequests("database-id", {
                        status: "error",
                        error: error
                    });
                }));
            }

            const requestUniqueIds = Object.keys(this.requestUniqueIds);
            if(requestUniqueIds.length > 0) {
                handlers.push(this.handler.serverConnection.getCommandHandler().registerCommandHandler("notifyclientnamefromuid", command => {
                    ClientInfoResolver.parseClientInfo(command.arguments).forEach(info => {
                        if(this.requestUniqueIds[info.clientUniqueId].fullFilled) {
                            return;
                        }

                        this.requestUniqueIds[info.clientUniqueId].fullFilled = true;
                        this.requestUniqueIds[info.clientUniqueId].resolve({
                            status: "success",

                            clientName: info.clientName,
                            clientDatabaseId: info.clientDatabaseId,
                            clientUniqueId: info.clientUniqueId
                        });
                    });
                }));

                promises.push(this.handler.serverConnection.send_command("clientgetnamefromuid",
                    requestUniqueIds.map(entry => ({ cluid: entry })),
                    {
                        process_result: false,
                    }
                ).catch(error => {
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                            return;
                        }

                        error = error.formattedMessage();
                    } else if(typeof error !== "string") {
                        logError(LogCategory.NETWORKING, tr("Failed to resolve client info from unique id: %o"), error);
                        error = tr("lookup the console");
                    }

                    this.fullFullAllRequests("unique-id", {
                        status: "error",
                        error: error
                    });
                }));
            }

            await Promise.all(promises);

            this.fullFullAllRequests("unique-id", { status: "not-found" });
            this.fullFullAllRequests("database-id", { status: "not-found" });
        } finally {
            handlers.forEach(callback => callback());

            this.fullFullAllRequests("unique-id", {
                status: "error",
                error: tr("request failed")
            });

            this.fullFullAllRequests("database-id", {
                status: "error",
                error: tr("request failed")
            });
        }
    }
}