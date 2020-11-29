declare global {
    interface Window {
        tr(message: string) : string;
        tra(message: string, ...args: (string | number | boolean)[]) : string;
        tra(message: string, ...args: any[]) : JQuery[];

        log: any;
        StaticSettings: any;

        detectedBrowser: any;
        __native_client_init_shared: any;
    }

    const tr: typeof window.tr;
    const tra: typeof window.tra;

    /* webpack compiler variable */
    const __build;
    const __webpack_require__;
}

export {};