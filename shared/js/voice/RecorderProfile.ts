import * as log from "../log";
import {LogCategory, logError, logWarn} from "../log";
import {AbstractInput, FilterMode} from "../voice/RecorderBase";
import {KeyDescriptor, KeyHook} from "../PPTListener";
import {Settings, settings} from "../settings";
import {ConnectionHandler} from "../ConnectionHandler";
import * as aplayer from "tc-backend/audio/player";
import * as ppt from "tc-backend/ppt";
import {getRecorderBackend, IDevice} from "../audio/recorder";
import {FilterType, StateFilter, ThresholdFilter} from "../voice/Filter";

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

export let defaultRecorder: RecorderProfile; /* needs initialize */
export function setDefaultRecorder(recorder: RecorderProfile) {
    defaultRecorder = recorder;
}

export class RecorderProfile {
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
        this.name = name;
        this.volatile = typeof(volatile) === "boolean" ? volatile : false;

        this.pptHook = {
            callback_release: () => {
                if(this.pptTimeout)
                    clearTimeout(this.pptTimeout);

                this.pptTimeout = setTimeout(() => {
                    this.registeredFilter["ppt-gate"]?.setState(true);
                }, Math.max(this.config.vad_push_to_talk.delay, 0));
            },

            callback_press: () => {
                if(this.pptTimeout)
                    clearTimeout(this.pptTimeout);

                this.registeredFilter["ppt-gate"]?.setState(false);
            },

            cancel: false
        } as KeyHook;
        this.pptHookRegistered = false;
    }

    async initialize() : Promise<void> {
        {
            let config = {};
            try {
                config = settings.static_global(Settings.FN_PROFILE_RECORD(this.name), {}) as RecorderProfileConfig;
            } catch (error) {
                logWarn(LogCategory.AUDIO, tr("Failed to load old recorder profile config for %s"), this.name);
            }

            /* default values */
            this.config = {
                version: 1,
                device_id: undefined,
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

        aplayer.on_ready(async () => {
            await getRecorderBackend().getDeviceList().awaitInitialized();

            await this.initializeInput();
            await this.reinitializeFilter();
        });
    }

    private async initializeInput() {
        this.input = getRecorderBackend().createInput();

        this.input.events.on("notify_voice_start", () => {
            log.debug(LogCategory.VOICE, "Voice start");
            if(this.callback_start)
                this.callback_start();
        });

        this.input.events.on("notify_voice_end", () => {
            log.debug(LogCategory.VOICE, "Voice end");
            if(this.callback_stop)
                this.callback_stop();
        });

        this.input.setFilterMode(FilterMode.Block);
        this.registeredFilter["ppt-gate"] = this.input.createFilter(FilterType.STATE, 100);
        this.registeredFilter["ppt-gate"].setEnabled(false);

        this.registeredFilter["threshold"] = this.input.createFilter(FilterType.THRESHOLD, 100);
        this.registeredFilter["threshold"].setEnabled(false);

        if(this.callback_input_initialized) {
            this.callback_input_initialized(this.input);
        }


        /* apply initial config values */
        this.input.setVolume(this.config.volume / 100);
        if(this.config.device_id) {
            await this.input.setDeviceId(this.config.device_id);
        } else {
            await this.input.setDeviceId(IDevice.DefaultDeviceId);
        }
    }

    private save() {
        if(!this.volatile) {
            settings.changeGlobal(Settings.FN_PROFILE_RECORD(this.name), this.config);
        }
    }

    private reinitializePPTHook() {
        if(this.config.vad_type !== "push_to_talk") {
            return;
        }

        if(this.pptHookRegistered) {
            ppt.unregister_key_hook(this.pptHook);
            this.pptHookRegistered = false;
        }

        for(const key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"]) {
            this.pptHook[key] = this.config.vad_push_to_talk[key];
        }

        ppt.register_key_hook(this.pptHook);
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
            ppt.unregister_key_hook(this.pptHook);
            this.pptHookRegistered = false;
        }

        if(this.config.vad_type === "threshold") {
            const filter = this.registeredFilter["threshold"];
            filter.setEnabled(true);
            filter.setThreshold(this.config.vad_threshold.threshold);

            filter.setMarginFrames(10); /* 500ms */
            filter.setAttackSmooth(.25);
            filter.setReleaseSmooth(.9);
        } else if(this.config.vad_type === "push_to_talk") {
            const filter = this.registeredFilter["ppt-gate"];
            filter.setEnabled(true);
            filter.setState(true); /* by default set filtered */

            for(const key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
                this.pptHook[key] = this.config.vad_push_to_talk[key];

            ppt.register_key_hook(this.pptHook);
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
                log.warn(LogCategory.VOICE, tr("Failed to unmount input consumer for profile (%o)"), error);
            }

            this.input.setFilterMode(FilterMode.Block);
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

    getPushToTalkKey() : KeyDescriptor { return this.config.vad_push_to_talk; }
    setPushToTalkKey(key: KeyDescriptor) {
        for(const _key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
            this.config.vad_push_to_talk[_key] = key[_key];

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

    getDeviceId() : string { return this.config.device_id; }
    setDevice(device: IDevice | undefined) : Promise<void> {
        this.config.device_id = device ? device.deviceId : IDevice.NoDeviceId;
        this.save();
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