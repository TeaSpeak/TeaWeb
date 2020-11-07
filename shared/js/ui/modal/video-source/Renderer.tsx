import {Registry} from "tc-shared/events";
import * as React from "react";
import {
    DeviceListResult,
    ModalVideoSourceEvents,
    VideoPreviewStatus
} from "tc-shared/ui/modal/video-source/Definitions";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {Select} from "tc-shared/ui/react-elements/InputField";
import {Button} from "tc-shared/ui/react-elements/Button";
import {useContext, useEffect, useRef, useState} from "react";

const cssStyle = require("./Renderer.scss");
const ModalEvents = React.createContext<Registry<ModalVideoSourceEvents>>(undefined);
const kNoDeviceId = "__no__device";

const VideoSourceBody = () => {
    const events = useContext(ModalEvents);
    const [ deviceList, setDeviceList ] = useState<DeviceListResult | "loading">(() => {
        events.fire("query_device_list");
        return "loading";
    });

    events.reactUse("notify_device_list", event => setDeviceList(event.status));

    if(deviceList === "loading") {
        return (
            <div className={cssStyle.body} key={"loading"}>
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
            <div className={cssStyle.body} key={"error"}>
                <Select type={"boxed"} disabled={true} className={cssStyle.selectError}>
                    <option>{message}</option>
                </Select>
            </div>
        );
    } else {
        return (
            <div className={cssStyle.body} key={"normal"}>
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

const ButtonStart = () => {
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
            <Translatable>Start</Translatable>
        </Button>
    );
}

export class ModalVideoSource extends InternalModal {
    protected readonly events: Registry<ModalVideoSourceEvents>;

    constructor(events: Registry<ModalVideoSourceEvents>) {
        super();

        this.events = events;
    }

    renderBody(): React.ReactElement {
        return (
            <ModalEvents.Provider value={this.events}>
                <div className={cssStyle.container}>
                    <div className={cssStyle.content}>
                        <div className={cssStyle.section}>
                            <div className={cssStyle.head}>
                                <Translatable>Select your source</Translatable>
                            </div>
                            <VideoSourceBody />
                        </div>
                        <div className={cssStyle.section}>
                            <div className={cssStyle.head}>
                                <Translatable>Video preview</Translatable>
                            </div>
                            <div className={cssStyle.body}>
                                <VideoPreview />
                            </div>
                        </div>
                        { /* TODO: All the overlays */ }
                    </div>
                    <div className={cssStyle.buttons}>
                        <Button type={"small"} color={"red"} onClick={() => this.events.fire("action_cancel")}>
                            <Translatable>Cancel</Translatable>
                        </Button>
                        <ButtonStart />
                    </div>
                </div>
            </ModalEvents.Provider>
        );
    }

    title(): string | React.ReactElement<Translatable> {
        return <Translatable>Start video Broadcasting</Translatable>;
    }
}

