import * as loader from "../loader/loader";
import {Stage} from "../loader/loader";
import {
    BrowserInfo,
    detect as detectBrowser,
} from "detect-browser";

declare global {
    interface Window {
        detectedBrowser: BrowserInfo,
        removeLoaderContextMenuHook: () => void
    }
}

if(__build.target === "web") {
    loader.register_task(Stage.SETUP, {
        name: "outdated browser checker",
        function: async () => {
            const browser = detectBrowser();
            navigator.browserSpecs = browser;

            if(!browser)
                return;

            console.log("Resolved browser manufacturer to \"%s\" version \"%s\" on %s", browser.name, browser.version, browser.os);
            if(browser.type !== "browser") {
                loader.critical_error("Your device isn't supported.", "User agent type " + browser.type + " isn't supported.");
                throw "unsupported user type";
            }

            window.detectedBrowser = browser;

            switch (browser?.name) {
                case "aol":
                case "crios":
                case "ie":
                    loader.critical_error("Browser not supported", "We're sorry, but your browser isn't supported.");
                    throw "unsupported browser";

            }
        },
        priority: 50
    });
}

/* directly disable all context menus */
if(!location.search.match(/(.*[?&]|^)disableGlobalContextMenu=0($|&.*)/)) {
    const callback = event => event.preventDefault();

    document.addEventListener("contextmenu", callback);
    window.removeLoaderContextMenuHook = () => document.removeEventListener("contextmenu", callback);
}