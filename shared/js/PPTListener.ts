namespace ppt {
    export enum EventType {
        KEY_PRESS,
        KEY_RELEASE,
        KEY_TYPED
    }

    export interface KeyEvent {
        readonly type: EventType;

        readonly key: string;
        readonly key_code: string;

        readonly key_ctrl: boolean;
        readonly key_windows: boolean;
        readonly key_shift: boolean;
        readonly key_alt: boolean;
    }

    export declare function initialize() : Promise<void>;
    export declare function finalize(); /* most the times not really required */

    export declare function register_key_hook(callback: (event: KeyEvent) => any, cancel: boolean);
    export declare function unregister_key_hook(callback: (event: KeyEvent) => any);

}