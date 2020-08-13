import * as log from "tc-shared/log";
import {LogCategory, logWarn} from "tc-shared/log";
import {AbstractInput} from "tc-shared/voice/RecorderBase";
import {KeyDescriptor, KeyHook} from "tc-shared/PPTListener";
import {Settings, settings} from "tc-shared/settings";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as aplayer from "tc-backend/audio/player";
import * as ppt from "tc-backend/ppt";
import {getRecorderBackend, IDevice} from "tc-shared/audio/recorder";
import {FilterType, StateFilter} from "tc-shared/voice/Filter";

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

export let default_recorder: RecorderProfile; /* needs initialize */
export function set_default_recorder(recorder: RecorderProfile) {
    default_recorder = recorder;
}
export class RecorderProfile {
    readonly name;
    readonly volatile; /* not saving profile */

    config: RecorderProfileConfig;
    input: AbstractInput;

    current_handler: ConnectionHandler;

    callback_input_change: (oldInput: AbstractInput | undefined, newInput: AbstractInput | undefined) => Promise<void>;
    callback_start: () => any;
    callback_stop: () => any;

    callback_unmount: () => any; /* called if somebody else takes the ownership */

    private readonly pptHook: KeyHook;
    private pptTimeout: number;
    private pptHookRegistered: boolean;

    private registeredFilter = {
        "ppt-gate": undefined as StateFilter
    }

    constructor(name: string, volatile?: boolean) {
        this.name = name;
        this.volatile = typeof(volatile) === "boolean" ? volatile : false;

        this.pptHook = {
            callback_release: () => {
                if(this.pptTimeout)
                    clearTimeout(this.pptTimeout);

                this.pptTimeout = setTimeout(() => {
                    this.registeredFilter["ppt-gate"]?.set_state(true);
                }, Math.max(this.config.vad_push_to_talk.delay, 0));
            },

            callback_press: () => {
                if(this.pptTimeout)
                    clearTimeout(this.pptTimeout);

                this.registeredFilter["ppt-gate"]?.set_state(false);
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
            await getRecorderBackend().getDeviceList().awaitHealthy();

            this.initialize_input();
            await this.load();
            await this.reinitializeFilter();
        });
    }

    private initialize_input() {
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

        //TODO: Await etc?
        this.callback_input_change && this.callback_input_change(undefined, this.input);
    }

    private async load() {
        this.input.setVolume(this.config.volume / 100);

        {
            const allDevices = getRecorderBackend().getDeviceList().getDevices();
            const defaultDeviceId = getRecorderBackend().getDeviceList().getDefaultDeviceId();
            console.error("Devices: %o | Searching: %s", allDevices, this.config.device_id);

            const devices = allDevices.filter(e => e.deviceId === defaultDeviceId || e.deviceId === this.config.device_id);
            const device = devices.find(e => e.deviceId === this.config.device_id) || devices[0];

            log.info(LogCategory.VOICE, tr("Loaded record profile device %s | %o (%o)"), this.config.device_id, device, allDevices);
            try {
                await this.input.setDevice(device);
            } catch(error) {
                log.error(LogCategory.VOICE, tr("Failed to set input device (%o)"), error);
            }
        }
    }

    private save() {
        if(!this.volatile)
            settings.changeGlobal(Settings.FN_PROFILE_RECORD(this.name), this.config);
    }

    private async reinitializeFilter() {
        if(!this.input) return;

        /* TODO: Really required? If still same input we can just use the registered filters */

        this.input.resetFilter();
        delete this.registeredFilter["ppt-gate"];

        if(this.pptHookRegistered) {
            ppt.unregister_key_hook(this.pptHook);
            this.pptHookRegistered = false;
        }

        if(this.config.vad_type === "threshold") {
            const filter = this.input.createFilter(FilterType.THRESHOLD, 100);
            await filter.set_threshold(this.config.vad_threshold.threshold);

            filter.set_margin_frames(10); /* 500ms */
            filter.set_attack_smooth(.25);
            filter.set_release_smooth(.9);
        } else if(this.config.vad_type === "push_to_talk") {
            const filter = this.input.createFilter(FilterType.STATE, 100);
            await filter.set_state(true);
            this.registeredFilter["ppt-gate"] = filter;

            for(const key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
                this.pptHook[key] = this.config.vad_push_to_talk[key];

            ppt.register_key_hook(this.pptHook);
            this.pptHookRegistered = true;
        } else if(this.config.vad_type === "active") {}
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
        }

        this.callback_input_change = undefined;
        this.callback_start = undefined;
        this.callback_stop = undefined;
        this.callback_unmount = undefined;
        this.current_handler = undefined;
    }

    get_vad_type() { return this.config.vad_type; }
    set_vad_type(type: VadType) : boolean {
        if(this.config.vad_type === type)
            return true;
        if(["push_to_talk", "threshold", "active"].findIndex(e => e === type) == -1)
            return false;

        this.config.vad_type = type;
        this.reinitializeFilter();
        this.save();
        return true;
    }

    get_vad_threshold() { return parseInt(this.config.vad_threshold.threshold as any); } /* for some reason it might be a string... */
    set_vad_threshold(value: number) {
        if(this.config.vad_threshold.threshold === value)
            return;

        this.config.vad_threshold.threshold = value;
        this.reinitializeFilter();
        this.save();
    }

    get_vad_ppt_key() : KeyDescriptor { return this.config.vad_push_to_talk; }
    set_vad_ppt_key(key: KeyDescriptor) {
        for(const _key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
            this.config.vad_push_to_talk[_key] = key[_key];

        this.reinitializeFilter();
        this.save();
    }

    get_vad_ppt_delay() { return this.config.vad_push_to_talk.delay; }
    set_vad_ppt_delay(value: number) {
        if(this.config.vad_push_to_talk.delay === value)
            return;

        this.config.vad_push_to_talk.delay = value;
        this.reinitializeFilter();
        this.save();
    }

    getDeviceId() : string { return this.config.device_id; }
    set_device(device: IDevice | undefined) : Promise<void> {
        this.config.device_id = device ? device.deviceId : IDevice.NoDeviceId;
        this.save();
        return this.input?.setDevice(device) || Promise.resolve();
    }

    get_volume() : number { return this.input ? (this.input.getVolume() * 100) : this.config.volume; }
    set_volume(volume: number) {
        if(this.config.volume === volume)
            return;

        this.config.volume = volume;
        this.input && this.input.setVolume(volume / 100);
        this.save();
    }
}