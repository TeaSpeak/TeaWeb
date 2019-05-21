namespace ppt {
    export enum EventType {
        KEY_PRESS,
        KEY_RELEASE,
        KEY_TYPED
    }

    export enum SpecialKey {
        CTRL,
        WINDOWS,
        SHIFT,
        ALT
    }

    export interface KeyDescriptor {
        key_code: string;

        key_ctrl: boolean;
        key_windows: boolean;
        key_shift: boolean;
        key_alt: boolean;
    }

    export interface KeyEvent extends KeyDescriptor {
        readonly type: EventType;

        readonly key: string;
    }

    export interface KeyHook extends KeyDescriptor {
        cancel: boolean;


        callback_press: () => any;
        callback_release: () => any;
    }

    export function key_description(key: KeyDescriptor) {
        let result = "";
        if(key.key_shift)
            result += " + " + tr("Shift");
        if(key.key_alt)
            result += " + " + tr("Alt");
        if(key.key_ctrl)
            result += " + " + tr("CTRL");
        if(key.key_windows)
            result += " + " + tr("Win");

        result += " + " + (key.key_code ? key.key_code : tr("unset"));
        return result.substr(3);
    }
}