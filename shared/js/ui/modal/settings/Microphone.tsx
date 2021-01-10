import * as aplayer from "tc-backend/audio/player";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {LevelMeter} from "tc-shared/voice/RecorderBase";
import {LogCategory, logTrace, logWarn} from "tc-shared/log";
import {defaultRecorder} from "tc-shared/voice/RecorderProfile";
import {DeviceListState, getRecorderBackend, IDevice} from "tc-shared/audio/recorder";
import {Settings, settings} from "tc-shared/settings";

export type MicrophoneSetting =
    "volume"
    | "vad-type"
    | "ppt-key"
    | "ppt-release-delay"
    | "ppt-release-delay-active"
    | "threshold-threshold"
    | "rnnoise";

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
        level: {
            [key: string]: {
                deviceId: string,
                status: "success" | "error",

                level?: number,
                error?: string
            }
        },

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
        const levelMeterInitializePromises: { [key: string]: Promise<LevelMeter> } = {};
        const deviceLevelInfo: { [key: string]: any } = {};
        let deviceLevelUpdateTask;

        const destroyLevelIndicators = () => {
            Object.keys(levelMeterInitializePromises).forEach(e => {
                const meter = levelMeterInitializePromises[e];
                delete levelMeterInitializePromises[e];

                meter.then(e => e.destroy());
            });
            Object.keys(deviceLevelInfo).forEach(e => delete deviceLevelInfo[e]);
        };

        const updateLevelMeter = () => {
            destroyLevelIndicators();

            deviceLevelInfo["none"] = {deviceId: "none", status: "success", level: 0};

            for (const device of recorderBackend.getDeviceList().getDevices()) {
                let promise = recorderBackend.createLevelMeter(device).then(meter => {
                    meter.setObserver(level => {
                        if (levelMeterInitializePromises[device.deviceId] !== promise) {
                            /* old level meter */
                            return;
                        }

                        deviceLevelInfo[device.deviceId] = {
                            deviceId: device.deviceId,
                            status: "success",
                            level: level
                        };
                    });
                    return Promise.resolve(meter);
                }).catch(error => {
                    if (levelMeterInitializePromises[device.deviceId] !== promise) {
                        /* old level meter */
                        return;
                    }
                    deviceLevelInfo[device.deviceId] = {
                        deviceId: device.deviceId,
                        status: "error",

                        error: error
                    };

                    logWarn(LogCategory.AUDIO, tr("Failed to initialize a level meter for device %s (%s): %o"), device.deviceId, device.driver + ":" + device.name, error);
                    return Promise.reject(error);
                });
                levelMeterInitializePromises[device.deviceId] = promise;
            }
        };

        deviceLevelUpdateTask = setInterval(() => {
            const deviceListStatus = recorderBackend.getDeviceList().getStatus();

            events.fire("notify_device_level", {
                level: deviceLevelInfo,
                status: deviceListStatus === "error" ? "uninitialized" : deviceListStatus
            });
        }, 50);

        events.on("notify_devices", event => {
            if (event.status !== "success") {
                return;
            }

            updateLevelMeter();
        });

        events.on("notify_destroy", () => {
            destroyLevelIndicators();
            clearInterval(deviceLevelUpdateTask);
        });
    }

    /* device list */
    {
        events.on("query_devices", event => {
            if (!aplayer.initialized()) {
                events.fire_react("notify_devices", {status: "audio-not-initialized"});
                return;
            }

            const deviceList = recorderBackend.getDeviceList();
            switch (deviceList.getStatus()) {
                case "no-permissions":
                    events.fire_react("notify_devices", {
                        status: "no-permissions",
                        shouldAsk: deviceList.getPermissionState() === "denied"
                    });
                    return;

                case "uninitialized":
                    events.fire_react("notify_devices", {status: "audio-not-initialized"});
                    return;
            }

            if (event.refresh_list && deviceList.isRefreshAvailable()) {
                /* will automatically trigger a device list changed event if something has changed */
                deviceList.refresh().then(() => {
                });
            } else {
                const devices = deviceList.getDevices();

                events.fire_react("notify_devices", {
                    status: "success",
                    selectedDevice: defaultRecorder.getDeviceId(),
                    devices: devices.map(e => {
                        return {id: e.deviceId, name: e.name, driver: e.driver}
                    })
                });
            }
        });

        events.on("action_set_selected_device", event => {
            const device = recorderBackend.getDeviceList().getDevices().find(e => e.deviceId === event.deviceId);
            if (!device && event.deviceId !== IDevice.NoDeviceId) {
                events.fire_react("action_set_selected_device_result", {
                    status: "error",
                    error: tr("Invalid device id"),
                    deviceId: defaultRecorder.getDeviceId()
                });
                return;
            }

            defaultRecorder.setDevice(device).then(() => {
                logTrace(LogCategory.GENERAL, tr("Changed default microphone device to %s"), event.deviceId);
                events.fire_react("action_set_selected_device_result", {status: "success", deviceId: event.deviceId});
            }).catch((error) => {
                logWarn(LogCategory.AUDIO, tr("Failed to change microphone to device %s: %o"), device ? device.deviceId : IDevice.NoDeviceId, error);
                events.fire_react("action_set_selected_device_result", {status: "success", deviceId: event.deviceId});
            });
        });
    }

    /* settings */
    {
        events.on("query_setting", event => {
            let value;
            switch (event.setting) {
                case "volume":
                    value = defaultRecorder.getVolume();
                    break;

                case "threshold-threshold":
                    value = defaultRecorder.getThresholdThreshold();
                    break;

                case "vad-type":
                    value = defaultRecorder.getVadType();
                    break;

                case "ppt-key":
                    value = defaultRecorder.getPushToTalkKey();
                    break;

                case "ppt-release-delay":
                    value = Math.abs(defaultRecorder.getPushToTalkDelay());
                    break;

                case "ppt-release-delay-active":
                    value = defaultRecorder.getPushToTalkDelay() > 0;
                    break;

                case "rnnoise":
                    value = settings.getValue(Settings.KEY_RNNOISE_FILTER);
                    break;

                default:
                    return;
            }

            events.fire_react("notify_setting", {setting: event.setting, value: value});
        });

        events.on("action_set_setting", event => {
            const ensure_type = (type: "object" | "string" | "boolean" | "number" | "undefined") => {
                if (typeof event.value !== type) {
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
                    if (!ensure_type("number")) return;
                    defaultRecorder.setVolume(event.value);
                    break;

                case "threshold-threshold":
                    if (!ensure_type("number")) return;
                    defaultRecorder.setThresholdThreshold(event.value);
                    break;

                case "vad-type":
                    if (!ensure_type("string")) return;
                    if (!defaultRecorder.setVadType(event.value)) {
                        logWarn(LogCategory.GENERAL, tr("Failed to change recorders VAD type to %s"), event.value);
                        return;
                    }
                    break;

                case "ppt-key":
                    if (!ensure_type("object")) return;
                    defaultRecorder.setPushToTalkKey(event.value);
                    break;

                case "ppt-release-delay":
                    if (!ensure_type("number")) return;
                    const sign = defaultRecorder.getPushToTalkDelay() >= 0 ? 1 : -1;
                    defaultRecorder.setPushToTalkDelay(sign * event.value);
                    break;

                case "ppt-release-delay-active":
                    if (!ensure_type("boolean")) return;
                    defaultRecorder.setPushToTalkDelay(Math.abs(defaultRecorder.getPushToTalkDelay()) * (event.value ? 1 : -1));
                    break;

                case "rnnoise":
                    if (!ensure_type("boolean")) return;
                    settings.setValue(Settings.KEY_RNNOISE_FILTER, event.value);
                    break;

                default:
                    return;
            }
            events.fire_react("notify_setting", {setting: event.setting, value: event.value});
        });
    }

    events.on("action_request_permissions", () => recorderBackend.getDeviceList().requestPermissions().then(result => {
        if (result === "granted") {
            /* we've nothing to do, the device change event will already update out list */
        } else {
            events.fire_react("notify_devices", {status: "no-permissions", shouldAsk: result === "denied"});
            return;
        }
    }));

    events.on("notify_destroy", recorderBackend.getDeviceList().getEvents().on("notify_list_updated", () => {
        events.fire("query_devices");
    }));

    events.on("notify_destroy", recorderBackend.getDeviceList().getEvents().on("notify_state_changed", () => {
        events.fire("query_devices");
    }));

    if (!aplayer.initialized()) {
        aplayer.on_ready(() => {
            events.fire_react("query_devices");
        });
    }
}

/*
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {MicrophoneSettings} from "tc-shared/ui/modal/settings/MicrophoneRenderer";

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
});
*/