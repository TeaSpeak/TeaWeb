import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {AbstractModal} from "tc-shared/ui/react-elements/modal/Definitions";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {IpcRegistryDescription, Registry} from "tc-events";
import {InviteUiEvents, InviteUiVariables} from "tc-shared/ui/modal/invite/Definitions";
import {UiVariableConsumer} from "tc-shared/ui/utils/Variable";
import {Button} from "tc-shared/ui/react-elements/Button";
import {createIpcUiVariableConsumer, IpcVariableDescriptor} from "tc-shared/ui/utils/IpcVariable";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {copyToClipboard} from "tc-shared/utils/helpers";
import {ControlledBoxedInputField, ControlledSelect} from "tc-shared/ui/react-elements/InputField";
import {useTr} from "tc-shared/ui/react-elements/Helper";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import moment from 'moment';

const cssStyle = require("./Renderer.scss");

const EventsContext = React.createContext<Registry<InviteUiEvents>>(undefined);
const VariablesContext = React.createContext<UiVariableConsumer<InviteUiVariables>>(undefined);

const OptionChannel = React.memo(() => {
    const variables = useContext(VariablesContext);
    const availableChannels = variables.useReadOnly("availableChannels", undefined, []);
    const selectedChannel = variables.useVariable("selectedChannel", undefined, 0);

    return (
        <div className={cssStyle.option}>
            <div className={cssStyle.optionTitle}>
                <Translatable>Automatically join channel</Translatable>
            </div>
            <div className={cssStyle.optionValue}>
                <ControlledSelect
                    value={selectedChannel.localValue.toString()}
                    type={"boxed"}
                    className={cssStyle.optionsChannel}
                    onChange={event => {
                        const value = parseInt(event.target.value);
                        if(isNaN(value)) {
                            return;
                        }

                        selectedChannel.setValue(value);
                    }}
                >
                    <option key={"no-channel"} value={"0"}>{useTr("No specific channel")}</option>
                    <option key={"server-channels"} disabled>{useTr("Available channels:")}</option>
                    {availableChannels.map(channel => (
                        <option key={"channel-" + channel.channelId} value={channel.channelId + ""}>{channel.channelName}</option>
                    )) as any}
                </ControlledSelect>
            </div>
        </div>
    );
});

const OptionChannelPassword = React.memo(() => {
    const variables = useContext(VariablesContext);
    const selectedChannel = variables.useReadOnly("selectedChannel", undefined, 0);
    const channelPassword = variables.useVariable("channelPassword", undefined, { raw: undefined, hashed: undefined });

    let body;
    if(selectedChannel === 0) {
        body = (
            <ControlledBoxedInputField className={cssStyle.optionChannelPassword} value={""} key={"no-password"} placeholder={tr("No channel selected")} editable={false} onChange={() => {}} />
        );
    } else if(channelPassword.localValue.hashed && !channelPassword.localValue.raw) {
        body = (
            <ControlledBoxedInputField
                className={cssStyle.optionChannelPassword}
                value={""}
                placeholder={tr("Using cached password")}
                editable={true}
                onChange={newValue => channelPassword.setValue({ hashed: channelPassword.localValue.hashed, raw: newValue }, true)}
            />
        );
    } else {
        body = (
            <ControlledBoxedInputField
                className={cssStyle.optionChannelPassword}
                value={channelPassword.localValue.raw}
                placeholder={tr("Don't use a password")}
                editable={true}
                onChange={newValue => channelPassword.setValue({ hashed: channelPassword.localValue.hashed, raw: newValue }, true)}
                onBlur={() => channelPassword.setValue(channelPassword.localValue, false)}
                finishOnEnter={true}
            />
        );
    }

    return (
        <div className={cssStyle.option}>
            <div className={cssStyle.optionTitle}><Translatable>Channel password</Translatable></div>
            <div className={cssStyle.optionValue}>
                {body}
            </div>
        </div>
    );
})

const OptionGeneralShortLink = React.memo(() => {
    const variables = useContext(VariablesContext);
    const showShortUrl = variables.useVariable("shortLink", undefined, true);

    return (
        <div className={cssStyle.option}>
            <Checkbox
                onChange={newValue => showShortUrl.setValue(newValue)}
                value={showShortUrl.localValue}
                label={<Translatable>Use short URL</Translatable>}
            />
        </div>
    )
})

const OptionGeneralShowAdvanced = React.memo(() => {
    const variables = useContext(VariablesContext);
    const showShortUrl = variables.useVariable("advancedSettings", undefined, false);

    return (
        <div className={cssStyle.option}>
            <Checkbox
                onChange={newValue => showShortUrl.setValue(newValue)}
                value={showShortUrl.localValue}
                label={<Translatable>Advanced settings</Translatable>}
            />
        </div>
    )
})

const OptionAdvancedToken = React.memo(() => {
    const variables = useContext(VariablesContext);
    const currentToken = variables.useVariable("token", undefined, "");

    return (
        <div className={cssStyle.option}>
            <div className={cssStyle.optionTitle}><Translatable>Token</Translatable></div>
            <div className={cssStyle.optionValue}>
                <ControlledBoxedInputField
                    className={cssStyle.optionChannelPassword}
                    value={currentToken.localValue}
                    placeholder={tr("Don't use a token")}
                    editable={true}
                    onChange={newValue => currentToken.setValue(newValue, true)}
                    onBlur={() => currentToken.setValue(currentToken.localValue, false)}
                    finishOnEnter={true}
                />
            </div>
        </div>
    );
});

const OptionAdvancedWebUrlBase = React.memo(() => {
    const variables = useContext(VariablesContext);
    const currentUrl = variables.useVariable("webClientUrlBase", undefined, { override: undefined, fallback: undefined });

    return (
        <div className={cssStyle.option}>
            <div className={cssStyle.optionTitle}><Translatable>WebClient URL</Translatable></div>
            <div className={cssStyle.optionValue}>
                <ControlledBoxedInputField
                    className={cssStyle.optionChannelPassword}
                    value={currentUrl.localValue.override || ""}
                    placeholder={currentUrl.localValue.fallback || tr("loading...")}
                    editable={true}
                    onChange={newValue => currentUrl.setValue({ fallback: currentUrl.localValue.fallback, override: newValue }, true)}
                    onBlur={() => currentUrl.setValue(currentUrl.localValue, false)}
                    finishOnEnter={true}
                />
            </div>
        </div>
    );
});

type ExpirePreset = {
    name: () => string,
    seconds: number
};

const ExpirePresets: ExpirePreset[] = [
    { name: () => tr("5 Minutes"), seconds: 5 * 60 },
    { name: () => tr("1 hour"), seconds: 60 * 60 },
    { name: () => tr("24 hours"), seconds: 24 * 60 * 60 },
    { name: () => tr("1 Week"), seconds: 7 * 24 * 60 * 60 },
    { name: () => tr("1 Month"), seconds: 31 * 24 * 60 * 60 },
]

const OptionAdvancedExpires = React.memo(() => {
    const variables = useContext(VariablesContext);
    const expiresAfter = variables.useVariable("expiresAfter", undefined, 0);

    let presetSelected = -2;
    if(expiresAfter.localValue === 0) {
        presetSelected = -1;
    } else {
        const difference = expiresAfter.localValue - Date.now() / 1000;
        if(difference > 0) {
            for(let index = 0; index < ExpirePresets.length; index++) {
                if(Math.abs(difference - ExpirePresets[index].seconds) <= 60 * 60) {
                    presetSelected = index;
                    break;
                }
            }
        }
    }

    return (
        <div className={cssStyle.option}>
            <div className={cssStyle.optionTitle}><Translatable>Link expire time</Translatable></div>
            <div className={cssStyle.optionValue}>
                <ControlledSelect
                    type={"boxed"}
                    value={presetSelected + ""}
                    onChange={event => {
                        const value = parseInt(event.target.value);
                        if(isNaN(value)) {
                            return;
                        }

                        if(value === -1) {
                            expiresAfter.setValue(0);
                        } else if(value >= 0) {
                            expiresAfter.setValue(Math.floor(Date.now() / 1000 + ExpirePresets[value].seconds));
                        }
                    }}
                >
                    <option key={"unknown"} value={"-2"} style={{ display: "none" }}>{useTr("Unknown")}</option>
                    <option key={"never"} value={"-1"}>{useTr("never")}</option>
                    {
                        ExpirePresets.map((preset, index) => (
                            <option key={"p-" + index} value={index.toString()}>{preset.name()}</option>
                        )) as any
                    }
                </ControlledSelect>
            </div>
        </div>
    );
});

const OptionsAdvanced = React.memo(() => {
    return (
        <div className={cssStyle.containerOptionsAdvanced}>
            <div className={cssStyle.title}><Translatable>Advanced options</Translatable></div>
            <OptionAdvancedToken />
            <OptionAdvancedWebUrlBase />
            <OptionAdvancedExpires />
        </div>
    )
});

const Options = React.memo(() => {
    const variables = useContext(VariablesContext);
    const showAdvanced = variables.useReadOnly("advancedSettings", undefined, false);

    return (
        <div className={cssStyle.containerOptions}>
            <div className={cssStyle.generalOptions}>
                <div className={cssStyle.general}>
                    <div className={cssStyle.title}><Translatable>General</Translatable></div>
                    <OptionGeneralShortLink />
                    <OptionGeneralShowAdvanced />
                </div>
                <div className={cssStyle.channel}>
                    <div className={cssStyle.title}><Translatable>Channel</Translatable></div>
                    <OptionChannel />
                    <OptionChannelPassword />
                </div>
            </div>
            {showAdvanced ? <OptionsAdvanced key={"advanced"} /> : undefined}
        </div>
    );
});

const ButtonCopy = React.memo((props: { onCopy: () => void, disabled: boolean }) => {
    const [ showTimeout, setShowTimeout ] = useState(0);

    const now = Date.now();
    useEffect(() => {
        if(now >= showTimeout) {
            return;
        }

        const timeout = setTimeout(() => setShowTimeout(0), showTimeout - now);
        return () => clearTimeout(timeout);
    });

    return (
        <div className={cssStyle.containerCopy}>
            <div className={cssStyle.button} onClick={() => {
                if(props.disabled) {
                    return;
                }

                props.onCopy();
                setShowTimeout(Date.now() + 1750);
            }}>
                <ClientIconRenderer icon={ClientIcon.CopyUrl} />
            </div>
            <div className={cssStyle.copied + " " + (now < showTimeout ? cssStyle.shown : "")}>
                <a>Copied!</a>
            </div>
        </div>
    );
});

const LinkExpire = (props: { date: number | 0 | -1 }) => {
    let value;
    if(props.date === -1) {
        value = <React.Fragment key={"unset"}>&nbsp;</React.Fragment>;
    } else if(props.date === 0) {
        value = <React.Fragment key={"never"}><Translatable>Link expires never</Translatable></React.Fragment>;
    } else {
        value = <React.Fragment key={"never"}><Translatable>Link expires at</Translatable> {moment(props.date * 1000).format('LLLL')}</React.Fragment>;
    }

    return (
        <div className={cssStyle.linkExpire}>{value}</div>
    );
}

const Link = React.memo(() => {
    const variables = useContext(VariablesContext);
    const shortLink = variables.useReadOnly("shortLink", undefined, true);
    const link = variables.useReadOnly("generatedLink", undefined, { status: "generating" });

    let className, value, copyValue;
    switch (link.status) {
        case "generating":
            className = cssStyle.generating;
            value = <React.Fragment key={"loading"}><Translatable>Generating link</Translatable> <LoadingDots /></React.Fragment>;
            break;

        case "error":
            className = cssStyle.errored;
            copyValue = link.message;
            value = link.message;
            break;

        case "success":
            className = cssStyle.success;
            copyValue = shortLink ? link.shortUrl : link.longUrl;
            value = copyValue;
            break;
    }

    return (
        <div className={cssStyle.containerLink}>
            <div className={cssStyle.title}><Translatable>Link</Translatable></div>
            <div className={cssStyle.output + " " + className}>
                <a>{value}</a>
                <ButtonCopy disabled={link.status === "generating"} onCopy={() => {
                    if(copyValue) {
                        copyToClipboard(copyValue);
                    }
                }} />
            </div>
            <LinkExpire date={link.status === "success" ? link.expireDate : -1} />
        </div>
    );
});

const Buttons = () => {
    const events = useContext(EventsContext);

    return (
        <div className={cssStyle.containerButtons}>
            <Button type={"small"} color={"green"} onClick={() => events.fire("action_close")}>
                <Translatable>Close</Translatable>
            </Button>
        </div>
    )
}

class ModalInvite extends AbstractModal {
    private readonly events: Registry<InviteUiEvents>;
    private readonly variables: UiVariableConsumer<InviteUiVariables>;
    private readonly serverName: string;

    constructor(events: IpcRegistryDescription<InviteUiEvents>, variables: IpcVariableDescriptor<InviteUiVariables>, serverName: string) {
        super();

        this.events = Registry.fromIpcDescription(events);
        this.variables = createIpcUiVariableConsumer(variables);
        this.serverName = serverName;
    }

    renderBody(): React.ReactElement {
        return (
            <EventsContext.Provider value={this.events}>
                <VariablesContext.Provider value={this.variables}>
                    <div className={cssStyle.container}>
                        <Options />
                        <Link />
                        <Buttons />
                    </div>
                </VariablesContext.Provider>
            </EventsContext.Provider>
        );
    }

    renderTitle(): string | React.ReactElement {
        return <><Translatable>Invite People to</Translatable> {this.serverName}</>;
    }
}
export = ModalInvite;