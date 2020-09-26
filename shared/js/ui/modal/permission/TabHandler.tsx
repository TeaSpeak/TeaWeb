import * as React from "react";
import {useRef, useState} from "react";
import {EventHandler, ReactEventHandler, Registry} from "tc-shared/events";
import {ChannelInfo, GroupProperties, PermissionModalEvents} from "tc-shared/ui/modal/permission/ModalPermissionEditor";
import {PermissionEditorEvents} from "tc-shared/ui/modal/permission/PermissionEditor";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {createInputModal} from "tc-shared/ui/elements/Modal";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import * as contextmenu from "tc-shared/ui/elements/ContextMenu";
import {MenuEntryType, spawn_context_menu} from "tc-shared/ui/elements/ContextMenu";
import {copy_to_clipboard} from "tc-shared/utils/helpers";
import {FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {arrayBufferBase64} from "tc-shared/utils/buffers";
import {tra} from "tc-shared/i18n/localize";
import {getIconManager} from "tc-shared/file/Icons";

const cssStyle = require("./TabHandler.scss");

export class SideBar extends React.Component<{ connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents>, editorEvents: Registry<PermissionEditorEvents> }, {}> {
    render() {
        return [
            <ServerGroupsSideBar key={"server-groups"} connection={this.props.connection}
                                 modalEvents={this.props.modalEvents}/>,
            <ChannelGroupsSideBar key={"channel-groups"} connection={this.props.connection}
                                  modalEvents={this.props.modalEvents}/>,
            <ChannelSideBar key={"channel"} connection={this.props.connection} modalEvents={this.props.modalEvents}/>,
            <ClientSideBar key={"client"} connection={this.props.connection} modalEvents={this.props.modalEvents}/>,
            <ClientChannelSideBar key={"client-channel"} connection={this.props.connection}
                                  modalEvents={this.props.modalEvents}/>
        ];
    }
}

const GroupsButton = (props: { image: string, alt: string, onClick?: () => void, disabled: boolean }) => {
    return (
        <div className={cssStyle.button + " " + (props.disabled ? cssStyle.disabled : "")}
             onClick={() => !props.disabled && props.onClick()}>
            <img src={props.image} alt={props.alt}/>
        </div>
    );
};


const GroupsListEntry = (props: { connection: ConnectionHandler, group: GroupProperties, selected: boolean, callbackSelect: () => void, onContextMenu: (event: React.MouseEvent) => void }) => {
    let groupTypePrefix = "";
    switch (props.group.type) {
        case "query":
            groupTypePrefix = "[Q] ";
            break;

        case "template":
            groupTypePrefix = "[T] ";
            break;
    }
    return (
        <div className={cssStyle.entry + " " + (props.selected ? cssStyle.selected : "")} onClick={props.callbackSelect}
             onContextMenu={props.onContextMenu}>
            <RemoteIconRenderer icon={getIconManager().resolveIcon(props.group.iconId, props.connection.getCurrentServerUniqueId(), props.connection.handlerId)} />
            <div className={cssStyle.name}>{groupTypePrefix + props.group.name + " (" + props.group.id + ")"}</div>
        </div>
    )
};

@ReactEventHandler<GroupsList>(e => e.props.events)
class GroupsList extends React.Component<{ connection: ConnectionHandler, events: Registry<PermissionModalEvents>, target: "server" | "channel" }, {
    selectedGroupId: number,
    showQueryGroups: boolean,
    showTemplateGroups: boolean,

    disableGroupAdd: boolean,
    disableGroupRename: boolean,
    disablePermissionCopy: boolean,
    disableDelete: boolean
}> {
    private readonly groups: GroupProperties[] = [];
    private visibleGroups: GroupProperties[] = [];

    private updateScheduleId;
    private modifyPower: number;
    private isListActive: boolean = false;

    constructor(props) {
        super(props);

        this.modifyPower = 0;
        this.state = {
            selectedGroupId: -1,
            showQueryGroups: false,
            showTemplateGroups: false,

            disableDelete: true,
            disablePermissionCopy: true,
            disableGroupAdd: true,
            disableGroupRename: true
        }
    }

    render() {
        this.updateGroups(false);

        return [
            <div key={"list"} className={cssStyle.list + " " + cssStyle.containerList} onContextMenu={event => {
                if (event.isDefaultPrevented())
                    return;

                event.preventDefault();
                spawn_context_menu(event.pageX, event.pageY, {
                    name: tr("Add group"),
                    icon_class: "client-add",
                    type: MenuEntryType.ENTRY,
                    callback: () => this.props.events.fire("action_create_group", {
                        target: this.props.target,
                        sourceGroup: 0
                    }),
                    invalidPermission: this.state.disableGroupAdd
                });
            }}>
                <div className={cssStyle.entries}>
                    {this.visibleGroups.map(e => <GroupsListEntry key={"group-" + e.id}
                                                                  connection={this.props.connection}
                                                                  group={e}
                                                                  selected={e.id === this.state.selectedGroupId}
                                                                  callbackSelect={() => this.props.events.fire("action_select_group", {
                                                                      id: e.id,
                                                                      target: this.props.target
                                                                  })}
                                                                  onContextMenu={event => {
                                                                      event.preventDefault();
                                                                      this.props.events.fire("action_select_group", {
                                                                          target: this.props.target,
                                                                          id: e.id
                                                                      });
                                                                      spawn_context_menu(event.pageX, event.pageY, {
                                                                          name: tr("Rename group"),
                                                                          type: MenuEntryType.ENTRY,
                                                                          callback: () => this.onGroupRename(),
                                                                          icon_class: "client-change_nickname",
                                                                          invalidPermission: this.state.disableGroupRename
                                                                      }, {
                                                                          name: tr("Copy permissions"),
                                                                          type: MenuEntryType.ENTRY,
                                                                          icon_class: "client-copy",
                                                                          callback: () => this.props.events.fire("action_group_copy_permissions", {
                                                                              target: this.props.target,
                                                                              sourceGroup: e.id
                                                                          }),
                                                                          invalidPermission: this.state.disablePermissionCopy
                                                                      }, {
                                                                          name: tr("Delete group"),
                                                                          type: MenuEntryType.ENTRY,
                                                                          icon_class: "client-delete",
                                                                          callback: () => this.onGroupDelete(),
                                                                          invalidPermission: this.state.disableDelete
                                                                      }, contextmenu.Entry.HR(), {
                                                                          name: tr("Add group"),
                                                                          icon_class: "client-add",
                                                                          type: MenuEntryType.ENTRY,
                                                                          callback: () => this.props.events.fire("action_create_group", {
                                                                              target: this.props.target,
                                                                              sourceGroup: e.id
                                                                          }),
                                                                          invalidPermission: this.state.disableGroupAdd
                                                                      });
                                                                  }}
                    />)}
                </div>
            </div>,
            <div key={"buttons"} className={cssStyle.buttons}>
                <GroupsButton
                    image={"img/icon_group_add.svg"}
                    alt={this.props.target === "server" ? tr("Add server group") : tr("Add channel group")}
                    disabled={this.state.disableGroupAdd}
                    onClick={() => this.props.events.fire("action_create_group", {
                        target: this.props.target,
                        sourceGroup: this.state.selectedGroupId
                    })}
                />
                <GroupsButton
                    image={"img/icon_group_rename.svg"}
                    alt={this.props.target === "server" ? tr("Rename server group") : tr("Rename channel group")}
                    onClick={() => this.onGroupRename()}
                    disabled={this.state.disableGroupRename}
                />
                <GroupsButton
                    image={"img/icon_group_permission_copy.svg"}
                    alt={this.props.target === "server" ? tr("Copy server group permissions") : tr("Copy channel group permissions")}
                    disabled={this.state.disablePermissionCopy}
                    onClick={() => this.props.events.fire("action_group_copy_permissions", {
                        target: this.props.target,
                        sourceGroup: this.state.selectedGroupId
                    })}
                />
                <GroupsButton
                    image={"img/icon_group_delete.svg"}
                    alt={this.props.target === "server" ? tr("Delete server group") : tr("Delete channel group")}
                    disabled={this.state.disableDelete}
                    onClick={() => this.onGroupDelete()}
                />
            </div>
        ];
    }

    private updateGroups(updateSelectedGroup: boolean) {
        /* sort groups */
        {
            const typeMappings = {
                "query": 3,
                "template": 2,
                "normal": 1
            };

            this.groups.sort((b, a) => {
                if (typeMappings[a.type] > typeMappings[b.type])
                    return 1;

                if (typeMappings[a.type] < typeMappings[b.type])
                    return -1;

                if (a.sortId < b.sortId)
                    return 1;

                if (a.sortId > b.sortId)
                    return -1;

                if (a.id > b.id)
                    return -1;

                if (a.id < b.id)
                    return 1;

                return 0;
            });
        }
        this.visibleGroups = this.groups.filter(e => e.type === "template" ? this.state.showTemplateGroups : e.type === "query" ? this.state.showQueryGroups : true);

        /* select any group */
        if (updateSelectedGroup && this.visibleGroups.findIndex(e => e.id === this.state.selectedGroupId) === -1 && this.visibleGroups.length !== 0)
            this.props.events.fire("action_select_group", {target: this.props.target, id: this.visibleGroups[0].id});
    }

    private scheduleUpdate() {
        clearTimeout(this.updateScheduleId);
        this.updateScheduleId = setTimeout(() => this.forceUpdate(), 10);
    }

    private selectedGroup() {
        return this.groups.find(e => e.id === this.state.selectedGroupId);
    }

    @EventHandler<PermissionModalEvents>("action_activate_tab")
    private handleGroupTabActive(events: PermissionModalEvents["action_activate_tab"]) {
        this.isListActive = this.props.target === "server" ? events.tab === "groups-server" : events.tab === "groups-channel";
        if (events.tab === "groups-server" || events.tab === "groups-channel") {
            if (typeof events.activeGroupId !== "undefined")
                this.setState({selectedGroupId: events.activeGroupId});

            if (this.isListActive)
                this.props.events.fire("action_set_permission_editor_subject", {
                    mode: events.tab,
                    groupId: events.activeGroupId || this.state.selectedGroupId,
                    clientDatabaseId: 0,
                    channelId: 0
                });
        }
    }

    @EventHandler<PermissionModalEvents>("notify_groups_reset")
    private handleReset() {
        this.groups.splice(0, this.groups.length);
    }

    @EventHandler<PermissionModalEvents>("notify_client_permissions")
    private handleClientPermissions(event: PermissionModalEvents["notify_client_permissions"]) {
        const selectedGroup = this.selectedGroup();

        this.modifyPower = this.props.target === "server" ? event.serverGroupModifyPower : event.channelGroupModifyPower;
        this.setState({
            showTemplateGroups: event.modifyTemplateGroups,
            showQueryGroups: event.modifyQueryGroups,

            disableGroupAdd: this.props.target === "server" ? !event.serverGroupCreate : !event.channelGroupCreate,
            disablePermissionCopy: this.props.target === "server" ? !event.serverGroupCreate : !event.channelGroupCreate,

            disableGroupRename: !selectedGroup || this.modifyPower === 0 || this.modifyPower < selectedGroup.needed_modify_power,
            disableDelete: !selectedGroup || this.modifyPower === 0 || this.modifyPower < selectedGroup.needed_modify_power,
        });
        /* this.forceUpdate(); */ /* No force update needed since if the state does not change the displayed groups would not either */
    }

    @EventHandler<PermissionModalEvents>("action_select_group")
    private handleSelect(event: PermissionModalEvents["action_select_group"]) {
        if (event.target !== this.props.target)
            return;

        if (this.state.selectedGroupId === event.id)
            return;

        const selectedGroup = this.groups.find(e => e.id === event.id);
        this.setState({
            selectedGroupId: event.id,

            disableGroupRename: !selectedGroup || this.modifyPower === 0 || this.modifyPower < selectedGroup.needed_modify_power,
            disableDelete: !selectedGroup || this.modifyPower === 0 || this.modifyPower < selectedGroup.needed_modify_power,
        });

        if (this.isListActive) {
            this.props.events.fire("action_set_permission_editor_subject", {
                mode: this.props.target === "server" ? "groups-server" : "groups-channel",
                groupId: event.id,
                clientDatabaseId: 0,
                channelId: 0
            });
        }
    }

    @EventHandler<PermissionModalEvents>("query_groups")
    private handleQuery(event: PermissionModalEvents["query_groups"]) {
        if (event.target !== this.props.target)
            return;

        this.groups.splice(0, this.groups.length);
    }

    @EventHandler<PermissionModalEvents>("query_groups_result")
    private handleQueryResult(event: PermissionModalEvents["query_groups_result"]) {
        if (event.target !== this.props.target)
            return;

        this.groups.splice(0, this.groups.length);
        this.groups.push(...event.groups);
        this.updateGroups(true);
        this.scheduleUpdate();
    }

    @EventHandler<PermissionModalEvents>("notify_groups_created")
    private handleGroupsCreated(event: PermissionModalEvents["notify_groups_created"]) {
        if (event.target !== this.props.target)
            return;

        this.groups.push(...event.groups);
        this.updateGroups(true);
        this.scheduleUpdate();
    }

    @EventHandler<PermissionModalEvents>("notify_groups_deleted")
    private handleGroupsDeleted(event: PermissionModalEvents["notify_groups_deleted"]) {
        if (event.target !== this.props.target)
            return;

        event.groups.forEach(id => {
            const index = this.groups.findIndex(e => e.id === id);
            if (index === -1) return;

            this.groups.splice(index, 1);
        });

        this.updateGroups(true);
        this.scheduleUpdate();
    }

    @EventHandler<PermissionModalEvents>("notify_group_updated")
    private handleGroupUpdated(event: PermissionModalEvents["notify_group_updated"]) {
        if (event.target !== this.props.target)
            return;

        const group = this.groups.find(e => e.id === event.id);
        if (!group) return;

        for (const update of event.properties) {
            switch (update.property) {
                case "name":
                    group.name = update.value;
                    break;

                case "icon":
                    group.iconId = update.value;
                    break;

                case "sort":
                    group.sortId = update.value;
                    break;

                case "save":
                    group.saveDB = update.value;
                    break;
            }
        }

        this.updateGroups(true);
        this.scheduleUpdate();
    }

    private onGroupRename() {
        const group = this.selectedGroup();
        if (!group) return;

        createInputModal(tr("Rename group"), tr("Enter the new group name"), name => {
            if (name.length < 3)
                return false;

            if (name.length > 64)
                return false;

            return this.groups.findIndex(e => e.name === name && e.type === group.type) === -1;
        }, result => {
            if (typeof result !== "string")
                return;

            this.props.events.fire("action_rename_group", {id: group.id, target: this.props.target, newName: result});
        }).open();
    }

    private onGroupDelete() {
        const group = this.selectedGroup();
        if (!group) return;

        this.props.events.fire("action_delete_group", {id: group.id, target: this.props.target, mode: "ask"});
    }

    componentDidMount(): void {
        this.props.events.fire("query_groups", {target: this.props.target});
    }
}


@ReactEventHandler<GroupsList>(e => e.props.events)
class ServerClientList extends React.Component<{ connection: ConnectionHandler, events: Registry<PermissionModalEvents> }, {
    selectedGroupId: number,
    selectedClientId: number,

    disableClientAdd: boolean,
    disableClientRemove: boolean,

    state: "loading" | "error" | "normal" | "no-permissions",
    error?: string;
}> {
    private readonly groups: GroupProperties[] = [];
    private clients: {
        name: string;
        databaseId: number;
        uniqueId: string;
    }[] = [];
    private clientMemberAddPower: number = 0;
    private clientMemberRemovePower: number = 0;

    constructor(props) {
        super(props);

        this.state = {
            selectedGroupId: 0,
            selectedClientId: 0,

            disableClientAdd: true,
            disableClientRemove: true,

            state: "loading"
        }
    }

    render() {
        const selectedGroup = this.selectedGroup();
        let groupTypePrefix = "";
        switch (selectedGroup?.type) {
            case "query":
                groupTypePrefix = "[Q] ";
                break;

            case "template":
                groupTypePrefix = "[T] ";
                break;
        }

        return [
            <div key={"list"} className={cssStyle.list + " " + cssStyle.containerList}
                 onContextMenu={e => this.onListContextMenu(e)}>
                {selectedGroup ?
                    <div key={"selected-group"} className={cssStyle.entry + " " + cssStyle.selectedGroup}>
                        <div className={cssStyle.icon}>
                            <RemoteIconRenderer icon={getIconManager().resolveIcon(selectedGroup.iconId, this.props.connection.getCurrentServerUniqueId(), this.props.connection.handlerId)} />
                        </div>
                        <div
                            className={cssStyle.name}>{groupTypePrefix + selectedGroup.name + " (" + selectedGroup.id + ")"}</div>
                    </div>
                    : undefined
                }
                <div className={cssStyle.entries}>
                    {this.clients.map(client => <div
                        key={"client-" + client.databaseId}
                        className={cssStyle.entry + " " + (this.state.selectedClientId === client.databaseId ? cssStyle.selected : "")}
                        onClick={() => this.setState({
                            selectedClientId: client.databaseId,
                            disableClientRemove: !selectedGroup || this.clientMemberRemovePower === 0 || selectedGroup.needed_member_remove > this.clientMemberRemovePower
                        })}
                        onContextMenu={e => {
                            e.preventDefault();

                            this.setState({selectedClientId: client.databaseId});
                            contextmenu.spawn_context_menu(e.pageX, e.pageY, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Add client"),
                                icon_class: 'client-add',
                                callback: () => this.onClientAdd(),
                                invalidPermission: this.clientMemberAddPower === 0 || selectedGroup.needed_member_remove > this.clientMemberAddPower
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Remove client"),
                                icon_class: 'client-delete',
                                callback: () => this.onClientRemove(),
                                invalidPermission: !selectedGroup || this.clientMemberRemovePower === 0 || selectedGroup.needed_member_remove > this.clientMemberRemovePower
                            }, {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Copy unique id"),
                                icon_class: 'client-copy',
                                callback: () => copy_to_clipboard(client.uniqueId)
                            }, contextmenu.Entry.HR(), {
                                type: contextmenu.MenuEntryType.ENTRY,
                                name: tr("Refresh"),
                                icon_class: 'client-refresh',
                                callback: () => this.onRefreshList()
                            })
                        }}
                    >{client.name || client.uniqueId}</div>)}
                </div>
                <div className={cssStyle.overlay + " " + (this.clients.length > 0 ? cssStyle.hidden : "")}>
                    <a><Translatable>This group contains no clients.</Translatable></a>
                </div>
                <div className={cssStyle.overlay + " " + (selectedGroup?.saveDB ? cssStyle.hidden : "")}>
                    <a><Translatable>This group is a temporary group.</Translatable></a>
                </div>
                <div
                    className={cssStyle.overlay + " " + cssStyle.error + " " + (this.state.state === "no-permissions" ? "" : cssStyle.hidden)}>
                    <a><Translatable>You don't have permissions to view the clients in this group</Translatable></a>
                </div>
                <div
                    className={cssStyle.overlay + " " + cssStyle.error + " " + (this.state.state === "error" ? "" : cssStyle.hidden)}>
                    <a><Translatable>Failed to query clients:</Translatable><br/>{this.state.error}</a>
                </div>
                <div className={cssStyle.overlay + " " + (selectedGroup ? cssStyle.hidden : "")}>
                    <a><Translatable>No group selected</Translatable></a>
                </div>
                <div className={cssStyle.overlay + " " + (this.state.state !== "loading" ? cssStyle.hidden : "")}>
                    <a><Translatable>loading</Translatable> <LoadingDots maxDots={3}/></a>
                </div>
            </div>,
            <div key={"buttons"} className={cssStyle.buttons}>
                <GroupsButton
                    image={"img/icon_group_add.svg"}
                    alt={tr("Add client")}
                    disabled={this.state.disableClientAdd}
                    onClick={() => this.onClientAdd()}
                />
                <GroupsButton
                    image={"img/icon_group_delete.svg"}
                    alt={tr("Remove client")}
                    disabled={this.state.disableClientRemove}
                    onClick={() => this.onClientRemove()}
                />
            </div>
        ];
    }

    private selectedClient() {
        return this.clients.find(e => e.databaseId === this.state.selectedClientId);
    }

    private selectedGroup() {
        return this.groups.find(e => e.id === this.state.selectedGroupId);
    }

    @EventHandler<PermissionModalEvents>("action_activate_tab")
    private handleGroupTabActive(events: PermissionModalEvents["action_activate_tab"]) {
        if (events.tab === "groups-server" || events.tab === "groups-channel") {
            if (typeof events.activeGroupId !== "undefined")
                this.setState({selectedGroupId: events.activeGroupId});
        }
    }

    @EventHandler<PermissionModalEvents>("query_group_clients")
    private handleQueryClients(events: PermissionModalEvents["query_group_clients"]) {
        if (events.id !== this.state.selectedGroupId)
            return;

        this.setState({state: "loading"});
    }

    @EventHandler<PermissionModalEvents>("query_group_clients_result")
    private handleQueryClientsResult(event: PermissionModalEvents["query_group_clients_result"]) {
        if (event.id !== this.state.selectedGroupId)
            return;

        this.clients = (event.clients || []).slice(0);
        this.setState({
            state: event.status === "success" ? "normal" : event.status === "error" ? "error" : event.status === "no-permissions" ? "no-permissions" : "error",
            error: event.error || tr("unknown error")
        });
    }

    @EventHandler<PermissionModalEvents>("notify_client_list_toggled")
    private handleNotifyShow(events: PermissionModalEvents["notify_client_list_toggled"]) {
        if (!events.visible)
            return;

        this.props.events.fire("query_group_clients", {id: this.state.selectedGroupId});
    }

    @EventHandler<PermissionModalEvents>("notify_groups_reset")
    private handleReset() {
        this.groups.splice(0, this.groups.length);
        this.setState({selectedClientId: 0, selectedGroupId: 0})
    }

    @EventHandler<PermissionModalEvents>("notify_client_permissions")
    private handleClientPermissions(event: PermissionModalEvents["notify_client_permissions"]) {
        this.clientMemberAddPower = event.serverGroupMemberAddPower;
        this.clientMemberRemovePower = event.serverGroupMemberRemovePower;

        const group = this.selectedGroup();
        const client = this.selectedClient();
        this.setState({
            disableClientRemove: !client || this.clientMemberRemovePower === 0 || group.needed_member_remove > this.clientMemberRemovePower,
            disableClientAdd: !group || this.clientMemberAddPower === 0 || group.needed_member_add > this.clientMemberAddPower
        });
    }

    @EventHandler<PermissionModalEvents>("action_select_group")
    private handleSelect(event: PermissionModalEvents["action_select_group"]) {
        if (event.target !== "server")
            return;

        if (this.state.selectedGroupId === event.id)
            return;

        const selectedGroup = this.groups.find(e => e.id === event.id);
        const client = this.selectedClient();
        this.setState({
            selectedGroupId: event.id,

            disableClientRemove: !client || this.clientMemberRemovePower === 0 || selectedGroup.needed_member_remove > this.clientMemberRemovePower,
            disableClientAdd: !selectedGroup || this.clientMemberAddPower === 0 || selectedGroup.needed_member_add > this.clientMemberAddPower
        });
    }

    @EventHandler<PermissionModalEvents>("query_groups_result")
    private handleQueryResult(event: PermissionModalEvents["query_groups_result"]) {
        if (event.target !== "server")
            return;

        this.groups.splice(0, this.groups.length);
        this.groups.push(...event.groups);
        if (!this.selectedGroup())
            this.setState({selectedGroupId: 0, selectedClientId: 0});
    }

    @EventHandler<PermissionModalEvents>("notify_groups_created")
    private handleGroupsCreated(event: PermissionModalEvents["notify_groups_created"]) {
        if (event.target !== "server")
            return;

        this.groups.push(...event.groups);
    }

    @EventHandler<PermissionModalEvents>("notify_groups_deleted")
    private handleGroupsDeleted(event: PermissionModalEvents["notify_groups_deleted"]) {
        if (event.target !== "server")
            return;

        event.groups.forEach(id => {
            const index = this.groups.findIndex(e => e.id === id);
            if (index === -1) return;

            this.groups.splice(index, 1);
        });

        this.forceUpdate();
    }

    @EventHandler<PermissionModalEvents>("notify_group_updated")
    private handleGroupUpdated(event: PermissionModalEvents["notify_group_updated"]) {
        if (event.target !== "server")
            return;

        const group = this.groups.find(e => e.id === event.id);
        if (!group) return;

        for (const update of event.properties) {
            switch (update.property) {
                case "name":
                    group.name = update.value;
                    break;

                case "icon":
                    group.iconId = update.value;
                    break;

                case "sort":
                    group.sortId = update.value;
                    break;

                case "save":
                    group.saveDB = update.value;
                    break;
            }
        }

        if (this.state.selectedGroupId === event.id)
            this.forceUpdate();
    }

    @EventHandler<PermissionModalEvents>("action_server_group_add_client_result")
    private handleServerGroupAddClientResult(event: PermissionModalEvents["action_server_group_add_client_result"]) {
        if (event.id !== this.state.selectedGroupId || event.status !== "success")
            return;

        this.props.events.fire("query_group_clients", {id: this.state.selectedGroupId});
    }

    @EventHandler<PermissionModalEvents>("action_server_group_remove_client_result")
    private handleServerGroupRemoveClientResult(event: PermissionModalEvents["action_server_group_remove_client_result"]) {
        if (event.id !== this.state.selectedGroupId || event.status !== "success")
            return;

        this.props.events.fire("query_group_clients", {id: this.state.selectedGroupId});
    }

    private onRefreshList() {
        this.props.events.fire("query_group_clients", {id: this.state.selectedGroupId});
    }

    private onListContextMenu(event: React.MouseEvent) {
        if (event.isDefaultPrevented())
            return;

        contextmenu.spawn_context_menu(event.pageX, event.pageY, {
            type: contextmenu.MenuEntryType.ENTRY,
            name: tr("Add client"),
            icon_class: 'client-add',
            callback: () => this.onClientAdd()
        }, {
            type: contextmenu.MenuEntryType.ENTRY,
            name: tr("Refresh"),
            icon_class: 'client-refresh',
            callback: () => this.onRefreshList()
        });
    }

    private onClientAdd() {
        createInputModal(tr("Add client to server group"), tr("Enter the client unique id or database id"), text => {
            if (!text) return false;
            if (!!text.match(/^[0-9]+$/))
                return true;
            try {
                return atob(text).length == 20;
            } catch (error) {
                return false;
            }
        }, async text => {
            if (typeof (text) !== "string")
                return;

            let targetClient;
            if (!!text.match(/^[0-9]+$/)) {
                targetClient = parseInt(text);
            } else {
                targetClient = text.trim();
            }

            this.props.events.fire("action_server_group_add_client", {
                client: targetClient,
                id: this.state.selectedGroupId
            });
        }).open();
    }

    private onClientRemove() {
        this.props.events.fire("action_server_group_remove_client", {
            id: this.state.selectedGroupId,
            client: this.state.selectedClientId
        });
    }
}

const ServerGroupsSideBar = (props: { connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents> }) => {
    const [active, setActive] = useState(true);
    const [clientList, setClientList] = useState(false);

    props.modalEvents.reactUse("action_activate_tab", event => setActive(event.tab === "groups-server"));
    props.modalEvents.reactUse("notify_client_list_toggled", event => setClientList(event.visible));

    return (
        <div
            className={cssStyle.sideContainer + " " + cssStyle.containerServerGroups + " " + (active ? "" : cssStyle.hidden)}>
            <div className={cssStyle.containerGroupList + " " + (!clientList ? "" : cssStyle.hidden)}>
                <GroupsList connection={props.connection} events={props.modalEvents} target={"server"}/>
            </div>
            <div className={cssStyle.containerClientList + " " + (clientList ? "" : cssStyle.hidden)}>
                <ServerClientList connection={props.connection} events={props.modalEvents}/>
            </div>
        </div>
    );
};

const ChannelGroupsSideBar = (props: { connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents> }) => {
    const [active, setActive] = useState(false);

    props.modalEvents.reactUse("action_activate_tab", event => setActive(event.tab === "groups-channel"));

    return (
        <div
            className={cssStyle.sideContainer + " " + cssStyle.containerChannelGroups + " " + (active ? "" : cssStyle.hidden)}>
            <GroupsList connection={props.connection} events={props.modalEvents} target={"channel"}/>
        </div>
    );
};

@ReactEventHandler<ChannelList>(e => e.props.events)
class ChannelList extends React.Component<{ connection: ConnectionHandler, events: Registry<PermissionModalEvents>, tabTarget: "channel" | "client-channel" }, { selectedChanelId: number }> {
    private channels: ChannelInfo[] = [];
    private isActiveTab = false;

    constructor(props) {
        super(props);

        this.state = {
            selectedChanelId: 0
        }
    }

    render() {
        return (
            <div className={cssStyle.containerList + " " + cssStyle.listChannels} onContextMenu={e => {
                e.preventDefault();

                spawn_context_menu(e.pageX, e.pageY, {
                    type: MenuEntryType.ENTRY,
                    icon_class: "client-check_update",
                    name: tr("Refresh"),
                    callback: () => this.props.events.fire("query_channels")
                });
            }}>
                <div className={cssStyle.entries}>
                    {this.channels.map(e => (
                        <div key={"channel-" + e.id}
                             className={cssStyle.entry + " " + (e.id === this.state.selectedChanelId ? cssStyle.selected : "")}
                             style={{paddingLeft: `calc(0.25em + ${e.depth * 16}px)`}}
                             onClick={() => this.props.events.fire("action_select_channel", {
                                 target: this.props.tabTarget,
                                 id: e.id
                             })}
                        >
                            <RemoteIconRenderer icon={getIconManager().resolveIcon(e.iconId, this.props.connection.getCurrentServerUniqueId(), this.props.connection.handlerId)} />
                            <a className={cssStyle.name}>{e.name + " (" + e.id + ")"}</a>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    componentDidMount(): void {
        this.props.events.fire("query_channels");
    }

    @EventHandler<PermissionModalEvents>("query_channels_result")
    private handleQueryChannelsResult(event: PermissionModalEvents["query_channels_result"]) {
        this.channels = event.channels.slice(0);
        if (this.channels.length > 0 && this.channels.findIndex(e => e.id === this.state.selectedChanelId) === -1)
            this.setState({selectedChanelId: this.channels[0].id});
        else
            this.forceUpdate();
    }

    @EventHandler<PermissionModalEvents>("notify_channel_updated")
    private handleChannelUpdated(event: PermissionModalEvents["notify_channel_updated"]) {
        const channel = this.channels.find(e => e.id === event.id);
        if (!channel) return;

        switch (event.property) {
            case "icon":
                channel.iconId = event.value;
                break;

            case "name":
                channel.name = event.value;
                break;

            default:
                return;
        }

        this.forceUpdate();
    }

    @EventHandler<PermissionModalEvents>("action_select_channel")
    private handleActionSelectChannel(event: PermissionModalEvents["action_select_channel"]) {
        if (event.target !== this.props.tabTarget)
            return;

        this.setState({selectedChanelId: event.id});
        if (this.isActiveTab) {
            this.props.events.fire("action_set_permission_editor_subject", {
                mode: this.props.tabTarget,
                channelId: event.id
            });
        }
    }

    @EventHandler<PermissionModalEvents>("action_activate_tab")
    private handleActionTabSelect(event: PermissionModalEvents["action_activate_tab"]) {
        this.isActiveTab = event.tab === this.props.tabTarget;
        if (!this.isActiveTab)
            return;

        if (typeof event.activeChannelId === "number")
            this.setState({selectedChanelId: event.activeChannelId});

        this.props.events.fire("action_set_permission_editor_subject", {
            mode: this.props.tabTarget,
            channelId: typeof event.activeChannelId === "number" ? event.activeChannelId : this.state.selectedChanelId
        });
    }
}

const ChannelSideBar = (props: { connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents> }) => {
    const [active, setActive] = useState(false);

    props.modalEvents.reactUse("action_activate_tab", event => setActive(event.tab === "channel"));

    return (
        <div
            className={cssStyle.sideContainer + " " + cssStyle.containerChannels + " " + (active ? "" : cssStyle.hidden)}>
            <ChannelList connection={props.connection} events={props.modalEvents} tabTarget={"channel"}/>
        </div>
    );
};

const ClientSelect = (props: { events: Registry<PermissionModalEvents>, tabTarget: "client" | "client-channel" }) => {
    const [clientIdentifier, setClientIdentifier] = useState<number | string | undefined>(undefined);
    const [clientInfo, setClientInfo] = useState<{ name: string, uniqueId: string, databaseId: number }>(undefined);

    const refInput = useRef<FlatInputField>();
    const refNickname = useRef<FlatInputField>();
    const refUniqueIdentifier = useRef<FlatInputField>();
    const refDatabaseId = useRef<FlatInputField>();

    props.events.reactUse("action_activate_tab", event => {
        if (event.tab !== props.tabTarget)
            return;

        if (typeof event.activeClientDatabaseId !== "undefined") {
            props.events.fire("action_select_client", {
                target: props.tabTarget,
                id: event.activeClientDatabaseId === 0 ? "undefined" : event.activeClientDatabaseId
            });
        } else {
            if (clientInfo && clientInfo.databaseId)
                props.events.fire("action_set_permission_editor_subject", {
                    mode: props.tabTarget,
                    clientDatabaseId: clientInfo.databaseId
                });
            else
                props.events.fire("action_set_permission_editor_subject", {mode: props.tabTarget, clientDatabaseId: 0});
        }
    });

    const resetInfoFields = (placeholder?: string) => {
        refNickname.current?.setValue(undefined);
        refUniqueIdentifier.current?.setValue(undefined);
        refDatabaseId.current?.setValue(undefined);

        refNickname.current?.setState({placeholder: placeholder});
        refUniqueIdentifier.current?.setState({placeholder: placeholder});
        refDatabaseId.current?.setState({placeholder: placeholder});
    };

    props.events.reactUse("query_client_info", event => {
        if (event.client !== clientIdentifier)
            return;

        refInput.current?.setState({disabled: true});
        resetInfoFields(tr("loading..."));
        props.events.fire("action_set_permission_editor_subject", {mode: props.tabTarget, clientDatabaseId: 0});
    });

    props.events.reactUse("query_client_info_result", event => {
        if (event.client !== clientIdentifier)
            return;

        refInput.current?.setState({disabled: false});
        if (event.state === "success") {
            setClientInfo(event.info);

            refNickname.current?.setValue(event.info.name);
            refUniqueIdentifier.current?.setValue(event.info.uniqueId);
            refDatabaseId.current?.setValue(event.info.databaseId + "");
            props.events.fire("action_set_permission_editor_subject", {
                mode: props.tabTarget,
                clientDatabaseId: event.info.databaseId
            });
            return;
        } else if (event.state === "error") {
            refInput.current.setState({disabled: false, isInvalid: true, invalidMessage: event.error});
        } else if (event.state === "no-permission") {
            refInput.current.setState({
                disabled: false,
                isInvalid: true,
                invalidMessage: tra("failed on permission {0}", event.failedPermission)
            });
        } else if (event.state === "no-such-client") {
            refInput.current.setState({disabled: false, isInvalid: true, invalidMessage: tr("no client found")});
            refInput.current.focus();
        }

        refNickname.current?.setState({placeholder: undefined});
        refUniqueIdentifier.current?.setState({placeholder: undefined});
        refDatabaseId.current?.setState({placeholder: undefined});
    });

    props.events.reactUse("action_select_client", event => {
        if (event.target !== props.tabTarget)
            return;

        setClientIdentifier(event.id);
        refInput.current.setValue(typeof event.id === "undefined" ? "" : event.id.toString());
        if (typeof event.id === "number" || typeof event.id === "string") {
            /* first do the state update */
            props.events.fire_async("query_client_info", {client: event.id});
        } else {
            refInput.current?.setValue(undefined);
            resetInfoFields(undefined);
            props.events.fire("action_set_permission_editor_subject", {mode: props.tabTarget, clientDatabaseId: 0});
        }
    });

    return (
        <div className={cssStyle.clientSelect}>
            <FlatInputField
                ref={refInput}
                label={tr("Database or Unique ID")}
                className={cssStyle.inputField}
                labelType={"floating"}
                finishOnEnter={true}
                onInput={value => {
                    if (value.match(/^[0-9]{1,8}$/)) {
                        refInput.current?.setState({isInvalid: false});
                    } else if (value.length === 0) {
                        refInput.current?.setState({isInvalid: false});
                    } else {
                        try {
                            if (arrayBufferBase64(value).byteLength !== 20)
                                throw void 0;

                            refInput.current?.setState({isInvalid: false});
                        } catch (e) {
                            refInput.current?.setState({isInvalid: true, invalidMessage: undefined});
                        }
                    }
                }}
                onBlur={() => {
                    const value = refInput.current.value();
                    let client;
                    if (value.match(/^[0-9]{1,8}$/)) {
                        client = parseInt(value);
                    } else if (value.length === 0) {
                        client = undefined;
                    } else {
                        try {
                            if (arrayBufferBase64(value).byteLength !== 20) {
                                refInput.current?.setState({
                                    isInvalid: true,
                                    invalidMessage: tr("Invalid UUID length")
                                });
                                return;
                            }
                        } catch (e) {
                            refInput.current?.setState({isInvalid: true, invalidMessage: tr("Invalid UUID")});
                            return;
                        }
                    }
                    refInput.current?.setState({isInvalid: false});
                    props.events.fire("action_select_client", {id: client, target: props.tabTarget});
                }}
            />
            <hr/>
            <FlatInputField ref={refNickname} label={tr("Nickname")} className={cssStyle.infoField} disabled={true}/>
            <FlatInputField ref={refUniqueIdentifier} label={tr("Unique identifier")} className={cssStyle.infoField}
                            disabled={true}/>
            <FlatInputField ref={refDatabaseId} label={tr("Client database ID")} className={cssStyle.infoField}
                            disabled={true}/>
        </div>
    );
};

const ClientSideBar = (props: { connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents> }) => {
    const [active, setActive] = useState(false);

    props.modalEvents.reactUse("action_activate_tab", event => setActive(event.tab === "client"));

    return (
        <div
            className={cssStyle.sideContainer + " " + cssStyle.containerClient + " " + (active ? "" : cssStyle.hidden)}>
            <ClientSelect events={props.modalEvents} tabTarget={"client"}/>
        </div>
    );
};

const ClientChannelSideBar = (props: { connection: ConnectionHandler, modalEvents: Registry<PermissionModalEvents> }) => {
    const [active, setActive] = useState(false);

    props.modalEvents.reactUse("action_activate_tab", event => setActive(event.tab === "client-channel"));

    return (
        <div
            className={cssStyle.sideContainer + " " + cssStyle.containerChannelClient + " " + (active ? "" : cssStyle.hidden)}>
            <ClientSelect events={props.modalEvents} tabTarget={"client-channel"}/>
            <ChannelList connection={props.connection} events={props.modalEvents} tabTarget={"client-channel"}/>
        </div>
    );
};