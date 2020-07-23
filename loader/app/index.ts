import "core-js/stable";
import "./polifill";

import * as loader from "./loader/loader";
import {ApplicationLoader} from "./loader/loader";
import {getUrlParameter} from "./loader/utils";

window["loader"] = loader;
/* let the loader register himself at the window first */

const target = getUrlParameter("loader-target") || "app";
console.error("Loading app with loader \"%s\"", target);

let appLoader: ApplicationLoader;
if(target === "empty") {
    appLoader = new (require("./targets/empty").default);
} else if(target === "manifest") {
    appLoader = new (require("./targets/maifest-target").default);
} else {
    appLoader = new (require("./targets/app").default);
}
setTimeout(() => appLoader.execute(), 0);

export {};

if(__build.target === "client") {
    /* do this so we don't get a react dev tools warning within the client */
    if(!('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window))
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () {};
}