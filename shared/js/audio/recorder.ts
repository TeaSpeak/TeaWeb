import {AbstractInput, LevelMeter} from "tc-shared/voice/RecorderBase";
import {Registry} from "tc-shared/events";

export type DeviceQueryResult = {}

export interface AudioRecorderBacked {
    createInput() : AbstractInput;
    createLevelMeter(device: IDevice) : Promise<LevelMeter>;

    getDeviceList() : DeviceList;
}

export interface DeviceListEvents {
    /*
     * Should only trigger if the list really changed.
     */
    notify_list_updated: {
        removedDeviceCount: number,
        addedDeviceCount: number
    },

    notify_state_changed: {
        oldState: DeviceListState;
        newState: DeviceListState;
    },

    notify_permissions_changed: {
        oldState: PermissionState,
        newState: PermissionState
    }
}

export type DeviceListState = "healthy" | "uninitialized" | "no-permissions" | "error";

export interface IDevice {
    deviceId: string;

    driver: string;
    name: string;
}
export namespace IDevice {
    export const NoDeviceId = "none";
    export const DefaultDeviceId = "default";
}

export type PermissionState = "granted" | "denied" | "unknown";

export interface DeviceList {
    getEvents() : Registry<DeviceListEvents>;

    isRefreshAvailable() : boolean;
    refresh() : Promise<void>;

    /* implicitly update our own permission state */
    requestPermissions() : Promise<PermissionState>;
    getPermissionState() : PermissionState;

    getStatus() : DeviceListState;
    getDevices() : IDevice[];

    getDefaultDeviceId() : string;

    awaitHealthy(): Promise<void>;
    awaitInitialized() : Promise<void>;
}

export abstract class AbstractDeviceList implements DeviceList {
    protected readonly events: Registry<DeviceListEvents>;
    protected listState: DeviceListState;
    protected permissionState: PermissionState;

    protected constructor() {
        this.events = new Registry<DeviceListEvents>();
        this.permissionState = "unknown";
        this.listState = "uninitialized";
    }

    getStatus(): DeviceListState {
        return this.listState;
    }

    getPermissionState(): PermissionState {
        return this.permissionState;
    }

    protected setState(state: DeviceListState) {
        if(this.listState === state)
            return;

        const oldState = this.listState;
        this.listState = state;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: state });
    }

    protected setPermissionState(state: PermissionState) {
        if(this.permissionState === state)
            return;

        const oldState = this.permissionState;
        this.permissionState = state;
        this.events.fire("notify_permissions_changed", { oldState: oldState, newState: state });
    }

    awaitInitialized(): Promise<void> {
        if(this.listState !== "uninitialized")
            return Promise.resolve();

        return new Promise<void>(resolve => {
            const callback = (event: DeviceListEvents["notify_state_changed"]) => {
                if(event.newState === "uninitialized")
                    return;

                this.events.off("notify_state_changed", callback);
                resolve();
            };
            this.events.on("notify_state_changed", callback);
        });
    }

    awaitHealthy(): Promise<void> {
        if(this.listState === "healthy")
            return Promise.resolve();

        return new Promise<void>(resolve => {
            const callback = (event: DeviceListEvents["notify_state_changed"]) => {
                if(event.newState !== "healthy")
                    return;

                this.events.off("notify_state_changed", callback);
                resolve();
            };
            this.events.on("notify_state_changed", callback);
        });
    }

    abstract getDefaultDeviceId(): string;
    abstract getDevices(): IDevice[];
    abstract getEvents(): Registry<DeviceListEvents>;
    abstract isRefreshAvailable(): boolean;
    abstract refresh(): Promise<void>;
    abstract requestPermissions(): Promise<PermissionState>;
}

let recorderBackend: AudioRecorderBacked;

export function getRecorderBackend() : AudioRecorderBacked {
    if(typeof recorderBackend === "undefined")
        throw tr("the recorder backend hasn't been set yet");

    return recorderBackend;
}

export function setRecorderBackend(instance: AudioRecorderBacked) {
    if(typeof recorderBackend !== "undefined")
        throw tr("a recorder backend has already been initialized");

    recorderBackend = instance;
}
