import {Registry} from "tc-shared/events";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ModalVideoSourceEvents} from "tc-shared/ui/modal/video-source/Definitions";
import {ModalVideoSource} from "tc-shared/ui/modal/video-source/Renderer";
import {getVideoDriver, VideoPermissionStatus, VideoSource} from "tc-shared/video/VideoSource";
import {LogCategory, logError} from "tc-shared/log";
import {VideoBroadcastType} from "tc-shared/connection/VideoConnection";

type SourceConstraints = { width?: number, height?: number, frameRate?: number };

/**
 * @param type The video type which should be prompted
 * @param selectMode
 * @param defaultDeviceId
 */
export async function spawnVideoSourceSelectModal(type: VideoBroadcastType, selectMode: "quick" | "default" | "none", defaultDeviceId?: string) : Promise<VideoSource> {
    const controller = new VideoSourceController(type);

    let defaultSelectSource = selectMode === "default";
    if(selectMode === "quick") {
        /* We need the modal itself for the native client in order to present the window selector */
        if(type === "camera" || __build.target === "web") {
            /* Try to get the default device. If we succeeded directly return that */
            if(await controller.selectSource(defaultDeviceId)) {
                const source = controller.getCurrentSource()?.ref();
                controller.destroy();

                return source;
            }
        } else {
            defaultSelectSource = true;
        }
    }

    const modal = spawnReactModal(ModalVideoSource, controller.events, type);
    controller.events.on(["action_start", "action_cancel"], () => modal.destroy());

    modal.show().then(() => {
        if(defaultSelectSource) {
            if(type === "screen" && getVideoDriver().screenQueryAvailable()) {
                controller.events.fire_react("action_toggle_screen_capture_device_select", { shown: true });
            } else {
                controller.selectSource(defaultDeviceId);
            }
        }
    });

    let refSource: { source: VideoSource } = { source: undefined };
    controller.events.on("action_start", () => {
        refSource.source?.deref();
        refSource.source = controller.getCurrentSource()?.ref();
    });

    await new Promise(resolve => {
        if(defaultSelectSource && selectMode === "quick") {
            const callbackRemove = controller.events.on("notify_video_preview", event => {
                if(event.status.status === "error") {
                    callbackRemove();
                }

                if(event.status.status === "preview") {
                    /* we've successfully selected something */
                    refSource.source = controller.getCurrentSource()?.ref();
                    modal.hide();
                    modal.destroy();
                }
            });
        }

        modal.events.one(["destroy", "close"], resolve);
    });

    controller.destroy();
    return refSource.source;
}

class VideoSourceController {
    readonly events: Registry<ModalVideoSourceEvents>;
    private readonly type: VideoBroadcastType;

    private currentSource: VideoSource | string;
    private currentConstraints: SourceConstraints;

    /* preselected current source id */
    private currentSourceId: string;

    /* fallback current source name if "currentSource" is empty */
    private fallbackCurrentSourceName: string;

    constructor(type: VideoBroadcastType) {
        this.type = type;
        this.events = new Registry<ModalVideoSourceEvents>();
        this.events.enableDebug("video-source-select");


        this.events.on("query_source", () => this.notifyCurrentSource());
        this.events.on("query_device_list", () => this.notifyDeviceList());
        this.events.on("query_screen_capture_devices", () => this.notifyScreenCaptureDevices());
        this.events.on("query_video_preview", () => this.notifyVideoPreview());
        this.events.on("query_start_button", () => this.notifyStartButton());
        this.events.on("query_setting_dimension", () => this.notifySettingDimension());
        this.events.on("query_setting_framerate", () => this.notifySettingFramerate());

        this.events.on("action_request_permissions", () => {
            getVideoDriver().requestPermissions().then(result => {
                if(typeof result === "object") {
                    this.currentSourceId = result.getId() + " --";
                    this.fallbackCurrentSourceName = result.getName();
                    this.notifyDeviceList();

                    this.setCurrentSource(result);
                } else {
                    /* the device list will already be updated due to the notify_permissions_changed event */
                }
            });
        });

        this.events.on("action_select_source", event => {
            const driver = getVideoDriver();

            if(type === "camera") {
                this.currentSourceId = event.id;
                this.fallbackCurrentSourceName = tr("loading...");
                this.notifyDeviceList();

                driver.createVideoSource(this.currentSourceId).then(stream => {
                    this.fallbackCurrentSourceName = stream.getName();
                    this.setCurrentSource(stream);
                }).catch(error => {
                    this.fallbackCurrentSourceName = "invalid device";
                    if(typeof error === "string") {
                        this.setCurrentSource(error);
                    } else {
                        logError(LogCategory.GENERAL, tr("Failed to open video device %s: %o"), event.id, error);
                        this.setCurrentSource(tr("Failed to open video device (Lookup the console)"));
                    }
                });
            } else if(driver.screenQueryAvailable() && typeof event.id === "undefined") {
                this.events.fire_react("action_toggle_screen_capture_device_select", { shown: true });
            } else {
                this.currentSourceId = undefined;
                this.fallbackCurrentSourceName = tr("loading...");
                driver.createScreenSource(event.id, false).then(stream => {
                    this.setCurrentSource(stream);
                    this.fallbackCurrentSourceName = stream?.getName() || tr("No stream");
                }).catch(error => {
                    this.fallbackCurrentSourceName = "screen capture failed";
                    if(typeof error === "string") {
                        this.setCurrentSource(error);
                    } else {
                        logError(LogCategory.GENERAL, tr("Failed to open screen capture device %s: %o"), event.id, error);
                        this.setCurrentSource(tr("Failed to open screen capture device (Lookup the console)"));
                    }
                });
            }
        });

        this.events.on("action_cancel", () => {
            this.setCurrentSource(undefined);
        });

        if(type === "camera") {
            /* only the camara requires a device list */
            this.events.on("notify_destroy", getVideoDriver().getEvents().on("notify_permissions_changed", () => {
                if(getVideoDriver().getPermissionStatus() !== VideoPermissionStatus.Granted) {
                    this.currentSourceId = undefined;
                    this.fallbackCurrentSourceName = undefined;
                    this.notifyDeviceList();

                    /* implicitly updates the start button */
                    this.setCurrentSource(undefined);
                } else {
                    this.notifyDeviceList();
                    this.notifyVideoPreview();
                    this.notifyStartButton();
                }
            }));
        }

        const applyConstraints = async () => {
            if(typeof this.currentSource === "object") {
                const videoTrack = this.currentSource.getStream().getVideoTracks()[0];
                if(!videoTrack) { return; }

                await videoTrack.applyConstraints(this.currentConstraints);
            }
        };

        this.events.on("action_setting_dimension", event => {
            this.currentConstraints.height = event.height;
            this.currentConstraints.width = event.width;
            applyConstraints().then(undefined);
        });

        this.events.on("action_setting_framerate", event => {
            this.currentConstraints.frameRate = event.frameRate;
            applyConstraints().then(undefined);
        });
    }

    destroy() {
        if(typeof this.currentSource === "object") {
            this.currentSource.deref();
            this.currentSource = undefined;
        }

        this.events.fire("notify_destroy");
        this.events.destroy();
    }

    setCurrentSource(source: VideoSource | string | undefined) {
        if(typeof this.currentSource === "object") {
            this.currentSource.deref();
        }

        this.currentConstraints = {};
        this.currentSource = source;
        this.notifyVideoPreview();
        this.notifyStartButton();
        this.notifyCurrentSource();
        this.notifySettingDimension();
        this.notifySettingFramerate();
    }

    async selectSource(sourceId: string) : Promise<boolean> {
        const driver = getVideoDriver();

        let streamPromise: Promise<VideoSource>;
        if(this.type === "camera") {
            this.currentSourceId = sourceId;
            this.fallbackCurrentSourceName = tr("loading...");
            this.notifyDeviceList();

            streamPromise = driver.createVideoSource(this.currentSourceId);
        } else if(driver.screenQueryAvailable() && typeof sourceId === "undefined") {
            /* TODO: What the hack is this?! */
            this.events.fire_react("action_toggle_screen_capture_device_select", { shown: true });
            return;
        } else {
            this.currentSourceId = undefined;
            this.fallbackCurrentSourceName = tr("loading...");
            streamPromise = driver.createScreenSource(sourceId, false);
        }

        try {
            const stream = await streamPromise;
            this.setCurrentSource(stream);
            this.fallbackCurrentSourceName = stream?.getName() || tr("No stream");

            return !!stream;
        } catch (error) {
            this.fallbackCurrentSourceName = tr("failed to attach to device");
            if(typeof error === "string") {
                this.setCurrentSource(error);
            } else {
                logError(LogCategory.GENERAL, tr("Failed to open capture device %s: %o"), sourceId, error);
                this.setCurrentSource(tr("Failed to open capture device (Lookup the console)"));
            }

            return false;
        }
    }

    getCurrentSource() : VideoSource | undefined {
        return typeof this.currentSource === "object" ? this.currentSource : undefined;
    }

    private notifyStartButton() {
        this.events.fire_react("notify_start_button", { enabled: typeof this.currentSource === "object" })
    }

    private notifyDeviceList(){
        const driver = getVideoDriver();
        driver.getDevices().then(devices => {
            if(devices === false) {
                if(driver.getPermissionStatus() === VideoPermissionStatus.SystemDenied) {
                    this.events.fire_react("notify_device_list", { status: { status: "error", reason: "no-permissions" } });
                } else {
                    this.events.fire_react("notify_device_list", { status: { status: "error", reason: "request-permissions" } });
                }
            } else {
                this.events.fire_react("notify_device_list", {
                    status: {
                        status: "success",
                        devices: devices.map(e => { return { id: e.id, displayName: e.name }}),
                        selectedDeviceId: this.currentSourceId,
                        fallbackSelectedDeviceName: this.fallbackCurrentSourceName
                    }
                });
            }
        });
    }

    private notifyScreenCaptureDevices(){
        const driver = getVideoDriver();
        driver.queryScreenCaptureDevices().then(devices => {
            this.events.fire_react("notify_screen_capture_devices", { devices: { status: "success", devices: devices }});
        }).catch(error => {
            if(typeof error !== "string") {
                logError(LogCategory.VIDEO, tr("Failed to query screen capture devices: %o"), error);
                error = tr("lookup the console");
            }

            this.events.fire_react("notify_screen_capture_devices", { devices: { status: "error", reason: error }});
        })
    }

    private notifyVideoPreview(){
        const driver = getVideoDriver();
        switch (driver.getPermissionStatus()) {
            case VideoPermissionStatus.SystemDenied:
                this.events.fire_react("notify_video_preview", { status: { status: "error", reason: "no-permissions" }});
                break;
            case VideoPermissionStatus.UserDenied:
                this.events.fire_react("notify_video_preview", { status: { status: "error", reason: "request-permissions" }});
                break;
            case VideoPermissionStatus.Granted:
                if(typeof this.currentSource === "string") {
                    this.events.fire_react("notify_video_preview", { status: {
                        status: "error",
                        reason: "custom",
                        message: this.currentSource
                    }});
                } else if(this.currentSource) {
                    this.events.fire_react("notify_video_preview", { status: {
                        status: "preview",
                        stream: this.currentSource.getStream()
                    }});
                } else {
                    this.events.fire_react("notify_video_preview", { status: { status: "none" }});
                }
                break;
        }
    };

    private notifyCurrentSource(){
        if(typeof this.currentSource === "object") {
            this.events.fire_react("notify_source", {
                state: {
                    type: "selected",
                    deviceId: this.currentSource.getId(),
                    name: this.currentSource?.getName() || this.fallbackCurrentSourceName
                }
            });
        } else if(typeof this.currentSource === "string") {
            this.events.fire_react("notify_source", {
                state: {
                    type: "errored",
                    error: this.currentSource
                }
            });
        } else {
            this.events.fire_react("notify_source", {
                state: {
                    type: "none"
                }
            });
        }
    }

    private notifySettingDimension(){
        if(typeof this.currentSource === "object") {
            const videoTrack = this.currentSource.getStream().getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = "getCapabilities" in videoTrack ? videoTrack.getCapabilities() : undefined;

            this.events.fire_react("notify_setting_dimension", {
                setting: {
                    minWidth: capabilities?.width ? capabilities.width.min : 1,
                    maxWidth: capabilities?.width ? capabilities.width.max : settings.width,

                    minHeight: capabilities?.height ? capabilities.height.min : 1,
                    maxHeight: capabilities?.height ? capabilities.height.max : settings.height,

                    originalWidth: settings.width,
                    originalHeight: settings.height,

                    currentWidth: settings.width,
                    currentHeight: settings.height
                }
            });
        } else {
            this.events.fire_react("notify_setting_dimension", { setting: undefined });
        }
    };

    notifySettingFramerate() {
        if(typeof this.currentSource === "object") {
            const videoTrack = this.currentSource.getStream().getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = "getCapabilities" in videoTrack ? videoTrack.getCapabilities() : undefined;

            const round = (value: number) => Math.round(value * 100) / 100;
            this.events.fire_react("notify_settings_framerate", {
                frameRate: {
                    min: round(capabilities?.frameRate ? capabilities.frameRate.min : 1),
                    max: round(capabilities?.frameRate ? capabilities.frameRate.max : settings.frameRate),
                    original: round(settings.frameRate)
                }
            });
        } else {
            this.events.fire_react("notify_settings_framerate", { frameRate: undefined });
        }
    };
}