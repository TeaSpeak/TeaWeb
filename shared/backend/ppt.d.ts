declare namespace ppt {
    export function initialize() : Promise<void>;
    export function finalize(); // most the times not really required

    export function register_key_listener(listener: (_: KeyEvent) => any);
    export function unregister_key_listener(listener: (_: KeyEvent) => any);

    export function register_key_hook(hook: KeyHook);
    export function unregister_key_hook(hook: KeyHook);

    export function key_pressed(code: string | SpecialKey) : boolean;
}