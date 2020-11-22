import {Registry} from "tc-shared/events";

export interface VideoSource {
    getId() : string;
    getName() : string;

    getStream() : MediaStream;

    /** Add a new reference to this stream */
    ref() : this;

    /** Decrease the reference count. If it's zero, it will be automatically destroyed. */
    deref();
}

export enum VideoPermissionStatus {
    Granted,
    UserDenied,
    SystemDenied
}

export interface VideoDriverEvents {
    notify_permissions_changed: { oldStatus: VideoPermissionStatus, newStatus: VideoPermissionStatus },
    notify_device_list_changed: { devices: string[] }
}

export type VideoDevice = { id: string, name: string }

export interface VideoDriver {
    getEvents() : Registry<VideoDriverEvents>;
    getPermissionStatus() : VideoPermissionStatus;

    /**
     * Request permissions to access the video camara and device list.
     * When requesting permissions, we're actually requesting a media stream.
     * If the request succeeds, we're returning that media stream.
     */
    requestPermissions() : Promise<VideoSource | boolean>;
    getDevices() : Promise<VideoDevice[] | false>;

    /**
     * @throws a string if an error occurs
     * @returns A VideoSource on success with an initial ref count of one
     * Will throw a string on error
     */
    createVideoSource(id: string | undefined) : Promise<VideoSource>;

    /**
     * Create a source from the screen
     */
    createScreenSource() : Promise<VideoSource>;
}

let driverInstance: VideoDriver;
export function getVideoDriver() {
    return driverInstance;
}

export function setVideoDriver(driver: VideoDriver) {
    if(typeof driverInstance !== "undefined") {
        throw tr("A video driver has already be initiated");
    }

    driverInstance = driver;
}