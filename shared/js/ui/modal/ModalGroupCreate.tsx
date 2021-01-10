import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import {Registry} from "tc-shared/events";
import {FlatInputField, Select} from "tc-shared/ui/react-elements/InputField";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {GroupType} from "tc-shared/permission/GroupManager";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
import PermissionType from "tc-shared/permission/PermissionType";
import {CommandResult} from "tc-shared/connection/ServerConnectionDeclaration";
import {createErrorModal, createInfoModal} from "tc-shared/ui/elements/Modal";
import {tra} from "tc-shared/i18n/localize";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {ErrorCode} from "tc-shared/connection/ErrorCode";
import {LogCategory, logError} from "tc-shared/log";

const cssStyle = require("./ModalGroupCreate.scss");

export type GroupInfo = {
    id: number,
    name: string,
    type: "query" | "template" | "normal"
};

export interface GroupCreateModalEvents {
    action_set_name: { name: string | undefined },
    action_set_type: { target: "query" | "template" | "normal" },
    action_set_source: { group: number },

    action_cancel: {},
    action_create: {
        name: string,
        target: "query" | "template" | "normal",
        source: number /* if zero than no template */
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

const GroupNameInput = (props: { events: Registry<GroupCreateModalEvents>, defaultSource: number }) => {
    const [ initialLoad, setInitialLoad ] = useState(true);
    const [ existingGroups, setExistingGroups ] = useState<"loading" | GroupInfo[]>("loading");
    const [ selectedType, setSelectedType ] = useState<"query" | "template" | "normal" | "loading">("loading");

    const refInput = useRef<FlatInputField>();

    useEffect(() => {
        if(!initialLoad || !refInput.current)
            return;

        if(selectedType === "loading" || existingGroups === "loading")
            return;

        setInitialLoad(false);
        refInput.current.focus();

        const defaultGroup = existingGroups.find(e => e.id === props.defaultSource);
        if(defaultGroup) {
            let name = defaultGroup.name + " (" + tr("Copy") + ")";
            let index = 1;
            while(existingGroups.findIndex(e => e.name === name) !== -1)
                name = defaultGroup.name + " (" + tr("Copy")+ " " + index++ + ")";

            refInput.current.setValue(name);
            props.events.fire("action_set_name", { name: updateGroupNameState(name) ? name : undefined });
        }
    });

    const updateGroupNameState = (input: string) => {
        if(!refInput.current)
            return false;

        if(input.length === 0 || input.length > 30) {
            refInput.current.setState({ isInvalid: true, invalidMessage: tr("Invalid group name length") });
            return false;
        }

        if(existingGroups === "loading")
            return false;

        if(existingGroups.findIndex(e => e.name === input && e.type === selectedType) !== -1) {
            refInput.current.setState({ isInvalid: true, invalidMessage: tr("A group with this name already exists") });
            return false;
        }

        refInput.current.setState({ isInvalid: false });
        return true;
    };

    props.events.reactUse("query_available_groups_result", event => setExistingGroups(event.groups));
    props.events.reactUse("action_set_type", event => setSelectedType(event.target));

    return (
        <FlatInputField
            ref={refInput}
            label={<Translatable>Group name</Translatable>}
            finishOnEnter={true}

            disabled={existingGroups === "loading" || selectedType === "loading"}
            placeholder={existingGroups === "loading" || selectedType === "loading" ? tr("loading data...") : undefined}
            onInput={() => props.events.fire("action_set_name", { name: updateGroupNameState(refInput.current.value()) ? refInput.current.value() : undefined })}
            onBlur={() => props.events.fire("action_set_name", { name: updateGroupNameState(refInput.current.value()) ? refInput.current.value() : undefined })}
        />
    )
};

const GroupTypeSelector = (props: { events: Registry<GroupCreateModalEvents> }) => {
    const [ selectedType, setSelectedType ] = useState<"query" | "template" | "normal" | "loading">("loading");
    const [ permissions, setPermissions ] = useState<"loading" | { createTemplate, createQuery }>("loading");
    const refSelect = useRef<Select>();

    props.events.reactUse("notify_client_permissions", event => {
        setPermissions({
            createQuery: event.createQueryGroup,
            createTemplate: event.createTemplateGroup
        });

        /* the default type */
        props.events.fire("action_set_type", { target: "normal" });
    });

    props.events.reactUse("action_set_type", event => setSelectedType(event.target));

    return (
        <Select
            ref={refSelect}
            label={<Translatable>Target group type</Translatable>}
            className={cssStyle.groupType}
            disabled={permissions === "loading"}
            value={selectedType}
            onChange={event => event.target.value !== "loading" && props.events.fire("action_set_type", { target: event.target.value as any })}
        >
            <option className={cssStyle.hiddenOption} value={"loading"}>{tr("loading...")}</option>
            <option
                value={"query"}
                disabled={permissions === "loading" || !permissions.createQuery}
            >{tr("Query group")}</option>
            <option
                value={"template"}
                disabled={permissions === "loading" || !permissions.createTemplate}
            >{tr("Template group")}</option>
            <option
                value={"normal"}
            >{tr("Regular group")}</option>
        </Select>
    )
};

const SourceGroupSelector = (props: { events: Registry<GroupCreateModalEvents>, defaultSource: number }) => {
    const [ selectedGroup, setSelectedGroup ] = useState(undefined);
    const [ permissions, setPermissions ] = useState<"loading" | { createTemplate, createQuery }>("loading");
    const [ exitingGroups, setExitingGroups ] = useState<"loading" | GroupInfo[]>("loading");

    const refSelect = useRef<Select>();

    props.events.reactUse("notify_client_permissions", event => setPermissions({
        createQuery: event.createQueryGroup,
        createTemplate: event.createTemplateGroup
    }));
    props.events.reactUse("query_available_groups_result", event => setExitingGroups(event.groups));
    props.events.reactUse("action_set_source", event => setSelectedGroup(event.group));

    const groupName = (group: GroupInfo) => {
        let prefix = group.type === "template" ? "[T] " : group.type === "query" ? "[Q] " : "";
        return prefix + group.name + " (" + group.id + ")";
    };

    const isLoading = exitingGroups === "loading" || permissions === "loading";
    if(!isLoading && selectedGroup === undefined)
        props.events.fire_react("action_set_source", {
            group: (exitingGroups as GroupInfo[]).findIndex(e => e.id === props.defaultSource) === -1 ? 0 : props.defaultSource
        });

    return (
        <Select
            ref={refSelect}
            label={<Translatable>Create group using this template</Translatable>}
            className={cssStyle.groupSource}
            disabled={isLoading}
            value={isLoading || selectedGroup === undefined ? "-1" : selectedGroup.toString()}
            onChange={event => props.events.fire("action_set_source", { group: parseInt(event.target.value) })}
        >
            <option className={cssStyle.hiddenOption} value={"-1"}>{tr("loading...")}</option>
            <option value={"0"} onSelect={() => props.events.fire("action_set_source", { group: 0 })}>{tr("No template")}</option>
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
        </Select>
    )
};

const CreateButton = (props: { events: Registry<GroupCreateModalEvents> }) => {
    const [ sourceGroup, setSourceGroup ] = useState<number | undefined>(undefined);
    const [ groupType, setGroupType ] = useState<"query" | "template" | "normal" | undefined>(undefined);
    const [ groupName, setGroupName ] = useState<string | undefined>(undefined);

    props.events.reactUse("action_set_name", event => setGroupName(event.name));
    props.events.reactUse("action_set_type", event => setGroupType(event.target));
    props.events.reactUse("action_set_source", event => setSourceGroup(event.group));

    return <Button color={"green"} disabled={sourceGroup === undefined || groupType === undefined || groupName === undefined} onClick={() => {
        props.events.fire("action_create", { name: groupName, source: sourceGroup, target: groupType });
    }}>
        <Translatable>Create Group</Translatable>
    </Button>
};

class ModalGroupCreate extends InternalModal {
    readonly target: "server" | "channel";
    readonly events: Registry<GroupCreateModalEvents>;
    readonly defaultSourceGroup: number;

    constructor(connection: ConnectionHandler, events: Registry<GroupCreateModalEvents>, target: "server" | "channel", defaultSourceGroup: number) {
        super();

        this.events = events;
        this.defaultSourceGroup = defaultSourceGroup;
        this.target = target;
        initializeGroupCreateController(connection, this.events, this.target);
    }

    protected onInitialize() {
        this.events.fire_react("query_available_groups");
        this.events.fire_react("query_client_permissions");
    }

    protected onDestroy() {
        this.events.fire("notify_destroy");
    }

    renderBody() {
        return <div className={cssStyle.container}>
            <GroupNameInput events={this.events} defaultSource={this.defaultSourceGroup} />
            <div className={cssStyle.row}>
                <GroupTypeSelector events={this.events} />
                <SourceGroupSelector events={this.events} defaultSource={this.defaultSourceGroup} />
            </div>
            <div className={cssStyle.buttons}>
                <Button color={"red"} onClick={() => this.events.fire("action_cancel")}><Translatable>Cancel</Translatable></Button>
                <CreateButton events={this.events} />
            </div>
        </div>;
    }

    title() {
        return this.target === "server" ? <Translatable>Create a new server group</Translatable> : <Translatable>Create a new channel group</Translatable>;
    }

}

export function spawnGroupCreate(connection: ConnectionHandler, target: "server" | "channel", sourceGroup: number = 0) {
    const events = new Registry<GroupCreateModalEvents>();
    events.enableDebug("group-create");

    const modal = spawnReactModal(ModalGroupCreate, connection, events, target, sourceGroup);
    modal.show();

    events.on(["action_cancel", "action_create"], () => modal.destroy());
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

function initializeGroupCreateController(connection: ConnectionHandler, events: Registry<GroupCreateModalEvents>, target: "server" | "channel") {
    events.on("query_available_groups", event => {
        const groups = target === "server" ? connection.groups.serverGroups : connection.groups.channelGroups;

        events.fire_react("query_available_groups_result", {
            groups: groups.map(e => {
                return {
                    name: e.name,
                    id: e.id,
                    type: e.type === GroupType.TEMPLATE ? "template" : e.type === GroupType.QUERY ? "query" : "normal"
                }
            })
        });
    });

    const notifyClientPermissions = () => events.fire_react("notify_client_permissions", {
        createQueryGroup: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_QUERYGROUP).granted(1),
        createTemplateGroup: connection.permissions.neededPermission(PermissionType.B_SERVERINSTANCE_MODIFY_TEMPLATES).granted(1)
    });
    events.on("query_client_permissions", notifyClientPermissions);
    events.on("notify_destroy", connection.permissions.events.on("client_permissions_changed", notifyClientPermissions));

    events.on("action_create", event => {
        let promise: Promise<CommandResult>;
        if(event.source <= 0) {
            /* real group create */
            promise = connection.serverConnection.send_command("servergroupadd", {
                name: event.name,
                type: event.target === "query" ? 2 : event.target === "template" ? 0 : 1
            });
        } else {
            /* group copy */
            promise = connection.serverConnection.send_command("servergroupcopy", {
                ssgid: event.source,
                name: event.name,
                type: event.target === "query" ? 2 : event.target === "template" ? 0 : 1
            });
        }
        promise.then(() => {
            createInfoModal(tr("Group has been created"), tr("The group has been successfully created.")).open();
        }).catch(error => {
            if(error instanceof CommandResult && error.id === ErrorCode.SERVER_INSUFFICIENT_PERMISSIONS) {
                createErrorModal(tr("Failed to create group"),
                    tra("Failed to create group.\nMissing permission {}", connection.permissions.resolveInfo(parseInt(error.json["failed_permid"]))?.name || tr("unknwon"))).open();
                return;
            }

            logError(LogCategory.GENERAL, tr("Failed to create group: %o"), error);
            createErrorModal(tr("Failed to create group"),
                tra("Failed to create group.\n{}", stringifyError(error))).open();
        });
    });
}