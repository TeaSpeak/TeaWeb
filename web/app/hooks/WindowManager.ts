import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setWindowManager} from "tc-shared/ui/windows/WindowManager";
import {WebWindowManager} from "../WebWindowManager";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "window manager init",
    function: async () => setWindowManager(new WebWindowManager()),
    priority: 100
});