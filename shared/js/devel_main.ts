import * as loader from "tc-loader";
import {Stage} from "tc-loader";

import * as ipc from "./ipc/BrowserIPC";
import * as i18n from "./i18n/localize";

import "./proto";


console.error("Hello World from devel main");
loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "setup",
    priority: 10,
    function: async () => {
        await i18n.initialize();
        ipc.setup();
    }
});

loader.register_task(Stage.LOADED, {
    name: "invoke",
    priority: 10,
    function: async () => {
    }
});