import {LogCategory, logDebug, logError, logWarn} from "../log";
import {AbstractInput, FilterMode} from "../voice/RecorderBase";
import {getKeyBoard, KeyDescriptor, KeyHook} from "../PPTListener";
import {Settings, settings} from "../settings";
import {ConnectionHandler} from "../ConnectionHandler";
import {getRecorderBackend, InputDevice} from "../audio/Recorder";
import {FilterType, StateFilter, ThresholdFilter} from "../voice/Filter";
import { tr } from "tc-shared/i18n/localize";
import {Registry} from "tc-shared/events";
import {getAudioBackend} from "tc-shared/audio/Player";

export type VadType = "threshold" | "push_to_talk" | "active";
export interface RecorderProfileConfig {
    version: number;

    /* devices unique id */
    device_id: string | undefined;

    volume: number;

    vad_type: VadType;
    vad_threshold: {
        threshold: number;
    }

    vad_push_to_talk: {
        delay: number;
        key_code: string;

        key_ctrl: boolean;
        key_windows: boolean;
        key_shift: boolean;
        key_alt: boolean;
    }
}

export interface DefaultRecorderEvents {
    notify_default_recorder_changed: {}
}

export let defaultRecorder: RecorderProfile; /* needs initialize */
export const defaultRecorderEvents: Registry<DefaultRecorderEvents> = new Registry<DefaultRecorderEvents>();

export function setDefaultRecorder(recorder: RecorderProfile) {
    defaultRecorder = recorder;
    (window as any).defaultRecorder = defaultRecorder;
    defaultRecorderEvents.fire("notify_default_recorder_changed");
}

export interface RecorderProfileEvents {
    notify_device_changed: { },

    notify_voice_start: { },
    notify_voice_end: { },

    /* attention: this notify will only be called when the audio input hasn't been initialized! */
    notify_input_initialized: { },
}

export class RecorderProfile {
    readonly events: Registry<RecorderProfileEvents>;
    readonly name;
    readonly volatile; /* not saving profile */

    config: RecorderProfileConfig;
    input: AbstractInput;

    current_handler: ConnectionHandler;

    /* attention: this callback will only be called when the audio input hasn't been initialized! */
    callback_input_initialized: (input: AbstractInput) => void;
    callback_start: () => any;
    callback_stop: () => any;

    callback_unmount: () => any; /* called if somebody else takes the ownership */

    private readonly pptHook: KeyHook;
    private pptTimeout: number;
    private pptHookRegistered: boolean;

    private registeredFilter = {
        "ppt-gate": undefined as StateFilter,
        "threshold": undefined as ThresholdFilter
    }

    constructor(name: string, volatile?: boolean) {
        this.events = new Registry<RecorderProfileEvents>();
        this.name = name;
        this.volatile = typeof(volatile) === "boolean" ? volatile : false;

        this.pptHook = {
            callbackRelease: () => {
                if(this.pptTimeout) {
                    clearTimeout(this.pptTimeout);
                }

                this.pptTimeout = setTimeout(() => {
                    this.registeredFilter["ppt-gate"]?.setState(true);
                }, Math.max(this.config.vad_push_to_talk.delay, 0));
            },

            callbackPress: () => {
                if(this.pptTimeout) {
                    clearTimeout(this.pptTimeout);
                }

                this.registeredFilter["ppt-gate"]?.setState(false);
            },
        } as KeyHook;
        this.pptHookRegistered = false;
    }

    destroy() {
        /* TODO */
        this.input?.destroy();
        this.input = undefined;
        this.events.destroy();
    }

    async initialize() : Promise<void> {
        {
            let config = {};
            try {
                config = settings.getValue(Settings.FN_PROFILE_RECORD(this.name), {}) as RecorderProfileConfig;
            } catch (error) {
                logWarn(LogCategory.AUDIO, tr("Failed to load old recorder profile config for %s"), this.name);
            }

            /* default values */
            this.config = {
                version: 1,
                device_id: InputDevice.DefaultDeviceId,
                volume: 100,

                vad_threshold: {
                    threshold: 25
                },
                vad_type: "threshold",
                vad_push_to_talk: {
                    delay: 300,
                    key_alt: false,
                    key_ctrl: false,
                    key_shift: false,
                    key_windows: false,
                    key_code: 't'
                }
            };

            Object.assign(this.config, config || {});
        }

        getAudioBackend().executeWhenInitialized(async () => {
            await getRecorderBackend().getDeviceList().awaitInitialized();

            await this.initializeInput();
            await this.reinitializeFilter();
        });
    }

    private async initializeInput() {
        this.input = getRecorderBackend().createInput();

        this.input.events.on("notify_voice_start", () => {
            logDebug(LogCategory.VOICE, "Voice start");
            if(this.callback_start) {
                this.callback_start();
            }
            this.events.fire("notify_voice_start");
        });

        this.input.events.on("notify_voice_end", () => {
            logDebug(LogCategory.VOICE, "Voice end");
            if(this.callback_stop) {
                this.callback_stop();
            }
            this.events.fire("notify_voice_end");
        });

        this.input.setFilterMode(FilterMode.Block);
        this.registeredFilter["ppt-gate"] = this.input.createFilter(FilterType.STATE, 100);
        this.registeredFilter["ppt-gate"].setEnabled(false);

        this.registeredFilter["threshold"] = this.input.createFilter(FilterType.THRESHOLD, 100);
        this.registeredFilter["threshold"].setEnabled(false);

        if(this.callback_input_initialized) {
            this.callback_input_initialized(this.input);
        }
        this.events.fire("notify_input_initialized");


        /* apply initial config values */
        this.input.setVolume(this.config.volume / 100);
        if(this.config.device_id) {
            await this.input.setDeviceId(this.config.device_id);
        } else {
            await this.input.setDeviceId(InputDevice.DefaultDeviceId);
        }
    }

    private save() {
        if(!this.volatile) {
            settings.setValue(Settings.FN_PROFILE_RECORD(this.name), this.config);
        }
    }

    private reinitializePPTHook() {
        if(this.config.vad_type !== "push_to_talk") {
            return;
        }

        if(this.pptHookRegistered) {
            getKeyBoard().unregisterHook(this.pptHook);
            this.pptHookRegistered = false;
        }

        Object.assign(this.pptHook, this.getPushToTalkKey());
        getKeyBoard().registerHook(this.pptHook);
        this.pptHookRegistered = true;

        this.registeredFilter["ppt-gate"]?.setState(true);
    }

    private async reinitializeFilter() {
        if(!this.input) {
            return;
        }

        this.input.setFilterMode(FilterMode.Block);

        /* disable all filter */
        this.registeredFilter["threshold"].setEnabled(false);
        this.registeredFilter["ppt-gate"].setEnabled(false);

        if(this.pptHookRegistered) {
            getKeyBoard().unregisterHook(this.pptHook);
            this.pptHookRegistered = false;
        }

        if(this.config.vad_type === "threshold") {
            const filter = this.registeredFilter["threshold"];
            filter.setEnabled(true);
            filter.setThreshold(this.config.vad_threshold.threshold);

            const releaseDelayMs = settings.getValue(Settings.KEY_MICROPHONE_THRESHOLD_RELEASE_DELAY);
            if(__build.target === "web") {
                /* One frame is 20ms */
                filter.setMarginFrames(Math.ceil(releaseDelayMs / 20));
            } else {
                /* the client calculates it wrongly... */
                filter.setMarginFrames(releaseDelayMs * 960);
            }
            filter.setAttackSmooth(settings.getValue(Settings.KEY_MICROPHONE_THRESHOLD_ATTACK_SMOOTH));
            filter.setReleaseSmooth(settings.getValue(Settings.KEY_MICROPHONE_THRESHOLD_RELEASE_SMOOTH));
        } else if(this.config.vad_type === "push_to_talk") {
            const filter = this.registeredFilter["ppt-gate"];
            filter.setEnabled(true);
            filter.setState(true); /* by default set filtered */

            Object.assign(this.pptHook, this.getPushToTalkKey());
            getKeyBoard().registerHook(this.pptHook);
            this.pptHookRegistered = true;
        } else if(this.config.vad_type === "active") {
            /* we don't have to initialize any filters */
        }

        this.input.setFilterMode(FilterMode.Filter);
    }

    async unmount() : Promise<void> {
        if(this.callback_unmount) {
            this.callback_unmount();
        }

        if(this.input) {
            try {
                await this.input.setConsumer(undefined);
            } catch(error) {
                logWarn(LogCategory.VOICE, tr("Failed to unmount input consumer for profile (%o)"), error);
            }

            /* this.input.setFilterMode(FilterMode.Block); */
        }

        this.callback_input_initialized = undefined;
        this.callback_start = undefined;
        this.callback_stop = undefined;
        this.callback_unmount = undefined;
        this.current_handler = undefined;
    }

    getVadType() { return this.config.vad_type; }
    setVadType(type: VadType) : boolean {
        if(this.config.vad_type === type)
            return true;

        if(["push_to_talk", "threshold", "active"].findIndex(e => e === type) == -1)
            return false;

        this.config.vad_type = type;
        this.reinitializeFilter().catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to reinitialize filters after vad type change: %o"), error);
        });
        this.save();
        return true;
    }

    getThresholdThreshold() { return parseInt(this.config.vad_threshold.threshold as any); } /* for some reason it might be a string... */
    setThresholdThreshold(value: number) {
        if(this.config.vad_threshold.threshold === value)
            return;

        this.config.vad_threshold.threshold = value;
        this.registeredFilter["threshold"]?.setThreshold(this.config.vad_threshold.threshold);
        this.save();
    }

    getPushToTalkKey() : KeyDescriptor {
        return {
            keyCode: this.config.vad_push_to_talk.key_code,

            keyAlt: this.config.vad_push_to_talk.key_alt,
            keyCtrl: this.config.vad_push_to_talk.key_ctrl,
            keyShift: this.config.vad_push_to_talk.key_shift,
            keyWindows: this.config.vad_push_to_talk.key_windows,
        }
    }

    setPushToTalkKey(key: KeyDescriptor) {
        this.config.vad_push_to_talk = {
            delay: this.config.vad_push_to_talk.delay,
            key_code: key.keyCode,

            key_alt: key.keyAlt,
            key_ctrl: key.keyCtrl,
            key_shift: key.keyShift,
            key_windows: key.keyWindows
        };

        this.reinitializePPTHook();
        this.save();
    }

    getPushToTalkDelay() { return this.config.vad_push_to_talk.delay; }
    setPushToTalkDelay(value: number) {
        if(this.config.vad_push_to_talk.delay === value)
            return;

        this.config.vad_push_to_talk.delay = value;
        this.save();
    }

    getDeviceId() : string | typeof InputDevice.DefaultDeviceId | typeof InputDevice.NoDeviceId { return this.config.device_id; }
    setDevice(device: InputDevice | typeof InputDevice.DefaultDeviceId | typeof InputDevice.NoDeviceId) : Promise<void> {
        let deviceId;
        if(typeof device === "object") {
            deviceId = device.deviceId;
        } else {
            deviceId = device;
        }

        if(this.config.device_id === deviceId) {
            return;
        }
        this.config.device_id = deviceId;

        this.save();
        this.events.fire("notify_device_changed");
        return this.input?.setDeviceId(this.config.device_id) || Promise.resolve();
    }

    getVolume() : number { return this.input ? (this.input.getVolume() * 100) : this.config.volume; }
    setVolume(volume: number) {
        if(this.config.volume === volume)
            return;

        this.config.volume = volume;
        this.input?.setVolume(volume / 100);
        this.save();
    }
}