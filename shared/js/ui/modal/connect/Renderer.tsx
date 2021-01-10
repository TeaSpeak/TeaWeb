import {
    ConnectHistoryEntry,
    ConnectHistoryServerInfo,
    ConnectProperties,
    ConnectUiEvents, PropertyValidState
} from "tc-shared/ui/modal/connect/Definitions";
import * as React from "react";
import {useContext, useState} from "react";
import {Registry} from "tc-shared/events";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ControlledFlatInputField, ControlledSelect, FlatInputField} from "tc-shared/ui/react-elements/InputField";
import {joinClassList, useTr} from "tc-shared/ui/react-elements/Helper";
import {Button} from "tc-shared/ui/react-elements/Button";
import {kUnknownHistoryServerUniqueId} from "tc-shared/connectionlog/History";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import * as i18n from "../../../i18n/country";
import {getIconManager} from "tc-shared/file/Icons";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";

const EventContext = React.createContext<Registry<ConnectUiEvents>>(undefined);
const ConnectDefaultNewTabContext = React.createContext<boolean>(false);

const cssStyle = require("./Renderer.scss");

function useProperty<T extends keyof ConnectProperties, V>(key: T, defaultValue: V) : ConnectProperties[T] | V {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<ConnectProperties[T] | V>(() => {
        events.fire("query_property", { property: key });
        return defaultValue;
    });
    events.reactUse("notify_property", event => event.property === key && setValue(event.value as any));

    return value;
}

function usePropertyValid<T extends keyof PropertyValidState>(key: T, defaultValue: PropertyValidState[T]) : PropertyValidState[T] {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<PropertyValidState[T]>(() => {
        events.fire("query_property_valid", { property: key });
        return defaultValue;
    });
    events.reactUse("notify_property_valid", event => event.property === key && setValue(event.value as any));

    return value;
}

const InputServerAddress = () => {
    const events = useContext(EventContext);
    const address = useProperty("address", undefined);
    const valid = usePropertyValid("address", true);
    const newTab = useContext(ConnectDefaultNewTabContext);

    return (
        <ControlledFlatInputField
            value={address?.currentAddress || ""}
            placeholder={address?.defaultAddress || tr("Please enter a address")}

            className={cssStyle.inputAddress}

            label={<Translatable>Server address</Translatable>}
            labelType={"static"}

            invalid={valid ? undefined : <Translatable>Please enter a valid server address</Translatable>}

            onInput={value => events.fire("action_set_address", { address: value, validate: false })}
            onBlur={() => events.fire("action_set_address", { address: address?.currentAddress, validate: true })}
            onEnter={() => events.fire("action_connect", { newTab })}
        />
    )
}

const InputServerPassword = () => {
    const events = useContext(EventContext);
    const password = useProperty("password", undefined);

    return (
        <FlatInputField
            className={cssStyle.inputPassword}
            value={!password?.hashed ? password?.password || "" : ""}
            placeholder={password?.hashed ? tr("Password Hidden") : null}
            type={"password"}
            label={<Translatable>Server password</Translatable>}
            labelType={password?.hashed ? "static" : "floating"}
            onInput={value => events.fire("action_set_password", { password: value, hashed: false })}
        />
    )
}

const InputNickname = () => {
    const events = useContext(EventContext);
    const nickname = useProperty("nickname", undefined);
    const valid = usePropertyValid("nickname", true);

    return (
        <ControlledFlatInputField
            className={cssStyle.inputNickname}
            value={nickname?.currentNickname || ""}
            placeholder={nickname ? nickname.defaultNickname ? nickname.defaultNickname : tr("Please enter a nickname") : tr("loading...")}
            label={<Translatable>Nickname</Translatable>}
            labelType={"static"}
            invalid={valid ? undefined : <Translatable>Nickname too short or too long</Translatable>}
            onInput={value => events.fire("action_set_nickname", { nickname: value, validate: false })}
            onBlur={() => events.fire("action_set_nickname", { nickname: nickname?.currentNickname, validate: true })}
        />
    );
}

const InputProfile = () => {
    const events = useContext(EventContext);
    const profiles = useProperty("profiles", undefined);
    const selectedProfile = profiles?.profiles.find(profile => profile.id === profiles?.selected);

    let invalidMarker;
    if(profiles) {
        if(!profiles.selected) {
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
                value={selectedProfile ? selectedProfile.id : profiles?.selected ? "invalid" : profiles ? "no-selected" : "loading"}
                type={"flat"}
                label={<Translatable>Connect profile</Translatable>}
                invalid={invalidMarker}
                invalidClassName={cssStyle.invalidFeedback}
                onChange={event => events.fire("action_select_profile", { id: event.target.value })}
            >
                <option key={"no-selected"} value={"no-selected"} style={{ display: "none" }}>{useTr("please select")}</option>
                <option key={"invalid"} value={"invalid"} style={{ display: "none" }}>{useTr("unknown profile")}</option>
                <option key={"loading"} value={"loading"} style={{ display: "none" }}>{useTr("loading") + "..."}</option>
                {profiles?.profiles.map(profile => (
                    <option key={"profile-" + profile.id} value={profile.id}>{profile.name}</option>
                ))}
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
    const state = useProperty("historyShown", false);
    const events = useContext(EventContext);

    let body;
    if(state) {
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
            onClick={() => events.fire("action_toggle_history", { enabled: !state })}
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

const CountryIcon = (props: { country: string }) => {
    return (
        <div className={cssStyle.countryContainer}>
            <div className={"country flag-" + props.country} />
            {i18n.country_name(props.country, useTr("Global"))}
        </div>
    )
}

const HistoryTableEntryConnectCount = React.memo((props: { entry: ConnectHistoryEntry }) => {
    const targetType = props.entry.uniqueServerId === kUnknownHistoryServerUniqueId ? "address" : "server-unique-id";
    const target = targetType === "address" ? props.entry.targetAddress : props.entry.uniqueServerId;

    const events = useContext(EventContext);
    const [ amount, setAmount ] = useState(() => {
        events.fire("query_history_connections", {
            target,
            targetType
        });
        return -1;
    });

    events.reactUse("notify_history_connections", event => event.targetType === targetType && event.target === target && setAmount(event.value));

    if(amount >= 0) {
        return <React.Fragment key={"set"}>{amount}</React.Fragment>;
    } else {
        return null;
    }
});

const HistoryTableEntry = React.memo((props: { entry: ConnectHistoryEntry, selected: boolean }) => {
    const connectNewTab = useContext(ConnectDefaultNewTabContext);
    const events = useContext(EventContext);
    const [ info, setInfo ] = useState<ConnectHistoryServerInfo>(() => {
        if(props.entry.uniqueServerId !== kUnknownHistoryServerUniqueId) {
            events.fire("query_history_entry", { serverUniqueId: props.entry.uniqueServerId });
        }
        return undefined;
    });
    events.reactUse("notify_history_entry", event => event.serverUniqueId === props.entry.uniqueServerId && setInfo(event.info));

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
    const history = useProperty("history", undefined);
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
                    <Translatable>Name</Translatable>
                </div>
                <div className={cssStyle.column + " " + cssStyle.address}>
                    <Translatable>Address</Translatable>
                </div>
                <div className={cssStyle.column + " " + cssStyle.password}>
                    <Translatable>Password</Translatable>
                </div>
                <div className={cssStyle.column + " " + cssStyle.country}>
                    <Translatable>Country</Translatable>
                </div>
                <div className={cssStyle.column + " " + cssStyle.clients}>
                    <Translatable>Clients</Translatable>
                </div>
                <div className={cssStyle.column + " " + cssStyle.connections}>
                    <Translatable>Connections</Translatable>
                </div>
            </div>
            <div className={cssStyle.body}>
                {body}
            </div>
        </div>
    )
}

const HistoryContainer = () => {
    const historyShown = useProperty("historyShown", false);

    return (
        <div className={joinClassList(cssStyle.historyContainer, historyShown && cssStyle.shown)}>
            <HistoryTable />
        </div>
    )
}

export class ConnectModal extends InternalModal {
    private readonly events: Registry<ConnectUiEvents>;
    private readonly connectNewTabByDefault: boolean;

    constructor(events: Registry<ConnectUiEvents>, connectNewTabByDefault: boolean) {
        super();

        this.events = events;
        this.connectNewTabByDefault = connectNewTabByDefault;
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <ConnectDefaultNewTabContext.Provider value={this.connectNewTabByDefault}>
                    <div className={cssStyle.container}>
                        <ConnectContainer />
                        <ButtonContainer />
                        <HistoryContainer />
                    </div>
                </ConnectDefaultNewTabContext.Provider>
            </EventContext.Provider>
        );
    }

    title(): string | React.ReactElement {
        return <Translatable>Connect to a server</Translatable>;
    }

    color(): "none" | "blue" {
        return "blue";
    }

    verticalAlignment(): "top" | "center" | "bottom" {
        return "top";
    }
}