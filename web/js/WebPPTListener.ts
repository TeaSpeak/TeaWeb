/// <reference path="../declarations/imports_shared.d.ts"/>


namespace ppt {
    interface WebKeyEvent extends KeyEvent {
        canceled: boolean;
    }

    let key_listener: ((_: KeyEvent) => any)[] = [];

    function listener_key(type: EventType, event: KeyboardEvent) {
        const key_event = {
            type: type,

            key: event.key,
            key_code: event.code,

            key_ctrl: event.ctrlKey,
            key_shift: event.shiftKey,
            key_alt: event.altKey,
            key_windows: event.metaKey,

            canceled: event.defaultPrevented
        } as WebKeyEvent;
        //console.debug("Trigger key event %o", key_event);

        for(const listener of key_listener)
            listener(key_event);

        if(key_event.canceled)
            event.preventDefault();
    }

    const proxy_key_press = event => listener_key(EventType.KEY_PRESS, event);
    const proxy_key_release = event => listener_key(EventType.KEY_RELEASE, event);
    const proxy_key_typed = event => listener_key(EventType.KEY_TYPED, event);

    export function initialize() : Promise<void> {
        document.addEventListener('keypress', proxy_key_typed);
        document.addEventListener('keydown', proxy_key_press);
        document.addEventListener('keyup', proxy_key_release);
        window.addEventListener('blur', listener_blur);

        register_key_listener(listener_hook);
        return Promise.resolve();
    }

    export function finalize() {
        document.removeEventListener("keypress", proxy_key_typed);
        document.removeEventListener("keydown", proxy_key_press);
        document.removeEventListener("keyup", proxy_key_release);
        window.removeEventListener('blur', listener_blur);

        unregister_key_listener(listener_hook);
    }

    export function register_key_listener(listener: (_: KeyEvent) => any) {
        key_listener.push(listener);
    }

    export function unregister_key_listener(listener: (_: KeyEvent) => any) {
        key_listener.remove(listener);
    }


    let key_hooks: KeyHook[] = [];

    interface CurrentState {
        event: KeyEvent;
        code: string;

        special: { [key:number]:boolean };
    }
    let current_state: CurrentState = {
        special: []
    } as any;

    let key_hooks_active: KeyHook[] = [];

    function listener_blur() {
        current_state.special[SpecialKey.ALT] = false;
        current_state.special[SpecialKey.CTRL] = false;
        current_state.special[SpecialKey.SHIFT] = false;
        current_state.special[SpecialKey.WINDOWS] = false;

        current_state.code = undefined;
        current_state.event = undefined;

        for(const hook of key_hooks_active)
            hook.callback_release();
        key_hooks_active = [];
    }

    function listener_hook(event: KeyEvent) {
        if(event.type == EventType.KEY_TYPED)
            return;

        let old_hooks = [...key_hooks_active];
        let new_hooks = [];

        current_state.special[SpecialKey.ALT] = event.key_alt;
        current_state.special[SpecialKey.CTRL] = event.key_ctrl;
        current_state.special[SpecialKey.SHIFT] = event.key_shift;
        current_state.special[SpecialKey.WINDOWS] = event.key_windows;

        current_state.code = undefined;
        current_state.event = undefined;

        if(event.type == EventType.KEY_PRESS) {
            current_state.event = event;
            current_state.code = event.key_code;

            for(const hook of key_hooks) {
                if(hook.key_code && hook.key_code != event.key_code) continue;
                if(hook.key_alt != event.key_alt) continue;
                if(hook.key_ctrl != event.key_ctrl) continue;
                if(hook.key_shift != event.key_shift) continue;
                if(hook.key_windows != event.key_windows) continue;

                new_hooks.push(hook);
                if(!old_hooks.remove(hook) && hook.callback_press) {
                    hook.callback_press();
                    log.trace(LogCategory.GENERAL, tr("Trigger key press for %o!"), hook);
                }
            }
        }

        //We have a new situation
        for(const hook of old_hooks)
            if(hook.callback_release) {
                hook.callback_release();
                log.trace(LogCategory.GENERAL, tr("Trigger key release for %o!"), hook);
            }
        key_hooks_active = new_hooks;
    }

    export function register_key_hook(hook: KeyHook) {
        key_hooks.push(hook);
    }

    export function unregister_key_hook(hook: KeyHook) {
        key_hooks.remove(hook);
    }

    export function key_pressed(code: string | SpecialKey) : boolean {
        if(typeof(code) === 'string')
            return current_state.code == code;
        return current_state.special[code];
    }
}