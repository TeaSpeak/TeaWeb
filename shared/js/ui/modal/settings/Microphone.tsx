import * as aplayer from "tc-backend/audio/player";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {LevelMeter} from "tc-shared/voice/RecorderBase";
import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import {default_recorder} from "tc-shared/voice/RecorderProfile";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {MicrophoneSettings} from "tc-shared/ui/modal/settings/MicrophoneRenderer";
import {DeviceListState, getRecorderBackend, IDevice} from "tc-shared/audio/recorder";

export type MicrophoneSetting = "volume" | "vad-type" | "ppt-key" | "ppt-release-delay" | "ppt-release-delay-active" | "threshold-threshold";

export type MicrophoneDevice = {
    id: string,
    name: string,
    driver: string
};


export interface MicrophoneSettingsEvents {
    "query_devices": { refresh_list: boolean },
    "query_help": {},
    "query_setting": {
        setting: MicrophoneSetting
    },

    "action_help_click": {},
    "action_request_permissions": {},
    "action_set_selected_device": { deviceId: string },
    "action_set_selected_device_result": {
        deviceId: string, /* on error it will contain the current selected device */
        status: "success" | "error",

        error?: string
    },

    "action_set_setting": {
        setting: MicrophoneSetting;
        value: any;
    },

    notify_setting: {
        setting: MicrophoneSetting;
        value: any;
    }

    "notify_devices": {
        status: "success" | "error" | "audio-not-initialized" | "no-permissions",

        error?: string,
        shouldAsk?: boolean,

        devices?: MicrophoneDevice[]
        selectedDevice?: string;
    },
    
    notify_device_level: {
        level: {[key: string]: {
            deviceId: string,
            status: "success" | "error",

            level?: number,
            error?: string
        }},

        status: Exclude<DeviceListState, "error">
    },

    notify_highlight: {
        field: "hs-0" | "hs-1" | "hs-2" | undefined
    }

    notify_destroy: {}
}

export function initialize_audio_microphone_controller(events: Registry<MicrophoneSettingsEvents>) {
    const recorderBackend = getRecorderBackend();

    /* level meters */
    {
        const level_meters: {[key: string]:Promise<LevelMeter>} = {};
        const level_info: {[key: string]:any} = {};
        let level_update_task;

        const destroy_meters = () => {
            Object.keys(level_meters).forEach(e => {
                const meter = level_meters[e];
                delete level_meters[e];

                meter.then(e => e.destroy());
            });
            Object.keys(level_info).forEach(e => delete level_info[e]);
        };

        const update_level_meter = () => {
            destroy_meters();

            level_info["none"] = { deviceId: "none", status: "success", level: 0 };

            for(const device of recorderBackend.getDeviceList().getDevices()) {
                let promise = recorderBackend.createLevelMeter(device).then(meter => {
                    meter.set_observer(level => {
                        if(level_meters[device.deviceId] !== promise) return; /* old level meter */

                        level_info[device.deviceId] = {
                            deviceId: device.deviceId,
                            status: "success",
                            level: level
                        };
                    });
                    return Promise.resolve(meter);
                }).catch(error => {
                    if(level_meters[device.deviceId] !== promise) return; /* old level meter */
                    level_info[device.deviceId] = {
                        deviceId: device.deviceId,
                        status: "error",

                        error: error
                    };

                    log.warn(LogCategory.AUDIO, tr("Failed to initialize a level meter for device %s (%s): %o"), device.deviceId, device.driver + ":" + device.name, error);
                    return Promise.reject(error);
                });
                level_meters[device.deviceId] = promise;
            }
        };

        level_update_task = setInterval(() => {
            const deviceListStatus = recorderBackend.getDeviceList().getStatus();

            events.fire("notify_device_level", {
                level: level_info,
                status: deviceListStatus === "error" ? "uninitialized" : deviceListStatus
            });
        }, 50);

        events.on("notify_devices", event => {
            if(event.status !== "success") return;

            update_level_meter();
        });

        events.on("notify_destroy", event => {
            destroy_meters();
            clearInterval(level_update_task);
        });
    }

    /* device list */
    {
        events.on("query_devices", event => {
            if(!aplayer.initialized()) {
                events.fire_async("notify_devices", { status: "audio-not-initialized" });
                return;
            }

            const deviceList = recorderBackend.getDeviceList();
            switch (deviceList.getStatus()) {
                case "no-permissions":
                    events.fire_async("notify_devices", { status: "no-permissions", shouldAsk: deviceList.getPermissionState() === "denied" });
                    return;

                case "uninitialized":
                    events.fire_async("notify_devices", { status: "audio-not-initialized" });
                    return;
            }

            if(event.refresh_list && deviceList.isRefreshAvailable()) {
                /* will automatically trigger a device list changed event if something has changed */
                deviceList.refresh().then(() => {});
            } else {
                const devices = deviceList.getDevices();

                events.fire_async("notify_devices", {
                    status: "success",
                    selectedDevice: default_recorder.getDeviceId(),
                    devices: devices.map(e => { return { id: e.deviceId, name: e.name, driver: e.driver }})
                });
            }
        });

        events.on("action_set_selected_device", event => {
            const device = recorderBackend.getDeviceList().getDevices().find(e => e.deviceId === event.deviceId);
            if(!device && event.deviceId !== IDevice.NoDeviceId) {
                events.fire_async("action_set_selected_device_result", { status: "error", error: tr("Invalid device id"), deviceId: default_recorder.getDeviceId() });
                return;
            }

            default_recorder.set_device(device).then(() => {
                console.debug(tr("Changed default microphone device to %s"), event.deviceId);
                events.fire_async("action_set_selected_device_result", { status: "success", deviceId: event.deviceId });
            }).catch((error) => {
                log.warn(LogCategory.AUDIO, tr("Failed to change microphone to device %s: %o"), device ? device.deviceId : IDevice.NoDeviceId, error);
                events.fire_async("action_set_selected_device_result", { status: "success", deviceId: event.deviceId });
            });
        });
    }

    /* settings */
    {
        events.on("query_setting", event => {
            let value;
            switch (event.setting) {
                case "volume":
                    value = default_recorder.get_volume();
                    break;

                case "threshold-threshold":
                    value = default_recorder.get_vad_threshold();
                    break;

                case "vad-type":
                    value = default_recorder.get_vad_type();
                    break;

                case "ppt-key":
                    value = default_recorder.get_vad_ppt_key();
                    break;

                case "ppt-release-delay":
                    value = Math.abs(default_recorder.get_vad_ppt_delay());
                    break;

                case "ppt-release-delay-active":
                    value = default_recorder.get_vad_ppt_delay() > 0;
                    break;

                default:
                    return;
            }

            events.fire_async("notify_setting", { setting: event.setting, value: value });
        });

        events.on("action_set_setting", event => {
            const ensure_type = (type: "object" | "string" | "boolean" | "number" | "undefined") => {
                if(typeof event.value !== type) {
                    logWarn(LogCategory.GENERAL, tr("Failed to change microphone setting (Invalid value type supplied. Expected %s, Received: %s)"),
                        type,
                        typeof event.value
                    );
                    return false;
                }
                return true;
            };

            switch (event.setting) {
                case "volume":
                    if(!ensure_type("number")) return;
                    default_recorder.set_volume(event.value);
                    break;

                case "threshold-threshold":
                    if(!ensure_type("number")) return;
                    default_recorder.set_vad_threshold(event.value);
                    break;

                case "vad-type":
                    if(!ensure_type("string")) return;
                    if(!default_recorder.set_vad_type(event.value)) {
                        logWarn(LogCategory.GENERAL, tr("Failed to change recorders VAD type to %s"), event.value);
                        return;
                    }
                    break;

                case "ppt-key":
                    if(!ensure_type("object")) return;
                    default_recorder.set_vad_ppt_key(event.value);
                    break;

                case "ppt-release-delay":
                    if(!ensure_type("number")) return;
                    const sign = default_recorder.get_vad_ppt_delay() >= 0 ? 1 : -1;
                    default_recorder.set_vad_ppt_delay(sign * event.value);
                    break;

                case "ppt-release-delay-active":
                    if(!ensure_type("boolean")) return;
                    default_recorder.set_vad_ppt_delay(Math.abs(default_recorder.get_vad_ppt_delay()) * (event.value ? 1 : -1));
                    break;

                default:
                    return;
            }
            events.fire_async("notify_setting", { setting: event.setting, value: event.value });
        });
    }

    events.on("action_request_permissions", () => recorderBackend.getDeviceList().requestPermissions().then(result => {
        console.error("Permission request result: %o", result);

        if(result === "granted") {
            /* we've nothing to do, the device change event will already update out list */
        } else {
            events.fire_async("notify_devices", { status: "no-permissions", shouldAsk: result === "denied" });
            return;
        }
    }));

    events.on("notify_destroy", recorderBackend.getDeviceList().getEvents().on("notify_list_updated", () => {
        events.fire("query_devices");
    }));

    events.on("notify_destroy", recorderBackend.getDeviceList().getEvents().on("notify_state_changed", () => {
        events.fire("query_devices");
    }));

    if(!aplayer.initialized()) {
        aplayer.on_ready(() => { events.fire_async("query_devices"); });
    }
}

loader.register_task(Stage.LOADED, {
    name: "test",
    function: async () => {
        aplayer.on_ready(() => {
            const modal = spawnReactModal(class extends InternalModal {
                settings = new Registry<MicrophoneSettingsEvents>();
                constructor() {
                    super();

                    initialize_audio_microphone_controller(this.settings);
                }

                renderBody(): React.ReactElement {
                    return <div style={{
                        padding: "1em",
                        backgroundColor: "#2f2f35"
                    }}>
                        <MicrophoneSettings events={this.settings} />
                    </div>;
                }

                title(): string | React.ReactElement<Translatable> {
                    return "test";
                }
            });

            modal.show();
        });
    },
    priority: -2
})