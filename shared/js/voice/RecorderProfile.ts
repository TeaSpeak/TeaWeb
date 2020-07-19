import * as log from "tc-shared/log";
import {AbstractInput, filter, InputDevice} from "tc-shared/voice/RecorderBase";
import {KeyDescriptor, KeyHook} from "tc-shared/PPTListener";
import {LogCategory} from "tc-shared/log";
import {Settings, settings} from "tc-shared/settings";
import {ConnectionHandler} from "tc-shared/ConnectionHandler";
import * as aplayer from "tc-backend/audio/player";
import * as arecorder from "tc-backend/audio/recorder";
import * as ppt from "tc-backend/ppt";

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

    callback_input_change: (old_input: AbstractInput, new_input: AbstractInput) => Promise<void>;
    callback_start: () => any;
    callback_stop: () => any;

    callback_unmount: () => any; /* called if somebody else takes the ownership */

    record_supported: boolean;

    private _ppt_hook: KeyHook;
    private _ppt_timeout: number;
    private _ppt_hook_registered: boolean;

    constructor(name: string, volatile?: boolean) {
        this.name = name;
        this.volatile = typeof(volatile) === "boolean" ? volatile : false;

        this._ppt_hook = {
            callback_release: () => {
                if(this._ppt_timeout)
                    clearTimeout(this._ppt_timeout);

                this._ppt_timeout = setTimeout(() => {
                    const f = this.input.get_filter(filter.Type.STATE) as filter.StateFilter;
                    if(f) f.set_state(true);
                }, Math.min(this.config.vad_push_to_talk.delay, 0));
            },
            callback_press: () => {
                if(this._ppt_timeout)
                    clearTimeout(this._ppt_timeout);

                const f = this.input.get_filter(filter.Type.STATE) as filter.StateFilter;
                if(f) f.set_state(false);
            },

            cancel: false
        } as KeyHook;
        this._ppt_hook_registered = false;
        this.record_supported = true;
    }

    async initialize() : Promise<void> {
        aplayer.on_ready(async () => {
            this.initialize_input();
            await this.load();
            await this.reinitialize_filter();
        });
    }

    private initialize_input() {
        this.input = arecorder.create_input();
        this.input.callback_begin = () => {
            log.debug(LogCategory.VOICE, "Voice start");
            if(this.callback_start)
                this.callback_start();
        };

        this.input.callback_end = () => {
            log.debug(LogCategory.VOICE, "Voice end");
            if(this.callback_stop)
                this.callback_stop();
        };

        //TODO: Await etc?
        this.callback_input_change && this.callback_input_change(undefined, this.input);
    }

    private async load() {
        const config = settings.static_global(Settings.FN_PROFILE_RECORD(this.name), {}) as RecorderProfileConfig;

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
        this.input.set_volume(this.config.volume / 100);

        {
            const all_devices = arecorder.devices();
            const devices = all_devices.filter(e => e.default_input || e.unique_id === this.config.device_id);
            const device = devices.find(e => e.unique_id === this.config.device_id) || devices[0];

            log.info(LogCategory.VOICE, tr("Loaded record profile device %s | %o (%o)"), this.config.device_id, device, all_devices);
            try {
                await this.input.set_device(device);
            } catch(error) {
                log.error(LogCategory.VOICE, tr("Failed to set input device (%o)"), error);
            }
        }
    }

    private save(enforce?: boolean) {
        if(enforce || !this.volatile)
            settings.changeGlobal(Settings.FN_PROFILE_RECORD(this.name), this.config);
    }

    private async reinitialize_filter() {
        if(!this.input) return;

        this.input.clear_filter();
        if(this._ppt_hook_registered) {
            ppt.unregister_key_hook(this._ppt_hook);
            this._ppt_hook_registered = false;
        }

        if(this.config.vad_type === "threshold") {
            const filter_ = this.input.get_filter(filter.Type.THRESHOLD) as filter.ThresholdFilter;
            await filter_.set_threshold(this.config.vad_threshold.threshold);
            await filter_.set_margin_frames(10); /* 500ms */

            /* legacy client support */
            if('set_attack_smooth' in filter_)
                filter_.set_attack_smooth(.25);
            if('set_release_smooth' in filter_)
                filter_.set_release_smooth(.9);

            this.input.enable_filter(filter.Type.THRESHOLD);
        } else if(this.config.vad_type === "push_to_talk") {
            const filter_ = this.input.get_filter(filter.Type.STATE) as filter.StateFilter;
            await filter_.set_state(true);

            for(const key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
                this._ppt_hook[key] = this.config.vad_push_to_talk[key];
            ppt.register_key_hook(this._ppt_hook);
            this._ppt_hook_registered = true;

            this.input.enable_filter(filter.Type.STATE);
        } else if(this.config.vad_type === "active") {}
    }

    async unmount() : Promise<void> {
        if(this.callback_unmount)
            this.callback_unmount();
        if(this.input) {
            try {
                await this.input.set_consumer(undefined);
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
        this.reinitialize_filter();
        this.save();
        return true;
    }

    get_vad_threshold() { return parseInt(this.config.vad_threshold.threshold as any); } /* for some reason it might be a string... */
    set_vad_threshold(value: number) {
        if(this.config.vad_threshold.threshold === value)
            return;

        this.config.vad_threshold.threshold = value;
        this.reinitialize_filter();
        this.save();
    }

    get_vad_ppt_key() : KeyDescriptor { return this.config.vad_push_to_talk; }
    set_vad_ppt_key(key: KeyDescriptor) {
        for(const _key of ["key_alt", "key_ctrl", "key_shift", "key_windows", "key_code"])
            this.config.vad_push_to_talk[_key] = key[_key];

        this.reinitialize_filter();
        this.save();
    }

    get_vad_ppt_delay() { return this.config.vad_push_to_talk.delay; }
    set_vad_ppt_delay(value: number) {
        if(this.config.vad_push_to_talk.delay === value)
            return;

        this.config.vad_push_to_talk.delay = value;
        this.reinitialize_filter();
        this.save();
    }


    current_device() : InputDevice | undefined { return this.input.current_device(); }
    set_device(device: InputDevice | undefined) : Promise<void> {
        this.config.device_id = device ? device.unique_id : undefined;
        this.save();
        return this.input.set_device(device);
    }

    get_volume() : number { return this.input ? (this.input.get_volume() * 100) : this.config.volume; }
    set_volume(volume: number) {
        if(this.config.volume === volume)
            return;

        this.config.volume = volume;
        this.input && this.input.set_volume(volume / 100);
        this.save();
    }
}