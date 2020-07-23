import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {Settings, settings} from "tc-shared/settings";

const focusDefaultStatus = {};
focusDefaultStatus[EventType.CLIENT_POKE_RECEIVED] = true;

export function requestWindowFocus() {
    if(__build.target === "web") {
        window.focus();
    } else {
        /* TODO: Abstract that! */
        const { remote } = __non_webpack_require__("electron");
        remote.getCurrentWindow().show();
    }
}

export function isFocusRequestEnabled(type: EventType) {
    return settings.global(Settings.FN_EVENTS_FOCUS_ENABLED(type), focusDefaultStatus[type as any] || false);
}