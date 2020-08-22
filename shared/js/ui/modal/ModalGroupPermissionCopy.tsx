import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {useRef, useState} from "react";
import {FlatSelect} from "tc-shared/ui/react-elements/InputField";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import * as React from "react";
import {Button} from "tc-shared/ui/react-elements/Button";
import {GroupType} from "tc-shared/permission/GroupManager";
import PermissionType from "tc-shared/permission/PermissionType";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {ErrorCode} from "tc-shared/connection/ErrorCode";

const cssStyle = require("./ModalGroupPermissionCopy.scss");

export type GroupInfo = {
    id: number,
    name: string,
    type: "query" | "template" | "normal"
};

export interface GroupPermissionCopyModalEvents {
    action_set_source: { group: number },
    action_set_target: { group: number }

    action_cancel: {},
    action_copy: {
        source: number;
        target: number;
    }

    query_available_groups: { },
    query_available_groups_result: {
        groups: GroupInfo[]
    },

    query_client_permissions: {},
    notify_client_permissions: {
        createTemplateGroup: boolean,
        createQueryGroup: boolean
    },

    notify_destroy: {}
}

const GroupSelector = (props: { events: Registry<GroupPermissionCopyModalEvents>, defaultGroup: number, updateEvent: "action_set_source" | "action_set_target", label: React.ReactElement, className: string}) => {
    const [ selectedGroup, setSelectedGroup ] = useState(undefined);
    const [ permissions, setPermissions ] = useState<"loading" | { createTemplate, createQuery }>("loading");
    const [ exitingGroups, setExitingGroups ] = useState<"loading" | GroupInfo[]>("loading");

    const refSelect = useRef<FlatSelect>();

    props.events.reactUse("notify_client_permissions", event => setPermissions({
        createQuery: event.createQueryGroup,
        createTemplate: event.createTemplateGroup
    }));
    props.events.reactUse("query_available_groups_result", event => setExitingGroups(event.groups));
    props.events.reactUse(props.updateEvent, event => setSelectedGroup(event.group));

    const groupName = (group: GroupInfo) => {
        let prefix = group.type === "template" ? "[T] " : group.type === "query" ? "[Q] " : "";
        return prefix + group.name + " (" + group.id + ")";
    };

    const isLoading = exitingGroups === "loading" || permissions === "loading";
    if(!isLoading && selectedGroup === undefined)
        props.events.fire_async(props.updateEvent, {
            group: (exitingGroups as GroupInfo[]).findIndex(e => e.id === props.defaultGroup) === -1 ? 0 : props.defaultGroup
        });

    return (
        <FlatSelect
            ref={refSelect}
            label={props.label}
            className={props.className}
            disabled={isLoading}
            value={isLoading || selectedGroup === undefined ? "-1" : selectedGroup.toString()}
            onChange={event => props.events.fire(props.updateEvent, { group: parseInt(event.target.value) })}
        >
            <option className={cssStyle.hiddenOption} value={"-1"}>{tr("loading...")}</option>
            <option className={cssStyle.hiddenOption} value={"0"}>{tr("Select a group")}</option>
            <optgroup label={tr("Query groups")} className={permissions === "loading" || !permissions.createQuery ? cssStyle.hiddenOption : ""} >
                {exitingGroups === "loading" ? undefined :
                    exitingGroups.filter(e => e.type === "query").map(e => (
                        <option key={"group-" + e.id} value={e.id.toString()}>{groupName(e)}</option>
                    ))
                }
            </optgroup>
            <optgroup label={tr("Template groups")} className={permissions === "loading" || !permissions.createTemplate ? cssStyle.hiddenOption : ""} >
                {exitingGroups === "loading" ? undefined :
                    exitingGroups.filter(e => e.type === "template").map(e => (
                        <option key={"group-" + e.id} value={e.id.toString()}>{groupName(e)}</option>
                    ))
                }
            </optgroup>
            <optgroup label={tr("Regular Groups")} >
                {exitingGroups === "loading" ? undefined :
                    exitingGroups.filter(e => e.type === "normal").map(e => (
                        <option key={"group-" + e.id} value={e.id.toString()}>{groupName(e)}</option>
                    ))
                }
            </optgroup>
        </FlatSelect>
    )
};

const CopyButton = (props: { events: Registry<GroupPermissionCopyModalEvents> }) => {
    const [ sourceGroup, setSourceGroup ] = useState<number>(0);
    const [ targetGroup, setTargetGroup ] = useState<number>(0);

    props.events.reactUse("action_set_source", event => setSourceGroup(event.group));
    props.events.reactUse("action_set_target", event => setTargetGroup(event.group));

    return <Button color={"green"} disabled={sourceGroup === 0 || targetGroup === 0 || targetGroup === sourceGroup} onClick={() => {
        props.events.fire("action_copy", { source: sourceGroup, target: targetGroup });
    }}>
        <Translatable>Copy group permissions</Translatable>
    </Button>
};

class ModalGroupPermissionCopy extends InternalModal {
    readonly events: Registry<GroupPermissionCopyModalEvents>;

    readonly defaultSource: number;
    readonly defaultTarget: number;

    constructor(connection: ConnectionHandler, events: Registry<GroupPermissionCopyModalEvents>, target: "server" | "channel", sourceGroup?: number, targetGroup?: number) {
        super();

        this.events = events;
        this.defaultSource = sourceGroup;
        this.defaultTarget = targetGroup;

        initializeGroupPermissionCopyController(connection, this.events, target);
    }

    protected onInitialize() {
        this.events.fire_async("query_available_groups");
        this.events.fire_async("query_client_permissions");
    }

    protected onDestroy() {
        this.events.fire("notify_destroy");
        this.events.destroy();
    }

    renderBody() {
        return <div className={cssStyle.container}>
            <div className={cssStyle.row}>
                <GroupSelector events={this.events} defaultGroup={this.defaultSource} updateEvent={"action_set_source"} label={<Translatable>Source group</Translatable>} className={cssStyle.sourceGroup} />
                <GroupSelector events={this.events} defaultGroup={this.defaultTarget} updateEvent={"action_set_target"} label={<Translatable>Target group</Translatable>} className={cssStyle.targetGroup} />
            </div>
            <div className={cssStyle.buttons}>
                <Button color={"red"} onClick={() => this.events.fire("action_cancel")}><Translatable>Cancel</Translatable></Button>
                <CopyButton events={this.events} />
            </div>
        </div>;
    }

    title() {
        return <Translatable>Copy group permissions</Translatable>;
    }
}

export function spawnModalGroupPermissionCopy(connection: ConnectionHandler, target: "channel" | "server", sourceGroup?: number, targetGroup?: number) {
    const events = new Registry<GroupPermissionCopyModalEvents>();
    const modal = spawnReactModal(ModalGroupPermissionCopy, connection, events, target, sourceGroup, targetGroup);
    modal.show();

    events.on(["action_cancel", "action_copy"], () => modal.destroy());
}

const stringifyError = error => {
    if(error instanceof CommandResult) {
        if(error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS)
            return tr("insufficient permissions");
        else
            return error.message + (error.extra_message ? " (" + error.extra_message + ")" : "");
    } else if(error instanceof Error) {
        return error.message;
    } else if(typeof error !== "string") {
        return tr("Lookup the console");
    }
    return error;
};

function initializeGroupPermissionCopyController(connection: ConnectionHandler, events: Registry<GroupPermissionCopyModalEvents>, target: "server" | "channel") {
    events.on("query_available_groups", event => {
        const groups = target === "server" ? connection.groups.serverGroups : connection.groups.channelGroups;

        events.fire_async("query_available_groups_result", {
            groups: groups.map(e => {
                return {
                    name: e.name,
                    id: e.id,
                    type: e.type === GroupType.TEMPLATE ? "template" : e.type === GroupType.QUERY ? "query" : "normal"
                }
            })
        });
    });

    const notifyClientPermissions = () => events.fire_async("notify_client_permissions", {
        createQueryGroup: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1),
        createTemplateGroup: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1)
    });
    events.on("query_client_permissions", notifyClientPermissions);
    events.on("notify_destroy", connection.permissions.events.on("client_permissions_changed", notifyClientPermissions));

    events.on("action_copy", event => {
        connection.serverConnection.send_command("servergroupcopy", {
            ssgid: event.source,
            tsgid: event.target
        }).then(() => {
            createInfoModal(tr("Group permissions have been copied"), tr("The group permissions have been successfully copied.")).open();
        }).catch(error => {
            if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                createErrorModal(tr("Failed to copy group permissions"),
                    tra("Failed to copy group permissions.\nMissing permission {}", connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon"))).open();
                return;
            }

            console.warn(tr("Failed to copy group permissions: %o"), error);
            createErrorModal(tr("Failed to copy group permissions"),
                tra("Failed to copy group permissions.\n{}", stringifyError(error))).open();
        });
    });
}