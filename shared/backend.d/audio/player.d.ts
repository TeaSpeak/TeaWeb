import {Device} from "tc-shared/audio/player";

export function initialize() : boolean;
export function initialized() : boolean;

export function get_master_volume() : number;
export function set_master_volume(volume: number);

export function on_ready(cb: () => any);

export function available_devices() : Promise<Device[]>;
export function set_device(device_id: string) : Promise<void>;
export function current_device() : Device;

export function initializeFromGesture();

export function globalAudioContext() : AudioContext;