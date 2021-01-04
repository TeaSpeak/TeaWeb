import {Registry} from "tc-shared/events";
import * as React from "react";
import {
    DeviceListResult,
    ModalVideoSourceEvents, ScreenCaptureDeviceList, SettingBitrate, SettingFrameRate,
    VideoPreviewStatus, VideoSourceState
} from "tc-shared/ui/modal/video-source/Definitions";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable, VariadicTranslatable} from "tc-shared/ui/react-elements/i18n";
import {BoxedInputField, Select} from "tc-shared/ui/react-elements/InputField";
import {Button} from "tc-shared/ui/react-elements/Button";
import {useContext, useEffect, useRef, useState} from "react";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";
import {Slider} from "tc-shared/ui/react-elements/Slider";
import {Checkbox} from "tc-shared/ui/react-elements/Checkbox";
import {Tab, TabEntry} from "tc-shared/ui/react-elements/Tab";
import {LoadingDots} from "tc-shared/ui/react-elements/LoadingDots";
import {ScreenCaptureDevice} from "tc-shared/video/VideoSource";
import {useTr} from "tc-shared/ui/react-elements/Helper";

const cssStyle = require("./Renderer.scss");
const ModalEvents = React.createContext<Registry<ModalVideoSourceEvents>>(undefined);
const AdvancedSettings = React.createContext<boolean>(false);
const kNoDeviceId = "__no__device";

const VideoSourceSelector = () => {
    const events = useContext(ModalEvents);
    const [ deviceList, setDeviceList ] = useState<DeviceListResult | "loading">(() => {
        events.fire("query_device_list");
        return "loading";
    });

    events.reactUse("notify_device_list", event => setDeviceList(event.status));

    if(deviceList === "loading") {
        return (
            <div className={cssStyle.sectionBody} key={"loading"}>
                <Select type={"boxed"} disabled={true}>
                    <option>{tr("loading ...")}</option>
                </Select>
            </div>
        );
    } else if(deviceList.status === "error") {
        let message;
        switch (deviceList.reason) {
            case "no-permissions":
                message = tr("Missing device query permissions");
                break;

            case "request-permissions":
                message = tr("Please grant video device permissions");
                break;

            case "custom":
                message = tr("An error happened");
                break;
        }
        return (
            <div className={cssStyle.sectionBody} key={"error"}>
                <Select type={"boxed"} disabled={true} className={cssStyle.selectError}>
                    <option>{message}</option>
                </Select>
            </div>
        );
    } else {
        return (
            <div className={cssStyle.sectionBody} key={"normal"}>
                <Select
                    type={"boxed"}
                    value={deviceList.selectedDeviceId || kNoDeviceId}
                    onChange={event => events.fire("action_select_source", { id: event.target.value })}
                >
                    <option key={kNoDeviceId} value={kNoDeviceId} style={{ display: "none" }}>{tr("No device")}</option>
                    {deviceList.devices.map(device => <option value={device.id} key={device.id}>{device.displayName}</option>)}
                    {deviceList.devices.findIndex(device => device.id === deviceList.selectedDeviceId) === -1 ?
                        <option key={"selected-device-" + deviceList.selectedDeviceId} style={{ display: "none" }} value={deviceList.selectedDeviceId}>
                            {deviceList.fallbackSelectedDeviceName}
                        </option> :
                        undefined
                    }
                </Select>
            </div>
        );
    }
};

const VideoSourceRequester = () => {
    const events = useContext(ModalEvents);
    const [ source, setSource ] = useState<VideoSourceState>(() => {
        events.fire("query_source");
        return { type: "none" };
    });
    events.reactUse("notify_source", event => setSource(event.state), undefined, []);

    let info;
    switch (source.type) {
        case "selected":
            let name = source.name === "Screen" ? source.deviceId : source.name;
            info = (
                <div className={cssStyle.info + " " + cssStyle.selected} key={"selected"}>
                    <VariadicTranslatable text={"Selected source: {}"}>{name || source.deviceId}</VariadicTranslatable>
                </div>
            );
            break;

        case "errored":
            info = (
                <div className={cssStyle.info + " " + cssStyle.error} key={"errored"}>
                    {source.error}
                </div>
            );
            break;

        case "none":
            info = (
                <div className={cssStyle.info + " " + cssStyle.none} key={"none"}>
                    <Translatable>No source has been selected</Translatable>
                </div>
            );
            break;
    }

    return (
        <div className={cssStyle.sectionBody} key={"normal"}>
            <div className={cssStyle.sourcePrompt}>
                <Button type={"small"} onClick={() => events.fire("action_select_source", { id: undefined })}>
                    <Translatable>Select source</Translatable>
                </Button>
                {info}
            </div>
        </div>
    );
};

const VideoPreviewMessage = (props: { message: any, kind: "info" | "error" }) => {
    return (
        <div className={cssStyle.overlay + " " + (props.message ? cssStyle.shown : "")}>
            <div className={cssStyle[props.kind]}>
                {props.message}
            </div>
        </div>
    );
}

const VideoRequestPermissions = (props: { systemDenied: boolean }) => {
    const events = useContext(ModalEvents);

    let body;
    let button;
    if(props.systemDenied) {
        body = (
            <div className={cssStyle.text} key={"system-denied"}>
                <Translatable>Camara access has been denied by your browser.<br />Please allow camara access in order to broadcast video.</Translatable>
            </div>
        );
        button = <Translatable key={"retry"}>Retry to query</Translatable>;
    } else {
        body = (
            <div className={cssStyle.text} key={"user-denied"}>
                <Translatable>In order to be able to broadcast video,<br /> you have to allow camara access.</Translatable>
            </div>
        );
        button = <Translatable key={"request"}>Request permissions</Translatable>;
    }
    return (
        <div className={cssStyle.overlay + " " + cssStyle.shown + " " + cssStyle.permissions}>
            {body}
            <Button
                type={"normal"}
                color={"green"}
                className={cssStyle.button}
                onClick={() => events.fire("action_request_permissions")}
            >
                {button}
            </Button>
        </div>
    );
}

const VideoPreview = () => {
    const events = useContext(ModalEvents);

    const refVideo = useRef<HTMLVideoElement>();
    const [ status, setStatus ] = useState<VideoPreviewStatus | "loading">(() => {
        events.fire("query_video_preview");
        return "loading";
    });

    events.reactUse("notify_video_preview", event => {
        setStatus(event.status);
    });

    let body;
    if(status === "loading") {
        /* Nothing to show */
    } else {
        switch (status.status) {
            case "none":
                body = <VideoPreviewMessage message={tr("No video source")} kind={"info"} key={"none"} />;
                break;
            case "error":
                if(status.reason === "no-permissions" || status.reason === "request-permissions") {
                    body = <VideoRequestPermissions systemDenied={status.reason === "no-permissions"} key={"permissions"} />;
                } else {
                    body = <VideoPreviewMessage message={status.message} kind={"error"} key={"error"} />;
                }
                break;

            case "preview":
                body = (
                    <video
                        key={"preview"}
                        ref={refVideo}
                        autoPlay={true}
                    />
                )
                break;
        }
    }

    useEffect(() => {
        const stream = status !== "loading" && status.status === "preview" && status.stream;
        if(stream && refVideo.current) {
            refVideo.current.srcObject = stream;
        }
    }, [status !== "loading" && status.status === "preview" && status.stream])

    return (
        <div className={cssStyle.body}>
            <div className={cssStyle.videoContainer}>
                {body}
            </div>
        </div>
    );
}

const ButtonStart = (props: { editMode: boolean }) => {
    const events = useContext(ModalEvents);
    const [ enabled, setEnabled ] = useState(() => {
        events.fire("query_start_button");
        return false;
    });

    events.reactUse("notify_start_button", event => setEnabled(event.enabled));
    return (
        <Button
            type={"small"}
            color={"green"}
            disabled={!enabled}
            onClick={() => enabled && events.fire("action_start")}
        >
            {props.editMode ? <Translatable key={"edit"}>Apply Changed</Translatable> : <Translatable key={"start"}>Start</Translatable>}
        </Button>
    );
}

type DimensionPresetId = "480p" | "720p" | "1080p" | "2160p";
const DimensionPresets: {[T in DimensionPresetId]: {
    name: string,
    width: number,
    height: number
}} = {
    "480p": {
        name: "480p",
        width: 640,
        height: 480
    },
    "720p": {
        name: "720p",
        width: 1280,
        height: 720
    },
    "1080p": {
        name: "Full HD",
        width: 1920,
        height: 1080
    },
    "2160p": {
        name: "4k UHD",
        width: 3840,
        height: 2160
    }
};

type SettingDimensionValues = {
    minWidth: number,
    maxWidth: number,

    minHeight: number,
    maxHeight: number,

    originalHeight: number,
    originalWidth: number
}

const SettingDimension = () => {
    const events = useContext(ModalEvents);
    const advanced = useContext(AdvancedSettings);

    const [ settings, setSettings ] = useState<SettingDimensionValues | undefined>(() => {
        events.fire("query_setting_dimension");
        return undefined;
    });
    events.reactUse("notify_setting_dimension", event => {
        if(event.setting) {
            setSettings({
                minWidth: event.setting.minWidth,
                minHeight: event.setting.minHeight,

                maxWidth: event.setting.maxWidth,
                maxHeight: event.setting.maxHeight,

                originalHeight: event.setting.originalHeight,
                originalWidth: event.setting.originalWidth
            });

            setWidth(event.setting.currentWidth);
            setHeight(event.setting.currentHeight);
            refSliderWidth.current?.setState({ value: event.setting.currentWidth });
            refSliderHeight.current?.setState({ value: event.setting.currentHeight });
            setSelectValue("current");
        } else {
            setSettings(undefined);
            setSelectValue("no-source");
        }
    }, undefined, []);

    const [ width, setWidth ] = useState(1);
    const [ height, setHeight ] = useState(1);
    const [ selectValue, setSelectValue ] = useState("no-source");

    const [ aspectRatio, setAspectRatio ] = useState(true);

    const refSliderWidth = useRef<Slider>();
    const refSliderHeight = useRef<Slider>();

    const bounds = (id: DimensionPresetId) => {
        const dimension = DimensionPresets[id];
        let scale = Math.min(dimension.height / settings.maxHeight, dimension.width / settings.maxWidth);
        return [Math.ceil(settings.maxWidth * scale), Math.ceil(settings.maxHeight * scale)];
    }

    const boundsString = (id: DimensionPresetId) => {
        const value = bounds(id);
        return value[0] + "x" + value[1];
    }

    const updateHeight = (newHeight: number, triggerUpdate: boolean) => {
        let newWidth = width;

        setHeight(newHeight);
        if(aspectRatio) {
            newWidth = Math.ceil(settings.originalWidth * (newHeight / settings.originalHeight));
            setWidth(newWidth);
            refSliderWidth.current?.setState({ value: newWidth });
        }

        if(triggerUpdate) {
            events.fire("action_setting_dimension", { height: newHeight, width: newWidth });
        }
    }

    const updateWidth = (newWidth: number, triggerUpdate: boolean) => {
        let newHeight = height;

        setWidth(newWidth);
        if(aspectRatio) {
            newHeight = Math.ceil(settings.originalHeight * (newWidth / settings.originalWidth));
            setHeight(newHeight);
            refSliderHeight.current?.setState({ value: newHeight });
        }

        if(triggerUpdate) {
            events.fire("action_setting_dimension", { height: newHeight, width: newWidth });
        }
    }

    return (
        <div className={cssStyle.setting + " " + cssStyle.dimensions}>
            <div className={cssStyle.title}>
                <div><Translatable>Dimension</Translatable></div>
                <div>{settings ? width + "x" + height : ""}</div>
            </div>
            <div className={cssStyle.body}>
                <Select
                    type={"boxed"}
                    onChange={event => {
                        const value = event.target.value;

                        setSelectValue(value);

                        let newWidth, newHeight;
                        if(value === "original") {
                            newWidth = settings.originalWidth;
                            newHeight = settings.originalHeight;
                        } else if(value === "custom") {
                            /* nothing to do; no need to trigger an update as well */
                            return;
                        } else if(DimensionPresets[value]) {
                            const val = bounds(value as any);
                            newWidth = val[0];
                            newHeight = val[1];
                        }

                        setWidth(newWidth);
                        setHeight(newHeight);
                        refSliderWidth.current?.setState({ value: newWidth });
                        refSliderHeight.current?.setState({ value: newHeight });

                        events.fire("action_setting_dimension", { height: newHeight, width: newWidth });
                    }}
                    value={selectValue}
                    disabled={!settings}
                >
                    {Object.keys(DimensionPresets).filter(e => {
                        if(!settings) { return false; }
                        if(DimensionPresets[e].height < settings.minHeight || DimensionPresets[e].height > settings.maxHeight) { return false; }
                        return !(DimensionPresets[e].width < settings.minWidth || DimensionPresets[e].width > settings.maxWidth);
                    }).map(dimensionId =>
                        <option value={dimensionId} key={dimensionId}>{DimensionPresets[dimensionId].name + " (" + boundsString(dimensionId as any) + ")"}</option>
                    )}
                    <option value={"original"} key={"original"}>{tr("Default")} ({(settings ? settings.originalWidth + "x" + settings.originalHeight : "0x0")})</option>
                    <option value={"current"} key={"current"} style={{ display: "none" }}>{width + "x" + height}</option>
                    <option value={"custom"} key={"custom"} style={{ display: advanced ? undefined : "none" }}>{tr("Custom")}</option>
                    <option value={"no-source"} key={"no-source"} style={{ display: "none" }}>{tr("No source selected")}</option>
                </Select>
                <div className={cssStyle.advanced + " " + (advanced ? cssStyle.shown : "")}>
                    <div className={cssStyle.aspectRatio}>
                        <Checkbox
                            label={<Translatable>Aspect ratio</Translatable>}
                            disabled={selectValue !== "custom" || !settings}
                            value={aspectRatio}
                            onChange={value => setAspectRatio(value)}
                        />
                    </div>
                    <div className={cssStyle.sliderTitle}>
                        <div><Translatable>Width</Translatable></div>
                        <div>{settings ? width + "px" : ""}</div>
                    </div>
                    <Slider tooltip={null} minValue={settings ? settings.minWidth : 0} maxValue={settings ? settings.maxWidth : 1}
                            stepSize={1} value={width} className={cssStyle.slider}
                            onInput={value => updateWidth(value, false)}
                            disabled={selectValue !== "custom" || !settings}
                            onChange={value => updateWidth(value, true)}
                            ref={refSliderWidth}
                    />
                    <div className={cssStyle.sliderTitle}>
                        <div><Translatable>Height</Translatable></div>
                        <div>{settings ? height + "px" : ""}</div>
                    </div>
                    <Slider tooltip={null} minValue={settings ? settings.minHeight : 0} maxValue={settings ? settings.maxHeight : 1}
                            stepSize={1} value={height} className={cssStyle.slider}
                            onInput={value => updateHeight(value, false)}
                            onChange={value => updateHeight(value, true)}
                            disabled={selectValue !== "custom" || !settings}
                            ref={refSliderHeight}
                    />
                </div>
            </div>
        </div>
    );
}

const FrameRatePresents = {
    "10": 10,
    "20": 20,
    "24 NTSC": 24,
    "25 PAL": 25,
    "29.97": 29.97,
    "30": 30,
    "48": 48,
    "50 PAL": 50,
    "59.94": 59.94,
    "60": 60
}

const SettingFramerate = () => {
    const events = useContext(ModalEvents);

    const [ frameRate, setFrameRate ] = useState<SettingFrameRate | undefined>(() => {
        events.fire("query_setting_framerate");
        return undefined;
    });
    const [ currentRate, setCurrentRate ] = useState(0);
    const [ selectedValue, setSelectedValue ] = useState("original");

    events.reactUse("notify_settings_framerate", event => {
        setFrameRate(event.frameRate);
        setCurrentRate(event.frameRate ? event.frameRate.original : 1);
        if(event.frameRate) {
            setSelectedValue(event.frameRate.current.toString());
        } else {
            setSelectedValue("no-source");
        }
    });

    const FrameRates = Object.assign({}, FrameRatePresents);
    if(frameRate) {
        if(Object.keys(FrameRates).findIndex(key => FrameRates[key] === frameRate.original) === -1) {
            FrameRates[frameRate.original.toString()] = frameRate.original;
        }
        if(Object.keys(FrameRates).findIndex(key => FrameRates[key] === frameRate.current) === -1) {
            FrameRates[frameRate.current.toString()] = frameRate.current;
        }
    }

    return (
        <div className={cssStyle.setting + " " + cssStyle.dimensions}>
            <div className={cssStyle.title}>
                <div><Translatable>Framerate</Translatable></div>
                <div>{frameRate ? currentRate : ""}</div>
            </div>
            <div className={cssStyle.body}>
                <Select
                    type={"boxed"}
                    disabled={!frameRate}
                    value={selectedValue}
                    onChange={event => {
                        const value = parseFloat(event.target.value);
                        if(!isNaN(value)) {
                            setSelectedValue(event.target.value);
                            setCurrentRate(value);

                            events.fire("action_setting_framerate", { frameRate: value });
                        }
                    }}
                >
                    {Object.keys(FrameRates).sort((a, b) => FrameRates[a] - FrameRates[b]).filter(key => {
                        if(!frameRate) { return false; }

                        const value = FrameRates[key];
                        if(frameRate.min > value) { return false; }
                        return frameRate.max >= value;
                    }).map(key => (
                        <option value={FrameRates[key]} key={key}>{key}</option>
                    ))}
                    <option value={"1"} key={"no-source"} style={{ display: "none" }}>{tr("No source selected")}</option>
                </Select>
            </div>
        </div>
    );
}

const SettingBps = () => {
    const events = useContext(ModalEvents);

    const [ bitrate, setBitrate ] = useState<SettingBitrate | undefined>(() => {
        events.fire("query_setting_bitrate_max");
        return undefined;
    });
    events.reactUse("notify_setting_bitrate_max", event => {
        setBitrate(event.bitrate);
        setCurrentValue(undefined);
    });

    const [ currentValue, setCurrentValue ] = useState<string>(undefined);

    const advanced = useContext(AdvancedSettings);
    if(!advanced) {
        return null;
    }

    return (
        <div className={cssStyle.setting + " " + cssStyle.dimensions}>
            <div className={cssStyle.title}>
                <div><Translatable>Bitrate</Translatable></div>
                <div>{bitrate ? (bitrate.bitrate / 1000).toFixed() + " kbps" : ""}</div>
            </div>
            <div className={cssStyle.body}>
                <BoxedInputField
                    value={bitrate ? typeof currentValue === "string" ? currentValue : (bitrate.bitrate / 1000).toFixed(0) : " "}
                    placeholder={tr("loading")}
                    onChange={value => {
                        const numValue = (parseInt(value) * 1000) || 0;
                        bitrate.bitrate = numValue;
                        events.fire("action_setting_bitrate_max", { bitrate: numValue });
                        setCurrentValue(undefined);
                    }}
                    onInput={value => setCurrentValue(value)}
                    type={"number"}
                />
            </div>
        </div>
    );
}

const calculateBps = (width: number, height: number, frameRate: number) => {
    /* Based on the tables showed here: http://www.lighterra.com/papers/videoencodingh264/ */
    const estimatedBitsPerPixed = 3.9;
    return estimatedBitsPerPixed * width * height * (frameRate / 30);
}

const BpsInfo = React.memo(() => {
    const events = useContext(ModalEvents);

    const [ dimensions, setDimensions ] = useState<{ width: number, height: number } | undefined>(undefined);
    const [ frameRate, setFrameRate ] = useState<number | undefined>(undefined);

    events.reactUse("notify_setting_dimension", event => setDimensions(event.setting ? {
        height: event.setting.currentHeight,
        width: event.setting.currentWidth
    } : undefined));

    events.reactUse("notify_settings_framerate", event => setFrameRate(event.frameRate ? event.frameRate.original : undefined))

    events.reactUse("action_setting_dimension", event => setDimensions({ width: event.width, height: event.height }));
    events.reactUse("action_setting_framerate", event => setFrameRate(event.frameRate));

    let bpsText;
    if(dimensions && frameRate) {
        const bps = calculateBps(dimensions.width, dimensions.height, frameRate);
        if(bps > 1000 * 1000) {
            bpsText = (bps / 1000 / 1000).toFixed(2) + " MBits/Second";
        } else {
            bpsText = (bps / 1000).toFixed(2) + " KBits/Second";
        }
    }

    return (
        <div className={cssStyle.setting + " " + cssStyle.bpsInfo}>
            <div className={cssStyle.title}>
                <div><Translatable>Estimated Bitrate</Translatable></div>
                <div>{bpsText}</div>
            </div>
            <div className={cssStyle.body}>
                <Translatable>
                    This is a rough estimate of the bitrate used to transfer video of that quality.
                    The real bitrate might have higher peaks but averages below the estimate.
                    Influential factors are the video size as well as the frame rate.
                </Translatable>
            </div>
        </div>
    );
});

const Settings = React.memo(() => {
    if(window.detectedBrowser.name === "firefox") {
        /* Firefox does not seem to give a fuck about any of our settings */
        return null;
    }

    const [ advanced, setAdvanced ] = useState(false);

    return (
        <AdvancedSettings.Provider value={advanced}>
            <div className={cssStyle.section + " " + cssStyle.columnSettings}>
                <div className={cssStyle.sectionHead}>
                    <div className={cssStyle.title}><Translatable>Settings</Translatable></div>
                    <div className={cssStyle.advanced}>
                        <Checkbox label={<Translatable>Advanced</Translatable>} onChange={value => setAdvanced(value)} />
                    </div>
                </div>
                <div className={cssStyle.sectionBody}>
                    <SettingDimension />
                    <SettingFramerate />
                    <SettingBps />
                    <BpsInfo />
                </div>
            </div>
        </AdvancedSettings.Provider>
    );
})

const ScreenCaptureDeviceRenderer = React.memo((props: { device: ScreenCaptureDevice, selected: boolean }) => {
    const events = useContext(ModalEvents);

    return (
        <div
            className={cssStyle.screenDeviceEntry + " " + (props.selected ? cssStyle.selected : undefined)}
            onClick={() => events.fire_react("action_preselect_screen_capture_device", { deviceId: props.device.id })}
            onDoubleClick={() => {
                events.fire("action_toggle_screen_capture_device_select", { shown: false });
                events.fire("action_select_source", { id: props.device.id })
            }}
        >
            <div className={cssStyle.preview}>
                <img src={props.device.appPreview} alt={tr("Preview image")} />
            </div>
            <div className={cssStyle.name} title={props.device.name || props.device.id}>{props.device.name || props.device.id}</div>
        </div>
    )
});

const ScreenCaptureDeviceSelectTag = React.memo((props: { data: ScreenCaptureDeviceList, type: "full-screen" | "window", selectedDevice: string }) => {
    let body;
    switch (props.data.status) {
        case "loading":
            body = (
                <div className={cssStyle.overlay} key={"loading"}>
                    <a><Translatable>loading</Translatable> <LoadingDots /></a>
                </div>
            );
            break;

        case "error":
        case "not-supported":
            let message = props.data.status === "error" ? props.data.reason : tr("Not supported");
            body = (
                <div className={cssStyle.overlay + " " + cssStyle.error} key={"error"}><a>{message}</a></div>
            );
            break;

        case "success":
            let devices =  props.data.devices
                .filter(e => e.type === props.type);
            if(devices.length === 0) {
                body = (
                    <div className={cssStyle.overlay} key={"no-devices"}>
                        <a><Translatable>No sources</Translatable></a>
                    </div>
                );
            } else {
                body = devices
                    .map(e => <ScreenCaptureDeviceRenderer device={e} key={e.id} selected={e.id === props.selectedDevice} />);
            }
            break;
    }

    return (
        <div className={cssStyle.listContainer}>{body}</div>
    );
})

const ScreenCaptureDeviceSelectList = React.memo(() => {
    const events = useContext(ModalEvents);
    const refUpdateTimer = useRef<number>(undefined);

    const [ list, setList ] = useState<ScreenCaptureDeviceList>(() => {
        events.fire("query_screen_capture_devices");
        return { status: "loading" };
    });
    events.reactUse("notify_screen_capture_devices", event => {
        setList(event.devices);
        if(!refUpdateTimer.current) {
            refUpdateTimer.current = setTimeout(() => {
                refUpdateTimer.current = undefined;
                events.fire("query_screen_capture_devices");
            }, 500);
        }
    }, undefined, []);
    useEffect(() => () => clearTimeout(refUpdateTimer.current), []);

    const [ selectedDevice, setSelectedDevice ] = useState(undefined);
    events.reactUse("action_preselect_screen_capture_device", event => setSelectedDevice(event.deviceId), undefined, []);

    return (
        <Tab defaultTab={"screen"} className={cssStyle.tab}>
            <TabEntry id={"screen"}>
                <Translatable>Full Screen</Translatable>
                <ScreenCaptureDeviceSelectTag type={"full-screen"} data={list} selectedDevice={selectedDevice} />
            </TabEntry>
            <TabEntry id={"window"}>
                <Translatable>Window</Translatable>
                <ScreenCaptureDeviceSelectTag type={"window"} data={list} selectedDevice={selectedDevice} />
            </TabEntry>
        </Tab>
    );
});

const SelectSourceButton = () => {
    const events = useContext(ModalEvents);
    const [ selectedDevice, setSelectedDevice ] = useState(undefined);
    events.reactUse("action_preselect_screen_capture_device", event => setSelectedDevice(event.deviceId), undefined, []);

    return (
        <Button type={"small"} color={"green"} disabled={!selectedDevice} onClick={() => {
            events.fire("action_toggle_screen_capture_device_select", { shown: false });
            events.fire("action_select_source", { id: selectedDevice })
        }}>
            <Translatable>Select Source</Translatable>
        </Button>
    );
}

const ScreenCaptureDeviceSelect = React.memo(() => {
    const events = useContext(ModalEvents);
    const [ shown, setShown ] = useState(() => {
        return false;
    });

    events.reactUse("action_toggle_screen_capture_device_select", event => {
        setShown(event.shown);
    });

    if(!shown) {
        return null;
    }

    return (
        <div className={cssStyle.overlayScreenDeviceList} key={"shown"}>
            <div className={cssStyle.sectionHead + " " + cssStyle.title}>
                <Translatable>Select your source</Translatable>
            </div>
            <div className={cssStyle.sectionBody}>
                <ScreenCaptureDeviceSelectList />
            </div>
            <div className={cssStyle.buttons}>
                <Button type={"small"} color={"red"} onClick={() => events.fire("action_toggle_screen_capture_device_select", { shown: false })}>
                    <Translatable>Cancel</Translatable>
                </Button>
                <SelectSourceButton />
            </div>
        </div>
    )
});

export class ModalVideoSource extends InternalModal {
    protected readonly events: Registry<ModalVideoSourceEvents>;
    private readonly sourceType: VideoBroadcastType;
    private readonly editMode: boolean;

    constructor(events: Registry<ModalVideoSourceEvents>, type: VideoBroadcastType, editMode: boolean) {
        super();

        this.sourceType = type;
        this.events = events;
        this.editMode = editMode;
    }

    renderBody(): React.ReactElement {
        return (
            <ModalEvents.Provider value={this.events}>
                <div className={cssStyle.container}>
                    <div className={cssStyle.content}>
                        <div className={cssStyle.columnSource}>
                            <div className={cssStyle.section}>
                                <div className={cssStyle.sectionHead + " " + cssStyle.title}>
                                    <Translatable>Select your source</Translatable>
                                </div>
                                {this.sourceType === "camera" ? <VideoSourceSelector key={"source-selector"} /> : <VideoSourceRequester key={"source-requester"} />}
                            </div>
                            <div className={cssStyle.section}>
                                <div className={cssStyle.sectionHead + " " + cssStyle.title}>
                                    <Translatable>Video preview</Translatable>
                                </div>
                                <div className={cssStyle.sectionBody}>
                                    <VideoPreview />
                                </div>
                            </div>
                        </div>
                        <Settings />
                    </div>
                    <div className={cssStyle.buttons}>
                        <Button type={"small"} color={"red"} onClick={() => this.events.fire("action_cancel")}>
                            <Translatable>Cancel</Translatable>
                        </Button>
                        <ButtonStart editMode={this.editMode} />
                    </div>
                </div>
                <ScreenCaptureDeviceSelect />
            </ModalEvents.Provider>
        );
    }

    title(): string | React.ReactElement<Translatable> {
        return <Translatable>Start video Broadcasting</Translatable>;
    }
}

