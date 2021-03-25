export interface OutputDevice {
    device_id: string;

    driver: string;
    name: string;
}

export namespace OutputDevice {
    export const NoDeviceId = "none";
    export const DefaultDeviceId = "default";
}

export interface AudioBackendEvents {
    notify_initialized: {},
    notify_volume_changed: { oldVolume: number, newVolume: number }
}

export interface AudioBackend {
    isInitialized() : boolean;
    getAudioContext() : AudioContext | undefined;

    isDeviceRefreshAvailable() : boolean;
    refreshDevices() : Promise<void>;

    getAvailableDevices() : Promise<OutputDevice[]>;
    getDefaultDeviceId() : string;

    getCurrentDevice() : OutputDevice;
    setCurrentDevice(targetId: string | undefined) : Promise<void>;

    getMasterVolume() : number;
    setMasterVolume(volume: number);

    executeWhenInitialized(callback: () => void);
}

let backend: AudioBackend;
export function getAudioBackend(): AudioBackend {
    return backend;
}

export function setAudioBackend(newBackend: AudioBackend) {
    backend = newBackend;
}