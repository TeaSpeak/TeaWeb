import {settings, Settings} from "tc-shared/settings";
import {EventType, TypeInfo} from "tc-shared/connectionlog/Definitions";

const focusDefaultStatus: {[T in keyof TypeInfo]?: boolean} = {};
focusDefaultStatus["client.poke.received"] = true;

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
    return settings.getValue(Settings.FN_EVENTS_FOCUS_ENABLED(type), focusDefaultStatus[type as any] || false);
}