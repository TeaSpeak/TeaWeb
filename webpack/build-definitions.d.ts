import {BrowserInfo} from "detect-browser";

declare global {
    interface BuildDefinitions {
        target: "web" | "client";
        mode: "release" | "debug";

        /* chunk for the loader to load initially */
        entry_chunk_name: string;

        version: string;
        timestamp: number;
    }

    const __build: BuildDefinitions;
    const __webpack_require__;

    /* Well this isn't a build definition, but we have to declare it somewhere globally */
    interface Window {
        detectedBrowser: BrowserInfo,
        removeLoaderContextMenuHook: () => void
    }
}

export {};