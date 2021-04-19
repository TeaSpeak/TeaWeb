import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setKeyBoardBackend} from "tc-shared/PPTListener";
import {WebKeyBoard} from "../KeyBoard";

/*
 * Will be loaded within the renderer and the main application.
 */

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "audio backend init",
    function: async () => setKeyBoardBackend(new WebKeyBoard()),
    priority: 100
});