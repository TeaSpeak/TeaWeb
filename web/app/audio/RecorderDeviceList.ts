import {
    AbstractDeviceList,
    DeviceListEvents,
    DeviceListState,
    IDevice,
    PermissionState
} from "tc-shared/audio/recorder";
import * as log from "tc-shared/log";
import {LogCategory} from "tc-shared/log";
import {Registry} from "tc-shared/events";
import {WebIDevice} from "tc-backend/web/audio/Recorder";
import * as loader from "tc-loader";
import {queryMediaPermissions} from "tc-shared/media/Stream";
import { tr } from "tc-shared/i18n/localize";

async function requestMicrophonePermissions() : Promise<PermissionState> {
    const begin = Date.now();
    try {
        await navigator.mediaDevices.getUserMedia({ audio: { deviceId: "default" }, video: false });
        return "granted";
    } catch (error) {
        const end = Date.now();
        const isSystem = (end - begin) < 250;
        log.debug(LogCategory.AUDIO, tr("Microphone device request took %d milliseconds. System answered: %s"), end - begin, isSystem);
        return "denied";
    }
}

export let inputDeviceList: WebInputDeviceList;
class WebInputDeviceList extends AbstractDeviceList {
    private devices: WebIDevice[];

    private deviceListQueryPromise: Promise<void>;

    constructor() {
        super();

        this.devices = [];
    }

    async initialize() {
        const result = await queryMediaPermissions("audio");
        if(typeof result === "boolean") {
            this.setPermissionState(result ? "granted" : "denied");
        }
    }

    getDefaultDeviceId(): string {
        return "default";
    }

    getDevices(): IDevice[] {
        return this.devices;
    }

    getEvents(): Registry<DeviceListEvents> {
        return this.events;
    }

    getStatus(): DeviceListState {
        return this.listState;
    }

    isRefreshAvailable(): boolean {
        return true;
    }

    refresh(askPermissions?: boolean): Promise<void> {
        return this.queryDevices(askPermissions === true);
    }

    async requestPermissions(): Promise<PermissionState> {
        if(this.permissionState !== "unknown")
            return this.permissionState;

        let result = await requestMicrophonePermissions();
        if(result === "granted" && this.listState === "no-permissions") {
            /* if called within doQueryDevices, queryDevices will just return the promise */
            this.queryDevices(false).then(() => {});
        }
        this.setPermissionState(result);
        return result;
    }

    private queryDevices(askPermissions: boolean) : Promise<void> {
        if(this.deviceListQueryPromise) {
            return this.deviceListQueryPromise;
        }

        this.deviceListQueryPromise = this.doQueryDevices(askPermissions).catch(error => {
            log.error(LogCategory.AUDIO, tr("Failed to query microphone devices (%o)"), error);

            if(this.listState !== "healthy") {
                this.setState("error");
            }
        }).then(() => {
            this.deviceListQueryPromise = undefined;
        });

        return this.deviceListQueryPromise;
    }

    private async doQueryDevices(askPermissions: boolean) {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let hasPermissions = devices.findIndex(e => e.label !== "") !== -1;

        if(!hasPermissions && askPermissions) {
            this.setState("no-permissions");

            /* request permissions */
            hasPermissions = await this.requestPermissions() === "granted";
            if(hasPermissions) {
                devices = await navigator.mediaDevices.enumerateDevices();
            }
        }
        if(hasPermissions) {
            this.setPermissionState("granted");
        }

        if(window.detectedBrowser?.name === "firefox") {
            devices = [{
                label: tr("Default Firefox device"),
                groupId: "default",
                deviceId: "default",
                kind: "audioinput",

                toJSON: undefined
            }];
        }

        const inputDevices = devices.filter(e => e.kind === "audioinput");

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

        this.events.fire("notify_list_updated", { addedDeviceCount: devicesAdded, removedDeviceCount: oldDeviceList.length });
        if(hasPermissions) {
            this.setState("healthy");
        } else {
            this.setState("no-permissions");
        }
    }
}

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    function: async () => {
        inputDeviceList = new WebInputDeviceList();
        await inputDeviceList.initialize();
    },
    priority: 80,
    name: "initialize media devices"
});

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    function: async () => {
        inputDeviceList.refresh(false).then(() => {});
    },
    priority: 10,
    name: "query media devices"
});