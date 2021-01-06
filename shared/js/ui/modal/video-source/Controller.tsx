import {Registry} from "tc-shared/events";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {ModalVideoSourceEvents} from "tc-shared/ui/modal/video-source/Definitions";
import {ModalVideoSource} from "tc-shared/ui/modal/video-source/Renderer";
import {getVideoDriver, VideoPermissionStatus, VideoSource} from "tc-shared/video/VideoSource";
import {LogCategory, logError, logWarn} from "tc-shared/log";
import {VideoBroadcastConfig, VideoBroadcastType} from "tc-shared/connection/VideoConnection";
import {Settings, settings} from "tc-shared/settings";
import {tr} from "tc-shared/i18n/localize";

export type VideoSourceModalAction = {
    mode: "select-quick",
    defaultDevice?: string
} | {
    mode: "select-default",
    defaultDevice?: string
} | {
    mode: "new"
} | {
    mode: "edit",
    source: VideoSource,
    broadcastConstraints: VideoBroadcastConfig
};

export type VideoSourceSelectResult = { source: VideoSource | undefined, config: VideoBroadcastConfig | undefined };

/**
 * @param type The video type which should be prompted
 * @param mode
 */
export async function spawnVideoSourceSelectModal(type: VideoBroadcastType, mode: VideoSourceModalAction) : Promise<VideoSourceSelectResult> {
    const controller = new VideoSourceController(type);

    let defaultSelectDevice: string | true;
    if(mode.mode === "select-quick") {
        /* We need the modal itself for the native client in order to present the window selector */
        if(type === "camera" || __build.target === "web") {
            /* Try to get the default device. If we succeeded directly return that */
            if(await controller.selectSource(mode.defaultDevice)) {
                /* select succeeded */
                const resultSource = controller.getCurrentSource()?.ref();
                const resultConstraints = controller.getBroadcastConstraints();
                controller.destroy();
                return {
                    source: resultSource,
                    config: resultConstraints
                };
            } else {
                /* Select failed. We'll open the modal and show the error. */
            }
        } else {
            defaultSelectDevice = mode.defaultDevice || true;
        }
    } else if(mode.mode === "select-default") {
        defaultSelectDevice = mode.defaultDevice || true;
    } else if(mode.mode === "edit") {
        await controller.useSettings(mode.source, mode.broadcastConstraints);
    }

    let result: VideoSourceSelectResult = {
        config: undefined,
        source: undefined
    };

    const modal = spawnReactModal(ModalVideoSource, controller.events, type, mode.mode === "edit");
    controller.events.on(["action_start", "action_cancel"], event => {
        result.source?.deref();
        if(event.type === "action_start") {
            result.source = controller.getCurrentSource()?.ref();
            result.config = controller.getBroadcastConstraints();
        } else {
            result.source = undefined;
            result.config = undefined;
        }
        modal.destroy();
    });

    modal.show().then(() => {
        if(defaultSelectDevice) {
            if(type === "screen" && getVideoDriver().screenQueryAvailable()) {
                controller.events.fire_react("action_toggle_screen_capture_device_select", { shown: true });
            } else {
                controller.selectSource(defaultSelectDevice === true ? undefined : defaultSelectDevice);
            }
        }
    });

    await new Promise(resolve => {
        if(mode.mode === "select-quick" && __build.target !== "web") {
            /* We need the modal event for quick select */
            const callbackRemove = controller.events.on("notify_video_preview", event => {
                if(event.status.status === "error") {
                    callbackRemove();
                }

                if(event.status.status === "preview") {
                    /* we've successfully selected something */
                    modal.destroy();
                }
            });
        }

        modal.events.one(["destroy", "close"], resolve);
    });

    controller.destroy();
    return result;
}

function updateBroadcastConfigFromSource(source: VideoSource, constraints: VideoBroadcastConfig) {
    const videoTrack = source.getStream().getVideoTracks()[0];
    const trackSettings = videoTrack.getSettings();

    constraints.width = trackSettings.width;
    constraints.height = trackSettings.height;
    constraints.maxFrameRate = trackSettings.frameRate;
}

async function generateAndApplyDefaultConfig(source: VideoSource) : Promise<VideoBroadcastConfig> {
    const videoTrack = source.getStream().getVideoTracks()[0];

    let maxHeight = settings.static_global(Settings.KEY_VIDEO_DEFAULT_MAX_HEIGHT);
    let maxWidth = settings.static_global(Settings.KEY_VIDEO_DEFAULT_MAX_WIDTH);

    const trackSettings = videoTrack.getSettings();
    const capabilities = source.getCapabilities();

    maxHeight = Math.min(maxHeight, capabilities.maxHeight);
    maxWidth = Math.min(maxWidth, capabilities.maxWidth);

    /* FIXME: Get these values somewhere else! */
    const broadcastConstraints: VideoBroadcastConfig = {
        maxBandwidth: 1_600_000,
        keyframeInterval: 0
    } as VideoBroadcastConfig;

    {
        let ratio = 1;

        if(trackSettings.height > maxHeight) {
            ratio = Math.min(maxHeight / trackSettings.height, ratio);
        }

        if(trackSettings.width > maxWidth) {
            ratio = Math.min(maxWidth / trackSettings.width, ratio);
        }

        if(ratio !== 1) {
            broadcastConstraints.width = Math.ceil(ratio * trackSettings.width);
            broadcastConstraints.height = Math.ceil(ratio * trackSettings.height);
        } else {
            broadcastConstraints.width = trackSettings.width;
            broadcastConstraints.height = trackSettings.height;
        }
    }

    broadcastConstraints.dynamicQuality = settings.static_global(Settings.KEY_VIDEO_DYNAMIC_QUALITY);
    broadcastConstraints.dynamicFrameRate = settings.static_global(Settings.KEY_VIDEO_DYNAMIC_FRAME_RATE);

    try {
        await applyBroadcastConfig(source, broadcastConstraints);
    } catch (error) {
        logWarn(LogCategory.VIDEO, tr("Failed to apply initial default broadcast config: %o"), error);
    }

    updateBroadcastConfigFromSource(source, broadcastConstraints);

    return broadcastConstraints;
}

/* May throws an overconstraint error */
async function applyBroadcastConfig(source: VideoSource, constraints: VideoBroadcastConfig) {
    const videoTrack = source.getStream().getVideoTracks()[0];
    if(!videoTrack) { return; }

    await videoTrack.applyConstraints({
        frameRate: constraints.dynamicFrameRate ? {
            min: 1,
            max: constraints.maxFrameRate,
            ideal: constraints.maxFrameRate
        } : constraints.maxFrameRate,

        width: constraints.dynamicQuality ? {
            min: 1,
            max: constraints.width,
            ideal: constraints.width
        } : constraints.width,

        height: constraints.dynamicQuality ? {
            min: 1,
            max: constraints.height,
            ideal: constraints.height
        } : constraints.height
    });
}

class VideoSourceController {
    readonly events: Registry<ModalVideoSourceEvents>;
    private readonly type: VideoBroadcastType;

    private currentSource: VideoSource | string;
    private currentConstraints: VideoBroadcastConfig;

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
        this.events.on("query_setting_bitrate_max", () => this.notifySettingBitrate());
        this.events.on("query_setting_keyframe_sender", () => this.notifySettingKeyframeInterval());

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

        this.events.on("action_setting_dimension", event => {
            this.currentConstraints.height = event.height;
            this.currentConstraints.width = event.width;
        });

        this.events.on("action_setting_framerate", event => {
            this.currentConstraints.maxFrameRate = event.frameRate;
        });

        this.events.on("action_setting_bitrate_max", event => {
            this.currentConstraints.maxBandwidth = event.bitrate;
        });

        this.events.on("action_setting_keyframe_sender", event => {
            this.currentConstraints.keyframeInterval = event.interval;
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

    async setCurrentSource(source: VideoSource | string | undefined) {
        if(typeof this.currentSource === "object") {
            this.currentSource.deref();
        }

        if(typeof source === "object") {
            if(this.currentConstraints) {
                try {
                    /* TODO: Automatically scale down resolution if new one isn't capable of supplying our current resolution */
                    await applyBroadcastConfig(source, this.currentConstraints);
                } catch (error) {
                    logWarn(LogCategory.VIDEO, tr("Failed to apply broadcast constraints to new source: %o"), error);
                    this.currentConstraints = undefined;
                }
            }

            if(!this.currentConstraints) {
                this.currentConstraints = await generateAndApplyDefaultConfig(source);
            }
        }

        this.currentSource = source;
        this.notifyVideoPreview();
        this.notifyStartButton();
        this.notifyCurrentSource();
        this.notifySettingDimension();
        this.notifySettingFramerate();
        this.notifySettingBitrate();
        this.notifySettingKeyframeInterval();
    }

    async useSettings(source: VideoSource, constraints: VideoBroadcastConfig) {
        if(typeof this.currentSource === "object") {
            this.currentSource.deref();
        }

        this.currentSource = source.ref();
        this.currentConstraints = constraints;
        this.notifyVideoPreview();
        this.notifyStartButton();
        this.notifyCurrentSource();
        this.notifySettingDimension();
        this.notifySettingFramerate();
        this.notifySettingBitrate();
        this.notifySettingKeyframeInterval();
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
            await this.setCurrentSource(stream);
            this.fallbackCurrentSourceName = stream?.getName() || tr("No stream");

            return !!stream;
        } catch (error) {
            this.fallbackCurrentSourceName = tr("failed to attach to device");
            if(typeof error === "string") {
                await this.setCurrentSource(error);
            } else {
                logError(LogCategory.GENERAL, tr("Failed to open capture device %s: %o"), sourceId, error);
                await this.setCurrentSource(tr("Failed to open capture device (Lookup the console)"));
            }

            return false;
        }
    }

    getCurrentSource() : VideoSource | undefined {
        return typeof this.currentSource === "object" ? this.currentSource : undefined;
    }

    getBroadcastConstraints() : VideoBroadcastConfig {
        return this.currentConstraints;
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

    private notifyScreenCaptureDevices() {
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

    private notifyVideoPreview() {
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

    private notifyCurrentSource() {
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

    private notifySettingDimension() {
        if(typeof this.currentSource === "object") {
            const initialSettings = this.currentSource.getInitialSettings();
            const capabilities = this.currentSource.getCapabilities();
            const constraints = this.currentConstraints;

            this.events.fire_react("notify_setting_dimension", {
                setting: {
                    minWidth: capabilities.minWidth,
                    maxWidth: capabilities.maxWidth,

                    minHeight: capabilities.minHeight,
                    maxHeight: capabilities.maxHeight,

                    originalWidth: initialSettings.width,
                    originalHeight: initialSettings.height,

                    currentWidth: constraints.width,
                    currentHeight: constraints.height
                }
            });
        } else {
            this.events.fire_react("notify_setting_dimension", { setting: undefined });
        }
    };

    notifySettingFramerate() {
        if(typeof this.currentSource === "object") {
            const initialSettings = this.currentSource.getInitialSettings();
            const capabilities = this.currentSource.getCapabilities();

            const round = (value: number) => Math.round(value * 100) / 100;
            this.events.fire_react("notify_settings_framerate", {
                frameRate: {
                    min: round(capabilities.minFrameRate),
                    max: round(capabilities.maxFrameRate),
                    original: round(initialSettings.frameRate),
                    current: round(this.currentConstraints.maxFrameRate)
                }
            });
        } else {
            this.events.fire_react("notify_settings_framerate", { frameRate: undefined });
        }
    };

    private notifySettingBitrate() {
        if(this.currentConstraints) {
            this.events.fire_react("notify_setting_bitrate_max", {
                bitrate: {
                    allowedBitrate: 0,
                    bitrate: this.currentConstraints.maxBandwidth
                }
            });
        } else {
            this.events.fire_react("notify_setting_bitrate_max",  undefined);
        }
    }

    private notifySettingKeyframeInterval() {
        this.events.fire_react("notify_settings_keyframe_sender", {
            interval: this.currentConstraints?.keyframeInterval || 0
        });
    }
}