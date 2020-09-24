import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as React from "react";
import {useState} from "react";
import {ContextDivider} from "tc-shared/ui/react-elements/ContextDivider";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import {
    EditorGroupedPermissions,
    PermissionEditor,
    PermissionEditorEvents
} from "tc-shared/ui/modal/permission/PermissionEditor";
import {SideBar} from "tc-shared/ui/modal/permission/TabHandler";
import {Group, GroupTarget, GroupType} from "tc-shared/permission/GroupManager";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {ClientNameInfo, CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {formatMessage} from "tc-shared/ui/frames/chat";
import {spawnYesNo} from "tc-shared/ui/modal/ModalYesNo";
import {tra} from "tc-shared/i18n/localize";
import {PermissionType} from "tc-shared/permission/PermissionType";
import {GroupedPermissions, PermissionValue} from "tc-shared/permission/PermissionManager";
import {spawnIconSelect} from "tc-shared/ui/modal/ModalIconSelect";
import {Settings, settings} from "tc-shared/settings";
import {
    senseless_channel_group_permissions,
    senseless_channel_permissions,
    senseless_client_channel_permissions,
    senseless_client_permissions,
    senseless_server_group_permissions
} from "tc-shared/ui/modal/permission/SenselessPermissions";
import {spawnGroupCreate} from "tc-shared/ui/modal/ModalGroupCreate";
import {spawnModalGroupPermissionCopy} from "tc-shared/ui/modal/ModalGroupPermissionCopy";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

const cssStyle = require("./ModalPermissionEditor.scss");

export type PermissionEditorTab = "groups-server" | "groups-channel" | "channel" | "client" | "client-channel";
export type PermissionEditorSubject =
    "groups-server"
    | "groups-channel"
    | "channel"
    | "client"
    | "client-channel"
    | "none";
export const PermissionTabName: { [T in PermissionEditorTab]: { name: string, translated: string } } = {
    "groups-server": {name: "Server Groups", translated: tr("Server Groups")},
    "groups-channel": {name: "Channel Groups", translated: tr("Channel Groups")},
    "channel": {name: "Channel Permissions", translated: tr("Channel Permissions")},
    "client": {name: "Client Permissions", translated: tr("Client Permissions")},
    "client-channel": {name: "Client Channel Permissions", translated: tr("Client Channel Permissions")},
};

export type GroupProperties = {
    id: number,
    type: "query" | "template" | "normal";

    name: string,
    iconId: number,

    sortId: number;
    saveDB: boolean;

    needed_modify_power: number;
    needed_member_add: number;
    needed_member_remove: number;
};
export type GroupUpdateEntry = {
    property: "name" | "icon" | "sort" | "save";
    value: any
};
export type ChannelInfo = {
    id: number;
    iconId: number;

    name: string;
    depth: number;
}

export interface PermissionModalEvents {
    action_activate_tab: {
        tab: PermissionEditorTab,

        activeGroupId?: number;
        activeChannelId?: number;
        activeClientDatabaseId?: number;
    },

    action_select_group: {
        target: "server" | "channel",
        id: number
    },

    action_select_channel: {
        target: "channel" | "client-channel";
        id: number
    },

    action_select_client: {
        target: "client" | "client-channel";
        id: number | string | undefined;
    }

    action_set_permission_editor_subject: {
        mode: PermissionEditorSubject;

        groupId?: number;
        channelId?: number;
        clientDatabaseId?: number;
    }

    action_create_group: { target: "server" | "channel", sourceGroup?: number },

    action_rename_group: { target: "server" | "channel", id: number | "selected", newName: string },
    action_rename_group_result: {
        target: "server" | "channel";
        id: number;

        status: "success" | "error";
        error?: string;
    }

    action_delete_group: { target: "server" | "channel", id: number | "selected", mode: "ask" | "force" },
    action_delete_group_result: {
        target: "server" | "channel";
        id: number;

        status: "success" | "error";
        error?: string;
    },

    action_group_copy_permissions: { target: "server" | "channel", sourceGroup: number },

    action_server_group_add_client: {
        id: number;
        client: number | string; /* string would be the unique id */
    },
    action_server_group_add_client_result: {
        id: number;
        client: number | string;

        status: "success" | "error" | "no-permissions";
        error?: string;
    }

    action_server_group_remove_client: {
        id: number;
        client: number;
    },
    action_server_group_remove_client_result: {
        id: number;
        client: number;

        status: "success" | "error" | "no-permissions";
        error?: string;
    }

    query_groups: {
        target: "server" | "channel",
    },
    query_groups_result: {
        target: "server" | "channel",
        groups: GroupProperties[]
    },
    query_group_clients: {
        id: number
    },
    query_group_clients_result: {
        id: number,
        status: "success" | "error" | "no-permissions",
        error?: string;
        clients?: {
            name: string;
            databaseId: number;
            uniqueId: string;
        }[]
    },

    query_channels: {},
    query_channels_result: {
        channels: ChannelInfo[]
    }

    query_client_permissions: {}, /* will cause the notify_client_permissions */
    query_client_info: {
        client: number | string; /* client database id or unique id */
    },
    query_client_info_result: {
        client: number | string;
        state: "success" | "error" | "no-such-client" | "no-permission";

        error?: string;
        info?: { name: string, uniqueId: string, databaseId: number },
        failedPermission?: string;
    }

    notify_group_updated: {
        target: "server" | "channel";
        id: number;

        properties: GroupUpdateEntry[];
    },
    notify_groups_created: {
        target: "server" | "channel";
        groups: GroupProperties[]
    },
    notify_groups_deleted: {
        target: "server" | "channel";
        groups: number[]
    },

    notify_groups_reset: {}

    notify_client_permissions: {
        permissionModifyPower: number;

        serverGroupCreate: boolean,
        channelGroupCreate: boolean,

        serverGroupModifyPower: number,
        channelGroupModifyPower: number,

        modifyQueryGroups: boolean,
        modifyTemplateGroups: boolean

        serverGroupMemberAddPower: number,
        serverGroupMemberRemovePower: number,

        serverGroupPermissionList: boolean,
        channelGroupPermissionList: boolean,
        channelPermissionList: boolean,
        clientPermissionList: boolean,
        clientChannelPermissionList: boolean
    },

    notify_client_list_toggled: { visible: boolean },
    notify_channel_updated: { id: number, property: "name" | "icon", value: any },

    notify_destroy: {}
}

const ActiveTabInfo = (props: { events: Registry<PermissionModalEvents> }) => {
    const [activeTab, setActiveTab] = useState<PermissionEditorTab>("groups-server");
    props.events.reactUse("action_activate_tab", event => setActiveTab(event.tab));

    return <div className={cssStyle.header + " " + cssStyle.activeTabInfo}>
        <div className={cssStyle.entry}>
            <a title={PermissionTabName[activeTab].translated}>
                <Translatable trIgnore={true}>{PermissionTabName[activeTab].name}</Translatable>
            </a>
        </div>
    </div>
};

const TabSelectorEntry = (props: { events: Registry<PermissionModalEvents>, entry: PermissionEditorTab }) => {
    const [active, setActive] = useState(props.entry === "groups-server");

    props.events.reactUse("action_activate_tab", event => setActive(event.tab === props.entry));

    return <div className={cssStyle.entry + " " + (active ? cssStyle.selected : "")}
                onClick={() => !active && props.events.fire("action_activate_tab", {tab: props.entry})}>
        <a title={PermissionTabName[props.entry].translated}>
            <Translatable trIgnore={true}>{PermissionTabName[props.entry].translated}</Translatable>
        </a>
    </div>;
};

const TabSelector = (props: { events: Registry<PermissionModalEvents> }) => {
    return <div className={cssStyle.header + " " + cssStyle.tabSelector}>
        <TabSelectorEntry events={props.events} entry={"groups-server"}/>
        <TabSelectorEntry events={props.events} entry={"groups-channel"}/>
        <TabSelectorEntry events={props.events} entry={"channel"}/>
        <TabSelectorEntry events={props.events} entry={"client"}/>
        <TabSelectorEntry events={props.events} entry={"client-channel"}/>
    </div>;
};

export type DefaultTabValues = { groupId?: number, channelId?: number, clientDatabaseId?: number };

class PermissionEditorModal extends InternalModal {
    readonly modalEvents = new Registry<PermissionModalEvents>();
    readonly editorEvents = new Registry<PermissionEditorEvents>();

    readonly connection: ConnectionHandler;

    readonly defaultTab: PermissionEditorTab;
    readonly defaultTabValues: DefaultTabValues;

    constructor(connection: ConnectionHandler, defaultTab: PermissionEditorTab, defaultTabValues?: DefaultTabValues) {
        super();
        this.defaultTab = defaultTab;
        this.defaultTabValues = defaultTabValues || {};

        this.modalEvents.enableDebug("modal-permissions");
        this.editorEvents.enableDebug("permissions-editor");

        this.connection = connection;
        initializePermissionModalResultHandlers(this.modalEvents);
        initializePermissionModalController(connection, this.modalEvents);
        initializePermissionEditor(connection, this.modalEvents, this.editorEvents);

        this.modalEvents.on("action_activate_tab", event => this.editorEvents.fire("action_toggle_client_button", {visible: event.tab === "groups-server"}));
        this.editorEvents.on("action_toggle_client_list", event => this.modalEvents.fire("notify_client_list_toggled", {visible: event.visible}));
    }

    protected onInitialize() {
        this.modalEvents.fire("query_client_permissions");
        this.modalEvents.fire("action_activate_tab", {
            tab: this.defaultTab,
            activeChannelId: this.defaultTabValues?.channelId,
            activeGroupId: this.defaultTabValues?.groupId,
            activeClientDatabaseId: this.defaultTabValues?.clientDatabaseId
        });
    }

    protected onDestroy() {
        this.modalEvents.fire("notify_destroy");
        this.modalEvents.destroy();
    }

    renderBody() {
        return (
            <div className={cssStyle.container}>
                <ContextDivider id={"permission-editor"} defaultValue={25} direction={"horizontal"}>
                    <div className={cssStyle.contextContainer + " " + cssStyle.left}>
                        <ActiveTabInfo events={this.modalEvents}/>
                        <SideBar modalEvents={this.modalEvents} editorEvents={this.editorEvents}
                                 connection={this.connection}/>
                    </div>
                    <div className={cssStyle.contextContainer + " " + cssStyle.right}>
                        <TabSelector events={this.modalEvents}/>
                        <PermissionEditor events={this.editorEvents} connection={this.connection}/>
                    </div>
                </ContextDivider>
            </div>
        );
    }

    title(): React.ReactElement<Translatable> {
        return <Translatable>Server permissions</Translatable>;
    }

}

export function spawnPermissionEditorModal(connection: ConnectionHandler, defaultTab: PermissionEditorTab = "groups-server", values?: DefaultTabValues) {
    const modal = spawnReactModal(PermissionEditorModal, connection, defaultTab, values);
    modal.show();
}

function initializePermissionModalResultHandlers(events: Registry<PermissionModalEvents>) {
    events.on("action_rename_group_result", event => {
        if (event.status === "error") {
            createErrorModal(tr("Failed to rename group"), formatMessage(tr("Failed to rename group:{:br:}"), event.error)).open();
        } else {
            createInfoModal(tr("Group renamed"), tr("The group has been renamed.")).open();
        }
    });

    events.on("action_delete_group", event => {
        if (event.mode === "force")
            return;

        spawnYesNo(tr("Are you sure?"), formatMessage(tr("Do you really want to delete this group?")), result => {
            if (result !== true)
                return;

            events.fire("action_delete_group", {id: event.id, mode: "force", target: event.target});
        });
    });

    events.on("action_delete_group_result", event => {
        if (event.status === "success") {
            createInfoModal(tr("Group deleted"), tr("The channel group has been deleted.")).open();
        } else {
            createErrorModal(tr("Failed to delete group"), tra("Failed to delete group:\n{}", event.error)).open();
        }
    });

    events.on("action_server_group_remove_client_result", event => {
        if (event.status === "error") {
            createErrorModal(tr("Failed to remove client"), tra("Failed to remove client from server group:\n{}", event.error)).open();
        } else if (event.status === "no-permissions") {
            createErrorModal(tr("Failed to remove client"), tra("Failed to remove client from server group:\nNo permissions.")).open();
        }
    });

    events.on("action_server_group_add_client_result", event => {
        if (event.status === "error") {
            createErrorModal(tr("Failed to add client"), tra("Failed to add client to server group:\n{}", event.error)).open();
        } else if (event.status === "no-permissions") {
            createErrorModal(tr("Failed to add client"), tra("Failed to add client to group:\nNo permissions.")).open();
        }
    });
}

const stringifyError = error => {
    if (error instanceof CommandResult) {
        if (error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS)
            return tr("insufficient permissions");
        else
            return error.message + (error.extra_message ? " (" + error.extra_message + ")" : "");
    } else if (error instanceof Error) {
        return error.message;
    } else if (typeof error !== "string") {
        return tr("Lookup the console");
    }
    return error;
};

function initializePermissionModalController(connection: ConnectionHandler, events: Registry<PermissionModalEvents>) {
    events.on("query_groups", event => {
        const groups = event.target === "server" ? connection.groups.serverGroups : connection.groups.channelGroups;
        events.fire_async("query_groups_result", {
            target: event.target, groups: groups.map(group => {
                return {
                    id: group.id,
                    name: group.name,

                    iconId: group.properties.iconid,
                    sortId: group.properties.sortid,
                    saveDB: group.properties.savedb,
                    type: group.type === GroupType.QUERY ? "query" : group.type === GroupType.TEMPLATE ? "template" : "normal",

                    needed_member_add: group.requiredMemberAddPower,
                    needed_member_remove: group.requiredMemberRemovePower,
                    needed_modify_power: group.requiredModifyPower
                } as GroupProperties
            })
        });
    });

    /* group update listener */
    {
        const initializeGroupListener = (group: Group) => {
            let unregister = group.events.on("notify_properties_updated", event => {
                let updates: GroupUpdateEntry[] = [];
                for (const update of event.updated_properties) {
                    switch (update) {
                        case "name":
                            updates.push({property: "name", value: group.name});
                            break;

                        case "icon":
                            updates.push({property: "icon", value: group.properties.iconid});
                            break;

                        case "sort-id":
                            updates.push({property: "sort", value: group.properties.sortid});
                            break;

                        case "save-db":
                            updates.push({property: "save", value: group.properties.savedb});
                            break;

                        default:
                            break;
                    }
                }
                events.fire("notify_group_updated", {
                    target: group.target === GroupTarget.SERVER ? "server" : "channel",
                    id: group.id,
                    properties: updates
                });
            });

            const doUnregister = () => {
                unregister && unregister();
                unregister = undefined;
            };
            group.events.on("notify_group_deleted", doUnregister);
            events.on("notify_destroy", doUnregister);
        };

        events.on("notify_destroy", connection.groups.events.on("notify_reset", () => {
            events.fire("notify_groups_reset");
        }));

        events.on("notify_destroy", connection.groups.events.on("notify_groups_created", event => {
            const channelGroups: GroupProperties[] = [];
            const serverGroups: GroupProperties[] = [];

            for (const group of event.groups) {
                (group.target === GroupTarget.SERVER ? serverGroups : channelGroups).push({
                    iconId: group.properties.iconid,
                    id: group.id,
                    name: group.name,
                    saveDB: group.properties.savedb,
                    sortId: group.properties.sortid,
                    type: group.type === GroupType.QUERY ? "query" : group.type === GroupType.TEMPLATE ? "template" : "normal",
                    needed_member_add: group.requiredMemberAddPower,
                    needed_member_remove: group.requiredMemberRemovePower,
                    needed_modify_power: group.requiredModifyPower
                });
                initializeGroupListener(group);
            }

            if (channelGroups.length > 0)
                events.fire("notify_groups_created", {groups: channelGroups, target: "channel"});

            if (serverGroups.length > 0)
                events.fire("notify_groups_created", {groups: serverGroups, target: "server"});
        }));

        events.on("notify_destroy", connection.groups.events.on("notify_groups_deleted", event => {
            const channelGroups: number[] = [];
            const serverGroups: number[] = [];

            for (const group of event.groups)
                (group.target === GroupTarget.SERVER ? serverGroups : channelGroups).push(group.id);

            if (channelGroups.length > 0)
                events.fire("notify_groups_deleted", {groups: channelGroups, target: "channel"});

            if (serverGroups.length > 0)
                events.fire("notify_groups_deleted", {groups: serverGroups, target: "server"});
        }));

        connection.groups.serverGroups.forEach(initializeGroupListener);
        connection.groups.channelGroups.forEach(initializeGroupListener);
    }

    {
        /* group actions */
        let selectedChannelGroup = 0, selectedServerGroup = 0;
        events.on("action_select_group", event => {
            if (event.target === "channel")
                selectedChannelGroup = event.id;
            else
                selectedServerGroup = event.id;
        });

        events.on("action_rename_group", event => {
            const groupId = event.id === "selected" ? event.target === "channel" ? selectedChannelGroup : selectedServerGroup : event.id;

            let payload = {name: event.newName} as any;
            if (event.target === "channel")
                payload.cgid = groupId;
            else
                payload.sgid = groupId;

            connection.serverConnection.send_command(event.target + "grouprename", payload).then(() => {
                events.fire("action_rename_group_result", {id: groupId, status: "success", target: event.target});
            }).catch(error => {
                console.warn(tr("Failed to rename group: %o"), error);
                events.fire("action_rename_group_result", {
                    id: groupId,
                    status: "error",
                    target: event.target,
                    error: stringifyError(error)
                });
            });
        });


        events.on("action_delete_group", event => {
            /* ask will be handled within the modal */
            if (event.mode === "ask")
                return;

            const groupId = event.id === "selected" ? event.target === "channel" ? selectedChannelGroup : selectedServerGroup : event.id;

            let payload = {force: true} as any;
            if (event.target === "channel")
                payload.cgid = groupId;
            else
                payload.sgid = groupId;

            connection.serverConnection.send_command(event.target + "groupdel", payload).then(() => {
                events.fire("action_delete_group_result", {id: groupId, status: "success", target: event.target});
            }).catch(error => {
                console.warn(tr("Failed to delete group: %o"), error);
                events.fire("action_delete_group_result", {
                    id: groupId,
                    status: "error",
                    target: event.target,
                    error: stringifyError(error)
                });
            });
        });

        events.on("action_create_group", event => spawnGroupCreate(connection, event.target, event.sourceGroup));
        events.on("action_group_copy_permissions", event => spawnModalGroupPermissionCopy(connection, event.target, event.sourceGroup));
    }

    /* general permissions */
    {
        const sendClientPermissions = () => {
            events.fire("notify_client_permissions", {
                permissionModifyPower: connection.permissions.neededPermission(PermissionType.I_PERMISSION_MODIFY_POWER).valueOr(0),

                modifyQueryGroups: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1),
                modifyTemplateGroups: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1),

                channelGroupCreate: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_CREATE).granted(1),
                serverGroupCreate: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_CREATE).granted(1),

                channelGroupModifyPower: connection.permissions.neededPermission(PermissionType.I_CHANNEL_GROUP_MODIFY_POWER).valueOr(0),
                serverGroupModifyPower: connection.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MODIFY_POWER).valueOr(0),

                serverGroupMemberAddPower: connection.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MEMBER_ADD_POWER).valueOr(0),
                serverGroupMemberRemovePower: connection.permissions.neededPermission(PermissionType.I_SERVER_GROUP_MEMBER_REMOVE_POWER).valueOr(0),

                serverGroupPermissionList: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST).granted(1),
                channelGroupPermissionList: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST).granted(1),
                channelPermissionList: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST).granted(1),
                clientPermissionList: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST).granted(1),
                clientChannelPermissionList: connection.permissions.neededPermission(PermissionType.B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST).granted(1),
            });
        };

        events.on("query_client_permissions", () => sendClientPermissions());
        events.on("notify_destroy", connection.permissions.events.on("client_permissions_changed", sendClientPermissions));
    }

    events.on("query_group_clients", event => {
        connection.serverConnection.command_helper.requestClientsByServerGroup(event.id).then(clients => {
            events.fire("query_group_clients_result", {
                id: event.id, status: "success", clients: clients.map(e => {
                    return {
                        name: e.client_nickname,
                        uniqueId: e.client_unique_identifier,
                        databaseId: e.client_database_id
                    };
                })
            });
        }).catch(error => {
            if (error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                events.fire("query_group_clients_result", {id: event.id, status: "no-permissions"});
                return;
            }

            console.warn(tr("Failed to request server group client list: %o"), error);
            events.fire("query_group_clients_result", {id: event.id, status: "error", error: stringifyError(error)});
        });
    });

    events.on("action_server_group_add_client", event => {
        Promise.resolve(event.client).then(client => {
            if (typeof client === "number")
                return Promise.resolve(client);

            return connection.serverConnection.command_helper.getInfoFromUniqueId(client.trim()).then(info => info[0].clientDatabaseId);
        }).then(clientDatabaseId => connection.serverConnection.send_command("servergroupaddclient", {
            sgid: event.id,
            cldbid: clientDatabaseId
        })).then(() => {
            events.fire("action_server_group_add_client_result", {
                id: event.id,
                client: event.client,
                status: "success"
            });
        }).catch(error => {
            if (error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                events.fire("action_server_group_add_client_result", {
                    id: event.id,
                    client: event.client,
                    status: "no-permissions"
                });
                return;
            }

            console.warn(tr("Failed to add client %s to server group %d: %o"), event.client.toString(), event.id, error);
            events.fire("action_server_group_add_client_result", {
                id: event.id,
                client: event.client,
                status: "error",
                error: stringifyError(error)
            });
        })
    });

    events.on("action_server_group_remove_client", event => {
        connection.serverConnection.send_command("servergroupdelclient", {
            sgid: event.id,
            cldbid: event.client
        }).then(() => {
            events.fire("action_server_group_remove_client_result", {
                id: event.id,
                client: event.client,
                status: "success"
            });
        }).catch(error => {
            console.log(tr("Failed to delete client %d from server group %d: %o"), event.client, event.id, error);
            events.fire("action_server_group_remove_client_result", {
                id: event.id,
                client: event.client,
                status: "success"
            });
        });
    });

    events.on("notify_destroy", connection.channelTree.events.on("notify_channel_updated", event => {
        if ('channel_icon_id' in event.updatedProperties)
            events.fire("notify_channel_updated", {
                id: event.channel.channelId,
                property: "icon",
                value: event.updatedProperties.channel_icon_id
            });

        if ('channel_name' in event.updatedProperties)
            events.fire("notify_channel_updated", {
                id: event.channel.channelId,
                property: "name",
                value: event.updatedProperties.channel_name
            });
    }));

    events.on("query_channels", () => {
        events.fire_async("query_channels_result", {
            channels: connection.channelTree.channelsOrdered().map(e => {
                return {
                    id: e.channelId,
                    name: e.channelName(),
                    depth: e.channelDepth(),
                    iconId: e.properties.channel_icon_id
                };
            })
        });
    });

    events.on("query_client_info", event => {
        let promise: Promise<ClientNameInfo[]>;
        if (typeof event.client === "number") {
            promise = connection.serverConnection.command_helper.getInfoFromClientDatabaseId(event.client);
        } else {
            promise = connection.serverConnection.command_helper.getInfoFromUniqueId(event.client.trim());
        }
        promise.then(result => {
            if (result.length === 0) {
                events.fire("query_client_info_result", {
                    client: event.client,
                    state: "no-such-client"
                });
                return;
            }
            events.fire("query_client_info_result", {
                client: event.client,
                state: "success",
                info: {
                    name: result[0].clientNickname,
                    databaseId: result[0].clientDatabaseId,
                    uniqueId: result[0].clientUniqueId
                }
            });
        }).catch(error => {
            if (error instanceof CommandResult) {
                events.fire("query_client_info_result", {
                    client: event.client,
                    state: "no-permission",
                    failedPermission: connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon")
                });
                return;
            }

            console.warn(tr("Failed to query client info for %o: %o"), event.client, error);
            events.fire("query_client_info_result", {
                client: event.client,
                state: "error",
                error: stringifyError(error)
            });
        });
    });
}


function initializePermissionEditor(connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents>, events: Registry<PermissionEditorEvents>) {
    let clientDatabaseId = 0;
    let channelId = 0;
    let groupId = 0;

    let mode: PermissionEditorSubject = "groups-server";

    let serverGroupPermissionList = false;
    let channelGroupPermissionList = false;
    let channelPermissionList = false;
    let clientPermissionList = false;
    let clientChannelPermissionList = false;

    modalEvents.on("action_activate_tab", event => {
        clientDatabaseId = 0;
        channelId = 0;
        groupId = 0;

        events.fire("action_set_mode", {mode: "unset"});

        switch (event.tab) {
            case "groups-server":
                events.fire("action_set_senseless_permissions", {permissions: senseless_server_group_permissions});
                break;

            case "groups-channel":
                events.fire("action_set_senseless_permissions", {permissions: senseless_channel_group_permissions});
                break;

            case "channel":
                events.fire("action_set_senseless_permissions", {permissions: senseless_channel_permissions});
                break;

            case "client":
                events.fire("action_set_senseless_permissions", {permissions: senseless_client_permissions});
                break;

            case "client-channel":
                events.fire("action_set_senseless_permissions", {permissions: senseless_client_channel_permissions});
                break;
        }
    });

    const failedPermission = (): string => {
        switch (mode) {
            case "groups-server":
                return serverGroupPermissionList ? undefined : PermissionType.B_VIRTUALSERVER_SERVERGROUP_PERMISSION_LIST;
            case "groups-channel":
                return channelGroupPermissionList ? undefined : PermissionType.B_VIRTUALSERVER_CHANNELGROUP_PERMISSION_LIST;
            case "client":
                return clientPermissionList ? undefined : PermissionType.B_VIRTUALSERVER_CLIENT_PERMISSION_LIST;
            case "channel":
                return channelPermissionList ? undefined : PermissionType.B_VIRTUALSERVER_CHANNEL_PERMISSION_LIST;
            case "client-channel":
                return clientChannelPermissionList ? undefined : PermissionType.B_VIRTUALSERVER_CHANNELCLIENT_PERMISSION_LIST;

            default:
                return undefined;
        }
    };
    modalEvents.on("notify_client_permissions", event => {
        serverGroupPermissionList = event.serverGroupPermissionList;
        channelGroupPermissionList = event.channelGroupPermissionList;
        channelPermissionList = event.channelPermissionList;
        clientPermissionList = event.clientPermissionList;
        clientChannelPermissionList = event.clientChannelPermissionList;

        const failed = failedPermission();
        if (failed) {
            events.fire("action_set_mode", {mode: "no-permissions", failedPermission: failed});
        }
        events.fire("action_set_default_value", {value: event.permissionModifyPower});
    });

    modalEvents.on("action_set_permission_editor_subject", event => {
        channelId = typeof event.channelId === "number" ? event.channelId : channelId;
        clientDatabaseId = typeof event.clientDatabaseId === "number" ? event.clientDatabaseId : clientDatabaseId;
        groupId = typeof event.groupId === "number" ? event.groupId : groupId;

        mode = event.mode;

        let editorMode: "unset" | "normal" = "unset";
        switch (mode) {
            case "none":
                editorMode = "unset";
                break;

            case "groups-server":
            case "groups-channel":
                editorMode = groupId === 0 ? "unset" : "normal";
                break;

            case "channel":
                editorMode = channelId === 0 ? "unset" : "normal";
                break;

            case "client":
                editorMode = clientDatabaseId === 0 ? "unset" : "normal";
                break;

            case "client-channel":
                editorMode = clientDatabaseId === 0 || channelId === 0 ? "unset" : "normal";
                break;
        }

        const failed = failedPermission();
        events.fire("action_set_mode", {mode: failed ? "no-permissions" : editorMode, failedPermission: failed});
        if (!failed && editorMode === "normal")
            events.fire("query_permission_values");
    });

    events.on("query_permission_list", () => {
        const groups = connection.permissions.groupedPermissions();

        const visitGroup = (group: GroupedPermissions): EditorGroupedPermissions => {
            return {
                groupId: group.group.name + " - " + group.group.begin.toString(),
                groupName: group.group.name,
                permissions: group.permissions.map(e => {
                    return {id: e.id, name: e.name, description: e.description}
                }),
                children: (group.children || []).map(visitGroup)
            };
        };

        events.fire_async("query_permission_list_result", {
            hideSenselessPermissions: !settings.static_global(Settings.KEY_PERMISSIONS_SHOW_ALL),
            permissions: (groups || []).map(visitGroup)
        });
    });

    events.on("query_permission_values", () => {
        let promise: Promise<PermissionValue[]>;
        switch (mode) {
            case "none":
                promise = Promise.reject(tr("Invalid subject"));
                break;

            case "groups-server":
            case "groups-channel":
                if (!groupId) {
                    promise = Promise.reject(tr("Invalid server group"));
                    break;
                }

                const group = mode === "groups-server" ? connection.groups.findServerGroup(groupId) : connection.groups.findChannelGroup(groupId);
                if (!group) {
                    promise = Promise.reject(tr("Invalid server group"));
                    break;
                }
                promise = connection.groups.request_permissions(group);
                break;

            case "channel":
                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                promise = connection.permissions.requestChannelPermissions(channelId);
                break;
            case "client":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }

                promise = connection.permissions.requestClientPermissions(clientDatabaseId);
                break;

            case "client-channel":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }

                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                promise = connection.permissions.requestClientChannelPermissions(clientDatabaseId, channelId);
                break;
        }

        promise.then(permissions => {
            events.fire("query_permission_values_result", {
                status: "success", permissions: permissions.map(e => {
                    return {
                        value: e.value,
                        name: e.type.name,
                        granted: e.granted_value,
                        flagNegate: e.flag_negate,
                        flagSkip: e.flag_skip
                    }
                })
            });
        }).catch(error => {
            if (error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                events.fire("action_set_mode", {
                    mode: "no-permissions",
                    failedPermission: connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon")
                });
                return;
            }

            console.warn(tr("Failed to query permissions: %o"), error);
            events.fire("query_permission_values_result", {status: "error", error: stringifyError(error)});
        });
    });

    const granted_permission_name = (name: string) => "i_needed_modify_power_" + name.substr(2);
    events.on("action_set_permissions", event => {
        let promise: Promise<CommandResult>;

        let payload = [];
        event.permissions.forEach(permission => payload.push({
            permsid: permission.mode === "grant" ? granted_permission_name(permission.name) : permission.name,
            permvalue: permission.value | 0, /* signed values */
            permskip: permission.mode === "grant" ? false : permission.flagSkip,
            permnegated: permission.mode === "grant" ? false : permission.flagNegate
        }));

        switch (mode) {
            case "none":
                promise = Promise.reject(tr("Invalid subject"));
                break;

            case "groups-server":
            case "groups-channel": {
                if (!groupId) {
                    promise = Promise.reject(tr("Invalid server group"));
                    break;
                }

                let prefix = mode === "groups-server" ? "server" : "channel";
                if (mode === "groups-server")
                    payload[0].sgid = groupId;
                else
                    payload[0].cgid = groupId;

                promise = connection.serverConnection.send_command(prefix + "groupaddperm", payload);
                break;
            }
            case "channel":
                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                payload[0].cid = channelId;
                promise = connection.serverConnection.send_command("channeladdperm", payload);
                break;

            case "client":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }

                payload[0].cldbid = clientDatabaseId;
                promise = connection.serverConnection.send_command("clientaddperm", payload);
                break;

            case "client-channel":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }
                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                payload[0].cldbid = clientDatabaseId;
                payload[0].cid = channelId;
                promise = connection.serverConnection.send_command("channelclientaddperm", payload);
                break;
        }

        promise.then(result => {
            throw result;
        }).catch(error => {
            if (error instanceof CommandResult) {
                if (error.getBulks().length === event.permissions.length) {
                    events.fire("action_set_permissions_result", {
                        permissions: error.getBulks().map((e, index) => {
                            return {
                                name: event.permissions[index].name,
                                mode: event.permissions[index].mode,

                                newValue: e.success ? event.permissions[index].value : undefined,
                                flagSkip: e.success ? event.permissions[index].flagSkip : undefined,
                                flagNegate: e.success ? event.permissions[index].flagNegate : undefined
                            }
                        })
                    });
                    return;
                }
            }

            console.warn(tr("Failed to set permissions: %o"), error);
            events.fire("action_set_permissions_result", {
                permissions: event.permissions.map(permission => {
                    return {
                        name: permission.name,
                        mode: permission.mode,

                        newValue: undefined,
                        flagSkip: undefined,
                        flagNegate: undefined
                    }
                })
            });
        })
    });

    events.on("action_remove_permissions", event => {
        let promise: Promise<CommandResult>;

        let payload = [];
        event.permissions.forEach(permission => payload.push({
            permsid: permission.mode === "grant" ? granted_permission_name(permission.name) : permission.name,
        }));
        switch (mode) {
            case "none":
                promise = Promise.reject(tr("Invalid subject"));
                break;

            case "groups-server":
            case "groups-channel": {
                if (!groupId) {
                    promise = Promise.reject(tr("Invalid server group"));
                    break;
                }

                let prefix = mode === "groups-server" ? "server" : "channel";
                if (mode === "groups-server")
                    payload[0].sgid = groupId;
                else
                    payload[0].cgid = groupId;

                promise = connection.serverConnection.send_command(prefix + "groupdelperm", payload);
                break;
            }
            case "channel":
                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                payload[0].cid = channelId;
                promise = connection.serverConnection.send_command("channeldelperm", payload);
                break;

            case "client":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }

                payload[0].cldbid = clientDatabaseId;
                promise = connection.serverConnection.send_command("clientdelperm", payload);
                break;

            case "client-channel":
                if (!clientDatabaseId) {
                    promise = Promise.reject(tr("Invalid client database id"));
                    break;
                }

                if (!channelId) {
                    promise = Promise.reject(tr("Invalid channel id"));
                    break;
                }

                payload[0].cid = channelId;
                payload[0].cldbid = clientDatabaseId;
                promise = connection.serverConnection.send_command("channelclientdelperm", payload);
                break;
        }

        promise.then(result => {
            throw result;
        }).catch(error => {
            if (error instanceof CommandResult) {
                if (error.getBulks().length === event.permissions.length) {
                    events.fire("action_remove_permissions_result", {
                        permissions: error.getBulks().map((e, index) => {
                            return {
                                name: event.permissions[index].name,
                                mode: event.permissions[index].mode,
                                success: e.success
                            }
                        })
                    });
                    return;
                }
            }

            console.warn(tr("Failed to remove permissions: %o"), error);
            events.fire("action_remove_permissions_result", {
                permissions: event.permissions.map(permission => {
                    return {
                        name: permission.name,
                        mode: permission.mode,
                        success: false
                    }
                })
            });
        })
    });

    events.on("action_open_icon_select", event => {
        spawnIconSelect(connection,
            id => events.fire("action_set_permissions", {
                permissions: [{
                    mode: "value",
                    name: PermissionType.I_ICON_ID,
                    flagSkip: false,
                    flagNegate: false,
                    value: id
                }]
            }),
            event.iconId);
    });
}



















