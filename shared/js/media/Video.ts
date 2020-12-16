import {
    ScreenCaptureDevice,
    VideoDevice,
    VideoDriver,
    VideoDriverEvents,
    VideoPermissionStatus,
    VideoSource, VideoSourceCapabilities, VideoSourceInitialSettings
} from "tc-shared/video/VideoSource";
import {Registry} from "tc-shared/events";
import {MediaStreamRequestResult} from "tc-shared/voice/RecorderBase";
import {LogCategory, logDebug, logError, logWarn} from "tc-shared/log";
import {queryMediaPermissions, requestMediaStream, stopMediaStream} from "tc-shared/media/Stream";
import {tr} from "tc-shared/i18n/localize";

declare global {
    interface MediaDevices {
        getDisplayMedia(options?: any) : Promise<MediaStream>;
    }
}

function getStreamVideoDeviceId(stream: MediaStream) : string | undefined {
    const track = stream.getVideoTracks()[0];
    if(typeof track !== "object" || !("getCapabilities" in track)) { return undefined; }
    return track.getCapabilities()?.deviceId;
}

export class WebVideoDriver implements VideoDriver {
    private readonly events: Registry<VideoDriverEvents>;
    private currentPermissionStatus: VideoPermissionStatus;

    constructor() {
        this.events = new Registry<VideoDriverEvents>();
        this.currentPermissionStatus = VideoPermissionStatus.UserDenied;
    }

    private setPermissionStatus(status: VideoPermissionStatus) {
        if(this.currentPermissionStatus === status) {
            return;
        }

        const oldState = this.currentPermissionStatus;
        this.currentPermissionStatus = status;
        this.events.fire("notify_permissions_changed", { newStatus: status, oldStatus: oldState });
    }

    private async handleSystemPermissionState(state: PermissionState | undefined) {
        switch(state) {
            case "denied":
                this.setPermissionStatus(VideoPermissionStatus.SystemDenied);
                break;

            case "prompt":
                this.setPermissionStatus(VideoPermissionStatus.UserDenied);
                break;

            case "granted":
                this.setPermissionStatus(VideoPermissionStatus.Granted);
                break;

            default:
                /* this will query the initial permission state */
                if(await this.getDevices() === false) {
                    this.setPermissionStatus(VideoPermissionStatus.UserDenied);
                } else {
                    this.setPermissionStatus(VideoPermissionStatus.Granted);
                }
                break;
        }
    }

    async initialize() {
        if(window.detectedBrowser?.name === "firefox") {
            /* We've to do a normal request every time we want to access your camera. */
            this.setPermissionStatus(VideoPermissionStatus.Granted);
        } else {
            const permissionState = await queryMediaPermissions("video", newState => this.handleSystemPermissionState(newState));
            await this.handleSystemPermissionState(permissionState);
        }
    }

    async getDevices(): Promise<VideoDevice[] | false> {
        if(window.detectedBrowser?.name === "firefox") {
            return [{
                name: tr("Default Firefox device"),
                id: "default"
            }];
        }

        /* TODO: Cache query response */
        let devices = await navigator.mediaDevices.enumerateDevices();
        let hasPermissions = devices.findIndex(e => e.kind === "videoinput" && e.label !== "") !== -1 || devices.findIndex(e => e.kind === "videoinput") === -1;

        if(!hasPermissions) {
            return false;
        }

        const inputDevices = devices.filter(e => e.kind === "videoinput");
        /*
        const oldDeviceList = this.devices;
        this.devices = [];

        let devicesAdded = 0;
        for(const device of inputDevices) {
            const oldIndex = oldDeviceList.findIndex(e => e.deviceId === device.deviceId);
            if(oldIndex === -1) {
                devicesAdded++;
            } else {
                oldDeviceList.splice(oldIndex, 1);
            }

            this.devices.push({
                deviceId: device.deviceId,
                driver: "WebAudio",
                groupId: device.groupId,
                name: device.label
            });
        }
        */
        return inputDevices.map(info => {
            return {
                id: info.deviceId,
                name: info.label
            }
        });
    }

    async requestPermissions(): Promise<VideoSource | boolean> {
        const result = await requestMediaStream("default", undefined, "video");
        if(result === MediaStreamRequestResult.ENOTALLOWED) {
            this.setPermissionStatus(VideoPermissionStatus.UserDenied);
            return false;
        } else if(result === MediaStreamRequestResult.ESYSTEMDENIED) {
            this.setPermissionStatus(VideoPermissionStatus.SystemDenied);
            return false;
        }

        /* TODO: May update the device list? */
        this.setPermissionStatus(VideoPermissionStatus.Granted);
        if(result instanceof MediaStream) {
            let deviceId = getStreamVideoDeviceId(result);
            if(deviceId === undefined) {
                if(window.detectedBrowser?.name === "firefox") {
                    /*
                     * Firefox does not support "getCapabilities".
                     * Since FF also just support one device, we know how the device id;
                     */
                    deviceId = "default";
                } else {
                    /* We can't identify the underlying device. It's better to close than returning an unknown stream. */
                    stopMediaStream(result);
                    return true;
                }
            }

            const devices = await this.getDevices();
            const deviceIndex = devices === false ? -1 : devices.findIndex(e => e.id === deviceId);

            return new WebVideoSource(deviceId, deviceIndex === -1 ? tr("Unknown source") : (devices[deviceIndex] as VideoDevice).name, result);
        } else {
            return true;
        }
    }

    getEvents(): Registry<VideoDriverEvents> {
        return this.events;
    }

    getPermissionStatus(): VideoPermissionStatus {
        return this.currentPermissionStatus;
    }

    async createVideoSource(id: string | undefined): Promise<VideoSource> {
        const result = await requestMediaStream(id ? id : "default", undefined, "video");

        /*
         * If we've got denied of requesting a stream reset the state to not allowed.
         * This also applies to Firefox since the user has to manually update the flag after that.
         * Only the initial state for Firefox is and should be "Granted".
         */
        if(result === MediaStreamRequestResult.ENOTALLOWED) {
            this.setPermissionStatus(VideoPermissionStatus.UserDenied);
            throw tr("Device access has been denied");
        } else if(result === MediaStreamRequestResult.ESYSTEMDENIED) {
            this.setPermissionStatus(VideoPermissionStatus.SystemDenied);
            throw tr("Device access has been denied");
        }

        if(this.currentPermissionStatus !== VideoPermissionStatus.Granted) {
            /* TODO: May update the device list? */
            this.setPermissionStatus(VideoPermissionStatus.Granted);
        }

        if(result instanceof MediaStream) {
            const deviceId = getStreamVideoDeviceId(result);
            if(id === undefined && deviceId === undefined) {
                logWarn(LogCategory.GENERAL, tr("Requested default video source, but returned source is nothing."));
            } else if(deviceId === undefined) {
                /* Do nothing. We've to trust that the given track origins from the requested id. */
            } else if(id === undefined) {
                /* We requested the default id and received something */
            } else if(deviceId !== id) {
                logWarn(LogCategory.GENERAL, tr("Requested video source %s but received %s"), id, deviceId);
            } else {
                /* We're fine. We received the device we wanted. */
            }

            const devices = await this.getDevices();
            const deviceIndex = devices === false ? -1 : devices.findIndex(e => e.id === deviceId);

            return new WebVideoSource(id, deviceIndex === -1 ? tr("Unknown source") : (devices[deviceIndex] as VideoDevice).name, result);
        } else {
            throw tra("An unknown error happened while opening the device ({})", result);
        }
    }

    screenQueryAvailable(): boolean {
        return false;
    }

    async queryScreenCaptureDevices(): Promise<ScreenCaptureDevice[]> {
        throw tr("screen capture device query not supported");
    }

    async createScreenSource(_id: string | undefined, _allowFocusLoss: boolean): Promise<VideoSource> {
        try {
            const source = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: true });
            const videoTrack = source.getVideoTracks()[0];
            if(!videoTrack) {
                throw tr("missing video track");
            }

            logDebug(LogCategory.VIDEO, tr("Display media received with settings: %o"), videoTrack.getSettings());
            return new WebVideoSource(videoTrack.getSettings().deviceId, tr("Screen"), source);
        } catch (error) {
            logWarn(LogCategory.VIDEO, tr("Failed to create a screen source: %o"), error);
            if(error instanceof Error) {
                throw error.message;
            } else if(typeof error === "string") {
                throw error;
            } else {
                throw tr("Failed to create screen source");
            }
        }
    }
}

export class WebVideoSource implements VideoSource {
    private readonly deviceId: string;
    private readonly displayName: string;
    private readonly stream: MediaStream;
    private referenceCount = 1;

    private initialSettings: VideoSourceInitialSettings;

    constructor(deviceId: string, displayName: string, stream: MediaStream) {
        this.deviceId = deviceId;
        this.displayName = displayName;
        this.stream = stream;

        const settings = stream.getVideoTracks()[0].getSettings();
        this.initialSettings = {
            frameRate: settings.frameRate,
            height: settings.height,
            width: settings.width
        };
    }

    destroy() {
        stopMediaStream(this.stream);
    }

    getId(): string {
        return this.deviceId;
    }

    getName(): string {
        return this.displayName;
    }

    getStream(): MediaStream {
        return this.stream;
    }

    getInitialSettings(): VideoSourceInitialSettings {
        return this.initialSettings;
    }

    getCapabilities(): VideoSourceCapabilities {
        const videoTrack = this.stream.getVideoTracks()[0];
        const capabilities = "getCapabilities" in videoTrack ? videoTrack.getCapabilities() : undefined;

        return {
            minWidth: capabilities?.width?.min || 1,
            maxWidth: capabilities?.width?.max || this.initialSettings.width,

            minHeight: capabilities?.height?.min || 1,
            maxHeight: capabilities?.height?.max || this.initialSettings.height,

            minFrameRate: capabilities?.frameRate?.min || 1,
            maxFrameRate: capabilities?.frameRate?.max || this.initialSettings.frameRate
        };
    }

    deref() {
        this.referenceCount -= 1;

        if(this.referenceCount === 0) {
            this.destroy();
        } else if(this.referenceCount < 0) {
            logError(LogCategory.GENERAL, tr("Video source reference count went bellow zero! This indicates a critical system flaw."));
        }
    }

    ref() {
        if(this.referenceCount <= 0) {
            throw tr("the video stream has already been destroyed");
        }
        this.referenceCount++;
        return this;
    }
}