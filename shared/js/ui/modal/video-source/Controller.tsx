import {Registry} from "tc-shared/events";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ModalVideoSourceEvents} from "tc-shared/ui/modal/video-source/Definitions";
import {ModalVideoSource} from "tc-shared/ui/modal/video-source/Renderer";
import {getVideoDriver, VideoPermissionStatus, VideoSource} from "tc-shared/video/VideoSource";
import {LogCategory, logError} from "tc-shared/log";

type VideoSourceRef = { source: VideoSource };
export async function spawnVideoSourceSelectModal() : Promise<VideoSource> {
    const refSource: VideoSourceRef = {
        source: undefined
    };

    const events = new Registry<ModalVideoSourceEvents>();
    events.enableDebug("video-source-select");
    initializeController(events, refSource);

    const modal = spawnReactModal(ModalVideoSource, events);
    modal.events.on("destroy", () => {
        events.fire("notify_destroy");
        events.destroy();
    });
    events.on(["action_start", "action_cancel"], () => {
        modal.destroy();
    });
    modal.show().then(undefined);

    await new Promise(resolve => {
        modal.events.one(["destroy", "close"], resolve);
    });

    return refSource.source;
}

function initializeController(events: Registry<ModalVideoSourceEvents>, currentSourceRef: VideoSourceRef) {
    let currentSource: VideoSource | string;
    let currentSourceId: string;
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

    const notifyCurrentSource = () => {
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

    const setCurrentSource = (source: VideoSource | string | undefined) => {
        if(typeof currentSource === "object") {
            currentSource.deref();
        }

        if(typeof source === "object") {
            currentSourceRef.source = source;
        }

        currentSource = source;
        notifyCurrentSource();
        notifyStartButton();
    }

    events.on("query_device_list", () => notifyDeviceList());
    events.on("query_video_preview", () => notifyCurrentSource());
    events.on("query_start_button", () => notifyStartButton());

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

        currentSourceId = event.id;
        fallbackCurrentSourceName = tr("loading...");
        notifyDeviceList();

        driver.createVideoSource(event.id).then(stream => {
            setCurrentSource(stream);
            fallbackCurrentSourceName = stream.getName();
        }).catch(error => {
            fallbackCurrentSourceName = "invalid device";
            if(typeof error === "string") {
                setCurrentSource(error);
            } else {
                logError(LogCategory.GENERAL, tr("Failed to open video device %s: %o"), event.id, error);
                setCurrentSource(tr("Failed to open video device (Lookup the console)"));
            }
        });
    });

    events.on("action_cancel", () => {
        if(typeof currentSource === "object") {
            currentSourceRef.source = undefined;
            currentSource.deref();
        }
    });

    events.on("notify_destroy", getVideoDriver().getEvents().on("notify_permissions_changed", () => {
        if(getVideoDriver().getPermissionStatus() !== VideoPermissionStatus.Granted) {
            currentSourceId = undefined;
            fallbackCurrentSourceName = undefined;
            notifyDeviceList();

            /* implicitly updates the start button */
            setCurrentSource(undefined);
        } else {
            notifyDeviceList();
            notifyCurrentSource();
            notifyStartButton();
        }
    }));

    events.on("notify_destroy", () => {
        if(typeof currentSource === "object" && currentSourceRef.source !== currentSource) {
            currentSource.deref();
        }
    });
}