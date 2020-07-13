import "core-js/stable";
import "./polifill";

import * as loader from "./loader/loader";
window["loader"] = loader;
/* let the loader register himself at the window first */

import * as AppLoader from "./targets/app";
setTimeout(AppLoader.run, 0);

import * as EmptyLoader from "./targets/empty";
//setTimeout(EmptyLoader.run, 0);

export {};

//window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function () {};