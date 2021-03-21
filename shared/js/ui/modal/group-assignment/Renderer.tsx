import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import React, {useContext} from "react";
import {IpcRegistryDescription, Registry} from "tc-events";
import {
    AvailableGroup,
    ModalClientGroupAssignmentEvents,
    ModalClientGroupAssignmentVariables
} from "tc-shared/ui/modal/group-assignment/Definitions";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {ClientTag} from "tc-shared/ui/tree/EntryTags";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {RemoteIconInfoRenderer} from "tc-shared/ui/react-elements/Icon";
import {Button} from "tc-shared/ui/react-elements/Button";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";

const cssStyle = require("./Renderer.scss");
const VariablesContext = React.createContext<UiVariableConsumer<ModalClientGroupAssignmentVariables>>(undefined);
const EventsContext = React.createContext<Registry<ModalClientGroupAssignmentEvents>>(undefined);

const GroupEntryRenderer = React.memo((props: { entry : AvailableGroup, defaultGroup: boolean, defaultGroupActive: boolean }) => {
    const variables = useContext(VariablesContext);
    const assigned = variables.useVariable("groupAssigned", props.entry.groupId, false);

    let disabled = false;
    if(assigned.status === "applying") {
        disabled = true;
    } else if(assigned.localValue ? !props.entry.removeAble : !props.entry.addAble) {
        disabled = true;
    } else if(props.defaultGroup && !assigned.localValue) {
        /* Only disable it if we haven't the group assigned in order to remove the assignment even though the groups is the default group */
        disabled = true;
    }

    let nameSuffix;
    if(props.defaultGroup) {
        nameSuffix = " [default]";
    } else if(!props.entry.saveDB) {
        nameSuffix = " [temp]";
    }
    return (
        <div className={cssStyle.entry}>
            <Checkbox
                value={(props.defaultGroup && props.defaultGroupActive) || assigned.localValue}
                onChange={value => assigned.setValue(value)}
                disabled={disabled}
                className={cssStyle.checkbox}
            />
            <RemoteIconInfoRenderer icon={props.entry.icon} className={cssStyle.icon} />
            <div className={cssStyle.name}>{props.entry.name}{nameSuffix}</div>
        </div>
    );
});

const GroupListRenderer = React.memo(() => {
    const variables = useContext(VariablesContext);
    const serverGroups = variables.useReadOnly("availableGroups", undefined, { defaultGroup: -1, groups: [] });
    const assignmentStatus = variables.useReadOnly("assignedGroupStatus", undefined, { status: "loading" });

    let body;
    if(assignmentStatus.status === "loaded") {
        body = serverGroups.groups.map(entry => (
            <GroupEntryRenderer
                entry={entry} key={"group-" + entry.groupId}
                defaultGroup={serverGroups.defaultGroup === entry.groupId}
                defaultGroupActive={assignmentStatus.assignedGroups === 0}
            />
        ));
    } else if(assignmentStatus.status === "loading") {
        body = (
            <div className={cssStyle.overlay} key={"loading"}>
                <div className={cssStyle.text}>
                    <Translatable>loading</Translatable> <LoadingDots />
                </div>
            </div>
        );
    } else if(assignmentStatus.status === "error") {
        body = (
            <div className={cssStyle.overlay} key={"error"}>
                <div className={cssStyle.text + " " + cssStyle.error}>
                    <Translatable>An error occurred:</Translatable><br />
                    {assignmentStatus.message}
                </div>
            </div>
        );
    }
    return (
        <div className={cssStyle.assignmentList}>
            {body}
        </div>
    );
});

const Buttons = React.memo(() => {
    const events = useContext(EventsContext);
    const variables = useContext(VariablesContext);
    const assignmentStatus = variables.useReadOnly("assignedGroupStatus", undefined, { status: "loading" });

    return (
        <div className={cssStyle.containerButtons}>
            <Button
                color={"red"}
                onClick={() => events.fire("action_remove_all")}
                disabled={assignmentStatus.status === "loaded" ? assignmentStatus.assignedGroups === 0 : true}
            >
                <Translatable>Remove all groups</Translatable>
            </Button>
            <Button color={"green"} onClick={() => events.fire("action_close")}>
                <Translatable>Close</Translatable>
            </Button>
        </div>
    )
});

const ClientInfoRenderer = React.memo(() => {
    const variables = useContext(VariablesContext);
    const handlerId = variables.useReadOnly("handlerId", undefined, undefined);
    const user = variables.useReadOnly("targetClient");

    let inner;
    if(handlerId && user.status === "loaded") {
        let clientTag;
        if(user.value.status === "success") {
            clientTag = <ClientTag key={"client-tag"} clientName={user.value.clientName} clientUniqueId={user.value.clientUniqueId} handlerId={handlerId} />;
        } else {
            clientTag = <div key={"error"} className={cssStyle.textError}>{user.value.message}</div>;
        }

        inner = (
            <VariadicTranslatable text={"Changing groups of {}"} key={"user-specific"}>
                {clientTag}
            </VariadicTranslatable>
        );
    } else {
        inner = <Translatable key={"generic"}>Change server groups</Translatable>;
    }

    return (
        <div className={cssStyle.clientInfo}>
            {inner}
        </div>
    );
});

const RefreshButton = React.memo(() => {
    const events = useContext(EventsContext);

    return (
        <div className={cssStyle.refreshButton + " " + cssStyle.button} onClick={() => events.fire("action_refresh", { slowMode: true })}>
            <ClientIconRenderer icon={ClientIcon.Refresh} />
        </div>
    )
})

const TitleRenderer = React.memo(() => {
    const variables = useContext(VariablesContext);
    const client = variables.useReadOnly("targetClient");
    const handlerId = variables.useReadOnly("handlerId", undefined, undefined);

    if(client.status === "loaded" && client.value.status === "success" && handlerId) {
        return (
            <VariadicTranslatable text={"Server group assignments for {}"} key={"client-known"}>
                <ClientTag
                    handlerId={handlerId}
                    clientName={client.value.clientName}
                    clientUniqueId={client.value.clientUniqueId}
                    clientDatabaseId={client.value.clientDatabaseId}
                    style={"text-only"}
                />
            </VariadicTranslatable>
        );
    } else {
        return <Translatable key={"unknown"}>Server group assignments</Translatable>;
    }
});

export default class ModalServerGroups extends AbstractModal {
    private readonly events: Registry<ModalClientGroupAssignmentEvents>;
    private readonly variables: UiVariableConsumer<ModalClientGroupAssignmentVariables>;

    constructor(events: IpcRegistryDescription<ModalClientGroupAssignmentEvents>, variables: IpcVariableDescriptor<ModalClientGroupAssignmentVariables>) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
    }

    protected onDestroy() {
        super.onDestroy();

        this.events.destroy();
        this.variables.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <EventsContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <div className={cssStyle.container + " " + (this.properties.windowed ? cssStyle.windowed : "")}>
                        <div className={cssStyle.title}>
                            <ClientInfoRenderer />
                            <RefreshButton />
                        </div>
                        <GroupListRenderer />
                        <Buttons />
                    </div>
                </VariablesContext.Provider>
            </EventsContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return (
            <VariablesContext.Provider value={this.variables}>
                <TitleRenderer />
            </VariablesContext.Provider>
        )
    }
}