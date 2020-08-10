import * as aplayer from "tc-backend/audio/player";
import * as React from "react";
import {Registry} from "tc-shared/events";
import {LevelMeter} from "tc-shared/voice/RecorderBase";
import * as arecorder from "tc-backend/audio/recorder";
import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import {default_recorder} from "tc-shared/voice/RecorderProfile";
import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {spawnReactModal} from "tc-shared/ui/react-elements/Modal";
import {InternalModal} from "tc-shared/ui/react-elements/internal-modal/Controller";
import {Translatable} from "tc-shared/ui/react-elements/i18n";
import {MicrophoneSettings} from "tc-shared/ui/modal/settings/MicrophoneRenderer";

export type MicrophoneSetting = "volume" | "vad-type" | "ppt-key" | "ppt-release-delay" | "ppt-release-delay-active" | "threshold-threshold";

export type MicrophoneDevice = {
    id: string,
    name: string,
    driver: string
};


export interface MicrophoneSettingsEvents {
    "query_devices": { refresh_list: boolean },

    "query_setting": {
        setting: MicrophoneSetting
    },

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
        status: "success" | "error" | "audio-not-initialized",

        error?: string,
        devices?: MicrophoneDevice[]
        selectedDevice?: string;
    },
    
    notify_device_level: {
        level: {[key: string]: {
            deviceId: string,
            status: "success" | "error",

            level?: number,
            error?: string
        }}
    },

    notify_destroy: {}
}

export function initialize_audio_microphone_controller(events: Registry<MicrophoneSettingsEvents>) {
    /* level meters */
    {
        const level_meters: {[key: string]:Promise<LevelMeter>} = {};
        const level_info: {[key: string]:any} = {};
        let level_update_task;

        const destroy_meters = () => {
            Object.keys(level_meters).forEach(e => {
                const meter = level_meters[e];
                delete level_meters[e];

                meter.then(e => e.destory());
            });
            Object.keys(level_info).forEach(e => delete level_info[e]);
        };

        const update_level_meter = () => {
            destroy_meters();

            for(const device of arecorder.devices()) {
                let promise = arecorder.create_levelmeter(device).then(meter => {
                    meter.set_observer(level => {
                        if(level_meters[device.unique_id] !== promise) return; /* old level meter */

                        level_info[device.unique_id] = {
                            deviceId: device.unique_id,
                            status: "success",
                            level: level
                        };
                    });
                    return Promise.resolve(meter);
                }).catch(error => {
                    if(level_meters[device.unique_id] !== promise) return; /* old level meter */
                    level_info[device.unique_id] = {
                        deviceId: device.unique_id,
                        status: "error",

                        error: error
                    };

                    log.warn(LogCategory.AUDIO, tr("Failed to initialize a level meter for device %s (%s): %o"), device.unique_id, device.driver + ":" + device.name, error);
                    return Promise.reject(error);
                });
                level_meters[device.unique_id] = promise;
            }
        };

        level_update_task = setInterval(() => {
            events.fire("notify_device_level", {
                level: level_info
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

            Promise.resolve().then(() => {
                return arecorder.device_refresh_available() && event.refresh_list ? arecorder.refresh_devices() : Promise.resolve();
            }).catch(error => {
                log.warn(LogCategory.AUDIO, tr("Failed to refresh device list: %o"), error);
                return Promise.resolve();
            }).then(() => {
                const devices = arecorder.devices();

                events.fire_async("notify_devices", {
                    status: "success",
                    selectedDevice: default_recorder.current_device() ? default_recorder.current_device().unique_id : "none",
                    devices: devices.map(e => { return { id: e.unique_id, name: e.name, driver: e.driver }})
                });
            });
        });

        events.on("action_set_selected_device", event => {
            const device = arecorder.devices().find(e => e.unique_id === event.deviceId);
            if(!device && event.deviceId !== "none") {
                events.fire_async("action_set_selected_device_result", { status: "error", error: tr("Invalid device id"), deviceId: default_recorder.current_device().unique_id });
                return;
            }

            default_recorder.set_device(device).then(() => {
                console.debug(tr("Changed default microphone device"));
                events.fire_async("action_set_selected_device_result", { status: "success", deviceId: event.deviceId });
            }).catch((error) => {
                log.warn(LogCategory.AUDIO, tr("Failed to change microphone to device %s: %o"), device ? device.unique_id : "none", error);
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

    if(!aplayer.initialized()) {
        aplayer.on_ready(() => { events.fire_async("query_devices"); });
    }
}