import {Device} from "tc-shared/audio/player";
import * as log from "tc-shared/log";
import {LogCategory, logError, logInfo} from "tc-shared/log";
import { tr } from "tc-shared/i18n/localize";

/* lets try without any gestures, maybe the user already clicked the page */
const kAvoidAudioContextWarning = false;

let audioContextRequiredGesture = false;
let audioContextInstance: AudioContext;
let globalAudioGainInstance: GainNode;

let audioContextInitializeCallbacks: (() => any)[] = [];
let _master_volume: number = 1;
let _no_device = false;

export function initialize() : boolean {
    context();
    return true;
}

export function initialized() : boolean {
    return !!audioContextInstance && audioContextInstance.state === 'running';
}

function fire_initialized() {
    logInfo(LogCategory.AUDIO, tr("Fire audio player initialized for %d listeners"), audioContextInitializeCallbacks.length);
    while(audioContextInitializeCallbacks.length > 0)
        audioContextInitializeCallbacks.pop_front()();
}

function createNewContext() {
    audioContextInstance = new (window.webkitAudioContext || window.AudioContext)();
    audioContextInstance.onstatechange = () => {
        if(audioContextInstance.state === "running")
            fire_initialized();
    };

    audioContextInitializeCallbacks.unshift(() => {
        globalAudioGainInstance = audioContextInstance.createGain();
        globalAudioGainInstance.gain.value = _no_device ? 0 : _master_volume;
        globalAudioGainInstance.connect(audioContextInstance.destination);
    });

    if(audioContextInstance.state === "suspended") {
        audioContextRequiredGesture = true;
        return audioContextInstance;
    } else if(audioContextInstance.state === "running") {
        fire_initialized();
    } else if(audioContextInstance.state === "closed") {
        throw tr("Audio context has been closed");
    } else {
        throw tr("invalid audio context state");
    }
}

export function context() : AudioContext {
    if(audioContextInstance || kAvoidAudioContextWarning)
        return audioContextInstance;

    if(!audioContextInstance)
        createNewContext();

    return audioContextInstance;
}

export function get_master_volume() : number {
    return _master_volume;
}
export function set_master_volume(volume: number) {
    _master_volume = volume;
    if(globalAudioGainInstance)
        globalAudioGainInstance.gain.value = _no_device ? 0 : _master_volume;
}

export function destination() : AudioNode {
    const ctx = context();
    if(!ctx) throw tr("Audio player isn't initialized yet!");

    return globalAudioGainInstance;
}

export function on_ready(cb: () => any) {
    if(initialized())
        cb();
    else
        audioContextInitializeCallbacks.push(cb);
}

export const WEB_DEVICE: Device = {
    device_id: "default",
    name: "default playback",
    driver: 'Web Audio'
};

export function available_devices() : Promise<Device[]> {
    return Promise.resolve([WEB_DEVICE])
}

export function set_device(device_id: string) : Promise<void> {
    _no_device = !device_id;
    globalAudioGainInstance.gain.value = _no_device ? 0 : _master_volume;

    return Promise.resolve();
}

export function current_device() : Device {
    return WEB_DEVICE;
}

export function initializeFromGesture() {
    if(audioContextInstance) {
        if(audioContextInstance.state !== "running") {
            audioContextInstance.resume().catch(error => {
                logError(LogCategory.AUDIO, tr("Failed to initialize audio context instance from gesture: %o"), error);
            });
        }
    } else {
        createNewContext();
    }
}

export function globalAudioContext() : AudioContext {
    return context();
}