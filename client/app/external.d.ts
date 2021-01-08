interface Window {
    __native_client_init_hook: () => void;
    __native_client_init_shared: (webpackRequire: any) => void;
}

declare const __teaclient_preview_notice: any;
declare const __teaclient_preview_error: any;