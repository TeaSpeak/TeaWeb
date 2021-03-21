import {Registry} from "tc-events";
import {
    ModalClientGroupAssignmentEvents,
    ModalClientGroupAssignmentVariables
} from "tc-shared/ui/modal/group-assignment/Definitions";
import {createIpcUiVariableProvider, IpcUiVariableProvider} from "tc-shared/ui/utils/IpcVariable";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {ClientInfoResolver, ClientInfoResult} from "tc-shared/connection/ClientInfo";
import {GroupManager, GroupType} from "tc-shared/permission/GroupManager";
import PermissionType from "tc-shared/permission/PermissionType";
import {spawnModal} from "tc-shared/ui/react-elements/modal";
import {Mutex} from "tc-shared/Mutex";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {ModalController} from "tc-shared/ui/react-elements/modal/Definitions";

type AssignedGroups = {
    status: "unloaded"
} | {
    status: "error",
    error: string
} | {
    status: "success",
    groups: number[]
};

const generateUniqueId = (handler: ConnectionHandler, clientDatabaseId: number) => "server-group-assignments-" + handler.handlerId + " - " + clientDatabaseId;

class Controller {
    readonly events: Registry<ModalClientGroupAssignmentEvents>;
    readonly variables: IpcUiVariableProvider<ModalClientGroupAssignmentVariables>;

    readonly handler: ConnectionHandler;
    readonly clientDatabaseId: number;

    private clientInfoTimeout: number;
    private clientInfoPromise: Promise<ClientInfoResult>;

    private registeredListener: (() => void)[];
    private resendAvailableGroups = false;

    private assignedGroups: Mutex<AssignedGroups>;
    private assignmentLoadEnqueued = false;

    constructor(handler: ConnectionHandler, clientDatabaseId: number) {
        this.handler = handler;
        this.clientDatabaseId = clientDatabaseId;

        this.events = new Registry<ModalClientGroupAssignmentEvents>();
        this.variables = createIpcUiVariableProvider();

        this.assignedGroups = new Mutex<AssignedGroups>({ status: "unloaded" });
        this.registeredListener = [];

        this.variables.setVariableProvider("handlerId", () => this.handler.handlerId);
        this.variables.setVariableProvider("availableGroups", () => {
            this.resendAvailableGroups = false;

            const addPermissions = this.handler.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MEMBER_ADD_POWER);
            const removePermissions = this.handler.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MEMBER_REMOVE_POWER);

            const serverGroups = this.handler.groups.serverGroups.slice(0).sort(GroupManager.sorter());
            return {
                defaultGroup: this.handler.channelTree.server.properties.virtualserver_default_server_group,
                groups: serverGroups.filter(entry => entry.type === GroupType.NORMAL).map(entry => ({
                    name: entry.name,
                    groupId: entry.id,
                    saveDB: entry.properties.savedb,

                    icon: {
                        iconId: entry.properties.iconid,
                        serverUniqueId: this.handler.getCurrentServerUniqueId(),
                        handlerId: this.handler.handlerId
                    },

                    addAble: addPermissions.granted(entry.requiredMemberAddPower),
                    removeAble: removePermissions.granted(entry.requiredMemberRemovePower)
                }))
            }
        });
        this.variables.setVariableProviderAsync("targetClient", async () => {
            const result = await this.getClientInfo();
            switch (result.status) {
                case "error":
                    return { status: "error", message: result.error };

                case "not-found":
                    return { status: "error", message: tr("not found") };

                case "success":
                    return {
                        status: "success",

                        clientName: result.clientName,
                        clientUniqueId: result.clientUniqueId,
                        clientDatabaseId: result.clientDatabaseId
                    };

                default:
                    return { status: "error", message: tr("unknown status") };
            }
        });

        this.variables.setVariableProviderAsync("assignedGroupStatus", async () => {
            const result = await this.assignedGroups.tryExecute<ModalClientGroupAssignmentVariables["assignedGroupStatus"]>(value => {
                switch (value.status) {
                    case "success":
                        return { status: "loaded", assignedGroups: value.groups.length };

                    case "unloaded":
                        return { status: "loading" };

                    case "error":
                    default:
                        return { status: "error", message: value.error || tr("invalid status") };
                }
            });

            if(result.status === "would-block") {
                return { status: "loading" };
            } else {
                return result.result;
            }
        });

        this.variables.setVariableProviderAsync("groupAssigned", groupId => this.assignedGroups.execute(assignedGroups => {
            switch (assignedGroups.status) {
                case "success":
                    return assignedGroups.groups.indexOf(groupId) !== -1;

                case "error":
                case "unloaded":
                default:
                    return false;
            }
        }));

        this.variables.setVariableEditorAsync("groupAssigned", async (newValue, groupId) => this.assignedGroups.execute(async assignedGroups => {
            if(assignedGroups.status !== "success") {
                return false;
            }

            if((assignedGroups.groups.indexOf(groupId) === -1) !== newValue) {
                /* No change to propagate but update the local value */
                return true;
            }

            let command, action: "add" | "remove";
            if(newValue) {
                action = "add";
                command = "servergroupaddclient";
            } else {
                action = "remove";
                command = "servergroupdelclient";
            }

            try {
                await this.handler.serverConnection.send_command(command, { sgid: groupId, cldbid: this.clientDatabaseId });
                assignedGroups.groups.toggle(groupId, newValue);
            } catch (error) {
                if(error instanceof CommandResult) {
                    if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                        this.events.fire("notify_toggle_result", {
                            action: action,
                            groupId: groupId,
                            groupName: "",
                            result: {
                                status: "no-permissions",
                                permission: this.handler.permissions.getFailedPermission(error)
                            }
                        });
                        return false;
                    } else {
                        this.events.fire("notify_toggle_result", {
                            action: action,
                            groupId: groupId,
                            groupName: "",
                            result: {
                                status: "error",
                                reason: error.formattedMessage()
                            }
                        });
                        return false;
                    }
                }

                logError(LogCategory.NETWORKING, tr("Failed to toggle client server group %d: %o"), groupId, error);
                return false;
            }

            return true;
        }).then(() => this.variables.sendVariable("assignedGroupStatus")));
        let updateMode: "none" | "status" | "refresh" = "none";
        this.events.on("action_remove_all", () => {
            this.assignedGroups.execute(async value => {
                let args = [];

                switch (value.status) {
                    case "success":
                        if(value.groups.length === 0) {
                            return;
                        }
                        args = value.groups.map(entry => ({ sgid: entry }));
                        break;

                    default:
                        return;
                }

                args[0].cldbid = this.clientDatabaseId;
                let result: CommandResult;
                try {
                    result = await this.handler.serverConnection.send_command("servergroupdelclient", args);
                } catch (error) {
                    if(error instanceof CommandResult) {
                        result = error;
                    } else {
                        logError(LogCategory.NETWORKING, tr("Failed to remote all server groups from target client: %o"), error);
                        return;
                    }
                }

                const bulks = result.getBulks();
                if(bulks.length !== args.length) {
                    if(!result.success) {
                        /* result.bulks.length must be one then */
                        logError(LogCategory.NETWORKING, tr("Failed to remote all server groups from target client: %o"), result.formattedMessage());
                        return;
                    } else {
                        /* Server does not send a bulked response. We've to do a full refresh */
                        updateMode = "refresh";
                    }
                } else {
                    for(let index = 0; index < args.length; index++) {
                        if(!bulks[index].success) {
                            continue;
                        }

                        updateMode = "status";
                        value.groups.remove(args[index].sgid);
                    }
                }
            }).then(() => {
                if(updateMode === "status") {
                    this.variables.sendVariable("assignedGroupStatus");
                    this.sendAllGroupStatus();
                } else if(updateMode === "refresh") {
                    this.events.fire("action_refresh", { slowMode: false });
                }
            });
        });

        this.events.on("action_refresh", event => {
            this.loadAssignedGroups(event.slowMode);
            this.variables.sendVariable("assignedGroupStatus");
        });

        this.registeredListener.push(
            handler.groups.events.on(["notify_groups_created", "notify_groups_deleted", "notify_groups_received", "notify_groups_updated", "notify_reset"], () => this.enqueueGroupResend())
        );
        this.registeredListener.push(handler.permissions.register_needed_permission(PermissionType.I_SERVER_GROUP_MEMBER_ADD_POWER, () => this.enqueueGroupResend()));
        this.registeredListener.push(handler.permissions.register_needed_permission(PermissionType.I_SERVER_GROUP_MEMBER_REMOVE_POWER, () => this.enqueueGroupResend()));
        this.loadAssignedGroups(false);
    }

    destroy() {
        this.registeredListener.forEach(callback => callback());
        this.registeredListener = [];

        this.events.destroy();
        this.variables.destroy();
    }

    private sendAllGroupStatus() {
        this.variables.getVariable("availableGroups", undefined).then(groups => {
            groups.groups.forEach(group => this.variables.sendVariable("groupAssigned", group.groupId));
        });
    }

    private loadAssignedGroups(slowMode: boolean) {
        if(this.assignmentLoadEnqueued) {
            return;
        }

        this.assignmentLoadEnqueued = true;
        this.assignedGroups.execute(async (assignedGroups, setAssignedGroups) => {
            if(slowMode) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            this.assignmentLoadEnqueued = false;

            let resultSet = false;
            const unregisterCallback = this.handler.serverConnection.command_handler_boss().register_explicit_handler("notifyservergroupsbyclientid", command => {
                const payload = command.arguments;
                const clientId = parseInt(payload[0].cldbid);
                if(isNaN(clientId) || clientId !== this.clientDatabaseId) {
                    return;
                }

                let groups = [];
                for(const entry of payload) {
                    const groupId = parseInt(entry.sgid);
                    if(isNaN(groupId)) {
                        logWarn(LogCategory.NETWORKING, tr("Failed to parse sgid as integer of server groups by client id response (%o)."), entry);
                        continue;
                    }

                    groups.push(groupId);
                }

                resultSet = true;
                setAssignedGroups({ status: "success", groups: groups });
            });

            try {
                await this.handler.serverConnection.send_command("servergroupsbyclientid", { cldbid: this.clientDatabaseId });
                if(!resultSet) {
                    setAssignedGroups({ status: "error", error: tr("missing result") });
                }
            } catch (error) {
                if(!resultSet) {
                    if(error instanceof CommandResult) {
                        if(error.id === ErrorCode.DATABASE_EMPTY_RESULT) {
                            setAssignedGroups({ status: "success", groups: [] });
                        } else if(error.id === ErrorCode.CLIENT_INVALID_ID) {
                            setAssignedGroups({ status: "error", error: tr("invalid client id") });
                        } else {
                            setAssignedGroups({ status: "error", error: error.formattedMessage() });
                        }
                    } else {
                        if(typeof error !== "string") {
                            logError(LogCategory.NETWORKING, tr("Failed to query client server groups: %o"), error);
                            error = tr("lookup the console");
                        }

                        setAssignedGroups({ status: "error", error: error });
                    }
                }
            } finally {
                unregisterCallback();
            }
        }).then(() => {
            this.variables.sendVariable("assignedGroupStatus");
            this.sendAllGroupStatus();
        });
    }

    private enqueueGroupResend() {
        if(this.resendAvailableGroups) {
            return;
        }

        this.resendAvailableGroups = true;
        this.variables.sendVariable("availableGroups");
    }

    private getClientInfo() : Promise<ClientInfoResult> {
        if(typeof this.clientInfoTimeout === "number" && Date.now() < this.clientInfoTimeout) {
            return this.clientInfoPromise;
        }

        this.clientInfoTimeout = Date.now() + 5000;
        return (this.clientInfoPromise = new Promise<ClientInfoResult>(resolve => {
            const resolver = new ClientInfoResolver(this.handler);
            resolver.getInfoByDatabaseId(this.clientDatabaseId).then(result => {
                resolve(result);
                switch (result.status) {
                    case "success":
                    case "not-found":
                        this.clientInfoTimeout = Date.now() + 60 * 1000;
                        break;

                    case "error":
                    default:
                        this.clientInfoTimeout = Date.now() + 5 * 1000;
                        break;
                }
            });
            resolver.executeQueries().then(undefined);
        }));
    }
}

let controllerInstances: {[key: string]: ModalController} = {};
export function spawnServerGroupAssignments(handler: ConnectionHandler, targetClientDatabaseId: number) {
    const uniqueId = generateUniqueId(handler, targetClientDatabaseId);
    if(typeof controllerInstances[uniqueId] !== "undefined") {
        controllerInstances[uniqueId].show().then(undefined);
        return;
    }

    const controller = new Controller(handler, targetClientDatabaseId);
    const modal = spawnModal("modal-assign-server-groups", [
        controller.events.generateIpcDescription(),
        controller.variables.generateConsumerDescription()
    ], {
        popoutable: true,
        uniqueId: uniqueId
    });
    controller.events.on("action_close", () => modal.destroy());
    modal.getEvents().on("destroy", () => {
        delete controllerInstances[uniqueId];
        controller.destroy();
    });

    modal.show().then(undefined);
    controllerInstances[uniqueId] = modal;
}