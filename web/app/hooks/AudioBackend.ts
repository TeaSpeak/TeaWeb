import * as loader from "tc-loader";
import {Stage} from "tc-loader";
import {setAudioBackend} from "tc-shared/audio/Player";
import {WebAudioBackend} from "../audio/Player";

loader.register_task(Stage.JAVASCRIPT_INITIALIZING, {
    name: "audio backend init",
    function: async () => {
        setAudioBackend(new WebAudioBackend());
    },
    priority: 100
});