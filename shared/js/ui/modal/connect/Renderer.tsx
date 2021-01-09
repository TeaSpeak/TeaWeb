import {ConnectProperties, ConnectUiEvents} from "tc-shared/ui/modal/connect/Definitions";
import {useContext, useState} from "react";
import {Registry} from "tc-shared/events";
import * as React from "react";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {ControlledSelect, FlatInputField, Select} from "tc-shared/ui/react-elements/InputField";
import {useTr} from "tc-shared/ui/react-elements/Helper";
import {Button} from "tc-shared/ui/react-elements/Button";

const EventContext = React.createContext<Registry<ConnectUiEvents>>(undefined);
const ConnectDefaultNewTabContext = React.createContext<boolean>(false);

const cssStyle = require("./Renderer.scss");

/*
<div class="container-connect-input">
    <div class="row container-address-password">
        <div class="form-group container-address">
            <label>{{tr "Server Address" /}}</label>
            <input type="text" class="form-control" aria-describedby="input-connect-address-help"
                   placeholder="ts.teaspeak.de" autocomplete="off">
            <div class="invalid-feedback">{{tr "Please enter a valid server address" /}}</div>
        </div>
        <div class="form-group container-password">
            <label class="bmd-label-floating">{{tr "Server password" /}}</label>
            <form autocomplete="off" onsubmit="return false;">
                <input id="input-connect-password-{{>password_id}}" type="password" class="form-control"
                       autocomplete="off">
            </form>
        </div>
    </div>
    <div class="row container-profile-name">
        <div class="form-group container-nickname">
            <label>{{tr "Nickname" /}}</label>
            <input type="text" class="form-control" aria-describedby="input-connect-nickname-help"
                   placeholder="Another TeaSpeak user">
            <div class="invalid-feedback">{{tr "Please enter a valid server nickname" /}}</div>
            <!-- <small id="input-connect-nickname-help" class="form-text text-muted">We'll never share your email with anyone else.</small> -->
        </div>
        <div class="container-profile-manage">
            <div class="form-group container-select-profile">
                <label for="select-connect-profile">{{tr "Connect Profile" /}}</label>
                <select class="form-control" id="select-connect-profile"> </select>
                <div class="invalid-feedback">{{tr "Selected profile is invalid. Select another one or fix the profile." /}}
                </div>
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-raised button-manage-profiles">{{tr "Profiles" /}}
                </button>
            </div>
        </div>
    </div>
    <div class="container-buttons">
        <button type="button" class="btn btn-raised button-toggle-last-servers"><a>{{tr "Show last servers"
            /}}</a>
            <div class="arrow down"></div>
        </button>

        <div class="container-buttons-connect">
            {{if default_connect_new_tab}}
            <button type="button" class="btn btn-raised btn-success button-connect button-left">{{tr
                "Connect in same tab" /}}
            </button>
            <button type="button" class="btn btn-raised btn-success button-connect-new-tab button-right">
                {{tr "Connect" /}}
            </button>
            {{else}}
            {{if multi_tab}}
            <button type="button" class="btn btn-raised btn-success button-connect-new-tab button-left">{{tr
                "Connect in a new tab" /}}
            </button>
            {{/if}}
            <button type="button" class="btn btn-raised btn-success button-connect button-right">{{tr
                "Connect" /}}
            </button>
            {{/if}}
        </div>
    </div>
</div>
<div class="container-last-servers">
    <hr>
    <div class="table">
        <div class="head">
            <div class="column delete">Nr</div>
            <div class="column name">{{tr "Name" /}}</div>
            <div class="column address">{{tr "Address" /}}</div>
            <div class="column password">{{tr "Password" /}}</div>
            <div class="column country-name">{{tr "Country" /}}</div>
            <div class="column clients">{{tr "Clients" /}}</div>
            <div class="column connections">{{tr "Connections" /}}</div>
        </div>
        <div class="body">
            <div class="body-empty">
                <a>{{tr "No connections yet made" /}}</a>
            </div>
        </div>
    </div>
</div>
 */

function useProperty<T extends keyof ConnectProperties, V>(key: T, defaultValue: V) : ConnectProperties[T] | V {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<ConnectProperties[T] | V>(() => {
        events.fire("query_property", { property: key });
        return defaultValue;
    });
    events.reactUse("notify_property", event => event.property === key && setValue(event.value as any));

    return value;
}

const InputServerAddress = () => {
    return (
        <FlatInputField
            className={cssStyle.inputAddress}
            value={"ts.teaspeak.de"}
            placeholder={"ts.teaspeak.de"}
            label={<Translatable>Server address</Translatable>}
            labelType={"static"}
        />
    )
}

const InputServerPassword = () => {
    return (
        <FlatInputField
            className={cssStyle.inputPassword}
            value={"ts.teaspeak.de"}
            placeholder={"ts.teaspeak.de"}
            type={"password"}
            label={<Translatable>Server password</Translatable>}
            labelType={"floating"}
        />
    )
}

const InputNickname = () => {
    const nickname = useProperty("nickname", undefined);

    return (
        <FlatInputField
            className={cssStyle.inputNickname}
            value={nickname?.currentNickname || ""}
            placeholder={nickname ? nickname.defaultNickname : tr("loading...")}
            label={<Translatable>Nickname</Translatable>}
            labelType={"static"}
        />
    );
}

const InputProfile = () => {
    const profiles = useProperty("profiles", undefined);
    const selectedProfile = profiles?.profiles.find(profile => profile.id === profiles?.selected);

    let invalidMarker;
    if(profiles) {
        if(!selectedProfile) {
            invalidMarker = <Translatable key={"no-profile"}>Select a profile</Translatable>;
        } else if(!selectedProfile.valid) {
            invalidMarker = <Translatable key={"invalid"}>Selected profile is invalid</Translatable>
        }
    }

    return (
        <div className={cssStyle.inputProfile}>
            <ControlledSelect
                className={cssStyle.input}
                value={profiles?.selected || "loading"}
                type={"flat"}
                label={<Translatable>Connect profile</Translatable>}
                invalid={invalidMarker}
            >
                <option key={"loading"} value={"invalid"} style={{ display: "none" }}>{useTr("unknown profile")}</option>
                <option key={"loading"} value={"loading"} style={{ display: "none" }}>{useTr("loading") + "..."}</option>
                {profiles?.profiles.forEach(profile => {
                    return (
                        <option key={"profile-" + profile.id}>{profile.name}</option>
                    );
                })}
            </ControlledSelect>
            <Button className={cssStyle.button} type={"small"} color={"none"}>
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
        <div className={cssStyle.row}>
            <InputNickname />
            <InputProfile />
        </div>
    </div>
)

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
}