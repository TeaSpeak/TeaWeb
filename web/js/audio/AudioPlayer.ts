interface Navigator {
    mozGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
    webkitGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
}

namespace audio.player {
    let _globalContext: AudioContext;
    let _global_destination: GainNode;

    let _globalContextPromise: Promise<void>;
    let _initialized_listener: (() => any)[] = [];
    let _master_volume: number = 1;

    export function initialize() : boolean {
        context();
        return true;
    }

    export function initialized() : boolean {
        return !!_globalContext && _globalContext.state === 'running';
    }

    function fire_initialized() {
        console.log("Fire initialized: %o", _initialized_listener);
        while(_initialized_listener.length > 0)
            _initialized_listener.pop_front()();
    }


    export function context() : AudioContext {
        if(_globalContext && _globalContext.state != "suspended") return _globalContext;

        if(!_globalContext)
            _globalContext = new (window.webkitAudioContext || window.AudioContext)();

        _initialized_listener.unshift(() => {
            _global_destination = _globalContext.createGain();
            _global_destination.gain.value = _master_volume;
            _global_destination.connect(_globalContext.destination);
        });
        if(_globalContext.state == "suspended") {
            if(!_globalContextPromise) {
                (_globalContextPromise = _globalContext.resume()).then(() => {
                    fire_initialized();
                }).catch(error => {
                    displayCriticalError("Failed to initialize global audio context! (" + error + ")");
                });
            }
            _globalContext.resume(); //We already have our listener
            return undefined;
        }

        if(_globalContext.state == "running") {
            fire_initialized();
            return _globalContext;
        }
        return undefined;
    }

    export function get_master_volume() : number {
        return _master_volume;
    }
    export function set_master_volume(volume: number) {
        _master_volume = volume;
    }

    export function destination() : AudioNode {
        const ctx = context();
        if(!ctx) throw tr("Audio player isn't initialized yet!");

        return _global_destination;
    }

    export function on_ready(cb: () => any) {
        if(initialized())
            cb();
        else
            _initialized_listener.push(cb);
    }

    export const WEB_DEVICE: Device = {device_id: "", name: "default playback"};

    export function available_devices() : Promise<Device[]> {
        return Promise.resolve([WEB_DEVICE])
    }

    export function set_device(device_id: string) : Promise<void> {
        return Promise.resolve();
    }

    export function current_device() : Device {
        return WEB_DEVICE;
    }

    export function initializeFromGesture() {
        context();
    }
}
