import {AbstractInput, InputDevice, LevelMeter} from "tc-shared/voice/RecorderBase";

export function devices() : InputDevice[];

export function device_refresh_available() : boolean;
export function refresh_devices() : Promise<void>;

export function create_input() : AbstractInput;
export function create_levelmeter(device: InputDevice) : Promise<LevelMeter>;