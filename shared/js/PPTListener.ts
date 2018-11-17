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
            result += " + Shift";
        if(key.key_alt)
            result += " + Alt";
        if(key.key_ctrl)
            result += " + CTRL";
        if(key.key_windows)
            result += " + Win";

        result += " + " + (key.key_code ? key.key_code : "unset");
        return result.substr(3);
    }

    export declare function initialize() : Promise<void>;
    export declare function finalize(); /* most the times not really required */

    export declare function register_key_listener(listener: (_: KeyEvent) => any);
    export declare function unregister_key_listener(listener: (_: KeyEvent) => any);

    export declare function register_key_hook(hook: KeyHook);
    export declare function unregister_key_hook(hook: KeyHook);

    export declare function key_pressed(code: string | SpecialKey) : boolean;
}