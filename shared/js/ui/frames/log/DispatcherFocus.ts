import {EventType} from "tc-shared/ui/frames/log/Definitions";
import {Settings, settings} from "tc-shared/settings";

const focusDefaultStatus = {};
focusDefaultStatus[EventType.CLIENT_POKE_RECEIVED] = true;

export function requestWindowFocus() {
    window.focus();
}

export function isFocusRequestEnabled(type: EventType) {
    return settings.global(Settings.FN_EVENTS_FOCUS_ENABLED(type), focusDefaultStatus[type as any] || false);
}