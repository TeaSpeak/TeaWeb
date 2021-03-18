import * as loader from "../loader/loader";
import {Stage} from "../loader/loader";
import {detect as detectBrowser} from "detect-browser";

loader.register_task(Stage.SETUP, {
    name: "app init",
    function: async () => {
        /* TeaClient */
        if(window.require || window.__native_client_init_hook) {
            if(__build.target !== "client") {
                loader.critical_error("App seems not to be compiled for the client.", "This app has been compiled for " + __build.target);
                return;
            }

            window.__native_client_init_hook();
        } else {
            if(__build.target !== "web") {
                loader.critical_error("App seems not to be compiled for the web.", "This app has been compiled for " + __build.target);
                return;
            }
        }
    },
    priority: 1000
});

loader.register_task(Stage.SETUP, {
    name: __build.target === "web" ? "outdated browser checker" : "outdated renderer tester",
    function: async () => {
        const browser = detectBrowser();
        navigator.browserSpecs = browser;

        if(!browser) {
            return;
        }

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

/* directly disable all context menus */
if(!location.search.match(/(.*[?&]|^)disableGlobalContextMenu=0($|&.*)/)) {
    const callback = event => event.preventDefault();

    document.addEventListener("contextmenu", callback);
    window.removeLoaderContextMenuHook = () => document.removeEventListener("contextmenu", callback);
}