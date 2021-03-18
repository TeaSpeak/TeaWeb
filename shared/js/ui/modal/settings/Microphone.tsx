import * as React from "react";
import {Registry} from "tc-shared/events";
import {LevelMeter} from "tc-shared/voice/RecorderBase";
import {LogCategory, logTrace, logWarn} from "tc-shared/log";
import {defaultRecorder} from "tc-shared/voice/RecorderProfile";
import {DeviceListState, getRecorderBackend, InputDevice} from "tc-shared/audio/Recorder";
import {Settings, settings} from "tc-shared/settings";
import {getBackend} from "tc-shared/backend";
import * as _ from "lodash";
import {getAudioBackend} from "tc-shared/audio/Player";

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
    driver: string,
    default: boolean
};

export type SelectedMicrophone = { type: "default" } | { type: "none" } | { type: "device", deviceId: string };
export type MicrophoneDevices = {
    status: "error",
    error: string
} | {
    status: "audio-not-initialized"
} | {
    status: "no-permissions",
    shouldAsk: boolean
} | {
    status: "success",
    devices: MicrophoneDevice[]
    selectedDevice: SelectedMicrophone;
};
export interface MicrophoneSettingsEvents {
    "query_devices": { refresh_list: boolean },
    "query_help": {},
    "query_setting": {
        setting: MicrophoneSetting
    },

    "action_help_click": {},
    "action_request_permissions": {},
    "action_set_selected_device": { target: SelectedMicrophone },
    "action_set_selected_device_result": {
        status: "error",
        reason: string
    },

    "action_set_setting": {
        setting: MicrophoneSetting;
        value: any;
    },

    notify_setting: {
        setting: MicrophoneSetting;
        value: any;
    }

    notify_devices: MicrophoneDevices,
    notify_device_selected: { device: SelectedMicrophone },

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
        let selectedDevice: SelectedMicrophone = { type: "none" };

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

            let levelMeterEnabled;
            {
                let defaultValue = true;
                if(__build.target === "client" && getBackend("native").getVersionInfo().os_platform === "linux") {
                    /* The linux client crashes when it fails to open an alsa stream due too many opened streams */
                    defaultValue = false;
                }

                levelMeterEnabled = settings.getValue(Settings.KEY_MICROPHONE_LEVEL_INDICATOR, defaultValue);
            }
            deviceLevelInfo["none"] = {deviceId: "none", status: "success", level: 0};

            const defaultDeviceId = recorderBackend.getDeviceList().getDefaultDeviceId();
            for (const device of recorderBackend.getDeviceList().getDevices()) {
                let createLevelMeter;
                if(!levelMeterEnabled) {
                    switch (selectedDevice.type) {
                        case "default":
                            createLevelMeter = device.deviceId == defaultDeviceId;
                            break;

                        case "device":
                            createLevelMeter = device.deviceId == selectedDevice.deviceId;
                            break;

                        case "none":
                            createLevelMeter = false;
                            break;
                    }
                } else {
                    createLevelMeter = true;
                }

                if(createLevelMeter) {
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
                } else {
                    deviceLevelInfo[device.deviceId] = {
                        deviceId: device.deviceId,
                        status: "error",

                        error: tr("level meter disabled")
                    };
                }
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

            selectedDevice = event.selectedDevice;
            updateLevelMeter();
        });

        events.on("notify_destroy", () => {
            destroyLevelIndicators();
            clearInterval(deviceLevelUpdateTask);
        });

        events.on("notify_device_selected", event => {
            if(_.isEqual(selectedDevice, event.device)) {
                return;
            }

            selectedDevice = event.device;
            updateLevelMeter();
        });
    }

    /* device list */
    {
        const currentSelectedDevice = (): SelectedMicrophone => {
            let deviceId = defaultRecorder.getDeviceId();
            if(deviceId === InputDevice.DefaultDeviceId) {
                return { type: "default" };
            } else if(deviceId === InputDevice.NoDeviceId) {
                return { type: "none" };
            } else {
                return { type: "device", deviceId: deviceId };
            }
        };

        events.on("query_devices", event => {
            if (!getAudioBackend().isInitialized()) {
                events.fire_react("notify_devices", {
                    status: "audio-not-initialized"
                });
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
                    events.fire_react("notify_devices", {
                        status: "audio-not-initialized"
                    });
                    return;
            }

            if (event.refresh_list && deviceList.isRefreshAvailable()) {
                /* will automatically trigger a device list changed event if something has changed */
                deviceList.refresh().then(() => { });
            } else {
                const devices = deviceList.getDevices();

                const defaultDeviceId = getRecorderBackend().getDeviceList().getDefaultDeviceId();
                events.fire_react("notify_devices", {
                    status: "success",
                    devices: devices.map(e => {
                        return {
                            id: e.deviceId,
                            name: e.name,
                            driver: e.driver,
                            default: defaultDeviceId === e.deviceId
                        }
                    }),
                    selectedDevice: currentSelectedDevice(),
                });
            }
        });

        events.on("action_set_selected_device", event => {
            let promise;

            const target = event.target;

            let displayName: string;
            switch (target.type) {
                case "none":
                    promise = defaultRecorder.setDevice("none");
                    displayName = tr("No device");
                    break;

                case "default":
                    promise = defaultRecorder.setDevice("default");
                    displayName = tr("Default device");
                    break;

                case "device":
                    const device = recorderBackend.getDeviceList().getDevices().find(e => e.deviceId === target.deviceId);
                    if (!device) {
                        events.fire_react("action_set_selected_device_result", {
                            status: "error",
                            reason: tr("Invalid device id"),
                        });
                        return;
                    }

                    displayName = target.deviceId;
                    promise = defaultRecorder.setDevice(device);
                    break;

                default:
                    events.fire_react("action_set_selected_device_result", {
                        status: "error",
                        reason: tr("Invalid device target"),
                    });
                    return;

            }

            promise.then(() => {
                /* TODO:
                 * This isn't needed since the defaultRecorder might already fire a device change event which will update our ui.
                 * We only have this since we can't ensure that the recorder does so.
                 */
                events.fire_react("notify_device_selected", { device: currentSelectedDevice() });
                logTrace(LogCategory.GENERAL, tr("Changed default microphone device to %s"), displayName);
            }).catch((error) => {
                logWarn(LogCategory.AUDIO, tr("Failed to change microphone to device %s: %o"), displayName, error);
                events.fire_react("action_set_selected_device_result", {status: "error", reason: error || tr("lookup the console") });
            });
        });

        events.on("notify_destroy", defaultRecorder.events.on("notify_device_changed", () => {
            events.fire_react("notify_device_selected", { device: currentSelectedDevice() });
        }));
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

    if(!getAudioBackend().isInitialized()) {
        getAudioBackend().executeWhenInitialized(() => events.fire_react("query_devices"));
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