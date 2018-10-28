interface Navigator {
    mozGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
    webkitGetUserMedia(constraints: MediaStreamConstraints, successCallback: NavigatorUserMediaSuccessCallback, errorCallback: NavigatorUserMediaErrorCallback): void;
}

namespace audio.player  {
    let _globalContext: AudioContext;
    let _globalContextPromise: Promise<void>;
    let _initialized_listener: (() => any)[] = [];

    export interface Device {
        device_id: string;
        name: string;
    }

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

    export function destination() : AudioNode {
        return context().destination;
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
