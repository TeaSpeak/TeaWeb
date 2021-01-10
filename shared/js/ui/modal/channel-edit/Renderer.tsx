import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {Registry} from "tc-shared/events";
import {
    ChannelEditablePermissions,
    ChannelEditablePermissionValue,
    ChannelEditableProperty,
    ChannelEditEvents,
    ChannelEditPermissionsState,
    ChannelPropertyPermission
} from "tc-shared/ui/modal/channel-edit/Definitions";
import {BoxedInputField, Select} from "tc-shared/ui/react-elements/InputField";
import {Switch} from "tc-shared/ui/react-elements/Switch";
import {Button} from "tc-shared/ui/react-elements/Button";
import {Tab, TabEntry} from "tc-shared/ui/react-elements/Tab";
import {Settings, settings} from "tc-shared/settings";
import {useTr} from "tc-shared/ui/react-elements/Helper";
import {IconTooltip} from "tc-shared/ui/react-elements/Tooltip";
import {RadioButton} from "tc-shared/ui/react-elements/RadioButton";
import {Slider} from "tc-shared/ui/react-elements/Slider";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {RemoteIconRenderer} from "tc-shared/ui/react-elements/Icon";
import {getIconManager} from "tc-shared/file/Icons";

const cssStyle = require("./Renderer.scss");

const ModalTypeContext = React.createContext<"channel-edit" | "channel-create">("channel-edit");
const EventContext = React.createContext<Registry<ChannelEditEvents>>(undefined);

type ChannelPropertyState<T extends keyof ChannelEditableProperty> = {
    setPropertyValue: (value: ChannelEditableProperty[T], dontUpdateController?: boolean) => void
} & ({
    propertyState: "loading",
    propertyValue: undefined,
} | {
    propertyState: "normal" | "applying",
    propertyValue: ChannelEditableProperty[T],
})

const kPropertyLoading = "____loading_____";
function useProperty<T extends keyof ChannelEditableProperty>(property: T) : ChannelPropertyState<T> {
    const events = useContext(EventContext);

    const [ value, setValue ] = useState<ChannelEditableProperty[T] | typeof kPropertyLoading>(() => {
        events.fire("query_property", { property: property });
        return kPropertyLoading;
    });

    events.reactUse("notify_property", event => {
        if(event.property !== property) {
            return;
        }

        setValue(event.value as any);
    }, undefined, []);

    if(value === kPropertyLoading) {
        return {
            propertyState: "loading",
            propertyValue: undefined,
            setPropertyValue: _value => {}
        };
    } else {
        return {
            propertyState: "normal",
            propertyValue: value,
            setPropertyValue: (value, dontUpdateController?: boolean) => {
                setValue(value);
                if(!dontUpdateController) {
                    events.fire("action_change_property", { property: property, value: value });
                }
            }
        };
    }
}

function usePropertyPermission<T extends keyof ChannelPropertyPermission>(permission: T, defaultValue: ChannelPropertyPermission[T]) : ChannelPropertyPermission[T] {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<ChannelPropertyPermission[T]>(() => {
        events.fire("query_property_permission", { permission: permission });
        return defaultValue;
    });

    events.reactUse("notify_property_permission", event => event.permission === permission && setValue(event.value as any));

    return value;
}

function usePermission(permission: ChannelEditablePermissions) : { permissionValue: ChannelEditablePermissionValue, setPermissionValue: (newValue: number, dontUpdateController?: boolean) => void } {
    const events = useContext(EventContext);
    const [ value, setValue ] = useState<ChannelEditablePermissionValue>(() => {
        events.fire("query_permission", { permission: permission });
        return { state: "loading" };
    });

    events.reactUse("notify_permission", event => event.permission === permission && setValue(event.value));

    return {
        permissionValue: value,
        setPermissionValue: (newValue, dontUpdateController) => {
            setValue({ value: newValue, state: "editable" });
            if(!dontUpdateController) {
                events.fire("action_change_permission", { permission: permission, value: newValue });
            }
        }
    };
}


function useValidationState<T extends keyof ChannelEditableProperty>(property: T) : boolean {
    const events = useContext(EventContext);
    const [ valid, setValid ] = useState(() => {
        events.fire("query_property_valid_state", { property: property });
        return true;
    });

    events.reactUse("notify_property_validate_state", event => event.property === property && setValid(event.valid));

    return valid;
}

const ChannelName = React.memo(() => {
    const modalType = useContext(ModalTypeContext);

    const { propertyValue, propertyState, setPropertyValue } = useProperty("name");
    const editable = usePropertyPermission("name", modalType === "channel-create");
    const valid = useValidationState("name");

    return (
        <BoxedInputField
            className={cssStyle.input}
            disabled={!editable || propertyState !== "normal"}
            value={propertyValue || ""}
            placeholder={propertyState === "normal" ? tr("Channel name") : tr("loading")}
            onInput={value => setPropertyValue(value, true)}
            onChange={value => setPropertyValue(value)}
            isInvalid={!valid}
        />
    );
});

const ChannelIcon = () => {
    const events = useContext(EventContext);
    const { propertyValue, propertyState, setPropertyValue } = useProperty("icon");
    const permissionGranted = usePropertyPermission("icon", false);

    const icon = getIconManager().resolveIcon(propertyValue ? propertyValue.iconId : 0, propertyValue?.remoteIcon.serverUniqueId, propertyValue?.remoteIcon.handlerId);

    const enabled = permissionGranted && propertyState === "normal";
    return (
        <div className={cssStyle.iconContainer + " " + (enabled ? "" : cssStyle.disabled)}>
            <div className={cssStyle.preview} onClick={() => enabled && events.fire("action_icon_select")}>
                <RemoteIconRenderer icon={icon} key={"icon-" + icon.iconId} />
            </div>
            <div className={cssStyle.containerDropdown}>
                <div className={cssStyle.button}>
                    <div className="arrow down" />
                </div>
                <div className={cssStyle.dropdown}>
                    <div className={cssStyle.entry} onClick={() => enabled && events.fire("action_icon_select")}>Edit icon</div>
                    <div className={cssStyle.entry} onClick={() => {
                        if(!enabled) {
                            return;
                        }

                        setPropertyValue({
                            iconId: 0,
                            remoteIcon: {
                                iconId: 0,
                                handlerId: propertyValue.remoteIcon.handlerId,
                                serverUniqueId: propertyValue.remoteIcon.serverUniqueId
                            }
                        });
                    }}>Remove icon</div>
                </div>
            </div>
        </div>
    )
}

const ChannelPassword = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("password");
    const { editable } = usePropertyPermission("password", { enforced: false, editable: false });
    const valid = useValidationState("password");

    return (
        <BoxedInputField
            className={cssStyle.input}
            disabled={!editable || propertyState !== "normal"}
            value={propertyValue?.state === "set" ? propertyValue.password || "placeholder" : ""}
            placeholder={propertyState === "normal" ? tr("Password") : tr("loading")}
            onInput={value => {
                if(value.length > 0) {
                    setPropertyValue({ state: "set", password: value }, true);
                } else {
                    setPropertyValue({ state: "clear" }, true);
                }
            }}
            onChange={value => {
                if(value.length > 0) {
                    setPropertyValue({ state: "set", password: value });
                } else {
                    setPropertyValue({ state: "clear" });
                }
            }}
            isInvalid={!valid}
            type={"password"}
        />
    );
});

const ChannelTopic = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("topic");
    const editable = usePropertyPermission("topic", false);

    return (
        <BoxedInputField
            className={cssStyle.input}
            disabled={!editable || propertyState !== "normal"}
            value={propertyValue || ""}
            placeholder={propertyState === "normal" ? tr("Topic") : tr("loading")}
            onInput={value => setPropertyValue(value, true)}
            onChange={value => setPropertyValue(value)}
        />
    );
});

const BBCodeEditor = React.memo((props: { text: string, placeholder: string, disabled: boolean, callbackEdit: (value: string) => void }) => {
    const refText = useRef<HTMLTextAreaElement>();

    const insertTag = (open: string, close: string) => {
        const element = refText.current;
        if(!element) {
            return;
        }

        if (element.selectionStart || element.selectionStart == 0) {
            const startPos = element.selectionStart;
            const endPos = element.selectionEnd;
            element.value = element.value.substring(0, startPos) + open + element.value.substring(startPos, endPos) + close + element.value.substring(endPos);
            element.selectionEnd = endPos + open.length;
            element.selectionStart = element.selectionEnd;
        } else {
            element.value += open + close;
            element.selectionEnd = element.value.length - close.length;
            element.selectionStart = element.selectionEnd;
        }
        element.focus();
    };

    return (
        <div className={cssStyle.bbcodeEditor}>
            <div className={cssStyle.toolbar}>
                <div className={cssStyle.button + " " + cssStyle.buttonBold} onClick={() => insertTag("[b]", "[/b]")}>B</div>
                <div className={cssStyle.button + " " + cssStyle.buttonItalic} onClick={() => insertTag("[i]", "[/i]")}>I</div>
                <div className={cssStyle.button + " " + cssStyle.buttonUnderline} onClick={() => insertTag("[u]", "[/u]")}>U</div>
                <label className={cssStyle.button + " " + cssStyle.buttonColor}>
                    <input type="color" value="#FF0000" onInput={event => insertTag("[color=" + event.currentTarget.value + "]", "[/color]")} />
                    <a className={cssStyle.rainbowLetter}>C</a>
                </label>
            </div>
            <textarea
                ref={refText}
                className={cssStyle.input + " input-boxed"}
                placeholder={props.placeholder}
                defaultValue={props.text}
                disabled={props.disabled}
                onChange={event => props.callbackEdit(event.target.value)}
            />
        </div>
    );
});

const ChannelDescription = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("description");
    const editable = usePropertyPermission("description", false);

    return (
        <BBCodeEditor
            text={propertyValue || ""}
            disabled={!editable || propertyState !== "normal"}
            placeholder={useTr("Description")}
            callbackEdit={setPropertyValue}
        />
    );
});

const BlockProperty = (props: { children: [React.ReactElement | string, React.ReactElement] }) => {
    return (
        <div className={cssStyle.blockProperty}>
            <div className={cssStyle.title}>
                {props.children[0]}
            </div>
            {props.children[1]}
        </div>
    )
};

const ChannelType = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("type");
    const permissions = usePropertyPermission("channelType", { default: false, temporary: false, semiPermanent: false, permanent: false });

    return (
        <BlockProperty>
            <Translatable>Channel Type</Translatable>
            <Select
                type={"boxed"}
                value={propertyValue?.type || "loading"}
                disabled={propertyState !== "normal" || (!permissions.temporary && !permissions.semiPermanent && !permissions.permanent) || propertyValue.originallyDefault}
                onChange={event => setPropertyValue({ type: event.target.value as any })}
            >
                <option value={"temporary"} disabled={!permissions.temporary}>{useTr("Temporary")}</option>
                <option value={"semi-permanent"} disabled={!permissions.semiPermanent}>{useTr("Semi-Permanent")}</option>
                <option value={"permanent"} disabled={!permissions.permanent}>{useTr("Permanent")}</option>
                <option value={"default"} disabled={!permissions.default}>{useTr("Default Channel")}</option>
                <option value={"loading"} style={{ display: "none" }}>{useTr("loading")}</option>
            </Select>
        </BlockProperty>
    );
});

const SidebarType = React.memo(() => {
    const mode = useContext(ModalTypeContext);
    let { propertyValue, propertyState, setPropertyValue } = useProperty("sideBar");
    const permissionGranted = usePropertyPermission("sidebarMode", false);

    if(propertyValue === "unknown" && mode === "channel-create") {
        /* the default mode */
        propertyValue = "conversation";
    }

    return (
        <BlockProperty>
            <Translatable>Sidebar Type</Translatable>
            <Select
                type={"boxed"}
                value={propertyValue || "loading"}
                disabled={propertyState !== "normal" || !permissionGranted || propertyValue === "not-supported"}
                onChange={event => setPropertyValue(event.target.value as any)}
            >
                <option value={"unknown"} style={{ display: "none" }}>{useTr("Unknown mode")}</option>
                <option value={"conversation"}>{useTr("Conversation")}</option>
                <option value={"description"}>{useTr("Channel description")}</option>
                <option value={"file-transfer"}>{useTr("File browser")}</option>
                <option value={"not-supported"} style={{ display: "none" }}>{useTr("Option not supported")}</option>
                <option value={"loading"} style={{ display: "none" }}>{useTr("loading")}</option>
            </Select>
        </BlockProperty>
    );
});

type SimpleCodecQualityTemplate = { id: string, codec: number, quality: number, name: string };
const kCodecTemplates: SimpleCodecQualityTemplate[] = [
    {
        id: "mobile",
        codec: 4,
        quality: 4,
        name: useTr("Mobile")
    },
    {
        id: "voice",
        codec: 4,
        quality: 6,
        name: useTr("Voice")
    },
    {
        id: "music",
        codec: 5,
        quality: 6,
        name: useTr("Music")
    },
    {
        id: "loading",
        codec: undefined,
        quality: undefined,
        name: useTr("loading")
    }
];

const SimpleCodecQuality = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("codec");
    const { opusMusic, opusVoice } = usePropertyPermission("codec", { opusVoice: false, opusMusic: false });

    const value = kCodecTemplates.find(template => template.codec === propertyValue?.type && template.quality === propertyValue?.quality)?.id || "advanced";
    const hasPermission = (codec: SimpleCodecQualityTemplate) => codec.codec === 4 ? opusMusic : codec.codec === 5 ? opusVoice : false;

    return (
        <BlockProperty>
            <Translatable>Voice quality</Translatable>
            <Select
                type={"boxed"}
                value={value}
                disabled={propertyState !== "normal" || (!opusMusic || !opusVoice)}
                onChange={event => {
                    const template = kCodecTemplates.find(template => template.id === event.target.value);
                    if(!template || !template.codec) {
                        return;
                    }

                    setPropertyValue({ type: template.codec, quality: template.quality });
                }}
            >
                {
                    kCodecTemplates.map(template => (
                        <option style={{ display: template.id === "loading" ? "none" : undefined }} key={template.id} value={template.id} disabled={!hasPermission(template)}>{template.name}</option>
                    ))
                }
                <option style={{ display: "none" }} key={"advanced"} value={"advanced"}>{useTr("Custom (Advanced settings)")}</option>
            </Select>
        </BlockProperty>
    );
});

const AdvancedCodecPresets = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("codec");
    const { opusMusic, opusVoice } = usePropertyPermission("codec", { opusVoice: false, opusMusic: false });

    const value = kCodecTemplates.find(template => template.codec === propertyValue?.type && template.quality === propertyValue?.quality)?.id || "advanced";
    const hasPermission = (codec: SimpleCodecQualityTemplate) => codec.codec === 4 ? opusMusic : codec.codec === 5 ? opusVoice : false;

    return (
        <div className={cssStyle.radioSelect}>
            {
                kCodecTemplates.filter(template => !!template.codec).map(template => (
                    <RadioButton
                        key={template.id}
                        name={"advanced-codec"}
                        selected={template.id === value}
                        disabled={!hasPermission(template) || propertyState !== "normal"}
                        onChange={() => setPropertyValue({ quality: template.quality, type: template.codec})}
                    >
                        <div>{template.name}</div>
                    </RadioButton>
                ))
            }

            <RadioButton key={"value"} name={"advanced-codec"} selected={value === "advanced"} onChange={() => {}} disabled={true}>
                <div><Translatable>Custom</Translatable></div>
            </RadioButton>
        </div>
    );
});

const CustomCodec = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("codec");
    const { opusMusic, opusVoice } = usePropertyPermission("codec", { opusVoice: false, opusMusic: false });

    return (
        <BlockProperty>
            <Translatable>Codec</Translatable>
            <Select
                type={"boxed"}
                disabled={!opusVoice && !opusMusic || propertyState !== "normal"}
                value={propertyValue?.type + "" || "loading"}
                onChange={event => {
                    const value = parseInt(event.target.value);
                    if(!isNaN(value)) {
                        setPropertyValue({ type: value, quality: propertyValue.quality });
                    }
                }}
            >
                <option value={"0"} style={{ display: "none" }}>{useTr("Unknown")}</option>
                <option value={"4"}>{useTr("Opus Voice")}</option>
                <option value={"5"}>{useTr("Opus Music")}</option>
                <option value={"loading"} style={{ display: "none" }}>{useTr("loading")}</option>
            </Select>
        </BlockProperty>
    );
});

const CustomQuality = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("codec");
    const permissionGranted = usePropertyPermission("codecQuality", false);

    const refQuality = useRef<HTMLDivElement>();
    const refSlider = useRef<Slider>();

    useEffect(() => {
        if(propertyState === "normal") {
            refSlider.current?.setState({ value: propertyValue.quality });
        }
    });

    return (
        <BlockProperty>
            <div>
                <Translatable>Quality:</Translatable>&nbsp;
                <div style={{ display: "inline" }} ref={refQuality}>{propertyValue?.quality}</div>
            </div>
            <Slider
                ref={refSlider}
                minValue={1}
                maxValue={10}
                stepSize={1}
                value={propertyValue?.quality || 1}
                onInput={newValue => {
                    if(refQuality.current) {
                        refQuality.current.innerText = newValue + "";
                    }
                }}
                onChange={newValue => {
                    setPropertyValue({ quality: newValue, type: propertyValue.type });
                }}
                disabled={propertyState !== "normal" || !permissionGranted}
            />
        </BlockProperty>
    )
});

const kBandwidthInfo = [
    /* SPEEX narrow */ [2.49, 2.69, 2.93, 3.17, 3.17, 3.56, 3.56, 4.05, 4.05,  4.44,  5.22],
    /* SPEEX wide */   [2.69, 2.93, 3.17, 3.42, 3.76, 4.25, 4.74, 5.13, 5.62,  6.40,  7.37],
    /* SPEEX ultra */  [2.73, 3.12, 3.37, 3.61, 4.00, 4.49, 4.93, 5.32, 5.81,  6.59,  7.57],
    /* CELT */         [6.10, 6.10, 7.08, 7.08, 7.08, 8.06, 8.06, 8.06, 8.06, 10.01, 13.92],

    /* Opus Voice */   [2.73, 3.22, 3.71, 4.20, 4.74, 5.22, 5.71, 6.20,  6.74,  7.23,  7.71],
    /* Opus Music */   [3.08, 3.96, 4.83, 5.71, 6.59, 7.47, 8.35, 9.23, 10.11, 10.99, 11.87]
];

const CodecInfo = React.memo(() => {
    const { propertyValue, propertyState } = useProperty("codec");

    return (
        <div className={cssStyle.codecInfo}>
            <p>
                Estimated needed bandwidth: <a>{propertyState !== "normal" ? tr("loading") : ((kBandwidthInfo[propertyValue.type] || [])[propertyValue.quality] || 0) + "KiB/s"}</a>
            </p>
            <p className={cssStyle.hint}>
                For bad internet connection, lower settings are recommend to reduce bandwidth.
            </p>
        </div>
    );
});

const SortOrder = React.memo(() => {
    const mode = useContext(ModalTypeContext);
    const { propertyValue, propertyState, setPropertyValue } = useProperty("sortingOrder");
    const permissionGranted = usePropertyPermission("sortingOrder", false);

    let value;
    if(propertyState === "loading") {
        value = "loading";
    } else if(propertyValue.previousChannelId === 0) {
        if(mode === "channel-create") {
            /* We automatically use the last channel */
            value = propertyValue.availableChannels?.last()?.channelId || "0";
        } else {
            value = "0";
        }
    } else {
        value = propertyValue.availableChannels?.find(channel => channel.channelId === propertyValue.previousChannelId) ? propertyValue.previousChannelId.toString() : "unknown";
    }

    return (
        <BlockProperty>
            <Translatable>Sort this channel after</Translatable>
            <Select
                type={"boxed"}
                value={value}
                disabled={propertyState !== "normal" || !permissionGranted}
                onChange={event => {
                    const channelId = parseInt(event.target.value);
                    if(isNaN(channelId)) { return; }

                    setPropertyValue({ availableChannels: propertyValue?.availableChannels, previousChannelId: channelId });
                }}
            >
                <option style={{ display: "none" }} key={"0"} value={"0"} />
                {
                    propertyValue?.availableChannels.map(channel => (
                        <option key={channel.channelId} value={channel.channelId}>{channel.channelName}</option>
                    ))
                }
                <option style={{ display: "none" }} key={"loading"} value={"loading"}>{useTr("loading")}</option>
                <option style={{ display: "none" }} key={"unknown"} value={"unknown"}>{useTr("Unknown channel id")}: {propertyValue?.previousChannelId}</option>
            </Select>
        </BlockProperty>
    );
});

const TalkPower = React.memo(() => {
    const { propertyValue, propertyState, setPropertyValue } = useProperty("talkPower");
    const permissionGranted = usePropertyPermission("talkPower", false);


    return (
        <BlockProperty>
            &nbsp;
            <BoxedInputField
                value={propertyValue === undefined ? "" : propertyValue + ""}
                disabled={!permissionGranted || propertyState !== "normal"}
                prefix={useTr("Talk power") + ":"}
                rightIcon={() => (
                    <IconTooltip className={cssStyle.tooltip}>
                        <Translatable>Required power to talk in this channel</Translatable>
                    </IconTooltip>
                )}
                onInput={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0, true)}
                onChange={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0)}
            />
        </BlockProperty>
    );
});

const MaxClients = React.memo(() => {
    const { propertyValue, setPropertyValue } = useProperty("maxUsers");
    const permissionGranted = usePropertyPermission("maxUsers", false);
    const channelType = useProperty("type");

    let disabled = !permissionGranted || channelType.propertyValue?.type === "temporary" || channelType.propertyValue?.type === "default";
    useEffect(() => {
        if(channelType.propertyValue?.type === "temporary" || channelType.propertyValue?.type === "default") {
            setPropertyValue("unlimited");
            disabled = true;
        }
    });

    return (
        <div className={cssStyle.radioSelect}>
            <RadioButton
                name={"max-users"}
                selected={propertyValue === "unlimited"}
                onChange={() => setPropertyValue("unlimited")}
                disabled={disabled}
            >
                <div>
                    <Translatable>Unlimited</Translatable>
                </div>
            </RadioButton>
            <RadioButton
                name={"max-users"}
                selected={typeof propertyValue === "number"}
                onChange={() => setPropertyValue(0)}
                disabled={disabled}
            >
                <div>
                    <Translatable>Limited</Translatable>
                </div>
                <BoxedInputField
                    value={typeof propertyValue === "number" ? propertyValue + "" : "0"}
                    disabled={typeof propertyValue !== "number"}
                    className={cssStyle.limit}
                    rightIcon={() => (
                        <IconTooltip className={cssStyle.tooltip}>
                            <Translatable>Max users which could join the channel</Translatable>
                        </IconTooltip>
                    )}
                    size={"small"}
                    onInput={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0, true)}
                    onChange={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0)}
                />
            </RadioButton>
        </div>
    );
});

const MaxFamilyClients = React.memo(() => {
    const { propertyValue, setPropertyValue } = useProperty("maxFamilyUsers");
    const permissionGranted = usePropertyPermission("maxFamilyUsers", false);
    const channelType = useProperty("type");

    let disabled = !permissionGranted || channelType.propertyValue?.type === "temporary" || channelType.propertyValue?.type === "default";
    useEffect(() => {
        if(channelType.propertyValue?.type === "temporary" || channelType.propertyValue?.type === "default") {
            setPropertyValue("unlimited");
            disabled = true;
        }
    });

    return (
        <div className={cssStyle.radioSelect}>
            <RadioButton
                name={"max-family-users"}
                selected={propertyValue === "unlimited"}
                onChange={() => setPropertyValue("unlimited")}
                disabled={disabled}
            >
                <div>
                    <Translatable>Unlimited</Translatable>
                </div>
            </RadioButton>
            <RadioButton
                name={"max-family-users"}
                selected={propertyValue === "inherited"}
                onChange={() => setPropertyValue("inherited")}
                disabled={disabled}
            >
                <div>
                    <Translatable>Inherited</Translatable>
                </div>
            </RadioButton>
            <RadioButton
                name={"max-family-users"}
                selected={typeof propertyValue === "number"}
                onChange={() => setPropertyValue(0)}
                disabled={disabled}
            >
                <div>
                    <Translatable>Limited</Translatable>
                </div>
                <BoxedInputField
                    value={typeof propertyValue === "number" ? propertyValue + "" : "0"}
                    disabled={typeof propertyValue !== "number"}
                    className={cssStyle.limit}
                    rightIcon={() => (
                        <IconTooltip className={cssStyle.tooltip}>
                            <Translatable>Max users which could join the channel family</Translatable>
                        </IconTooltip>
                    )}
                    size={"small"}
                    onInput={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0, true)}
                    onChange={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0)}
                />
            </RadioButton>
        </div>
    );
});

const DeleteDelay = React.memo(() => {
    const { propertyValue, setPropertyValue, propertyState } = useProperty("deleteDelay");
    const permission = usePropertyPermission("deleteDelay", { maxDelay: -1, editable: false });

    return (
        <BlockProperty>
            <Translatable>Delete delay:</Translatable>
            <div className={cssStyle.deleteDelay}>
                <BoxedInputField
                    className={cssStyle.input}
                    size={"small"}
                    value={propertyValue + "" || "0"}
                    onInput={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0, true)}
                    onChange={value => value.match(/^[0-9]{0,9}$/) && setPropertyValue(value ? parseInt(value) : 0)}
                    rightIcon={() => (
                        <IconTooltip className={cssStyle.tooltip}>
                            <Translatable>Time in seconds before the channel gets deleted when its empty.</Translatable>
                        </IconTooltip>
                    )}
                    disabled={propertyState !== "normal" || !permission.editable}
                />
                <Button
                    color={"blue"}
                    type={"small"}
                    className={cssStyle.button + " " + (permission.maxDelay === -1 ? cssStyle.hidden : "")}
                    onClick={() => setPropertyValue(permission.maxDelay)}
                >
                    <Translatable>Max</Translatable>
                </Button>
            </div>
        </BlockProperty>
    );
});

const EncryptVoiceData = React.memo(() => {
    const { propertyValue, setPropertyValue, propertyState } = useProperty("encryptedVoiceData");
    const permissionGranted = usePropertyPermission("encryptVoiceData", false);

    let serverHint;
    switch (propertyValue?.serverSetting) {
        case "encrypted":
            serverHint = (
                <React.Fragment key={"encrypted"}>
                    (<Translatable>Overridden by the server with encrypted</Translatable>)
                </React.Fragment>
            );
            break;
        case "unencrypted":
            serverHint = (
                <React.Fragment key={"unencrypted"}>
                    (<Translatable>Overridden by the server with unencrypted</Translatable>)
                </React.Fragment>
            );
            break;
    }

    return (
        <BlockProperty>
            <Translatable>Encrypt voice data:</Translatable>
            <div className={cssStyle.encryptVoiceData}>
                <Switch
                    className={cssStyle.switch}
                    disabled={propertyState !== "normal" || !permissionGranted}
                    value={!!propertyValue?.encrypted}
                    onChange={newValue => setPropertyValue({ encrypted: newValue, serverSetting: propertyValue.serverSetting })}
                />
                {serverHint}
            </div>
        </BlockProperty>
    );
});

const GeneralContainer = () => {
    return (
        <div className={cssStyle.containerGeneral}>
            <div className={cssStyle.row}>
                <ChannelName />
                <ChannelIcon />
            </div>
            <div className={cssStyle.row}>
                <ChannelPassword />
            </div>
            {
                /*
                <div className={cssStyle.row}>
                    <ChannelTopic />
                </div>
                */
            }
            <div className={cssStyle.row}>
                <ChannelDescription />
            </div>
        </div>
    );
};

const TabAdvancedSettingsStandard = React.memo(() => {
    return (
        <div className={cssStyle.containerTab}>
            <div className={cssStyle.top}>
                <div className={cssStyle.left}>
                    <div className={cssStyle.header}><Translatable>Channel and Sidebar Type</Translatable></div>
                    <div className={cssStyle.content}>
                        <ChannelType />
                        <SidebarType />
                    </div>
                </div>
                <div className={cssStyle.right}>
                    <div className={cssStyle.header}><Translatable>Sorting and Talk power</Translatable></div>
                    <div className={cssStyle.content}>
                        <SortOrder />
                        <TalkPower />
                    </div>
                </div>
            </div>
            <div className={cssStyle.bottom}>
                <div className={cssStyle.left}>
                    <div className={cssStyle.header}><Translatable>Max users</Translatable></div>
                    <div className={cssStyle.content}>
                        <MaxClients />
                    </div>
                </div>
                <div className={cssStyle.right}>
                    <div className={cssStyle.header}><Translatable>Max family users</Translatable></div>
                    <div className={cssStyle.content}>
                        <MaxFamilyClients />
                    </div>
                </div>
            </div>
        </div>
    );
});

const TabAdvancedSettingsAudio = () => {
    return (
        <div className={cssStyle.containerTab}>
            <div className={cssStyle.top}>
                <div className={cssStyle.left}>
                    <div className={cssStyle.header}>
                        <Translatable>Presets</Translatable>
                    </div>
                    <div className={cssStyle.content}>
                        <AdvancedCodecPresets />
                    </div>
                </div>
                <div className={cssStyle.right}>
                    <div className={cssStyle.header}>
                        <Translatable>Custom Settings</Translatable>
                    </div>
                    <div className={cssStyle.content}>
                        <CustomCodec />
                        <CustomQuality />
                    </div>
                </div>
            </div>
            <div className={cssStyle.bottom}>
                <div className={cssStyle.codecInfoContainer}>
                    <div className={cssStyle.header}>
                        <Translatable>Information</Translatable>
                    </div>
                    <div className={cssStyle.content}>
                        <CodecInfo />
                    </div>
                </div>
            </div>
        </div>
    );
}

const PermissionName = (props: { permission: ChannelEditablePermissions }) => {
    switch (props.permission) {
        case "join": return <Translatable>Join</Translatable>;
        case "view": return <Translatable>View</Translatable>;
        case "view-description": return <Translatable>View description</Translatable>;
        case "subscribe": return <Translatable>Subscribe</Translatable>;
        case "modify": return <Translatable>Modify</Translatable>;
        case "delete": return <Translatable>Delete</Translatable>;

        case "browse": return <Translatable>Browse</Translatable>;
        case "upload": return <Translatable>Upload</Translatable>;
        case "download": return <Translatable>Download</Translatable>;
        case "rename": return <Translatable>Rename</Translatable>;
        case "directory-create": return <Translatable>Create directory</Translatable>;
        case "file-delete": return <Translatable>Delete file</Translatable>;

        default: return props.permission;
    }
}

const PermissionTooltip = (props: { permission: ChannelEditablePermissions }) => {
    switch (props.permission) {
        case "join": return <Translatable>Required power to join this channel</Translatable>;
        case "view": return <Translatable>Required power to see this channel</Translatable>;
        case "view-description": return <Translatable>Required power to see the channel description</Translatable>;
        case "subscribe": return <Translatable>Required power to subscribe to this channel</Translatable>;
        case "modify": return <Translatable>Required power to modify this channel permissions</Translatable>;
        case "delete": return <Translatable>Required power to delete this channel</Translatable>;

        case "browse": return <Translatable>Required power to browse all files and directories</Translatable>;
        case "upload": return <Translatable>Required power to upload files</Translatable>;
        case "download": return <Translatable>Required power to download files</Translatable>;
        case "rename": return <Translatable>Required power to rename files within this channel</Translatable>;
        case "directory-create": return <Translatable>Required power to create a directory</Translatable>;
        case "file-delete": return <Translatable>Required power to delete a directory or file</Translatable>;

        default: return <VariadicTranslatable text={"Missing description for {}"}>{props.permission}</VariadicTranslatable>;
    }
}

const PermissionRenderer = (props: { permission: ChannelEditablePermissions }) => {
    const { permissionValue, setPermissionValue } = usePermission(props.permission);

    const placeholderLoading = useTr("loading");
    const placeholderNotSupported = useTr("Not supported");

    return (
        <BlockProperty>
            <PermissionName permission={props.permission} />
            <BoxedInputField
                type={"number"}
                className={cssStyle.input}
                size={"small"}
                value={permissionValue.state === "editable" || permissionValue.state === "readonly" || permissionValue.state === "applying" ? permissionValue.value.toString() : ""}
                placeholder={permissionValue.state === "unsupported" ? placeholderNotSupported : permissionValue.state === "loading" ? placeholderLoading : ""}
                disabled={permissionValue.state !== "editable"}
                onInput={value => value.match(/^[0-9]{0,9}$/) && setPermissionValue(value ? parseInt(value) : 0, true)}
                onChange={value => value.match(/^[0-9]{0,9}$/) && setPermissionValue(value ? parseInt(value) : 0)}
                rightIcon={() => <IconTooltip className={cssStyle.tooltip}><PermissionTooltip permission={props.permission} /></IconTooltip>}
            />
        </BlockProperty>
    );
}

const PermissionTable = () => (
    <React.Fragment>
        <div className={cssStyle.left}>
            <div className={cssStyle.header}>
                <Translatable>Regular needed powers:</Translatable>
            </div>
            <div className={cssStyle.content}>
                <PermissionRenderer permission={"join"} />
                <PermissionRenderer permission={"view"} />
                <PermissionRenderer permission={"view-description"} />
                <PermissionRenderer permission={"subscribe"} />
                <PermissionRenderer permission={"modify"} />
                <PermissionRenderer permission={"delete"} />
            </div>
        </div>
        <div className={cssStyle.right}>
            <div className={cssStyle.header}>
                <Translatable>File transfer needed powers:</Translatable>
            </div>
            <div className={cssStyle.content}>
                <PermissionRenderer permission={"browse"} />
                <PermissionRenderer permission={"upload"} />
                <PermissionRenderer permission={"download"} />
                <PermissionRenderer permission={"rename"} />
                <PermissionRenderer permission={"directory-create"} />
                <PermissionRenderer permission={"file-delete"} />
            </div>
        </div>
    </React.Fragment>
);

const TabAdvancedSettingsPermissions = React.memo(() => {
    const events = useContext(EventContext);
    const [ state, setState ] = useState<ChannelEditPermissionsState>(() => {
        events.fire("query_permissions");
        return { state: "loading" };
    });

    events.reactUse("notify_permissions", event => setState(event.state));

    let content;
    switch (state.state) {
        case "loading":
            content = (
                <div className={cssStyle.overlay} key={"loading"}>
                    <div className={cssStyle.text}><Translatable>loading</Translatable> <LoadingDots /></div>
                </div>
            );
            break;

        case "no-permissions":
            content = (
                <div className={cssStyle.overlay} key={"no-permissions"}>
                    <div className={cssStyle.text}>
                        <Translatable>You don't have permissions to see the channel permissions.</Translatable><br/>
                        <Translatable>Failed on permission</Translatable>: <code>{state.failedPermission}</code>
                    </div>
                </div>
            );
            break;

        case "error":
            content = (
                <div className={cssStyle.overlay} key={"error"}>
                    <div className={cssStyle.text + " " + cssStyle.error}>
                        <Translatable>Failed to fetch channel permissions:</Translatable><br />
                        {state.reason}
                    </div>
                </div>
            );
            break;

        case "editable":
            content = <PermissionTable key={"table"} />;
            break;
    }

    return (
        <div className={cssStyle.containerTab + " " + cssStyle.containerPermissions}>
            {content}
        </div>
    );
});

const TabAdvancedSettingsMisc = () => {

    return (
        <div className={cssStyle.containerTab + " " + cssStyle.tabMisc}>
            <div className={cssStyle.header}><Translatable>Other Settings</Translatable></div>
            <DeleteDelay />
            <EncryptVoiceData />
        </div>
    );
}

const ContainerAdvancedSettings = React.memo(() => {
    return (
        <Tab defaultTab={"standard"} permanentRender={true}>
            <TabEntry id={"standard"}>
                <Translatable>Standard</Translatable>
                <TabAdvancedSettingsStandard />
            </TabEntry>
            <TabEntry id={"audio"}>
                <Translatable>Audio</Translatable>
                <TabAdvancedSettingsAudio />
            </TabEntry>
            <TabEntry id={"permissions"}>
                <Translatable>Permissions</Translatable>
                <TabAdvancedSettingsPermissions />
            </TabEntry>
            <TabEntry id={"misc"}>
                <Translatable>Misc</Translatable>
                <TabAdvancedSettingsMisc />
            </TabEntry>
        </Tab>
    );
});

const ContainerSimpleSettings = React.memo(() => {
    return (
        <React.Fragment>
            <div className={cssStyle.left}>
                <div className={cssStyle.header}><Translatable>Channel Options</Translatable></div>
                <div className={cssStyle.content}>
                    <ChannelType />
                    <SimpleCodecQuality />
                </div>
            </div>
            <div className={cssStyle.right}>
                <div className={cssStyle.header}><Translatable>Sorting and Talk power</Translatable></div>
                <div className={cssStyle.content}>
                    <SortOrder />
                    <TalkPower />
                </div>
            </div>
        </React.Fragment>
    );
});

const SettingsContainer = React.memo(() => {
    const [ advancedEnabled, setAdvancedEnabled ] = useState(settings.getValue(Settings.KEY_CHANNEL_EDIT_ADVANCED));
    useEffect(() => settings.globalChangeListener(Settings.KEY_CHANNEL_EDIT_ADVANCED, newValue => setAdvancedEnabled(newValue)));

    return (
        <div className={cssStyle.containerSettings}>
            <div className={cssStyle.settingsAdvanced + " " + (advancedEnabled ? "" : cssStyle.hidden)}>
                <ContainerAdvancedSettings />
            </div>
            <div className={cssStyle.settingsSimple + " " + (!advancedEnabled ? "" : cssStyle.hidden)}>
                <ContainerSimpleSettings />
            </div>
        </div>
    )
});

const ButtonToggleAdvanced = React.memo(() => {
    const [ advancedEnabled, setAdvancedEnabled ] = useState(settings.getValue(Settings.KEY_CHANNEL_EDIT_ADVANCED));

    settings.globalChangeListener(Settings.KEY_CHANNEL_EDIT_ADVANCED, newValue => setAdvancedEnabled(newValue));

    return (
        <Switch
            className={cssStyle.advancedSwitch}
            value={advancedEnabled}
            label={<Translatable>Advanced mode</Translatable>}
            onChange={newState => settings.setValue(Settings.KEY_CHANNEL_EDIT_ADVANCED, newState)}
        />
    )
});

const Buttons = React.memo(() => {
    const type = useContext(ModalTypeContext);
    const events = useContext(EventContext);

    return (
        <div className={cssStyle.buttons}>
            <ButtonToggleAdvanced />
            <div className={cssStyle.cancelCreate}>
                <Button type={"small"} color={"red"} onClick={() => events.fire("action_cancel")}><Translatable>Cancel</Translatable></Button>
                <Button type={"small"} color={"green"} onClick={() => events.fire("action_apply")}>
                    {type === "channel-create" ? <Translatable>Create</Translatable> : <Translatable>Apply</Translatable>}
                </Button>
            </div>
        </div>
    )
});

export class ChannelEditModal extends InternalModal {
    private readonly events: Registry<ChannelEditEvents>;
    private readonly isChannelCreate: boolean;

    constructor(events: Registry<ChannelEditEvents>, isChannelCreate: boolean) {
        super();
        this.events = events;
        this.isChannelCreate = isChannelCreate;
    }

    renderBody(): React.ReactElement {
        return (
            <EventContext.Provider value={this.events}>
                <ModalTypeContext.Provider value={this.isChannelCreate ? "channel-create" : "channel-edit"}>
                    <div className={cssStyle.container}>
                        <GeneralContainer />
                        <SettingsContainer />
                        <Buttons />
                    </div>
                </ModalTypeContext.Provider>
            </EventContext.Provider>
        );
    }

    title(): string | React.ReactElement {
        if(this.isChannelCreate) {
            return <Translatable key={"create"}>Create channel</Translatable>;
        } else {
            /* TODO: Channel name? */
            return <Translatable key={"edit"}>Edit channel</Translatable>;
        }
    }

    color(): "none" | "blue" {
        return "blue";
    }
}