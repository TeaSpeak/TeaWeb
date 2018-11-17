/// <reference path="../declarations/imports_shared.d.ts"/>

namespace ppt {

    export function initialize() : Promise<void> {
        return Promise.resolve();
    }

    export function finalize() {}

    export function register_key_hook(callback: (event: KeyEvent) => any, cancel: boolean) {}
    export function unregister_key_hook(callback: (event: KeyEvent) => any) {}
}