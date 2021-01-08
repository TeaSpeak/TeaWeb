import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {AbstractInput, LevelMeter} from "../voice/RecorderBase";
import {Registry} from "../events";
import {Settings, settings} from "tc-shared/settings";

export type DeviceQueryResult = {}

export interface AudioRecorderBacked {
    createInput() : AbstractInput;
    createLevelMeter(device: IDevice) : Promise<LevelMeter>;

    getDeviceList() : DeviceList;

    isRnNoiseSupported() : boolean;
    toggleRnNoise(target: boolean);
}

export interface DeviceListEvents {
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
        if(this.listState === state) {
            return;
        }

        const oldState = this.listState;
        this.listState = state;
        this.events.fire("notify_state_changed", { oldState: oldState, newState: state });
    }

    protected setPermissionState(state: PermissionState) {
        if(this.permissionState === state) {
            return;
        }

        const oldState = this.permissionState;
        this.permissionState = state;
        this.events.fire("notify_permissions_changed", { oldState: oldState, newState: state });
    }

    awaitInitialized(): Promise<void> {
        if(this.listState !== "uninitialized") {
            return Promise.resolve();
        }

        return new Promise<void>(resolve => {
            const callback = (event: DeviceListEvents["notify_state_changed"]) => {
                if(event.newState === "uninitialized") {
                    return;
                }

                this.events.off("notify_state_changed", callback);
                resolve();
            };

            this.events.on("notify_state_changed", callback);
        });
    }

    awaitHealthy(): Promise<void> {
        if(this.listState === "healthy") {
            return Promise.resolve();
        }

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
    if(typeof recorderBackend === "undefined") {
        throw tr("the recorder backend hasn't been set yet");
    }

    return recorderBackend;
}

export function setRecorderBackend(instance: AudioRecorderBacked) {
    if(typeof recorderBackend !== "undefined") {
        throw tr("a recorder backend has already been initialized");
    }

    recorderBackend = instance;
}

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "audio filter init",
    priority: 10,
    function: async () => {
        const backend = getRecorderBackend();
        if(backend.isRnNoiseSupported()) {
            getRecorderBackend().toggleRnNoise(settings.static_global(Settings.KEY_RNNOISE_FILTER));
            settings.globalChangeListener(Settings.KEY_RNNOISE_FILTER, value => getRecorderBackend().toggleRnNoise(value));
        }
    }
})