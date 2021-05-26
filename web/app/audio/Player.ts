import {AudioBackend, AudioBackendEvents, OutputDevice} from "tc-shared/audio/Player";
import {LogCategory, logDebug, logError, logInfo, logWarn} from "tc-shared/log";
import {tr} from "tc-shared/i18n/localize";
import {Registry} from "tc-events";

const kWebDevice: OutputDevice = {
    deviceId: "default",
    name: "default playback",
    driver: 'Web Audio'
};

export class WebAudioBackend implements AudioBackend {
    private readonly events: Registry<AudioBackendEvents>;
    private readonly audioContext: AudioContext;
    private state: "initializing" | "running" | "closed";
    private masterVolume: number;

    private gestureListener: () => void;

    constructor() {
        this.events = new Registry<AudioBackendEvents>();
        this.state = "initializing";
        this.masterVolume = 1;

        this.audioContext = new (window.webkitAudioContext || window.AudioContext)();
        this.audioContext.onstatechange = () => this.handleAudioContextStateChanged(false);
        this.handleAudioContextStateChanged(true);
    }

    destroy() {
        this.state = "closed";

        document.removeEventListener("click", this.gestureListener);
        this.gestureListener = undefined;

        this.audioContext.close().catch(error => {
            logWarn(LogCategory.AUDIO, tr("Failed to close AudioContext: %o"), error);
        });
    }

    executeWhenInitialized(callback: () => void) {
        if(this.state === "running") {
            callback();
        } else {
            this.events.one("notify_initialized", callback);
        }
    }

    isInitialized(): boolean {
        return this.state === "running";
    }

    getAudioContext(): AudioContext | undefined {
        return this.audioContext;
    }

    async getAvailableDevices(): Promise<OutputDevice[]> {
        return [ kWebDevice ];
    }

    getDefaultDeviceId(): string {
        return kWebDevice.deviceId;
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    setMasterVolume(volume: number) {
        if(this.masterVolume === volume) {
            return;
        }

        const oldVolume = this.masterVolume;
        this.masterVolume = volume;
        this.events.fire("notify_volume_changed", {
            oldVolume: oldVolume,
            newVolume: volume
        });
    }

    isDeviceRefreshAvailable(): boolean {
        return false;
    }

    refreshDevices(): Promise<void> {
        return Promise.resolve(undefined);
    }

    private handleAudioContextStateChanged(initialState: boolean) {
        switch (this.audioContext.state) {
            case "suspended":
                if(initialState) {
                    logDebug(LogCategory.AUDIO, tr("Created new AudioContext but user hasn't yet allowed audio playback. Awaiting his gesture."));
                    this.awaitGesture();
                    return;
                } else {
                    logWarn(LogCategory.AUDIO, tr("AudioContext state changed to 'suspended'. Trying to resume it."));
                    this.tryResume();
                }
                break;

            case "closed":
                if(this.state === "closed") {
                    return;
                }

                logError(LogCategory.AUDIO, tr("AudioContext state changed to 'closed'. No audio will be payed."));
                return;

            case "running":
                logDebug(LogCategory.AUDIO, tr("Successfully initialized the AudioContext."));
                this.state = "running";
                this.events.fire("notify_initialized");
                return;
        }
    }

    private tryResume() {
        this.audioContext.resume().then(() => {
            logInfo(LogCategory.AUDIO, tr("Successfully resumed AudioContext."));
        }).catch(error => {
            logError(LogCategory.AUDIO, tr("Failed to resume AudioContext: %o"), error);
        });
    }

    private awaitGesture() {
        if(this.gestureListener) {
            return;
        }

        this.gestureListener = () => {
            document.removeEventListener("click", this.gestureListener);
            this.gestureListener = undefined;
            this.tryResume();
        };

        document.addEventListener("click", this.gestureListener);
    }

    async setCurrentDevice(targetId: string | undefined): Promise<void> {
        /* TODO: Mute on "no device"? */
    }

    getCurrentDevice(): OutputDevice {
        return kWebDevice;
    }
}