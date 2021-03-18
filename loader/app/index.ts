if(window["loader"]) {
    throw "an loader instance has already been defined";
}

export * from "./loader/loader";
export * as loaderAnimation from "./animation";

import "./bootstrap";

/* FIXME: This is glue! */
if(window["loader"]) {
    throw "an loader instance has already been defined";
}
window["loader"] = module.exports;