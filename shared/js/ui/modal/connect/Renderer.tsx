import {
    ConnectHistoryEntry,
    ConnectUiEvents, ConnectUiVariables, kUnknownHistoryServerUniqueId,
} from "tc-shared/ui/modal/connect/Definitions";
import * as React from "react";
import {useContext} from "react";
import {IpcRegistryDescription, Registry} from "tc-shared/events";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
import {ControlledFlatInputField, ControlledSelect, FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import * as i18n from "../../../i18n/country";
import {getIconManager} from "tc-shared/file/Icons";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {AbstractModal} from "tc-shared/ui/react-elements/ModalDefinitions";
import {CountryIcon} from "tc-shared/ui/react-elements/CountryIcon";

const EventContext = React.createContext<Registry<ConnectUiEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<ConnectUiVariables>>(undefined);

const ConnectDefaultNewTabContext = React.createContext<boolean>(false);

const cssStyle = require("./Renderer.scss");

const InputServerAddress = React.memo(() => {
    const events = useContext(EventContext);
    const newTab = useContext(ConnectDefaultNewTabContext);

    const variables = useContext(VariablesContext);
    const address = variables.useVariable("server_address");
    const addressValid = variables.useReadOnly("server_address_valid", undefined, true) || address.localValue !== address.remoteValue;

    return (
        <ControlledFlatInputField
            value={address.localValue?.currentAddress || ""}
            placeholder={address.remoteValue?.defaultAddress || tr("Please enter a address")}

            className={cssStyle.inputAddress}

            label={<Translatable>Server address</Translatable>}
            labelType={"static"}

            invalid={addressValid ? undefined : <Translatable>Please enter a valid server address</Translatable>}
            editable={address.status === "loaded"}

            onInput={value => address.setValue({ currentAddress: value }, true)}
            onBlur={() => address.setValue({ currentAddress: address.localValue?.currentAddress })}
            onEnter={() => {
                /* Setting the address just to ensure */
                address.setValue({ currentAddress: address.localValue?.currentAddress });
                events.fire("action_connect", { newTab });
            }}
        />
    )
});

const InputServerPassword = () => {
    const variables = useContext(VariablesContext);
    const password = variables.useVariable("password");

    return (
        <FlatInputField
            className={cssStyle.inputPassword}
            value={!password.localValue?.hashed ? password.localValue?.password || "" : ""}
            placeholder={password.localValue?.hashed ? tr("Password Hidden") : null}
            type={"password"}
            label={<Translatable>Server password</Translatable>}
            labelType={password.localValue?.hashed ? "static" : "floating"}
            onInput={value => password.setValue({ password: value, hashed: false }, true)}
            onBlur={() => password.setValue(password.localValue)}
        />
    )
}

const InputNickname = () => {
    const variables = useContext(VariablesContext);

    const nickname = variables.useVariable("nickname");
    const validState = variables.useReadOnly("nickname_valid", undefined, true) || nickname.localValue !== nickname.remoteValue;

    return (
        <ControlledFlatInputField
            className={cssStyle.inputNickname}
            value={nickname.localValue?.currentNickname || ""}
            placeholder={nickname.remoteValue ? nickname.remoteValue.defaultNickname ? nickname.remoteValue.defaultNickname : tr("Please enter a nickname") : tr("loading...")}
            label={<Translatable>Nickname</Translatable>}
            labelType={"static"}
            invalid={validState ? undefined : <Translatable>Nickname too short or too long</Translatable>}
            onInput={value => nickname.setValue({ currentNickname: value }, true)}
            onBlur={() => nickname.setValue({ currentNickname: nickname.localValue?.currentNickname })}
        />
    );
}

const InputProfile = () => {
    const events = useContext(EventContext);
    const variables = useContext(VariablesContext);
    const profiles = variables.useVariable("profiles");
    const selectedProfile = profiles.remoteValue?.profiles.find(profile => profile.id === profiles.remoteValue?.selected);

    let invalidMarker;
    if(profiles) {
        if(!profiles.remoteValue?.selected) {
            /* We have to select a profile. */
            /* TODO: Only show if we've tried to press connect */
            //invalidMarker = <Translatable key={"no-profile"}>Please select a profile</Translatable>;
        } else if(!selectedProfile) {
            invalidMarker = <Translatable key={"no-profile"}>Unknown select profile</Translatable>;
        } else if(!selectedProfile.valid) {
            invalidMarker = <Translatable key={"invalid"}>Selected profile has an invalid config</Translatable>
        }
    }

    return (
        <div className={cssStyle.inputProfile}>
            <ControlledSelect
                className={cssStyle.input}
                value={selectedProfile ? selectedProfile.id : profiles.remoteValue?.selected ? "invalid" : profiles ? "no-selected" : "loading"}
                type={"flat"}
                label={<Translatable>Connect profile</Translatable>}
                invalid={invalidMarker}
                invalidClassName={cssStyle.invalidFeedback}
                onChange={event => profiles.setValue({ selected: event.target.value })}
            >
                <option value={"no-selected"} style={{ display: "none" }}>{useTr("please select")}</option>
                <option value={"invalid"} style={{ display: "none" }}>{useTr("unknown profile")}</option>
                <option value={"loading"} style={{ display: "none" }}>{useTr("loading") + "..."}</option>
                <React.Fragment>
                    {
                        profiles.remoteValue?.profiles.map(profile => (
                            <option key={"profile-" + profile.id} value={profile.id}>{profile.name}</option>
                        ))
                    }
                </React.Fragment>
            </ControlledSelect>
            <Button className={cssStyle.button} type={"small"} color={"none"} onClick={() => events.fire("action_manage_profiles")}>
                <Translatable>Profiles</Translatable>
            </Button>
        </div>
    );
}

const ConnectContainer = () => (
    <div className={cssStyle.connectContainer}>
        <div className={cssStyle.row}>
            {/* <InputServerAddress /> */}
            <InputServerAddress />
            <InputServerPassword />
        </div>
        <div className={cssStyle.row + " " + cssStyle.smallColumn}>
            <InputNickname />
            <InputProfile />
        </div>
    </div>
);

const ButtonToggleHistory = () => {
    const variables = useContext(VariablesContext);
    const historyShown = variables.useVariable("historyShown");

    let body;
    if(historyShown.localValue) {
        body = (
            <React.Fragment key={"hide"}>
                <div className={cssStyle.containerText}><Translatable>Hide connect history</Translatable></div>
                <div className={cssStyle.containerArrow}><div className={"arrow down"} /></div>
            </React.Fragment>
        );
    } else {
        body = (
            <React.Fragment key={"show"}>
                <div className={cssStyle.containerText}><Translatable>Show connect history</Translatable></div>
                <div className={cssStyle.containerArrow}><div className={"arrow up"} /></div>
            </React.Fragment>
        );
    }
    return (
        <Button
            className={cssStyle.buttonShowHistory + " " + cssStyle.button}
            type={"small"}
            color={"none"}
            onClick={() => historyShown.setValue(!historyShown.localValue)}
        >
            {body}
        </Button>
    );
}

const ButtonsConnect = () => {
    const connectNewTab = useContext(ConnectDefaultNewTabContext);
    const events = useContext(EventContext);

    let left;
    if(connectNewTab) {
        left = (
            <Button
                color={"green"}
                type={"small"}
                key={"same-tab"}
                onClick={() => events.fire("action_connect", { newTab: false })}
                className={cssStyle.button}
            >
                <Translatable>Connect in the same tab</Translatable>
            </Button>
        );
    } else {
        left = (
            <Button
                color={"green"}
                type={"small"}
                key={"new-tab"}
                onClick={() => events.fire("action_connect", { newTab: true })}
                className={cssStyle.button}
            >
                <Translatable>Connect in a new tab</Translatable>
            </Button>
        );
    }
    return (
        <div className={cssStyle.buttonsConnect}>
            {left}
            <Button
                color={"green"}
                type={"small"}
                onClick={() => events.fire("action_connect", { newTab: connectNewTab })}
                className={cssStyle.button}
            >
                <Translatable>Connect</Translatable>
            </Button>
        </div>
    );
};

const ButtonContainer = () => (
    <div className={cssStyle.buttonContainer}>
        <ButtonToggleHistory />
        <ButtonsConnect />
    </div>
);

const HistoryTableEntryConnectCount = React.memo((props: { entry: ConnectHistoryEntry }) => {
    const targetType = props.entry.uniqueServerId === kUnknownHistoryServerUniqueId ? "address" : "server-unique-id";
    const target = targetType === "address" ? props.entry.targetAddress : props.entry.uniqueServerId;

    const value = useContext(VariablesContext).useReadOnly("history_connections", {
        target,
        targetType
    }, -1);

    if(value >= 0) {
        return <React.Fragment key={"set"}>{value}</React.Fragment>;
    } else {
        return null;
    }
});

const HistoryTableEntry = React.memo((props: { entry: ConnectHistoryEntry, selected: boolean }) => {
    const events = useContext(EventContext);
    const connectNewTab = useContext(ConnectDefaultNewTabContext);
    const variables = useContext(VariablesContext);

    const info = variables.useReadOnly("history_entry", { serverUniqueId: props.entry.uniqueServerId }, undefined);
    const icon = getIconManager().resolveIcon(info ? info.icon.iconId : 0, info?.icon.serverUniqueId, info?.icon.handlerId);

    return (
        <div className={cssStyle.row + " " + (props.selected ? cssStyle.selected : "")}
             onClick={event => {
                if(event.isDefaultPrevented()) {
                    return;
                }

                events.fire("action_select_history", { id: props.entry.id });
            }}
             onDoubleClick={() => events.fire("action_connect", { newTab: connectNewTab })}
        >
            <div className={cssStyle.column + " " + cssStyle.delete} onClick={event => {
                event.preventDefault();

                if(props.entry.uniqueServerId === kUnknownHistoryServerUniqueId) {
                    events.fire("action_delete_history", {
                        targetType: "address",
                        target: props.entry.targetAddress
                    });
                } else {
                    events.fire("action_delete_history", {
                        targetType: "server-unique-id",
                        target: props.entry.uniqueServerId
                    });
                }
            }}>
                <ClientIconRenderer icon={ClientIcon.Delete} />
            </div>
            <div className={cssStyle.column + " " + cssStyle.name}>
                <RemoteIconRenderer icon={icon} className={cssStyle.iconContainer} />
                {info?.name}
            </div>
            <div className={cssStyle.column + " " + cssStyle.address}>
                {props.entry.targetAddress}
            </div>
            <div className={cssStyle.column + " " + cssStyle.password}>
                {info ? info.password ? tr("Yes") : tr("No") : ""}
            </div>
            <div className={cssStyle.column + " " + cssStyle.country}>
                {info ? <CountryIcon country={info.country || "xx"} key={"country"} /> : null}
            </div>
            <div className={cssStyle.column + " " + cssStyle.clients}>
                {info && info.maxClients !== -1 ? `${info.clients}/${info.maxClients}` : ""}
            </div>
            <div className={cssStyle.column + " " + cssStyle.connections}>
                <HistoryTableEntryConnectCount entry={props.entry} />
            </div>
        </div>
    );
});

const HistoryTable = () => {
    const history = useContext(VariablesContext).useReadOnly("history", undefined, undefined);

    let body;
    if(history) {
        if(history.history.length > 0) {
            body = history.history.map(entry => <HistoryTableEntry entry={entry} key={"entry-" + entry.id} selected={entry.id === history.selected} />);
        } else {
            body = (
                <div className={cssStyle.bodyEmpty} key={"no-history"}>
                    <a><Translatable>No connections yet made</Translatable></a>
                </div>
            );
        }
    } else {
        return null;
    }
    return (
        <div className={cssStyle.historyTable}>
            <div className={cssStyle.head}>
                <div className={cssStyle.column + " " + cssStyle.delete} />
                <div className={cssStyle.column + " " + cssStyle.name}>
                    <a title={useTr("Name")}><Translatable>Name</Translatable></a>
                </div>
                <div className={cssStyle.column + " " + cssStyle.address}>
                    <a title={useTr("Address")}><Translatable>Address</Translatable></a>
                </div>
                <div className={cssStyle.column + " " + cssStyle.password}>
                    <a title={useTr("Password")}><Translatable>Password</Translatable></a>
                </div>
                <div className={cssStyle.column + " " + cssStyle.country}>
                    <a title={useTr("Country")}><Translatable>Country</Translatable></a>
                </div>
                <div className={cssStyle.column + " " + cssStyle.clients}>
                    <a title={useTr("Clients")}><Translatable>Clients</Translatable></a>
                </div>
                <div className={cssStyle.column + " " + cssStyle.connections}>
                    <a title={useTr("Connections")}><Translatable>Connections</Translatable></a>
                </div>
            </div>
            <div className={cssStyle.body}>
                {body}
            </div>
        </div>
    )
}

const HistoryContainer = () => {
    const variables = useContext(VariablesContext);
    const historyShown = variables.useReadOnly("historyShown", undefined, false);

    return (
        <div className={joinClassList(cssStyle.historyContainer, historyShown && cssStyle.shown)}>
            <HistoryTable />
        </div>
    )
}

class ConnectModal extends AbstractModal {
    private readonly events: Registry<ConnectUiEvents>;
    private readonly variables: UiVariableConsumer<ConnectUiVariables>;
    private readonly connectNewTabByDefault: boolean;

    constructor(events: IpcRegistryDescription<ConnectUiEvents>, variables: IpcVariableDescriptor<ConnectUiVariables>, connectNewTabByDefault: boolean) {
        super();

        this.variables = createIpcUiVariableConsumer(variables);
        this.events = Registry.fromIpcDescription(events);
        this.connectNewTabByDefault = connectNewTabByDefault;
    }

    protected onDestroy() {
        super.onDestroy();

        this.variables.destroy();
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <ConnectDefaultNewTabContext.Provider value={this.connectNewTabByDefault}>
                        <div className={cssStyle.container}>
                            <ConnectContainer />
                            <ButtonContainer />
                            <HistoryContainer />
                        </div>
                    </ConnectDefaultNewTabContext.Provider>
                </VariablesContext.Provider>
            </EventContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <Translatable>Connect to a server</Translatable>;
    }

    color(): "none" | "blue" {
        return "blue";
    }

    verticalAlignment(): "top" | "center" | "bottom" {
        return "top";
    }
}
export = ConnectModal;