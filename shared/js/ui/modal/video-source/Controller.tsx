import {Registry} from "tc-shared/events";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ModalVideoSourceEvents} from "tc-shared/ui/modal/video-source/Definitions";
import {ModalVideoSource} from "tc-shared/ui/modal/video-source/Renderer";
import {getVideoDriver, VideoPermissionStatus, VideoSource} from "tc-shared/video/VideoSource";
import {LogCategory, logError} from "tc-shared/log";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

type VideoSourceRef = { source: VideoSource };
export async function spawnVideoSourceSelectModal(type: VideoBroadcastType, selectDefault: boolean) : Promise<VideoSource> {
    const refSource: VideoSourceRef = {
        source: undefined
    };

    const events = new Registry<ModalVideoSourceEvents>();
    events.enableDebug("video-source-select");
    initializeController(events, refSource, type);

    const modal = spawnReactModal(ModalVideoSource, events, type);
    modal.events.on("destroy", () => {
        events.fire("notify_destroy");
        events.destroy();
    });
    events.on(["action_start", "action_cancel"], () => {
        modal.destroy();
    });
    modal.show().then(() => {
        if(selectDefault) {
            events.fire("action_select_source", { id: undefined });
        }
    });

    await new Promise(resolve => {
        modal.events.one(["destroy", "close"], resolve);
    });

    return refSource.source;
}

type SourceConstraints = { width?: number, height?: number, frameRate?: number };

function initializeController(events: Registry<ModalVideoSourceEvents>, currentSourceRef: VideoSourceRef, type: VideoBroadcastType) {
    let currentSource: VideoSource | string;
    let currentConstraints: SourceConstraints;

    /* preselected current source id */
    let currentSourceId: string;
    /* fallback current source name if "currentSource" is empty */
    let fallbackCurrentSourceName: string;

    const notifyStartButton = () => {
        events.fire_react("notify_start_button", { enabled: typeof currentSource === "object" })
    };

    const notifyDeviceList = () => {
        const driver = getVideoDriver();
        driver.getDevices().then(devices => {
            if(devices === false) {
                if(driver.getPermissionStatus() === VideoPermissionStatus.SystemDenied) {
                    events.fire_react("notify_device_list", { status: { status: "error", reason: "no-permissions" } });
                } else {
                    events.fire_react("notify_device_list", { status: { status: "error", reason: "request-permissions" } });
                }
            } else {
                events.fire_react("notify_device_list", {
                    status: {
                        status: "success",
                        devices: devices.map(e => { return { id: e.id, displayName: e.name }}),
                        selectedDeviceId: currentSourceId,
                        fallbackSelectedDeviceName: fallbackCurrentSourceName
                    }
                });
            }
        });
    }

    const notifyVideoPreview = () => {
        const driver = getVideoDriver();
        switch (driver.getPermissionStatus()) {
            case VideoPermissionStatus.SystemDenied:
                events.fire_react("notify_video_preview", { status: { status: "error", reason: "no-permissions" }});
                break;
            case VideoPermissionStatus.UserDenied:
                events.fire_react("notify_video_preview", { status: { status: "error", reason: "request-permissions" }});
                break;
            case VideoPermissionStatus.Granted:
                if(typeof currentSource === "string") {
                    events.fire_react("notify_video_preview", { status: {
                            status: "error",
                            reason: "custom",
                            message: currentSource
                        }});
                } else if(currentSource) {
                    events.fire_react("notify_video_preview", { status: {
                            status: "preview",
                            stream: currentSource.getStream()
                        }});
                } else {
                    events.fire_react("notify_video_preview", { status: { status: "none" }});
                }
                break;
        }
    };

    const notifyCurrentSource = () => {
        if(typeof currentSource === "object") {
            events.fire_react("notify_source", {
                state: {
                    type: "selected",
                    deviceId: currentSource.getId(),
                    name: currentSource?.getName() || fallbackCurrentSourceName
                }
            });
        } else if(typeof currentSource === "string") {
            events.fire_react("notify_source", {
                state: {
                    type: "errored",
                    error: currentSource
                }
            });
        } else {
            events.fire_react("notify_source", {
                state: {
                    type: "none"
                }
            });
        }
    }

    const notifySettingDimension = () => {
        if(typeof currentSource === "object") {
            const videoTrack = currentSource.getStream().getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = videoTrack.getCapabilities();

            events.fire_react("notify_setting_dimension", {
                setting: {
                    minWidth: capabilities.width ? capabilities.width.min : settings.width,
                    maxWidth: capabilities.width ? capabilities.width.max : settings.width,

                    minHeight: capabilities.height ? capabilities.height.min : settings.height,
                    maxHeight: capabilities.height ? capabilities.height.max : settings.height,

                    originalWidth: settings.width,
                    originalHeight: settings.height,

                    currentWidth: settings.width,
                    currentHeight: settings.height
                }
            });
        } else {
            events.fire_react("notify_setting_dimension", { setting: undefined });
        }
    };

    const notifySettingFramerate = () => {
        if(typeof currentSource === "object") {
            const videoTrack = currentSource.getStream().getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = videoTrack.getCapabilities();

            const round = (value: number) => Math.round(value * 100) / 100;
            events.fire_react("notify_settings_framerate", {
                frameRate: {
                    min: round(capabilities.frameRate ? capabilities.frameRate.min : settings.frameRate),
                    max: round(capabilities.frameRate ? capabilities.frameRate.max : settings.frameRate),
                    original: round(settings.frameRate)
                }
            });
        } else {
            events.fire_react("notify_settings_framerate", { frameRate: undefined });
        }
    };

    const setCurrentSource = (source: VideoSource | string | undefined) => {
        if(typeof currentSource === "object") {
            currentSource.deref();
        }

        currentConstraints = {};
        currentSource = source;
        notifyVideoPreview();
        notifyStartButton();
        notifyCurrentSource();
        notifySettingDimension();
        notifySettingFramerate();
    }

    events.on("query_source", () => notifyCurrentSource());
    events.on("query_device_list", () => notifyDeviceList());
    events.on("query_video_preview", () => notifyVideoPreview());
    events.on("query_start_button", () => notifyStartButton());
    events.on("query_setting_dimension", () => notifySettingDimension());
    events.on("query_setting_framerate", () => notifySettingFramerate());

    events.on("action_request_permissions", () => {
        getVideoDriver().requestPermissions().then(result => {
            if(typeof result === "object") {
                currentSourceId = result.getId() + " --";
                fallbackCurrentSourceName = result.getName();
                notifyDeviceList();

                setCurrentSource(result);
            } else {
                /* the device list will already be updated due to the notify_permissions_changed event */
            }
        });
    });

    events.on("action_select_source", event => {
        const driver = getVideoDriver();

        if(type === "camera") {
            currentSourceId = event.id;
            fallbackCurrentSourceName = tr("loading...");
            notifyDeviceList();

            driver.createVideoSource(currentSourceId).then(stream => {
                fallbackCurrentSourceName = stream.getName();
                setCurrentSource(stream);
            }).catch(error => {
                fallbackCurrentSourceName = "invalid device";
                if(typeof error === "string") {
                    setCurrentSource(error);
                } else {
                    logError(LogCategory.GENERAL, tr("Failed to open video device %s: %o"), event.id, error);
                    setCurrentSource(tr("Failed to open video device (Lookup the console)"));
                }
            });
        } else {
            currentSourceId = undefined;
            fallbackCurrentSourceName = tr("loading...");
            driver.createScreenSource().then(stream => {
                setCurrentSource(stream);
                fallbackCurrentSourceName = stream.getName();
            }).catch(error => {
                fallbackCurrentSourceName = "screen capture failed";
                if(typeof error === "string") {
                    setCurrentSource(error);
                } else {
                    logError(LogCategory.GENERAL, tr("Failed to open screen capture device %s: %o"), event.id, error);
                    setCurrentSource(tr("Failed to open screen capture device (Lookup the console)"));
                }
            });
        }
    });

    events.on("action_cancel", () => {
        currentSourceRef.source = undefined;
    });

    if(type === "camera") {
        /* only the camara requires a device list */
        events.on("notify_destroy", getVideoDriver().getEvents().on("notify_permissions_changed", () => {
            if(getVideoDriver().getPermissionStatus() !== VideoPermissionStatus.Granted) {
                currentSourceId = undefined;
                fallbackCurrentSourceName = undefined;
                notifyDeviceList();

                /* implicitly updates the start button */
                setCurrentSource(undefined);
            } else {
                notifyDeviceList();
                notifyVideoPreview();
                notifyStartButton();
            }
        }));
    }

    events.on("notify_destroy", () => {
        if(typeof currentSource === "object") {
            currentSource.deref();
        }
    });

    events.on("action_start", () => {
        if(typeof currentSource === "object") {
            currentSourceRef.source = currentSource.ref();
        }
    })

    const applyConstraints = async () => {
        if(typeof currentSource === "object") {
            const videoTrack = currentSource.getStream().getVideoTracks()[0];
            if(!videoTrack) { return; }

            await videoTrack.applyConstraints(currentConstraints);
        }
    };

    events.on("action_setting_dimension", event => {
        currentConstraints.height = event.height;
        currentConstraints.width = event.width;
        applyConstraints().then(undefined);
    });

    events.on("action_setting_framerate", event => {
        currentConstraints.frameRate = event.frameRate;
        applyConstraints().then(undefined);
    });
}