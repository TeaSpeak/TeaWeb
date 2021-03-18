import * as React from "react";
import {useEffect, useRef, useState} from "react";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {Button} from "tc-shared/ui/react-elements/Button";
import {Registry} from "tc-shared/events";
import {MicrophoneDevice, MicrophoneSettingsEvents, SelectedMicrophone} from "tc-shared/ui/modal/settings/Microphone";
import {ClientIconRenderer} from "tc-shared/ui/react-elements/Icons";
import {ClientIcon} from "svg-sprites/client-icons";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {createErrorModal} from "tc-shared/ui/elements/Modal";
import {Slider} from "tc-shared/ui/react-elements/Slider";
import {RadioButton} from "tc-shared/ui/react-elements/RadioButton";
import {VadType} from "tc-shared/voice/RecorderProfile";
import {getKeyDescription, KeyDescriptor} from "tc-shared/PPTListener";
import {spawnKeySelect} from "tc-shared/ui/modal/ModalKeySelect";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {BoxedInputField} from "tc-shared/ui/react-elements/InputField";
import {HighlightContainer, HighlightRegion, HighlightText} from "./Heighlight";
import {InputDevice} from "tc-shared/audio/Recorder";

const cssStyle = require("./Microphone.scss");

type MicrophoneSelectedState = "selected" | "applying" | "unselected";
const MicrophoneStatus = (props: { state: MicrophoneSelectedState }) => {
    switch (props.state) {
        case "applying":
            return (
                <div key={"applying"} className={cssStyle.iconLoading}>
                    <img draggable={false} src="img/icon_settings_loading.svg" alt={tr("applying")}/>
                </div>
            );

        case "unselected":
            return null;

        case "selected":
            return <ClientIconRenderer key={"selected"} icon={ClientIcon.Apply}/>;
    }
}

type ActivityBarStatus =
    { mode: "success" }
    | { mode: "error", message: string }
    | { mode: "loading" }
    | { mode: "uninitialized" };
const ActivityBar = (props: { events: Registry<MicrophoneSettingsEvents>, deviceId: string | "none", disabled?: boolean }) => {
    const refHider = useRef<HTMLDivElement>();
    const [status, setStatus] = useState<ActivityBarStatus>({ mode: "loading" });

    if(typeof props.deviceId === "undefined") {
        throw "invalid device id";
    }

    props.events.reactUse("notify_device_level", event => {
        refHider.current.style.width = "100%";
        if (event.status === "uninitialized") {
            if (status.mode === "uninitialized") {
                return;
            }

            setStatus({mode: "uninitialized"});
        } else if (event.status === "no-permissions") {
            const noPermissionsMessage = tr("no permissions");
            if (status.mode === "error" && status.message === noPermissionsMessage) {
                return;
            }

            setStatus({mode: "error", message: noPermissionsMessage});
        } else {
            const device = event.level[props.deviceId];
            if (!device) {
                if (status.mode === "loading") {
                    return;
                }

                setStatus({mode: "loading"});
            } else if (device.status === "success") {
                if (status.mode !== "success") {
                    setStatus({mode: "success"});
                }

                refHider.current.style.width = (100 - device.level) + "%";
            } else {
                if (status.mode === "error" && status.message === device.error) {
                    return;
                }

                setStatus({mode: "error", message: device.error + ""});
            }
        }
    }, true, [status]);


    let error;
    switch (status.mode) {
        case "error":
            error = <div className={cssStyle.text + " " + cssStyle.error} key={"error"}>{status.message}</div>;
            break;

        case "loading":
            error =
                <div className={cssStyle.text} key={"loading"}><Translatable>Loading</Translatable>&nbsp;<LoadingDots/>
                </div>;
            break;

        case "success":
            error = undefined;
            break;
    }
    return (
        <div
            className={cssStyle.containerActivityBar + " " + cssStyle.bar + " " + (props.disabled ? cssStyle.disabled : "")}>
            <div ref={refHider} className={cssStyle.hider} style={{width: "100%"}}/>
            {error}
        </div>
    )
};

const Microphone = (props: { events: Registry<MicrophoneSettingsEvents>, device: MicrophoneDevice, state: MicrophoneSelectedState, onClick: () => void }) => {
    return (
        <div className={cssStyle.device + " " + (props.state === "unselected" ? "" : cssStyle.selected)}
             onClick={props.onClick}>
            <div className={cssStyle.containerSelected}>
                <MicrophoneStatus state={props.state}/>
            </div>
            <div className={cssStyle.containerName}>
                <div className={cssStyle.driver}>{props.device.driver + (props.device.default ? " (Default Device)" : "")}</div>
                <div className={cssStyle.name}>{props.device.name}</div>
            </div>
            <div className={cssStyle.containerActivity}>
                {props.device.id === InputDevice.NoDeviceId ? undefined :
                    <ActivityBar key={"a"} events={props.events} deviceId={props.device.id}/>
                }
            </div>
        </div>
    );
};

type MicrophoneListState = {
    type: "normal" | "loading" | "audio-not-initialized"
} | {
    type: "error",
    message: string
} | {
    type: "no-permissions",
    bySystem: boolean
}

const PermissionDeniedOverlay = (props: { bySystem: boolean, shown: boolean, onRequestPermission: () => void }) => {
    if (props.bySystem) {
        return (
            <div key={"system"} className={cssStyle.overlay + " " + (props.shown ? undefined : cssStyle.hidden)}>
                <ClientIconRenderer icon={ClientIcon.MicrophoneBroken}/>
                <a><Translatable>Microphone access has been blocked by your browser.</Translatable></a>
            </div>
        );
    } else {
        return (
            <div key={"user"} className={cssStyle.overlay + " " + (props.shown ? undefined : cssStyle.hidden)}>
                <a><Translatable>Please grant access to your microphone.</Translatable></a>
                <Button
                    key={"request"}
                    color={"green"}
                    type={"small"}
                    onClick={props.onRequestPermission}
                ><Translatable>Request access</Translatable></Button>
            </div>
        );
    }
}

const MicrophoneList = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [state, setState] = useState<MicrophoneListState>(() => {
        props.events.fire("query_devices");
        return {type: "loading"};
    });
    const [selectedDevice, setSelectedDevice] = useState<{
        selectedDevice: SelectedMicrophone,
        selectingDevice: SelectedMicrophone | undefined
    }>();
    const [deviceList, setDeviceList] = useState<MicrophoneDevice[]>([]);

    props.events.reactUse("notify_devices", event => {
        setSelectedDevice(undefined);
        switch (event.status) {
            case "success":
                setDeviceList(event.devices.slice(0));
                setState({type: "normal"});
                setSelectedDevice({
                    selectedDevice: event.selectedDevice,
                    selectingDevice: undefined
                });
                break;

            case "error":
                setState({type: "error", message: event.error || tr("Unknown error")});
                break;

            case "audio-not-initialized":
                setState({type: "audio-not-initialized"});
                break;

            case "no-permissions":
                setState({type: "no-permissions", bySystem: event.shouldAsk});
                break;
        }
    });

    props.events.reactUse("action_set_selected_device", event => {
        setSelectedDevice({
            selectedDevice: selectedDevice?.selectedDevice,
            selectingDevice: event.target
        });
    });

    props.events.reactUse("action_set_selected_device_result", event => {
        if (event.status === "error") {
            createErrorModal(tr("Failed to select microphone"), tra("Failed to select microphone:\n{}", event.reason)).open();
            setSelectedDevice({
                selectedDevice: selectedDevice?.selectedDevice,
                selectingDevice: undefined
            });
        }
    });

    props.events.reactUse("notify_device_selected", event => {
        setSelectedDevice({ selectedDevice: event.device, selectingDevice: undefined });
    })

    const deviceSelectState = (device: MicrophoneDevice | "none" | "default"): MicrophoneSelectedState => {
        let selected: SelectedMicrophone;
        let mode: MicrophoneSelectedState;
        if(typeof selectedDevice?.selectingDevice !== "undefined") {
            selected = selectedDevice.selectingDevice;
            mode = "applying";
        } else if(typeof selectedDevice?.selectedDevice !== "undefined") {
            selected = selectedDevice.selectedDevice;
            mode = "selected";
        } else {
            return "unselected";
        }

        if(selected.type === "default") {
            return device === "default" || (typeof device === "object" && device.default) ? mode : "unselected";
        } else if(selected.type === "none") {
            return device === "none" ? mode : "unselected";
        } else {
            return typeof device === "object" && device.id === selected.deviceId ? mode : "unselected";
        }
    }

    return (
        <div className={cssStyle.body + " " + cssStyle.containerDevices}>
            <div
                className={cssStyle.overlay + " " + (state.type !== "audio-not-initialized" ? cssStyle.hidden : undefined)}>
                <a>
                    <Translatable>The web audio play hasn't been initialized yet.</Translatable>&nbsp;
                    <Translatable>Click somewhere on the base to initialize it.</Translatable>
                </a>
            </div>
            <div className={cssStyle.overlay + " " + (state.type !== "error" ? cssStyle.hidden : undefined)}>
                <a>{state.type === "error" ? state.message : undefined}</a>
            </div>
            <div className={cssStyle.overlay + " " + (state.type !== "no-permissions" ? cssStyle.hidden : undefined)}>
                <a><Translatable>Please grant access to your microphone.</Translatable></a>
                <Button
                    color={"green"}
                    type={"small"}
                    onClick={() => props.events.fire("action_request_permissions")}
                ><Translatable>Request access</Translatable></Button>
            </div>
            <PermissionDeniedOverlay
                bySystem={state.type === "no-permissions" ? state.bySystem : false}
                shown={state.type === "no-permissions"}
                onRequestPermission={() => props.events.fire("action_request_permissions")}
            />
            <div className={cssStyle.overlay + " " + (state.type !== "loading" ? cssStyle.hidden : undefined)}>
                <a><Translatable>Loading</Translatable>&nbsp;<LoadingDots/></a>
            </div>
            <Microphone key={"d-no-device"}
                        device={{
                            id: "none",
                            driver: tr("No device"),
                            name: tr("No device"),
                            default: false
                        }}
                        events={props.events}
                        state={deviceSelectState("none")}
                        onClick={() => {
                            if (state.type !== "normal" || selectedDevice?.selectingDevice) {
                                return;
                            }

                            props.events.fire("action_set_selected_device", { target: { type: "none" } });
                        }}
            />

            {deviceList.map(device => <Microphone
                key={"d-" + device.id}
                device={device}
                events={props.events}
                state={deviceSelectState(device)}
                onClick={() => {
                    if (state.type !== "normal" || selectedDevice?.selectingDevice) {
                        return;
                    }

                    if(device.default) {
                        props.events.fire("action_set_selected_device", { target: { type: "default" } });
                    } else {
                        props.events.fire("action_set_selected_device", { target: { type: "device", deviceId: device.id } });
                    }
                }}
            />)}
        </div>
    )
}

const ListRefreshButton = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [updateTimeout, setUpdateTimeout] = useState(Date.now() + 2000);

    useEffect(() => {
        if (updateTimeout === 0)
            return;

        const id = setTimeout(() => {
            setUpdateTimeout(0);
        }, Math.max(updateTimeout - Date.now(), 0));
        return () => clearTimeout(id);
    });

    props.events.reactUse("query_devices", () => setUpdateTimeout(Date.now() + 2000));

    return <Button disabled={updateTimeout > 0} color={"blue"}
                   onClick={() => props.events.fire("query_devices", {refresh_list: true})}>
        <Translatable>Update</Translatable>
    </Button>;
}

const VolumeSettings = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const refSlider = useRef<Slider>();
    const [value, setValue] = useState<"loading" | number>(() => {
        props.events.fire("query_setting", {setting: "volume"});
        return "loading";
    })

    props.events.reactUse("notify_setting", event => {
        if (event.setting !== "volume")
            return;

        refSlider.current?.setState({value: event.value});
        setValue(event.value);
    });

    return (
        <div className={cssStyle.containerVolume}>
            <a><Translatable>Volume</Translatable></a>
            <Slider
                ref={refSlider}

                minValue={0}
                maxValue={100}
                stepSize={1}
                value={value === "loading" ? 0 : value}
                unit={"%"}
                disabled={value === "loading"}

                onChange={value => props.events.fire("action_set_setting", {setting: "volume", value: value})}
            />
        </div>
    )
};

const PPTKeyButton = React.memo((props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [key, setKey] = useState<"loading" | KeyDescriptor>(() => {
        props.events.fire("query_setting", {setting: "ppt-key"});
        return "loading";
    });

    const [isActive, setActive] = useState(false);

    props.events.reactUse("notify_setting", event => {
        if (event.setting === "vad-type")
            setActive(event.value === "push_to_talk");
        else if (event.setting === "ppt-key")
            setKey(event.value);
    });

    if (key === "loading") {
        return <Button color={"none"} disabled={true} key={"loading"}><Translatable>loading</Translatable>
            <LoadingDots/></Button>;
    } else {
        return <Button
            color={"none"}
            key={"key"}
            disabled={!isActive}
            onClick={() => {
                spawnKeySelect(key => {
                    if (!key) return;

                    props.events.fire("action_set_setting", {setting: "ppt-key", value: key});
                });
            }}
        >{getKeyDescription(key)}</Button>;
    }
});

const PPTDelaySettings = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [delayActive, setDelayActive] = useState<"loading" | boolean>(() => {
        props.events.fire("query_setting", {setting: "ppt-release-delay"});
        return "loading";
    });

    const [delay, setDelay] = useState<"loading" | number>(() => {
        props.events.fire("query_setting", {setting: "ppt-release-delay-active"});
        return "loading";
    });

    const [isActive, setActive] = useState(false);

    props.events.reactUse("notify_setting", event => {
        if (event.setting === "vad-type")
            setActive(event.value === "push_to_talk");
        else if (event.setting === "ppt-release-delay")
            setDelay(event.value);
        else if (event.setting === "ppt-release-delay-active")
            setDelayActive(event.value);
    });

    return (
        <div className={cssStyle.containerPptDelay}>
            <Checkbox
                onChange={value => {
                    props.events.fire("action_set_setting", {setting: "ppt-release-delay-active", value: value})
                }}
                disabled={!isActive}
                value={delayActive === true}
                label={<Translatable>Delay on Push to Talk</Translatable>}
            />

            <BoxedInputField
                className={cssStyle.input}
                disabled={!isActive || delayActive === "loading" || !delayActive}
                suffix={"ms"}
                inputBox={() => <input
                    type="number"
                    min={0}
                    max={4000}
                    step={1}
                    value={delay}
                    disabled={!isActive || delayActive === "loading" || !delayActive}
                    onChange={event => {
                        if (event.target.value === "") {
                            const target = event.target;
                            setImmediate(() => target.value = "");
                            return;
                        }


                        const newValue = event.target.valueAsNumber;
                        if (isNaN(newValue))
                            return;

                        if (newValue < 0 || newValue > 4000)
                            return;

                        props.events.fire("action_set_setting", {setting: "ppt-release-delay", value: newValue});
                    }}
                />}
            />
        </div>
    );
}

const RNNoiseLabel = () => (
    <VariadicTranslatable text={"Enable RNNoise cancelation ({})"}>
        <a href={"https://jmvalin.ca/demo/rnnoise/"} target={"_blank"} style={{ margin: 0 }}><Translatable>more info</Translatable></a>
    </VariadicTranslatable>
)

const RNNoiseSettings = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    if(__build.target === "web") {
        return null;
    }

    const [ enabled, setEnabled ] = useState<boolean | "loading">(() => {
        props.events.fire("query_setting", { setting: "rnnoise" });
        return "loading";
    });
    props.events.reactUse("notify_setting", event => event.setting === "rnnoise" && setEnabled(event.value));

    return (
        <Checkbox label={<RNNoiseLabel />}
                  disabled={enabled === "loading"}
                  value={enabled === true}
                  onChange={value => props.events.fire("action_set_setting", { setting: "rnnoise", value: value })}
        />
    )
}

const VadSelector = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [selectedType, setSelectedType] = useState<VadType | "loading">(() => {
        props.events.fire("query_setting", {setting: "vad-type"});
        return "loading";
    });

    props.events.reactUse("notify_setting", event => {
        if (event.setting !== "vad-type")
            return;

        setSelectedType(event.value);
    });

    return (
        <div className={cssStyle.containerSelectVad}>
            <div className={cssStyle.fieldset}>
                <div className={cssStyle.containerOption}>
                    <RadioButton
                        name={"vad-type"}
                        onChange={() => {
                            props.events.fire("action_set_setting", {setting: "vad-type", value: "push_to_talk"})
                        }}
                        selected={selectedType === "push_to_talk"}
                        disabled={selectedType === "loading"}
                    >
                        <a><Translatable>Push to Talk</Translatable></a>
                    </RadioButton>
                    <div className={cssStyle.containerButton}>
                        <PPTKeyButton events={props.events}/>
                    </div>
                </div>
                <div className={cssStyle.containerOption}>
                    <RadioButton
                        name={"vad-type"}
                        onChange={() => {
                            props.events.fire("action_set_setting", {setting: "vad-type", value: "threshold"})
                        }}
                        selected={selectedType === "threshold"}
                        disabled={selectedType === "loading"}
                    >
                        <a><Translatable>Voice activity detection</Translatable></a>
                    </RadioButton>
                </div>
                <div className={cssStyle.containerOption}>
                    <RadioButton
                        name={"vad-type"}
                        onChange={() => {
                            props.events.fire("action_set_setting", {setting: "vad-type", value: "active"})
                        }}
                        selected={selectedType === "active"}
                        disabled={selectedType === "loading"}
                    >
                        <a><Translatable>Always active</Translatable></a>
                    </RadioButton>
                </div>
            </div>
        </div>
    );
}

const ThresholdSelector = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const refSlider = useRef<Slider>();
    const [value, setValue] = useState<"loading" | number>(() => {
        props.events.fire("query_setting", {setting: "threshold-threshold"});
        return "loading";
    });

    const [currentDevice, setCurrentDevice] = useState<{ type: "none" } | { type: "device", deviceId: string }>({ type: "none" });
    const defaultDeviceId = useRef<string | undefined>();
    const [isVadActive, setVadActive] = useState(false);

    const changeCurrentDevice = (selected: SelectedMicrophone) => {
        switch (selected.type) {
            case "none":
                setCurrentDevice({ type: "none" });
                break;

            case "device":
                setCurrentDevice({ type: "device", deviceId: selected.deviceId });
                break;

            case "default":
                if(defaultDeviceId.current) {
                    setCurrentDevice({ type: "device", deviceId: defaultDeviceId.current });
                } else {
                    setCurrentDevice({ type: "none" });
                }
                break;

            default:
                throw tr("invalid device type");
        }
    }

    props.events.reactUse("notify_setting", event => {
        if (event.setting === "threshold-threshold") {
            refSlider.current?.setState({value: event.value});
            setValue(event.value);
        } else if (event.setting === "vad-type") {
            setVadActive(event.value === "threshold");
        }
    });

    props.events.reactUse("notify_devices", event => {
        if(event.status === "success") {
            const defaultDevice = event.devices.find(device => device.default);
            defaultDeviceId.current = defaultDevice?.id;
            changeCurrentDevice(event.selectedDevice);
        } else {
            defaultDeviceId.current = undefined;
            setCurrentDevice({ type: "none" });
        }
    });

    props.events.reactUse("notify_device_selected", event => changeCurrentDevice(event.device));

    let isActive = isVadActive && currentDevice.type === "device";
    return (
        <div className={cssStyle.containerSensitivity}>
            <div className={cssStyle.containerBar}>
                <ActivityBar events={props.events} deviceId={currentDevice.type === "device" ? currentDevice.deviceId : "none"} disabled={!isActive || !currentDevice} key={"activity-" + currentDevice} />
            </div>
            <Slider
                ref={refSlider}

                className={cssStyle.slider}
                classNameFiller={cssStyle.filler}

                minValue={0}
                maxValue={100}
                stepSize={1}
                value={value === "loading" ? 0 : value}
                unit={"%"}

                disabled={value === "loading" || !isActive}

                onChange={value => {
                    props.events.fire("action_set_setting", {setting: "threshold-threshold", value: value})
                }}
            />
        </div>
    )
};

const HelpText0 = () => (
    <HighlightText highlightId={"hs-0"} className={cssStyle.help}>
        <Translatable>
            Firstly we need to setup a microphone.<br/>
            Let me guide you thru the basic UI elements.<br/>
            <br/>
            To continue click anywhere on the screen.
        </Translatable>
    </HighlightText>
);

const HelpText1 = () => (
    <HighlightText highlightId={"hs-1"} className={cssStyle.help + " " + cssStyle.paddingTop}>
        <Translatable>
            All your available microphones are listed within this box.<br/>
            <br/>
            The currently selected microphone<br/>
            is marked with a green checkmark. To change the selected microphone<br/>
            just click on the new one.<br/>
            <br/>
            To continue click anywhere on the screen.
        </Translatable>
    </HighlightText>
);

const HelpText2 = () => (
    <HighlightText highlightId={"hs-2"} className={cssStyle.help + " " + cssStyle.paddingTop}>
        <a>
            <Translatable>TeaSpeak has three voice activity detection types:</Translatable>
        </a>
        <ol>
            <li>
                <Translatable>
                    To transmit audio data you'll have to<br/>
                    press a key. The key could be selected via the button right to the radio button
                </Translatable>
            </li>
            <li>
                <Translatable>
                    In this mode, TeaSpeak will continuously analyze your microphone input.
                    If the audio level is grater than a certain threshold,
                    the audio will be transmitted.
                    The threshold is changeable via the "Sensitivity Settings" slider
                </Translatable>
            </li>
            <li>
                <Translatable>Continuously transmit any audio data.</Translatable>
            </li>
        </ol>
        <a>
            <Translatable>
                Now you're ready to configure your microphone.<br/>
                Just click anywhere on the screen.
            </Translatable>
        </a>
    </HighlightText>
);

export const MicrophoneSettings = (props: { events: Registry<MicrophoneSettingsEvents> }) => {
    const [highlighted, setHighlighted] = useState(() => {
        props.events.fire("query_help");
        return undefined;
    });

    props.events.reactUse("notify_highlight", event => setHighlighted(event.field));

    return (
        <HighlightContainer highlightedId={highlighted} onClick={() => props.events.fire("action_help_click")}
                            classList={cssStyle.highlightContainer}>
            <div className={cssStyle.container}>
                <HelpText0/>
                <HighlightRegion className={cssStyle.left} highlightId={"hs-1"}>
                    <div className={cssStyle.header}>
                        <a><Translatable>Select your Microphone Device</Translatable></a>
                        <ListRefreshButton events={props.events}/>
                    </div>
                    <MicrophoneList events={props.events}/>
                    <HelpText2/>
                </HighlightRegion>
                <HighlightRegion className={cssStyle.right} highlightId={"hs-2"}>
                    <HelpText1/>
                    <div className={cssStyle.header}>
                        <a><Translatable>Microphone Settings</Translatable></a>
                    </div>
                    <div className={cssStyle.body}>
                        <VolumeSettings events={props.events}/>
                        <VadSelector events={props.events}/>
                    </div>
                    <div className={cssStyle.header}>
                        <a><Translatable>Sensitivity Settings</Translatable></a>
                    </div>
                    <div className={cssStyle.body}>
                        <ThresholdSelector events={props.events}/>
                    </div>
                    <div className={cssStyle.header}>
                        <a><Translatable>Advanced Settings</Translatable></a>
                    </div>
                    <div className={cssStyle.body}>
                        <div className={cssStyle.containerAdvanced}>
                            <PPTDelaySettings events={props.events}/>
                            <RNNoiseSettings events={props.events} />
                        </div>
                    </div>
                </HighlightRegion>
            </div>
        </HighlightContainer>
    );
}