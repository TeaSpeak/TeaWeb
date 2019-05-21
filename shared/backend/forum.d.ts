/* only available for the client */
declare namespace forum {
    export function register_callback(callback: () => any);
    export function open();
    export function logout();

    export function sync_main();
}