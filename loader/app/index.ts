import * as loader from "./targets/app";
import * as loader_base from "./loader/loader";
window["loader"] = loader_base;
    /* let the loader register himself at the window first */
setTimeout(loader.run, 0);

export {};